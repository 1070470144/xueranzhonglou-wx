<template>
  <view class="page">
    <view v-if="loading" class="state">加载中...</view>
    <view v-else-if="!item" class="state">公告不存在或已下架</view>
    <view v-else class="detail">
      <view class="meta-row">
        <text class="type" :class="item.type">{{ typeText(item.type) }}</text>
        <text v-if="item.pinned" class="pinned">置顶</text>
      </view>
      <text class="title">{{ item.title }}</text>
      <text class="time">{{ formatTime(item.publishTime || item.updateTime) }}</text>
      <text v-if="item.summary" class="summary">{{ item.summary }}</text>
      <text class="content">{{ item.content }}</text>
    </view>
  </view>
</template>

<script>
import { getAnnouncement } from '@/utils/aiApi.js';

export default {
  data() {
    return {
      id: '',
      loading: false,
      item: null
    };
  },
  async onLoad(options = {}) {
    this.id = options.id || '';
    await this.load();
  },
  methods: {
    async load() {
      if (!this.id) return;
      this.loading = true;
      try {
        const res = await getAnnouncement(this.id);
        this.item = res.success && res.data ? res.data.item : null;
      } finally {
        this.loading = false;
      }
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
      const hh = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${d} ${hh}:${mm}`;
    }
  }
};
</script>

<style scoped>
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 28rpx 24rpx 64rpx;
  background: #f8f8f8;
  color: #2f261f;
}

.detail {
  padding: 30rpx 26rpx;
  border: 1rpx solid #ebe6df;
  border-radius: 16rpx;
  background: #fff;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 18rpx;
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

.title,
.time,
.summary,
.content {
  display: block;
}

.title {
  font-size: 38rpx;
  font-weight: 800;
  line-height: 1.35;
}

.time {
  margin-top: 12rpx;
  color: #b8aea5;
  font-size: 23rpx;
}

.summary {
  margin-top: 24rpx;
  padding: 18rpx 20rpx;
  border-radius: 14rpx;
  background: #fffaf4;
  color: #6f6258;
  font-size: 26rpx;
  line-height: 1.55;
}

.content {
  margin-top: 28rpx;
  color: #2f261f;
  font-size: 29rpx;
  line-height: 1.75;
  white-space: pre-wrap;
}

.state {
  padding: 80rpx 0;
  color: #8c8178;
  font-size: 26rpx;
  text-align: center;
}
</style>
