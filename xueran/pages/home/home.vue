<template>
  <view class="page">
    <view class="hero">
      <view>
        <text class="eyebrow">AI 助手</text>
        <view class="title">询问血染钟楼</view>
        <view class="subtitle">基于已收录的百科知识回答，也可以指定一个板子进行分析。</view>
      </view>
    </view>

    <view v-if="!loggedIn" class="notice">
      <text>登录后可以提问并保存历史记录。</text>
      <button class="notice-btn" @click="goLogin">去登录</button>
    </view>

    <view v-else-if="availabilityLoaded && !available" class="notice danger">
      <text>{{ availabilityMessage }}</text>
      <button class="notice-btn" @click="goConfig">配置 AI</button>
    </view>

    <view class="panel">
      <view class="field-label">提问范围</view>
      <picker :range="scriptOptions" range-key="title" :value="scriptIndex" @change="onScriptChange">
        <view class="picker-value">
          <view>
            <text class="picker-title">{{ selectedScriptTitle }}</text>
            <text class="picker-desc">{{ selectedScriptDesc }}</text>
          </view>
          <text class="picker-arrow">›</text>
        </view>
      </picker>

      <view class="field-label question-label">你的问题</view>
      <textarea
        v-model="question"
        class="question-input"
        maxlength="1000"
        placeholder="例如：这个板子适合新手吗？洗衣妇第一晚应该怎么判断信息？"
        auto-height
      />

      <button class="ask-btn" :disabled="asking || !canAsk" @click="submitQuestion">
        {{ asking ? '回答中...' : '发送问题' }}
      </button>
    </view>

    <view v-if="answer" class="answer-card">
      <view class="answer-head">
        <text class="answer-title">回答</text>
        <text class="answer-source">{{ answerSource }}</text>
      </view>
      <text class="answer-text">{{ answer }}</text>
      <view v-if="analysis" class="analysis-box">
        <text class="analysis-label">简短分析</text>
        <text class="analysis-text">{{ analysis }}</text>
      </view>
      <view v-if="references.length" class="refs">
        <text class="refs-title">参考知识</text>
        <view v-for="item in references" :key="item.id || item.title" class="ref-item">
          {{ item.title }}
        </view>
      </view>
    </view>

  </view>
</template>

<script>
import { isLoggedIn } from '@/utils/auth.js';
import { askAi, getAiAvailability, getAiScripts } from '@/utils/aiApi.js';

export default {
  data() {
    return {
      loggedIn: false,
      availabilityLoaded: false,
      available: false,
      availabilityMessage: 'AI 暂不可用',
      scripts: [],
      scriptIndex: 0,
      question: '',
      asking: false,
      answer: '',
      analysis: '',
      answerSource: '',
      references: []
    };
  },
  computed: {
    scriptOptions() {
      return [{ id: '', title: '通用血染问题', description: '不限定具体板子' }].concat(this.scripts);
    },
    selectedScript() {
      return this.scriptOptions[this.scriptIndex] || this.scriptOptions[0];
    },
    selectedScriptTitle() {
      return this.selectedScript.title;
    },
    selectedScriptDesc() {
      return this.selectedScript.description || '围绕该范围回答';
    },
    canAsk() {
      return this.loggedIn && this.available && this.question.trim().length > 0;
    }
  },
  async onShow() {
    this.loggedIn = isLoggedIn();
    await Promise.all([this.loadAvailability(), this.loadScripts()]);
  },
  methods: {
    async loadAvailability() {
      this.availabilityLoaded = false;
      try {
        const res = await getAiAvailability();
        this.available = !!(res.success && res.data && res.data.available);
        this.availabilityMessage = (res.data && res.data.message) || res.message || 'AI 暂不可用';
      } catch (error) {
        this.available = false;
        this.availabilityMessage = 'AI 服务连接失败';
      } finally {
        this.availabilityLoaded = true;
      }
    },
    async loadScripts() {
      const res = await getAiScripts({ page: 1, pageSize: 80 });
      if (res.success && res.data) {
        this.scripts = (res.data.list || []).map(item => ({
          id: item._id || item.id,
          title: item.title || '未命名板子',
          description: item.description || item.author || ''
        }));
      }
    },
    onScriptChange(event) {
      this.scriptIndex = Number(event.detail.value || 0);
    },
    async submitQuestion() {
      if (!this.loggedIn) {
        this.goLogin();
        return;
      }
      if (!this.canAsk || this.asking) return;
      this.asking = true;
      this.answer = '';
      this.analysis = '';
      this.references = [];
      try {
        const selected = this.selectedScript;
        const res = await askAi({
          question: this.question.trim(),
          scriptId: selected && selected.id ? selected.id : ''
        });
        if (!res.success) {
          uni.showToast({ title: res.message || '提问失败', icon: 'none' });
          return;
        }
        const data = res.data || {};
        this.answer = data.answer || '';
        this.analysis = data.analysis || '';
        this.references = data.references || [];
        this.answerSource = data.configSource === 'user' ? '使用个人配置' : '使用默认配置';
      } catch (error) {
        uni.showToast({ title: '提问失败，请稍后重试', icon: 'none' });
      } finally {
        this.asking = false;
      }
    },
    goLogin() {
      uni.navigateTo({ url: '/pages/login/login' });
    },
    goConfig() {
      uni.navigateTo({ url: '/pages/ai-config/ai-config' });
    }
  }
};
</script>

<style scoped>
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 28rpx 24rpx 56rpx;
  background: #f6f2ec;
  color: #241f1a;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
  padding: 28rpx 0 22rpx;
}

.eyebrow {
  font-size: 24rpx;
  color: #8a6d4a;
}

.title {
  margin-top: 8rpx;
  font-size: 46rpx;
  font-weight: 700;
  line-height: 1.18;
}

.subtitle {
  margin-top: 12rpx;
  max-width: 560rpx;
  color: #74685b;
  font-size: 26rpx;
  line-height: 1.55;
}

.notice-btn {
  margin: 0;
  padding: 0 22rpx;
  height: 60rpx;
  line-height: 60rpx;
  border-radius: 30rpx;
  border: 1rpx solid #d8cbbd;
  background: #fffaf4;
  color: #4a3624;
  font-size: 24rpx;
}

.notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  margin: 10rpx 0 22rpx;
  padding: 20rpx;
  border-radius: 18rpx;
  background: #fffaf4;
  border: 1rpx solid #eadfce;
  color: #6f5b44;
  font-size: 25rpx;
}

.notice.danger {
  background: #fff4f2;
  border-color: #f1c4ba;
  color: #a13a2e;
}

.panel,
.answer-card {
  box-sizing: border-box;
  width: 100%;
  border: 1rpx solid #e5d8c8;
  border-radius: 22rpx;
  background: #fffaf4;
  box-shadow: 0 12rpx 36rpx rgba(72, 45, 22, 0.08);
}

.panel {
  padding: 24rpx;
}

.field-label {
  color: #7d6b58;
  font-size: 24rpx;
  margin-bottom: 12rpx;
}

.question-label {
  margin-top: 24rpx;
}

.picker-value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  min-height: 92rpx;
  padding: 18rpx 20rpx;
  border-radius: 16rpx;
  background: #f4eadf;
}

.picker-title,
.picker-desc {
  display: block;
}

.picker-title {
  color: #2d241d;
  font-size: 29rpx;
  font-weight: 600;
}

.picker-desc {
  margin-top: 6rpx;
  color: #8a7a68;
  font-size: 23rpx;
  line-height: 1.35;
}

.picker-arrow {
  color: #8b765e;
  font-size: 44rpx;
}

.question-input {
  box-sizing: border-box;
  width: 100%;
  min-height: 190rpx;
  padding: 20rpx;
  border-radius: 16rpx;
  border: 1rpx solid #e2d2bf;
  background: #fffdf9;
  color: #241f1a;
  font-size: 28rpx;
  line-height: 1.55;
}

.ask-btn {
  margin-top: 24rpx;
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  background: #2f261f;
  color: #fffaf4;
  font-size: 30rpx;
  font-weight: 600;
}

.ask-btn[disabled] {
  background: #b8aa9c;
  color: #fffaf4;
}

.answer-card {
  margin-top: 24rpx;
  padding: 26rpx;
}

.answer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.answer-title {
  font-size: 32rpx;
  font-weight: 700;
}

.answer-source {
  color: #8a7a68;
  font-size: 22rpx;
}

.answer-text,
.analysis-text {
  display: block;
  margin-top: 18rpx;
  color: #342b23;
  font-size: 28rpx;
  line-height: 1.65;
  white-space: pre-wrap;
}

.analysis-box {
  margin-top: 22rpx;
  padding: 18rpx;
  border-radius: 16rpx;
  background: #f4eadf;
}

.analysis-label,
.refs-title {
  display: block;
  color: #7a6043;
  font-size: 23rpx;
  font-weight: 600;
}

.refs {
  margin-top: 20rpx;
}

.ref-item {
  margin-top: 10rpx;
  color: #6d604f;
  font-size: 24rpx;
}

</style>
