<template>
  <view class="container fade-in">
    <view class="profile-card slide-down" @click="goToLogin">
      <view class="profile-main">
        <view class="avatar-box">
          <image v-if="user" :src="user.avatarUrl || '/static/default-avatar.png'" class="avatar" />
          <text v-else class="avatar-text">游</text>
        </view>

        <view class="profile-info">
          <view class="profile-name">{{ user ? (user.nickname || user.email || '微信用户') : '游客用户' }}</view>
          <view class="profile-desc">{{ user ? '当前账号已登录' : '点击登录账号' }}</view>
        </view>

        <view v-if="!user" class="login-badge">登录</view>
      </view>

      <view v-if="!user" class="login-tip">登录后可保存账号状态，使用更多剧本社区功能</view>
    </view>

    <view class="section-head">
      <view class="section-title">常用功能</view>
    </view>

    <view class="feature-list">
      <view class="feature-item" @click="goToSubmissionGuide">
        <view class="feature-icon blue-soft">
          <text class="feature-icon-text">稿</text>
        </view>
        <view class="feature-content">
          <view class="feature-title">投稿须知</view>
          <view class="feature-desc">了解投稿规则和要求</view>
        </view>
        <view class="arrow"></view>
      </view>

      <view class="feature-item" @click="goToQuestionRecords">
        <view class="feature-icon green-soft">
          <text class="feature-icon-text">问</text>
        </view>
        <view class="feature-content">
          <view class="feature-title">问答记录</view>
          <view class="feature-desc">查询、删除 AI 问答记录</view>
        </view>
        <view class="arrow"></view>
      </view>

      <view class="feature-item" @click="goToFavorites">
        <view class="feature-icon amber-soft">
          <text class="feature-icon-text">藏</text>
        </view>
        <view class="feature-content">
          <view class="feature-title">我的收藏</view>
          <view class="feature-desc">查看、搜索收藏的剧本</view>
        </view>
        <view class="arrow"></view>
      </view>

      <view class="feature-item" @click="goToMyUploads">
        <view class="feature-icon teal-soft">
          <text class="feature-icon-text">传</text>
        </view>
        <view class="feature-content">
          <view class="feature-title">我的上传</view>
          <view class="feature-desc">搜索、查看、删除上传的剧本</view>
        </view>
        <view class="arrow"></view>
      </view>

      <view class="feature-item" @click="goToAiConfig">
        <view class="feature-icon purple-soft">
          <text class="feature-icon-text">AI</text>
        </view>
        <view class="feature-content">
          <view class="feature-title">AI 配置</view>
          <view class="feature-desc">OpenAI、Claude Code、DeepSeek</view>
        </view>
        <view class="arrow"></view>
      </view>

      <view class="feature-item" @click="goToExamConfig">
        <view class="feature-icon blue-soft">
          <text class="feature-icon-text">题</text>
        </view>
        <view class="feature-content">
          <view class="feature-title">模拟考配置</view>
          <view class="feature-desc">维护个人题库、答案和题图</view>
        </view>
        <view class="arrow"></view>
      </view>

      <view class="feature-item" @click="goToExamRecords">
        <view class="feature-icon green-soft">
          <text class="feature-icon-text">绩</text>
        </view>
        <view class="feature-content">
          <view class="feature-title">模拟考记录</view>
          <view class="feature-desc">搜索、查看、删除考试成绩</view>
        </view>
        <view class="arrow"></view>
      </view>

      <view class="feature-item last">
        <view class="feature-icon gray-soft">
          <text class="feature-icon-text">设</text>
        </view>
        <view class="feature-content">
          <view class="feature-title">设置</view>
          <view class="feature-desc">应用设置和偏好</view>
        </view>
        <view class="arrow"></view>
      </view>
    </view>

    <view v-if="user" class="logout-wrap">
      <button class="logout-btn" @click="handleLogout">退出登录</button>
      <view class="logout-tip">退出后将清除当前登录状态</view>
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
    goToFavorites() {
      uni.navigateTo({
        url: '/pages/favorites/favorites'
      });
    },
    goToMyUploads() {
      uni.navigateTo({
        url: '/pages/my-uploads/my-uploads'
      });
    },
    goToAiConfig() {
      uni.navigateTo({
        url: '/pages/ai-config/ai-config'
      });
    },
    goToExamConfig() {
      uni.navigateTo({
        url: '/pages/exam-config/exam-config'
      });
    },
    goToExamRecords() {
      uni.navigateTo({
        url: '/pages/exam-records/exam-records'
      });
    }
  }
};
</script>

<style scoped>
@keyframes fadeIn {
  0% {
    opacity: 0;
    transform: translateY(20rpx);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideDown {
  0% {
    opacity: 0;
    transform: translateY(-20rpx);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.container {
  width: 100%;
  min-height: 100vh;
  box-sizing: border-box;
  overflow-x: hidden;
  padding: 20rpx 20rpx 56rpx;
  background: #f8f8f8;
}

.fade-in {
  opacity: 0;
  animation: fadeIn 0.6s ease-out forwards;
}

.slide-down {
  opacity: 0;
  animation: slideDown 0.5s ease-out 0.1s forwards;
}

.profile-card,
.feature-list {
  box-sizing: border-box;
  width: 100%;
  border-radius: 16rpx;
  background: #fff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.profile-card {
  padding: 28rpx 24rpx;
}

.profile-main,
.feature-item {
  display: flex;
  align-items: center;
}

.avatar-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 116rpx;
  height: 116rpx;
  margin-right: 24rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: #f0f0f0;
  flex-shrink: 0;
}

.avatar {
  width: 100%;
  height: 100%;
}

.avatar-text {
  color: #007AFF;
  font-size: 40rpx;
  font-weight: 700;
}

.profile-info,
.feature-content {
  flex: 1;
  min-width: 0;
}

.profile-name {
  margin-bottom: 8rpx;
  color: #333;
  font-size: 38rpx;
  line-height: 1.35;
  font-weight: 700;
  word-break: break-all;
}

.profile-desc {
  color: #666;
  font-size: 26rpx;
  line-height: 1.45;
}

.login-badge {
  height: 64rpx;
  line-height: 64rpx;
  padding: 0 28rpx;
  border-radius: 16rpx;
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
  background: #007AFF;
}

.login-tip {
  margin-top: 24rpx;
  padding: 18rpx 22rpx;
  border-radius: 16rpx;
  color: #666;
  font-size: 24rpx;
  line-height: 1.45;
  background: #f8f8f8;
}

.section-head {
  display: flex;
  align-items: center;
  margin: 34rpx 8rpx 16rpx;
}

.section-title {
  color: #333;
  font-size: 30rpx;
  font-weight: 700;
}

.feature-list {
  overflow: hidden;
}

.feature-item {
  min-height: 132rpx;
  padding: 24rpx;
  border-bottom: 1rpx solid #e5e5e5;
  box-sizing: border-box;
}

.feature-item.last {
  border-bottom: 0;
}

.feature-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 66rpx;
  height: 66rpx;
  margin-right: 24rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
}

.feature-icon-text {
  font-size: 32rpx;
  font-weight: 700;
  color: #007AFF;
}

.blue-soft {
  background: rgba(0, 122, 255, 0.08);
}

.green-soft {
  background: rgba(52, 199, 89, 0.1);
}

.green-soft .feature-icon-text {
  color: #2e7d32;
}

.purple-soft {
  background: rgba(88, 86, 214, 0.1);
}

.purple-soft .feature-icon-text {
  color: #5856d6;
}

.amber-soft {
  background: rgba(245, 158, 11, 0.12);
}

.amber-soft .feature-icon-text {
  color: #b45309;
}

.teal-soft {
  background: rgba(20, 184, 166, 0.12);
}

.teal-soft .feature-icon-text {
  color: #0f766e;
}

.gray-soft {
  background: #f0f0f0;
}

.gray-soft .feature-icon-text {
  color: #666;
}

.feature-title {
  margin-bottom: 6rpx;
  color: #333;
  font-size: 30rpx;
  line-height: 1.35;
  font-weight: 600;
}

.feature-desc {
  color: #666;
  font-size: 24rpx;
  line-height: 1.4;
}

.arrow {
  width: 16rpx;
  height: 16rpx;
  margin-left: 18rpx;
  border-top: 2rpx solid #c8c8c8;
  border-right: 2rpx solid #c8c8c8;
  transform: rotate(45deg);
}

.logout-wrap {
  margin-top: 36rpx;
}

.logout-btn {
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 16rpx;
  color: #b42318;
  font-size: 30rpx;
  font-weight: 700;
  background: #fff7f5;
}

.logout-tip {
  margin-top: 16rpx;
  color: #b42318;
  font-size: 24rpx;
  line-height: 1.4;
  text-align: center;
}

button::after {
  border: none;
}
</style>
