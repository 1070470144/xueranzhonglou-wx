<template>
  <view class="page">
    <view class="header">
      <text class="title">公告中心</text>
      <text class="subtitle">平台公告、更新说明和维护通知</text>
    </view>

    <view v-if="loading" class="state">加载中...</view>
    <view v-else-if="!list.length" class="state">暂无公告</view>
    <view v-else class="list">
      <view v-for="item in list" :key="item._id" class="notice-card" @click="openDetail(item)">
        <view class="notice-head">
          <text class="type" :class="item.type">{{ typeText(item.type) }}</text>
          <text v-if="item.pinned" class="pinned">置顶</text>
        </view>
        <text class="notice-title">{{ item.title }}</text>
        <text class="notice-summary">{{ item.summary || '查看公告详情' }}</text>
        <text class="notice-time">{{ formatTime(item.publishTime || item.updateTime) }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { listAnnouncements } from '@/utils/aiApi.js';

export default {
  data() {
    return {
      loading: false,
      list: []
    };
  },
  async onLoad() {
    await this.load();
  },
  async onPullDownRefresh() {
    await this.load();
    uni.stopPullDownRefresh();
  },
  methods: {
    async load() {
      this.loading = true;
      try {
        const res = await listAnnouncements({ limit: 20 });
        this.list = res.success && res.data ? (res.data.list || []) : [];
      } finally {
        this.loading = false;
      }
    },
    openDetail(item) {
      if (!item || !item._id) return;
      uni.navigateTo({ url: `/pages/announcement-detail/announcement-detail?id=${item._id}` });
    },
    typeText(type) {
      const map = { notice: '公告', update: '更新', maintenance: '维护', important: '重要' };
      return map[type] || '公告';
    },
    formatTime(value) {
      if (!value) return '';
      const date = new Date(Number(value));
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
};
</script>

<style scoped>
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 28rpx 24rpx 56rpx;
  background: #f8f8f8;
  color: #2f261f;
}

.header {
  margin-bottom: 22rpx;
}

.title,
.subtitle,
.notice-title,
.notice-summary,
.notice-time {
  display: block;
}

.title {
  font-size: 40rpx;
  font-weight: 800;
}

.subtitle {
  margin-top: 8rpx;
  color: #8c8178;
  font-size: 24rpx;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.notice-card {
  padding: 24rpx;
  border: 1rpx solid #ebe6df;
  border-radius: 16rpx;
  background: #fff;
  box-sizing: border-box;
}

.notice-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 14rpx;
}

.type,
.pinned {
  padding: 4rpx 10rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  font-weight: 700;
}

.type.notice { color: #1d4ed8; background: #eff6ff; }
.type.update { color: #047857; background: #ecfdf5; }
.type.maintenance { color: #92400e; background: #fffbeb; }
.type.important { color: #b42318; background: #fff0ed; }

.pinned {
  color: #5f4b3a;
  background: #f6eee7;
}

.notice-title {
  color: #2f261f;
  font-size: 31rpx;
  font-weight: 800;
  line-height: 1.35;
}

.notice-summary {
  margin-top: 10rpx;
  color: #6f6258;
  font-size: 25rpx;
  line-height: 1.55;
}

.notice-time {
  margin-top: 14rpx;
  color: #b8aea5;
  font-size: 22rpx;
}

.state {
  padding: 60rpx 0;
  color: #8c8178;
  font-size: 26rpx;
  text-align: center;
}
</style>
