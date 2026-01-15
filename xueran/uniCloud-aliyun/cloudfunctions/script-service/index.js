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
    const { scriptId, action } = data

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

      // 更新点赞数
      const newLikes = action === 'like' ? currentLikes + 1 : Math.max(0, currentLikes - 1)

      await db.collection('scripts')
        .doc(scriptId)
        .update({
          likes: newLikes,
          updateTime: Date.now()
        })

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

/**
 * 管理员权限验证
 */
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

  const { page = 1, pageSize = 20, status = 'all' } = data

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
  initScripts,
  // 管理员专用方法
  adminCreateScript,
  adminDeleteScript,
  adminGetAllScripts,
  verifyAdmin
}
