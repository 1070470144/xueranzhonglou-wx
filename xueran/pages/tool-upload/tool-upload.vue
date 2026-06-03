<template>
  <scroll-view class="page" scroll-y>
    <view class="section">
      <view class="section-head">
        <text class="section-title">上传剧本</text>
        <text class="section-subtitle">提交后需要管理员审核，通过后展示到展览列表</text>
      </view>

      <view class="field">
        <text class="field-label">封面图片</text>
        <view class="image-grid">
          <view v-for="(image, index) in selectedImages" :key="image.tempFilePath || image.path" class="image-item">
            <image :src="image.tempFilePath || image.path" class="picked-image" mode="aspectFill" />
            <view class="remove-image" @tap.stop="removeImage(index)">x</view>
          </view>
          <view v-if="selectedImages.length < 3" class="add-image" @tap="chooseImages">
            <text class="add-mark">+</text>
            <text class="add-text">图片</text>
          </view>
        </view>
      </view>

      <view class="field">
        <text class="field-label">JSON 文件</text>
        <button class="plain-btn" @tap="chooseJsonFile">选择 JSON 文件</button>
        <view v-if="jsonFileName" class="file-status" :class="jsonFileStatus">
          <text class="file-name">{{ jsonFileName }}</text>
          <text class="file-ok">{{ jsonFileStatusText }}</text>
        </view>
      </view>

      <view class="field">
        <text class="field-label">JSON 内容</text>
        <textarea
          class="json-textarea"
          v-model="jsonText"
          placeholder="可粘贴剧本 JSON 内容，也可只选择上方 JSON 文件；二选一即可，必须包含 title 字段"
          maxlength="-1"
        />
      </view>

      <button class="submit-btn" :loading="submitting" :disabled="submitting" @tap="submitUpload">
        提交审核
      </button>
    </view>

  </scroll-view>
</template>

<script>
import { uploadUserScript } from '@/utils/api.js';

export default {
  data() {
    return {
      jsonText: '',
      jsonFileName: '',
      jsonFileText: '',
      jsonFileStatus: '',
      selectedImages: [],
      submitting: false
    };
  },

  computed: {
    jsonFileStatusText() {
      if (this.jsonFileStatus === 'success') return '已读取';
      if (this.jsonFileStatus === 'error') return '读取失败';
      return '读取中';
    }
  },

  onPullDownRefresh() {
    uni.stopPullDownRefresh();
  },

  methods: {
    chooseImages() {
      uni.chooseImage({
        count: 3 - this.selectedImages.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: res => {
          const files = (res.tempFiles || []).map(file => ({
            tempFilePath: file.path || file.tempFilePath,
            size: file.size || 0
          }));
          this.selectedImages = this.selectedImages.concat(files).slice(0, 3);
        }
      });
    },

    removeImage(index) {
      this.selectedImages.splice(index, 1);
    },

    chooseJsonFile() {
      const handleFile = file => {
        const filePath = file.path || file.tempFilePath;
        this.jsonFileName = file.name || 'script.json';
        this.jsonFileText = '';
        this.jsonFileStatus = 'loading';
        this.readJsonFile(filePath, file);
      };

      if (uni.chooseFile) {
        uni.chooseFile({
          count: 1,
          extension: ['.json'],
          success: res => {
            const file = (res.tempFiles && res.tempFiles[0]) || {};
            handleFile(file);
          }
        });
        return;
      }

      // #ifdef MP-WEIXIN
      wx.chooseMessageFile({
        count: 1,
        type: 'file',
        extension: ['json'],
        success: res => {
          const file = (res.tempFiles && res.tempFiles[0]) || {};
          handleFile(file);
        }
      });
      // #endif
    },

    readJsonFile(filePath, file = {}) {
      const applyContent = content => {
        this.jsonFileText = String(content || '');
        this.jsonFileStatus = this.jsonFileText.trim() ? 'success' : 'error';
        if (!this.jsonText.trim()) {
          this.jsonText = this.jsonFileText;
        }
        uni.showToast({ title: this.jsonFileStatus === 'success' ? '文件已读取' : '文件内容为空', icon: this.jsonFileStatus === 'success' ? 'success' : 'none' });
      };

      const markFailed = (message = '读取文件失败，请粘贴 JSON 内容') => {
        this.jsonFileStatus = 'error';
        uni.showToast({ title: message, icon: 'none' });
      };

      if (typeof file.content === 'string') {
        applyContent(file.content);
        return;
      }

      if (typeof wx !== 'undefined' && wx.getFileSystemManager && filePath) {
        wx.getFileSystemManager().readFile({
          filePath,
          encoding: 'utf8',
          success: res => applyContent(res.data),
          fail: () => markFailed()
        });
        return;
      }

      const browserFile = file.file || (typeof Blob !== 'undefined' && file instanceof Blob ? file : null);
      if (typeof FileReader !== 'undefined' && browserFile) {
        const reader = new FileReader();
        reader.onload = event => applyContent(event.target && event.target.result);
        reader.onerror = () => markFailed();
        reader.readAsText(browserFile, 'utf-8');
        return;
      }

      if (typeof fetch !== 'undefined' && filePath) {
        fetch(filePath)
          .then(res => res.text())
          .then(text => applyContent(text))
          .catch(() => markFailed());
        return;
      }

      markFailed('当前环境请粘贴 JSON 内容');
    },

    parseJsonData() {
      const raw = this.jsonText.trim() ? this.jsonText : this.jsonFileText;
      if (!raw || !raw.trim()) {
        throw new Error('请选择 JSON 文件或粘贴 JSON 内容');
      }

      let data = JSON.parse(raw.replace(/^\uFEFF/, ''));
      if (typeof data === 'string') {
        const inner = data.trim().replace(/^\uFEFF/, '');
        if (inner.startsWith('{') || inner.startsWith('[')) {
          data = JSON.parse(inner);
        }
      }

      if (Array.isArray(data)) {
        const meta = data.find(item => item && typeof item === 'object' && item.id === '_meta') || {};
        data = {
          title: meta.name || meta.title || this.getFileTitle(),
          name: meta.name || meta.title || this.getFileTitle(),
          author: meta.author || '未知作者',
          description: meta.description || '',
          content: data,
          characters: data,
          rawFormat: 'clocktower-script-array'
        };
      }

      if (!data || typeof data !== 'object') {
        throw new Error('JSON 必须是对象');
      }
      if (!data.title && typeof data.name === 'string' && data.name.trim()) {
        data.title = data.name.trim();
      }
      if (!data.title && this.getFileTitle()) {
        data.title = this.getFileTitle();
      }
      if (!data.title || typeof data.title !== 'string') {
        throw new Error('JSON 必须包含 title 或 name 字段');
      }
      return data;
    },

    getFileTitle() {
      return String(this.jsonFileName || '').replace(/\.json$/i, '').trim();
    },

    async uploadImages() {
      const uploaded = [];
      for (const image of this.selectedImages) {
        const filePath = image.tempFilePath || image.path;
        if (!filePath) continue;
        const suffix = (filePath.match(/\.[a-zA-Z0-9]+$/) || ['.jpg'])[0];
        const cloudPath = `script-upload/${Date.now()}-${Math.random().toString(36).slice(2)}${suffix}`;
        const res = await uniCloud.uploadFile({ filePath, cloudPath });
        uploaded.push(res.fileID || res.fileId || res.url || '');
      }
      return uploaded.filter(Boolean);
    },

    async submitUpload() {
      if (this.submitting) return;
      let jsonData;
      try {
        jsonData = this.parseJsonData();
      } catch (error) {
        uni.showToast({ title: error.message || 'JSON 格式错误', icon: 'none' });
        return;
      }

      this.submitting = true;
      uni.showLoading({ title: '提交中' });
      try {
        const images = await this.uploadImages();
        const result = await uploadUserScript({ jsonData, images });
        if (!result.success) {
          uni.showToast({ title: result.message || '上传失败', icon: 'none' });
          return;
        }
        uni.showToast({ title: '已提交审核', icon: 'success' });
        this.jsonText = '';
        this.jsonFileText = '';
        this.jsonFileName = '';
        this.jsonFileStatus = '';
        this.selectedImages = [];
      } catch (error) {
        console.error('submit upload failed:', error);
        uni.showToast({ title: '上传失败，请重试', icon: 'none' });
      } finally {
        uni.hideLoading();
        this.submitting = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.page {
  height: 100vh;
  box-sizing: border-box;
  padding: 20rpx 24rpx 36rpx;
  background: #f8f8f8;
  color: #2f261f;
}

.section {
  background: #ffffff;
  border: 1rpx solid #ebe6df;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.section-head {
  display: flex;
  flex-direction: column;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #2f261f;
  line-height: 1.35;
}

.section-subtitle {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #8c8178;
  line-height: 1.45;
}

.field {
  margin-bottom: 24rpx;
}

.field-label {
  display: block;
  margin-bottom: 12rpx;
  font-size: 26rpx;
  color: #4b4038;
  font-weight: 600;
}

.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.image-item,
.add-image {
  width: 150rpx;
  height: 150rpx;
  border-radius: 12rpx;
  overflow: hidden;
  position: relative;
}

.picked-image {
  width: 100%;
  height: 100%;
}

.remove-image {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 36rpx;
  height: 36rpx;
  line-height: 34rpx;
  text-align: center;
  color: #ffffff;
  background: rgba(0, 0, 0, 0.58);
  border-radius: 50%;
  font-size: 26rpx;
}

.add-image {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border: 2rpx dashed #d8d1c9;
  background: #faf9f7;
  color: #8c8178;
}

.add-mark {
  font-size: 46rpx;
  line-height: 1;
}

.add-text {
  font-size: 24rpx;
  margin-top: 8rpx;
}

.plain-btn,
.submit-btn {
  margin: 0;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.plain-btn {
  height: 76rpx;
  line-height: 76rpx;
  color: #007aff;
  background: #eef6ff;
}

.file-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 14rpx;
  padding: 16rpx;
  border-radius: 12rpx;
  background: #f8f8f8;
}

.file-name {
  flex: 1;
  font-size: 24rpx;
  color: #4b4038;
}

.file-ok {
  font-size: 24rpx;
  color: #0f9d58;
}

.json-textarea {
  width: 100%;
  min-height: 300rpx;
  box-sizing: border-box;
  padding: 20rpx;
  border-radius: 12rpx;
  border: 1rpx solid #ebe6df;
  background: #fafafa;
  font-size: 26rpx;
  line-height: 1.55;
}

.submit-btn {
  height: 82rpx;
  line-height: 82rpx;
  color: #ffffff;
  background: #007aff;
}

</style>
