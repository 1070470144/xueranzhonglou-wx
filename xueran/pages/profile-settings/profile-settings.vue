<template>
  <view class="page">
    <view class="panel">
      <view class="title">设置</view>

      <view class="field-label">头像</view>
      <view class="avatar-row">
        <image :src="avatarUrl || '/static/default-avatar.png'" class="avatar" mode="aspectFill" />
        <view class="avatar-actions">
          <button class="ghost-btn" open-type="chooseAvatar" @chooseavatar="onChooseWechatAvatar">微信头像</button>
          <button class="ghost-btn" @tap="chooseLocalAvatar">相册选择</button>
        </view>
      </view>

      <view class="form-row">
        <view class="field-label">用户名</view>
        <input v-model="nickname" class="input" type="nickname" maxlength="80" placeholder="请输入用户名" />
      </view>

      <button class="primary-btn" :loading="saving" :disabled="saving" @tap="save">{{ saving ? '保存中' : '保存' }}</button>
    </view>
  </view>
</template>

<script>
import { getCurrentUser, updateProfile, requireLogin } from '@/utils/auth.js';

export default {
  data() {
    return {
      nickname: '',
      avatarUrl: '',
      saving: false
    };
  },
  onLoad() {
    const user = getCurrentUser();
    if (!user) {
      requireLogin('/pages/profile-settings/profile-settings');
      return;
    }
    this.nickname = user.nickname || user.email || '';
    this.avatarUrl = user.avatarUrl || '';
  },
  methods: {
    onChooseWechatAvatar(e) {
      const avatarUrl = e && e.detail && e.detail.avatarUrl;
      if (avatarUrl) this.avatarUrl = avatarUrl;
    },
    chooseLocalAvatar() {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: res => {
          const file = res.tempFilePaths && res.tempFilePaths[0];
          if (file) this.avatarUrl = file;
        }
      });
    },
    async uploadAvatarIfNeeded() {
      const isRemoteUrl = /^https?:\/\//.test(this.avatarUrl) && !/^http:\/\/tmp\//.test(this.avatarUrl);
      if (!this.avatarUrl || isRemoteUrl || /^cloud:\/\//.test(this.avatarUrl)) {
        return this.avatarUrl;
      }
      uni.showLoading({ title: '上传头像' });
      try {
        const suffix = (this.avatarUrl.match(/\.[a-zA-Z0-9]+$/) || ['.jpg'])[0];
        const cloudPath = `user-avatar/${Date.now()}-${Math.random().toString(36).slice(2)}${suffix}`;
        const result = await uniCloud.uploadFile({ filePath: this.avatarUrl, cloudPath });
        return result.fileID || result.fileId || result.url || this.avatarUrl;
      } finally {
        uni.hideLoading();
      }
    },
    async save() {
      const nickname = String(this.nickname || '').trim();
      if (!nickname) {
        uni.showToast({ title: '请输入用户名', icon: 'none' });
        return;
      }
      if (this.saving) return;
      this.saving = true;
      try {
        const avatarUrl = await this.uploadAvatarIfNeeded();
        const result = await updateProfile({ nickname, avatarUrl });
        uni.showToast({ title: result.message || (result.success ? '保存成功' : '保存失败'), icon: result.success ? 'success' : 'none' });
        if (result.success) {
          setTimeout(() => uni.navigateBack(), 500);
        }
      } catch (error) {
        uni.showToast({ title: '保存失败，请稍后重试', icon: 'none' });
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style scoped>
.page { min-height: 100vh; padding: 64rpx 44rpx 56rpx; box-sizing: border-box; background: #ffffff; color: #1f2329; }
.panel { background: #ffffff; }
.title { padding-bottom: 42rpx; margin-bottom: 34rpx; border-bottom: 1rpx solid #edf0f2; color: #1f2329; font-size: 42rpx; line-height: 1.28; font-weight: 800; }
.field-label { margin: 22rpx 0 12rpx; color: #646a73; font-size: 26rpx; font-weight: 600; }
.avatar-row { display: flex; align-items: center; gap: 18rpx; margin-bottom: 8rpx; }
.avatar { width: 132rpx; height: 132rpx; border-radius: 12rpx; background: #f0f9f4; border: 1rpx solid #d9f0e3; flex-shrink: 0; }
.avatar-actions { display: grid; grid-template-columns: repeat(2, 1fr); flex: 1; gap: 12rpx; }
.form-row { margin-bottom: 24rpx; }
.input { height: 76rpx; padding: 0 20rpx; border-radius: 10rpx; border: 1rpx solid #dfe2e6; background: #ffffff; box-sizing: border-box; color: #1f2329; font-size: 28rpx; }
button { margin: 0; }
button::after { border: 0; }
.primary-btn, .ghost-btn { height: 78rpx; line-height: 78rpx; border-radius: 10rpx; font-size: 28rpx; }
.primary-btn { width: 100%; color: #ffffff; background: #20b15a; }
.primary-btn[disabled] { opacity: 0.7; }
.ghost-btn { color: #1f8f4d; background: #f0f9f4; border: 1rpx solid #d9f0e3; }
</style>
