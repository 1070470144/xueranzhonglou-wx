<template>
  <view class="page">
    <view class="toolbar">
      <input v-model="keyword" class="search" placeholder="搜索题干" confirm-type="search" @confirm="reload" />
      <button class="add-btn" @tap="openForm()">新增</button>
    </view>

    <view class="filters">
      <view class="chip" :class="{ active: filterLevel === 0 }" @tap="setLevel(0)">全部</view>
      <view class="chip" :class="{ active: filterLevel === 1 }" @tap="setLevel(1)">1星</view>
      <view class="chip" :class="{ active: filterLevel === 2 }" @tap="setLevel(2)">2星</view>
    </view>

    <view v-if="showForm" class="panel">
      <view class="panel-title">{{ form.id ? '编辑题目' : '新增题目' }}</view>
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
          <image :src="image" class="picked-image" mode="aspectFill" />
          <view class="remove-image" @tap="removeImage(index)">x</view>
        </view>
        <view v-if="form.images.length < 3" class="add-image" @tap="chooseImages">+</view>
      </view>

      <view v-if="form.type === 'choice'" class="options">
        <view v-for="(option, index) in form.options" :key="option.key" class="option-row">
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
        <button class="ghost-btn" @tap="closeForm">取消</button>
        <button class="primary-btn" :loading="saving" @tap="saveQuestion">保存</button>
      </view>
    </view>

    <view v-if="items.length" class="list">
      <view v-for="item in items" :key="item.id" class="card">
        <view class="card-head">
          <view class="tags"><text>{{ item.level }}星</text><text>{{ item.type === 'judge' ? '判断' : '选择' }}</text></view>
          <view class="answer">答案：{{ formatAnswer(item) }}</view>
        </view>
        <view class="title">{{ item.title }}</view>
        <view v-if="item.images && item.images.length" class="thumbs">
          <image v-for="image in item.images" :key="image" :src="image" mode="aspectFill" />
        </view>
        <view class="actions">
          <button class="ghost-btn" @tap="openForm(item)">编辑</button>
          <button class="danger-btn" @tap="confirmDelete(item)">删除</button>
        </view>
      </view>
    </view>
    <view v-else-if="!loading" class="empty">暂无题目</view>
    <view class="footer">{{ loading ? '加载中...' : (noMore ? '没有更多了' : '') }}</view>
  </view>
</template>

<script>
import { getExamQuestions, saveExamQuestion, deleteExamQuestion } from '@/utils/examApi.js';

const defaultOptions = () => ['A', 'B', 'C', 'D'].map(key => ({ key, text: '' }));

export default {
  data() {
    return {
      keyword: '',
      filterLevel: 0,
      items: [],
      page: 1,
      pageSize: 10,
      loading: false,
      noMore: false,
      showForm: false,
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
  onLoad() {
    this.load({ page: 1 });
  },
  onPullDownRefresh() {
    this.reload();
  },
  onReachBottom() {
    if (!this.loading && !this.noMore) this.load({ page: this.page + 1, append: true });
  },
  methods: {
    emptyForm() {
      return { id: '', level: 1, type: 'choice', title: '', images: [], options: defaultOptions(), answer: 'A', explanation: '' };
    },
    setLevel(level) {
      this.filterLevel = level;
      this.reload();
    },
    reload() {
      this.noMore = false;
      this.load({ page: 1 });
    },
    async load({ page = 1, append = false } = {}) {
      if (this.loading) return;
      this.loading = true;
      const result = await getExamQuestions({ page, pageSize: this.pageSize, keyword: this.keyword, level: this.filterLevel || undefined });
      if (result.success) {
        const data = result.data || {};
        const list = data.list || [];
        this.items = append ? this.items.concat(list) : list;
        this.page = page;
        this.noMore = data.total ? page * this.pageSize >= data.total : list.length < this.pageSize;
      } else {
        uni.showToast({ title: result.message || '加载失败', icon: 'none' });
      }
      this.loading = false;
      uni.stopPullDownRefresh();
    },
    openForm(item) {
      this.form = item ? {
        id: item.id,
        level: item.level,
        type: item.type,
        title: item.title,
        images: (item.images || []).slice(),
        options: item.type === 'judge' ? defaultOptions() : (item.options || defaultOptions()).map(option => ({ ...option })),
        answer: item.answer || (item.type === 'judge' ? 'true' : 'A'),
        explanation: item.explanation || ''
      } : this.emptyForm();
      this.showForm = true;
    },
    closeForm() {
      this.showForm = false;
      this.form = this.emptyForm();
    },
    onTypeChange(e) {
      const type = this.typeOptions[e.detail.value].value;
      this.form.type = type;
      this.form.answer = type === 'judge' ? 'true' : 'A';
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
    async saveQuestion() {
      if (this.saving) return;
      this.saving = true;
      const result = await saveExamQuestion(this.form);
      this.saving = false;
      uni.showToast({ title: result.message || (result.success ? '保存成功' : '保存失败'), icon: result.success ? 'success' : 'none' });
      if (result.success) {
        this.closeForm();
        this.reload();
      }
    },
    confirmDelete(item) {
      uni.showModal({
        title: '删除题目',
        content: '确定删除这道题吗？',
        confirmText: '删除',
        confirmColor: '#b42318',
        success: async res => {
          if (!res.confirm) return;
          const result = await deleteExamQuestion(item.id);
          uni.showToast({ title: result.message || '已删除', icon: result.success ? 'success' : 'none' });
          if (result.success) this.reload();
        }
      });
    },
    formatAnswer(item) {
      if (item.type === 'judge') return item.answer === 'true' ? '正确' : '错误';
      return item.answer;
    }
  }
};
</script>

<style scoped>
.page { min-height: 100vh; padding: 20rpx; box-sizing: border-box; background: #f8f8f8; color: #2f261f; }
.toolbar { display: flex; gap: 14rpx; margin-bottom: 18rpx; }
.search { flex: 1; height: 78rpx; padding: 0 22rpx; border-radius: 12rpx; background: #fff; border: 1rpx solid #ebe6df; box-sizing: border-box; }
button { margin: 0; }
button::after { border: 0; }
.add-btn, .primary-btn { color: #fff; background: #007aff; border-radius: 12rpx; font-size: 28rpx; }
.add-btn { width: 132rpx; height: 78rpx; line-height: 78rpx; }
.filters { display: flex; gap: 12rpx; margin-bottom: 18rpx; }
.filters.compact { margin-top: 14rpx; }
.chip { padding: 14rpx 24rpx; border-radius: 12rpx; background: #fff; border: 1rpx solid #ebe6df; color: #6f6258; font-size: 26rpx; }
.chip.active { color: #007aff; background: #eef6ff; border-color: #007aff; }
.panel, .card { padding: 22rpx; margin-bottom: 18rpx; border: 1rpx solid #ebe6df; border-radius: 16rpx; background: #fff; }
.panel-title { margin-bottom: 16rpx; font-size: 32rpx; font-weight: 700; }
.row.two { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12rpx; margin-bottom: 14rpx; }
.picker { height: 74rpx; line-height: 74rpx; padding: 0 20rpx; border-radius: 12rpx; background: #faf9f7; border: 1rpx solid #ebe6df; font-size: 26rpx; }
.picker.answer { margin-top: 14rpx; }
.textarea { width: 100%; min-height: 160rpx; padding: 18rpx; border-radius: 12rpx; background: #fafafa; border: 1rpx solid #ebe6df; box-sizing: border-box; font-size: 26rpx; }
.textarea.small { min-height: 110rpx; margin-top: 14rpx; }
.image-grid { display: flex; flex-wrap: wrap; gap: 14rpx; margin: 14rpx 0; }
.image-item, .add-image { position: relative; width: 136rpx; height: 136rpx; border-radius: 12rpx; overflow: hidden; }
.picked-image { width: 100%; height: 100%; }
.remove-image { position: absolute; right: 8rpx; top: 8rpx; width: 34rpx; height: 34rpx; line-height: 32rpx; text-align: center; border-radius: 50%; color: #fff; background: rgba(0,0,0,.55); }
.add-image { display: flex; align-items: center; justify-content: center; border: 2rpx dashed #d8d1c9; color: #8c8178; font-size: 44rpx; background: #faf9f7; }
.option-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.option-key { width: 52rpx; height: 52rpx; line-height: 52rpx; text-align: center; border-radius: 50%; background: #eef6ff; color: #007aff; font-weight: 700; }
.option-input { flex: 1; height: 68rpx; padding: 0 18rpx; border-radius: 12rpx; background: #fafafa; border: 1rpx solid #ebe6df; }
.form-actions, .actions { display: flex; gap: 12rpx; margin-top: 18rpx; }
.ghost-btn, .danger-btn, .primary-btn { flex: 1; height: 72rpx; line-height: 72rpx; font-size: 26rpx; border-radius: 12rpx; }
.ghost-btn { color: #4b4038; background: #f5f2ee; }
.danger-btn { color: #b42318; background: #fff0ed; }
.card-head { display: flex; justify-content: space-between; gap: 12rpx; margin-bottom: 12rpx; }
.tags { display: flex; gap: 8rpx; }
.tags text { padding: 6rpx 12rpx; border-radius: 8rpx; background: #f5f2ee; color: #6f6258; font-size: 22rpx; }
.answer { color: #0f766e; font-size: 24rpx; }
.title { font-size: 30rpx; line-height: 1.45; font-weight: 600; }
.thumbs { display: flex; gap: 10rpx; margin-top: 14rpx; }
.thumbs image { width: 96rpx; height: 96rpx; border-radius: 10rpx; }
.empty, .footer { padding: 40rpx 0; text-align: center; color: #8c8178; font-size: 26rpx; }
</style>
