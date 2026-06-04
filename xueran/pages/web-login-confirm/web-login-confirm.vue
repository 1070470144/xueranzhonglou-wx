<template>
  <view class="page fade-in">
    <view class="brand">
      <view class="logo">血</view>
      <view class="brand-text">血染钟楼助手</view>
    </view>

    <view class="main">
      <view class="title">确认网页登录</view>
      <view class="subtitle">确认后，电脑上的网页版会使用当前小程序账号登录。</view>

      <view v-if="user" class="user-row">
        <image v-if="user.avatarUrl" class="avatar" :src="user.avatarUrl" mode="aspectFill" />
        <view v-else class="avatar-placeholder">{{ userInitial }}</view>
        <view class="user-info">
          <text class="user-label">当前账号</text>
          <text class="user-name">{{ user.nickname || '微信用户' }}</text>
        </view>
      </view>

      <button class="confirm-btn" :loading="submitting" :disabled="submitting || !ticket" @click="confirmLogin">
        {{ submitting ? '确认中...' : '确认登录' }}
      </button>

      <button class="cancel-btn" :disabled="submitting" @click="goBack">取消</button>

      <view class="note">仅授权本次网页登录，不会分享你的微信隐私信息</view>
    </view>
  </view>
</template>

<script>
import { approveWebLogin, getCurrentUser, isLoggedIn, loginWithWeixin } from '@/utils/auth.js';

export default {
  computed: {
    userInitial() {
      const name = this.user && (this.user.nickname || this.user.email || '微信用户');
      return String(name || '微').trim().slice(0, 1);
    }
  },
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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-height: 100vh;
  box-sizing: border-box;
  padding: 188rpx 48rpx 72rpx;
  background: #ffffff;
  color: #1f2329;
}

.brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  width: 100%;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border: 1rpx solid #d9f0e3;
  border-radius: 12rpx;
  background: #f0f9f4;
  color: #1f8f4d;
  font-size: 30rpx;
  font-weight: 700;
}

.brand-text {
  color: #1f2329;
  font-size: 30rpx;
  line-height: 1.3;
  font-weight: 700;
}

.main {
  width: 100%;
  max-width: 560rpx;
  padding-top: 96rpx;
  text-align: center;
}

.title {
  color: #1f2329;
  font-size: 56rpx;
  line-height: 1.18;
  font-weight: 800;
}

.subtitle {
  width: 520rpx;
  max-width: 100%;
  margin: 22rpx auto 0;
  color: #646a73;
  font-size: 28rpx;
  line-height: 1.6;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 18rpx;
  box-sizing: border-box;
  width: 100%;
  margin-top: 64rpx;
  padding: 24rpx;
  border: 1rpx solid #edf0f2;
  border-radius: 12rpx;
  background: #fafafa;
  text-align: left;
}

.avatar,
.avatar-placeholder {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
}

.avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f9f4;
  color: #1f8f4d;
  font-size: 28rpx;
  font-weight: 700;
}

.user-info,
.user-label,
.user-name {
  display: block;
}

.user-info {
  min-width: 0;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.confirm-btn,
.cancel-btn {
  width: 100%;
  margin: 34rpx 0 0;
  height: 92rpx;
  line-height: 92rpx;
  border-radius: 10rpx;
  font-size: 30rpx;
  font-weight: 700;
}

.confirm-btn {
  background: #20b15a;
  color: #ffffff;
}

.confirm-btn[disabled] {
  background: #9bd8b6;
  color: #ffffff;
}

.cancel-btn {
  margin-top: 18rpx;
  background: #f5f6f7;
  color: #646a73;
}

.cancel-btn[disabled] {
  color: #b8bec6;
}

.note {
  margin-top: 24rpx;
  color: #8f959e;
  font-size: 24rpx;
  line-height: 1.45;
  text-align: center;
}

button::after {
  border: none;
}
</style>
