/**
 * 小程序端API工具函数
 */

// 点赞状态本地存储键前缀
const LIKE_STATUS_KEY_PREFIX = 'script_like_';

/**
 * 获取剧本的点赞状态（本地存储）
 * @param {string} scriptId - 剧本ID
 * @returns {boolean} 是否已点赞
 */
export function getLikeStatus(scriptId) {
  try {
    const key = LIKE_STATUS_KEY_PREFIX + scriptId;
    return uni.getStorageSync(key) || false;
  } catch (e) {
    console.warn('获取点赞状态失败:', e);
    return false;
  }
}

/**
 * 设置剧本的点赞状态（本地存储）
 * @param {string} scriptId - 剧本ID
 * @param {boolean} isLiked - 是否已点赞
 */
export function setLikeStatus(scriptId, isLiked) {
  try {
    const key = LIKE_STATUS_KEY_PREFIX + scriptId;
    if (isLiked) {
      uni.setStorageSync(key, true);
    } else {
      uni.removeStorageSync(key);
    }
  } catch (e) {
    console.warn('设置点赞状态失败:', e);
  }
}

/**
 * 点赞剧本
 * @param {string} scriptId - 剧本ID
 * @returns {Promise<Object>} API响应
 */
export async function likeScript(scriptId) {
  try {
    // 小程序必须调用本项目内的云对象 script-service
    const res = await uniCloud.callFunction({
      name: 'script-service',
      data: {
        method: 'likeScript',
        params: [{ scriptId, action: 'like' }]
      }
    });
    const result = (res && res.result) ? res.result : res;

    if (result && result.success) {
      setLikeStatus(scriptId, true);
      const msg = (result.data && result.data.message) || result.message || '点赞成功';
      return { success: true, message: msg };
    } else {
      const serverMsg = result && (result.message || result.errMsg || (result.data && result.data.message));
      return { success: false, message: serverMsg || '点赞失败' };
    }
  } catch (error) {
    try {
      const short = error && (error.message || (error.result && error.result.errMsg)) || String(error);
      console.error('点赞API调用失败:', short);
    } catch (e) {
      console.error('点赞API调用失败: (unknown error)');
    }
    const userMsg = error && (error.message || (error.result && (error.result.errMsg || error.result.message))) || '网络错误，请重试';
    return { success: false, message: userMsg };
  }
}

/**
 * 取消点赞剧本
 * @param {string} scriptId - 剧本ID
 * @returns {Promise<Object>} API响应
 */
export async function unlikeScript(scriptId) {
  try {
    // 小程序必须调用本项目内的云对象 script-service
    const res = await uniCloud.callFunction({
      name: 'script-service',
      data: {
        method: 'likeScript',
        params: [{ scriptId, action: 'unlike' }]
      }
    });
    const result = (res && res.result) ? res.result : res;

    if (result && result.success) {
      setLikeStatus(scriptId, false);
      const msg = (result.data && result.data.message) || result.message || '取消点赞成功';
      return { success: true, message: msg };
    } else {
      const serverMsg = result && (result.message || result.errMsg || (result.data && result.data.message));
      return { success: false, message: serverMsg || '取消点赞失败' };
    }
  } catch (error) {
    try {
      const short = error && (error.message || (error.result && error.result.errMsg)) || String(error);
      console.error('取消点赞API调用失败:', short);
    } catch (e) {
      console.error('取消点赞API调用失败: (unknown error)');
    }
    const userMsg = error && (error.message || (error.result && (error.result.errMsg || error.result.message))) || '网络错误，请重试';
    return { success: false, message: userMsg };
  }
}

/**
 * 初始化剧本的点赞状态
 * @param {Object} script - 剧本对象
 * @returns {Object} 添加了isLiked属性的剧本对象
 */
export function initScriptLikeStatus(script) {
  if (script && script.id) {
    script.isLiked = getLikeStatus(script.id);
  }
  return script;
}

/**
 * 批量初始化剧本列表的点赞状态
 * @param {Array} scripts - 剧本数组
 * @returns {Array} 添加了isLiked属性的剧本数组
 */
export function initScriptsLikeStatus(scripts) {
  if (Array.isArray(scripts)) {
    return scripts.map(script => initScriptLikeStatus(script));
  }
  return scripts;
}