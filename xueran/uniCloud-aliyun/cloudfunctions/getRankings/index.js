'use strict';

const db = uniCloud.database();
const $ = db.command.aggregate;

/**
 * getRankings cloud function
 * 获取排行榜数据
 * event: { type: 'usage'|'likes'|'hot', limit: number }
 */
exports.main = async (event, context) => {
  const { type, limit = 20, debug = false } = event;

  console.log('getRankings called with:', { type, limit });

  // 参数验证
  const validTypes = ['usage', 'likes', 'hot'];
  if (!validTypes.includes(type)) {
    console.error('Invalid type:', type);
    return {
      success: false,
      message: '无效的排行榜类型'
    };
  }

  if (limit < 1 || limit > 50) {
    console.error('Invalid limit:', limit);
    return {
      success: false,
      message: 'limit参数必须在1-50之间'
    };
  }

  try {
    // 首先验证数据库连接和collection
    console.log('Testing database connection...');
    const testResult = await db.collection('scripts').limit(1).get();
    console.log('Database test result:', testResult.data ? testResult.data.length : 'no data', 'items found');

    let rankings = [];

    // 根据类型获取排行榜数据
    try {
      switch (type) {
        case 'usage':
          console.log('Getting usage rankings...');
          rankings = await getUsageRankings(limit);
          console.log('Usage rankings result:', rankings.length, 'items');
          break;
        case 'likes':
          console.log('Getting likes rankings...');
          rankings = await getLikesRankings(limit);
          console.log('Likes rankings result:', rankings.length, 'items');
          break;
        case 'hot':
          console.log('Getting hot rankings... debug=', !!debug);
          rankings = await getHotRankings(limit, !!debug);
          console.log('Hot rankings result:', rankings.length, 'items');
          break;
        default:
          throw new Error(`Unknown ranking type: ${type}`);
      }
    } catch (switchError) {
      console.error('Error in switch statement:', switchError);
      throw switchError;
    }

    return {
      success: true,
      data: rankings,
      totalCount: rankings.length,
      lastUpdated: new Date().toISOString()
    };

  } catch (error) {
    console.error('getRankings error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error type:', type, 'limit:', limit);
    return {
      success: false,
      message: `获取排行榜失败: ${error.message || error}`
    };
  }
};

/**
 * 获取使用排行榜
 * @param {number} limit - 返回数量限制
 * @returns {Array} 排行榜数据
 */
async function getUsageRankings(limit) {
  try {
    const result = await db.collection('scripts')
      .where({
        status: 'active' // 只显示激活状态的剧本
      })
      .orderBy('usageCount', 'desc')
      .limit(limit)
      .field({
        _id: 1,
        title: 1,
        author: 1,
        usageCount: 1,
        images: 1,
        thumbnails: 1,
        thumbnail: 1
      })
      .get();

    return result.data.map((item, index) => {
      // 处理封面图片
      let coverImage = null;
      if (Array.isArray(item.thumbnails) && item.thumbnails.length) {
        coverImage = item.thumbnails[0];
      } else if (item.thumbnail && typeof item.thumbnail === 'string') {
        coverImage = item.thumbnail;
      } else if (Array.isArray(item.images)) {
        const img = item.images.find(img =>
          typeof img === 'string' && img.trim().length > 0 ||
          (typeof img === 'object' && img !== null && (img.url || img.fileId))
        );
        if (img) {
          coverImage = typeof img === 'string' ? img : (img.url || img.fileId);
        }
      }

      return {
        rank: index + 1,
        scriptId: item._id,
        title: item.title || '未命名剧本',
        author: item.author || '未知作者',
        value: item.usageCount || 0,
        coverImage: coverImage,
        medal: index < 3 ? ['🥇', '🥈', '🥉'][index] : null
      };
    });

  } catch (error) {
    console.error('getUsageRankings error:', error);
    console.error('getUsageRankings stack:', error.stack);
    throw error;
  }
}

/**
 * 获取点赞排行榜
 * @param {number} limit - 返回数量限制
 * @returns {Array} 排行榜数据
 */
async function getLikesRankings(limit) {
  try {
    const result = await db.collection('scripts')
      .where({
        status: 'active' // 只显示激活状态的剧本
      })
      .orderBy('likes', 'desc')
      .limit(limit)
      .field({
        _id: 1,
        title: 1,
        author: 1,
        likes: 1,
        images: 1,
        thumbnails: 1,
        thumbnail: 1
      })
      .get();

    return result.data.map((item, index) => {
      // 处理封面图片
      let coverImage = null;
      if (Array.isArray(item.thumbnails) && item.thumbnails.length) {
        coverImage = item.thumbnails[0];
      } else if (item.thumbnail && typeof item.thumbnail === 'string') {
        coverImage = item.thumbnail;
      } else if (Array.isArray(item.images)) {
        const img = item.images.find(img =>
          typeof img === 'string' && img.trim().length > 0 ||
          (typeof img === 'object' && img !== null && (img.url || img.fileId))
        );
        if (img) {
          coverImage = typeof img === 'string' ? img : (img.url || img.fileId);
        }
      }

      return {
        rank: index + 1,
        scriptId: item._id,
        title: item.title || '未命名剧本',
        author: item.author || '未知作者',
        value: item.likes || 0,
        coverImage: coverImage,
        medal: index < 3 ? ['🥇', '🥈', '🥉'][index] : null
      };
    });

  } catch (error) {
    console.error('getLikesRankings error:', error);
    throw error;
  }
}

/**
 * 获取热度排行榜
 * @param {number} limit - 返回数量限制
 * @returns {Array} 排行榜数据
 */
async function getHotRankings(limit, debugMode = false) {
  try {
    const now = new Date();

    // 使用聚合管道计算热度分数
    const result = await db.collection('scripts')
      .aggregate()
      .match({
        status: 'active' // 只显示激活状态的剧本
      })
      .lookup({
        from: 'scripts',
        let: { scriptId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$scriptId'] } } },
          { $project: { images: 1, thumbnails: 1, thumbnail: 1 } }
        ],
        as: 'scriptData'
      })
      .addFields({
        images: { $arrayElemAt: ['$scriptData.images', 0] },
        thumbnails: { $arrayElemAt: ['$scriptData.thumbnails', 0] },
        thumbnail: { $arrayElemAt: ['$scriptData.thumbnail', 0] }
      })
      .addFields({
        // 使用 updateTime 或 createTime，如果字段为时间戳（秒/数字）需要转换为 Date
        // 尝试将字段转换为 Date，若失败则使用 $$NOW 作为回退
        updateTimeOrDefault: $.ifNull([
          { $toDate: '$updateTime' },
          $.ifNull([{ $toDate: '$createTime' }, '$$NOW'])
        ]),

        // 计算时间权重：先计算天数差，再用更稳健的线性衰减近似（避免聚合环境中指数运算不稳定）
        daysSinceUpdate: $.divide([
          $.subtract(['$$NOW', '$updateTimeOrDefault']),
          1000 * 60 * 60 * 24 // 转换为天数
        ]),
        // 调整时间衰减系数（从0.1改为0.01，使衰减更平缓）
        timeWeight: $.divide([
          1,
          $.add([1, $.multiply([0.01, '$daysSinceUpdate'])])
        ]),

        // 计算基础分数：使用次数 × 1 + 点赞数 × 3，直接在表达式中处理 null
        baseScore: $.add([
          $.multiply([$.ifNull(['$usageCount', 0]), 1]),
          $.multiply([$.ifNull(['$likes', 0]), 3])
        ]),

        // 计算最终热度分数：baseScore * timeWeight，并确保最小热度为0.1
        hotScore: $.max([
          $.multiply([$.ifNull(['$baseScore', 0]), $.ifNull(['$timeWeight', 0])]),
          0.1  // 为零值剧本提供最小热度保证
        ])
      })
      .sort({ hotScore: -1 })
      .limit(limit)
      .end();

    // Debug: 输出聚合结果的前几项，帮助排查热度分数问题
    console.log('Hot aggregation sample:', result.data.slice(0, 5));

    return result.data.map((item, index) => {
      // 处理封面图片
      let coverImage = null;
      if (Array.isArray(item.thumbnails) && item.thumbnails.length) {
        coverImage = item.thumbnails[0];
      } else if (item.thumbnail && typeof item.thumbnail === 'string') {
        coverImage = item.thumbnail;
      } else if (Array.isArray(item.images)) {
        const img = item.images.find(img =>
          typeof img === 'string' && img.trim().length > 0 ||
          (typeof img === 'object' && img !== null && (img.url || img.fileId))
        );
        if (img) {
          coverImage = typeof img === 'string' ? img : (img.url || img.fileId);
        }
      }

      const mapped = {
        rank: index + 1,
        scriptId: item._id,
        title: item.title || '未命名剧本',
        author: item.author || '未知作者',
        value: Math.round((item.hotScore || 0) * 10) / 10, // 保留一位小数，避免 undefined 导致 NaN
        coverImage: coverImage,
        medal: index < 3 ? ['🥇', '🥈', '🥉'][index] : null
      };

      // 在 debug 模式下返回中间计算字段，便于定位问题
      if (debugMode) {
        mapped._debug = {
          usageCount: item.usageCount || 0,
          likes: item.likes || 0,
          updateTimeOrDefault: item.updateTimeOrDefault || null,
          daysSinceUpdate: item.daysSinceUpdate || 0,
          timeWeight: item.timeWeight || 0,
          baseScore: item.baseScore || 0,
          rawHotScore: item.hotScore || 0,
          finalHotScore: Math.round((item.hotScore || 0) * 10) / 10, // 显示最终格式化的值
          minHotScoreApplied: (item.hotScore || 0) < 0.1 // 标记是否应用了最小热度
        };
      }

      return mapped;
    });
    

  } catch (error) {
    console.error('getHotRankings error:', error);
    throw error;
  }
}