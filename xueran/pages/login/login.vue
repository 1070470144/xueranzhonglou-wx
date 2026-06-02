<template>
  <view style="min-height: 100vh; padding: 62rpx 32rpx 44rpx; box-sizing: border-box; background: #f7f1e8;">
    <view style="padding: 12rpx 4rpx 40rpx;">
      <view style="color: #2b2520; font-size: 48rpx; line-height: 1.25; font-weight: 700; margin-bottom: 14rpx;">登录账号</view>
      <view style="color: #8a8178; font-size: 28rpx; line-height: 1.55;">使用邮箱和密码进入剧本社区</view>
    </view>

    <view style="padding: 36rpx 32rpx 32rpx; border-radius: 24rpx; background: #ffffff; border: 1rpx solid #eadfD3; box-shadow: 0 14rpx 36rpx rgba(64, 42, 27, 0.06);">
      <view style="margin-bottom: 28rpx;">
        <view style="color: #3a3028; font-size: 26rpx; line-height: 1.4; font-weight: 600; margin-bottom: 14rpx;">邮箱</view>
        <input
          style="height: 96rpx; padding: 0 28rpx; border-radius: 18rpx; color: #2b2520; font-size: 30rpx; background: #fbf8f4; border: 1rpx solid #eadfd3; box-sizing: border-box;"
          v-model="email"
          type="text"
          placeholder="请输入邮箱"
          placeholder-class="input-placeholder"
          confirm-type="next"
        />
      </view>

      <view style="margin-bottom: 36rpx;">
        <view style="color: #3a3028; font-size: 26rpx; line-height: 1.4; font-weight: 600; margin-bottom: 14rpx;">密码</view>
        <input
          style="height: 96rpx; padding: 0 28rpx; border-radius: 18rpx; color: #2b2520; font-size: 30rpx; background: #fbf8f4; border: 1rpx solid #eadfd3; box-sizing: border-box;"
          v-model="password"
          type="password"
          placeholder="请输入密码"
          placeholder-class="input-placeholder"
          confirm-type="done"
          @confirm="submitLogin"
        />
      </view>

      <button style="height: 92rpx; line-height: 92rpx; border-radius: 18rpx; color: #ffffff; font-size: 31rpx; font-weight: 700; background: #8f3f2b; box-shadow: 0 12rpx 24rpx rgba(143, 63, 43, 0.16);" :loading="loading" @click="submitLogin">登录</button>
      <button style="height: 88rpx; line-height: 88rpx; margin-top: 18rpx; border-radius: 18rpx; color: #8f3f2b; font-size: 30rpx; font-weight: 600; background: #f8eee8;" :loading="loading" @click="submitRegister">注册并登录</button>
    </view>
  </view>
</template>

<script>
import { loginWithEmail, registerWithEmail } from '@/utils/auth.js';

export default {
  data() {
    return {
      email: '',
      password: '',
      redirect: '',
      loading: false
    };
  },
  onLoad(options) {
    this.redirect = options && options.redirect ? decodeURIComponent(options.redirect) : '';
  },
  methods: {
    validateForm() {
      if (!this.email.trim() || !this.password) {
        uni.showToast({ title: '请输入邮箱和密码', icon: 'none' });
        return false;
      }
      return true;
    },
    async submitLogin() {
      await this.submit('login');
    },
    async submitRegister() {
      await this.submit('register');
    },
    async submit(type) {
      if (!this.validateForm() || this.loading) return;

      this.loading = true;
      try {
        const action = type === 'register' ? registerWithEmail : loginWithEmail;
        const result = await action(this.email, this.password);
        if (result && result.success) {
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
        console.error('login submit error', error);
        uni.showToast({ title: '登录失败，请稍后重试', icon: 'none' });
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style>
button::after {
  border: none;
}

.input-placeholder {
  color: #b7aca1;
}
</style>
