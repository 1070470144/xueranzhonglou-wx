<template>
  <view class="page">
    <view class="hero">
      <view class="logo">血</view>
      <view class="title">微信登录</view>
      <view class="subtitle">使用微信小程序身份进入，继续使用 AI 问答和个人记录。</view>
    </view>

    <view class="panel">
      <button class="wechat-btn" :loading="loading" :disabled="loading" @click="submitWeixinLogin">
        微信一键登录
      </button>
      <view class="tip">登录后会为你创建或关联一个微信小程序账号。</view>
    </view>
  </view>
</template>

<script>
import { completeWeixinProfile, loginWithWeixin } from '@/utils/auth.js';

function getWeixinProfile() {
  return new Promise((resolve) => {
    if (!uni.getUserProfile) {
      resolve({});
      return;
    }
    uni.getUserProfile({
      desc: '用于展示账号昵称和头像',
      success: (res) => resolve(res.userInfo || {}),
      fail: () => resolve({})
    });
  });
}

export default {
  data() {
    return {
      redirect: '',
      loading: false
    };
  },
  onLoad(options) {
    this.redirect = options && options.redirect ? decodeURIComponent(options.redirect) : '';
  },
  methods: {
    async submitWeixinLogin() {
      if (this.loading) return;
      this.loading = true;
      try {
        const result = await loginWithWeixin();
        if (result && result.success) {
          const user = result.data && result.data.user;
          if (user && !user.avatarUrl) {
            const userInfo = await getWeixinProfile();
            if (userInfo && userInfo.avatarUrl) {
              await completeWeixinProfile(userInfo);
            }
          }
          uni.showToast({ title: '登录成功', icon: 'success' });
          setTimeout(() => {
            if (this.redirect) {
              uni.redirectTo({ url: this.redirect });
            } else {
              uni.navigateBack({ delta: 1 });
            }
          }, 300);
        } else {
          uni.showToast({ title: (result && result.message) || '登录失败', icon: 'none' });
        }
      } catch (error) {
        console.error('weixin login error', error);
        uni.showToast({ title: '登录失败，请稍后重试', icon: 'none' });
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 68rpx 32rpx 44rpx;
  background: #f7f1e8;
  color: #2b2520;
}

.hero {
  padding: 20rpx 4rpx 42rpx;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 112rpx;
  height: 112rpx;
  margin-bottom: 28rpx;
  border-radius: 28rpx;
  background: #f6e8df;
  color: #8f3f2b;
  font-size: 48rpx;
  font-weight: 700;
}

.title {
  font-size: 48rpx;
  line-height: 1.25;
  font-weight: 700;
}

.subtitle {
  margin-top: 14rpx;
  color: #8a8178;
  font-size: 28rpx;
  line-height: 1.55;
}

.panel {
  box-sizing: border-box;
  padding: 36rpx 32rpx 32rpx;
  border-radius: 24rpx;
  background: #ffffff;
  border: 1rpx solid #eadfd3;
  box-shadow: 0 14rpx 36rpx rgba(64, 42, 27, 0.06);
}

.wechat-btn {
  height: 92rpx;
  line-height: 92rpx;
  border-radius: 18rpx;
  color: #ffffff;
  font-size: 31rpx;
  font-weight: 700;
  background: #1aad19;
}

.wechat-btn[disabled] {
  background: #8dcf8c;
  color: #ffffff;
}

.tip {
  margin-top: 22rpx;
  color: #9d9389;
  font-size: 24rpx;
  line-height: 1.45;
  text-align: center;
}

button::after {
  border: none;
}
</style>
