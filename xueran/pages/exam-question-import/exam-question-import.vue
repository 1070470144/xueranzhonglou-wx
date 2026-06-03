<template>
  <view class="page">
    <view class="panel">
      <textarea v-model="importText" class="textarea" placeholder="粘贴题目 JSON 数组" maxlength="20000" />
      <view class="hint">格式示例：[ { "level": 1, "type": "choice", "title": "题干", "options": [{ "key": "A", "text": "选项" }], "answer": "A", "explanation": "解析" } ]</view>

      <view v-if="importResult" class="result">已导入 {{ importResult.imported }} 条，失败 {{ importResult.failed.length }} 条</view>
      <view v-if="importResult && importResult.failed.length" class="failed-list">
        <view v-for="item in importResult.failed" :key="item.index">第 {{ item.index }} 条：{{ item.message }}</view>
      </view>

      <view class="form-actions">
        <button class="ghost-btn" @tap="goBack">取消</button>
        <button class="primary-btn" :loading="importing" @tap="doImport">导入</button>
      </view>
    </view>
  </view>
</template>

<script>
import { importExamQuestions } from '@/utils/examApi.js';

export default {
  data() {
    return {
      importing: false,
      importText: '',
      importResult: null
    };
  },
  methods: {
    async doImport() {
      if (this.importing) return;
      let questions = [];
      try {
        questions = JSON.parse(this.importText || '');
      } catch (e) {
        uni.showToast({ title: 'JSON 格式错误', icon: 'none' });
        return;
      }
      if (!Array.isArray(questions) || !questions.length) {
        uni.showToast({ title: '请提供题目 JSON 数组', icon: 'none' });
        return;
      }
      this.importing = true;
      const result = await importExamQuestions(questions);
      this.importing = false;
      uni.showToast({ title: result.message || '导入完成', icon: result.success ? 'success' : 'none' });
      if (!result.success) return;
      this.importResult = { imported: result.data.imported || 0, failed: result.data.failed || [] };
      if (!this.importResult.failed.length) {
        setTimeout(() => this.goBack(), 600);
      }
    },
    goBack() {
      uni.navigateBack();
    }
  }
};
</script>

<style scoped>
.page { min-height: 100vh; padding: 20rpx; box-sizing: border-box; background: #f8f8f8; color: #2f261f; }
.panel { padding: 22rpx; border: 1rpx solid #ebe6df; border-radius: 16rpx; background: #fff; }
.textarea { width: 100%; min-height: 360rpx; padding: 18rpx; border-radius: 12rpx; background: #fafafa; border: 1rpx solid #ebe6df; box-sizing: border-box; font-size: 26rpx; }
.hint { margin-top: 14rpx; color: #8c8178; font-size: 24rpx; line-height: 1.5; }
.result { margin-top: 16rpx; color: #0f766e; font-size: 28rpx; }
.failed-list { margin-top: 12rpx; color: #b42318; font-size: 24rpx; line-height: 1.6; }
.form-actions { display: flex; gap: 12rpx; margin-top: 22rpx; }
.ghost-btn, .primary-btn { flex: 1; height: 72rpx; line-height: 72rpx; font-size: 26rpx; border-radius: 12rpx; }
.ghost-btn { color: #4b4038; background: #f5f2ee; }
.primary-btn { color: #fff; background: #007aff; }
button { margin: 0; }
button::after { border: 0; }
</style>
