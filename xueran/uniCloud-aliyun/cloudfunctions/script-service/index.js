'use strict'

/**
 * 获取剧本列表
 */
async function getScriptList(data) {
    const { page = 1, pageSize = 20, category = 'all', status = 'published' } = data

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
      console.error('Get script list error:', error)
      return {
        success: false,
        message: 'Failed to get script list'
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
          message: action === 'like' ? 'Liked successfully' : 'Unliked successfully'
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
  likeScript
}
