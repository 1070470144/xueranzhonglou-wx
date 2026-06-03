<template>
  <view class="bulk-upload-container">
    <!-- 面板头部 -->
    <view class="panel-header">
      <view class="header-content">
        <view class="header-info">
          <text class="title">批量上传剧本</text>
          <text class="subtitle">支持选择文件夹或多个 JSON 文件进行批量上传</text>
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
            <view class="option-icon">文件夹</view>
            <view class="option-content">
              <text class="option-title">选择文件夹</text>
              <text class="option-desc">推荐方式，支持递归扫描子目录</text>
            </view>
          </view>
          <view class="option-card" @click="triggerFileInput">
            <view class="option-icon">文件</view>
            <view class="option-content">
              <text class="option-title">选择文件</text>
              <text class="option-desc">手动选择多个JSON文件</text>
            </view>
          </view>
        </view>

        <!-- 隐藏的文件输入 -->
        <input id="bulk-file-input" ref="fileInput" type="file" multiple accept=".json" @change="onFilesChange" style="display:none" />
        <input id="bulk-folder-input" ref="folderInput" type="file" webkitdirectory directory multiple @change="onFilesChange" style="display:none" />

        <!-- 文件信息显示 -->
        <view class="file-info" v-if="manifest.length > 0">
          <view class="file-stats">
            <text class="stats-text">已选择 {{ manifest.length }} 个文件</text>
            <text v-if="getInvalidFilesCount() > 0" class="stats-text error">异常 {{ getInvalidFilesCount() }} 个</text>
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

      <!-- Bulk actions toolbar -->

      <view class="file-list">
        <view class="file-list-header">
          <text class="header-cell file-index">#</text>
          <text class="header-cell file-name">文件名</text>
          <text class="header-cell file-title">剧本标题</text>
          <text class="header-cell file-author">作者</text>
          <text class="header-cell file-tags">标签</text>
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
                <text class="title-text" :class="{ 'validation-error': !item.extractedMeta || !item.extractedMeta.title }">
                  {{ item.extractedMeta && item.extractedMeta.title ? item.extractedMeta.title : '未提取' }}
                </text>
              </view>
              <view class="file-cell file-author">
                <text class="author-text">{{ item.extractedMeta && item.extractedMeta.author ? item.extractedMeta.author : '未提取' }}</text>
              </view>
              <view class="file-cell file-tags">
                <view class="tags-container">
                  <text v-if="item.extractedMeta && item.extractedMeta.tag" class="tag-chip">{{ item.extractedMeta.tag }}</text>
                  <text v-else class="no-tags">无标签</text>
                </view>
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
              <view class="summary-item" v-if="uploadBatchTotal > 0">
                <text class="summary-label">当前批次：</text>
                <text class="summary-value">{{ uploadBatchIndex }} / {{ uploadBatchTotal }}</text>
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

          <view class="form-group">
            <text class="form-label">标签</text>
            <select class="form-input" v-model="previewModel.tag">
              <option value="">请选择标签</option>
              <option value="娱乐">娱乐</option>
              <option value="推理">推理</option>
            </select>
          </view>

          <view class="form-group">
            <text class="form-label">状态</text>
            <view class="radio-group">
              <label class="radio-option" @click="previewModel.status = 'active'">
                <view class="radio-indicator" :class="{ active: previewModel.status === 'active' }"></view>
                <text class="radio-text">激活</text>
              </label>
              <label class="radio-option" @click="previewModel.status = 'inactive'">
                <view class="radio-indicator" :class="{ active: previewModel.status === 'inactive' }"></view>
                <text class="radio-text">未激活</text>
              </label>
            </view>
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
      // Cache for validation results to improve performance
      validationCache: new Map(),
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
      maxFiles: 1000,
      uploadBatchSize: 10,
      uploadBatchIndex: 0,
      uploadBatchTotal: 0,
      previewVisible: false,
      previewIndex: -1,
      previewModel: {
        title: '',
        author: '',
        description: '',
        tags: [],
        status: 'active'
      },
      uploadPending: false
    }
  },
  computed: {
    manifestCount() {
      return this.manifest ? this.manifest.length : 0
    },
    canStartUpload() {
      return this.manifest.length > 0 && !this.isUploading && this.getValidFilesCount() > 0
    },
    totalProcessed() {
      return this.successCount + this.failCount
    },
    isUploading() {
      return this.uploadPending || this.jobStatus === 'running'
    }
  },
  methods: {
    // Enhanced metadata extraction supporting multiple JSON formats
    extractMetadata(parsed, fileName) {
      try {
        let metaFromJson = null
        let isClocktowerFormat = false

        // Check for Clocktower format (array with _meta as first element)
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0] && parsed[0].id === '_meta') {
          metaFromJson = parsed[0]
          isClocktowerFormat = true
        }
        // Check for object with _meta field
        else if (parsed && typeof parsed === 'object' && parsed._meta) {
          metaFromJson = parsed._meta
        }
        // Check for direct metadata object
        else if (parsed && typeof parsed === 'object' &&
                 (parsed.title || parsed.name || parsed.author || parsed.description)) {
          metaFromJson = parsed
        }

        // Extract metadata with fallback priorities
        const metadata = {
          title: this.extractField(metaFromJson, ['title', 'name'], fileName.replace(/\.json$/i, '')),
          author: this.extractField(metaFromJson, ['author', 'creator'], ''),
          description: this.extractField(metaFromJson, ['description', 'summary'], null),
          tag: this.extractTag(metaFromJson, parsed),
          usageCount: this.extractField(metaFromJson, ['usageCount'], 0),
          likes: this.extractField(metaFromJson, ['likes'], 0),
          status: 'active' // Default to active status
        }

        return metadata
      } catch (err) {
        console.warn('Metadata extraction failed:', err)
        // Return minimal metadata with defaults
        return {
          title: fileName.replace(/\.json$/i, ''),
          author: '',
          description: null,
          tag: '娱乐',
          usageCount: 0,
          likes: 0,
          status: 'active'
        }
      }
    },

    // Helper method to extract field with fallback priorities
    extractField(obj, fieldNames, defaultValue) {
      if (!obj) return defaultValue
      for (const fieldName of fieldNames) {
        if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== '') {
          return obj[fieldName]
        }
      }
      return defaultValue
    },

    // Enhanced tag extraction - return single tag string
    extractTag(metaFromJson, fullParsed) {
      let tag = ''

      // Prefer tag field if present
      if (metaFromJson && metaFromJson.tag && typeof metaFromJson.tag === 'string') {
        tag = metaFromJson.tag
      }
      // Fallback to tags array (take first element)
      else if (metaFromJson && metaFromJson.tags) {
        if (Array.isArray(metaFromJson.tags) && metaFromJson.tags.length > 0) {
          tag = metaFromJson.tags[0]
        } else if (typeof metaFromJson.tags === 'string') {
          tag = metaFromJson.tags
        }
      }
      // Try to extract from root object
      else if (fullParsed && fullParsed.tags) {
        if (Array.isArray(fullParsed.tags) && fullParsed.tags.length > 0) {
          tag = fullParsed.tags[0]
        } else if (typeof fullParsed.tags === 'string') {
          tag = fullParsed.tags
        }
      }

      // Fallback to other fields
      if (!tag) {
        const fallbackFields = ['category', 'genre', 'type']
        for (const field of fallbackFields) {
          if (metaFromJson && metaFromJson[field]) {
            if (Array.isArray(metaFromJson[field]) && metaFromJson[field].length > 0) {
              tag = metaFromJson[field][0]
            } else if (typeof metaFromJson[field] === 'string') {
              tag = metaFromJson[field]
            }
            if (tag) break
          }
        }
      }

      return tag || '娱乐'
    },

    triggerFileInput() {
      try {
        // Prefer platform API (uni.chooseFile) when available (App / H5 wrappers)
        if (typeof uni !== 'undefined' && typeof uni.chooseFile === 'function') {
          // use uni.chooseFile where supported (APP-PLUS / H5 wrappers)
          uni.chooseFile({
            count: this.maxFiles,
            success: async (res) => {
              try {
                const files = res.tempFiles || res.tempFilePaths || []
                for (const f of files) {
                  // normalize file entry
                  const path = f.path || f.tempFilePath || f
                  const fileName = (f.name || ('' + path).split('/').pop()) || 'unknown'
                  let content = null
                  // try to read file content from the returned object first
                  try {
                    if (typeof f.text === 'function') {
                      content = await f.text()
                    } else if (typeof FileReader !== 'undefined' && typeof Blob !== 'undefined' && f instanceof Blob) {
                      content = await new Promise((resolve, reject) => {
                        const reader = new FileReader()
                        reader.onload = () => resolve(reader.result)
                        reader.onerror = reject
                        reader.readAsText(f)
                      })
                    } else {
                      const fs = uni.getFileSystemManager && uni.getFileSystemManager()
                      if (fs && typeof fs.readFileSync === 'function' && path) {
                        content = fs.readFileSync(path, 'utf8')
                      }
                    }
                  } catch (e) {
                    console.warn('read file content failed', e)
                    content = null
                  }
                  if (!content) {
                    uni.showToast({ title: `${fileName} 读取失败`, icon: 'none' })
                    continue
                  }
                  let extractedMeta = null
                  try {
                    const parsed = JSON.parse(content)
                    extractedMeta = this.extractMetadata(parsed, fileName)
                  } catch (err) {
                    uni.showToast({ title: `${fileName} 不是有效 JSON`, icon: 'none' })
                    continue
                  }
                  // push manifest entry with normalized content and metadata
                  this.manifest.push({ fileName, content, extractedMeta, tempPath: path })
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
                  // enhanced metadata extraction with multiple format support
                  let extractedMeta = null
                  try {
                    const parsed = JSON.parse(text)
                    extractedMeta = this.extractMetadata(parsed, fileName)
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
            const jsonFiles = collected.filter(item => item.fileName && item.fileName.toLowerCase().endsWith('.json'))
            if (jsonFiles.length > this.maxFiles) {
              uni.showModal({
                title: '文件数量过多',
                content: `单次最多支持 ${this.maxFiles} 个文件，当前目录包含 ${jsonFiles.length} 个 JSON 文件。`,
                showCancel: false
              })
              return
            }
            this.resetUploadState()
            this.manifest = jsonFiles
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

        // Performance optimization: allow large selections, then upload in server batches.
        const MAX_FILES = this.maxFiles
        if (files.length > MAX_FILES) {
          uni.showModal({
            title: '文件数量过多',
            content: `单次最多支持 ${MAX_FILES} 个文件，您选择了 ${files.length} 个文件。`,
            showCancel: false
          })
          return
        }

        this.manifest = []
        this.resetUploadState()
        uni.showLoading({ title: '正在处理文件...' })

        // Performance optimization: process files in chunks to avoid UI blocking
        const CHUNK_SIZE = 10
        const fileArray = Array.from(files)

        for (let i = 0; i < fileArray.length; i += CHUNK_SIZE) {
          const chunk = fileArray.slice(i, i + CHUNK_SIZE)
          await this.processFileChunk(chunk)

          // Update loading progress
          const progress = Math.round((i + chunk.length) / fileArray.length * 100)
          uni.showLoading({ title: `正在处理文件... ${progress}%` })

          // Allow UI to update between chunks
          await new Promise(resolve => setTimeout(resolve, 10))
        }

        uni.hideLoading()
        this.$forceUpdate() // Ensure UI updates
      } catch (err) {
        uni.hideLoading()
        console.error('onFilesChange error', err)
        uni.showToast({ title: '读取文件失败', icon: 'none' })
      }
    },

    // Process a chunk of files for better performance
    async processFileChunk(files) {
      const promises = files.map(async (f) => {
        const fileName = f.name
        if (!fileName.toLowerCase().endsWith('.json')) return null

        try {
          // Security and performance: limit file size
          const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
          if (f.size > MAX_FILE_SIZE) {
            throw new Error(`文件过大: ${fileName} (${Math.round(f.size / 1024 / 1024)}MB)`)
          }

          // Security: validate filename
          if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\') ||
              fileName.match(/[<>:"|?*]/)) {
            throw new Error(`文件名包含非法字符: ${fileName}`)
          }

          const text = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = err => reject(err)
            reader.readAsText(f)
          })

          const parsed = JSON.parse(text)
          const extractedMeta = this.extractMetadata(parsed, fileName)

          return {
            fileName,
            content: text,
            extractedMeta
          }
        } catch (err) {
          console.warn(`Failed to process file ${fileName}:`, err.message)
          return {
            fileName,
            content: '',
            extractedMeta: null,
            error: err.message
          }
        }
      })

      const results = await Promise.allSettled(promises)
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          this.manifest.push(result.value)
        }
      }
    },

    async startUpload() {
      if (!this.manifest || this.manifest.length === 0) {
        uni.showToast({ title: '请先选择文件', icon: 'none' })
        return
      }
      const validManifest = this.manifest.filter(item => this.validateMetadata(item).isValid && item.content)
      if (!validManifest.length) {
        uni.showToast({ title: '没有可上传的有效文件', icon: 'none' })
        return
      }
      try {
        this.uploadPending = true
        uni.showLoading({ title: '创建作业...' })
        // Deduplicate manifest by (relativePath + fileName) to avoid duplicate uploads
        const seen = new Set()
        const deduped = []
        for (const m of validManifest) {
          const key = `${m.relativePath || ''}::${m.fileName || ''}`
          if (!seen.has(key)) {
            seen.add(key)
            deduped.push(m)
          }
        }

        const res = await uniCloud.callFunction({
          name: 'bulkUpload',
          data: {
            action: 'createJob',
            totalFiles: deduped.length
          }
        })
        uni.hideLoading()
        const result = (res && res.result) ? res.result : res
        if (result && result.code === 0 && result.data && result.data.jobId) {
          this.jobId = result.data.jobId
          this.jobStatus = 'running'
          this.successCount = 0
          this.failCount = 0
          this.hasErrors = false
          await this.uploadInBatches(deduped)
        } else {
          this.uploadPending = false
          uni.showToast({ title: result.message || '作业创建失败', icon: 'none' })
        }
      } catch (err) {
        uni.hideLoading()
        this.uploadPending = false
        console.error('startUpload error', err)
        uni.showToast({ title: '上传失败', icon: 'none' })
      }
    },
    async uploadInBatches(files) {
      this.uploadBatchTotal = Math.ceil(files.length / this.uploadBatchSize)
      for (let i = 0; i < files.length; i += this.uploadBatchSize) {
        const batch = files.slice(i, i + this.uploadBatchSize)
        const batchIndex = Math.floor(i / this.uploadBatchSize) + 1
        const isLastBatch = i + this.uploadBatchSize >= files.length
        this.uploadBatchIndex = batchIndex
        uni.showLoading({ title: `上传中 ${batchIndex}/${this.uploadBatchTotal}` })

        const res = await uniCloud.callFunction({
          name: 'bulkUpload',
          data: {
            action: 'processBatch',
            jobId: this.jobId,
            batchIndex,
            isLastBatch,
            manifest: batch.map(m => ({
              fileName: m.fileName,
              relativePath: m.relativePath || null,
              content: m.content,
              extractedMeta: m.extractedMeta
            }))
          }
        })
        const result = (res && res.result) ? res.result : res
        if (!result || result.code !== 0) {
          this.jobStatus = 'failed'
          this.uploadPending = false
          uni.hideLoading()
          uni.showModal({
            title: '上传中断',
            content: `第 ${batchIndex} 批上传失败。已成功 ${this.successCount} 个，失败 ${this.failCount} 个。请刷新列表确认已入库数据。`,
            showCancel: false
          })
          return
        }
        this.successCount = result.data.successCount || this.successCount
        this.failCount = result.data.failCount || this.failCount
        if (this.failCount > 0) this.hasErrors = true
        this.jobStatus = result.data.status || (isLastBatch ? 'completed' : 'running')
        await new Promise(resolve => setTimeout(resolve, 80))
      }

      uni.hideLoading()
      this.uploadPending = false
      this.jobStatus = 'completed'
      await this.showCompletionSummary({
        totalFiles: files.length,
        successCount: this.successCount,
        failCount: this.failCount
      })
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
              this.uploadPending = false

              // Show detailed completion summary
              this.showCompletionSummary(rr.data)
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
          const csvHeader = 'fileName,errorType,error\n'
          const csvBody = rr.data.errors.map(e => [
            this.escapeCsvCell(e.fileName),
            this.escapeCsvCell(e.errorType || 'unknown_error'),
            this.escapeCsvCell(e.error || '')
          ].join(',')).join('\n')
          const csv = csvHeader + csvBody
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
    },
    // Show detailed completion summary
    async showCompletionSummary(jobData) {
      const totalFiles = jobData.totalFiles || 0
      const successCount = jobData.successCount || 0
      const failCount = jobData.failCount || 0

      let message = `批量上传完成\n成功: ${successCount}, 失败: ${failCount}`

      if (failCount > 0) {
        // Get detailed error breakdown
        try {
          const errorRes = await uniCloud.callFunction({
            name: 'bulkUpload',
            data: { action: 'getJobErrors', jobId: this.jobId }
          })
          const errorData = (errorRes && errorRes.result) ? errorRes.result : errorRes

          if (errorData && errorData.code === 0 && errorData.data && errorData.data.errors) {
            const errors = errorData.data.errors
            const errorTypes = {}

            // Categorize errors
            errors.forEach(error => {
              const type = error.errorType || 'unknown_error'
              errorTypes[type] = (errorTypes[type] || 0) + 1
            })

            const errorSummary = Object.entries(errorTypes)
              .map(([type, count]) => `${this.getErrorTypeLabel(type)}: ${count}`)
              .join('\n')

            message += `\n\n失败原因:\n${errorSummary}`
          }
        } catch (err) {
          console.warn('Failed to get detailed error summary:', err)
        }

        uni.showModal({
          title: '上传完成',
          content: message,
          confirmText: '查看详情',
          cancelText: '关闭',
          success: (res) => {
            if (res.confirm) {
              this.downloadErrors()
            }
          }
        })
      } else {
        uni.showToast({
          title: `上传完成: ${successCount}/${totalFiles} 成功`,
          icon: 'success',
          duration: 3000
        })
      }
    },
    // Get human-readable error type labels
    getErrorTypeLabel(errorType) {
      const labels = {
        'invalid_filename': '文件名无效',
        'empty_content': '内容为空',
        'invalid_json': 'JSON格式错误',
        'serialization_failed': '序列化失败',
        'invalid_content': '内容无效',
        'script_creation_failed': '剧本创建失败',
        'duplicate_title': '标题重复',
        'unknown_error': '未知错误'
      }
      return labels[errorType] || errorType
    },
    escapeCsvCell(value) {
      const text = value === undefined || value === null ? '' : String(value)
      return `"${text.replace(/"/g, '""')}"`
    },
    // UI: open preview modal for item index
    openPreview(index) {
      if (index === undefined || index === null) return
      const item = this.manifest[index]
      if (!item) return
      this.previewIndex = index
      this.previewModel = {
        title: (item.extractedMeta && item.extractedMeta.title) || '',
        author: (item.extractedMeta && item.extractedMeta.author) || '',
        description: (item.extractedMeta && item.extractedMeta.description) || '',
        tag: (item.extractedMeta && item.extractedMeta.tag) ? item.extractedMeta.tag : '',
        status: (item.extractedMeta && item.extractedMeta.status) || 'active'
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
      item.extractedMeta.tag = this.previewModel.tag || '娱乐'
      item.extractedMeta.status = this.previewModel.status
      this.manifest.splice(this.previewIndex, 1, item)
      this.previewVisible = false
      this.previewIndex = -1
    },
    // Validation methods with caching for performance
    validateMetadata(item) {
      if (!item || !item.fileName) return { isValid: false, issues: ['无效文件项'] }

      // Use cache to avoid repeated validation
      const cacheKey = `${item.fileName}_${item.extractedMeta ? JSON.stringify(item.extractedMeta) : 'no-meta'}`
      if (this.validationCache.has(cacheKey)) {
        return this.validationCache.get(cacheKey)
      }

      const result = this._validateMetadataUncached(item)
      this.validationCache.set(cacheKey, result)
      return result
    },
    _validateMetadataUncached(item) {
      if (!item.extractedMeta) return { isValid: false, issues: ['无元数据'] }

      const issues = []
      if (!item.extractedMeta.title || item.extractedMeta.title.trim() === '') {
        issues.push('缺少标题')
      }
      if (!item.extractedMeta.tag) {
        issues.push('缺少标签')
      }

      return {
        isValid: issues.length === 0,
        issues
      }
    },
    getValidFilesCount() {
      return this.manifest.filter(item => this.validateMetadata(item).isValid).length
    },
    getInvalidFilesCount() {
      return this.manifest.filter(item => !this.validateMetadata(item).isValid).length
    },
    resetUploadState() {
      if (this.pollTimer) clearInterval(this.pollTimer)
      this.pollTimer = null
      this.jobId = null
      this.jobStatus = null
      this.successCount = 0
      this.failCount = 0
      this.hasErrors = false
      this.uploadPending = false
      this.uploadBatchIndex = 0
      this.uploadBatchTotal = 0
    },
    cancelPreview() {
      this.previewVisible = false
      this.previewIndex = -1
    },

    // UI 辅助方法 — 仅显示激活/未激活
    getStatusClass(item) {
      if (!item.extractedMeta || !item.extractedMeta.status) return 'status-inactive'
      return item.extractedMeta.status === 'active' ? 'status-active' : 'status-inactive'
    },

    getStatusText(item) {
      if (!item.extractedMeta || !item.extractedMeta.status) return '未激活'
      return item.extractedMeta.status === 'active' ? '激活' : '未激活'
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
      const total = this.getValidFilesCount()
      if (total === 0) return 0
      return Math.min(100, Math.round((this.totalProcessed / total) * 100))
    }
  }
}
</script>

<style scoped>
/* 主容器 */
.bulk-upload-container {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}

/* 面板头部 */
.panel-header {
  background: #fff;
  padding: 16px 20px;
  color: #303133;
  border-bottom: 1px solid #ebeef5;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-info {
  flex: 1;
}

.title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
  display: block;
  color: #303133;
}

.subtitle {
  font-size: 13px;
  color: #909399;
  display: block;
}

/* 区域标题 */
.section-title {
  padding: 14px 20px;
  border-bottom: 1px solid #ebeef5;
  background: #fafafa;
}

.section-title-text {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
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
  background: #fff;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  padding: 16px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 12px;
}

.option-card:hover {
  border-color: #409eff;
  background: #f5f7fa;
}

.option-icon {
  min-width: 54px;
  height: 30px;
  line-height: 30px;
  text-align: center;
  background: #ecf5ff;
  color: #409eff;
  border-radius: 4px;
  font-size: 13px;
  display: block;
}

.option-content {
  text-align: left;
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
  padding: 10px 12px;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.file-stats {
  display: flex;
  justify-content: center;
  gap: 12px;
  text-align: center;
}

.stats-text {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.stats-text.error {
  color: #f56c6c;
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
  padding: 10px 0;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-bottom: none;
  font-size: 12px;
  color: #606266;
  font-weight: 600;
}

.header-cell {
  padding: 0 8px;
}

.file-select {
  width: 60px;
  text-align: center;
}

.file-index {
  width: 40px;
  text-align: center;
}

.file-name {
  flex: 1.5;
}

.file-title {
  flex: 1.5;
}

.file-author {
  flex: 1;
}

.file-tags {
  flex: 1.5;
}

.file-status {
  width: 80px;
}

/* Tags styles */
.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-height: 60px;
  overflow: hidden;
}

.tag-chip {
  background-color: #e6f7ff;
  color: #1890ff;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  white-space: nowrap;
}

.no-tags {
  color: #999;
  font-size: 12px;
  font-style: italic;
}

.author-text, .title-text {
  font-size: 13px;
  line-height: 1.4;
  word-break: break-word;
}

.validation-error {
  color: #ff4d4f;
  font-weight: 500;
}

/* Form enhancements for preview modal */
.tags-input-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.current-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-item {
  display: flex;
  align-items: center;
  background-color: #e6f7ff;
  color: #1890ff;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.tag-text {
  margin-right: 4px;
}

.tag-remove {
  cursor: pointer;
  color: #1890ff;
  font-weight: bold;
}

.tag-remove:hover {
  color: #40a9ff;
}

.tag-input {
  margin-top: 4px;
}

.radio-group {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.radio-option {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px 0;
}

.radio-indicator {
  width: 16px;
  height: 16px;
  border: 2px solid #d9d9d9;
  border-radius: 4px;
  margin-right: 8px;
  position: relative;
}

.radio-indicator.active {
  border-color: #1890ff;
}

.radio-indicator.active::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 8px;
  height: 8px;
  background-color: #1890ff;
  border-radius: 2px;
}

.radio-text {
  font-size: 14px;
  color: #262626;
}

/* Bulk actions styles */
.bulk-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 16px;
}

.bulk-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selection-count {
  font-size: 14px;
  color: #666;
}

.bulk-edit-controls {
  display: flex;
  gap: 8px;
}

/* Checkbox styles */
.checkbox-container {
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
}

.checkbox-container input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

.checkmark {
  width: 16px;
  height: 16px;
  border: 2px solid #d9d9d9;
  border-radius: 3px;
  background-color: white;
  margin-right: 8px;
  position: relative;
  transition: all 0.2s ease;
}

.checkbox-container input[type="checkbox"]:checked ~ .checkmark {
  background-color: #1890ff;
  border-color: #1890ff;
}

.checkbox-container input[type="checkbox"]:checked ~ .checkmark::after {
  content: '';
  position: absolute;
  top: 1px;
  left: 5px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-label {
  font-size: 14px;
  color: #262626;
}

/* Bulk action buttons */
.bulk-edit-btn, .bulk-set-tags-btn {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid #1890ff;
  background-color: #1890ff;
  color: white;
  transition: all 0.2s ease;
}

.bulk-edit-btn:hover, .bulk-set-tags-btn:hover {
  background-color: #40a9ff;
  border-color: #40a9ff;
}

/* File select column */
.file-select {
  width: 60px;
  text-align: center;
}

/* Validation summary styles */
.validation-summary {
  padding: 12px 16px;
  background-color: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 8px;
  margin-bottom: 16px;
}

.summary-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value.valid {
  color: #52c41a;
  font-size: 18px;
  font-weight: 600;
}

.stat-value.invalid {
  color: #ff4d4f;
  font-size: 18px;
  font-weight: 600;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

.validation-hint {
  padding-top: 8px;
  border-top: 1px solid #d9d9d9;
}

.hint-text {
  font-size: 13px;
  color: #faad14;
}

.file-actions {
  width: 80px;
  text-align: center;
}

.file-list-body {
  max-height: 420px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
}

.file-item {
  border-bottom: 1px solid #ebeef5;
}

.file-item:last-child {
  border-bottom: none;
}

.file-row {
  display: flex;
  align-items: center;
  padding: 10px 0;
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
  /* Ensure single-line inputs render text fully */
  min-height: 40px;
  height: 40px;
  line-height: 20px;
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


