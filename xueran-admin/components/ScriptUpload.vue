<template>
  <view class="script-upload">
    <!-- 文件选择区域 -->
    <view class="upload-section" v-if="!selectedFile">
      <view class="upload-area" @click="chooseFile">
        <view class="upload-icon">📁</view>
        <view class="upload-text">点击选择剧本文件</view>
        <view class="upload-hint">支持格式: TXT, MD, JSON (最大10MB)</view>
      </view>
    </view>

    <!-- 文件信息显示区域 -->
    <view class="file-info" v-if="selectedFile && !isUploading">
      <view class="file-details">
        <view class="file-name">{{ selectedFile.name }}</view>
        <view class="file-size">{{ formatFileSize(selectedFile.size) }}</view>
        <view class="file-type">{{ selectedFile.type || '未知类型' }}</view>
      </view>
      <view class="file-actions">
        <button class="change-btn" @click="chooseFile">更换文件</button>
        <button class="upload-btn" @click="uploadScript" :disabled="!canUpload">上传剧本</button>
      </view>
    </view>

    <!-- 上传进度区域 -->
    <view class="upload-progress" v-if="isUploading">
      <view class="progress-info">
        <view class="progress-text">正在上传 {{ selectedFile.name }}</view>
        <view class="progress-percent">{{ uploadProgress }}%</view>
      </view>
      <view class="progress-bar">
        <view class="progress-fill" :style="{ width: uploadProgress + '%' }"></view>
      </view>
      <view class="progress-status">{{ uploadStatus }}</view>
    </view>

    <!-- 错误信息显示 -->
    <view class="error-message" v-if="errorMessage">
      <view class="error-icon">⚠️</view>
      <view class="error-text">{{ errorMessage }}</view>
      <button class="retry-btn" v-if="canRetry" @click="retryUpload">重试</button>
    </view>

    <!-- 上传表单 (当文件选择后显示) -->
    <view class="upload-form" v-if="selectedFile && !isUploading && showForm">
      <uni-forms ref="form" :model="formData" :rules="rules">
        <uni-forms-item name="title" label="剧本标题" required>
          <uni-easyinput
            v-model="formData.title"
            placeholder="请输入剧本标题"
            :inputBorder="false"
          />
        </uni-forms-item>

        <uni-forms-item name="author" label="作者" required>
          <uni-easyinput
            v-model="formData.author"
            placeholder="请输入作者姓名"
            :inputBorder="false"
          />
        </uni-forms-item>

        <uni-forms-item name="tag" label="标签">
          <uni-data-picker
            v-model="formData.tag"
            :localdata="tagOptions"
            placeholder="请选择标签"
            clearIcon="true"
          />
        </uni-forms-item>

        <uni-forms-item name="description" label="简介">
          <uni-easyinput
            type="textarea"
            v-model="formData.description"
            placeholder="请输入剧本简介"
            :inputBorder="false"
          />
        </uni-forms-item>
      </uni-forms>

      <view class="form-actions">
        <button class="cancel-btn" @click="cancelUpload">取消</button>
        <button class="confirm-btn" @click="confirmUpload" :disabled="!canConfirm">确认上传</button>
      </view>
    </view>
  </view>
</template>

<script>
import { uploadScript } from '@/utils/scriptApi.js'

export default {
  name: 'ScriptUpload',
  props: {
    // 是否显示表单
    showForm: {
      type: Boolean,
      default: true
    },
    // 自动上传（选择文件后立即上传）
    autoUpload: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      selectedFile: null,
      isUploading: false,
      uploadProgress: 0,
      uploadStatus: '',
      errorMessage: '',
      canRetry: false,
      formData: {
        title: '',
        author: '',
        tag: '',
        description: ''
      },
      rules: {
        title: {
          rules: [{
            required: true,
            errorMessage: '请输入剧本标题'
          }, {
            minLength: 1,
            maxLength: 200,
            errorMessage: '标题长度必须在1-200字符之间'
          }]
        },
        author: {
          rules: [{
            required: true,
            errorMessage: '请输入作者姓名'
          }, {
            minLength: 1,
            maxLength: 100,
            errorMessage: '作者姓名长度必须在1-100字符之间'
          }]
        },
        tag: {
          rules: [{
            validateFunction: function(rule, value, data, callback) {
              if (value && !['推理', '娱乐'].includes(value)) {
                callback('标签只能选择推理或娱乐')
              } else {
                callback()
              }
            }
          }]
        },
        description: {
          rules: [{
            maxLength: 1000,
            errorMessage: '简介长度不能超过1000字符'
          }]
        }
      },
      tagOptions: [
        { value: '推理', text: '推理' },
        { value: '娱乐', text: '娱乐' }
      ]
    }
  },
  computed: {
    canUpload() {
      return this.selectedFile && !this.isUploading
    },
    canConfirm() {
      return this.formData.title && this.formData.author && !this.isUploading
    }
  },
  methods: {
    // 选择文件
    async chooseFile() {
      try {
        this.errorMessage = ''
        const result = await uni.chooseFile({
          count: 1,
          type: 'file',
          extension: ['txt', 'md', 'json', 'markdown']
        })

        if (result.tempFiles && result.tempFiles.length > 0) {
          const file = result.tempFiles[0]

          // 验证文件大小 (10MB)
          const maxSize = 10 * 1024 * 1024
          if (file.size > maxSize) {
            this.errorMessage = '文件大小超过10MB限制'
            return
          }

          // 验证文件类型
          const allowedTypes = ['text/plain', 'application/json', 'text/markdown', 'text/x-markdown']
          const mimeType = file.type || this.getMimeTypeFromExtension(file.name)

          if (!allowedTypes.includes(mimeType)) {
            this.errorMessage = '不支持的文件格式，请选择TXT、MD或JSON文件'
            return
          }

          this.selectedFile = file

          // 如果启用了自动上传
          if (this.autoUpload) {
            await this.uploadScript()
          } else if (this.showForm) {
            // 自动填充标题（使用文件名）
            if (!this.formData.title) {
              this.formData.title = file.name.replace(/\.[^/.]+$/, '') // 移除扩展名
            }
          }
        }
      } catch (error) {
        if (error.errMsg !== 'chooseFile:fail cancel') {
          this.errorMessage = '文件选择失败：' + error.message
        }
      }
    },

    // 获取文件MIME类型
    getMimeTypeFromExtension(filename) {
      const ext = filename.split('.').pop().toLowerCase()
      const mimeTypes = {
        'txt': 'text/plain',
        'md': 'text/markdown',
        'markdown': 'text/markdown',
        'json': 'application/json'
      }
      return mimeTypes[ext] || 'application/octet-stream'
    },

    // 上传剧本
    async uploadScript() {
      if (!this.selectedFile) {
        this.errorMessage = '请先选择文件'
        return
      }

      this.isUploading = true
      this.uploadProgress = 0
      this.uploadStatus = '准备上传...'
      this.errorMessage = ''

      try {
        // 如果显示表单，先验证表单
        if (this.showForm) {
          const valid = await this.validateForm()
          if (!valid) {
            this.isUploading = false
            return
          }
        }

        // 模拟上传进度
        const progressInterval = setInterval(() => {
          if (this.uploadProgress < 90) {
            this.uploadProgress += Math.random() * 10
            this.uploadStatus = `正在上传... ${Math.round(this.uploadProgress)}%`
          }
        }, 200)

        const uploadParams = {
          filePath: this.selectedFile.path,
          title: this.formData.title || this.selectedFile.name.replace(/\.[^/.]+$/, ''),
          author: this.formData.author,
          description: this.formData.description,
          tags: this.formData.tag ? [this.formData.tag] : []
        }

        const result = await uploadScript(uploadParams)

        clearInterval(progressInterval)
        this.uploadProgress = 100
        this.uploadStatus = '上传完成'

        if (result.success) {
          // 上传成功
          setTimeout(() => {
            this.resetUpload()
            this.$emit('upload-success', result.data)
            uni.showToast({
              title: '上传成功',
              icon: 'success'
            })
          }, 500)
        } else {
          throw new Error(result.message)
        }

      } catch (error) {
        this.isUploading = false
        this.uploadStatus = '上传失败'
        this.errorMessage = error.message || '上传失败，请稍后重试'
        this.canRetry = true

        console.error('上传失败:', error)
      }
    },

    // 验证表单
    async validateForm() {
      try {
        await this.$refs.form.validate()
        return true
      } catch (errors) {
        this.errorMessage = errors[0].message
        return false
      }
    },

    // 确认上传
    async confirmUpload() {
      await this.uploadScript()
    },

    // 取消上传
    cancelUpload() {
      this.resetUpload()
    },

    // 重试上传
    retryUpload() {
      this.errorMessage = ''
      this.canRetry = false
      this.uploadScript()
    },

    // 重置上传状态
    resetUpload() {
      this.selectedFile = null
      this.isUploading = false
      this.uploadProgress = 0
      this.uploadStatus = ''
      this.errorMessage = ''
      this.canRetry = false
      this.formData = {
        title: '',
        author: '',
        tag: '',
        description: ''
      }
    },

    // 格式化文件大小
    formatFileSize(bytes) {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }
  }
}
</script>

<style lang="scss" scoped>
.script-upload {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.upload-section {
  .upload-area {
    border: 2px dashed #d9d9d9;
    border-radius: 8px;
    padding: 40px 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      border-color: #1890ff;
      background: #f0f8ff;
    }

    .upload-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .upload-text {
      font-size: 16px;
      font-weight: 500;
      color: #262626;
      margin-bottom: 8px;
    }

    .upload-hint {
      font-size: 14px;
      color: #8c8c8c;
    }
  }
}

.file-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 6px;
  margin-bottom: 16px;

  .file-details {
    flex: 1;

    .file-name {
      font-size: 16px;
      font-weight: 500;
      color: #262626;
      margin-bottom: 4px;
    }

    .file-size, .file-type {
      font-size: 14px;
      color: #8c8c8c;
    }
  }

  .file-actions {
    display: flex;
    gap: 12px;

    .change-btn, .upload-btn {
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
    }

    .change-btn {
      background: #fff;
      border: 1px solid #d9d9d9;
      color: #262626;

      &:hover {
        border-color: #1890ff;
        color: #1890ff;
      }
    }

    .upload-btn {
      background: #1890ff;
      border: 1px solid #1890ff;
      color: #fff;

      &:disabled {
        background: #d9d9d9;
        border-color: #d9d9d9;
        cursor: not-allowed;
      }
    }
  }
}

.upload-progress {
  padding: 20px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 6px;
  margin-bottom: 16px;

  .progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .progress-text {
      font-size: 16px;
      font-weight: 500;
      color: #262626;
    }

    .progress-percent {
      font-size: 16px;
      font-weight: 500;
      color: #52c41a;
    }
  }

  .progress-bar {
    height: 8px;
    background: #f0f0f0;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;

    .progress-fill {
      height: 100%;
      background: #52c41a;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
  }

  .progress-status {
    font-size: 14px;
    color: #52c41a;
    text-align: center;
  }
}

.error-message {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;
  margin-bottom: 16px;

  .error-icon {
    font-size: 20px;
    margin-right: 12px;
  }

  .error-text {
    flex: 1;
    font-size: 14px;
    color: #cf1322;
  }

  .retry-btn {
    padding: 6px 12px;
    background: #ff4d4f;
    color: #fff;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
  }
}

.upload-form {
  margin-top: 20px;

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #f0f0f0;

    .cancel-btn, .confirm-btn {
      padding: 10px 24px;
      border-radius: 6px;
      font-size: 16px;
      border: none;
      cursor: pointer;
    }

    .cancel-btn {
      background: #fff;
      border: 1px solid #d9d9d9;
      color: #262626;

      &:hover {
        border-color: #1890ff;
        color: #1890ff;
      }
    }

    .confirm-btn {
      background: #1890ff;
      color: #fff;

      &:disabled {
        background: #d9d9d9;
        cursor: not-allowed;
      }
    }
  }
}
</style>
