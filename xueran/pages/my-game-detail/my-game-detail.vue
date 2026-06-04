<template>
  <view class="container">
    <view v-if="loading" class="empty-state">加载中...</view>
    <view v-else-if="!record" class="empty-state">战局不存在或无权限查看</view>
    <view v-else>
      <view class="header-card">
        <view class="script-name">{{ record.script && record.script.name || '未命名剧本' }}</view>
        <view class="winner-tag" :class="record.winner">{{ winnerLabel(record.winner) }}</view>
        <view class="meta">说书人：{{ record.storyteller && record.storyteller.nickname || '未知' }}</view>
        <view class="meta">{{ record.playerCount || players.length }} 人 · {{ durationText(record.duration) }} · {{ dateText(record.endTime) }}</view>
      </view>

      <view class="section-title">玩家配置</view>
      <view class="player-list">
        <view v-for="player in players" :key="player.seatIndex" class="player-row">
          <view class="seat">{{ player.seatIndex + 1 }}</view>
          <view class="player-main">
            <view class="player-name">{{ player.name || player.nickname || '未命名玩家' }}</view>
            <view class="role-name">{{ player.roleName || '未分配角色' }} · {{ teamLabel(player.team || player.alignment) }}</view>
          </view>
          <view v-if="player.won !== null && player.won !== undefined" class="result" :class="{ win: player.won, lose: !player.won }">
            {{ player.won ? '胜利' : '失败' }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getMyGameRecordDetail } from '@/utils/gameRecordsApi.js';

export default {
  data() {
    return {
      id: '',
      record: null,
      loading: false
    };
  },
  computed: {
    players() {
      return (this.record && Array.isArray(this.record.players)) ? this.record.players : [];
    }
  },
  onLoad(options = {}) {
    this.id = options.id || '';
    this.loadDetail();
  },
  methods: {
    async loadDetail() {
      if (!this.id) return;
      this.loading = true;
      try {
        const result = await getMyGameRecordDetail(this.id);
        if (result && result.success) this.record = result.data && result.data.item;
      } catch (error) {
        this.record = null;
      } finally {
        this.loading = false;
      }
    },
    winnerLabel(winner) {
      if (winner === 'good') return '善良胜利';
      if (winner === 'evil') return '邪恶胜利';
      return '未记录胜负';
    },
    teamLabel(team) {
      const map = { townsfolk: '镇民', outsider: '外来者', minion: '爪牙', demon: '恶魔', traveler: '旅行者', good: '善良', evil: '邪恶' };
      return map[team] || team || '未知阵营';
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
  }
};
</script>

<style scoped>
.container { min-height: 100vh; padding: 48rpx 36rpx 56rpx; box-sizing: border-box; background: #ffffff; color: #1f2329; }
.header-card { padding: 30rpx; border: 1rpx solid #edf0f2; border-radius: 10rpx; background: #ffffff; }
.script-name { margin-bottom: 18rpx; font-size: 40rpx; font-weight: 800; color: #1f2329; }
.winner-tag { display: inline-flex; padding: 8rpx 14rpx; border-radius: 8rpx; font-size: 24rpx; color: #646a73; background: #f5f6f7; }
.winner-tag.good { color: #1f8f4d; background: #f0f9f4; }
.winner-tag.evil { color: #b42318; background: #fff1f0; }
.meta { margin-top: 14rpx; color: #646a73; font-size: 26rpx; line-height: 1.45; }
.section-title { margin: 44rpx 0 12rpx; font-size: 30rpx; font-weight: 700; color: #1f2329; }
.player-row { display: flex; align-items: center; gap: 22rpx; padding: 24rpx 0; border-bottom: 1rpx solid #edf0f2; }
.seat { display: flex; align-items: center; justify-content: center; width: 50rpx; height: 50rpx; border-radius: 8rpx; color: #1f8f4d; font-size: 24rpx; font-weight: 700; background: #f0f9f4; flex-shrink: 0; }
.player-main { flex: 1; min-width: 0; }
.player-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 30rpx; font-weight: 700; color: #1f2329; }
.role-name { margin-top: 6rpx; color: #8f959e; font-size: 24rpx; }
.result { flex-shrink: 0; font-size: 24rpx; }
.result.win { color: #1f8f4d; }
.result.lose { color: #b42318; }
.empty-state { padding: 120rpx 0; text-align: center; color: #8f959e; font-size: 28rpx; }
</style>

