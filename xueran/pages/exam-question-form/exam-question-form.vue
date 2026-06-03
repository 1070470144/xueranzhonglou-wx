<template>
  <view class="page">
    <view class="panel">
      <view class="row two">
        <picker :range="levelOptions" range-key="label" :value="form.level - 1" @change="form.level = Number(levelOptions[$event.detail.value].value)">
          <view class="picker">{{ form.level }}星</view>
        </picker>
        <picker :range="typeOptions" range-key="label" :value="form.type === 'judge' ? 1 : 0" @change="onTypeChange">
          <view class="picker">{{ form.type === 'judge' ? '判断题' : '选择题' }}</view>
        </picker>
      </view>

      <textarea v-model="form.title" class="textarea" placeholder="输入题干" maxlength="1000" />

      <view class="image-grid">
        <view v-for="(image, index) in form.images" :key="image" class="image-item">
          <image :src="image" class="picked-image" mode="aspectFill" @tap="previewImage(image, form.images)" />
          <view class="remove-image" @tap.stop="removeImage(index)">x</view>
        </view>
        <view v-if="form.images.length < 3" class="add-image" @tap="chooseImages">+</view>
      </view>

      <view v-if="form.type === 'choice'" class="options">
        <view v-for="option in form.options" :key="option.key" class="option-row">
          <text class="option-key">{{ option.key }}</text>
          <input v-model="option.text" class="option-input" :placeholder="'选项 ' + option.key" />
        </view>
      </view>

      <picker v-if="form.type === 'choice'" :range="answerOptions" :value="answerIndex" @change="form.answer = answerOptions[$event.detail.value]">
        <view class="picker answer">答案：{{ form.answer || '请选择' }}</view>
      </picker>
      <view v-else class="filters compact">
        <view class="chip" :class="{ active: form.answer === 'true' }" @tap="form.answer = 'true'">正确</view>
        <view class="chip" :class="{ active: form.answer === 'false' }" @tap="form.answer = 'false'">错误</view>
      </view>

      <textarea v-model="form.explanation" class="textarea small" placeholder="解析，可选" maxlength="1000" />

      <view class="form-actions">
        <button class="ghost-btn" @tap="goBack">取消</button>
        <button class="primary-btn" :loading="saving || loading" @tap="saveQuestion">保存</button>
      </view>
    </view>
  </view>
</template>

<script>
import { getExamQuestion, saveExamQuestion } from '@/utils/examApi.js';

const defaultOptions = () => ['A', 'B', 'C', 'D'].map(key => ({ key, text: '' }));

export default {
  data() {
    return {
      id: '',
      loading: false,
      saving: false,
      levelOptions: [{ label: '1星', value: 1 }, { label: '2星', value: 2 }],
      typeOptions: [{ label: '选择题', value: 'choice' }, { label: '判断题', value: 'judge' }],
      form: this.emptyForm()
    };
  },
  computed: {
    answerOptions() {
      return this.form.options.map(item => item.key);
    },
    answerIndex() {
      return Math.max(0, this.answerOptions.indexOf(this.form.answer));
    }
  },
  onLoad(options) {
    this.id = options.id || '';
    if (this.id) {
      uni.setNavigationBarTitle({ title: '编辑题目' });
      this.loadQuestion();
    } else {
      uni.setNavigationBarTitle({ title: '新增题目' });
    }
  },
  methods: {
    emptyForm() {
      return { id: '', level: 1, type: 'choice', title: '', images: [], options: defaultOptions(), answer: 'A', explanation: '' };
    },
    async loadQuestion() {
      this.loading = true;
      const result = await getExamQuestion(this.id);
      this.loading = false;
      if (!result.success) {
        uni.showToast({ title: result.message || '加载失败', icon: 'none' });
        return;
      }
      const item = result.data.item || {};
      this.form = {
        id: item.id,
        level: item.level || 1,
        type: item.type || 'choice',
        title: item.title || '',
        images: (item.images || []).slice(),
        options: item.type === 'judge' ? defaultOptions() : (item.options || defaultOptions()).map(option => ({ ...option })),
        answer: item.answer || (item.type === 'judge' ? 'true' : 'A'),
        explanation: item.explanation || ''
      };
    },
    onTypeChange(e) {
      const type = this.typeOptions[e.detail.value].value;
      this.form.type = type;
      this.form.answer = type === 'judge' ? 'true' : 'A';
      if (type === 'choice' && !this.form.options.length) this.form.options = defaultOptions();
    },
    chooseImages() {
      uni.chooseImage({
        count: 3 - this.form.images.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async res => {
          uni.showLoading({ title: '上传中' });
          try {
            for (const file of res.tempFilePaths || []) {
              const suffix = (file.match(/\.[a-zA-Z0-9]+$/) || ['.jpg'])[0];
              const cloudPath = `exam-question/${Date.now()}-${Math.random().toString(36).slice(2)}${suffix}`;
              const uploaded = await uniCloud.uploadFile({ filePath: file, cloudPath });
              const url = uploaded.fileID || uploaded.fileId || uploaded.url;
              if (url) this.form.images.push(url);
            }
          } finally {
            uni.hideLoading();
          }
        }
      });
    },
    removeImage(index) {
      this.form.images.splice(index, 1);
    },
    previewImage(current, urls) {
      uni.previewImage({ current, urls: urls || [] });
    },
    async saveQuestion() {
      if (this.saving || this.loading) return;
      this.saving = true;
      const result = await saveExamQuestion(this.form);
      this.saving = false;
      uni.showToast({ title: result.message || (result.success ? '保存成功' : '保存失败'), icon: result.success ? 'success' : 'none' });
      if (result.success) {
        uni.setStorageSync('exam_questions_dirty', 1);
        this.goBack();
      }
    },
    goBack() {
      uni.navigateBack();
    }
  }
};
</script>

<style scoped>
.page { min-height: 100vh; padding: 64rpx 44rpx 56rpx; box-sizing: border-box; background: #ffffff; color: #1f2329; }
.panel { background: #ffffff; }
.row.two { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12rpx; margin-bottom: 14rpx; }
.picker { height: 74rpx; line-height: 74rpx; padding: 0 20rpx; border-radius: 10rpx; background: #ffffff; border: 1rpx solid #dfe2e6; color: #1f2329; font-size: 26rpx; }
.picker.answer { margin-top: 14rpx; }
.textarea { width: 100%; min-height: 180rpx; padding: 18rpx; border-radius: 10rpx; background: #ffffff; border: 1rpx solid #dfe2e6; box-sizing: border-box; color: #1f2329; font-size: 26rpx; }
.textarea.small { min-height: 120rpx; margin-top: 14rpx; }
.image-grid { display: flex; flex-wrap: wrap; gap: 14rpx; margin: 14rpx 0; }
.image-item, .add-image { position: relative; width: 136rpx; height: 136rpx; border-radius: 10rpx; overflow: hidden; }
.picked-image { width: 100%; height: 100%; }
.remove-image { position: absolute; right: 8rpx; top: 8rpx; width: 34rpx; height: 34rpx; line-height: 32rpx; text-align: center; border-radius: 50%; color: #fff; background: rgba(0,0,0,.55); }
.add-image { display: flex; align-items: center; justify-content: center; border: 2rpx dashed #d9f0e3; color: #1f8f4d; font-size: 44rpx; background: #f0f9f4; }
.option-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.option-key { width: 52rpx; height: 52rpx; line-height: 52rpx; text-align: center; border-radius: 50%; background: #f0f9f4; color: #1f8f4d; font-weight: 700; }
.option-input { flex: 1; height: 68rpx; padding: 0 18rpx; border-radius: 10rpx; background: #ffffff; border: 1rpx solid #dfe2e6; color: #1f2329; }
.filters.compact { display: flex; gap: 12rpx; margin-top: 14rpx; }
.chip { padding: 14rpx 24rpx; border-radius: 10rpx; background: #ffffff; border: 1rpx solid #dfe2e6; color: #646a73; font-size: 26rpx; }
.chip.active { color: #1f8f4d; background: #f0f9f4; border-color: #d9f0e3; }
.form-actions { display: flex; gap: 12rpx; margin-top: 18rpx; }
.ghost-btn, .primary-btn { flex: 1; height: 72rpx; line-height: 72rpx; font-size: 26rpx; border-radius: 10rpx; }
.ghost-btn { color: #1f2329; background: #ffffff; border: 1rpx solid #dfe2e6; }
.primary-btn { color: #ffffff; background: #20b15a; }
button { margin: 0; }
button::after { border: 0; }
</style>
