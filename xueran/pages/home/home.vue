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

    <view class="search-panel">
      <view class="field-label">搜索剧本</view>
      <view class="script-search">
        <input
          v-model="scriptKeyword"
          class="script-input"
          placeholder="搜索展览里的剧本"
          confirm-type="search"
          @input="onScriptKeywordInput"
          @confirm="searchScripts"
          @focus="scriptFocused = true"
        />
        <button v-if="selectedScript.id" class="script-reset" @click="resetScript">清除</button>
      </view>
      <view v-if="selectedScript.id" class="selected-scope">
        <text class="selected-title">{{ selectedScript.title }}</text>
        <text class="selected-desc">{{ selectedScript.description || '围绕该范围回答' }}</text>
      </view>
      <view v-if="showScriptResults" class="script-results">
        <view
          v-for="item in scriptResults"
          :key="item.id"
          class="script-result"
          @click="selectScript(item)"
        >
          <text class="result-title">{{ item.title }}</text>
          <text class="result-desc">{{ item.description || item.author || '暂无简介' }}</text>
        </view>
        <view v-if="scriptSearching" class="result-empty">搜索中...</view>
        <view v-else-if="scriptKeyword.trim() && !scriptResults.length" class="result-empty">未找到匹配剧本</view>
      </view>
    </view>

    <view class="composer">
      <textarea
        v-model="question"
        class="composer-input"
        maxlength="1000"
        placeholder="你的问题"
        auto-height
      />
      <view class="composer-foot">
        <text v-if="selectedScript.id" class="composer-scope">{{ selectedScript.title }}</text>
        <text v-else class="composer-scope"></text>
        <button class="send-btn" :disabled="asking || !canAsk" @click="submitQuestion">
          {{ asking ? '...' : '↑' }}
        </button>
      </view>
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
      selectedScript: { id: '', title: '', description: '' },
      scriptKeyword: '',
      scriptResults: [],
      scriptSearching: false,
      scriptFocused: false,
      scriptSearchTimer: null,
      question: '',
      asking: false,
      answer: '',
      analysis: '',
      answerSource: '',
      references: []
    };
  },
  computed: {
    showScriptResults() {
      return this.scriptFocused && (this.scriptKeyword.trim().length > 0 || this.scriptSearching);
    },
    canAsk() {
      return this.loggedIn && this.available && this.question.trim().length > 0;
    }
  },
  async onShow() {
    this.loggedIn = isLoggedIn();
    await this.loadAvailability();
  },
  onUnload() {
    if (this.scriptSearchTimer) clearTimeout(this.scriptSearchTimer);
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
    onScriptKeywordInput() {
      if (this.scriptSearchTimer) clearTimeout(this.scriptSearchTimer);
      this.scriptSearchTimer = setTimeout(() => {
        this.searchScripts();
      }, 300);
    },
    async searchScripts() {
      const keyword = this.scriptKeyword.trim();
      if (!keyword) {
        this.scriptResults = [];
        this.scriptSearching = false;
        return;
      }
      this.scriptSearching = true;
      try {
        const res = await getAiScripts({ page: 1, pageSize: 8, q: keyword });
        if (res.success && res.data) {
          this.scriptResults = (res.data.list || []).map(item => ({
            id: item._id || item.id,
            title: item.title || '未命名剧本',
            author: item.author || '',
            description: item.description || item.author || ''
          }));
        } else {
          this.scriptResults = [];
        }
      } catch (error) {
        this.scriptResults = [];
      } finally {
        this.scriptSearching = false;
      }
    },
    selectScript(item) {
      this.selectedScript = item;
      this.scriptKeyword = '';
      this.scriptResults = [];
      this.scriptFocused = false;
    },
    resetScript() {
      this.selectedScript = { id: '', title: '', description: '' };
      this.scriptKeyword = '';
      this.scriptResults = [];
      this.scriptFocused = false;
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

.search-panel,
.composer,
.answer-card {
  box-sizing: border-box;
  width: 100%;
  border: 1rpx solid #e5d8c8;
  border-radius: 22rpx;
  background: #fffaf4;
  box-shadow: 0 12rpx 36rpx rgba(72, 45, 22, 0.08);
}

.search-panel {
  padding: 24rpx;
}

.composer {
  margin-top: 20rpx;
  padding: 20rpx;
  border-radius: 30rpx;
  background: #fffdf9;
}

.field-label {
  color: #7d6b58;
  font-size: 24rpx;
  margin-bottom: 12rpx;
}

.script-search {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.script-input {
  flex: 1;
  box-sizing: border-box;
  height: 76rpx;
  padding: 0 22rpx;
  border-radius: 18rpx;
  background: #f4eadf;
  color: #241f1a;
  font-size: 27rpx;
}

.script-reset {
  margin: 0;
  padding: 0 22rpx;
  height: 64rpx;
  line-height: 64rpx;
  border-radius: 32rpx;
  background: #2f261f;
  color: #fffaf4;
  font-size: 24rpx;
}

.selected-scope {
  margin-top: 18rpx;
  padding: 18rpx 20rpx;
  border-radius: 18rpx;
  background: #fffdf9;
  border: 1rpx solid #eadfce;
}

.selected-title,
.selected-desc,
.result-title,
.result-desc {
  display: block;
}

.selected-title,
.result-title {
  color: #2d241d;
  font-size: 29rpx;
  font-weight: 600;
}

.selected-desc,
.result-desc {
  margin-top: 6rpx;
  color: #8a7a68;
  font-size: 23rpx;
  line-height: 1.35;
}

.script-results {
  margin-top: 16rpx;
  border-radius: 18rpx;
  overflow: hidden;
  border: 1rpx solid #eadfce;
  background: #fffdf9;
}

.script-result {
  box-sizing: border-box;
  width: 100%;
  padding: 18rpx 20rpx;
  border-bottom: 1rpx solid #f0e6da;
}

.script-result:last-child {
  border-bottom: 0;
}

.result-empty {
  padding: 22rpx;
  color: #8a7a68;
  font-size: 25rpx;
  text-align: center;
}

.composer-input {
  box-sizing: border-box;
  width: 100%;
  min-height: 150rpx;
  padding: 6rpx 4rpx 18rpx;
  color: #241f1a;
  font-size: 28rpx;
  line-height: 1.55;
}

.composer-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.composer-scope {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #7d6b58;
  font-size: 24rpx;
}

.send-btn {
  flex: 0 0 68rpx;
  margin: 0;
  padding: 0;
  width: 68rpx;
  height: 68rpx;
  line-height: 68rpx;
  border-radius: 50%;
  background: #2f261f;
  color: #fffaf4;
  font-size: 34rpx;
  font-weight: 600;
}

.send-btn[disabled] {
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
