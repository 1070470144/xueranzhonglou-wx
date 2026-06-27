<template>
  <view class="page">
    <view class="topbar">
      <button class="guide-btn" @tap="goGuide">说明</button>
      <view class="spacer"></view>
      <button class="primary-btn" @tap="goPublish">发布</button>
    </view>

    <view class="filter-panel">
      <view class="filter-row">
        <picker class="filter-picker" mode="region" @change="onRegionChange">
          <view class="picker region-picker">{{ currentRegionLabel }}</view>
        </picker>
        <button v-if="filters.city || filters.district" class="clear-region" @tap="clearRegion">清除</button>
      </view>
      <view class="filter-row">
        <input v-model="filters.script" class="filter-input" placeholder="剧本关键词" />
        <picker class="filter-picker" mode="selector" :range="modeOptions" range-key="label" @change="onModeChange">
          <view class="picker">{{ currentModeLabel }}</view>
        </picker>
      </view>
      <view class="filter-bottom">
        <view class="chips">
          <view
            v-for="item in dateOptions"
            :key="item.value"
            class="chip"
            :class="{ active: filters.date === item.value }"
            @tap="setDateFilter(item.value)"
          >
            {{ item.label }}
          </view>
        </view>
        <button class="filter-btn" :loading="loading" @tap="applyFilters">筛选</button>
      </view>
    </view>

    <view v-if="loading && !posts.length" class="state">加载中...</view>
    <view v-else-if="error" class="state error">{{ error }}</view>
    <view v-else-if="!posts.length" class="state">暂时没有组局</view>

    <view v-else class="list">
      <view v-for="item in posts" :key="item.id" class="card" @tap="goDetail(item.id)">
        <view class="card-head">
          <text class="card-title">{{ item.title || item.scriptName }}</text>
          <text class="status" :class="item.status">{{ statusLabel(item.status) }}</text>
        </view>
        <view class="script-name">{{ item.scriptName }}</view>
        <view class="card-grid">
          <view class="card-cell wide">
            <text class="cell-label">地区</text>
            <text class="cell-value">{{ item.regionCity }} · {{ item.regionDistrict }}</text>
          </view>
          <view class="card-cell wide">
            <text class="cell-label">时间</text>
            <text class="cell-value">{{ formatTime(item.startTime) }}</text>
          </view>
          <view class="card-cell">
            <text class="cell-label">模式</text>
            <text class="cell-value">{{ modeLabel(item.mode) }}</text>
          </view>
          <view class="card-cell">
            <text class="cell-label">人数</text>
            <text class="cell-value">{{ item.joinedCount || 0 }}/{{ item.playerCount || 0 }}</text>
          </view>
        </view>
        <view v-if="item.beginnerFriendly || item.needStoryteller || item.waitingListEnabled" class="tags">
          <text v-if="item.beginnerFriendly" class="tag">新手友好</text>
          <text v-if="item.needStoryteller" class="tag">缺主持</text>
          <text v-if="item.waitingListEnabled" class="tag">可候补</text>
        </view>
      </view>
      <view v-if="loading" class="load-more">加载中...</view>
      <view v-else-if="posts.length >= total && total > pageSize" class="load-more">没有更多了</view>
    </view>
  </view>
</template>

<script>
import { listCarpoolPosts } from '@/utils/carpoolApi.js';

const modeOptions = [
  { label: '线上/线下', value: '' },
  { label: '线上', value: 'online' },
  { label: '线下', value: 'offline' }
];

const dateOptions = [
  { label: '全部', value: '' },
  { label: '今天', value: 'today' },
  { label: '明天', value: 'tomorrow' },
  { label: '一周内', value: 'week' }
];

function startOfDay(offset = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d.getTime();
}

export default {
  data() {
    return {
      posts: [],
      loading: false,
      error: '',
      page: 1,
      pageSize: 20,
      total: 0,
      sort: 'recent',
      filters: {
        city: '',
        district: '',
        script: '',
        mode: '',
        date: ''
      },
      modeOptions,
      dateOptions
    };
  },
  computed: {
    currentModeLabel() {
      const item = this.modeOptions.find(item => item.value === this.filters.mode);
      return item ? item.label : '线上/线下';
    },
    currentRegionLabel() {
      if (this.filters.city && this.filters.district) {
        return `${this.filters.city} / ${this.filters.district}`;
      }
      if (this.filters.city) return this.filters.city;
      return '选择地区';
    },
    dateRange() {
      if (this.filters.date === 'today') {
        return { start: startOfDay(0), end: startOfDay(1) - 1 };
      }
      if (this.filters.date === 'tomorrow') {
        return { start: startOfDay(1), end: startOfDay(2) - 1 };
      }
      if (this.filters.date === 'week') {
        return { start: startOfDay(0), end: startOfDay(7) - 1 };
      }
      return { start: 0, end: 0 };
    }
  },
  onLoad(query = {}) {
    if (query.sort === 'hot') this.sort = 'hot';
    if (query.sort === 'recent') this.sort = 'recent';
    this.loadPosts(true);
  },
  onPullDownRefresh() {
    this.loadPosts(true).finally(() => uni.stopPullDownRefresh());
  },
  onReachBottom() {
    this.loadMore();
  },
  methods: {
    async loadPosts(reset = false) {
      if (this.loading) return;
      if (reset) this.page = 1;
      this.loading = true;
      this.error = '';
      try {
        const res = await listCarpoolPosts({
          page: this.page,
          pageSize: this.pageSize,
          regionCity: this.filters.city.trim(),
          regionDistrict: this.filters.district.trim(),
          scriptName: this.filters.script.trim(),
          mode: this.filters.mode,
          startFrom: this.dateRange.start,
          startTo: this.dateRange.end,
          sort: this.sort
        });
        if (res && res.success && res.data) {
          const list = res.data.list || [];
          this.posts = reset ? list : this.posts.concat(list);
          this.total = res.data.total || 0;
          return;
        }
        this.error = (res && res.message) || '加载失败';
      } catch (e) {
        this.error = (e && e.message) || '加载失败';
      } finally {
        this.loading = false;
      }
    },
    applyFilters() {
      this.loadPosts(true);
    },
    loadMore() {
      if (this.loading || !this.posts.length || this.posts.length >= this.total) {
        return;
      }
      this.page += 1;
      this.loadPosts(false);
    },
    onModeChange(e) {
      const item = this.modeOptions[e.detail.value];
      this.filters.mode = item ? item.value : '';
      this.loadPosts(true);
    },
    onRegionChange(e) {
      const value = e.detail.value || [];
      this.filters.city = value[1] || value[0] || '';
      this.filters.district = value[2] || '';
      this.loadPosts(true);
    },
    clearRegion() {
      this.filters.city = '';
      this.filters.district = '';
      this.loadPosts(true);
    },
    setDateFilter(value) {
      this.filters.date = value;
      this.loadPosts(true);
    },
    goPublish() {
      uni.navigateTo({ url: '/pages/carpool-publish/carpool-publish' });
    },
    goGuide() {
      uni.navigateTo({ url: '/pages/carpool-guide/carpool-guide' });
    },
    goDetail(id) {
      uni.navigateTo({ url: `/pages/carpool-detail/carpool-detail?id=${id}` });
    },
    statusLabel(status) {
      if (status === 'full') return '已满';
      if (status === 'closed') return '已关闭';
      return '开放';
    },
    modeLabel(mode) {
      return mode === 'online' ? '线上' : '线下';
    },
    formatTime(value) {
      const date = new Date(Number(value) || 0);
      if (!date.getTime()) return '未知时间';
      const mm = `${date.getMonth() + 1}`.padStart(2, '0');
      const dd = `${date.getDate()}`.padStart(2, '0');
      const hh = `${date.getHours()}`.padStart(2, '0');
      const mi = `${date.getMinutes()}`.padStart(2, '0');
      return `${mm}-${dd} ${hh}:${mi}`;
    }
  }
};
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: 18rpx 20rpx 40rpx;
  background: #f7f8fa;
  color: #1f2329;
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.spacer { flex: 1; }
.guide-btn {
  margin: 0;
  padding: 0 18rpx;
  height: 56rpx;
  line-height: 56rpx;
  border-radius: 8rpx;
  background: #f0f9f4;
  color: #1f8f4d;
  font-size: 23rpx;
}
.guide-btn::after { border: 0; }
.primary-btn {
  margin: 0;
  padding: 0 18rpx;
  height: 56rpx;
  line-height: 56rpx;
  font-size: 23rpx;
  border-radius: 8rpx;
}
.primary-btn { background: #1f8f4d; color: #fff; }
.primary-btn::after { border: 0; }
.filter-panel,.state {
  background: #fff;
  border-radius: 8rpx;
  padding: 14rpx;
  box-sizing: border-box;
}
.filter-panel { margin-bottom: 14rpx; }
.filter-row { display: flex; gap: 8rpx; margin-bottom: 10rpx; }
.filter-picker { flex: 1; min-width: 0; }
.filter-input,.picker {
  flex: 1;
  height: 62rpx;
  line-height: 62rpx;
  padding: 0 14rpx;
  border: 1rpx solid #dfe2e6;
  border-radius: 6rpx;
  background: #fff;
  font-size: 24rpx;
  color: #1f2329;
}
.region-picker { width: 100%; box-sizing: border-box; }
.clear-region {
  flex: 0 0 auto;
  margin: 0;
  padding: 0 14rpx;
  height: 62rpx;
  line-height: 62rpx;
  border-radius: 6rpx;
  background: #f5f6f7;
  color: #646a73;
  font-size: 22rpx;
}
.clear-region::after { border: 0; }
.filter-bottom {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.chips { display: flex; flex: 1; min-width: 0; flex-wrap: wrap; gap: 8rpx; }
.chip {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: #f5f6f7;
  color: #646a73;
  font-size: 22rpx;
}
.chip.active { background: #e8f7ef; color: #1f8f4d; }
.filter-btn {
  flex: 0 0 140rpx;
  margin: 0;
  width: 140rpx;
  height: 58rpx;
  line-height: 58rpx;
  border-radius: 8rpx;
  background: #1f8f4d;
  color: #fff;
  font-size: 23rpx;
}
.filter-btn::after { border: 0; }
.state { text-align: center; color: #646a73; font-size: 26rpx; }
.state.error { color: #c33; }
.list {
  background: #fff;
  border-radius: 8rpx;
  overflow: hidden;
}
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 18rpx 16rpx;
  overflow: hidden;
  background: #fff;
  border-bottom: 1rpx solid #edf0f3;
  border-radius: 0;
}
.card:last-child { border-bottom: 0; }
.card-head { display: flex; justify-content: space-between; gap: 12rpx; align-items: center; }
.card-title {
  min-width: 0;
  flex: 1;
  font-size: 27rpx;
  font-weight: 700;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.status { flex: 0 0 auto; font-size: 20rpx; padding: 3rpx 8rpx; border-radius: 999rpx; background: #f5f6f7; color: #646a73; }
.status.open { background: #e8f7ef; color: #1f8f4d; }
.status.full { background: #fff2e8; color: #b36a00; }
.status.closed { background: #f2f3f5; color: #8f959e; }
.script-name {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #646a73;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-grid {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx 12rpx;
  margin-top: 8rpx;
}
.card-cell {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 0;
  border-radius: 0;
  background: transparent;
}
.card-cell.wide { max-width: 100%; }
.cell-label {
  display: inline;
  margin-bottom: 0;
  font-size: 18rpx;
  color: #8f959e;
}
.cell-value {
  display: inline;
  font-size: 20rpx;
  color: #646a73;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tags { display: flex; gap: 6rpx; flex-wrap: nowrap; margin-top: 8rpx; overflow: hidden; }
.tag { padding: 3rpx 8rpx; border-radius: 4rpx; background: #f5f6f7; color: #646a73; font-size: 18rpx; white-space: nowrap; }
.load-more {
  padding: 18rpx 0;
  text-align: center;
  color: #8f959e;
  font-size: 22rpx;
}
</style>
