<template>
  <view class="page">
    <view class="topbar">
      <view class="title">我的拼车</view>
      <view class="top-actions">
        <picker mode="selector" :range="statusFilterOptions" range-key="label" :value="statusFilterIndex" @change="onStatusFilterChange">
          <view class="filter-picker">
            <text>{{ currentStatusFilterLabel }}</text>
            <text class="picker-arrow">⌄</text>
          </view>
        </picker>
        <button class="primary-btn" @tap="goBoard">去广场</button>
      </view>
    </view>
    <view class="tabs">
      <view class="tab" :class="{ active: activeTab === 'posts' }" @tap="activeTab = 'posts'">我的发布</view>
      <view class="tab" :class="{ active: activeTab === 'requests' }" @tap="activeTab = 'requests'">我的报名</view>
    </view>
    <view v-if="loading" class="state">加载中...</view>
    <view v-else-if="error" class="state error">{{ error }}</view>
    <view v-else-if="currentList.length === 0" class="state">暂无内容</view>
    <view v-else class="list">
      <view v-for="item in currentList" :key="item.id || item._id" class="card" @tap="openItem(item)">
        <view class="card-head">
          <text class="card-title">{{ item.title || item.scriptName || item.postTitle || '拼车' }}</text>
          <text class="status" :class="statusClass(item.status)">{{ statusText(item.status) }}</text>
        </view>
        <view class="meta">{{ item.regionCity || item.postRegionCity || '' }}{{ item.regionDistrict || item.postRegionDistrict ? ' · ' + (item.regionDistrict || item.postRegionDistrict) : '' }}</view>
        <view class="meta">{{ formatTime(item.startTime || item.postStartTime) }}</view>
        <view v-if="activeTab === 'posts' && item.status !== 'closed'" class="card-actions">
          <button class="mini-btn" @tap.stop="editItem(item)">修改</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { listMyCarpools } from '@/utils/carpoolApi.js';

export default {
  data() {
    return {
      loading: false,
      error: '',
      activeTab: 'posts',
      statusFilter: 'active',
      statusFilterOptions: [
        { label: '进行中', value: 'active' },
        { label: '已关闭', value: 'closed' }
      ],
      posts: [],
      requests: []
    };
  },
  computed: {
    statusFilterIndex() {
      return Math.max(0, this.statusFilterOptions.findIndex(item => item.value === this.statusFilter));
    },
    currentStatusFilterLabel() {
      return (this.statusFilterOptions[this.statusFilterIndex] || {}).label || '进行中';
    },
    currentList() {
      const list = this.activeTab === 'posts' ? this.posts : this.requests;
      return list.filter(item => this.isStatusMatched(item));
    }
  },
  onShow() {
    this.loadMine();
  },
  onPullDownRefresh() {
    this.loadMine().finally(() => uni.stopPullDownRefresh());
  },
  methods: {
    async loadMine() {
      this.loading = true;
      this.error = '';
      const res = await listMyCarpools();
      this.loading = false;
      if (res && res.success && res.data) {
        this.posts = res.data.posts || [];
        this.requests = (res.data.requests || []).map(item => ({
          ...item,
          postTitle: item.postTitle || '',
          postRegionCity: item.postRegionCity || '',
          postRegionDistrict: item.postRegionDistrict || '',
          postStartTime: item.postStartTime || 0
        }));
        return;
      }
      this.error = (res && res.message) || '加载失败';
    },
    goBoard() {
      uni.navigateTo({ url: '/pages/carpool/carpool' });
    },
    onStatusFilterChange(event) {
      const index = Number(event.detail.value) || 0;
      const option = this.statusFilterOptions[index];
      this.statusFilter = option ? option.value : 'active';
    },
    openItem(item) {
      const id = this.activeTab === 'requests' ? item.postId : (item.id || item._id);
      if (!id) return;
      uni.navigateTo({ url: `/pages/carpool-detail/carpool-detail?id=${id}` });
    },
    editItem(item) {
      const id = item.id || item._id;
      if (!id) return;
      uni.navigateTo({ url: `/pages/carpool-publish/carpool-publish?id=${id}` });
    },
    isStatusMatched(item) {
      const status = this.activeTab === 'requests' ? item.postStatus : item.status;
      const isClosed = status === 'closed';
      return this.statusFilter === 'closed' ? isClosed : !isClosed;
    },
    statusText(status) {
      if (status === 'confirmed') return '已确认';
      if (status === 'rejected') return '已拒绝';
      if (status === 'cancelled') return '已移出';
      if (status === 'closed') return '已关闭';
      if (status === 'full') return '已满';
      return '进行中';
    },
    statusClass(status) {
      if (status === 'confirmed') return 'open';
      if (status === 'rejected' || status === 'cancelled' || status === 'closed') return 'closed';
      if (status === 'full') return 'full';
      return 'open';
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
.page { min-height: 100vh; padding: 28rpx; background: #f7f8fa; }
.topbar { display: flex; justify-content: space-between; align-items: center; gap: 16rpx; margin-bottom: 20rpx; }
.title { font-size: 36rpx; font-weight: 700; }
.top-actions { display: flex; align-items: center; gap: 12rpx; flex-shrink: 0; }
.filter-picker { height: 56rpx; line-height: 56rpx; padding: 0 16rpx; border-radius: 10rpx; background: #fff; color: #1f2329; font-size: 24rpx; }
.picker-arrow { margin-left: 8rpx; color: #8f959e; }
.primary-btn { margin: 0; height: 56rpx; line-height: 56rpx; padding: 0 16rpx; border-radius: 10rpx; background: #1f8f4d; color: #fff; font-size: 24rpx; }
.primary-btn::after { border: 0; }
.tabs { display: flex; gap: 12rpx; margin-bottom: 18rpx; }
.tab { flex: 1; text-align: center; height: 72rpx; line-height: 72rpx; border-radius: 10rpx; background: #fff; color: #646a73; font-size: 26rpx; }
.tab.active { background: #e8f7ef; color: #1f8f4d; }
.state,.card { background: #fff; border-radius: 10rpx; padding: 20rpx; }
.state { text-align: center; color: #646a73; }
.state.error { color: #c33; }
.list { display: flex; flex-direction: column; gap: 14rpx; }
.card-head { display: flex; justify-content: space-between; gap: 12rpx; align-items: flex-start; }
.card-title { font-size: 28rpx; font-weight: 700; }
.status { font-size: 22rpx; padding: 4rpx 10rpx; border-radius: 999rpx; background: #f5f6f7; color: #646a73; }
.status.open { background: #e8f7ef; color: #1f8f4d; }
.status.full { background: #fff2e8; color: #b36a00; }
.status.closed { background: #f2f3f5; color: #8f959e; }
.meta { margin-top: 10rpx; color: #646a73; font-size: 24rpx; }
.card-actions { display: flex; justify-content: flex-end; margin-top: 16rpx; }
.mini-btn { margin: 0; height: 54rpx; line-height: 54rpx; padding: 0 22rpx; border-radius: 10rpx; background: #e8f7ef; color: #1f8f4d; font-size: 24rpx; }
.mini-btn::after { border: 0; }
</style>
