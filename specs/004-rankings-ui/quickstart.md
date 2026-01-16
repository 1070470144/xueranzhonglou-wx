# Quick Start: 小程序端排行榜界面

**Feature**: `004-rankings-ui` | **Date**: 2026-01-16

## 功能概述

小程序排行榜界面支持用户浏览三个类型的剧本排行榜：使用排行、点赞排行榜和热度排行榜。界面采用选项卡设计，支持快速切换和剧本详情跳转。

## 前置条件

- 已配置uniCloud云对象环境
- scripts集合包含剧本数据（usageCount、likes字段）
- 小程序项目已初始化（xueran目录）

## 快速开始

### 1. 添加排行榜页面

在 `xueran/pages.json` 中添加页面配置：

```json
{
  "pages": [
    {
      "path": "pages/rankings/rankings",
      "style": {
        "navigationBarTitleText": "排行榜",
        "enablePullDownRefresh": true,
        "backgroundTextStyle": "dark"
      }
    }
  ]
}
```

### 2. 创建API封装

创建 `xueran/utils/rankingsApi.js`：

```javascript
// 排行榜数据获取API
export const getRankings = async (type, limit = 20) => {
  try {
    const res = await uniCloud.callFunction({
      name: 'getRankings',
      data: { type, limit }
    });

    if (res.result && res.result.success) {
      return {
        success: true,
        data: res.result.data,
        totalCount: res.result.totalCount,
        lastUpdated: res.result.lastUpdated
      };
    } else {
      return {
        success: false,
        message: res.result?.message || '获取排行榜失败'
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
```

### 3. 创建排行榜页面

创建 `xueran/pages/rankings/rankings.vue`：

```vue
<template>
  <view class="rankings-page">
    <!-- 选项卡切换 -->
    <view class="tab-container">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        <text class="tab-text">{{ tab.label }}</text>
      </view>
    </view>

    <!-- 排行榜列表 -->
    <view class="rankings-list">
      <view
        v-for="(item, index) in rankings"
        :key="item.scriptId"
        class="ranking-item"
        @click="gotoScriptDetail(item.scriptId)"
      >
        <view class="rank-badge">
          <text v-if="item.medal" class="medal">{{ item.medal }}</text>
          <text v-else class="rank-number">{{ item.rank }}</text>
        </view>

        <view class="script-info">
          <text class="title">{{ item.title }}</text>
          <text class="author">作者：{{ item.author }}</text>
        </view>

        <view class="value-display">
          <text class="value">{{ formatValue(item.value, activeTab) }}</text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-if="rankings.length === 0 && !loading" class="empty-state">
      <text class="empty-text">暂无排行数据</text>
    </view>
  </view>
</template>

<script>
import { getRankings } from '@/utils/rankingsApi.js';

export default {
  data() {
    return {
      activeTab: 'usage',
      tabs: [
        { key: 'usage', label: '使用排行' },
        { key: 'likes', label: '点赞排行' },
        { key: 'hot', label: '热度排行' }
      ],
      rankings: [],
      loading: false
    };
  },

  onLoad() {
    this.loadRankings();
  },

  onPullDownRefresh() {
    this.loadRankings();
    uni.stopPullDownRefresh();
  },

  methods: {
    switchTab(tabKey) {
      this.activeTab = tabKey;
      this.loadRankings();
    },

    async loadRankings() {
      this.loading = true;
      try {
        const result = await getRankings(this.activeTab);
        if (result.success) {
          this.rankings = result.data;
        } else {
          uni.showToast({
            title: result.message,
            icon: 'none'
          });
        }
      } catch (error) {
        console.error('Load rankings error:', error);
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        });
      } finally {
        this.loading = false;
      }
    },

    gotoScriptDetail(scriptId) {
      uni.navigateTo({
        url: `/pages/script-detail/script-detail?id=${scriptId}`
      });
    },

    formatValue(value, type) {
      if (type === 'hot') {
        return value.toFixed(1);
      }
      return value.toString();
    }
  }
};
</script>
```

### 4. 创建云对象

创建 `xueran/uniCloud-aliyun/cloudfunctions/getRankings/index.js`：

```javascript
'use strict';

const db = uniCloud.database();
const $ = db.command.aggregate;

exports.main = async (event, context) => {
  const { type, limit = 20 } = event;

  // 验证参数
  const validTypes = ['usage', 'likes', 'hot'];
  if (!validTypes.includes(type)) {
    return {
      success: false,
      message: '无效的排行榜类型'
    };
  }

  try {
    let sortField, sortOrder;

    // 根据类型设置排序字段
    switch (type) {
      case 'usage':
        sortField = 'usageCount';
        sortOrder = -1;
        break;
      case 'likes':
        sortField = 'likes';
        sortOrder = -1;
        break;
      case 'hot':
        // 热度排行需要计算
        return await getHotRankings(limit);
      default:
        return {
          success: false,
          message: '不支持的排行榜类型'
        };
    }

    // 查询并排序
    const result = await db.collection('scripts')
      .where({
        status: 'active' // 只显示激活的剧本
      })
      .field({
        _id: 1,
        title: 1,
        author: 1,
        [sortField]: 1
      })
      .orderBy(sortField, 'desc')
      .limit(limit)
      .get();

    // 格式化返回数据
    const rankings = result.data.map((item, index) => ({
      rank: index + 1,
      scriptId: item._id,
      title: item.title,
      author: item.author,
      value: item[sortField] || 0,
      medal: index < 3 ? ['🥇', '🥈', '🥉'][index] : null
    }));

    return {
      success: true,
      data: rankings,
      totalCount: result.data.length,
      lastUpdated: new Date().toISOString()
    };

  } catch (error) {
    console.error('getRankings error:', error);
    return {
      success: false,
      message: '获取排行榜失败'
    };
  }
};

// 热度排行计算
async function getHotRankings(limit) {
  try {
    const now = new Date();

    // 使用聚合管道计算热度
    const result = await db.collection('scripts')
      .aggregate()
      .match({
        status: 'active'
      })
      .addFields({
        daysSinceUpdate: $.divide([
          $.subtract([now, $.dateFromString({ dateString: '$updateTime' })]),
          1000 * 60 * 60 * 24 // 转换为天数
        ]),
        usageScore: $.multiply(['$usageCount', 1]),
        likesScore: $.multiply(['$likes', 3])
      })
      .addFields({
        timeWeight: $.pow([Math.E, $.multiply(['$daysSinceUpdate', -0.1])]),
        baseScore: $.add(['$usageScore', '$likesScore']),
        hotScore: $.multiply(['$baseScore', '$timeWeight'])
      })
      .sort({ hotScore: -1 })
      .limit(limit)
      .end();

    const rankings = result.data.map((item, index) => ({
      rank: index + 1,
      scriptId: item._id,
      title: item.title,
      author: item.author,
      value: Math.round(item.hotScore * 10) / 10, // 保留一位小数
      medal: index < 3 ? ['🥇', '🥈', '🥉'][index] : null
    }));

    return {
      success: true,
      data: rankings,
      totalCount: result.data.length,
      lastUpdated: new Date().toISOString()
    };

  } catch (error) {
    console.error('getHotRankings error:', error);
    return {
      success: false,
      message: '获取热度排行失败'
    };
  }
}
```

## 测试验证

### 基本功能测试

1. **页面访问测试**：
   - 打开小程序排行榜页面
   - 验证三个选项卡正常显示

2. **数据加载测试**：
   - 点击每个选项卡
   - 验证数据正确加载（<2秒）
   - 检查排名和数据显示正确

3. **交互测试**：
   - 点击排行榜项跳转到详情页
   - 下拉刷新功能正常
   - 网络错误时显示友好提示

### 性能测试

- **首次加载时间**：<2秒完成数据加载
- **缓存加载时间**：<200ms从本地缓存加载
- **页面切换**：<1秒完成选项卡切换
- **内存使用**：不超过小程序限制
- **缓存策略**：10分钟本地缓存 + 云端实时数据
- **用户提示**：界面显示更新频率说明

## 故障排除

### 常见问题

1. **排行榜数据为空**：
   - 检查scripts集合是否有数据
   - 确认剧本status为'active'

2. **热度排行计算错误**：
   - 检查updateTime字段格式
   - 验证聚合管道语法

3. **页面跳转失败**：
   - 确认script-detail页面存在
   - 检查传递的参数格式

### 调试技巧

- 在云对象中添加console.log输出
- 使用小程序开发者工具查看网络请求
- 检查数据库查询结果

## 下一步

完成基础功能后，可以考虑以下扩展：

- ✅ 已实现排行榜缓存机制（10分钟刷新）+ 用户提示
- 实现排行榜历史记录
- 添加用户个人排行榜
- 支持更多排序维度