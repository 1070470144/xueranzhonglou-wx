<template>
  <view class="page">
    <view class="header">
      <view class="title">AI 配置</view>
      <view class="subtitle">配置后优先使用你的模型；关闭或留空时使用管理端默认模型。</view>
    </view>

    <view class="card">
      <view class="row switch-row">
        <view>
          <view class="label-main">启用个人配置</view>
          <view class="hint">开启后问题会使用这里的 API 参数。</view>
        </view>
        <switch :checked="form.enabled" color="#2f261f" @change="form.enabled = $event.detail.value" />
      </view>

      <view class="field">
        <text class="label">服务商</text>
        <picker :range="providers" range-key="label" :value="providerIndex" @change="onProviderChange">
          <view class="input picker">{{ providers[providerIndex].label }}</view>
        </picker>
      </view>

      <view class="field">
        <text class="label">Base URL</text>
        <input v-model="form.baseUrl" class="input" :placeholder="currentProvider.baseUrl" />
      </view>

      <view class="field">
        <text class="label">模型</text>
        <input v-model="form.model" class="input" :placeholder="currentProvider.model" />
      </view>

      <view class="field">
        <text class="label">API Key</text>
        <input v-model="form.apiKey" class="input" password :placeholder="currentProvider.keyPlaceholder" />
      </view>

      <button class="save-btn" :disabled="saving" @click="saveConfig">{{ saving ? '保存中...' : '保存配置' }}</button>
    </view>

    <view class="tip">API Key 会存入云数据库，请只配置你愿意在本应用中使用的密钥。</view>
  </view>
</template>

<script>
import { requireLogin } from '@/utils/auth.js';
import { getUserAiConfig, saveUserAiConfig } from '@/utils/aiApi.js';

const AI_CONFIG_CACHE_TTL = 60 * 1000;
const aiConfigCache = {
  config: null,
  loadedAt: 0
};

export default {
  data() {
    return {
      providers: [
        {
          label: 'OpenAI 兼容',
          value: 'openai-compatible',
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-4o-mini',
          keyPlaceholder: 'sk-...'
        },
        {
          label: 'Claude Code 兼容',
          value: 'claude-code-compatible',
          baseUrl: 'https://api.anthropic.com/v1',
          model: 'claude-3-5-sonnet-latest',
          keyPlaceholder: 'sk-ant-...'
        },
        {
          label: 'DeepSeek',
          value: 'deepseek',
          baseUrl: 'https://api.deepseek.com/v1',
          model: 'deepseek-chat',
          keyPlaceholder: 'sk-...'
        }
      ],
      providerIndex: 0,
      form: {
        enabled: false,
        provider: 'openai-compatible',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        apiKey: ''
      },
      saving: false
    };
  },
  computed: {
    currentProvider() {
      return this.providers[this.providerIndex] || this.providers[0];
    }
  },
  async onLoad() {
    if (!requireLogin('/pages/ai-config/ai-config')) return;
    this.hydrateCache();
    if (!this.isCacheFresh()) await this.loadConfig();
  },
  onShow() {
    if (uni.getStorageSync('ai_config_dirty')) {
      uni.removeStorageSync('ai_config_dirty');
      aiConfigCache.loadedAt = 0;
      this.loadConfig();
      return;
    }
    if (!this.isCacheFresh()) {
      this.loadConfig();
    }
  },
  methods: {
    hydrateCache() {
      if (!aiConfigCache.config) return;
      this.applyConfig(aiConfigCache.config);
    },
    isCacheFresh() {
      return aiConfigCache.loadedAt && Date.now() - aiConfigCache.loadedAt < AI_CONFIG_CACHE_TTL;
    },
    applyConfig(config) {
      this.form = {
        ...this.form,
        ...config
      };
      const index = this.providers.findIndex(item => item.value === this.form.provider);
      this.providerIndex = index >= 0 ? index : 0;
    },
    saveCache(config) {
      aiConfigCache.config = { ...config };
      aiConfigCache.loadedAt = Date.now();
    },
    async loadConfig() {
      const res = await getUserAiConfig();
      if (res.success && res.data && res.data.config) {
        this.applyConfig(res.data.config);
        this.saveCache(this.form);
      }
    },
    onProviderChange(event) {
      this.providerIndex = Number(event.detail.value || 0);
      const provider = this.currentProvider;
      this.form.provider = provider.value;
      this.form.baseUrl = provider.baseUrl;
      this.form.model = provider.model;
    },
    async saveConfig() {
      if (this.form.enabled && (!this.form.baseUrl || !this.form.model || !this.form.apiKey)) {
        uni.showToast({ title: '启用时请填写完整配置', icon: 'none' });
        return;
      }
      this.saving = true;
      try {
        const res = await saveUserAiConfig(this.form);
        if (res.success) this.saveCache(this.form);
        uni.showToast({ title: res.success ? '已保存' : (res.message || '保存失败'), icon: res.success ? 'success' : 'none' });
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style scoped>
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 64rpx 44rpx 60rpx;
  background: #ffffff;
  color: #1f2329;
}

.header {
  padding: 0 0 42rpx;
  border-bottom: 1rpx solid #edf0f2;
}

.title {
  color: #1f2329;
  font-size: 42rpx;
  line-height: 1.28;
  font-weight: 800;
}

.subtitle {
  margin-top: 14rpx;
  color: #646a73;
  font-size: 27rpx;
  line-height: 1.5;
}

.card {
  box-sizing: border-box;
  width: 100%;
  padding-top: 34rpx;
  background: #ffffff;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.switch-row {
  padding-bottom: 22rpx;
  border-bottom: 1rpx solid #edf0f2;
}

.label-main {
  color: #1f2329;
  font-size: 30rpx;
  font-weight: 600;
}

.hint {
  margin-top: 6rpx;
  color: #8f959e;
  font-size: 24rpx;
}

.field {
  margin-top: 24rpx;
}

.label {
  display: block;
  margin-bottom: 10rpx;
  color: #646a73;
  font-size: 24rpx;
}

.input {
  box-sizing: border-box;
  width: 100%;
  height: 82rpx;
  padding: 0 20rpx;
  border-radius: 10rpx;
  border: 1rpx solid #dfe2e6;
  background: #ffffff;
  color: #1f2329;
  font-size: 27rpx;
}

.picker {
  line-height: 82rpx;
}

.save-btn {
  margin-top: 30rpx;
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 10rpx;
  background: #20b15a;
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
}

.tip {
  margin-top: 22rpx;
  color: #8f959e;
  font-size: 24rpx;
  line-height: 1.5;
}
</style>
