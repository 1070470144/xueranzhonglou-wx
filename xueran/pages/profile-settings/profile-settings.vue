<template>
  <view class="page">
    <view class="panel">
      <view class="avatar-row">
        <image :src="avatarUrl || '/static/default-avatar.png'" class="avatar" mode="aspectFill" />
        <view class="avatar-actions">
          <button class="small-btn primary" open-type="chooseAvatar" @chooseavatar="onChooseWechatAvatar">微信头像</button>
          <button class="small-btn" @tap="chooseLocalAvatar">相册选择</button>
        </view>
      </view>

      <view class="form-row">
        <view class="label">用户名</view>
        <input v-model="nickname" class="input" type="nickname" maxlength="80" placeholder="请输入用户名" />
      </view>

      <button class="save-btn" :loading="saving" @tap="save">保存</button>
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
.page { min-height: 100vh; padding: 24rpx; box-sizing: border-box; background: #f6f2ec; color: #241f1a; }
button { margin: 0; }
button::after { border: 0; }
.panel { padding: 24rpx; border: 1rpx solid #e5d8c8; border-radius: 22rpx; background: #fffaf4; box-shadow: 0 12rpx 36rpx rgba(72, 45, 22, 0.08); }
.avatar-row { display: flex; align-items: center; gap: 24rpx; padding-bottom: 24rpx; margin-bottom: 22rpx; border-bottom: 1rpx solid #eadccd; }
.avatar { width: 132rpx; height: 132rpx; border-radius: 22rpx; background: #eadccd; flex-shrink: 0; }
.avatar-actions { display: flex; flex: 1; gap: 14rpx; }
.small-btn { flex: 1; height: 72rpx; line-height: 72rpx; padding: 0 14rpx; border: 1rpx solid #e2d2bf; border-radius: 16rpx; background: #fffdf9; color: #4a3624; font-size: 26rpx; }
.small-btn.primary { background: #5d4037; border-color: #5d4037; color: #fffaf4; }
.form-row { margin-bottom: 32rpx; }
.label { margin-bottom: 12rpx; color: #4a3624; font-size: 26rpx; font-weight: 700; }
.input { height: 82rpx; padding: 0 22rpx; border: 1rpx solid #e2d2bf; border-radius: 16rpx; background: #fffdf9; box-sizing: border-box; color: #241f1a; font-size: 28rpx; }
.save-btn { height: 84rpx; line-height: 84rpx; border-radius: 16rpx; background: #5d4037; color: #fffaf4; font-size: 30rpx; font-weight: 700; }
</style>
