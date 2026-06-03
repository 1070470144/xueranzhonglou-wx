<template>
  <view class="container">
    <view class="search-bar">
      <view class="search-input-container">
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索上传的剧本"
          confirm-type="search"
          @input="onSearchInput"
          @confirm="searchNow"
        />
        <view v-if="keyword" class="search-clear" @click="clearSearch">
          <text class="clear-icon">x</text>
        </view>
      </view>
    </view>

    <view v-if="loading && items.length === 0" class="upload-list">
      <view v-for="n in pageSize" :key="'skeleton-' + n" class="upload-item skeleton">
        <view class="skeleton-line title"></view>
        <view class="skeleton-line meta"></view>
        <view class="skeleton-line action"></view>
      </view>
    </view>

    <view v-else-if="items.length > 0" class="upload-list">
      <view
        v-for="item in items"
        :key="item.id"
        class="upload-item"
      >
        <view class="item-head">
          <view class="item-main">
            <view class="item-title">{{ item.title || '未命名剧本' }}</view>
            <view class="item-meta">{{ item.author || '未知作者' }}</view>
          </view>
          <view class="status-tag" :class="statusClass(item)">{{ statusText(item) }}</view>
        </view>

        <view v-if="isRejected(item) && item.reviewReason" class="reject-reason">
          拒绝原因：{{ item.reviewReason }}
        </view>

        <view class="item-actions">
          <button class="action-btn view" @click="goToDetail(item)">查看</button>
          <button class="action-btn delete" :loading="item.deletePending" :disabled="item.deletePending" @click="confirmDelete(item)">
            删除
          </button>
        </view>
      </view>
    </view>

    <view v-else class="empty-state">
      <view class="empty-title">{{ keyword ? '未找到匹配上传' : '暂无上传' }}</view>
      <view class="empty-desc">{{ keyword ? '换个关键词再试试' : '在工具页上传剧本后会显示在这里' }}</view>
    </view>

    <view v-if="loading && items.length > 0" class="list-footer">加载中...</view>
    <view v-else-if="noMore && items.length > 0" class="list-footer">没有更多了</view>
    <view v-else-if="error" class="list-footer error" @click="reload">{{ error }}</view>
  </view>
</template>

<script>
import { deleteMyUploadedScript, getMyUploadedScripts } from '@/utils/api.js';

const UPLOADS_CACHE_TTL = 60 * 1000;
const uploadsCache = {
  keyword: '',
  items: [],
  page: 1,
  noMore: false,
  loadedAt: 0
};

export default {
  data() {
    return {
      keyword: '',
      items: [],
      page: 1,
      pageSize: 10,
      loading: false,
      noMore: false,
      error: '',
      searchTimer: null
    };
  },
  onLoad() {
    this.hydrateCache();
    if (!this.isCacheFresh()) this.loadUploads({ page: 1, append: false });
  },
  methods: {
    hydrateCache() {
      this.keyword = uploadsCache.keyword || '';
      this.items = uploadsCache.items.slice();
      this.page = uploadsCache.page || 1;
      this.noMore = !!uploadsCache.noMore;
    },
    isCacheFresh() {
      return uploadsCache.loadedAt && Date.now() - uploadsCache.loadedAt < UPLOADS_CACHE_TTL;
    },
    saveCache() {
      uploadsCache.keyword = this.keyword;
      uploadsCache.items = this.items.slice();
      uploadsCache.page = this.page;
      uploadsCache.noMore = this.noMore;
      uploadsCache.loadedAt = Date.now();
    },
    onSearchInput() {
      if (this.searchTimer) clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.searchNow();
      }, 300);
    },
    searchNow() {
      this.noMore = false;
      this.loadUploads({ page: 1, append: false });
    },
    clearSearch() {
      this.keyword = '';
      this.noMore = false;
      this.loadUploads({ page: 1, append: false });
    },
    reload() {
      this.loadUploads({ page: 1, append: false });
    },
    async loadUploads({ page = 1, append = false } = {}) {
      if (this.loading) return;
      this.loading = true;
      this.error = '';

      try {
        const result = await getMyUploadedScripts({
          page,
          pageSize: this.pageSize,
          q: this.keyword.trim()
        });

        if (!result || !result.success) {
          throw new Error((result && result.message) || '加载上传失败');
        }

        const data = result.data || {};
        const list = Array.isArray(data.list) ? data.list : [];
        this.items = append ? this.items.concat(list) : list;
        this.page = page;
        this.noMore = data.total ? page * this.pageSize >= data.total : list.length < this.pageSize;
        this.saveCache();
      } catch (error) {
        console.error('load my uploads failed:', error);
        this.error = '加载失败，点击重试';
      } finally {
        this.loading = false;
        uni.stopPullDownRefresh && uni.stopPullDownRefresh();
      }
    },
    goToDetail(item) {
      uni.navigateTo({
        url: `/pages/my-upload-detail/my-upload-detail?id=${item.id}`
      });
    },
    confirmDelete(item) {
      uni.showModal({
        title: '删除上传',
        content: '确定删除这个上传的剧本吗？',
        confirmText: '删除',
        confirmColor: '#b42318',
        success: res => {
          if (res.confirm) this.deleteUpload(item);
        }
      });
    },
    async deleteUpload(item) {
      if (item.deletePending) return;
      item.deletePending = true;
      const oldItems = this.items.slice();
      this.items = this.items.filter(script => script.id !== item.id);
      this.saveCache();

      try {
        const result = await deleteMyUploadedScript(item.id);
        if (!result || !result.success) {
          this.items = oldItems;
          this.saveCache();
          uni.showToast({ title: (result && result.message) || '删除失败', icon: 'none' });
          return;
        }
        uni.showToast({ title: '已删除', icon: 'success' });
      } catch (error) {
        console.error('delete my upload failed:', error);
        this.items = oldItems;
        this.saveCache();
        uni.showToast({ title: '删除失败，请重试', icon: 'none' });
      } finally {
        item.deletePending = false;
      }
    },
    statusText(item) {
      const status = item.reviewStatus || item.status;
      if (status === 'approved' || item.status === 'published' || item.status === 'active') return '已通过';
      if (status === 'rejected' || item.status === 'rejected') return '已拒绝';
      return '待审核';
    },
    statusClass(item) {
      const status = item.reviewStatus || item.status;
      if (status === 'approved' || item.status === 'published' || item.status === 'active') return 'approved';
      if (status === 'rejected' || item.status === 'rejected') return 'rejected';
      return 'pending';
    },
    isRejected(item) {
      return this.statusClass(item) === 'rejected';
    }
  },
  onPullDownRefresh() {
    this.noMore = false;
    this.loadUploads({ page: 1, append: false });
  },
  onReachBottom() {
    if (this.loading || this.noMore) return;
    this.loadUploads({ page: this.page + 1, append: true });
  }
};
</script>

<style scoped>
@keyframes fadeIn {
  0% { opacity: 0; transform: translateY(20rpx); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes slideDown {
  0% { opacity: 0; transform: translateY(-20rpx); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes slideUp {
  0% { opacity: 0; transform: translateY(30rpx); }
  100% { opacity: 1; transform: translateY(0); }
}

.container {
  min-height: 100vh;
  padding: 20rpx;
  box-sizing: border-box;
  background: #f8f8f8;
}

.search-bar {
  margin-bottom: 20rpx;
}

.search-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  flex: 1;
  height: 76rpx;
  padding: 0 64rpx 0 24rpx;
  border: 1rpx solid #ddd;
  border-radius: 16rpx;
  box-sizing: border-box;
  color: #333;
  font-size: 28rpx;
  background: #fff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.search-clear {
  position: absolute;
  right: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34rpx;
  height: 34rpx;
  border-radius: 50%;
  background: #e5e5e5;
}

.clear-icon {
  color: #666;
  font-size: 24rpx;
  line-height: 1;
}

.upload-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.upload-item {
  padding: 24rpx;
  border-radius: 16rpx;
  background: #fff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.item-head {
  display: flex;
  align-items: flex-start;
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-title {
  color: #333;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.35;
  word-break: break-all;
}

.item-meta {
  margin-top: 8rpx;
  color: #666;
  font-size: 24rpx;
  line-height: 1.4;
}

.status-tag {
  margin-left: 16rpx;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  flex-shrink: 0;
}

.status-tag.pending {
  color: #9a6a00;
  background: #fff6da;
}

.status-tag.approved {
  color: #0f7d45;
  background: #e9f8ef;
}

.status-tag.rejected {
  color: #b3261e;
  background: #fdeeee;
}

.reject-reason {
  margin-top: 16rpx;
  padding: 16rpx;
  border-radius: 12rpx;
  background: #fff5f5;
  color: #9a1b16;
  font-size: 24rpx;
  line-height: 1.5;
}

.item-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 20rpx;
}

.action-btn {
  width: 128rpx;
  height: 56rpx;
  line-height: 56rpx;
  margin: 0;
  border-radius: 14rpx;
  font-size: 24rpx;
}

.action-btn.view {
  color: #007aff;
  background: #eef6ff;
}

.action-btn.delete {
  color: #b42318;
  background: #fff7f5;
}

.empty-state {
  margin-top: 180rpx;
  text-align: center;
}

.empty-title {
  color: #333;
  font-size: 32rpx;
  font-weight: 700;
}

.empty-desc {
  margin-top: 12rpx;
  color: #666;
  font-size: 26rpx;
}

.list-footer {
  padding: 24rpx 0;
  color: #999;
  font-size: 26rpx;
  text-align: center;
}

.list-footer.error {
  color: #b42318;
}

.skeleton {
  box-shadow: none;
}

.skeleton-line {
  height: 28rpx;
  margin-bottom: 18rpx;
  border-radius: 6rpx;
  background: linear-gradient(90deg, #eee 0%, #f5f5f5 50%, #eee 100%);
}

.skeleton-line.title {
  width: 78%;
  height: 34rpx;
}

.skeleton-line.meta {
  width: 46%;
}

.skeleton-line.action {
  width: 36%;
  margin-left: auto;
  margin-bottom: 0;
}

button::after {
  border: none;
}
</style>
