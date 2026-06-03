<template>
  <view class="uni-container">
    <view class="detail-header">
      <view>
        <text class="detail-title">问答详情</text>
        <text class="detail-subtitle">{{ getUserName(record) }} · {{ record.scriptTitle || '通用问题' }}</text>
      </view>
      <button class="uni-button" size="mini" type="default" @click="goBack">返回</button>
    </view>

    <view v-if="loading" class="loading-panel">加载中...</view>
    <view v-else-if="error" class="error-panel">
      <text class="error-text">{{ error }}</text>
      <button class="uni-button" size="mini" @click="loadDetail">重试</button>
    </view>

    <view v-else class="detail-grid">
      <view class="detail-card meta-card">
        <view class="meta-item">
          <text class="meta-label">用户</text>
          <text class="meta-value">{{ getUserName(record) }}</text>
        </view>
        <view class="meta-item" v-if="getUserSubText(record)">
          <text class="meta-label">用户标识</text>
          <text class="meta-value">{{ getUserSubText(record) }}</text>
        </view>
        <view class="meta-item">
          <text class="meta-label">板子</text>
          <text class="meta-value">{{ record.scriptTitle || '通用问题' }}</text>
        </view>
        <view class="meta-item">
          <text class="meta-label">修正状态</text>
          <uni-tag :type="record.isCorrected ? 'success' : 'default'" inverted size="small" :text="record.isCorrected ? '已修正' : '未修正'" />
        </view>
      </view>

      <view class="detail-card content-card">
        <view class="block-title">问题</view>
        <view class="content-text question-text">{{ record.question || '-' }}</view>

        <view class="block-title">AI 回答</view>
        <view class="content-text pre-text">{{ record.answer || '-' }}</view>

        <view class="block-title">简短分析</view>
        <view class="content-text">{{ record.analysis || '-' }}</view>

        <view class="block-title">修正答案</view>
        <textarea class="textarea" v-model="correctedAnswer" placeholder="如果 AI 答案不准确，在这里写入正确版本" />
        <button class="uni-button save-button" type="primary" :disabled="saving" @click="saveCorrection">保存修正</button>
      </view>
    </view>
  </view>
</template>

<script>
import { correctAnswer, getQuestionRecord } from '@/utils/aiAdminApi.js';

export default {
  data() {
    return {
      id: '',
      record: {},
      correctedAnswer: '',
      loading: false,
      saving: false,
      error: ''
    };
  },
  async onLoad(options = {}) {
    this.id = options.id || '';
    await this.loadDetail();
  },
  methods: {
    async loadDetail() {
      if (!this.id) {
        this.error = '缺少记录 ID';
        return;
      }
      this.loading = true;
      this.error = '';
      try {
        const res = await getQuestionRecord(this.id);
        if (res.success && res.data) {
          this.record = res.data;
          this.correctedAnswer = res.data.correctedAnswer || res.data.answer || '';
        } else {
          this.error = res.message || '加载失败';
        }
      } catch (error) {
        this.error = '加载失败，请稍后重试';
        console.error('load question record detail failed', error);
      } finally {
        this.loading = false;
      }
    },
    async saveCorrection() {
      if (!this.record || !this.record._id) return;
      this.saving = true;
      try {
        const res = await correctAnswer({ recordId: this.record._id, correctedAnswer: this.correctedAnswer });
        uni.showToast({ title: res.success ? '已修正' : (res.message || '保存失败'), icon: res.success ? 'success' : 'none' });
        if (res.success) await this.loadDetail();
      } finally {
        this.saving = false;
      }
    },
    getUserName(item) {
      if (!item) return '-';
      return item.nickname || item.userNickname || item.email || item.userId || item.user_id || item.uid || '-';
    },
    getUserSubText(item) {
      if (!item) return '';
      const id = item.userId || item.user_id || item.uid || '';
      if (item.email && item.email !== this.getUserName(item)) return item.email;
      return id && id !== this.getUserName(item) ? id : '';
    },
    goBack() {
      uni.navigateBack();
    }
  }
};
</script>

<style scoped>
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.detail-title {
  display: block;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.detail-subtitle {
  display: block;
  margin-top: 6px;
  font-size: 13px;
  color: #909399;
}

.loading-panel,
.error-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 220px;
  padding: 32px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  color: #909399;
}

.error-text {
  color: #f56c6c;
}

.detail-grid {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 16px;
}

.detail-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

.meta-card {
  align-self: start;
  padding: 16px;
}

.meta-item + .meta-item {
  margin-top: 14px;
}

.meta-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: #909399;
}

.meta-value {
  display: block;
  font-size: 14px;
  line-height: 1.5;
  color: #303133;
  word-break: break-all;
}

.content-card {
  padding: 18px;
}

.block-title {
  margin-top: 18px;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #606266;
}

.block-title:first-child {
  margin-top: 0;
}

.content-text {
  line-height: 1.7;
  color: #303133;
  word-break: break-word;
}

.question-text {
  font-weight: 600;
}

.pre-text {
  white-space: pre-wrap;
}

.textarea {
  width: 100%;
  min-height: 220px;
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  line-height: 1.6;
}

.save-button {
  width: 100%;
  margin-top: 12px;
}

@media screen and (max-width: 960px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
