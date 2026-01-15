<template>
  <view class="bulk-upload-container">
    <!-- 面板头部 -->
    <view class="panel-header">
      <view class="header-content">
        <view class="header-icon">
          <text class="icon-text">📁</text>
        </view>
        <view class="header-info">
          <text class="title">批量上传剧本</text>
          <text class="subtitle">支持选择文件夹或多个JSON文件进行批量上传</text>
        </view>
      </view>
    </view>

    <!-- 文件选择区域 -->
    <view class="upload-section">
      <view class="section-title">
        <text class="section-title-text">1. 选择文件</text>
      </view>
      <view class="file-selection-area">
        <view class="selection-options">
          <view class="option-card" @click="triggerFolderInput">
            <view class="option-icon">📂</view>
            <view class="option-content">
              <text class="option-title">选择文件夹</text>
              <text class="option-desc">推荐方式，支持递归扫描子目录</text>
            </view>
          </view>
          <view class="option-card" @click="triggerFileInput">
            <view class="option-icon">📄</view>
            <view class="option-content">
              <text class="option-title">选择文件</text>
              <text class="option-desc">手动选择多个JSON文件</text>
            </view>
          </view>
        </view>

        <!-- 隐藏的文件输入 -->
        <input id="bulk-file-input" ref="fileInput" type="file" multiple accept=".json,.zip" @change="onFilesChange" style="display:none" />
        <input id="bulk-folder-input" ref="folderInput" type="file" webkitdirectory directory multiple @change="onFilesChange" style="display:none" />

        <!-- 文件信息显示 -->
        <view class="file-info" v-if="manifest.length > 0">
          <view class="file-stats">
            <text class="stats-text">已选择 {{ manifest.length }} 个文件</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 文件预览区域 -->
    <view class="preview-section" v-if="manifest.length > 0">
      <view class="section-title">
        <text class="section-title-text">2. 文件预览</text>
        <text class="section-subtitle">检查并编辑文件信息</text>
      </view>
      <view class="file-list">
        <view class="file-list-header">
          <text class="header-cell file-index">#</text>
          <text class="header-cell file-name">文件名</text>
          <text class="header-cell file-title">剧本标题</text>
          <text class="header-cell file-status">状态</text>
          <text class="header-cell file-actions">操作</text>
        </view>
        <view class="file-list-body">
          <view v-for="(item, idx) in manifest" :key="idx" class="file-item">
            <view class="file-row">
              <text class="file-cell file-index">{{ idx + 1 }}</text>
              <view class="file-cell file-name">
                <text class="file-name-text">{{ item.fileName }}</text>
                <text class="file-path" v-if="item.relativePath">{{ item.relativePath }}</text>
              </view>
              <view class="file-cell file-title">
                <text class="title-text">{{ item.extractedMeta && item.extractedMeta.title ? item.extractedMeta.title : '未提取' }}</text>
              </view>
              <view class="file-cell file-status">
                <view class="status-indicator" :class="getStatusClass(item)">
                  <text class="status-text">{{ getStatusText(item) }}</text>
                </view>
              </view>
              <view class="file-cell file-actions">
                <button class="action-btn edit-btn" @click="openPreview(idx)">
                  <text class="btn-text">编辑</text>
                </button>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
    <!-- 上传控制区域 -->
    <view class="control-section" v-if="manifest.length > 0">
      <view class="section-title">
        <text class="section-title-text">3. 开始上传</text>
      </view>
      <view class="upload-controls">
        <view class="control-row">
          <view class="control-left">
            <view class="upload-summary">
              <view class="summary-item">
                <text class="summary-label">待上传文件：</text>
                <text class="summary-value">{{ manifest.length }}</text>
              </view>
            </view>
          </view>
          <view class="control-right">
            <button class="upload-btn" type="primary" @click="startUpload" :disabled="!canStartUpload">
              <text class="upload-btn-text">{{ isUploading ? '上传中...' : '开始上传' }}</text>
            </button>
          </view>
        </view>
      </view>
    </view>

    <!-- 上传进度区域 -->
    <view class="progress-section" v-if="jobId">
      <view class="section-title">
        <text class="section-title-text">4. 上传进度</text>
      </view>
      <view class="progress-card">
        <view class="progress-header">
          <view class="job-info">
            <text class="job-id">作业 ID: {{ jobId }}</text>
            <view class="job-status" :class="getJobStatusClass(jobStatus)">
              <text class="status-text">{{ getJobStatusText(jobStatus) }}</text>
            </view>
          </view>
        </view>

        <view class="progress-stats">
          <view class="stat-item">
            <text class="stat-value success">{{ successCount }}</text>
            <text class="stat-label">成功</text>
          </view>
          <view class="stat-item">
            <text class="stat-value error">{{ failCount }}</text>
            <text class="stat-label">失败</text>
          </view>
          <view class="stat-item">
            <text class="stat-value total">{{ successCount + failCount }}</text>
            <text class="stat-label">已处理</text>
          </view>
        </view>

        <view class="progress-bar" v-if="jobStatus === 'running' || jobStatus === 'completed'">
          <view class="progress-track">
            <view class="progress-fill" :style="{ width: getProgressPercentage() + '%' }"></view>
          </view>
          <text class="progress-text">{{ getProgressPercentage() }}%</text>
        </view>

        <view class="progress-actions" v-if="hasErrors && (jobStatus === 'completed' || jobStatus === 'failed')">
          <button class="action-btn secondary" @click="downloadErrors">
            <text class="btn-text">下载失败详情</text>
          </button>
        </view>
      </view>
    </view>

    <!-- 预览编辑弹窗 -->
    <view v-if="previewVisible" class="preview-modal-overlay" @click="cancelPreview">
      <view class="preview-modal" @click.stop="">
        <view class="modal-header">
          <text class="modal-title">编辑剧本信息</text>
          <view class="modal-close" @click="cancelPreview">
            <text class="close-text">✕</text>
          </view>
        </view>

        <view class="modal-body">
          <view class="form-group">
            <text class="form-label">剧本标题</text>
            <input class="form-input" type="text" v-model="previewModel.title" placeholder="请输入剧本标题" />
          </view>

          <view class="form-group">
            <text class="form-label">作者</text>
            <input class="form-input" type="text" v-model="previewModel.author" placeholder="请输入作者姓名" />
          </view>

          <view class="form-group">
            <text class="form-label">描述</text>
            <textarea class="form-textarea" v-model="previewModel.description" placeholder="请输入剧本描述（可选）" rows="3"></textarea>
          </view>
        </view>

        <view class="modal-footer">
          <button class="modal-btn cancel-btn" @click="cancelPreview">取消</button>
          <button class="modal-btn confirm-btn" @click="savePreview">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'BulkUploadPanel',
  data() {
    return {
      manifest: [],
      jobId: null,
      jobStatus: null,
      successCount: 0,
      failCount: 0,
      pollTimer: null,
      hasErrors: false,
      conflictStrategy: 'skip', // default
      // UI enhancement state
      concurrency: 5,
      previewVisible: false,
      previewIndex: -1,
      previewModel: {
        title: '',
        author: '',
        description: ''
      },
      isUploading: false
    }
  },
  computed: {
    manifestCount() {
      return this.manifest ? this.manifest.length : 0
    },
    canStartUpload() {
      return this.manifest.length > 0 && !this.isUploading && this.jobStatus !== 'running'
    },
    totalProcessed() {
      return this.successCount + this.failCount
    },
    isUploading() {
      return this.jobStatus === 'running'
    }
  },
  methods: {
    triggerFileInput() {
      try {
        // Prefer platform API (uni.chooseFile) when available (App / H5 wrappers)
        if (typeof uni !== 'undefined' && typeof uni.chooseFile === 'function') {
          // use uni.chooseFile where supported (APP-PLUS / H5 wrappers)
          uni.chooseFile({
            count: 50,
            success: async (res) => {
              try {
                const files = res.tempFiles || res.tempFilePaths || []
                for (const f of files) {
                  // normalize file entry
                  const path = f.path || f.tempFilePath || f
                  const fileName = (f.name || ('' + path).split('/').pop()) || 'unknown'
                  let content = null
                  // try to read local file content if fs available
                  try {
                    const fs = uni.getFileSystemManager && uni.getFileSystemManager()
                    if (fs && typeof fs.readFile === 'function') {
                      const txt = fs.readFile({
                        filePath: path,
                        encoding: 'utf8',
                        success: resFs => {
                          return resFs.data
                        },
                        fail: () => null
                      })
                      // fs.readFile with callbacks - try sync if available
                      if (txt && txt.data !== undefined) {
                        content = txt.data
                      } else {
                        // fallback: try synchronous read if exists
                        if (fs.readFileSync) {
                          try {
                            content = fs.readFileSync(path, 'utf8')
                          } catch (e) {
                            content = null
                          }
                        }
                      }
                    }
                  } catch (e) {
                    content = null
                  }
                  // push manifest entry (content may be null; server should handle tempFile path if supported)
                  this.manifest.push({ fileName, content, tempPath: path })
                }
              } catch (e) {
                console.warn('chooseFile success handler error', e)
              }
            },
            fail: () => {
              uni.showToast({ title: '选择文件失败', icon: 'none' })
            }
          })
          return
        }
        // DOM fallback
        const refEl = this.$refs.fileInput
        let dom = null
        if (refEl && typeof refEl.click === 'function') {
          dom = refEl
        } else if (refEl && refEl.$el && typeof refEl.$el.click === 'function') {
          dom = refEl.$el
        } else if (typeof document !== 'undefined') {
          dom = document.getElementById('bulk-file-input')
        }
        if (dom && typeof dom.click === 'function') {
          dom.click()
          return
        }
      } catch (e) {
        console.warn('triggerFileInput fallback failed', e)
      }
      uni.showToast({ title: '当前平台不支持自动打开文件选择，请手动选择或使用支持的平台', icon: 'none' })
    },
    async triggerFolderInput() {
      // Try showDirectoryPicker (modern browsers) and recursively read files.
      if (typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function') {
        try {
          const dirHandle = await window.showDirectoryPicker()
          // recursive traversal helper
          const collected = []
          const traverse = async (handle, pathPrefix = '') => {
            for await (const entry of handle.values()) {
              try {
                if (entry.kind === 'file') {
                  const file = await entry.getFile()
                  const text = await file.text()
                  const fileName = file.name
                  const relativePath = (pathPrefix ? pathPrefix + '/' : '') + fileName
                  // try parse meta
                  let extractedMeta = null
                  try {
                    const parsed = JSON.parse(text)
                    extractedMeta = {
                      title: parsed.title || parsed.name || (parsed._meta && parsed._meta.title),
                      author: parsed.author || (parsed._meta && parsed._meta.author),
                      description: parsed.description || null,
                      tags: parsed.tags || null,
                      usageCount: parsed.usageCount || null,
                      likes: parsed.likes || null
                    }
                  } catch (err) {
                    extractedMeta = null
                  }
                  collected.push({ fileName, relativePath, content: text, extractedMeta })
                } else if (entry.kind === 'directory') {
                  await traverse(entry, pathPrefix ? pathPrefix + '/' + entry.name : entry.name)
                }
              } catch (innerErr) {
                console.warn('traverse entry error', innerErr)
              }
            }
          }

          await traverse(dirHandle)
          if (collected.length === 0) {
            uni.showToast({ title: '未在所选目录中找到 JSON 文件', icon: 'none' })
          } else {
            this.manifest = collected.filter(item => item.fileName && item.fileName.toLowerCase().endsWith('.json'))
          }
          return
        } catch (e) {
          // If directory picker fails, fallback to input below
          console.warn('showDirectoryPicker failed, falling back to input:', e)
        }
      }

      // Fallback: trigger hidden folder input (webkitdirectory)
      try {
        const refEl = this.$refs.folderInput
        let dom = null
        if (refEl && typeof refEl.click === 'function') {
          dom = refEl
        } else if (refEl && refEl.$el && typeof refEl.$el.click === 'function') {
          dom = refEl.$el
        } else if (typeof document !== 'undefined') {
          dom = document.getElementById('bulk-folder-input')
        }
        if (dom && typeof dom.click === 'function') {
          dom.click()
          return
        }
      } catch (e) {
        console.warn('triggerFolderInput fallback failed', e)
      }

      uni.showToast({ title: '当前平台不支持目录选择，请使用支持的平台或选择文件上传', icon: 'none' })
    },
    async onFilesChange(e) {
      try {
        const files = e.target.files
        if (!files || !files.length) return
        this.manifest = []
        for (const f of Array.from(files)) {
          const fileName = f.name
          if (fileName.toLowerCase().endsWith('.json')) {
            // read file content
            const text = await new Promise((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result)
              reader.onerror = err => reject(err)
              reader.readAsText(f)
            })
            // try parse JSON and extract meta
            let extractedMeta = null
            try {
              const parsed = JSON.parse(text)
              extractedMeta = {
                title: parsed.title || parsed.name || parsed._meta && parsed._meta.title,
                author: parsed.author || parsed._meta && parsed._meta.author,
                description: parsed.description || null,
                tags: parsed.tags || null,
                usageCount: parsed.usageCount || null,
                likes: parsed.likes || null
              }
            } catch (err) {
              extractedMeta = null
            }
            // capture relative path when available (webkitRelativePath for directory input)
            const relativePath = f.webkitRelativePath || f.relativePath || null
            this.manifest.push({ fileName, relativePath, content: text, extractedMeta })
          } else if (fileName.toLowerCase().endsWith('.zip')) {
            // zip handling is not supported per product decision - inform user
            uni.showToast({ title: '不支持 zip 上传，请选择 json 文件或在桌面端拆分后上传', icon: 'none' })
          }
        }
      } catch (err) {
        console.error('onFilesChange error', err)
        uni.showToast({ title: '读取文件失败', icon: 'none' })
      }
    },
    async startUpload() {
      if (!this.manifest || this.manifest.length === 0) {
        uni.showToast({ title: '请先选择文件', icon: 'none' })
        return
      }
      try {
        this.isUploading = true
        uni.showLoading({ title: '创建作业...' })
        const res = await uniCloud.callFunction({
          name: 'bulkUpload',
          data: {
            action: 'createJob',
          manifest: this.manifest.map(m => ({
            fileName: m.fileName,
            relativePath: m.relativePath || null,
            content: m.content,
            extractedMeta: m.extractedMeta
          })),
            processNow: true
          }
        })
        uni.hideLoading()
        const result = (res && res.result) ? res.result : res
        if (result && result.code === 0 && result.data && result.data.jobId) {
          this.jobId = result.data.jobId
          this.jobStatus = 'running'
          this.successCount = 0
          this.failCount = 0
          this.pollJob()
          uni.showToast({ title: '作业已创建', icon: 'success' })
        } else {
          this.isUploading = false
          uni.showToast({ title: result.message || '作业创建失败', icon: 'none' })
        }
      } catch (err) {
        uni.hideLoading()
        this.isUploading = false
        console.error('startUpload error', err)
        uni.showToast({ title: '上传失败', icon: 'none' })
      }
    },
    pollJob() {
      if (this.pollTimer) clearInterval(this.pollTimer)
      this.pollTimer = setInterval(async () => {
        if (!this.jobId) return
        try {
          const r = await uniCloud.callFunction({ name: 'bulkUpload', data: { action: 'getJob', jobId: this.jobId } })
          const rr = (r && r.result) ? r.result : r
          if (rr && rr.code === 0 && rr.data) {
            this.jobStatus = rr.data.status
            this.successCount = rr.data.successCount || 0
            this.failCount = rr.data.failCount || 0
            if ((rr.data.failCount || 0) > 0) this.hasErrors = true
            if (['completed','failed'].includes(this.jobStatus)) {
              clearInterval(this.pollTimer)
              this.pollTimer = null
              this.isUploading = false
              uni.showToast({ title: '作业结束', icon: 'success' })
            }
          }
        } catch (e) {
          console.warn('pollJob failed', e)
        }
      }, 2000)
    },
    async downloadErrors() {
      if (!this.jobId) return
      try {
        const r = await uniCloud.callFunction({ name: 'bulkUpload', data: { action: 'getJobErrors', jobId: this.jobId } })
        const rr = (r && r.result) ? r.result : r
        if (rr && rr.code === 0 && rr.data && rr.data.errors) {
          const csv = rr.data.errors.map(e => `${e.fileName},"${(e.error || '').replace(/"/g,'""')}"`).join('\n')
          // create blob and download (H5)
          if (typeof window !== 'undefined' && window.URL && window.Blob) {
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = `bulk-${this.jobId}-errors.csv`
            link.click()
            URL.revokeObjectURL(link.href)
          } else {
            uni.showToast({ title: '请在 H5 平台下载失败详情', icon: 'none' })
          }
        } else {
          uni.showToast({ title: '无失败项', icon: 'none' })
        }
      } catch (err) {
        console.error('downloadErrors error', err)
        uni.showToast({ title: '获取失败详情失败', icon: 'none' })
      }
    }
    ,
    // UI: open preview modal for item index
    openPreview(index) {
      if (index === undefined || index === null) return
      const item = this.manifest[index]
      if (!item) return
      this.previewIndex = index
      this.previewModel = {
        title: (item.extractedMeta && item.extractedMeta.title) || '',
        author: (item.extractedMeta && item.extractedMeta.author) || '',
        description: (item.extractedMeta && item.extractedMeta.description) || ''
      }
      this.previewVisible = true
    },
    savePreview() {
      if (this.previewIndex < 0) return
      const item = this.manifest[this.previewIndex]
      if (!item) return
      item.extractedMeta = item.extractedMeta || {}
      item.extractedMeta.title = this.previewModel.title
      item.extractedMeta.author = this.previewModel.author
      item.extractedMeta.description = this.previewModel.description
      this.manifest.splice(this.previewIndex, 1, item)
      this.previewVisible = false
      this.previewIndex = -1
    },
    cancelPreview() {
      this.previewVisible = false
      this.previewIndex = -1
    },

    // UI 辅助方法
    getStatusClass(item) {
      if (!item.extractedMeta) return 'status-error'
      if (item.extractedMeta.title && item.extractedMeta.author) return 'status-success'
      return 'status-warning'
    },

    getStatusText(item) {
      if (!item.extractedMeta) return '解析失败'
      if (item.extractedMeta.title && item.extractedMeta.author) return '完整'
      return '部分'
    },

    getJobStatusClass(status) {
      const statusMap = {
        'running': 'status-running',
        'completed': 'status-success',
        'failed': 'status-error',
        'pending': 'status-warning'
      }
      return statusMap[status] || 'status-default'
    },

    getJobStatusText(status) {
      const statusMap = {
        'running': '处理中',
        'completed': '已完成',
        'failed': '失败',
        'pending': '等待中'
      }
      return statusMap[status] || '未知'
    },

    getProgressPercentage() {
      if (this.manifestCount === 0) return 0
      return Math.round((this.totalProcessed / this.manifestCount) * 100)
    }
  }
}
</script>

<style scoped>
/* 主容器 */
.bulk-upload-container {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* 面板头部 */
.panel-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  color: white;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-text {
  font-size: 24px;
}

.header-info {
  flex: 1;
}

.title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
  display: block;
}

.subtitle {
  font-size: 14px;
  opacity: 0.8;
  display: block;
}

/* 区域标题 */
.section-title {
  padding: 16px 20px 8px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.section-title-text {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
  display: block;
}

.section-subtitle {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
  display: block;
}

/* 文件选择区域 */
.upload-section {
  padding: 0;
}

.file-selection-area {
  padding: 20px;
}

.selection-options {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.option-card {
  flex: 1;
  background: #fafafa;
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.option-card:hover {
  border-color: #1890ff;
  background: #f0f8ff;
}

.option-icon {
  font-size: 32px;
  margin-bottom: 12px;
  display: block;
}

.option-content {
  text-align: center;
}

.option-title {
  font-size: 14px;
  font-weight: 500;
  color: #262626;
  margin-bottom: 4px;
  display: block;
}

.option-desc {
  font-size: 12px;
  color: #8c8c8c;
  display: block;
}

.file-info {
  margin-top: 16px;
  padding: 12px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 6px;
}

.file-stats {
  text-align: center;
}

.stats-text {
  font-size: 14px;
  color: #52c41a;
  font-weight: 500;
}

/* 文件预览区域 */
.preview-section {
  border-top: 1px solid #f0f0f0;
}

.file-list {
  padding: 0 20px 20px 20px;
}

.file-list-header {
  display: flex;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 12px;
  color: #8c8c8c;
  font-weight: 500;
}

.header-cell {
  padding: 0 8px;
}

.file-index {
  width: 40px;
  text-align: center;
}

.file-name {
  flex: 2;
}

.file-title {
  flex: 2;
}

.file-status {
  width: 80px;
  text-align: center;
}

.file-actions {
  width: 80px;
  text-align: center;
}

.file-list-body {
  max-height: 300px;
  overflow-y: auto;
}

.file-item {
  border-bottom: 1px solid #f5f5f5;
}

.file-row {
  display: flex;
  align-items: center;
  padding: 12px 0;
  transition: background-color 0.2s ease;
}

.file-row:hover {
  background: #fafafa;
}

.file-cell {
  padding: 0 8px;
  font-size: 14px;
}

.file-name-text {
  font-weight: 500;
  color: #262626;
  display: block;
}

.file-path {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 2px;
  display: block;
}

.title-text {
  color: #262626;
}

.status-indicator {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.status-success {
  background: #f6ffed;
  color: #52c41a;
}

.status-warning {
  background: #fff7e6;
  color: #fa8c16;
}

.status-error {
  background: #fff2f0;
  color: #ff4d4f;
}

.action-btn {
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.action-btn:hover {
  background: #40a9ff;
}

.btn-text {
  color: white;
  font-size: 12px;
}

/* 上传控制区域 */
.control-section {
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}

.upload-controls {
  padding: 20px;
}

.control-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.control-left {
  flex: 1;
}

.upload-summary {
  display: flex;
  gap: 16px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.summary-label {
  font-size: 14px;
  color: #8c8c8c;
}

.summary-value {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.upload-btn {
  background: #52c41a;
  border: none;
  border-radius: 6px;
  padding: 8px 24px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-btn:hover:not(:disabled) {
  background: #73d13d;
}

.upload-btn:disabled {
  background: #d9d9d9;
  cursor: not-allowed;
}

.upload-btn-text {
  color: white;
  font-size: 14px;
  font-weight: 500;
}

/* 进度区域 */
.progress-section {
  border-top: 1px solid #f0f0f0;
}

.progress-card {
  margin: 20px;
  background: #fafafa;
  border-radius: 8px;
  padding: 20px;
}

.progress-header {
  margin-bottom: 16px;
}

.job-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.job-id {
  font-size: 14px;
  color: #8c8c8c;
}

.job-status {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}

.status-running {
  background: #e6f7ff;
  color: #1890ff;
}

.status-success {
  background: #f6ffed;
  color: #52c41a;
}

.status-error {
  background: #fff2f0;
  color: #ff4d4f;
}

.status-warning {
  background: #fff7e6;
  color: #fa8c16;
}

.status-default {
  background: #f5f5f5;
  color: #8c8c8c;
}

.progress-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 16px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  display: block;
}

.stat-value.success {
  color: #52c41a;
}

.stat-value.error {
  color: #ff4d4f;
}

.stat-value.total {
  color: #1890ff;
}

.stat-label {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
  display: block;
}

.progress-bar {
  margin-bottom: 16px;
}

.progress-track {
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #52c41a 0%, #73d13d 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #8c8c8c;
  text-align: right;
  display: block;
}

.progress-actions {
  text-align: center;
}

.action-btn.secondary {
  background: #1890ff;
}

.action-btn.secondary:hover {
  background: #40a9ff;
}

/* 预览弹窗 */
.preview-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.preview-modal {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.modal-close {
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.modal-close:hover {
  background: #f5f5f5;
}

.close-text {
  font-size: 18px;
  color: #8c8c8c;
}

.modal-body {
  padding: 24px;
  max-height: 400px;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  font-size: 14px;
  color: #262626;
  margin-bottom: 8px;
  display: block;
  font-weight: 500;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.modal-btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.cancel-btn {
  background: #fff;
  border-color: #d9d9d9;
  color: #262626;
}

.cancel-btn:hover {
  border-color: #8c8c8c;
}

.confirm-btn {
  background: #1890ff;
  color: white;
}

.confirm-btn:hover {
  background: #40a9ff;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .selection-options {
    flex-direction: column;
  }

  .file-list-header,
  .file-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .header-cell {
    padding: 4px 0;
  }

  .control-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .progress-stats {
    flex-direction: column;
    gap: 12px;
  }
}
</style>


