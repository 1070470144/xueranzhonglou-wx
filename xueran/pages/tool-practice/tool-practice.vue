<template>
  <view class="page">
    <view class="mode-list" v-if="!started">
      <view class="mode-card" @tap="start({ level: 1 })"><text>1星做题</text><text>随机打乱一星题库</text></view>
      <view class="mode-card" @tap="start({ level: 2 })"><text>2星做题</text><text>随机打乱二星题库</text></view>
      <view class="mode-card" @tap="start({ favoriteOnly: true })"><text>收藏题</text><text>练习已收藏题目</text></view>
    </view>

    <view v-else>
      <view class="topbar">
        <view>{{ title }}</view>
      </view>
      <view v-if="questions.length" class="progress">{{ currentIndex + 1 }} / {{ questions.length }}</view>
      <view v-if="current" class="question-card">
        <view class="question-head">
          <view class="badge">{{ current.level }}星 · {{ current.type === 'judge' ? '判断题' : '选择题' }}</view>
          <view class="fav" :class="{ active: current.isFavorite }" @tap="toggleFavorite(current)">{{ current.isFavorite ? '★' : '☆' }}</view>
        </view>
        <view class="question-title">{{ current.title }}</view>
        <view v-if="current.images && current.images.length" class="images">
          <image
            v-for="image in current.images"
            :key="image"
            :src="image"
            mode="aspectFill"
            @tap="previewImage(image, current.images)"
          />
        </view>
        <view class="answers">
          <view
            v-for="option in current.options"
            :key="option.key"
            class="answer-item"
            :class="{ selected: selectedAnswer === option.key }"
            @tap="selectedAnswer = option.key"
          >
            <text class="answer-key">{{ option.key === 'true' ? '对' : option.key === 'false' ? '错' : option.displayKey || option.key }}</text>
            <text>{{ option.text }}</text>
          </view>
        </view>
        <view v-if="checked" class="result" :class="{ ok: resultCorrect }">
          <view>{{ resultCorrect ? '回答正确' : '回答错误' }}</view>
          <view class="result-line">正确答案：{{ formatAnswer(checkResult.correctAnswer, current) }}</view>
          <view v-if="checkResult.explanation" class="result-explain">{{ checkResult.explanation }}</view>
        </view>
        <view class="actions">
          <button class="ghost-btn" :disabled="currentIndex === 0" @tap="prev">上一题</button>
          <button class="primary-btn" v-if="!checked" :loading="checking" @tap="checkAnswer">确认</button>
          <button class="primary-btn" v-else @tap="next">{{ currentIndex >= questions.length - 1 ? '完成' : '下一题' }}</button>
        </view>
      </view>
      <view v-else-if="!loading" class="empty">暂无题目，请先到我的里配置题库</view>
      <view v-if="loading" class="empty">加载中...</view>
    </view>
  </view>
</template>

<script>
import { getPracticeQuestions, checkPracticeAnswer, toggleExamQuestionFavorite } from '@/utils/examApi.js';

export default {
  data() {
    return {
      started: false,
      loading: false,
      title: '',
      questions: [],
      currentIndex: 0,
      selectedAnswer: '',
      checked: false,
      checking: false,
      resultCorrect: false,
      checkResult: {}
    };
  },
  computed: {
    current() {
      return this.questions[this.currentIndex] || null;
    }
  },
  methods: {
    async start(mode) {
      this.started = true;
      this.loading = true;
      this.title = mode.favoriteOnly ? '收藏题' : `${mode.level}星做题`;
      const result = await getPracticeQuestions({ ...mode, limit: 50 });
      this.loading = false;
      if (!result.success) {
        uni.showToast({ title: result.message || '加载失败', icon: 'none' });
        return;
      }
      this.questions = result.data.list || [];
      this.currentIndex = 0;
      this.selectedAnswer = '';
      this.checked = false;
      this.checkResult = {};
    },
    reset() {
      this.started = false;
      this.questions = [];
      this.selectedAnswer = '';
      this.checked = false;
      this.checkResult = {};
    },
    previewImage(current, urls) {
      uni.previewImage({
        current,
        urls: urls || []
      });
    },
    async toggleFavorite(question) {
      const result = await toggleExamQuestionFavorite(question.id);
      if (result.success) question.isFavorite = result.data.isFavorite;
      uni.showToast({ title: result.message || '操作完成', icon: result.success ? 'success' : 'none' });
    },
    async checkAnswer() {
      if (this.checking) return;
      if (!this.selectedAnswer) {
        uni.showToast({ title: '请选择答案', icon: 'none' });
        return;
      }
      this.checking = true;
      const result = await checkPracticeAnswer({ questionId: this.current.id, answer: this.selectedAnswer });
      this.checking = false;
      if (!result.success) {
        uni.showToast({ title: result.message || '判题失败', icon: 'none' });
        return;
      }
      this.checkResult = result.data || {};
      this.resultCorrect = !!this.checkResult.isCorrect;
      this.checked = true;
    },
    formatAnswer(answer, question) {
      if (!question) return answer || '';
      if (question.type === 'judge') return answer === 'true' ? '正确' : '错误';
      const option = (question.options || []).find(item => item.key === answer);
      return option ? `${option.displayKey || answer} ${option.text}` : answer || '';
    },
    prev() {
      if (this.currentIndex <= 0) return;
      this.currentIndex -= 1;
      this.selectedAnswer = '';
      this.checked = false;
      this.checkResult = {};
    },
    next() {
      if (this.currentIndex >= this.questions.length - 1) {
        this.reset();
        return;
      }
      this.currentIndex += 1;
      this.selectedAnswer = '';
      this.checked = false;
      this.checkResult = {};
    }
  }
};
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; box-sizing: border-box; background: #f8f8f8; color: #2f261f; }
.mode-list { display: flex; flex-direction: column; gap: 18rpx; }
.mode-card { display: flex; flex-direction: column; gap: 8rpx; padding: 28rpx; border-radius: 16rpx; border: 1rpx solid #ebe6df; background: #fff; }
.mode-card text:first-child { font-size: 32rpx; font-weight: 700; }
.mode-card text:last-child { font-size: 24rpx; color: #8c8178; }
.topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18rpx; font-size: 32rpx; font-weight: 700; }
button { margin: 0; }
button::after { border: 0; }
.small-btn { height: 64rpx; line-height: 64rpx; padding: 0 24rpx; border-radius: 12rpx; background: #f5f2ee; color: #4b4038; font-size: 26rpx; }
.progress { margin-bottom: 14rpx; color: #8c8178; font-size: 26rpx; }
.question-card { padding: 24rpx; border-radius: 16rpx; border: 1rpx solid #ebe6df; background: #fff; }
.question-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.badge { padding: 8rpx 14rpx; border-radius: 10rpx; color: #007aff; background: #eef6ff; font-size: 24rpx; }
.fav { font-size: 44rpx; color: #b8aea5; }
.fav.active { color: #f59e0b; }
.question-title { font-size: 32rpx; line-height: 1.5; font-weight: 700; }
.images { display: flex; gap: 12rpx; margin-top: 16rpx; }
.images image { width: 150rpx; height: 150rpx; border-radius: 12rpx; }
.answers { display: flex; flex-direction: column; gap: 14rpx; margin-top: 24rpx; }
.answer-item { display: flex; align-items: center; gap: 14rpx; padding: 20rpx; border-radius: 12rpx; border: 1rpx solid #ebe6df; background: #fafafa; font-size: 28rpx; }
.answer-item.selected { border-color: #007aff; background: #eef6ff; }
.answer-key { width: 48rpx; height: 48rpx; line-height: 48rpx; text-align: center; border-radius: 50%; background: #fff; color: #007aff; font-weight: 700; }
.result { margin-top: 18rpx; padding: 16rpx; border-radius: 12rpx; background: #fff0ed; color: #b42318; text-align: center; }
.result.ok { background: #ecfdf3; color: #0f766e; }
.result-line { margin-top: 10rpx; font-size: 26rpx; }
.result-explain { margin-top: 10rpx; color: #4b4038; font-size: 26rpx; line-height: 1.5; text-align: left; }
.actions { display: flex; gap: 12rpx; margin-top: 24rpx; }
.ghost-btn, .primary-btn { flex: 1; height: 78rpx; line-height: 78rpx; border-radius: 12rpx; font-size: 28rpx; }
.ghost-btn { background: #f5f2ee; color: #4b4038; }
.primary-btn { background: #007aff; color: #fff; }
.empty { padding: 60rpx 0; text-align: center; color: #8c8178; }
</style>
