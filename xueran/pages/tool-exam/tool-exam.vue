<template>
  <view class="page">
    <view v-if="!examStarted" class="setup panel">
      <view class="title">模拟考</view>
      <view class="field-label">星级</view>
      <view class="segments">
        <view class="segment" :class="{ active: level === 1 }" @tap="level = 1">1星</view>
        <view class="segment" :class="{ active: level === 2 }" @tap="level = 2">2星</view>
      </view>
      <view class="field-label">题目数量</view>
      <input v-model.number="questionCount" class="input" type="number" />
      <view class="field-label">每题分数</view>
      <input v-model.number="scorePerQuestion" class="input" type="number" />
      <view class="hint">考试时间固定 1 小时，交卷后自动记录成绩。</view>
      <button class="primary-btn" :loading="loading" @tap="startExam">开始考试</button>
    </view>

    <view v-else>
      <view class="exam-head">
        <view>{{ currentIndex + 1 }} / {{ questions.length }}</view>
        <view class="timer">{{ timeText }}</view>
      </view>
      <view v-if="current" class="panel">
        <view class="badge">{{ current.level }}星 · {{ current.type === 'judge' ? '判断题' : '选择题' }}</view>
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
            :class="{ selected: answers[current.id] === option.key }"
            @tap="setAnswer(option.key)"
          >
            <text class="answer-key">{{ option.key === 'true' ? '对' : option.key === 'false' ? '错' : option.displayKey || option.key }}</text>
            <text>{{ option.text }}</text>
          </view>
        </view>
        <view class="actions">
          <button class="ghost-btn" :disabled="currentIndex === 0" @tap="currentIndex--">上一题</button>
          <button class="ghost-btn" v-if="currentIndex < questions.length - 1" @tap="currentIndex++">下一题</button>
          <button class="primary-btn" v-else :loading="submitting" :disabled="submitting" @tap="confirmSubmit">{{ submitting ? '交卷中' : '交卷' }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { createExam, submitExam } from '@/utils/examApi.js';

export default {
  data() {
    return {
      level: 1,
      questionCount: 10,
      scorePerQuestion: 10,
      loading: false,
      examStarted: false,
      questions: [],
      currentIndex: 0,
      answers: {},
      remainingSeconds: 3600,
      startedAt: 0,
      timer: null,
      submitting: false
    };
  },
  computed: {
    current() {
      return this.questions[this.currentIndex] || null;
    },
    timeText() {
      const m = Math.floor(this.remainingSeconds / 60).toString().padStart(2, '0');
      const s = (this.remainingSeconds % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    }
  },
  onUnload() {
    this.clearTimer();
  },
  methods: {
    async startExam() {
      if (this.loading) return;
      this.loading = true;
      const result = await createExam({ level: this.level, questionCount: this.questionCount, scorePerQuestion: this.scorePerQuestion });
      this.loading = false;
      if (!result.success) {
        uni.showToast({ title: result.message || '创建考试失败', icon: 'none' });
        return;
      }
      const data = result.data || {};
      this.questions = data.questions || [];
      this.scorePerQuestion = data.scorePerQuestion || this.scorePerQuestion;
      this.remainingSeconds = data.durationSeconds || 3600;
      this.startedAt = Date.now();
      this.answers = {};
      this.currentIndex = 0;
      this.examStarted = true;
      this.startTimer();
    },
    startTimer() {
      this.clearTimer();
      this.timer = setInterval(() => {
        this.remainingSeconds -= 1;
        if (this.remainingSeconds <= 0) {
          this.remainingSeconds = 0;
          this.clearTimer();
          this.doSubmit();
        }
      }, 1000);
    },
    clearTimer() {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
    },
    setAnswer(answer) {
      this.$set ? this.$set(this.answers, this.current.id, answer) : (this.answers[this.current.id] = answer);
    },
    previewImage(current, urls) {
      uni.previewImage({ current, urls: urls || [] });
    },
    confirmSubmit() {
      if (this.submitting) return;
      const unanswered = this.questions.filter(item => !this.answers[item.id]).length;
      const content = unanswered > 0
        ? `还有 ${unanswered} 道题未作答，确定提交本次考试吗？`
        : '确定提交本次考试吗？';
      uni.showModal({ title: '交卷', content, success: res => { if (res.confirm) this.doSubmit(); } });
    },
    async doSubmit() {
      if (this.submitting) return;
      this.submitting = true;
      this.clearTimer();
      const durationSeconds = Math.floor((Date.now() - this.startedAt) / 1000);
      const payload = this.questions.map(item => ({
        questionId: item.id,
        answer: this.answers[item.id] || '',
        options: item.options || []
      }));
      uni.showLoading({ title: '交卷中' });
      const result = await submitExam({ level: this.level, scorePerQuestion: this.scorePerQuestion, durationSeconds, answers: payload });
      uni.hideLoading();
      if (!result.success) {
        this.submitting = false;
        if (this.examStarted && this.remainingSeconds > 0) this.startTimer();
        uni.showToast({ title: result.message || '交卷失败', icon: 'none' });
        return;
      }
      const record = result.data.record || {};
      uni.showModal({
        title: '考试完成',
        content: `得分 ${record.score}/${record.totalScore}，正确 ${record.correctCount} 题`,
        showCancel: false,
        success: () => {
          this.examStarted = false;
          this.questions = [];
          this.submitting = false;
        }
      });
    }
  }
};
</script>

<style scoped>
.page { min-height: 100vh; padding: 64rpx 44rpx 56rpx; box-sizing: border-box; background: #ffffff; color: #1f2329; }
.panel { background: #ffffff; }
.title { padding-bottom: 42rpx; margin-bottom: 34rpx; border-bottom: 1rpx solid #edf0f2; color: #1f2329; font-size: 42rpx; line-height: 1.28; font-weight: 800; }
.field-label { margin: 22rpx 0 12rpx; color: #646a73; font-size: 26rpx; font-weight: 600; }
.segments { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12rpx; }
.segment { height: 72rpx; line-height: 72rpx; text-align: center; border-radius: 10rpx; border: 1rpx solid #dfe2e6; background: #ffffff; color: #646a73; }
.segment.active { color: #1f8f4d; border-color: #d9f0e3; background: #f0f9f4; font-weight: 700; }
.input { height: 76rpx; padding: 0 20rpx; border-radius: 10rpx; border: 1rpx solid #dfe2e6; background: #ffffff; color: #1f2329; box-sizing: border-box; }
.hint { margin: 20rpx 0; color: #8f959e; font-size: 24rpx; }
button { margin: 0; }
button::after { border: 0; }
.primary-btn, .ghost-btn { height: 78rpx; line-height: 78rpx; border-radius: 10rpx; font-size: 28rpx; }
.primary-btn { flex: 1; color: #ffffff; background: #20b15a; }
.ghost-btn { flex: 1; color: #1f2329; background: #ffffff; border: 1rpx solid #dfe2e6; }
.exam-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18rpx; font-size: 30rpx; font-weight: 700; }
.timer { color: #b42318; }
.badge { display: inline-block; margin-bottom: 16rpx; padding: 8rpx 14rpx; border-radius: 8rpx; color: #1f8f4d; background: #f0f9f4; font-size: 24rpx; }
.question-title { font-size: 32rpx; line-height: 1.5; font-weight: 700; }
.images { display: flex; gap: 12rpx; margin-top: 16rpx; }
.images image { width: 150rpx; height: 150rpx; border-radius: 10rpx; }
.answers { display: flex; flex-direction: column; gap: 14rpx; margin-top: 24rpx; }
.answer-item { display: flex; align-items: center; gap: 14rpx; padding: 20rpx; border-radius: 10rpx; border: 1rpx solid #dfe2e6; background: #ffffff; font-size: 28rpx; }
.answer-item.selected { border-color: #d9f0e3; background: #f0f9f4; }
.answer-key { width: 48rpx; height: 48rpx; line-height: 48rpx; text-align: center; border-radius: 50%; background: #f0f9f4; color: #1f8f4d; font-weight: 700; }
.actions { display: flex; gap: 12rpx; margin-top: 24rpx; }
</style>
