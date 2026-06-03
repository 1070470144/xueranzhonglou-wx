<template>
  <view class="page">
    <view class="toolbar">
      <view class="search-box">
        <input v-model="keyword" class="search-input" placeholder="搜索题干" confirm-type="search" @confirm="reload" />
        <button class="small-btn" @tap="reload">查询</button>
      </view>
      <view class="tool-row">
        <button class="small-btn" @tap="openImport">导入</button>
        <button class="small-btn primary" @tap="openQuestion()">新增</button>
      </view>
    </view>

    <view class="filters">
      <view class="chip" :class="{ active: filterLevel === 0 }" @tap="setLevel(0)">全部</view>
      <view class="chip" :class="{ active: filterLevel === 1 }" @tap="setLevel(1)">1星</view>
      <view class="chip" :class="{ active: filterLevel === 2 }" @tap="setLevel(2)">2星</view>
    </view>

    <view class="list-head">
      <view>
        <text class="section-title">模拟考配置</text>
        <text class="count-text">{{ total }} 条</text>
      </view>
      <view class="head-actions">
        <button class="tip-btn" @tap="showTip">!</button>
        <button v-if="!selectMode" class="text-btn" :disabled="!items.length" @tap="toggleSelectMode">批量管理</button>
      </view>
    </view>

    <view v-if="selectMode" class="batch-bar">
      <text class="count-text">已选 {{ selectedCount }} 条</text>
      <view class="batch-actions">
        <button class="text-btn" @tap="toggleAll">{{ allSelected ? '取消全选' : '全选' }}</button>
        <button class="danger-mini" :disabled="!selectedCount || batchDeleting" @tap="confirmBatchDelete">删除选中</button>
        <button class="text-btn" @tap="toggleSelectMode">取消</button>
      </view>
    </view>

    <view v-if="items.length" class="list">
      <view v-for="item in items" :key="item.id" class="record-item" :class="{ selected: isSelected(item) }" @tap="handleItemTap(item)">
        <view v-if="selectMode" class="selector" :class="{ checked: isSelected(item) }">
          <text v-if="isSelected(item)">✓</text>
        </view>
        <view class="card-body">
          <view class="card-head">
            <view class="tags">
              <text>{{ item.level }}星</text>
              <text>{{ item.type === 'judge' ? '判断' : '选择' }}</text>
            </view>
            <view class="answer">答案：{{ formatAnswer(item) }}</view>
          </view>
          <view class="record-question">{{ item.title }}</view>
          <view v-if="item.images && item.images.length" class="thumbs">
            <image v-for="image in item.images" :key="image" :src="image" mode="aspectFill" @tap.stop="previewImage(image, item.images)" />
          </view>
          <view v-if="item.explanation" class="record-answer">解析：{{ item.explanation }}</view>
          <view class="record-meta">{{ formatTime(item.updateTime || item.createTime) }}</view>
          <view v-if="!selectMode" class="actions">
            <button class="ghost-btn" @tap.stop="openQuestion(item)">编辑</button>
            <button class="danger-btn" @tap.stop="confirmDelete(item)">删除</button>
          </view>
        </view>
      </view>
    </view>
    <view v-else-if="!loading" class="empty">暂无题目</view>
    <view class="footer">{{ loading ? '加载中...' : (noMore && items.length ? '没有更多了' : '') }}</view>
  </view>
</template>

<script>
import { getExamQuestions, deleteExamQuestion, deleteExamQuestions } from '@/utils/examApi.js';

const CONFIG_CACHE_TTL = 60 * 1000;
const configCache = {
  keyword: '',
  filterLevel: 0,
  items: [],
  page: 1,
  total: 0,
  noMore: false,
  loadedAt: 0
};

export default {
  data() {
    return {
      keyword: '',
      filterLevel: 0,
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      loading: false,
      noMore: false,
      selectMode: false,
      selectedIds: [],
      batchDeleting: false
    };
  },
  computed: {
    selectedCount() {
      return this.selectedIds.length;
    },
    allSelected() {
      return !!this.items.length && this.items.every(item => this.selectedIds.includes(item.id));
    }
  },
  onLoad() {
    this.hydrateCache();
    if (!this.isCacheFresh()) this.load({ page: 1 });
  },
  onShow() {
    if (uni.getStorageSync('exam_questions_dirty')) {
      uni.removeStorageSync('exam_questions_dirty');
      this.reload();
    }
  },
  onPullDownRefresh() {
    this.reload();
  },
  onReachBottom() {
    if (!this.loading && !this.noMore) this.load({ page: this.page + 1, append: true });
  },
  methods: {
    hydrateCache() {
      if (!configCache.loadedAt) return;
      this.keyword = configCache.keyword;
      this.filterLevel = configCache.filterLevel;
      this.items = configCache.items;
      this.page = configCache.page;
      this.total = configCache.total;
      this.noMore = configCache.noMore;
    },
    isCacheFresh() {
      return configCache.loadedAt && Date.now() - configCache.loadedAt < CONFIG_CACHE_TTL;
    },
    saveCache() {
      configCache.keyword = this.keyword;
      configCache.filterLevel = this.filterLevel;
      configCache.items = this.items;
      configCache.page = this.page;
      configCache.total = this.total;
      configCache.noMore = this.noMore;
      configCache.loadedAt = Date.now();
    },
    setLevel(level) {
      if (this.filterLevel === level) return;
      this.filterLevel = level;
      this.reload();
    },
    reload() {
      this.noMore = false;
      this.load({ page: 1 });
    },
    async load({ page = 1, append = false } = {}) {
      if (this.loading) return;
      this.loading = true;
      const result = await getExamQuestions({ page, pageSize: this.pageSize, keyword: this.keyword, level: this.filterLevel || undefined });
      if (result.success) {
        const data = result.data || {};
        const list = data.list || [];
        this.items = append ? this.items.concat(list) : list;
        this.page = page;
        this.total = Number(data.total || 0);
        this.noMore = data.total ? page * this.pageSize >= data.total : list.length < this.pageSize;
        this.syncSelectedIds();
        this.saveCache();
      } else {
        uni.showToast({ title: result.message || '加载失败', icon: 'none' });
      }
      this.loading = false;
      uni.stopPullDownRefresh();
    },
    openQuestion(item) {
      const query = item && item.id ? `?id=${item.id}` : '';
      uni.navigateTo({ url: `/pages/exam-question-form/exam-question-form${query}` });
    },
    openImport() {
      uni.navigateTo({ url: '/pages/exam-question-import/exam-question-import' });
    },
    toggleSelectMode() {
      this.selectMode = !this.selectMode;
      this.selectedIds = [];
    },
    handleItemTap(item) {
      if (this.selectMode) {
        this.toggleItem(item);
      }
    },
    toggleItem(item) {
      const id = item && item.id;
      if (!id) return;
      const index = this.selectedIds.indexOf(id);
      if (index >= 0) {
        this.selectedIds.splice(index, 1);
      } else {
        this.selectedIds.push(id);
      }
    },
    toggleAll() {
      if (this.allSelected) {
        this.selectedIds = [];
        return;
      }
      this.selectedIds = this.items.map(item => item.id).filter(Boolean);
    },
    isSelected(item) {
      return !!item && this.selectedIds.includes(item.id);
    },
    syncSelectedIds() {
      const visibleIds = new Set(this.items.map(item => item.id));
      this.selectedIds = this.selectedIds.filter(id => visibleIds.has(id));
      if (!this.items.length) this.selectMode = false;
    },
    showTip() {
      uni.showModal({
        title: '题库说明',
        content: '本题库不提供任何题目内容，只提供工具。你可以输入自己的题目，根据自己的题目考试。',
        showCancel: false,
        confirmText: '知道了'
      });
    },
    confirmDelete(item) {
      uni.showModal({
        title: '删除题目',
        content: '确定删除这道题吗？',
        confirmText: '删除',
        confirmColor: '#b42318',
        success: async res => {
          if (!res.confirm) return;
          const result = await deleteExamQuestion(item.id);
          uni.showToast({ title: result.message || '已删除', icon: result.success ? 'success' : 'none' });
          if (result.success) this.reload();
        }
      });
    },
    confirmBatchDelete() {
      if (!this.selectedCount || this.batchDeleting) return;
      uni.showModal({
        title: '批量删除',
        content: `确定删除选中的 ${this.selectedCount} 道题吗？`,
        confirmText: '删除',
        confirmColor: '#b42318',
        success: async res => {
          if (!res.confirm) return;
          this.batchDeleting = true;
          const result = await deleteExamQuestions(this.selectedIds);
          this.batchDeleting = false;
          uni.showToast({ title: result.message || '已删除', icon: result.success ? 'success' : 'none' });
          if (result.success) {
            this.selectMode = false;
            this.selectedIds = [];
            this.reload();
          }
        }
      });
    },
    previewImage(current, urls) {
      uni.previewImage({ current, urls });
    },
    formatAnswer(item) {
      if (item.type === 'judge') return item.answer === 'true' ? '正确' : '错误';
      return item.answer;
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
.page { min-height: 100vh; padding: 24rpx 24rpx 56rpx; box-sizing: border-box; background: #f6f2ec; color: #241f1a; }
button { margin: 0; }
button::after { border: 0; }
.toolbar { padding: 20rpx; margin-bottom: 18rpx; border: 1rpx solid #e5d8c8; border-radius: 22rpx; background: #fffaf4; box-shadow: 0 12rpx 36rpx rgba(72, 45, 22, 0.08); }
.search-box { display: flex; align-items: center; gap: 14rpx; }
.search-input { flex: 1; height: 72rpx; padding: 0 22rpx; border: 1rpx solid #e2d2bf; border-radius: 16rpx; background: #fffdf9; box-sizing: border-box; font-size: 26rpx; color: #241f1a; }
.tool-row { display: flex; gap: 14rpx; margin-top: 16rpx; }
.small-btn { min-width: 128rpx; height: 72rpx; line-height: 72rpx; padding: 0 22rpx; border: 1rpx solid #e2d2bf; border-radius: 16rpx; background: #fffaf4; color: #4a3624; font-size: 26rpx; }
.small-btn.primary { background: #5d4037; border-color: #5d4037; color: #fffaf4; }
.filters { display: flex; gap: 12rpx; margin-bottom: 18rpx; }
.chip { padding: 14rpx 24rpx; border: 1rpx solid #e2d2bf; border-radius: 16rpx; background: #fffaf4; color: #6f6258; font-size: 26rpx; }
.chip.active { color: #5d4037; background: #efe3d4; border-color: #c8a98d; font-weight: 700; }
.list-head { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin: 22rpx 0 14rpx; }
.head-actions { display: flex; align-items: center; gap: 12rpx; flex-shrink: 0; }
.section-title { margin-right: 12rpx; font-size: 32rpx; line-height: 1.3; font-weight: 700; color: #241f1a; }
.count-text { font-size: 24rpx; color: #8a7a68; }
.tip-btn { width: 58rpx; height: 58rpx; line-height: 58rpx; padding: 0; border: 1rpx solid #d8c3ad; border-radius: 50%; background: #fffdf9; color: #8a5a34; font-size: 30rpx; font-weight: 800; }
.text-btn { height: 58rpx; line-height: 58rpx; padding: 0 18rpx; border: 1rpx solid #e2d2bf; border-radius: 14rpx; background: #fffaf4; color: #4a3624; font-size: 24rpx; }
.text-btn[disabled] { opacity: 0.45; }
.batch-bar { display: flex; align-items: center; justify-content: space-between; gap: 14rpx; padding: 18rpx 20rpx; margin-bottom: 16rpx; border: 1rpx solid #e5d8c8; border-radius: 20rpx; background: #fffaf4; box-shadow: 0 12rpx 36rpx rgba(72, 45, 22, 0.08); }
.batch-actions { display: flex; align-items: center; gap: 10rpx; }
.danger-mini { height: 58rpx; line-height: 58rpx; padding: 0 18rpx; border: 1rpx solid #f3c5bd; border-radius: 14rpx; background: #fff7f5; color: #b42318; font-size: 24rpx; }
.danger-mini[disabled] { opacity: 0.45; }
.record-item { display: flex; gap: 18rpx; padding: 22rpx; margin-bottom: 16rpx; border: 1rpx solid #e5d8c8; border-radius: 22rpx; background: #fffaf4; box-shadow: 0 12rpx 36rpx rgba(72, 45, 22, 0.08); box-sizing: border-box; }
.record-item.selected { border-color: #b88c67; background: #fff6ec; }
.selector { flex: 0 0 38rpx; width: 38rpx; height: 38rpx; margin-top: 4rpx; border: 2rpx solid #c9b7a3; border-radius: 50%; box-sizing: border-box; text-align: center; line-height: 34rpx; color: #fff; font-size: 24rpx; }
.selector.checked { background: #5d4037; border-color: #5d4037; }
.card-body { flex: 1; min-width: 0; }
.card-head { display: flex; justify-content: space-between; gap: 12rpx; margin-bottom: 12rpx; }
.tags { display: flex; gap: 8rpx; flex-wrap: wrap; }
.tags text { padding: 6rpx 12rpx; border-radius: 10rpx; background: #f2e8dc; color: #6f6258; font-size: 22rpx; }
.answer { flex-shrink: 0; color: #0f766e; font-size: 24rpx; }
.record-question { font-size: 28rpx; line-height: 1.45; font-weight: 700; color: #241f1a; word-break: break-all; }
.record-answer { display: -webkit-box; margin-top: 12rpx; overflow: hidden; color: #6f6258; font-size: 25rpx; line-height: 1.5; text-overflow: ellipsis; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.record-meta { margin-top: 12rpx; color: #8a7a68; font-size: 22rpx; }
.thumbs { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 14rpx; }
.thumbs image { width: 96rpx; height: 96rpx; border-radius: 10rpx; background: #eadccd; }
.actions { display: flex; gap: 12rpx; margin-top: 18rpx; }
.ghost-btn, .danger-btn { flex: 1; height: 70rpx; line-height: 70rpx; border-radius: 14rpx; font-size: 26rpx; }
.ghost-btn { border: 1rpx solid #e2d2bf; background: #fffdf9; color: #4a3624; }
.danger-btn { border: 1rpx solid #f3c5bd; background: #fff7f5; color: #b42318; }
.empty, .footer { padding: 40rpx 0; text-align: center; color: #8a7a68; font-size: 26rpx; }
</style>
