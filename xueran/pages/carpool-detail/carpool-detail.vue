<template>
  <view class="page">
    <view v-if="loading" class="state">加载中...</view>
    <view v-else-if="error" class="state error">{{ error }}</view>
    <view v-else-if="item" class="content">
      <view class="card hero-card">
        <view class="head">
          <view class="title">{{ item.title || item.scriptName }}</view>
          <text class="status" :class="item.status">{{ statusLabel(item.status) }}</text>
          <view class="hero-count">
            <text class="hero-count-main">{{ joinedCount }}/{{ playerCount }}</text>
            <text class="hero-count-sub">缺 {{ missingCount }} 人</text>
          </view>
        </view>
        <view class="meta">{{ item.regionCity }} · {{ item.regionDistrict }}</view>
        <view v-if="item.addressDetail" class="meta">{{ item.addressDetail }}</view>
        <view class="meta">{{ formatTime(item.startTime) }} · {{ modeLabel(item.mode) }}</view>
        <view class="meta">{{ item.scriptName }}</view>
        <view v-if="item.storytellerName" class="meta">说书人：{{ item.storytellerName }}</view>
        <view class="tags">
          <text v-if="item.beginnerFriendly" class="tag">新手友好</text>
          <text v-if="item.needStoryteller" class="tag">缺说书人</text>
          <text v-if="item.waitingListEnabled" class="tag">可候补</text>
        </view>
        <view v-if="venueImages.length" class="section">
          <text class="section-title">场地图片</text>
          <view class="venue-images">
            <image v-for="image in venueImages" :key="image" :src="image" class="venue-image" mode="aspectFill" @tap="previewVenueImage(image)" />
          </view>
        </view>
        <view v-if="scriptImages.length" class="section">
          <text class="section-title">剧本图片</text>
          <view class="venue-images">
            <image v-for="image in scriptImages" :key="image" :src="image" class="venue-image" mode="aspectFill" @tap="previewScriptImage(image)" />
          </view>
        </view>
        <view v-if="item.notes" class="section">
          <text class="section-title">备注</text>
          <text class="section-text">{{ item.notes }}</text>
        </view>
        <view v-if="item.feeNotes" class="section">
          <text class="section-title">费用说明</text>
          <text class="section-text">{{ item.feeNotes }}</text>
        </view>
        <view v-if="item.contactMethod" class="section">
          <text class="section-title">联系方式</text>
          <text class="section-text">{{ item.contactMethod }}</text>
        </view>
        <view class="safe-note">
          <text>联系方式仅用于报名通过后的活动沟通，不公开展示。</text>
          <text class="safe-link" @tap="goGuide">查看说明</text>
        </view>
      </view>

      <view v-if="!isHost" class="card member-card">
        <view class="member-summary">
          <view class="section-title">已确认报名</view>
          <view class="member-count">
            <text class="member-count-main">{{ joinedCount }}/{{ playerCount }}</text>
          </view>
        </view>
        <view class="member-progress">
          <view class="member-progress-bar" :style="{ width: joinPercent + '%' }"></view>
        </view>
        <view class="member-hint">还缺 {{ missingCount }} 人开局</view>
        <view v-if="!confirmedMembers.length" class="empty">暂无确认报名</view>
        <view v-for="member in confirmedMembers" :key="member._id" class="member-item">
          <image class="member-avatar" :src="member.requesterAvatarUrl || '/static/default-avatar.png'" mode="aspectFill" />
          <view class="member-info">
            <view class="member-name">{{ member.requesterName || '玩家' }}</view>
          </view>
        </view>
      </view>

      <view v-if="!isHost" class="card">
        <view class="section-title">报名状态</view>
        <view v-if="myRequest" class="request-box">
          <text>当前状态：{{ requestLabel(myRequest.status) }}</text>
          <button v-if="canLeave" class="danger small-danger" :disabled="actioning" @tap="leaveCurrentCarpool">{{ myRequest.status === 'confirmed' ? '退出报名' : '取消申请' }}</button>
        </view>
        <view v-else>
          <input v-model="joinContact" class="contact-input" placeholder="请输入联系方式" />
          <textarea v-model="joinRemark" class="remark-input" placeholder="备注，可填写称呼、到场时间、偏好等" />
          <button class="primary" :disabled="actioning" @tap="requestJoin">{{ actioning ? '提交中...' : '提交报名' }}</button>
        </view>
      </view>

      <view v-if="isHost" class="card manage-card">
        <view class="section-title">组局管理</view>
        <view class="manage-tabs">
          <view class="manage-tab" :class="{ active: activeManageTab === 'pending' }" @tap="activeManageTab = 'pending'">待审核 {{ pendingRequests.length }}</view>
          <view class="manage-tab" :class="{ active: activeManageTab === 'members' }" @tap="activeManageTab = 'members'">已确认 {{ confirmedMembers.length }}</view>
        </view>
        <view v-if="activeManageTab === 'members'" class="manage-panel">
          <view v-if="!confirmedMembers.length" class="empty">暂无确认报名</view>
          <view v-for="member in confirmedMembers" :key="member._id" class="member-item">
            <image class="member-avatar" :src="member.requesterAvatarUrl || '/static/default-avatar.png'" mode="aspectFill" />
            <view class="member-info">
              <view class="member-name">{{ member.requesterName || '玩家' }}</view>
              <view class="member-contact">联系方式：{{ member.requesterContact || '未填写' }}</view>
            </view>
            <button class="mini light" :disabled="actioning" @tap="updateRequest(member._id, 'remove')">移出</button>
          </view>
        </view>
        <view v-else class="manage-panel">
          <view v-if="!pendingRequests.length" class="empty">暂无待审核报名</view>
          <view v-for="req in pendingRequests" :key="req._id" class="request-item">
            <view>
              <view class="request-name">{{ req.requesterName || '玩家' }}</view>
              <view class="request-meta">{{ requestLabel(req.status) }} · {{ formatTime(req.requestTime) }}</view>
              <view v-if="req.requesterContact" class="request-contact">联系方式：{{ req.requesterContact }}</view>
              <view v-if="req.requesterRemark" class="request-remark">备注：{{ req.requesterRemark }}</view>
            </view>
            <view class="request-actions">
              <button class="mini" @tap="updateRequest(req._id, 'confirm')">通过</button>
              <button class="mini light" @tap="updateRequest(req._id, 'reject')">拒绝</button>
            </view>
          </view>
        </view>
      </view>

      <view v-if="isHost" class="card">
        <button class="danger" :disabled="actioning" @tap="handlePostAction">{{ postActionText }}</button>
      </view>
    </view>
  </view>
</template>

<script>
import { closeCarpoolPost, deleteCarpoolPost, getCarpoolDetail, leaveCarpool, requestJoinCarpool, updateCarpoolRequest } from '@/utils/carpoolApi.js';
import { getCurrentUser } from '@/utils/auth.js';

export default {
  data() {
    return {
      id: '',
      item: null,
      myRequest: null,
      requests: [],
      viewerIsHost: false,
      joinContact: '',
      joinRemark: '',
      activeManageTab: 'pending',
      loading: false,
      error: '',
      actioning: false
    };
  },
  computed: {
    currentUserId() {
      const user = getCurrentUser() || {};
      return user._id || user.id || user.uid || '';
    },
    isHost() {
      return !!(this.viewerIsHost || (this.item && this.currentUserId && this.item.hostId === this.currentUserId));
    },
    confirmedMembers() {
      return this.requests.filter(item => item.status === 'confirmed');
    },
    joinedCount() {
      return this.confirmedMembers.length || Number((this.item && this.item.joinedCount) || 0);
    },
    playerCount() {
      return Number((this.item && this.item.playerCount) || 0);
    },
    missingCount() {
      return Math.max(0, this.playerCount - this.joinedCount);
    },
    joinPercent() {
      if (!this.playerCount) return 0;
      return Math.min(100, Math.round((this.joinedCount / this.playerCount) * 100));
    },
    pendingRequests() {
      return this.requests.filter(item => item.status === 'pending');
    },
    isClosed() {
      return this.item && this.item.status === 'closed';
    },
    canLeave() {
      return this.myRequest && (this.myRequest.status === 'pending' || this.myRequest.status === 'confirmed');
    },
    postActionText() {
      return this.isClosed ? '删除组局' : '关闭组局';
    },
    venueImages() {
      return Array.isArray(this.item && this.item.venueImages) ? this.item.venueImages.slice(0, 3) : [];
    },
    scriptImages() {
      return Array.isArray(this.item && this.item.scriptImages) ? this.item.scriptImages.slice(0, 3) : [];
    }
  },
  onLoad(query = {}) {
    this.id = query.id || '';
    this.loadDetail();
  },
  onPullDownRefresh() {
    this.loadDetail().finally(() => uni.stopPullDownRefresh());
  },
  onShareAppMessage() {
    const title = this.item ? `${this.item.title || this.item.scriptName} 组局` : '血染钟楼组局';
    return {
      title,
      path: `/pages/carpool-detail/carpool-detail?id=${this.id}`
    };
  },
  onShareTimeline() {
    const title = this.item ? `${this.item.title || this.item.scriptName} 组局` : '血染钟楼组局';
    return {
      title,
      query: `id=${this.id}`
    };
  },
  methods: {
    async loadDetail() {
      if (!this.id) {
        this.error = '缺少组局ID';
        return;
      }
      this.loading = true;
      this.error = '';
      const res = await getCarpoolDetail(this.id);
      this.loading = false;
      if (res && res.success && res.data) {
        this.item = res.data.item || null;
        this.myRequest = res.data.myRequest || null;
        this.requests = res.data.requests || [];
        this.viewerIsHost = !!res.data.isHost;
        return;
      }
      this.error = (res && res.message) || '加载失败';
    },
    async requestJoin() {
      if (this.actioning) return;
      const requesterContact = this.joinContact.trim();
      if (!requesterContact) {
        uni.showToast({ title: '请填写联系方式', icon: 'none' });
        return;
      }
      this.actioning = true;
      const res = await requestJoinCarpool(this.id, requesterContact, this.joinRemark.trim());
      this.actioning = false;
      uni.showToast({ title: (res && res.message) || '已提交', icon: res && res.success ? 'success' : 'none' });
      if (res && res.success) {
        this.joinContact = '';
        this.joinRemark = '';
        this.loadDetail();
      }
    },
    async leaveCurrentCarpool() {
      if (this.actioning || !this.canLeave) return;
      uni.showModal({
        title: this.myRequest.status === 'confirmed' ? '退出报名' : '取消申请',
        content: this.myRequest.status === 'confirmed' ? '确定退出这次报名吗？' : '确定取消这次申请吗？',
        confirmText: this.myRequest.status === 'confirmed' ? '退出' : '取消申请',
        confirmColor: '#c33',
        success: async modalRes => {
          if (!modalRes.confirm) return;
          this.actioning = true;
          const res = await leaveCarpool(this.id);
          this.actioning = false;
          uni.showToast({ title: (res && res.message) || '已处理', icon: res && res.success ? 'success' : 'none' });
          if (res && res.success) this.loadDetail();
        }
      });
    },
    async updateRequest(requestId, action) {
      if (this.actioning) return;
      this.actioning = true;
      const res = await updateCarpoolRequest(requestId, action);
      this.actioning = false;
      uni.showToast({ title: (res && res.message) || '操作完成', icon: res && res.success ? 'success' : 'none' });
      if (res && res.success) this.loadDetail();
    },
    async closePost() {
      if (this.actioning) return;
      this.actioning = true;
      const res = await closeCarpoolPost(this.id);
      this.actioning = false;
      uni.showToast({ title: (res && res.message) || '已关闭', icon: res && res.success ? 'success' : 'none' });
      if (res && res.success) this.loadDetail();
    },
    handlePostAction() {
      if (this.isClosed) {
        this.deletePost();
        return;
      }
      this.closePost();
    },
    deletePost() {
      if (this.actioning) return;
      uni.showModal({
        title: '删除组局',
        content: '删除后这条组局记录和报名记录都会被移除，确定删除吗？',
        confirmText: '删除',
        confirmColor: '#c33',
        success: async res => {
          if (!res.confirm) return;
          this.actioning = true;
          const result = await deleteCarpoolPost(this.id);
          this.actioning = false;
          uni.showToast({ title: (result && result.message) || '已删除', icon: result && result.success ? 'success' : 'none' });
          if (result && result.success) {
            setTimeout(() => uni.navigateBack(), 500);
          }
        }
      });
    },
    statusLabel(status) {
      if (status === 'full') return '已满';
      if (status === 'closed') return '已关闭';
      return '开放';
    },
    requestLabel(status) {
      if (status === 'confirmed') return '已通过';
      if (status === 'rejected') return '已拒绝';
      if (status === 'cancelled') return '已取消';
      return '待审核';
    },
    modeLabel(mode) {
      return mode === 'online' ? '线上' : '线下';
    },
    previewVenueImage(current) {
      uni.previewImage({ current, urls: this.venueImages });
    },
    previewScriptImage(current) {
      uni.previewImage({ current, urls: this.scriptImages });
    },
    goGuide() {
      uni.navigateTo({ url: '/pages/carpool-guide/carpool-guide' });
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
.content { display: flex; flex-direction: column; gap: 16rpx; }
.card,.state {
  background: #fff;
  border-radius: 10rpx;
  padding: 22rpx;
}
.state { text-align: center; color: #646a73; }
.state.error { color: #c33; }
.hero-card { position: relative; }
.head {
  display: flex;
  justify-content: flex-start;
  gap: 12rpx;
  align-items: center;
  padding-right: 148rpx;
}
.title {
  min-width: 0;
  max-width: 100%;
  font-size: 34rpx;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.status { font-size: 22rpx; padding: 4rpx 10rpx; border-radius: 999rpx; background: #f5f6f7; color: #646a73; }
.status.open { background: #e8f7ef; color: #1f8f4d; }
.status.full { background: #fff2e8; color: #b36a00; }
.status.closed { background: #f2f3f5; color: #8f959e; }
.hero-count {
  position: absolute;
  top: 22rpx;
  right: 22rpx;
  width: 118rpx;
  padding: 12rpx 0;
  border-radius: 10rpx;
  background: #eef8f2;
  color: #1f8f4d;
  text-align: center;
}
.hero-count-main {
  display: block;
  font-size: 32rpx;
  line-height: 1.1;
  font-weight: 800;
}
.hero-count-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  color: #4a8d65;
}
.meta { margin-top: 10rpx; color: #646a73; font-size: 24rpx; }
.tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 12rpx; }
.tag { padding: 4rpx 10rpx; border-radius: 6rpx; background: #f5f6f7; color: #646a73; font-size: 20rpx; }
.section { margin-top: 18rpx; }
.section-title { display: block; font-size: 24rpx; font-weight: 700; color: #1f2329; margin-bottom: 8rpx; }
.section-text { display: block; color: #646a73; font-size: 24rpx; line-height: 1.6; white-space: pre-wrap; }
.safe-note {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 18rpx;
  padding: 16rpx;
  border-radius: 8rpx;
  background: #f5f8f6;
  color: #646a73;
  font-size: 22rpx;
  line-height: 1.5;
}
.safe-link {
  color: #1f8f4d;
  font-weight: 700;
}
.venue-images { display: flex; flex-wrap: wrap; gap: 12rpx; }
.venue-image { width: 150rpx; height: 150rpx; border-radius: 10rpx; background: #f5f6f7; }
.member-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12rpx;
}
.member-summary .section-title {
  margin-bottom: 0;
}
.member-count {
  flex-shrink: 0;
  display: flex;
  align-items: baseline;
  gap: 4rpx;
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  background: #eef8f2;
  color: #1f8f4d;
}
.member-count-main {
  font-size: 26rpx;
  font-weight: 700;
}
.member-progress {
  height: 8rpx;
  margin-top: 14rpx;
  border-radius: 999rpx;
  overflow: hidden;
  background: #edf0f2;
}
.member-progress-bar {
  height: 100%;
  border-radius: 999rpx;
  background: #1f8f4d;
}
.member-hint {
  margin-top: 8rpx;
  color: #8f959e;
  font-size: 22rpx;
}
.manage-card .section-title { margin-bottom: 12rpx; }
.manage-tabs {
  display: flex;
  padding: 4rpx;
  border-radius: 10rpx;
  background: #f5f6f7;
}
.manage-tab {
  flex: 1;
  height: 56rpx;
  line-height: 56rpx;
  border-radius: 8rpx;
  text-align: center;
  color: #646a73;
  font-size: 24rpx;
}
.manage-tab.active {
  background: #fff;
  color: #1f8f4d;
  font-weight: 700;
  box-shadow: 0 2rpx 8rpx rgba(31, 143, 77, 0.08);
}
.manage-panel { margin-top: 12rpx; }
.primary,.danger,.mini,.mini.light {
  margin: 0;
  border-radius: 10rpx;
  font-size: 24rpx;
}
.primary { background: #1f8f4d; color: #fff; }
.danger { background: #fff2f0; color: #c33; margin-top: 12rpx; }
.mini { background: #1f8f4d; color: #fff; height: 56rpx; line-height: 56rpx; padding: 0 18rpx; }
.mini.light { background: #f5f6f7; color: #1f2329; }
.request-box,.empty { color: #646a73; font-size: 24rpx; }
.contact-input,
.remark-input {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 14rpx;
  border: 1rpx solid #dfe2e6;
  border-radius: 10rpx;
  background: #fff;
  font-size: 26rpx;
}
.contact-input {
  height: 72rpx;
  line-height: 72rpx;
  padding: 0 16rpx;
}
.remark-input {
  min-height: 120rpx;
  padding: 16rpx;
  line-height: 1.5;
}
.small-danger {
  height: 64rpx;
  line-height: 64rpx;
  font-size: 24rpx;
}
.request-item {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  padding-top: 14rpx;
  margin-top: 14rpx;
  border-top: 1rpx solid #edf0f2;
}
.request-name { font-size: 26rpx; font-weight: 600; }
.request-meta { margin-top: 6rpx; font-size: 22rpx; color: #8f959e; }
.request-contact,
.request-remark { margin-top: 6rpx; font-size: 22rpx; color: #646a73; line-height: 1.5; word-break: break-all; }
.request-actions { display: flex; gap: 10rpx; flex-shrink: 0; }
.member-item {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding-top: 14rpx;
  margin-top: 14rpx;
  border-top: 1rpx solid #edf0f2;
}
.member-item:first-of-type {
  margin-top: 0;
}
.member-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #f0f9f4;
  flex-shrink: 0;
}
.member-info {
  flex: 1;
  min-width: 0;
}
.member-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2329;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.member-contact {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #646a73;
  line-height: 1.4;
  word-break: break-all;
}
</style>
