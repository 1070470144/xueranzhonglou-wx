<template>
  <view class="page">
    <view class="brand">
      <view class="logo">血</view>
      <view class="brand-text">血染钟楼助手</view>
    </view>

    <view class="main">
      <view class="title">微信登录</view>
      <view class="subtitle">同步你的问答、收藏、上传和模拟考记录。</view>

      <button class="wechat-btn" :loading="loading" :disabled="loading" @click="submitWeixinLogin">
        {{ loading ? '登录中' : '微信一键登录' }}
      </button>

      <view class="note">仅用于账号识别和资料展示</view>
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
  border-radius: 12rpx;
  background: #f0f9f4;
  color: #1f8f4d;
  border: 1rpx solid #d9f0e3;
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

.wechat-btn {
  margin-top: 72rpx;
  width: 100%;
  height: 92rpx;
  line-height: 92rpx;
  border-radius: 10rpx;
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 700;
  background: #20b15a;
}

.wechat-btn[disabled] {
  background: #9bd8b6;
  color: #ffffff;
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
