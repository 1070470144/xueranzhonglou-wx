<template>
  <view class="page">
    <view class="rank-tabs">
      <view
        v-for="tab in rankTabs"
        :key="tab.key"
        class="rank-tab"
        :class="{ active: activeRank === tab.key }"
        @tap="switchRank(tab.key)"
      >
        {{ tab.label }}
      </view>
    </view>

    <scroll-view class="content" scroll-y>
      <view v-if="rankingLoading" class="state-panel">加载中...</view>
      <view v-else-if="rankingError" class="state-panel">
        <text>{{ rankingError }}</text>
        <button class="small-btn retry" @tap="loadRankings">重试</button>
      </view>
      <view v-else class="ranking-list">
        <view
          v-for="item in rankings"
          :key="item.scriptId"
          class="ranking-item"
          @tap="goToScriptDetail(item)"
        >
          <view class="rank-number" :class="getRankClass(item.rank)">
            <text>{{ item.rank }}</text>
          </view>
          <view class="script-cover">
            <image v-if="item.coverImage" :src="item.coverImage" class="cover-image" mode="aspectFill" />
            <view v-else class="no-image">无封面</view>
          </view>
          <view class="script-info">
            <text class="script-title">{{ item.title }}</text>
            <text class="script-meta">作者：{{ item.author || '未知作者' }}</text>
          </view>
          <view class="rank-value">
            <text class="value-text">{{ formatValue(item.value) }}</text>
            <text class="value-label">{{ getValueLabel(activeRank) }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { getRankings } from '@/utils/rankingsApi.js';

export default {
  data() {
    return {
      activeRank: 'usage',
      rankTabs: [
        { key: 'usage', label: '使用' },
        { key: 'likes', label: '点赞' },
        { key: 'mystery', label: '推理' },
        { key: 'entertainment', label: '娱乐' }
      ],
      rankings: [],
      rankingLoading: false,
      rankingError: ''
    };
  },

  onLoad() {
    this.loadRankings();
  },

  onPullDownRefresh() {
    this.loadRankings().finally(() => uni.stopPullDownRefresh());
  },

  methods: {
    switchRank(key) {
      this.activeRank = key;
      this.loadRankings();
    },

    async loadRankings() {
      this.rankingLoading = true;
      this.rankingError = '';
      try {
        const result = await getRankings(this.activeRank, 50);
        if (result.success) {
          this.rankings = result.data || [];
        } else {
          this.rankingError = result.message || '加载失败';
          this.rankings = [];
        }
      } catch (error) {
        this.rankingError = '加载失败，请重试';
        this.rankings = [];
      } finally {
        this.rankingLoading = false;
      }
    },

    getRankClass(rank) {
      if (rank === 1) return 'gold';
      if (rank === 2) return 'silver';
      if (rank === 3) return 'bronze';
      return 'normal';
    },

    goToScriptDetail(item) {
      uni.navigateTo({ url: `/pages/script-detail/script-detail?id=${item.scriptId}` });
    },

    formatValue(value) {
      if (value === null || value === undefined) return '0';
      return String(value);
    },

    getValueLabel(type) {
      if (type === 'likes') return '点赞';
      return '使用';
    }
  }
};
</script>

<style lang="scss" scoped>
.page {
  height: 100vh;
  background: #ffffff;
  color: #1f2329;
}

.rank-tabs {
  display: flex;
  gap: 12rpx;
  padding: 20rpx 24rpx 12rpx;
}

.rank-tab {
  flex: 1;
  height: 64rpx;
  line-height: 64rpx;
  text-align: center;
  border-radius: 10rpx;
  background: #ffffff;
  color: #646a73;
  font-size: 26rpx;
  border: 1rpx solid #dfe2e6;
}

.rank-tab.active {
  background: #f0f9f4;
  color: #1f8f4d;
  border-color: #d9f0e3;
  font-weight: 700;
}

.content {
  height: calc(100vh - 96rpx);
  box-sizing: border-box;
  padding: 8rpx 24rpx 32rpx;
}

.ranking-list {
  padding-bottom: 32rpx;
}

.ranking-item {
  display: flex;
  align-items: center;
  min-height: 148rpx;
  padding: 28rpx 0;
  background: #ffffff;
  border-bottom: 1rpx solid #edf0f2;
}

.rank-number {
  width: 64rpx;
  height: 64rpx;
  line-height: 64rpx;
  text-align: center;
  border-radius: 50%;
  margin-right: 18rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: #1f8f4d;
  background: #f0f9f4;
}

.rank-number.gold { background: #f4c542; color: #ffffff; }
.rank-number.silver { background: #b9c0c7; color: #ffffff; }
.rank-number.bronze { background: #c98245; color: #ffffff; }

.script-cover {
  width: 104rpx;
  height: 104rpx;
  border-radius: 10rpx;
  overflow: hidden;
  background: #f5f6f7;
  margin-right: 18rpx;
}

.cover-image {
  width: 100%;
  height: 100%;
}

.no-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8f959e;
  font-size: 22rpx;
}

.script-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.script-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1f2329;
  line-height: 1.35;
}

.script-meta {
  font-size: 24rpx;
  color: #646a73;
}

.rank-value {
  min-width: 104rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.value-text {
  font-size: 34rpx;
  font-weight: 700;
  color: #1f8f4d;
}

.value-label {
  font-size: 22rpx;
  color: #8f959e;
}

.state-panel {
  padding: 48rpx 0;
  text-align: center;
  color: #8f959e;
  font-size: 26rpx;
}

.small-btn {
  min-width: 112rpx;
  height: 56rpx;
  line-height: 56rpx;
  margin: 18rpx auto 0;
  color: #1f8f4d;
  background: #f0f9f4;
  border-radius: 10rpx;
  font-size: 24rpx;
}
</style>
