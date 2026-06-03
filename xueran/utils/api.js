import { getAuthToken, requireLogin } from '@/utils/auth.js';

function normalizeResult(res) {
  return res && res.result ? res.result : res;
}

function getServerMessage(result, fallback) {
  return (result && (result.message || result.errMsg || (result.data && result.data.message))) || fallback;
}

async function callScriptService(method, params) {
  const res = await uniCloud.callFunction({
    name: 'script-service',
    data: {
      method,
      params: [params]
    }
  });
  return normalizeResult(res);
}

function requireToken(redirectUrl) {
  const token = getAuthToken();
  if (!token) {
    requireLogin(redirectUrl);
    return '';
  }
  return token;
}

function markFavoritesDirty() {
  try {
    uni.setStorageSync('favorites_dirty', Date.now());
  } catch (error) {}
}

function markUploadsDirty() {
  try {
    uni.setStorageSync('uploads_dirty', Date.now());
  } catch (error) {}
}

export async function likeScript(scriptId) {
  const token = requireToken('/pages/script-list/script-list');
  if (!token) {
    return { success: false, message: '请先登录后点赞' };
  }

  try {
    const result = await callScriptService('likeScript', { token, scriptId, action: 'like' });
    if (result && result.success) {
      return {
        success: true,
        message: getServerMessage(result, '点赞成功'),
        likes: result.data && result.data.likes
      };
    }
    return { success: false, message: getServerMessage(result, '点赞失败') };
  } catch (error) {
    console.error('likeScript failed:', error);
    return { success: false, message: '网络错误，请重试' };
  }
}

export async function unlikeScript(scriptId) {
  const token = requireToken('/pages/script-list/script-list');
  if (!token) {
    return { success: false, message: '请先登录后操作' };
  }

  try {
    const result = await callScriptService('likeScript', { token, scriptId, action: 'unlike' });
    if (result && result.success) {
      return {
        success: true,
        message: getServerMessage(result, '已取消点赞'),
        likes: result.data && result.data.likes
      };
    }
    return { success: false, message: getServerMessage(result, '取消点赞失败') };
  } catch (error) {
    console.error('unlikeScript failed:', error);
    return { success: false, message: '网络错误，请重试' };
  }
}

export async function favoriteScript(scriptId) {
  const token = requireToken('/pages/script-list/script-list');
  if (!token) {
    return { success: false, message: '请先登录后收藏' };
  }

  try {
    const result = await callScriptService('favoriteScript', { token, scriptId, action: 'favorite' });
    if (result && result.success) {
      markFavoritesDirty();
      return { success: true, message: getServerMessage(result, '收藏成功') };
    }
    return { success: false, message: getServerMessage(result, '收藏失败') };
  } catch (error) {
    console.error('favoriteScript failed:', error);
    return { success: false, message: '网络错误，请重试' };
  }
}

export async function unfavoriteScript(scriptId) {
  const token = requireToken('/pages/script-list/script-list');
  if (!token) {
    return { success: false, message: '请先登录后操作' };
  }

  try {
    const result = await callScriptService('favoriteScript', { token, scriptId, action: 'unfavorite' });
    if (result && result.success) {
      markFavoritesDirty();
      return { success: true, message: getServerMessage(result, '已取消收藏') };
    }
    return { success: false, message: getServerMessage(result, '取消收藏失败') };
  } catch (error) {
    console.error('unfavoriteScript failed:', error);
    return { success: false, message: '网络错误，请重试' };
  }
}

export async function getFavoriteScripts({ page = 1, pageSize = 10, q = '' } = {}) {
  const token = requireToken('/pages/favorites/favorites');
  if (!token) {
    return { success: false, message: '请先登录后查看收藏', data: { list: [], total: 0, page, pageSize } };
  }

  try {
    const result = await callScriptService('getFavoriteScripts', { token, page, pageSize, q });
    if (result && result.success) {
      return result;
    }
    return {
      success: false,
      message: getServerMessage(result, '加载收藏失败'),
      data: { list: [], total: 0, page, pageSize }
    };
  } catch (error) {
    console.error('getFavoriteScripts failed:', error);
    return { success: false, message: '网络错误，请重试', data: { list: [], total: 0, page, pageSize } };
  }
}

export async function uploadUserScript({ jsonData, images = [], scriptType = '推理' } = {}) {
  const token = requireToken('/pages/rankings/rankings');
  if (!token) {
    return { success: false, message: '请先登录后上传' };
  }

  try {
    const result = await callScriptService('userUploadScript', { token, jsonData, images, scriptType });
    if (result && result.success) {
      markUploadsDirty();
      return result;
    }
    return { success: false, message: getServerMessage(result, '上传失败') };
  } catch (error) {
    console.error('uploadUserScript failed:', error);
    return { success: false, message: '网络错误，请重试' };
  }
}

export async function getMyUploadedScripts({ page = 1, pageSize = 10, q = '' } = {}) {
  const token = requireToken('/pages/my-uploads/my-uploads');
  if (!token) {
    return { success: false, message: '请先登录后查看', data: { list: [], total: 0, page, pageSize } };
  }

  try {
    const result = await callScriptService('getMyUploadedScripts', { token, page, pageSize, q });
    if (result && result.success) {
      return result;
    }
    return {
      success: false,
      message: getServerMessage(result, '加载我的上传失败'),
      data: { list: [], total: 0, page, pageSize }
    };
  } catch (error) {
    console.error('getMyUploadedScripts failed:', error);
    return { success: false, message: '网络错误，请重试', data: { list: [], total: 0, page, pageSize } };
  }
}

export async function getMyUploadedScriptDetail(scriptId) {
  const token = requireToken('/pages/my-uploads/my-uploads');
  if (!token) {
    return { success: false, message: '请先登录后查看' };
  }

  try {
    const result = await callScriptService('getMyUploadedScriptDetail', { token, scriptId });
    if (result && result.success) {
      return result;
    }
    return { success: false, message: getServerMessage(result, '加载上传详情失败') };
  } catch (error) {
    console.error('getMyUploadedScriptDetail failed:', error);
    return { success: false, message: '网络错误，请重试' };
  }
}

export async function deleteMyUploadedScript(scriptId) {
  const token = requireToken('/pages/my-uploads/my-uploads');
  if (!token) {
    return { success: false, message: '请先登录后操作' };
  }

  try {
    const result = await callScriptService('deleteMyUploadedScript', { token, scriptId });
    if (result && result.success) {
      markUploadsDirty();
      return result;
    }
    return { success: false, message: getServerMessage(result, '删除上传失败') };
  } catch (error) {
    console.error('deleteMyUploadedScript failed:', error);
    return { success: false, message: '网络错误，请重试' };
  }
}

export function initScriptLikeStatus(script) {
  if (!script) return script;
  script.isLiked = !!script.isLiked;
  script.isFavorited = !!script.isFavorited;
  script.likes = Number(script.likes) || 0;
  return script;
}

export function initScriptsLikeStatus(scripts) {
  if (Array.isArray(scripts)) {
    return scripts.map(script => initScriptLikeStatus(script));
  }
  return scripts;
}
