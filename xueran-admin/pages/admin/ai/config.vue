<template>
  <view class="fix-top-window">
    <view class="uni-header">
      <uni-stat-breadcrumb />
      <view class="uni-group">
        <button class="uni-button" type="primary" size="mini" :disabled="saving" @click="save">保存</button>
      </view>
    </view>

    <view class="uni-container">
      <view class="form-card">
        <view class="form-title">默认 AI 配置</view>
        <view class="form-desc">开启后，未配置个人 AI 的用户会使用这套默认配置。</view>

        <view class="form-row">
          <text class="label">全局开启</text>
          <switch :checked="form.enabled" @change="form.enabled = $event.detail.value" />
        </view>
        <view class="form-row">
          <text class="label">服务商</text>
          <input class="input" v-model="form.provider" placeholder="openai-compatible" />
        </view>
        <view class="form-row">
          <text class="label">Base URL</text>
          <input class="input" v-model="form.baseUrl" placeholder="https://api.openai.com/v1" />
        </view>
        <view class="form-row">
          <text class="label">模型</text>
          <input class="input" v-model="form.model" placeholder="gpt-4o-mini" />
        </view>
        <view class="form-row">
          <text class="label">API Key</text>
          <input class="input" v-model="form.apiKey" password placeholder="留空则不覆盖原密钥" />
        </view>
        <view class="form-row">
          <text class="label">温度</text>
          <input class="input" type="number" v-model="form.temperature" placeholder="0.2" />
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getDefaultConfig, saveDefaultConfig } from '@/utils/aiAdminApi.js';

export default {
  data() {
    return {
      saving: false,
      form: {
        enabled: false,
        provider: 'openai-compatible',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        apiKey: '',
        temperature: 0.2
      }
    };
  },
  async onLoad() {
    const res = await getDefaultConfig();
    if (res.success && res.data && res.data.config) {
      this.form = { ...this.form, ...res.data.config };
    }
  },
  methods: {
    async save() {
      this.saving = true;
      try {
        const res = await saveDefaultConfig(this.form);
        uni.showToast({ title: res.success ? '已保存' : (res.message || '保存失败'), icon: res.success ? 'success' : 'none' });
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style scoped>
.form-card {
  max-width: 720px;
  padding: 24px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}
.form-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}
.form-desc {
  margin-top: 8px;
  margin-bottom: 20px;
  color: #909399;
  font-size: 13px;
}
.form-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.label {
  width: 90px;
  color: #606266;
  font-size: 14px;
}
.input {
  flex: 1;
  height: 36px;
  padding: 0 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  box-sizing: border-box;
}
</style>

