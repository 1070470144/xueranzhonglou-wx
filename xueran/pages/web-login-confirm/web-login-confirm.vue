<template>
  <view class="page fade-in">
    <view class="panel">
      <view class="title">确认登录网页端</view>
      <view class="desc">确认后，电脑上的网页版会使用当前小程序账号登录。</view>
      <view v-if="user" class="user-row">
        <image v-if="user.avatarUrl" class="avatar" :src="user.avatarUrl" mode="aspectFill" />
        <view class="user-info">
          <text class="user-label">当前账号</text>
          <text class="user-name">{{ user.nickname || '微信用户' }}</text>
        </view>
      </view>
      <button class="confirm-btn" :disabled="submitting || !ticket" @click="confirmLogin">
        {{ submitting ? '确认中...' : '确认登录' }}
      </button>
      <button class="cancel-btn" @click="goBack">取消</button>
    </view>
  </view>
</template>

<script>
import { approveWebLogin, getCurrentUser, isLoggedIn, loginWithWeixin } from '@/utils/auth.js';

export default {
  data() {
    return {
      ticket: '',
      user: null,
      submitting: false
    };
  },
  onLoad(options = {}) {
    this.ticket = decodeURIComponent(options.ticket || '');
    this.user = getCurrentUser();
    if (!this.ticket) {
      uni.showToast({ title: '登录二维码无效', icon: 'none' });
    }
  },
  onShow() {
    this.user = getCurrentUser();
  },
  methods: {
    async ensureLoggedIn() {
      if (isLoggedIn()) return true;
      const res = await loginWithWeixin();
      if (res && res.success) {
        this.user = getCurrentUser();
        return true;
      }
      uni.showToast({ title: (res && res.message) || '登录失败', icon: 'none' });
      return false;
    },
    async confirmLogin() {
      if (!this.ticket || this.submitting) return;
      this.submitting = true;
      try {
        const loggedIn = await this.ensureLoggedIn();
        if (!loggedIn) return;
        const res = await approveWebLogin(this.ticket);
        if (!res || !res.success) {
          uni.showToast({ title: (res && res.message) || '确认失败', icon: 'none' });
          return;
        }
        uni.showToast({ title: '已确认登录', icon: 'success' });
        setTimeout(() => {
          uni.switchTab({ url: '/pages/home/home' });
        }, 800);
      } catch (error) {
        uni.showToast({ title: '确认失败，请重试', icon: 'none' });
      } finally {
        this.submitting = false;
      }
    },
    goBack() {
      uni.navigateBack({
        fail: () => uni.switchTab({ url: '/pages/home/home' })
      });
    }
  }
};
</script>

<style scoped>
.fade-in {
  opacity: 0;
  animation: fadeIn 0.35s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(16rpx); }
  to { opacity: 1; transform: translateY(0); }
}

.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 72rpx 44rpx;
  background: #ffffff;
  color: #1f2329;
}

.panel {
  box-sizing: border-box;
  width: 100%;
  padding: 40rpx 32rpx;
  border: 1rpx solid #edf0f2;
  border-radius: 18rpx;
  background: #fff;
}

.title {
  font-size: 38rpx;
  font-weight: 700;
  line-height: 1.25;
}

.desc {
  margin-top: 16rpx;
  color: #646a73;
  font-size: 27rpx;
  line-height: 1.55;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-top: 34rpx;
  padding: 22rpx;
  border-radius: 14rpx;
  background: #f5f6f7;
}

.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
}

.user-info,
.user-label,
.user-name {
  display: block;
}

.user-label {
  color: #8f959e;
  font-size: 22rpx;
}

.user-name {
  margin-top: 4rpx;
  color: #1f2329;
  font-size: 28rpx;
  font-weight: 600;
}

.confirm-btn,
.cancel-btn {
  margin: 34rpx 0 0;
  height: 84rpx;
  line-height: 84rpx;
  border-radius: 14rpx;
  font-size: 28rpx;
}

.confirm-btn {
  background: #1f2329;
  color: #fff;
}

.confirm-btn[disabled] {
  background: #d9dde2;
}

.cancel-btn {
  margin-top: 18rpx;
  background: #f5f6f7;
  color: #646a73;
}
</style>
