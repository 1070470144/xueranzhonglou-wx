<template>
  <view class="page">
    <view v-if="record" class="summary panel">
      <view class="score">{{ record.score }}/{{ record.totalScore }}</view>
      <view class="meta">{{ record.level }}星 · {{ record.questionCount }}题 · 正确 {{ record.correctCount }} · 错误 {{ record.wrongCount }}</view>
      <view class="time">{{ formatTime(record.createTime) }} · 用时 {{ formatDuration(record.durationSeconds) }}</view>
    </view>

    <view v-if="record && record.answers && record.answers.length" class="list">
      <view v-for="(item, index) in record.answers" :key="item.questionId || index" class="panel answer-card">
        <view class="answer-head">
          <view class="badge">{{ index + 1 }} · {{ item.type === 'judge' ? '判断题' : '选择题' }}</view>
          <view class="state" :class="{ ok: item.isCorrect }">{{ item.isCorrect ? '正确' : '错误' }}</view>
        </view>
        <view class="title">{{ item.title }}</view>
        <view v-if="item.images && item.images.length" class="images">
          <image v-for="image in item.images" :key="image" :src="image" mode="aspectFill" @tap="previewImage(image, item.images)" />
        </view>
        <view v-if="item.options && item.options.length" class="options">
          <view v-for="option in item.options" :key="option.key" class="option" :class="{ correct: option.key === item.correctAnswer, selected: option.key === item.userAnswer }">
            <text class="option-key">{{ option.key === 'true' ? '对' : option.key === 'false' ? '错' : option.displayKey || option.key }}</text>
            <text>{{ option.text }}</text>
          </view>
        </view>
        <view class="answer-line">我的答案：{{ formatAnswer(item.userAnswer, item) || '未作答' }}</view>
        <view class="answer-line correct-text">正确答案：{{ formatAnswer(item.correctAnswer, item) }}</view>
        <view v-if="item.explanation" class="explain">{{ item.explanation }}</view>
      </view>
    </view>

    <view v-else-if="!loading" class="empty">记录不存在</view>
    <view v-if="loading" class="empty">加载中...</view>
  </view>
</template>

<script>
import { getExamRecord } from '@/utils/examApi.js';

export default {
  data() {
    return { id: '', record: null, loading: false };
  },
  onLoad(options) {
    this.id = options.id || '';
    this.load();
  },
  methods: {
    async load() {
      if (!this.id) return;
      this.loading = true;
      const result = await getExamRecord(this.id);
      this.loading = false;
      if (!result.success) {
        uni.showToast({ title: result.message || '加载失败', icon: 'none' });
        return;
      }
      this.record = result.data.record || null;
    },
    previewImage(current, urls) {
      uni.previewImage({ current, urls: urls || [] });
    },
    formatAnswer(answer, item) {
      if (!answer) return '';
      if (item.type === 'judge') return answer === 'true' ? '正确' : '错误';
      const option = (item.options || []).find(option => option.key === answer);
      return option ? `${option.displayKey || answer} ${option.text}` : answer;
    },
    formatDuration(seconds) {
      const value = Number(seconds) || 0;
      const m = Math.floor(value / 60);
      const s = value % 60;
      return `${m}分${s}秒`;
    },
    formatTime(value) {
      if (!value) return '';
      const date = new Date(value);
      const pad = n => String(n).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
  }
};
</script>

<style scoped>
.page { min-height: 100vh; padding: 64rpx 44rpx 56rpx; box-sizing: border-box; background: #ffffff; color: #1f2329; }
.panel { padding: 28rpx 0; border-bottom: 1rpx solid #edf0f2; background: #ffffff; }
.score { font-size: 48rpx; font-weight: 800; color: #1f8f4d; }
.meta { margin-top: 8rpx; color: #646a73; font-size: 26rpx; }
.time { margin-top: 8rpx; color: #8f959e; font-size: 24rpx; }
.answer-head { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; margin-bottom: 14rpx; }
.badge { padding: 8rpx 14rpx; border-radius: 8rpx; color: #1f8f4d; background: #f0f9f4; font-size: 24rpx; }
.state { padding: 8rpx 14rpx; border-radius: 10rpx; color: #b42318; background: #fff0ed; font-size: 24rpx; }
.state.ok { color: #1f8f4d; background: #f0f9f4; }
.title { font-size: 30rpx; line-height: 1.5; font-weight: 700; }
.images { display: flex; gap: 12rpx; margin-top: 14rpx; }
.images image { width: 128rpx; height: 128rpx; border-radius: 10rpx; }
.options { display: flex; flex-direction: column; gap: 12rpx; margin-top: 18rpx; }
.option { display: flex; align-items: center; gap: 12rpx; padding: 16rpx; border-radius: 10rpx; border: 1rpx solid #dfe2e6; background: #ffffff; font-size: 26rpx; }
.option.selected { border-color: #f59e0b; background: #fff7ed; }
.option.correct { border-color: #d9f0e3; background: #f0f9f4; }
.option-key { width: 44rpx; height: 44rpx; line-height: 44rpx; text-align: center; border-radius: 50%; background: #f0f9f4; color: #1f8f4d; font-weight: 700; }
.answer-line { margin-top: 14rpx; color: #646a73; font-size: 26rpx; line-height: 1.45; }
.correct-text { color: #1f8f4d; }
.explain { margin-top: 14rpx; padding: 16rpx; border-radius: 10rpx; background: #f5f6f7; color: #646a73; font-size: 26rpx; line-height: 1.5; }
.empty { padding: 60rpx 0; text-align: center; color: #8f959e; }
</style>
