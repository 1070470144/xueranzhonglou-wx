/**
 * 统一剧本管理API工具函数
 * 提供前端调用剧本管理云对象的一致接口
 */

// 云对象名称
const SCRIPT_MANAGER = 'scriptManager'

/**
 * 统一的API响应处理
 * @param {Object} result - 云函数调用结果
 * @returns {Object} 标准化响应对象
 */
function handleApiResponse(result) {
  if (result.result && result.result.code === 0) {
    return {
      success: true,
      data: result.result.data,
      message: result.result.message || '操作成功'
    }
  } else {
    return {
      success: false,
      data: null,
      message: result.result?.message || '操作失败',
      code: result.result?.code || -1
    }
  }
}

/**
 * 统一的错误处理
 * @param {Error} error - 错误对象
 * @returns {Object} 标准化错误响应
 */
function handleApiError(error) {
  console.error('API调用错误:', error)
  return {
    success: false,
    data: null,
    message: error.message || '网络错误，请稍后重试',
    code: -1
  }
}

/**
 * 获取剧本列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码 (默认: 1)
 * @param {number} params.pageSize - 每页数量 (默认: 20)
 * @param {string} params.keyword - 搜索关键词
 * @param {string} params.status - 状态筛选
 * @param {string} params.category - 分类筛选
 * @returns {Promise<Object>} API响应
 */
export async function getScriptList(params = {}) {
  try {
    const result = await uniCloud.callFunction({
      name: SCRIPT_MANAGER,
      data: {
        action: 'list',
        page: params.page || 1,
        pageSize: params.pageSize || 20,
        keyword: params.keyword,
        status: params.status,
        category: params.category
      }
    })
    return handleApiResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * 获取单个剧本详情
 * @param {string} scriptId - 剧本ID
 * @returns {Promise<Object>} API响应
 */
export async function getScriptDetail(scriptId) {
  if (!scriptId) {
    return {
      success: false,
      data: null,
      message: '剧本ID不能为空',
      code: -1
    }
  }

  try {
    const result = await uniCloud.callFunction({
      name: SCRIPT_MANAGER,
      data: {
        action: 'get',
        id: scriptId
      }
    })
    return handleApiResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * 创建新剧本
 * @param {Object} scriptData - 剧本数据
 * @param {string} scriptData.title - 剧本标题
 * @param {string} scriptData.content - 剧本内容
 * @param {string} scriptData.author - 作者
 * @param {string} scriptData.status - 状态 (默认: 'active')
 * @param {Array<string>} scriptData.tags - 标签数组
 * @param {string} scriptData.category - 分类
 * @param {string} scriptData.description - 描述
 * @returns {Promise<Object>} API响应
 */
export async function createScript(scriptData) {
  if (!scriptData.title || !scriptData.content || !scriptData.author) {
    return {
      success: false,
      data: null,
      message: '标题、内容和作者为必填项',
      code: -1
    }
  }

  try {
    const result = await uniCloud.callFunction({
      name: SCRIPT_MANAGER,
      data: {
        action: 'create',
        ...scriptData
      }
    })
    return handleApiResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * 更新剧本信息
 * @param {string} scriptId - 剧本ID
 * @param {Object} updateData - 更新数据
 * @returns {Promise<Object>} API响应
 */
export async function updateScript(scriptId, updateData) {
  if (!scriptId) {
    return {
      success: false,
      data: null,
      message: '剧本ID不能为空',
      code: -1
    }
  }

  try {
    const result = await uniCloud.callFunction({
      name: SCRIPT_MANAGER,
      data: {
        action: 'update',
        id: scriptId,
        ...updateData
      }
    })
    return handleApiResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * 删除剧本
 * @param {string} scriptId - 剧本ID
 * @returns {Promise<Object>} API响应
 */
export async function deleteScript(scriptId) {
  if (!scriptId) {
    return {
      success: false,
      data: null,
      message: '剧本ID不能为空',
      code: -1
    }
  }

  try {
    const result = await uniCloud.callFunction({
      name: SCRIPT_MANAGER,
      data: {
        action: 'delete',
        id: scriptId
      }
    })
    return handleApiResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * 上传剧本文件
 * @param {Object} uploadData - 上传数据
 * @param {string} uploadData.filePath - 文件临时路径
 * @param {string} uploadData.title - 剧本标题
 * @param {string} uploadData.author - 作者
 * @param {string} uploadData.description - 描述
 * @param {Array<string>} uploadData.tags - 标签数组
 * @returns {Promise<Object>} API响应
 */
export async function uploadScriptFile(uploadData) {
  if (!uploadData.filePath || !uploadData.title || !uploadData.author) {
    return {
      success: false,
      data: null,
      message: '文件路径、标题和作者为必填项',
      code: -1
    }
  }

  try {
    const result = await uniCloud.callFunction({
      name: SCRIPT_MANAGER,
      data: {
        action: 'upload',
        ...uploadData
      }
    })
    return handleApiResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}

// 默认导出所有API函数
export default {
  getScriptList,
  getScriptDetail,
  createScript,
  updateScript,
  deleteScript,
  uploadScriptFile
}
