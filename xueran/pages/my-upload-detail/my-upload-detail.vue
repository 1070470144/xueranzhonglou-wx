<template>
  <scroll-view class="page" scroll-y>
    <view v-if="loading" class="state-text">加载中...</view>

    <view v-else-if="script" class="detail-wrap">
      <view class="header-card">
        <view class="title-row">
          <text class="title">{{ script.title || '未命名剧本' }}</text>
          <text class="status-tag" :class="statusClass(script)">{{ statusText(script) }}</text>
        </view>
        <text class="author">{{ script.author || '未知作者' }}</text>
      </view>

      <view v-if="images.length" class="image-row">
        <image v-for="image in images" :key="image" :src="image" class="cover-image" mode="aspectFill" />
      </view>

      <view v-if="isRejected(script) && script.reviewReason" class="section reject-section">
        <text class="section-title">拒绝原因</text>
        <text class="section-content danger">{{ script.reviewReason }}</text>
      </view>

      <view v-if="script.description" class="section">
        <text class="section-title">简介</text>
        <text class="section-content">{{ script.description }}</text>
      </view>

      <view class="section">
        <text class="section-title">上传信息</text>
        <view class="info-row">
          <text class="info-label">来源</text>
          <text class="info-value">用户上传</text>
        </view>
        <view class="info-row">
          <text class="info-label">状态</text>
          <text class="info-value">{{ statusText(script) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">版本</text>
          <text class="info-value">{{ script.version || 'v1.0' }}</text>
        </view>
      </view>

      <view class="section">
        <text class="section-title">JSON 内容</text>
        <text class="json-preview">{{ jsonPreview }}</text>
      </view>
    </view>

    <view v-else class="state-text error">加载失败</view>
  </scroll-view>
</template>

<script>
import { getMyUploadedScriptDetail } from '@/utils/api.js';

export default {
  data() {
    return {
      scriptId: '',
      script: null,
      loading: false
    };
  },
  computed: {
    images() {
      return Array.isArray(this.script && this.script.images) ? this.script.images.slice(0, 3) : [];
    },
    jsonPreview() {
      if (!this.script) return '';
      const copy = { ...this.script };
      delete copy._id;
      delete copy.id;
      return JSON.stringify(copy, null, 2);
    }
  },
  onLoad(options) {
    this.scriptId = options && options.id ? options.id : '';
    this.loadDetail();
  },
  methods: {
    async loadDetail() {
      if (!this.scriptId) return;
      this.loading = true;
      try {
        const result = await getMyUploadedScriptDetail(this.scriptId);
        if (!result || !result.success) {
          uni.showToast({ title: (result && result.message) || '加载失败', icon: 'none' });
          return;
        }
        this.script = result.data && result.data.script;
      } catch (error) {
        console.error('load my upload detail failed:', error);
        uni.showToast({ title: '加载失败，请重试', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },
    statusText(item) {
      const status = item.reviewStatus || item.status;
      if (status === 'approved' || item.status === 'published' || item.status === 'active') return '已通过';
      if (status === 'rejected' || item.status === 'rejected') return '已拒绝';
      return '待审核';
    },
    statusClass(item) {
      const status = item.reviewStatus || item.status;
      if (status === 'approved' || item.status === 'published' || item.status === 'active') return 'approved';
      if (status === 'rejected' || item.status === 'rejected') return 'rejected';
      return 'pending';
    },
    isRejected(item) {
      return this.statusClass(item) === 'rejected';
    }
  }
};
</script>

<style scoped>
.page {
  height: 100vh;
  box-sizing: border-box;
  padding: 20rpx;
  background: #f8f8f8;
  color: #333;
}

.detail-wrap {
  padding-bottom: 40rpx;
}

.header-card,
.section {
  margin-bottom: 20rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  background: #fff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}

.title-row {
  display: flex;
  align-items: flex-start;
}

.title {
  flex: 1;
  min-width: 0;
  color: #333;
  font-size: 36rpx;
  font-weight: 700;
  line-height: 1.35;
  word-break: break-all;
}

.author {
  display: block;
  margin-top: 12rpx;
  color: #666;
  font-size: 26rpx;
}

.status-tag {
  margin-left: 16rpx;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  flex-shrink: 0;
}

.status-tag.pending {
  color: #9a6a00;
  background: #fff6da;
}

.status-tag.approved {
  color: #0f7d45;
  background: #e9f8ef;
}

.status-tag.rejected {
  color: #b3261e;
  background: #fdeeee;
}

.image-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.cover-image {
  width: 214rpx;
  height: 160rpx;
  border-radius: 16rpx;
  background: #eee;
}

.section-title {
  display: block;
  margin-bottom: 14rpx;
  color: #333;
  font-size: 30rpx;
  font-weight: 700;
}

.section-content {
  color: #555;
  font-size: 26rpx;
  line-height: 1.6;
  word-break: break-all;
}

.danger {
  color: #9a1b16;
}

.reject-section {
  background: #fff7f5;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 14rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.info-row:last-child {
  border-bottom: 0;
}

.info-label {
  color: #666;
  font-size: 26rpx;
}

.info-value {
  color: #333;
  font-size: 26rpx;
  font-weight: 600;
}

.json-preview {
  display: block;
  padding: 18rpx;
  border-radius: 12rpx;
  color: #333;
  font-size: 22rpx;
  line-height: 1.55;
  word-break: break-all;
  white-space: pre-wrap;
  background: #f6f6f6;
}

.state-text {
  padding: 120rpx 0;
  color: #666;
  font-size: 28rpx;
  text-align: center;
}

.state-text.error {
  color: #b42318;
}
</style>
