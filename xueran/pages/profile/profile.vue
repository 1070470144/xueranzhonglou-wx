<template>
  <view style="width: 100%; min-height: 100vh; padding: 28rpx 0 48rpx; box-sizing: border-box; overflow-x: hidden; background: #f7f1e8;">
    <view style="margin: 0 24rpx; padding: 34rpx 30rpx; border-radius: 24rpx; background: #ffffff; border: 1rpx solid #eadfd3; box-shadow: 0 14rpx 36rpx rgba(64, 42, 27, 0.06); box-sizing: border-box;" @click="goToLogin">
      <view style="display: flex; align-items: center;">
        <view style="display: flex; align-items: center; justify-content: center; width: 116rpx; height: 116rpx; margin-right: 26rpx; border-radius: 26rpx; overflow: hidden; background: #f6e8df; border: 1rpx solid #ead4c8; flex-shrink: 0;">
          <image v-if="user" src="/static/default-avatar.png" style="width: 100%; height: 100%;" />
          <text v-else style="color: #8f3f2b; font-size: 40rpx; font-weight: 700;">游</text>
        </view>

        <view style="flex: 1; min-width: 0;">
          <view style="color: #2b2520; font-size: 38rpx; line-height: 1.35; font-weight: 700; margin-bottom: 8rpx; word-break: break-all;">{{ user ? user.email : '游客用户' }}</view>
          <view style="color: #8a8178; font-size: 26rpx; line-height: 1.45;">{{ user ? '当前账号已登录' : '点击登录账号' }}</view>
        </view>

        <view v-if="!user" style="height: 64rpx; line-height: 64rpx; padding: 0 28rpx; border-radius: 18rpx; color: #ffffff; font-size: 28rpx; font-weight: 700; background: #8f3f2b; box-shadow: 0 10rpx 20rpx rgba(143, 63, 43, 0.14);">登录</view>
      </view>

      <view v-if="!user" style="margin-top: 28rpx; padding: 18rpx 22rpx; border-radius: 18rpx; color: #9a6657; font-size: 24rpx; line-height: 1.45; background: #fbf3ee; border: 1rpx solid #f0ded5;">登录后可保存账号状态，使用更多剧本社区功能</view>
    </view>

    <view style="display: flex; align-items: center; margin: 38rpx 32rpx 16rpx;">
      <view style="color: #2b2520; font-size: 30rpx; font-weight: 700;">常用功能</view>
    </view>

    <view style="margin: 0 24rpx; border-radius: 24rpx; overflow: hidden; background: #ffffff; border: 1rpx solid #eadfd3; box-shadow: 0 10rpx 28rpx rgba(64, 42, 27, 0.04); box-sizing: border-box;">
      <view style="display: flex; align-items: center; min-height: 132rpx; padding: 24rpx 28rpx; border-bottom: 1rpx solid #f1e8df; box-sizing: border-box;" @click="goToSubmissionGuide">
        <view style="display: flex; align-items: center; justify-content: center; width: 66rpx; height: 66rpx; margin-right: 24rpx; border-radius: 18rpx; background: #f8eee8; flex-shrink: 0;">
          <text style="color: #8f3f2b; font-size: 34rpx; font-weight: 700;">稿</text>
        </view>
        <view style="flex: 1; min-width: 0;">
          <view style="color: #2b2520; font-size: 30rpx; line-height: 1.35; font-weight: 600; margin-bottom: 6rpx;">投稿须知</view>
          <view style="color: #9d9389; font-size: 24rpx; line-height: 1.4;">了解投稿规则和要求</view>
        </view>
        <view style="width: 16rpx; height: 16rpx; margin-left: 18rpx; border-top: 2rpx solid #c7bdb3; border-right: 2rpx solid #c7bdb3; transform: rotate(45deg);"></view>
      </view>

      <view style="display: flex; align-items: center; min-height: 132rpx; padding: 24rpx 28rpx; border-bottom: 1rpx solid #f1e8df; box-sizing: border-box;" @click="goToQuestionRecords">
        <view style="display: flex; align-items: center; justify-content: center; width: 66rpx; height: 66rpx; margin-right: 24rpx; border-radius: 18rpx; background: #eef5f1; flex-shrink: 0;">
          <text style="color: #2e6b53; font-size: 34rpx; font-weight: 700;">问</text>
        </view>
        <view style="flex: 1; min-width: 0;">
          <view style="color: #2b2520; font-size: 30rpx; line-height: 1.35; font-weight: 600; margin-bottom: 6rpx;">问答记录</view>
          <view style="color: #9d9389; font-size: 24rpx; line-height: 1.4;">查询、维护 AI 问答记录</view>
        </view>
        <view style="width: 16rpx; height: 16rpx; margin-left: 18rpx; border-top: 2rpx solid #c7bdb3; border-right: 2rpx solid #c7bdb3; transform: rotate(45deg);"></view>
      </view>

      <view style="display: flex; align-items: center; min-height: 132rpx; padding: 24rpx 28rpx; border-bottom: 1rpx solid #f1e8df; box-sizing: border-box;" @click="goToAiConfig">
        <view style="display: flex; align-items: center; justify-content: center; width: 66rpx; height: 66rpx; margin-right: 24rpx; border-radius: 18rpx; background: #edf1f8; flex-shrink: 0;">
          <text style="color: #405c8a; font-size: 34rpx; font-weight: 700;">AI</text>
        </view>
        <view style="flex: 1; min-width: 0;">
          <view style="color: #2b2520; font-size: 30rpx; line-height: 1.35; font-weight: 600; margin-bottom: 6rpx;">AI 配置</view>
          <view style="color: #9d9389; font-size: 24rpx; line-height: 1.4;">OpenAI、Claude Code、DeepSeek</view>
        </view>
        <view style="width: 16rpx; height: 16rpx; margin-left: 18rpx; border-top: 2rpx solid #c7bdb3; border-right: 2rpx solid #c7bdb3; transform: rotate(45deg);"></view>
      </view>

      <view style="display: flex; align-items: center; min-height: 132rpx; padding: 24rpx 28rpx; box-sizing: border-box;">
        <view style="display: flex; align-items: center; justify-content: center; width: 66rpx; height: 66rpx; margin-right: 24rpx; border-radius: 18rpx; background: #f4efe8; flex-shrink: 0;">
          <text style="color: #7d6d5f; font-size: 34rpx; font-weight: 700;">设</text>
        </view>
        <view style="flex: 1; min-width: 0;">
          <view style="color: #2b2520; font-size: 30rpx; line-height: 1.35; font-weight: 600; margin-bottom: 6rpx;">设置</view>
          <view style="color: #9d9389; font-size: 24rpx; line-height: 1.4;">应用设置和偏好</view>
        </view>
        <view style="width: 16rpx; height: 16rpx; margin-left: 18rpx; border-top: 2rpx solid #c7bdb3; border-right: 2rpx solid #c7bdb3; transform: rotate(45deg);"></view>
      </view>
    </view>

    <view v-if="user" style="margin-top: 44rpx;">
      <button style="height: 88rpx; line-height: 88rpx; border-radius: 18rpx; color: #b42318; font-size: 30rpx; font-weight: 700; background: #fff7f5; border: 1rpx solid #f3c5bd;" @click="handleLogout">退出登录</button>
      <view style="margin-top: 16rpx; color: #b42318; font-size: 24rpx; line-height: 1.4; text-align: center;">退出后将清除当前登录状态</view>
    </view>
  </view>
</template>

<script>
import { getCurrentUser, logout } from '@/utils/auth.js';

export default {
  data() {
    return {
      user: null
    };
  },
  onShow() {
    this.user = getCurrentUser();
  },
  methods: {
    goToLogin() {
      if (this.user) return;
      uni.navigateTo({ url: '/pages/login/login' });
    },
    async handleLogout() {
      uni.showModal({
        title: '退出登录',
        content: '确定要退出当前账号吗？',
        confirmText: '退出',
        confirmColor: '#b42318',
        success: async (res) => {
          if (!res.confirm) return;
          await logout();
          this.user = null;
          uni.showToast({ title: '已退出登录', icon: 'success' });
        }
      });
    },
    goToSubmissionGuide() {
      uni.navigateTo({
        url: '/pages/submission-guide/submission-guide'
      });
    },
    goToQuestionRecords() {
      uni.navigateTo({
        url: '/pages/question-records/question-records'
      });
    },
    goToAiConfig() {
      uni.navigateTo({
        url: '/pages/ai-config/ai-config'
      });
    }
  }
};
</script>

<style>
button::after {
  border: none;
}
</style>
