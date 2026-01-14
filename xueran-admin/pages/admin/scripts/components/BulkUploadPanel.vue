<template>
  <view class="bulk-upload-panel">
    <view class="panel-header">
      <text class="title">批量上传</text>
    </view>
    <view class="panel-body">
      <text>选择多个 JSON 文件（H5 支持），或在原生 App 中使用客户端文件夹选择。</text>
      <input id="bulk-file-input" ref="fileInput" type="file" multiple accept=".json,.zip" @change="onFilesChange" style="display:none" />
      <input id="bulk-folder-input" ref="folderInput" type="file" webkitdirectory directory multiple @change="onFilesChange" style="display:none" />
      <button class="uni-button" type="primary" @click="triggerFolderInput">选择文件夹</button>
      <button class="uni-button" type="primary" @click="triggerFileInput">选择文件</button>
      <button class="uni-button" type="primary" @click="startUpload" :disabled="manifest.length === 0">开始上传</button>

      <view class="manifest-preview" v-if="manifest.length">
        <view v-for="(item, idx) in manifest" :key="idx" class="manifest-item">
          <text>{{ idx + 1 }}. {{ item.fileName }} - {{ item.extractedMeta && item.extractedMeta.title ? item.extractedMeta.title : '（无 title）' }}</text>
        </view>
      </view>
      <view class="progress" v-if="jobId">
        <text>作业：{{ jobId }} 状态：{{ jobStatus }}  成功：{{ successCount }} 失败：{{ failCount }}</text>
        <button class="uni-button" @click="downloadErrors" v-if="hasErrors">下载失败详情</button>
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
      conflictStrategy: 'skip' // default
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
          uni.showToast({ title: result.message || '作业创建失败', icon: 'none' })
        }
      } catch (err) {
        uni.hideLoading()
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
  }
}
</script>

<style scoped>
.bulk-upload-panel { padding: 8px; background: #fff; border-radius: 6px; }
.panel-header .title { font-weight: bold; margin-bottom: 8px; display: block; }
.panel-body { padding: 8px 0; }
</style>


