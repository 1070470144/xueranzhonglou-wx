'use strict';

const db = uniCloud.database();
const $ = db.command.aggregate;

/**
 * getRankings cloud function
 * 获取排行榜数据
 * event: { type: 'usage'|'likes'|'hot', limit: number }
 */
exports.main = async (event, context) => {
  const { type, limit = 20 } = event;

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
          console.log('Getting hot rankings...');
          rankings = await getHotRankings(limit);
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
        usageCount: 1
      })
      .get();

    return result.data.map((item, index) => ({
      rank: index + 1,
      scriptId: item._id,
      title: item.title || '未命名剧本',
      author: item.author || '未知作者',
      value: item.usageCount || 0,
      medal: index < 3 ? ['🥇', '🥈', '🥉'][index] : null
    }));

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
        likes: 1
      })
      .get();

    return result.data.map((item, index) => ({
      rank: index + 1,
      scriptId: item._id,
      title: item.title || '未命名剧本',
      author: item.author || '未知作者',
      value: item.likes || 0,
      medal: index < 3 ? ['🥇', '🥈', '🥉'][index] : null
    }));

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
async function getHotRankings(limit) {
  try {
    const now = new Date();

    // 使用聚合管道计算热度分数
    const result = await db.collection('scripts')
      .aggregate()
      .match({
        status: 'active' // 只显示激活状态的剧本
      })
      .addFields({
        // 使用updateTime或createTime，如果都不存在则使用当前时间
        updateTimeOrDefault: $.ifNull(['$updateTime', $.ifNull(['$createTime', now])]),
        // 计算时间权重：e^(-0.1 × 天数)
        daysSinceUpdate: $.divide([
          $.subtract([now, '$updateTimeOrDefault']),
          1000 * 60 * 60 * 24 // 转换为天数
        ]),
        timeWeight: $.pow([2.718281828459045, $.multiply(['$daysSinceUpdate', -0.1])]),

        // 计算基础分数：使用次数 × 1 + 点赞数 × 3
        usageScore: $.multiply(['$usageCount', 1]),
        likesScore: $.multiply(['$likes', 3]),
        baseScore: $.add(['$usageScore', '$likesScore']),

        // 计算最终热度分数
        hotScore: $.multiply(['$baseScore', '$timeWeight'])
      })
      .sort({ hotScore: -1 })
      .limit(limit)
      .end();

    return result.data.map((item, index) => ({
      rank: index + 1,
      scriptId: item._id,
      title: item.title || '未命名剧本',
      author: item.author || '未知作者',
      value: Math.round(item.hotScore * 10) / 10, // 保留一位小数
      medal: index < 3 ? ['🥇', '🥈', '🥉'][index] : null
    }));

  } catch (error) {
    console.error('getHotRankings error:', error);
    throw error;
  }
}