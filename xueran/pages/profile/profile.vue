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
      <view class="feature-item" @click="goToQuestionRecords">
        <view class="feature-icon">
          <text class="feature-icon-text">问</text>
        </view>
        <view class="feature-content">
          <view class="feature-title">问答记录</view>
          <view class="feature-desc">查询、删除 AI 问答记录</view>
        </view>
        <view class="arrow"></view>
      </view>

      <view class="feature-item" @click="goToFavorites">
        <view class="feature-icon">
          <text class="feature-icon-text">藏</text>
        </view>
        <view class="feature-content">
          <view class="feature-title">我的收藏</view>
          <view class="feature-desc">查看、搜索收藏的剧本</view>
        </view>
        <view class="arrow"></view>
      </view>

      <view class="feature-item" @click="goToMyUploads">
        <view class="feature-icon">
          <text class="feature-icon-text">传</text>
        </view>
        <view class="feature-content">
          <view class="feature-title">我的上传</view>
          <view class="feature-desc">搜索、查看、删除上传的剧本</view>
        </view>
        <view class="arrow"></view>
      </view>

      <view class="feature-item" @click="goToMyGames">
        <view class="feature-icon">
          <text class="feature-icon-text">局</text>
        </view>
        <view class="feature-content">
          <view class="feature-title">我的战局</view>
          <view class="feature-desc">查看玩家和说书人战绩</view>
        </view>
        <view class="arrow"></view>
      </view>

      <view class="feature-item" @click="goToMyCarpools">
        <view class="feature-icon">
          <text class="feature-icon-text">拼</text>
        </view>
        <view class="feature-content">
          <view class="feature-title">我的拼车</view>
          <view class="feature-desc">查看发布和报名的拼车</view>
        </view>
        <view class="arrow"></view>
      </view>

      <view class="feature-item" @click="goToAiConfig">
        <view class="feature-icon">
          <text class="feature-icon-text">AI</text>
        </view>
        <view class="feature-content">
          <view class="feature-title">AI 配置</view>
          <view class="feature-desc">OpenAI、Claude Code、DeepSeek</view>
        </view>
        <view class="arrow"></view>
      </view>

      <view class="feature-item" @click="goToExamConfig">
        <view class="feature-icon">
          <text class="feature-icon-text">题</text>
        </view>
        <view class="feature-content">
          <view class="feature-title">模拟考配置</view>
          <view class="feature-desc">维护个人题库、答案和题图</view>
        </view>
        <view class="arrow"></view>
      </view>

      <view class="feature-item" @click="goToExamRecords">
        <view class="feature-icon">
          <text class="feature-icon-text">绩</text>
        </view>
        <view class="feature-content">
          <view class="feature-title">模拟考记录</view>
          <view class="feature-desc">搜索、查看、删除考试成绩</view>
        </view>
        <view class="arrow"></view>
      </view>

      <view class="feature-item last" @click="goToProfileSettings">
        <view class="feature-icon">
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
    goToMyGames() {
      if (!this.user) {
        this.goToLogin();
        return;
      }
      uni.navigateTo({
        url: '/pages/my-games/my-games'
      });
    },
    goToMyCarpools() {
      if (!this.user) {
        this.goToLogin();
        return;
      }
      uni.navigateTo({
        url: '/pages/my-carpools/my-carpools'
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
    },
    goToProfileSettings() {
      if (!this.user) {
        this.goToLogin();
        return;
      }
      uni.navigateTo({
        url: '/pages/profile-settings/profile-settings'
      });
    }
  }
};
</script>

<style scoped>
.container {
  width: 100%;
  min-height: 100vh;
  box-sizing: border-box;
  overflow-x: hidden;
  padding: 64rpx 44rpx 56rpx;
  background: #ffffff;
  color: #1f2329;
}

.fade-in {
  opacity: 1;
}

.slide-down {
  opacity: 1;
}

.profile-card {
  box-sizing: border-box;
  width: 100%;
  padding: 24rpx 0 42rpx;
  border-bottom: 1rpx solid #edf0f2;
  background: #ffffff;
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
  width: 104rpx;
  height: 104rpx;
  margin-right: 26rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background: #f0f9f4;
  flex-shrink: 0;
  border: 1rpx solid #d9f0e3;
}

.avatar {
  width: 100%;
  height: 100%;
}

.avatar-text {
  color: #1f8f4d;
  font-size: 42rpx;
  font-weight: 700;
}

.profile-info,
.feature-content {
  flex: 1;
  min-width: 0;
}

.profile-name {
  margin-bottom: 10rpx;
  color: #1f2329;
  font-size: 42rpx;
  line-height: 1.28;
  font-weight: 800;
  word-break: break-all;
}

.profile-desc {
  color: #646a73;
  font-size: 27rpx;
  line-height: 1.5;
}

.login-badge {
  height: 64rpx;
  line-height: 64rpx;
  padding: 0 30rpx;
  border-radius: 10rpx;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 700;
  background: #20b15a;
}

.login-tip {
  margin-top: 26rpx;
  color: #8f959e;
  font-size: 24rpx;
  line-height: 1.55;
}

.section-head {
  display: flex;
  align-items: center;
  margin: 56rpx 0 10rpx;
}

.section-title {
  color: #1f2329;
  font-size: 28rpx;
  font-weight: 700;
}

.feature-list {
  box-sizing: border-box;
  width: 100%;
  overflow: hidden;
  background: #ffffff;
}

.feature-item {
  min-height: 118rpx;
  padding: 28rpx 0;
  border-bottom: 1rpx solid #edf0f2;
  box-sizing: border-box;
}

.feature-item.last {
  border-bottom: 0;
}

.feature-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  margin-right: 24rpx;
  border-radius: 8rpx;
  background: #f0f9f4;
  flex-shrink: 0;
}

.feature-icon-text {
  font-size: 24rpx;
  font-weight: 700;
  color: #1f8f4d;
}

.feature-title {
  margin-bottom: 8rpx;
  color: #1f2329;
  font-size: 30rpx;
  line-height: 1.35;
  font-weight: 600;
}

.feature-desc {
  color: #8f959e;
  font-size: 24rpx;
  line-height: 1.45;
}

.arrow {
  width: 14rpx;
  height: 14rpx;
  margin-left: 18rpx;
  border-top: 2rpx solid #c9cdd4;
  border-right: 2rpx solid #c9cdd4;
  transform: rotate(45deg);
}

.logout-wrap {
  margin-top: 56rpx;
}

.logout-btn {
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 10rpx;
  border: 1rpx solid #dfe2e6;
  color: #1f2329;
  font-size: 30rpx;
  font-weight: 700;
  background: #ffffff;
}

.logout-tip {
  margin-top: 18rpx;
  color: #8f959e;
  font-size: 24rpx;
  line-height: 1.4;
  text-align: center;
}

button::after {
  border: none;
}
</style>
