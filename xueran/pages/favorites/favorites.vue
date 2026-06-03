<template>
  <view class="container">
    <view class="search-bar">
      <view class="search-input-container">
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索收藏的剧本"
          confirm-type="search"
          @input="onSearchInput"
          @confirm="searchNow"
        />
        <view v-if="keyword" class="search-clear" @click="clearSearch">
          <text class="clear-icon">×</text>
        </view>
      </view>
    </view>

    <view v-if="loading && items.length === 0" class="script-grid">
      <view v-for="n in pageSize" :key="'skeleton-' + n" class="script-item skeleton">
        <view class="script-cover skeleton-cover"></view>
        <view class="script-info">
          <view class="skeleton-line title"></view>
          <view class="skeleton-line meta"></view>
        </view>
      </view>
    </view>

    <view v-else-if="items.length > 0" class="script-grid">
      <view
        v-for="script in items"
        :key="script.id"
        class="script-item"
        @click="goToDetail(script)"
      >
        <view class="script-cover">
          <image v-if="script.images && script.images.length" :src="script.images[0]" class="cover-image" mode="aspectFill" />
          <view v-else class="no-image">
            <text class="no-image-text">暂无图片</text>
          </view>
        </view>

        <view class="script-info">
          <view class="script-title">{{ script.title || '未命名剧本' }}</view>
          <view class="script-meta">
            <text class="author">{{ script.author || '未知作者' }}</text>
            <text class="version">{{ script.version || 'v1.0' }}</text>
          </view>
          <view class="script-actions">
            <view class="favorite-state">
              <text class="favorite-mark">★</text>
              <text class="favorite-text">已收藏</text>
            </view>
            <view class="cancel-button" :class="{ disabled: script.favoritePending }" @click.stop="cancelFavorite(script)">
              <text class="cancel-text">{{ script.favoritePending ? '取消中' : '取消收藏' }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="empty-state">
      <view class="empty-title">{{ keyword ? '未找到匹配收藏' : '暂无收藏' }}</view>
      <view class="empty-desc">{{ keyword ? '换个关键词再试试' : '在展览页收藏剧本后会显示在这里' }}</view>
    </view>

    <view v-if="loading && items.length > 0" class="list-footer">加载中...</view>
    <view v-else-if="noMore && items.length > 0" class="list-footer">没有更多了</view>
    <view v-else-if="error" class="list-footer error" @click="reload">{{ error }}</view>
  </view>
</template>

<script>
import { getFavoriteScripts, unfavoriteScript } from '@/utils/api.js';

const FAVORITES_CACHE_TTL = 60 * 1000;
const favoritesCache = {
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
    if (!this.isCacheFresh()) this.loadFavorites({ page: 1, append: false });
  },
  onShow() {
    const force = this.consumeFavoritesDirty();
    if (force) favoritesCache.loadedAt = 0;
    this.reload({ silent: !force });
  },
  methods: {
    hydrateCache() {
      this.keyword = favoritesCache.keyword || '';
      this.items = favoritesCache.items.slice();
      this.page = favoritesCache.page || 1;
      this.noMore = !!favoritesCache.noMore;
    },
    isCacheFresh() {
      return favoritesCache.loadedAt && Date.now() - favoritesCache.loadedAt < FAVORITES_CACHE_TTL;
    },
    consumeFavoritesDirty() {
      try {
        const dirtyAt = uni.getStorageSync('favorites_dirty');
        if (!dirtyAt) return false;
        uni.removeStorageSync('favorites_dirty');
        return true;
      } catch (error) {
        return false;
      }
    },
    saveCache() {
      favoritesCache.keyword = this.keyword;
      favoritesCache.items = this.items.slice();
      favoritesCache.page = this.page;
      favoritesCache.noMore = this.noMore;
      favoritesCache.loadedAt = Date.now();
    },
    onSearchInput() {
      if (this.searchTimer) clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.searchNow();
      }, 300);
    },
    searchNow() {
      this.noMore = false;
      this.loadFavorites({ page: 1, append: false });
    },
    clearSearch() {
      this.keyword = '';
      this.noMore = false;
      this.loadFavorites({ page: 1, append: false });
    },
    reload(options = {}) {
      this.loadFavorites({ page: 1, append: false, ...options });
    },
    async loadFavorites({ page = 1, append = false, silent = false } = {}) {
      if (this.loading) return;
      if (!silent) this.loading = true;
      this.error = '';

      try {
        const result = await getFavoriteScripts({
          page,
          pageSize: this.pageSize,
          q: this.keyword.trim()
        });

        if (!result || !result.success) {
          throw new Error((result && result.message) || '加载收藏失败');
        }

        const data = result.data || {};
        const list = Array.isArray(data.list) ? data.list : [];
        this.items = append ? this.items.concat(list) : list;
        this.page = page;
        this.noMore = data.total ? page * this.pageSize >= data.total : list.length < this.pageSize;
        this.saveCache();
      } catch (error) {
        console.error('load favorites failed:', error);
        this.error = '加载失败，点击重试';
      } finally {
        this.loading = false;
        uni.stopPullDownRefresh && uni.stopPullDownRefresh();
      }
    },
    goToDetail(script) {
      uni.navigateTo({
        url: `/pages/script-detail/script-detail?id=${script.id}`
      });
    },
    async cancelFavorite(script) {
      if (script.favoritePending) return;
      script.favoritePending = true;
      const oldItems = this.items.slice();
      this.items = this.items.filter(item => item.id !== script.id);
      this.saveCache();

      try {
        const result = await unfavoriteScript(script.id);
        if (!result || !result.success) {
          this.items = oldItems;
          this.saveCache();
          uni.showToast({ title: (result && result.message) || '取消收藏失败', icon: 'none' });
          return;
        }
      } catch (error) {
        console.error('cancel favorite failed:', error);
        this.items = oldItems;
        this.saveCache();
        uni.showToast({ title: '操作失败，请重试', icon: 'none' });
      } finally {
        script.favoritePending = false;
      }
    }
  },
  onPullDownRefresh() {
    this.noMore = false;
    this.loadFavorites({ page: 1, append: false });
  },
  onReachBottom() {
    if (this.loading || this.noMore) return;
    this.loadFavorites({ page: this.page + 1, append: true });
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
  padding: 64rpx 44rpx 56rpx;
  box-sizing: border-box;
  background: #ffffff;
  color: #1f2329;
}

.search-bar {
  padding-bottom: 34rpx;
  margin-bottom: 24rpx;
  border-bottom: 1rpx solid #edf0f2;
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
  border: 1rpx solid #dfe2e6;
  border-radius: 10rpx;
  box-sizing: border-box;
  color: #1f2329;
  font-size: 28rpx;
  background: #ffffff;
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
  background: #f0f9f4;
}

.clear-icon {
  color: #1f8f4d;
  font-size: 26rpx;
  line-height: 1;
}

.script-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.script-item {
  width: calc(50% - 10rpx);
  margin-bottom: 20rpx;
  overflow: hidden;
  border-radius: 10rpx;
  background: #ffffff;
  border: 1rpx solid #edf0f2;
}

.script-cover {
  height: 200rpx;
  background: #f5f6f7;
}

.cover-image {
  width: 100%;
  height: 100%;
}

.no-image {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #f5f6f7;
}

.no-image-text {
  color: #8f959e;
  font-size: 24rpx;
}

.script-info {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 140rpx;
  padding: 16rpx;
}

.script-title {
  color: #1f2329;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.script-meta,
.script-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.author {
  flex: 1;
  min-width: 0;
  color: #646a73;
  font-size: 22rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.version {
  margin-left: 8rpx;
  padding: 2rpx 8rpx;
  border-radius: 8rpx;
  color: #646a73;
  font-size: 20rpx;
  background: #f0f9f4;
}

.favorite-state {
  display: flex;
  align-items: center;
  min-width: 0;
}

.favorite-mark {
  color: #1f8f4d;
  font-size: 26rpx;
  line-height: 1;
}

.favorite-text {
  margin-left: 6rpx;
  color: #646a73;
  font-size: 22rpx;
}

.cancel-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120rpx;
  height: 44rpx;
  border: 1rpx solid #f3c5bd;
  border-radius: 10rpx;
  background: #fff7f5;
}

.cancel-button.disabled {
  opacity: 0.6;
}

.cancel-text {
  color: #b42318;
  font-size: 22rpx;
  line-height: 1;
}

.empty-state {
  margin-top: 180rpx;
  text-align: center;
}

.empty-title {
  color: #1f2329;
  font-size: 32rpx;
  font-weight: 700;
}

.empty-desc {
  margin-top: 12rpx;
  color: #8f959e;
  font-size: 26rpx;
}

.list-footer {
  padding: 24rpx 0;
  color: #8f959e;
  font-size: 26rpx;
  text-align: center;
}

.list-footer.error {
  color: #b42318;
}

.skeleton { border-color: #edf0f2; }

.skeleton-cover,
.skeleton-line {
  background: linear-gradient(90deg, #edf0f2 0%, #f5f6f7 50%, #edf0f2 100%);
}

.skeleton-line {
  height: 28rpx;
  margin-bottom: 14rpx;
  border-radius: 6rpx;
}

.skeleton-line.title {
  width: 80%;
  height: 32rpx;
}

.skeleton-line.meta {
  width: 52%;
  height: 24rpx;
}
</style>
