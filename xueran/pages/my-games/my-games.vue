<template>
  <view class="container">
    <view class="stats-card">
      <view class="stats-head">
        <view>
          <view class="stats-title">我的战局</view>
          <view class="stats-desc">{{ mode === 'player' ? '玩家视角' : '说书人视角' }}</view>
        </view>
        <view class="mode-tabs">
          <view class="mode-tab" :class="{ active: mode === 'player' }" @click="switchMode('player')">玩家</view>
          <view class="mode-tab" :class="{ active: mode === 'storyteller' }" @click="switchMode('storyteller')">说书人</view>
        </view>
      </view>

      <view v-if="mode === 'player'" class="stats-grid">
        <view class="stat-item"><text>{{ playerStats.total }}</text><span>总场次</span></view>
        <view class="stat-item"><text>{{ playerStats.winRate }}%</text><span>胜率</span></view>
        <view class="stat-item"><text>{{ teamLabel(playerStats.bestPosition) }}</text><span>擅长位置</span></view>
        <view class="stat-item"><text>{{ playerStats.bestRole }}</text><span>擅长角色</span></view>
      </view>

      <view v-else class="stats-grid">
        <view class="stat-item"><text>{{ storytellerStats.total }}</text><span>总对局</span></view>
        <view class="stat-item"><text>{{ storytellerStats.goodWinRate }}%</text><span>善良胜率</span></view>
        <view class="stat-item"><text>{{ storytellerStats.evilWinRate }}%</text><span>邪恶胜率</span></view>
        <view class="stat-item"><text>{{ storytellerStats.favoriteScript }}</text><span>擅长剧本</span></view>
      </view>
    </view>

    <view class="search-wrap">
      <input v-model="keyword" class="search-input" placeholder="搜索剧本、说书人或角色" confirm-type="search" @input="onSearchInput" @confirm="searchNow" />
      <view v-if="keyword" class="clear" @click="clearSearch">x</view>
    </view>

    <view v-if="loading && items.length === 0" class="list-footer">加载中...</view>

    <view v-else-if="items.length" class="record-list">
      <view v-for="item in items" :key="item.id" class="record-card" @click="goToDetail(item)">
        <view class="card-head">
          <view class="script-name">{{ item.script && item.script.name || '未命名剧本' }}</view>
          <view class="winner-tag" :class="item.winner">{{ winnerLabel(item.winner) }}</view>
        </view>
        <view class="meta-row">说书人：{{ item.storyteller && item.storyteller.nickname || '未知' }}</view>
        <view v-if="mode === 'player' && item.role" class="meta-row">我的角色：{{ item.role.name || '未知角色' }}</view>
        <view class="meta-row">{{ item.playerCount || 0 }} 人 · {{ durationText(item.duration) }} · {{ dateText(item.endTime) }}</view>
        <view class="card-actions">
          <view class="delete-action" @click.stop="confirmDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-else class="empty-state">
      <view class="empty-title">暂无战局</view>
      <view class="empty-desc">网页端保存战绩后会显示在这里</view>
    </view>

    <view v-if="loading && items.length > 0" class="list-footer">加载中...</view>
    <view v-else-if="noMore && items.length > 0" class="list-footer">没有更多了</view>
    <view v-else-if="error" class="list-footer error" @click="reload">{{ error }}</view>
  </view>
</template>

<script>
import { deleteMyGameRecord, getMyGameRecordStats, getMyGameRecords } from '@/utils/gameRecordsApi.js';

export default {
  data() {
    return {
      mode: 'player',
      keyword: '',
      items: [],
      page: 1,
      pageSize: 10,
      loading: false,
      noMore: false,
      error: '',
      searchTimer: null,
      stats: {
        player: {},
        storyteller: {}
      }
    };
  },
  computed: {
    playerStats() {
      return { total: 0, winRate: 0, bestPosition: '暂无', bestRole: '暂无', ...(this.stats.player || {}) };
    },
    storytellerStats() {
      return { total: 0, goodWinRate: 0, evilWinRate: 0, favoriteScript: '暂无', ...(this.stats.storyteller || {}) };
    }
  },
  onLoad() {
    this.reloadAll();
  },
  methods: {
    async reloadAll() {
      await Promise.all([this.loadStats(), this.loadRecords({ page: 1, append: false })]);
    },
    async loadStats() {
      try {
        const result = await getMyGameRecordStats();
        if (result && result.success) this.stats = result.data || this.stats;
      } catch (error) {}
    },
    switchMode(mode) {
      if (this.mode === mode) return;
      this.mode = mode;
      this.noMore = false;
      this.loadRecords({ page: 1, append: false });
    },
    onSearchInput() {
      if (this.searchTimer) clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => this.searchNow(), 300);
    },
    searchNow() {
      this.noMore = false;
      this.loadRecords({ page: 1, append: false });
    },
    clearSearch() {
      this.keyword = '';
      this.searchNow();
    },
    reload() {
      this.loadRecords({ page: 1, append: false });
    },
    async loadRecords({ page = 1, append = false } = {}) {
      if (this.loading) return;
      this.loading = true;
      this.error = '';
      try {
        const result = await getMyGameRecords({ mode: this.mode, page, pageSize: this.pageSize, q: this.keyword.trim() });
        if (!result || !result.success) throw new Error((result && result.message) || '加载失败');
        const data = result.data || {};
        const list = Array.isArray(data.list) ? data.list : [];
        this.items = append ? this.items.concat(list) : list;
        this.page = page;
        this.noMore = data.total ? page * this.pageSize >= data.total : list.length < this.pageSize;
      } catch (error) {
        this.error = '加载失败，点击重试';
      } finally {
        this.loading = false;
        uni.stopPullDownRefresh && uni.stopPullDownRefresh();
      }
    },
    goToDetail(item) {
      uni.navigateTo({ url: `/pages/my-game-detail/my-game-detail?id=${item.id}&mode=${this.mode}` });
    },
    confirmDelete(item) {
      const content = this.mode === 'storyteller'
        ? '删除后，这场主持记录和相关玩家战绩都会移除。确定删除吗？'
        : '删除后，这场战局将从你的玩家战绩中移除。确定删除吗？';
      uni.showModal({
        title: '删除战绩',
        content,
        confirmText: '删除',
        confirmColor: '#b42318',
        success: res => {
          if (res.confirm) this.deleteRecord(item);
        }
      });
    },
    async deleteRecord(item) {
      if (!item || !item.id) return;
      uni.showLoading({ title: '删除中...' });
      try {
        const result = await deleteMyGameRecord(item.id, this.mode);
        if (!result || !result.success) throw new Error((result && result.message) || '删除失败');
        this.items = this.items.filter(record => record.id !== item.id);
        await this.loadStats();
        uni.hideLoading();
        uni.showToast({ title: '已删除', icon: 'success' });
        if (!this.items.length) this.loadRecords({ page: 1, append: false });
      } catch (error) {
        uni.hideLoading();
        uni.showToast({ title: '删除失败', icon: 'none' });
      }
    },
    winnerLabel(winner) {
      if (winner === 'good') return '善良胜利';
      if (winner === 'evil') return '邪恶胜利';
      return '未记录胜负';
    },
    teamLabel(team) {
      const map = { townsfolk: '镇民', outsider: '外来者', minion: '爪牙', demon: '恶魔', traveler: '旅行者', good: '善良', evil: '邪恶' };
      return map[team] || team || '暂无';
    },
    durationText(duration) {
      const minutes = Math.max(0, Math.round((Number(duration) || 0) / 60000));
      const hours = Math.floor(minutes / 60);
      const rest = minutes % 60;
      return hours ? `${hours}小时${rest}分钟` : `${rest}分钟`;
    },
    dateText(time) {
      if (!time) return '';
      const date = new Date(time);
      return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    }
  },
  onPullDownRefresh() {
    this.reloadAll();
  },
  onReachBottom() {
    if (this.loading || this.noMore) return;
    this.loadRecords({ page: this.page + 1, append: true });
  }
};
</script>

<style scoped>
.container { min-height: 100vh; padding: 48rpx 36rpx 56rpx; box-sizing: border-box; background: #ffffff; color: #1f2329; }
.stats-card { padding: 30rpx; border: 1rpx solid #edf0f2; border-radius: 10rpx; background: #ffffff; }
.stats-head { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; margin-bottom: 28rpx; }
.stats-title { font-size: 40rpx; font-weight: 800; color: #1f2329; }
.stats-desc { margin-top: 8rpx; font-size: 24rpx; color: #8f959e; }
.mode-tabs { display: flex; border: 1rpx solid #dfe2e6; border-radius: 8rpx; overflow: hidden; }
.mode-tab { padding: 14rpx 22rpx; font-size: 26rpx; color: #646a73; background: #ffffff; }
.mode-tab.active { color: #ffffff; background: #1f8f4d; }
.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20rpx; }
.stat-item { min-width: 0; padding: 20rpx; border-radius: 8rpx; background: #f5f6f7; }
.stat-item text { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 34rpx; font-weight: 800; color: #1f2329; }
.stat-item span { display: block; margin-top: 8rpx; font-size: 23rpx; color: #8f959e; }
.search-wrap { position: relative; display: flex; align-items: center; margin: 30rpx 0; }
.search-input { flex: 1; height: 76rpx; padding: 0 64rpx 0 24rpx; border: 1rpx solid #dfe2e6; border-radius: 10rpx; box-sizing: border-box; font-size: 28rpx; }
.clear { position: absolute; right: 20rpx; width: 34rpx; height: 34rpx; line-height: 34rpx; text-align: center; border-radius: 50%; color: #1f8f4d; background: #f0f9f4; }
.record-card { padding: 26rpx 0; border-bottom: 1rpx solid #edf0f2; }
.card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18rpx; margin-bottom: 12rpx; }
.script-name { flex: 1; min-width: 0; font-size: 32rpx; font-weight: 700; color: #1f2329; }
.winner-tag { flex-shrink: 0; padding: 8rpx 14rpx; border-radius: 8rpx; font-size: 22rpx; color: #646a73; background: #f5f6f7; }
.winner-tag.good { color: #1f8f4d; background: #f0f9f4; }
.winner-tag.evil { color: #b42318; background: #fff1f0; }
.meta-row { margin-top: 8rpx; color: #646a73; font-size: 25rpx; line-height: 1.45; }
.card-actions { display: flex; justify-content: flex-end; margin-top: 16rpx; }
.delete-action { padding: 8rpx 0 8rpx 24rpx; color: #b42318; font-size: 25rpx; }
.empty-state { padding: 100rpx 0; text-align: center; }
.empty-title { font-size: 32rpx; font-weight: 700; color: #1f2329; }
.empty-desc, .list-footer { margin-top: 16rpx; text-align: center; color: #8f959e; font-size: 25rpx; }
.list-footer.error { color: #b42318; }
</style>
