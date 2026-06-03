'use strict'

let testScripts = []
try {
  // optional dev-only test data module; guard in case it's absent in production or restored repo
  // eslint-disable-next-line global-require
  const init = require('../database/init-data')
  if (init && Array.isArray(init.testScripts)) {
    testScripts = init.testScripts
  }
} catch (e) {
  // don't fail if init-data not present; log for local debug
  console.warn('init-data module not found or failed to load; proceeding without test data')
}

async function verifyAppUser(db, token) {
  if (!token) return null

  const sessionRes = await db.collection('auth-sessions')
    .where({ token })
    .limit(1)
    .get()
  const session = sessionRes.data && sessionRes.data[0]
  if (!session || (session.expireTime && session.expireTime <= Date.now())) {
    return null
  }

  const userRes = await db.collection('app-users').doc(session.userId).get()
  const user = userRes.data && userRes.data[0]
  if (!user || user.status === 'disabled') return null
  return user
}

function normalizeScript(script) {
  if (!script) return null
  script.id = script._id || script.id
  delete script._id

  if (Array.isArray(script.thumbnails) && script.thumbnails.length) {
    script.images = script.thumbnails.slice(0, 3)
  } else if (script.thumbnail && typeof script.thumbnail === 'string') {
    script.images = [script.thumbnail]
  } else if (Array.isArray(script.images)) {
    script.images = script.images
      .map(img => {
        if (typeof img === 'string') return img
        if (img && typeof img === 'object') return img.url || img.fileId || null
        return null
      })
      .filter(Boolean)
      .slice(0, 3)
  } else {
    script.images = []
  }

  script.title = script.title || '未命名剧本'
  script.author = script.author || '未知作者'
  script.version = script.version || '1.0.0'
  script.likes = Number(script.likes) || 0
  script.isLiked = !!script.isLiked
  script.isFavorited = true
  return script
}

/**
 * 获取剧本列表
 */
async function getScriptList(data) {
    const { page = 1, pageSize = 20, category = 'all', status = 'published' } = data
    console.log('getScriptList called with:', { page, pageSize, category, status })

    // 输入验证
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return {
        success: false,
        message: 'Invalid pagination parameters'
      }
    }

    try {
      const db = uniCloud.database()
      const collection = db.collection('scripts')

      // 构建查询条件
      const whereCondition = { status }
      if (category !== 'all') {
        whereCondition.category = category
      }

      console.log('查询条件:', whereCondition)

      // 计算跳过的记录数
      const skip = (page - 1) * pageSize

      // 查询数据
      const result = await collection
        .where(whereCondition)
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get()

      console.log('查询结果:', result)

      // 获取总数
      const totalResult = await collection.where(whereCondition).count()
      console.log('总数统计:', totalResult)

      const responseData = {
        list: result.data,
        total: totalResult.total,
        page,
        pageSize,
        totalPages: Math.ceil(totalResult.total / pageSize)
      }

      console.log('返回数据:', responseData)

      return {
        success: true,
        data: responseData
      }
    } catch (error) {
      console.error('Get script list error:', error)
      return {
        success: false,
        message: 'Failed to get script list: ' + error.message
      }
    }
  }

/**
 * 获取剧本详情
 */
async function getScriptDetail(data) {
    const { scriptId } = data

    // 输入验证
    if (!scriptId) {
      return {
        success: false,
        message: 'scriptId is required'
      }
    }

    try {
      const db = uniCloud.database()
      const result = await db.collection('scripts')
        .doc(scriptId)
        .get()

      if (!result.data || result.data.length === 0) {
        return {
          success: false,
          message: 'Script not found'
        }
      }

      const script = result.data[0]

      // 更新浏览量
      await db.collection('scripts')
        .doc(scriptId)
        .update({
          views: (script.views || 0) + 1,
          updateTime: Date.now()
        })

      return {
        success: true,
        data: {
          script: {
            ...script,
            views: (script.views || 0) + 1
          }
        }
      }
    } catch (error) {
      console.error('Get script detail error:', error)
      return {
        success: false,
        message: 'Failed to get script detail'
      }
    }
  }

/**
 * 搜索剧本
 */
async function searchScripts(data) {
    const { keyword = '', tags = [], page = 1, pageSize = 20 } = data

    // 输入验证
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return {
        success: false,
        message: 'Invalid pagination parameters'
      }
    }

    try {
      const db = uniCloud.database()
      const collection = db.collection('scripts')

      // 构建查询条件
      const whereCondition = {
        status: 'published'
      }

      // 关键词搜索
      if (keyword) {
        whereCondition.title = new RegExp(keyword, 'i')
      }

      // 标签过滤
      if (tags && tags.length > 0) {
        whereCondition.tags = db.command.in(tags)
      }

      // 计算跳过的记录数
      const skip = (page - 1) * pageSize

      // 查询数据
      const result = await collection
        .where(whereCondition)
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get()

      // 获取总数
      const totalResult = await collection.where(whereCondition).count()

      return {
        success: true,
        data: {
          list: result.data,
          total: totalResult.total,
          page,
          pageSize,
          totalPages: Math.ceil(totalResult.total / pageSize),
          keyword,
          tags
        }
      }
    } catch (error) {
      console.error('Search scripts error:', error)
      return {
        success: false,
        message: 'Failed to search scripts'
      }
    }
  }

/**
 * 创建剧本
 */
async function createScript(data) {
    const { scriptData } = data

    // 输入验证
    if (!scriptData || !scriptData.title) {
      return {
        success: false,
        message: 'Script title is required'
      }
    }

    try {
      const db = uniCloud.database()

      const scriptDoc = {
        ...scriptData,
        status: 'published',
        likes: 0,
        views: 0,
        createTime: Date.now(),
        updateTime: Date.now()
      }

      const result = await db.collection('scripts').add(scriptDoc)

      return {
        success: true,
        data: {
          scriptId: result.id,
          message: 'Script created successfully'
        }
      }
    } catch (error) {
      console.error('Create script error:', error)
      return {
        success: false,
        message: 'Failed to create script'
      }
    }
  }

/**
 * 更新剧本点赞
 */
async function likeScript(data) {
    const { token, scriptId, action } = data

    // 输入验证
    if (!scriptId) {
      return {
        success: false,
        message: 'scriptId is required'
      }
    }

    if (!['like', 'unlike'].includes(action)) {
      return {
        success: false,
        message: 'Invalid action'
      }
    }

    try {
      const db = uniCloud.database()
      const user = await verifyAppUser(db, token)
      if (!user) {
        return {
          success: false,
          message: '请先登录'
        }
      }

      // 获取当前剧本
      const scriptResult = await db.collection('scripts')
        .doc(scriptId)
        .get()

      if (!scriptResult.data || scriptResult.data.length === 0) {
        return {
          success: false,
          message: 'Script not found'
        }
      }

      const script = scriptResult.data[0]
      const currentLikes = script.likes || 0
      const likesCollection = db.collection('script-likes')
      const likedResult = await likesCollection
        .where({ userId: user._id, scriptId })
        .limit(1)
        .get()
      const likedRecord = likedResult.data && likedResult.data[0]
      let newLikes = currentLikes

      if (action === 'like' && !likedRecord) {
        await likesCollection.add({
          userId: user._id,
          scriptId,
          createTime: Date.now()
        })
        newLikes = currentLikes + 1
      }

      if (action === 'unlike' && likedRecord) {
        await likesCollection.doc(likedRecord._id).remove()
        newLikes = Math.max(0, currentLikes - 1)
      }

      if (newLikes !== currentLikes) {
        await db.collection('scripts')
          .doc(scriptId)
          .update({
            likes: newLikes,
            updateTime: Date.now()
          })
      }

      return {
        success: true,
        data: {
          likes: newLikes,
          message: action === 'like' ? '点赞成功' : '取消点赞成功'
        }
      }
    } catch (error) {
      console.error('Like script error:', error)
      return {
        success: false,
        message: 'Failed to update like'
      }
    }
}

async function favoriteScript(data) {
  const { token, scriptId, action } = data

  if (!scriptId) {
    return { success: false, message: 'scriptId is required' }
  }

  if (!['favorite', 'unfavorite'].includes(action)) {
    return { success: false, message: 'Invalid action' }
  }

  try {
    const db = uniCloud.database()
    const user = await verifyAppUser(db, token)
    if (!user) {
      return { success: false, message: '请先登录' }
    }

    const scriptResult = await db.collection('scripts').doc(scriptId).get()
    if (!scriptResult.data || scriptResult.data.length === 0) {
      return { success: false, message: 'Script not found' }
    }

    const favoritesCollection = db.collection('script-favorites')
    const favoriteResult = await favoritesCollection
      .where({ userId: user._id, scriptId })
      .limit(1)
      .get()
    const favoriteRecord = favoriteResult.data && favoriteResult.data[0]

    if (action === 'favorite' && !favoriteRecord) {
      await favoritesCollection.add({
        userId: user._id,
        scriptId,
        createTime: Date.now()
      })
    }

    if (action === 'unfavorite' && favoriteRecord) {
      await favoritesCollection.doc(favoriteRecord._id).remove()
    }

    return {
      success: true,
      data: {
        isFavorited: action === 'favorite',
        message: action === 'favorite' ? '收藏成功' : '已取消收藏'
      }
    }
  } catch (error) {
    console.error('Favorite script error:', error)
    return { success: false, message: 'Failed to update favorite' }
  }
}

function buildFavoriteListItem(script, favorite, likedIds) {
  const id = script._id || script.id
  const images = Array.isArray(script.thumbnails) && script.thumbnails.length
    ? script.thumbnails
    : (script.images || (script.thumbnail ? [script.thumbnail] : []))
  return {
    id,
    title: script.title || '未命名剧本',
    author: script.author || '未知作者',
    version: script.version || '1.0.0',
    description: script.description || '',
    images: normalizeUploadImages(images),
    likes: Number(script.likes) || 0,
    isLiked: likedIds.has(id),
    isFavorited: true,
    favoriteTime: favorite && favorite.createTime
  }
}

async function getFavoriteScripts(data) {
  const { token, page = 1, pageSize = 10, q = '' } = data || {}
  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const limit = Math.max(1, Math.min(50, parseInt(pageSize, 10) || 10))
  const keyword = String(q || '').trim().toLowerCase()

  try {
    const db = uniCloud.database()
    const user = await verifyAppUser(db, token)
    if (!user) {
      return { success: false, message: '请先登录' }
    }

    const favoritesCollection = db.collection('script-favorites')
    let favoriteRows = []
    let total = 0

    if (keyword) {
      const allResult = await favoritesCollection
        .where({ userId: user._id })
        .orderBy('createTime', 'desc')
        .limit(200)
        .get()
      favoriteRows = allResult.data || []
    } else {
      const countResult = await favoritesCollection.where({ userId: user._id }).count()
      total = countResult.total || 0
      const pageResult = await favoritesCollection
        .where({ userId: user._id })
        .orderBy('createTime', 'desc')
        .skip((pageNum - 1) * limit)
        .limit(limit)
        .get()
      favoriteRows = pageResult.data || []
    }

    const favoriteByScriptId = new Map()
    const scriptIds = favoriteRows.map(favorite => {
      favoriteByScriptId.set(favorite.scriptId, favorite)
      return favorite.scriptId
    }).filter(Boolean)

    let scripts = []
    if (scriptIds.length > 0) {
      const [scriptsResult, likeResult] = await Promise.all([
        db.collection('scripts')
          .where({ _id: db.command.in(scriptIds) })
          .field({ title: true, author: true, version: true, description: true, thumbnails: true, thumbnail: true, images: true, likes: true })
          .get(),
        db.collection('script-likes')
          .where({ userId: user._id, scriptId: db.command.in(scriptIds) })
          .get()
      ])
      const likedIds = new Set((likeResult.data || []).map(row => row.scriptId))
      const scriptMap = new Map((scriptsResult.data || []).map(script => [script._id, script]))

      scripts = scriptIds
        .map(scriptId => {
          const script = scriptMap.get(scriptId)
          if (!script) return null
          const favorite = favoriteByScriptId.get(scriptId)
          return buildFavoriteListItem(script, favorite, likedIds)
        })
        .filter(Boolean)
    }

    let list = scripts
    if (keyword) {
      list = scripts.filter(script => {
        const title = String(script.title || '').toLowerCase()
        const author = String(script.author || '').toLowerCase()
        const description = String(script.description || '').toLowerCase()
        return title.includes(keyword) || author.includes(keyword) || description.includes(keyword)
      })
      total = list.length
      list = list.slice((pageNum - 1) * limit, pageNum * limit)
    }

    return {
      success: true,
      data: {
        list,
        total,
        page: pageNum,
        pageSize: limit
      }
    }
  } catch (error) {
    console.error('Get favorite scripts error:', error)
    return { success: false, message: 'Failed to get favorite scripts' }
  }
}

/**
 * 管理员权限验证
 */
function normalizeUploadImages(images) {
  if (!Array.isArray(images)) return []
  return images
    .map(image => {
      if (typeof image === 'string') return image
      if (image && typeof image === 'object') return image.url || image.fileID || image.fileId || ''
      return ''
    })
    .filter(Boolean)
    .slice(0, 3)
}

function normalizeUploadedScriptData(jsonData) {
  if (Array.isArray(jsonData)) {
    const meta = jsonData.find(item => item && typeof item === 'object' && item.id === '_meta') || {}
    const title = meta.name || meta.title || '未命名剧本'
    return {
      title,
      name: meta.name || title,
      author: meta.author || '未知作者',
      description: meta.description || '',
      content: jsonData,
      characters: jsonData,
      rawFormat: 'clocktower-script-array'
    }
  }

  return jsonData
}

async function userUploadScript(data) {
  const { token, images = [] } = data || {}
  const jsonData = normalizeUploadedScriptData(data && data.jsonData)
  const requestedType = data && data.scriptType
  const jsonType = jsonData && (jsonData.tag || jsonData.genre || jsonData.category)
  const scriptType = ['推理', '娱乐'].includes(requestedType)
    ? requestedType
    : (['推理', '娱乐'].includes(jsonType) ? jsonType : '推理')

  if (!jsonData || typeof jsonData !== 'object') {
    return { success: false, message: 'Invalid JSON data' }
  }

  if (!jsonData.title && typeof jsonData.name === 'string' && jsonData.name.trim()) {
    jsonData.title = jsonData.name.trim()
  }

  if (!jsonData.title || typeof jsonData.title !== 'string') {
    return { success: false, message: 'Script title or name is required and must be a string' }
  }

  try {
    const db = uniCloud.database()
    const user = await verifyAppUser(db, token)
    if (!user) {
      return { success: false, message: '请先登录' }
    }

    const uploadedImages = normalizeUploadImages(images)
    const now = Date.now()
    const ownerNickname = user.nickname || user.username || user.mobile || '微信用户'
    const scriptDoc = {
      ...jsonData,
      images: uploadedImages,
      thumbnails: uploadedImages,
      thumbnail: uploadedImages[0] || jsonData.thumbnail || '',
      tag: scriptType,
      genre: scriptType,
      category: scriptType,
      ownerUserId: user._id,
      ownerNickname,
      source: 'user_upload',
      status: 'pending',
      visibility: 'public',
      reviewStatus: 'pending',
      reviewReason: '',
      likes: 0,
      views: 0,
      usageCount: 0,
      createTime: now,
      updateTime: now
    }

    const result = await db.collection('scripts').add(scriptDoc)

    return {
      success: true,
      data: {
        scriptId: result.id,
        message: '已提交审核'
      }
    }
  } catch (error) {
    console.error('User upload script error:', error)
    return { success: false, message: 'Failed to upload script' }
  }
}

function buildMyUploadListItem(script) {
  return {
    id: script._id,
    title: script.title || '未命名剧本',
    author: script.author || '未知作者',
    status: script.status || 'pending',
    reviewStatus: script.reviewStatus || script.status || 'pending',
    reviewReason: script.reviewReason || '',
    source: script.source || 'user_upload',
    images: normalizeUploadImages(script.images || script.thumbnails || []),
    description: script.description || '',
    createTime: script.createTime || 0,
    updateTime: script.updateTime || 0
  }
}

async function getMyUploadedScripts(data) {
  const { token, page = 1, pageSize = 10, q = '' } = data || {}
  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const limit = Math.max(1, Math.min(50, parseInt(pageSize, 10) || 10))
  const keyword = String(q || '').trim().toLowerCase()

  try {
    const db = uniCloud.database()
    const user = await verifyAppUser(db, token)
    if (!user) {
      return { success: false, message: '请先登录' }
    }

    const whereCondition = { ownerUserId: user._id, source: 'user_upload' }
    const collection = db.collection('scripts')
    const listFields = {
      title: true,
      author: true,
      status: true,
      reviewStatus: true,
      reviewReason: true,
      source: true,
      images: true,
      thumbnails: true,
      description: true,
      createTime: true,
      updateTime: true
    }
    let total = 0
    let rows = []

    if (keyword) {
      const result = await collection
        .where(whereCondition)
        .field(listFields)
        .orderBy('createTime', 'desc')
        .limit(200)
        .get()
      const filtered = (result.data || []).filter(script => {
        const title = String(script.title || '').toLowerCase()
        const author = String(script.author || '').toLowerCase()
        const description = String(script.description || '').toLowerCase()
        return title.includes(keyword) || author.includes(keyword) || description.includes(keyword)
      })
      total = filtered.length
      rows = filtered.slice((pageNum - 1) * limit, pageNum * limit)
    } else {
      const totalResult = await collection.where(whereCondition).count()
      total = totalResult.total || 0
      const result = await collection
        .where(whereCondition)
        .field(listFields)
        .orderBy('createTime', 'desc')
        .skip((pageNum - 1) * limit)
        .limit(limit)
        .get()
      rows = result.data || []
    }

    const list = rows.map(buildMyUploadListItem)

    return {
      success: true,
      data: {
        list,
        total,
        page: pageNum,
        pageSize: limit
      }
    }
  } catch (error) {
    console.error('Get my uploaded scripts error:', error)
    return { success: false, message: 'Failed to get uploaded scripts' }
  }
}

async function getMyUploadedScriptDetail(data) {
  const { token, scriptId } = data || {}

  if (!scriptId) {
    return { success: false, message: 'scriptId is required' }
  }

  try {
    const db = uniCloud.database()
    const user = await verifyAppUser(db, token)
    if (!user) {
      return { success: false, message: '请先登录' }
    }

    const result = await db.collection('scripts').doc(scriptId).get()
    const script = result.data && result.data[0]
    if (!script || script.ownerUserId !== user._id || script.source !== 'user_upload') {
      return { success: false, message: 'Script not found' }
    }

    return {
      success: true,
      data: {
        script: {
          ...script,
          id: script._id,
          images: normalizeUploadImages(script.images || script.thumbnails || [])
        }
      }
    }
  } catch (error) {
    console.error('Get my uploaded script detail error:', error)
    return { success: false, message: 'Failed to get uploaded script detail' }
  }
}

async function deleteMyUploadedScript(data) {
  const { token, scriptId } = data || {}

  if (!scriptId) {
    return { success: false, message: 'scriptId is required' }
  }

  try {
    const db = uniCloud.database()
    const user = await verifyAppUser(db, token)
    if (!user) {
      return { success: false, message: '请先登录' }
    }

    const result = await db.collection('scripts').doc(scriptId).get()
    const script = result.data && result.data[0]
    if (!script || script.ownerUserId !== user._id || script.source !== 'user_upload') {
      return { success: false, message: 'Script not found' }
    }

    await db.collection('scripts').doc(scriptId).remove()

    return {
      success: true,
      data: {
        message: '删除成功'
      }
    }
  } catch (error) {
    console.error('Delete my uploaded script error:', error)
    return { success: false, message: 'Failed to delete uploaded script' }
  }
}

async function verifyAdmin(context) {
  const { uid } = context
  if (!uid) {
    throw new Error('Authentication required')
  }

  const db = uniCloud.database()
  const userResult = await db.collection('uni-id-users').doc(uid).get()

  if (!userResult.data || userResult.data.length === 0) {
    throw new Error('User not found')
  }

  const user = userResult.data[0]
  if (user.role !== 'admin') {
    throw new Error('Admin permission required')
  }

  return user
}

/**
 * 管理员创建剧本 (JSON上传)
 */
async function adminCreateScript(data, context) {
  // 验证管理员权限
  try {
    await verifyAdmin(context)
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }

  const { jsonData } = data

  // 输入验证
  if (!jsonData || typeof jsonData !== 'object') {
    return {
      success: false,
      message: 'Invalid JSON data'
    }
  }

  if (!jsonData.title || typeof jsonData.title !== 'string') {
    return {
      success: false,
      message: 'Script title is required and must be a string'
    }
  }

  try {
    const db = uniCloud.database()

    const scriptDoc = {
      ...jsonData,
      ownerUserId: null,
      ownerNickname: '官方',
      source: 'admin_upload',
      status: 'published',
      visibility: 'public',
      reviewStatus: 'approved',
      reviewReason: '',
      likes: 0,
      views: 0,
      createTime: Date.now(),
      updateTime: Date.now()
    }

    const result = await db.collection('scripts').add(scriptDoc)

    return {
      success: true,
      data: {
        scriptId: result.id,
        message: 'Script created successfully'
      }
    }
  } catch (error) {
    console.error('Admin create script error:', error)
    return {
      success: false,
      message: 'Failed to create script'
    }
  }
}

/**
 * 管理员删除剧本
 */
async function adminDeleteScript(data, context) {
  // 验证管理员权限
  try {
    await verifyAdmin(context)
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }

  const { scriptId } = data

  if (!scriptId) {
    return {
      success: false,
      message: 'scriptId is required'
    }
  }

  try {
    const db = uniCloud.database()

    // 检查剧本是否存在
    const scriptResult = await db.collection('scripts').doc(scriptId).get()
    if (!scriptResult.data || scriptResult.data.length === 0) {
      return {
        success: false,
        message: 'Script not found'
      }
    }

    // 删除剧本
    await db.collection('scripts').doc(scriptId).remove()

    return {
      success: true,
      data: {
        message: 'Script deleted successfully'
      }
    }
  } catch (error) {
    console.error('Admin delete script error:', error)
    return {
      success: false,
      message: 'Failed to delete script'
    }
  }
}

/**
 * 管理员获取所有剧本 (包括草稿状态)
 */
async function adminGetAllScripts(data, context) {
  // 验证管理员权限
  try {
    await verifyAdmin(context)
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }

  const { page = 1, pageSize = 20, status = 'all', source = 'all' } = data

  // 输入验证
  if (page < 1 || pageSize < 1 || pageSize > 100) {
    return {
      success: false,
      message: 'Invalid pagination parameters'
    }
  }

  try {
    const db = uniCloud.database()
    const collection = db.collection('scripts')

    // 构建查询条件
    const whereCondition = {}
    if (status !== 'all') {
      whereCondition.status = status
    }
    if (source !== 'all') {
      whereCondition.source = source
    }

    // 计算跳过的记录数
    const skip = (page - 1) * pageSize

    // 查询数据
    const result = await collection
      .where(whereCondition)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    // 获取总数
    const totalResult = await collection.where(whereCondition).count()

    return {
      success: true,
      data: {
        list: result.data,
        total: totalResult.total,
        page,
        pageSize,
        totalPages: Math.ceil(totalResult.total / pageSize)
      }
    }
  } catch (error) {
    console.error('Admin get all scripts error:', error)
    return {
      success: false,
      message: 'Failed to get scripts'
    }
  }
}

/**
 * 初始化剧本数据
 */
async function initScripts(data = {}) {
  const { force = false } = data
  console.log('initScripts called with force:', force)

  try {
    const db = uniCloud.database()
    const collection = db.collection('scripts')

    // 检查是否已有数据
    const existing = await collection.limit(1).get()
    console.log('检查现有数据:', existing)

    if (existing.data && existing.data.length > 0 && !force) {
      console.log('数据库已有数据，跳过初始化')
      return {
        success: true,
        message: 'Database already initialized',
        existingCount: existing.data.length
      }
    }

    if (existing.data && existing.data.length > 0 && force) {
      console.log('强制重新初始化，清空现有数据...')
      // 使用doc().remove()逐个删除
      const allData = await collection.get()
      for (const item of allData.data || []) {
        await collection.doc(item._id).remove()
      }
      console.log('已清空现有数据')
    }

    // 批量插入测试数据
    console.log('插入测试数据:', testScripts.length, '个剧本')
    const result = await collection.add(testScripts)
    console.log('插入结果:', result)

    // 验证数据是否正确插入
    const verifyResult = await collection.where({status: 'published'}).count()
    console.log('验证published状态数据:', verifyResult)

    return {
      success: true,
      message: `Initialized ${testScripts.length} scripts`,
      data: result,
      verifyCount: verifyResult.total
    }
  } catch (error) {
    console.error('Init scripts error:', error)
    return {
      success: false,
      message: 'Failed to initialize scripts: ' + error.message
    }
  }
}

// 云函数入口
const main = async (event, context) => {
  const { method, params = [] } = event

  try {
    switch (method) {
      case 'getScriptList':
        return await getScriptList(...params)
      case 'getScriptDetail':
        return await getScriptDetail(...params)
      case 'searchScripts':
        return await searchScripts(...params)
      case 'createScript':
        return await createScript(...params)
      case 'likeScript':
        return await likeScript(...params)
      case 'favoriteScript':
        return await favoriteScript(...params)
      case 'getFavoriteScripts':
        return await getFavoriteScripts(...params)
      case 'userUploadScript':
        return await userUploadScript(...params)
      case 'getMyUploadedScripts':
        return await getMyUploadedScripts(...params)
      case 'getMyUploadedScriptDetail':
        return await getMyUploadedScriptDetail(...params)
      case 'deleteMyUploadedScript':
        return await deleteMyUploadedScript(...params)
      case 'initScripts':
        return await initScripts(...params)
      // 管理员专用方法
      case 'adminCreateScript':
        return await adminCreateScript(...params, context)
      case 'adminDeleteScript':
        return await adminDeleteScript(...params, context)
      case 'adminGetAllScripts':
        return await adminGetAllScripts(...params, context)
      default:
        return {
          success: false,
          message: `Unknown method: ${method}`
        }
    }
  } catch (error) {
    console.error('Script service error:', error)
    return {
      success: false,
      message: 'Internal server error'
    }
  }
}

module.exports = {
  main,
  getScriptList,
  getScriptDetail,
  searchScripts,
  createScript,
  likeScript,
  favoriteScript,
  getFavoriteScripts,
  userUploadScript,
  getMyUploadedScripts,
  getMyUploadedScriptDetail,
  deleteMyUploadedScript,
  initScripts,
  // 管理员专用方法
  adminCreateScript,
  adminDeleteScript,
  adminGetAllScripts,
  verifyAdmin
}
