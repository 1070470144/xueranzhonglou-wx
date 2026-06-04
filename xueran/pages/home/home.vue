<template>
  <view class="page fade-in">
    <view class="hero slide-down">
      <view>
        <text class="eyebrow">AI 助手</text>
        <view class="title">询问血染钟楼</view>
        <view class="subtitle">基于已收录的百科知识回答，也可以指定一个板子进行分析。</view>
      </view>
      <button class="web-login-scan" @click="scanWebLogin">扫码</button>
    </view>

    <view v-if="announcements.length" class="announcement-bar slide-up" @click="goAnnouncements">
      <text class="announcement-label">公告</text>
      <view class="announcement-window">
        <view class="announcement-track" :class="{ rolling: announcements.length > 1 || announcementText.length > 18 }">
          <text class="announcement-text">{{ announcementText }}</text>
        </view>
      </view>
      <text class="announcement-arrow">›</text>
    </view>

    <view v-if="!loggedIn" class="notice slide-up">
      <text>登录后可以提问并保存历史记录。</text>
      <button class="notice-btn" @click="goLogin">去登录</button>
    </view>

    <view v-else-if="availabilityLoaded && !available" class="notice danger slide-up">
      <text>{{ availabilityMessage }}</text>
      <button class="notice-btn" @click="goConfig">配置 AI</button>
    </view>

    <view class="search-panel slide-up">
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

    <view class="composer slide-up">
      <textarea
        v-model="question"
        class="composer-input"
        maxlength="1000"
        placeholder="向血染钟楼提问..."
        auto-height
      />
      <view class="composer-foot">
        <text v-if="selectedScript.id" class="composer-scope">{{ selectedScript.title }}</text>
        <text v-else class="composer-scope"></text>
        <button class="send-btn" :disabled="asking || !canAsk" @click="submitQuestion">
          {{ asking ? '...' : '↑' }}
        </button>
      </view>
      <view v-if="asking" class="generating-status">
        <text class="generating-dot"></text>
        <text class="generating-text">{{ generatingText }}</text>
      </view>
    </view>

    <view v-if="answer" class="answer-card slide-up">
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
import { askAi, generateAiAnswer, getAiAvailability, getAiScripts, getQuestionRecord, listAnnouncements } from '@/utils/aiApi.js';

const HOME_CACHE_TTL = 60 * 1000;
const homeCache = {
  announcements: [],
  availability: null,
  loadedAt: 0
};

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
      references: [],
      activeRecordId: '',
      answerPollTimer: null,
      generatingTimer: null,
      generatingSeconds: 0,
      announcements: []
    };
  },
  computed: {
    announcementText() {
      return this.announcements.map(item => item.title).filter(Boolean).join('   ·   ');
    },
    showScriptResults() {
      return this.scriptFocused && (this.scriptKeyword.trim().length > 0 || this.scriptSearching);
    },
    canAsk() {
      return this.loggedIn && this.available && this.question.trim().length > 0;
    },
    generatingText() {
      return this.getGeneratingText();
    }
  },
  onShow() {
    this.loggedIn = isLoggedIn();
    this.hydrateHomeCache();
    this.refreshHomeData();
  },
  onUnload() {
    if (this.scriptSearchTimer) clearTimeout(this.scriptSearchTimer);
    this.stopAnswerPolling();
    this.stopGeneratingTimer();
  },
  methods: {
    hydrateHomeCache() {
      if (homeCache.announcements.length) {
        this.announcements = homeCache.announcements;
      }
      if (homeCache.availability) {
        this.available = homeCache.availability.available;
        this.availabilityMessage = homeCache.availability.message;
        this.availabilityLoaded = true;
      }
    },
    refreshHomeData() {
      const hasRequiredCache = !this.loggedIn || !!homeCache.availability;
      const cacheFresh = hasRequiredCache && Date.now() - homeCache.loadedAt < HOME_CACHE_TTL;
      if (cacheFresh) return;

      const tasks = [this.loadAnnouncements()];
      if (this.loggedIn) {
        tasks.push(this.loadAvailability());
      }
      Promise.all(tasks).finally(() => {
        homeCache.loadedAt = Date.now();
      });
    },
    async loadAnnouncements() {
      try {
        const res = await listAnnouncements({ limit: 5 });
        if (res.success && res.data) {
          this.announcements = res.data.list || [];
          homeCache.announcements = this.announcements;
        }
      } catch (error) {
        if (!this.announcements.length) this.announcements = [];
      }
    },
    async loadAvailability() {
      if (!homeCache.availability) this.availabilityLoaded = false;
      try {
        const res = await getAiAvailability();
        this.available = !!(res.success && res.data && res.data.available);
        this.availabilityMessage = (res.data && res.data.message) || res.message || 'AI 暂不可用';
        homeCache.availability = {
          available: this.available,
          message: this.availabilityMessage
        };
      } catch (error) {
        if (!homeCache.availability) {
          this.available = false;
          this.availabilityMessage = 'AI 服务连接失败';
        }
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
      const submittedQuestion = this.question.trim();
      this.asking = true;
      this.answer = '';
      this.analysis = '';
      this.references = [];
      this.startGeneratingTimer();
      uni.hideLoading();
      if (typeof wx !== 'undefined') wx.hideLoading();
      try {
        const selected = this.selectedScript;
        const res = await askAi({
          question: submittedQuestion,
          scriptId: selected && selected.id ? selected.id : ''
        });
        if (!res.success) {
          console.error('askAi result failed:', res);
          this.answer = '';
          this.analysis = '';
          this.references = [];
          uni.showToast({ title: res.message || '提问失败，请重试', icon: 'none' });
          return;
        }
        const data = res.data || {};
        this.activeRecordId = data.recordId || '';
        this.answer = data.answer || '';
        this.analysis = data.analysis || '';
        this.references = data.references || [];
        this.answerSource = data.configSource === 'user' ? '使用个人配置' : '使用默认配置';
        if (data.answer || data.status === 'success') {
          this.finishAsking(true);
        } else if (this.activeRecordId) {
          const answerRes = await generateAiAnswer(this.activeRecordId);
          if (!answerRes.success) {
            console.error('generateAiAnswer result failed:', answerRes);
            this.answer = answerRes.message || 'AI 生成失败，请稍后重试';
            this.finishAsking();
            return;
          }
          const answerData = answerRes.data || {};
          const record = answerData.record || answerData;
          if (record.status === 'success' || record.answer) {
            this.answer = record.answer || '';
            this.analysis = record.analysis || '';
            this.references = record.references || [];
            this.answerSource = record.configSource === 'user' ? '使用个人配置' : '使用默认配置';
            this.finishAsking(true);
          } else if (record.status === 'failed') {
            this.answer = record.errorMessage || answerRes.message || 'AI 生成失败，请稍后重试';
            this.analysis = '';
            this.references = [];
            this.finishAsking();
          } else {
            this.startAnswerPolling(this.activeRecordId);
          }
        }
      } catch (error) {
        this.answer = '';
        this.analysis = '';
        this.references = [];
        uni.showToast({ title: '提问失败，请稍后重试', icon: 'none' });
        this.stopGeneratingTimer();
      } finally {
        if (!this.answerPollTimer) {
          this.finishAsking();
        }
      }
    },
    finishAsking(clearQuestion = false) {
      this.asking = false;
      this.stopGeneratingTimer();
      if (clearQuestion) this.question = '';
    },
    getGeneratingText() {
      return `AI 正在生成中 ${this.generatingSeconds}s`;
    },
    startGeneratingTimer() {
      this.stopGeneratingTimer();
      this.generatingSeconds = 0;
      this.answer = '';
      this.generatingTimer = setInterval(() => {
        this.generatingSeconds += 1;
      }, 1000);
    },
    stopGeneratingTimer() {
      if (this.generatingTimer) {
        clearInterval(this.generatingTimer);
        this.generatingTimer = null;
      }
    },
    startAnswerPolling(recordId) {
      this.stopAnswerPolling();
      let times = 0;
      this.answerPollTimer = setInterval(() => {
        times += 1;
        this.loadAnswerRecord(recordId);
        if (times >= 30) {
          this.stopAnswerPolling();
          this.answer = 'AI 仍在生成中，请稍后在历史记录查看';
          this.finishAsking();
        }
      }, 1500);
    },
    stopAnswerPolling() {
      if (this.answerPollTimer) {
        clearInterval(this.answerPollTimer);
        this.answerPollTimer = null;
      }
    },
    async loadAnswerRecord(recordId) {
      if (!recordId) return;
      const res = await getQuestionRecord(recordId);
      if (!res.success || !res.data || !res.data.record) return;
      const record = res.data.record;
      if (record.status === 'success' || record.answer) {
        this.answer = record.answer || '';
        this.analysis = record.analysis || '';
        this.references = record.references || [];
        this.answerSource = record.configSource === 'user' ? '使用个人配置' : '使用默认配置';
        this.stopAnswerPolling();
        this.finishAsking();
        this.question = '';
        return;
      }
      if (record.status === 'failed') {
        this.answer = record.errorMessage || 'AI 生成失败，请稍后重试';
        this.analysis = '';
        this.references = [];
        this.stopAnswerPolling();
        this.finishAsking();
      }
    },
    goLogin() {
      uni.navigateTo({ url: '/pages/login/login' });
    },
    goConfig() {
      uni.navigateTo({ url: '/pages/ai-config/ai-config' });
    },
    goAnnouncements() {
      uni.navigateTo({ url: '/pages/announcements/announcements' });
    },
    scanWebLogin() {
      uni.scanCode({
        onlyFromCamera: false,
        success: (res) => {
          const ticket = this.extractWebLoginTicket(res.result || '');
          if (!ticket) {
            uni.showToast({ title: '无效网页登录码', icon: 'none' });
            return;
          }
          uni.navigateTo({
            url: `/pages/web-login-confirm/web-login-confirm?ticket=${encodeURIComponent(ticket)}`
          });
        },
        fail: () => {
          uni.showToast({ title: '扫码已取消', icon: 'none' });
        }
      });
    },
    extractWebLoginTicket(value) {
      const text = String(value || '').trim();
      if (!text) return '';
      const match = text.match(/^xueran:\/\/web-login\?ticket=([^&]+)/);
      if (match) return decodeURIComponent(match[1]);
      try {
        const data = JSON.parse(text);
        return data && data.type === 'xueran-web-login' ? String(data.ticket || '') : '';
      } catch (error) {
        return '';
      }
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

@keyframes slideUp {
  0% {
    opacity: 0;
    transform: translateY(30rpx);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  opacity: 0;
  animation: fadeIn 0.6s ease-out forwards;
}

.slide-down {
  opacity: 0;
  animation: slideDown 0.5s ease-out 0.1s forwards;
}

.slide-up {
  opacity: 0;
  animation: slideUp 0.5s ease-out forwards;
}

.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 64rpx 44rpx 56rpx;
  background: #ffffff;
  color: #1f2329;
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20rpx;
  margin-bottom: 28rpx;
  padding: 0 0 42rpx;
  border-bottom: 1rpx solid #edf0f2;
  background: #fff;
}

.web-login-scan {
  flex: 0 0 auto;
  margin: 0;
  padding: 0 22rpx;
  height: 58rpx;
  line-height: 58rpx;
  border-radius: 29rpx;
  background: #1f2329;
  color: #fff;
  font-size: 24rpx;
}

.eyebrow {
  font-size: 24rpx;
  color: #1f8f4d;
  font-weight: 600;
}

.title {
  margin-top: 8rpx;
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.18;
  color: #1f2329;
}

.subtitle {
  margin-top: 12rpx;
  max-width: 560rpx;
  color: #646a73;
  font-size: 26rpx;
  line-height: 1.55;
}

.notice-btn {
  margin: 0;
  padding: 0 22rpx;
  height: 60rpx;
  line-height: 60rpx;
  border-radius: 10rpx;
  background: #20b15a;
  color: #fff;
  font-size: 24rpx;
}

.notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  margin-bottom: 20rpx;
  padding: 20rpx 24rpx;
  border-radius: 10rpx;
  background: #fff;
  color: #646a73;
  font-size: 25rpx;
  border: 1rpx solid #edf0f2;
}

.notice.danger {
  background: #fff7f5;
  color: #a13a2e;
}

.announcement-bar {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 20rpx;
  padding: 18rpx 22rpx;
  border: 1rpx solid #edf0f2;
  border-radius: 10rpx;
  background: #ffffff;
}

.announcement-label {
  flex: 0 0 auto;
  padding: 4rpx 10rpx;
  border-radius: 8rpx;
  background: #f0f9f4;
  color: #1f8f4d;
  font-size: 22rpx;
  font-weight: 700;
}

.announcement-window {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}

.announcement-track {
  display: inline-block;
  min-width: 100%;
}

.announcement-track.rolling {
  animation: announcementRoll 12s linear infinite;
}

.announcement-text {
  color: #646a73;
  font-size: 25rpx;
  line-height: 1.4;
}

.announcement-arrow {
  flex: 0 0 auto;
  color: #c9cdd4;
  font-size: 36rpx;
  line-height: 1;
}

@keyframes announcementRoll {
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}

.search-panel,
.composer,
.answer-card {
  box-sizing: border-box;
  width: 100%;
  border-radius: 10rpx;
  background: #fff;
}

.search-panel {
  padding: 0;
  margin-top: 8rpx;
  margin-bottom: 24rpx;
}

.composer {
  margin-top: 24rpx;
  padding: 18rpx;
  border: 2rpx solid #dfe2e6;
  border-radius: 28rpx;
  background: #ffffff;
}

.field-label {
  color: #1f2329;
  font-size: 24rpx;
  font-weight: 700;
  margin-bottom: 14rpx;
  padding-left: 2rpx;
}

.script-search {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-height: 88rpx;
  padding: 0 12rpx 0 22rpx;
  border: 1rpx solid #dfe2e6;
  border-radius: 16rpx;
  background: #ffffff;
}

.script-input {
  flex: 1;
  box-sizing: border-box;
  height: 88rpx;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #1f2329;
  font-size: 27rpx;
}

.script-reset {
  margin: 0;
  padding: 0 20rpx;
  height: 56rpx;
  line-height: 56rpx;
  border-radius: 28rpx;
  background: #f0f9f4;
  color: #1f8f4d;
  font-size: 24rpx;
}

.selected-scope {
  margin-top: 18rpx;
  padding: 18rpx 20rpx;
  border-radius: 10rpx;
  background: #f0f9f4;
  border-left: 6rpx solid #20b15a;
}

.selected-title,
.selected-desc,
.result-title,
.result-desc {
  display: block;
}

.selected-title,
.result-title {
  color: #1f2329;
  font-size: 29rpx;
  font-weight: 600;
}

.selected-desc,
.result-desc {
  margin-top: 6rpx;
  color: #646a73;
  font-size: 23rpx;
  line-height: 1.35;
}

.script-results {
  margin-top: 16rpx;
  border-radius: 16rpx;
  overflow: hidden;
  border: 1rpx solid #edf0f2;
  background: #fff;
}

.script-result {
  box-sizing: border-box;
  width: 100%;
  padding: 18rpx 20rpx;
  border-bottom: 1rpx solid #edf0f2;
}

.script-result:last-child {
  border-bottom: 0;
}

.result-empty {
  padding: 22rpx;
  color: #8f959e;
  font-size: 25rpx;
  text-align: center;
}

.composer-input {
  box-sizing: border-box;
  width: 100%;
  min-height: 172rpx;
  padding: 18rpx 20rpx 10rpx;
  border: 0;
  border-radius: 20rpx;
  background: transparent;
  color: #1f2329;
  font-size: 28rpx;
  line-height: 1.6;
}

.composer-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  margin-top: 8rpx;
  padding: 8rpx 8rpx 4rpx 18rpx;
  border-top: 1rpx solid #edf0f2;
}

.generating-status {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 14rpx;
  color: #646a73;
  font-size: 24rpx;
}

.generating-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #20b15a;
  animation: pulse 1s ease-in-out infinite;
}

.generating-text {
  line-height: 1.4;
}

@keyframes pulse {
  0%, 100% { opacity: 0.35; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1); }
}

.composer-scope {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #8f959e;
  font-size: 24rpx;
}

.send-btn {
  flex: 0 0 64rpx;
  margin: 0;
  padding: 0;
  width: 64rpx;
  height: 64rpx;
  line-height: 64rpx;
  border-radius: 50%;
  background: #1f2329;
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
}

.send-btn[disabled] {
  background: #d9dde2;
  color: #fff;
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
  color: #1f2329;
}

.answer-source {
  color: #8f959e;
  font-size: 22rpx;
}

.answer-text,
.analysis-text {
  display: block;
  margin-top: 18rpx;
  color: #1f2329;
  font-size: 28rpx;
  line-height: 1.65;
  white-space: pre-wrap;
}

.analysis-box {
  margin-top: 22rpx;
  padding: 18rpx;
  border-radius: 10rpx;
  background: #f5f6f7;
}

.analysis-label,
.refs-title {
  display: block;
  color: #1f8f4d;
  font-size: 23rpx;
  font-weight: 600;
}

.refs {
  margin-top: 20rpx;
}

.ref-item {
  margin-top: 10rpx;
  color: #646a73;
  font-size: 24rpx;
}

</style>
