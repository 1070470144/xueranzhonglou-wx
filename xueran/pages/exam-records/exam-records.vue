<template>
  <view class="page">
    <view class="toolbar">
      <input v-model="keyword" class="search" placeholder="搜索分数或正确题数" confirm-type="search" @confirm="reload" />
      <button class="search-btn" @tap="reload">搜索</button>
    </view>
    <view v-if="items.length" class="list">
      <view v-for="item in items" :key="item._id" class="card">
        <view class="card-head">
          <view class="score">{{ item.score }}/{{ item.totalScore }}</view>
          <view class="level">{{ item.level }}星</view>
        </view>
        <view class="meta">{{ item.questionCount }}题 · 正确 {{ item.correctCount }} · 错误 {{ item.wrongCount }} · 用时 {{ formatDuration(item.durationSeconds) }}</view>
        <view class="time">{{ formatTime(item.createTime) }}</view>
        <button class="delete-btn" @tap="confirmDelete(item)">删除</button>
      </view>
    </view>
    <view v-else-if="!loading" class="empty">暂无考试记录</view>
    <view class="footer">{{ loading ? '加载中...' : (noMore ? '没有更多了' : '') }}</view>
  </view>
</template>

<script>
import { getExamRecords, deleteExamRecord } from '@/utils/examApi.js';

export default {
  data() {
    return { keyword: '', items: [], page: 1, pageSize: 10, loading: false, noMore: false };
  },
  onLoad() { this.load({ page: 1 }); },
  onPullDownRefresh() { this.reload(); },
  onReachBottom() { if (!this.loading && !this.noMore) this.load({ page: this.page + 1, append: true }); },
  methods: {
    reload() {
      this.noMore = false;
      this.load({ page: 1 });
    },
    async load({ page = 1, append = false } = {}) {
      if (this.loading) return;
      this.loading = true;
      const result = await getExamRecords({ page, pageSize: this.pageSize, keyword: this.keyword });
      if (result.success) {
        const data = result.data || {};
        const list = data.list || [];
        this.items = append ? this.items.concat(list) : list;
        this.page = page;
        this.noMore = data.total ? page * this.pageSize >= data.total : list.length < this.pageSize;
      } else {
        uni.showToast({ title: result.message || '加载失败', icon: 'none' });
      }
      this.loading = false;
      uni.stopPullDownRefresh();
    },
    confirmDelete(item) {
      uni.showModal({
        title: '删除记录',
        content: '确定删除这条考试记录吗？',
        confirmText: '删除',
        confirmColor: '#b42318',
        success: async res => {
          if (!res.confirm) return;
          const result = await deleteExamRecord(item._id);
          uni.showToast({ title: result.message || '已删除', icon: result.success ? 'success' : 'none' });
          if (result.success) this.items = this.items.filter(record => record._id !== item._id);
        }
      });
    },
    formatDuration(seconds) {
      const value = Number(seconds) || 0;
      const m = Math.floor(value / 60);
      const s = value % 60;
      return `${m}分${s}秒`;
    },
    formatTime(value) {
      if (!value) return '';
      const date = new Date(value);
      const pad = n => String(n).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
  }
};
</script>

<style scoped>
.page { min-height: 100vh; padding: 20rpx; box-sizing: border-box; background: #f8f8f8; color: #2f261f; }
.toolbar { display: flex; gap: 12rpx; margin-bottom: 18rpx; }
.search { flex: 1; height: 76rpx; padding: 0 20rpx; border-radius: 12rpx; background: #fff; border: 1rpx solid #ebe6df; box-sizing: border-box; }
button { margin: 0; }
button::after { border: 0; }
.search-btn { width: 120rpx; height: 76rpx; line-height: 76rpx; border-radius: 12rpx; color: #fff; background: #007aff; font-size: 26rpx; }
.card { padding: 22rpx; margin-bottom: 16rpx; border-radius: 16rpx; border: 1rpx solid #ebe6df; background: #fff; }
.card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10rpx; }
.score { font-size: 40rpx; font-weight: 800; color: #007aff; }
.level { padding: 8rpx 14rpx; border-radius: 10rpx; color: #0f766e; background: #ecfdf3; font-size: 24rpx; }
.meta { color: #4b4038; font-size: 26rpx; line-height: 1.5; }
.time { margin-top: 8rpx; color: #8c8178; font-size: 24rpx; }
.delete-btn { height: 68rpx; line-height: 68rpx; margin-top: 16rpx; border-radius: 12rpx; color: #b42318; background: #fff0ed; font-size: 26rpx; }
.empty, .footer { padding: 42rpx 0; color: #8c8178; font-size: 26rpx; text-align: center; }
</style>
