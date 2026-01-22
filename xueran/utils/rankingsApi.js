// 排行榜数据获取API

// 本地缓存配置
const CACHE_KEY_PREFIX = 'rankings_cache_';
const CACHE_DURATION = 10 * 60 * 1000; // 10分钟缓存

/**
 * 获取排行榜数据
 * @param {string} type - 排行榜类型: 'usage' | 'likes' | 'mystery' | 'entertainment'
 * @param {number} limit - 返回数量限制，默认50
 * @returns {Promise<Object>} 返回排行榜数据
 */
export const getRankings = async (type, limit = 50) => {
  // 参数验证
  const validTypes = ['usage', 'likes', 'mystery', 'entertainment'];
  if (!validTypes.includes(type)) {
    return {
      success: false,
      message: '无效的排行榜类型'
    };
  }

  if (limit < 1 || limit > 50) {
    limit = 50;
  }

  try {
    // 从服务器获取
    const res = await uniCloud.callFunction({
      name: 'getRankings',
      data: { type, limit }
    });

    if (res.result && res.result.success) {
      const result = {
        success: true,
        data: res.result.data,
        totalCount: res.result.totalCount,
        lastUpdated: res.result.lastUpdated,
        fromCache: false
      };

      console.log('DEBUG: Rankings data received:', result.data.length, 'items');
      if (result.data.length > 0) {
        console.log('DEBUG: First item sample:', result.data[0]);
      }

      // TODO: 恢复缓存功能
      // const cacheKey = `${CACHE_KEY_PREFIX}${type}_${limit}`;
      // setCachedData(cacheKey, result);

      return result;
    } else {
      const errorMessage = res.result?.message || res.result?.errMsg || '获取排行榜失败';
      console.error('DEBUG: API call failed with message:', errorMessage);
      console.error('DEBUG: Full response result:', res.result);
      return {
        success: false,
        message: errorMessage
      };
    }
  } catch (error) {
    console.error('getRankings error:', error);
    return {
      success: false,
      message: '网络错误，请重试'
    };
  }
};

/**
 * 清除指定类型的排行榜缓存
 * @param {string} type - 排行榜类型，可选，不传则清除所有缓存
 */
export const clearRankingsCache = (type = null) => {
  try {
    if (type) {
      // 清除指定类型的缓存
      const keysToRemove = [];
      for (let i = 0; i < uni.getStorageInfoSync().keys.length; i++) {
        const key = uni.getStorageInfoSync().keys[i];
        if (key.startsWith(`${CACHE_KEY_PREFIX}${type}_`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => uni.removeStorageSync(key));
    } else {
      // 清除所有排行榜缓存
      const keysToRemove = [];
      for (let i = 0; i < uni.getStorageInfoSync().keys.length; i++) {
        const key = uni.getStorageInfoSync().keys[i];
        if (key.startsWith(CACHE_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => uni.removeStorageSync(key));
    }
  } catch (error) {
    console.warn('Clear rankings cache error:', error);
  }
};

/**
 * 获取缓存数据
 * @param {string} key - 缓存键
 * @returns {Object|null} 缓存数据或null
 */
const getCachedData = (key) => {
  try {
    const cached = uni.getStorageSync(key);
    if (!cached) return null;

    const { data, timestamp, totalCount, lastUpdated } = cached;

    // 检查缓存是否过期
    if (Date.now() - timestamp > CACHE_DURATION) {
      uni.removeStorageSync(key);
      return null;
    }

    return { data, totalCount, lastUpdated };
  } catch (error) {
    console.warn('Get cached data error:', error);
    return null;
  }
};

/**
 * 设置缓存数据
 * @param {string} key - 缓存键
 * @param {Object} data - 要缓存的数据
 */
const setCachedData = (key, data) => {
  try {
    const cacheData = {
      data: data.data,
      totalCount: data.totalCount,
      lastUpdated: data.lastUpdated,
      timestamp: Date.now()
    };
    uni.setStorageSync(key, cacheData);
  } catch (error) {
    console.warn('Set cached data error:', error);
  }
};