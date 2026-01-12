'use strict'

/**
 * 获取排行�?
 */
async function getRankingList(data) {
    const { type = 'likes', limit = 50, timeRange = 'all' } = data

    // 输入验证
    const validTypes = ['likes', 'views', 'recent', 'trending']
    if (!validTypes.includes(type)) {
      return {
        success: false,
        message: 'Invalid ranking type'
      }
    }

    if (limit < 1 || limit > 100) {
      return {
        success: false,
        message: 'Limit must be between 1 and 100'
      }
    }

    try {
      const db = uniCloud.database()
      const collection = db.collection('scripts')

      let query = collection.where({ status: 'published' })
      let orderBy = 'createTime'
      let orderDirection = 'desc'

      // 根据排行类型设置查询条件和排�?
      switch (type) {
        case 'likes':
          orderBy = 'likes'
          orderDirection = 'desc'
          break

        case 'views':
          orderBy = 'views'
          orderDirection = 'desc'
          break

        case 'recent':
          // 最近发布，按创建时间倒序
          orderBy = 'createTime'
          orderDirection = 'desc'
          break

        case 'trending':
          // 热门趋势：结合点赞和浏览量，近期数据权重更高
          // 这里简化处理，实际可以实现更复杂的算法
          orderBy = 'likes'
          orderDirection = 'desc'
          break
      }

      // 时间范围过滤
      if (timeRange !== 'all') {
        const now = Date.now()
        let timeFilter = now

        switch (timeRange) {
          case 'day':
            timeFilter = now - (24 * 60 * 60 * 1000) // 1�?
            break
          case 'week':
            timeFilter = now - (7 * 24 * 60 * 60 * 1000) // 1�?
            break
          case 'month':
            timeFilter = now - (30 * 24 * 60 * 60 * 1000) // 1�?
            break
        }

        query = query.where({
          status: 'published',
          createTime: db.command.gte(timeFilter)
        })
      }

      // 查询数据
      const result = await query
        .orderBy(orderBy, orderDirection)
        .limit(limit)
        .get()

      // 为结果添加排�?
      const rankedList = result.data.map((item, index) => ({
        ...item,
        rank: index + 1
      }))

      return {
        success: true,
        data: {
          list: rankedList,
          type,
          limit,
          timeRange,
          total: result.data.length
        }
      }
    } catch (error) {
      console.error('Get ranking list error:', error)
      return {
        success: false,
        message: 'Failed to get ranking list'
      }
    }
  }


/**
 * 获取标签排行�?
 */
async function getTagRanking(data) {
    const { limit = 20 } = data

    // 输入验证
    if (limit < 1 || limit > 50) {
      return {
        success: false,
        message: 'Limit must be between 1 and 50'
      }
    }

    try {
      const db = uniCloud.database()

      // 获取所有已发布的剧�?
      const scriptsResult = await db.collection('scripts')
        .where({ status: 'published' })
        .get()

      // 统计标签使用情况
      const tagStats = {}

      for (const script of scriptsResult.data) {
        const tags = script.tags || []
        for (const tag of tags) {
          if (!tagStats[tag]) {
            tagStats[tag] = {
              name: tag,
              count: 0,
              totalLikes: 0,
              scripts: []
            }
          }

          tagStats[tag].count += 1
          tagStats[tag].totalLikes += script.likes || 0
          tagStats[tag].scripts.push({
            id: script._id,
            title: script.title,
            likes: script.likes || 0
          })
        }
      }

      // 转换为数组并按使用次数排�?
      let tagList = Object.values(tagStats)
      tagList.sort((a, b) => b.count - a.count)

      // 限制数量
      tagList = tagList.slice(0, limit)

      // 添加排名
      const rankedTags = tagList.map((tag, index) => ({
        ...tag,
        rank: index + 1
      }))

      return {
        success: true,
        data: {
          list: rankedTags,
          limit,
          total: rankedTags.length
        }
      }
    } catch (error) {
      console.error('Get tag ranking error:', error)
      return {
        success: false,
        message: 'Failed to get tag ranking'
      }
    }
  }

/**
 * 更新排行统计缓存
 * 这个方法可以定期调用来更新排行数据缓�?
 */
async function updateRankingStats(data) {
    try {
      const db = uniCloud.database()

      // 获取各种排行数据
      const [likeRanking, viewRanking, recentRanking] = await Promise.all([
        this.getRankingData('likes', 100),
        this.getRankingData('views', 100),
        this.getRankingData('recent', 100)
      ])

      // 更新排行统计集合（如果需要缓存的话）
      // 这里简化处理，实际项目中可能需要专门的缓存集合

      return {
        success: true,
        data: {
          message: 'Ranking stats updated successfully',
          stats: {
            likeRanking: likeRanking.length,
            viewRanking: viewRanking.length,
            recentRanking: recentRanking.length
          }
        }
      }
    } catch (error) {
      console.error('Update ranking stats error:', error)
      return {
        success: false,
        message: 'Failed to update ranking stats'
      }
    }
  }

/**
 * 获取排行数据辅助方法
 */
async function getRankingData(type, limit) {
    const db = uniCloud.database()
    const collection = db.collection('scripts')

    let query = collection.where({ status: 'published' })
    let orderBy = 'createTime'
    let orderDirection = 'desc'

    switch (type) {
      case 'likes':
        orderBy = 'likes'
        orderDirection = 'desc'
        break
      case 'views':
        orderBy = 'views'
        orderDirection = 'desc'
        break
      case 'recent':
        orderBy = 'createTime'
        orderDirection = 'desc'
        break
    }

    const result = await query
      .orderBy(orderBy, orderDirection)
      .limit(limit)
      .get()

    return result.data
  }

// 云函数入口
const main = async (event, context) => {
  const { method, params = [] } = event

  try {
    switch (method) {
      case 'getRankingList':
        return await getRankingList(...params)
      case 'getTagRanking':
        return await getTagRanking(...params)
      case 'updateRankingStats':
        return await updateRankingStats(...params)
      case 'getRankingData':
        return await getRankingData(...params)
      default:
        return {
          success: false,
          message: `Unknown method: ${method}`
        }
    }
  } catch (error) {
    console.error('Ranking service error:', error)
    return {
      success: false,
      message: 'Internal server error'
    }
  }
}

module.exports = {
  main,
  getRankingList,
  getTagRanking,
  updateRankingStats,
  getRankingData
}
