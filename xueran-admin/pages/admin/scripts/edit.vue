<template>
  <view class="uni-container">
    <uni-forms ref="form" v-model="formData" :rules="rules" validateTrigger="bind" @submit="submit">
      <uni-forms-item name="title" label="剧本名" required>
        <uni-easyinput v-model="formData.title" placeholder="请输入剧本名" />
      </uni-forms-item>

      <uni-forms-item name="author" label="作者" required>
        <uni-easyinput v-model="formData.author" placeholder="请输入作者名" />
      </uni-forms-item>

      <uni-forms-item name="version" label="版本">
        <uni-easyinput v-model="formData.version" placeholder="请输入版本号" />
      </uni-forms-item>

      <uni-forms-item name="tag" label="标签">
        <uni-data-picker
          v-model="formData.tag"
          :localdata="tagOptions"
          placeholder="请选择标签"
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

      <uni-forms-item name="playerCount" label="玩家人数">
        <uni-easyinput v-model="formData.playerCount" placeholder="如 8-12人" />
      </uni-forms-item>

      <uni-forms-item name="difficulty" label="难度">
        <uni-easyinput v-model="formData.difficulty" placeholder="简单/中等/困难" />
      </uni-forms-item>

      <uni-forms-item name="usageCount" label="使用次数">
        <uni-easyinput
          type="number"
          v-model.number="formData.usageCount"
          placeholder="请输入使用次数"
        />
      </uni-forms-item>

      <uni-forms-item name="jsonFile" label="JSON 源文件">
        <view class="upload-section">
          <!-- 如果已有 json，显示文件信息和预览/删除，否则显示上传区域 -->
          <view v-if="formData.jsonFile && (formData.jsonFile.url || formData.jsonFile.name || formData.jsonFile.fileId)" class="json-preview">
            <view class="file-meta">
              <view class="upload-icon">📄</view>
              <view class="file-name">{{ formData.jsonFile.name || formData.jsonFile.url || formData.jsonFile.fileId }}</view>
            </view>
            <view class="file-actions">
              <button class="uni-button" size="mini" type="primary" @click="previewJson">预览</button>
              <button class="uni-button" size="mini" @click="removeJson">移除</button>
            </view>
          </view>
          <view v-else>
            <uni-file-picker
              v-model="formData.jsonFile"
              return-type="object"
              file-mediatype="all"
              :file-extname="['json']"
              limit="1"
              mode="list"
                @select="onJsonSelect"
                @success="onJsonUploadSuccess"
              @fail="onUploadFail"
            >
              <view class="upload-box">
                <view class="upload-icon">📄</view>
                <view class="upload-text">选择 JSON 文件（最大1MB）</view>
              </view>
            </uni-file-picker>
          </view>
        </view>
      </uni-forms-item>

      <uni-forms-item name="images" label="剧本图片（0-3张）">
        <view class="images-section">
          <uni-file-picker
            v-model="formData.images"
            file-mediatype="image"
            mode="grid"
            :image-styles="{ width: 120, height: 80 }"
            limit="3"
            @success="onImageUploadSuccess"
            @fail="onUploadFail"
            @delete="onImageDelete"
          />
        </view>
      </uni-forms-item>

      <view class="uni-button-group">
        <button type="primary" class="uni-button" @click="submitForm">
          {{ id ? '保存' : '创建' }}
        </button>
        <navigator open-type="navigateBack" style="margin-left: 15px;">
          <button class="uni-button">取消</button>
        </navigator>
      </view>
    </uni-forms>
  </view>
</template>

<script>
export default {
	data() {
		return {
			id: null,
			formData: {
				title: '',
				author: '',
				version: '1.0',
				description: '',
				playerCount: '8-12',
				difficulty: '中等',
				usageCount: 0,
				tag: '娱乐',
				jsonFile: null,
				images: []
			},
			rules: {
				title: {
					rules: [{
						required: true,
						errorMessage: '请输入剧本名'
					}]
				},
				author: {
					rules: [{
						required: true,
						errorMessage: '请输入作者名'
					}]
				},
				usageCount: {
					rules: [{
						min: 0,
						type: 'number',
						errorMessage: '使用次数必须大于等于0'
					}]
				}
			},
			tagOptions: [
				{ value: '娱乐', text: '娱乐' },
				{ value: '推理', text: '推理' },
				{ value: '恐怖', text: '恐怖' },
				{ value: '情感', text: '情感' },
				{ value: '其他', text: '其他' }
			]
		}
	},
	computed: {
		pageTitle() {
			return (this.id && String(this.id).trim()) ? '编辑剧本' : '新增剧本';
		}
	},
	methods: {
		// 触发表单提交
		submitForm() {
			this.$refs.form.submit();
		},

		// 表单提交
		submit(event) {
			const { value, errors } = event.detail;
			if (errors) return;
			this.saveScript(value);
		},

		// 保存剧本数据
		async saveScript(formValue) {
			try {
				uni.showLoading({ title: '保存中...', mask: true });
				const payload = {
					title: formValue.title,
					author: formValue.author,
					version: formValue.version,
					updateTime: Date.now(),
					description: formValue.description,
					playerCount: formValue.playerCount,
					difficulty: formValue.difficulty,
					usageCount: formValue.usageCount || 0,
					tag: formValue.tag || '娱乐',
					likes: formValue.likes || 0
				};
				const imageFileIds = (formValue.images || []).map(i => i.fileId).filter(Boolean);
				const thumbnails = (formValue.images || []).map(i => i.thumbFileId).filter(Boolean);
				const jsonFileId = (formValue.jsonFile && formValue.jsonFile.fileId) ? formValue.jsonFile.fileId : null;

				let res;
				if (this.id) {
					res = await uniCloud.callFunction({
						name: 'adminScript',
						data: { action: 'update', id: this.id, payload, jsonFileId, jsonContent: this.formData.jsonContent, imageFileIds, thumbnails }
					});
				} else {
					res = await uniCloud.callFunction({
						name: 'adminScript',
						data: { action: 'create', payload, jsonFileId, jsonContent: this.formData.jsonContent, imageFileIds, thumbnails }
					});
				}

				uni.hideLoading();
				const result = (res && res.result) ? res.result : res;
				if (result && result.code === 0) {
					uni.showToast({ title: '保存成功', icon: 'success' });
					this.getOpenerEventChannel().emit('refreshData');
					setTimeout(() => uni.navigateBack(), 500);
				} else {
					uni.showToast({ title: result.errMsg || '保存失败', icon: 'none' });
				}
			} catch (err) {
				uni.hideLoading();
				console.error('saveScript error', err);
				uni.showToast({ title: '保存失败', icon: 'none' });
			}
		},

		// JSON上传成功处理
		onJsonUploadSuccess(res) {
			console.log('JSON upload success:', res);
			if (res && res.tempFilePath) uni.showToast({ title: 'JSON 上传成功', icon: 'success' });
		},

		// 图片上传成功处理
		onImageUploadSuccess(res) {
			console.log('Image upload success:', res);
			if (res && res.tempFilePaths && res.tempFilePaths.length > 0) uni.showToast({ title: '图片上传成功', icon: 'success' });
		},

		// 图片删除处理
		onImageDelete(res) {
			console.log('Image delete:', res);
		},

		// 上传失败处理
		onUploadFail(err) {
			console.error('Upload fail:', err);
			uni.showToast({ title: '上传失败', icon: 'none' });
		},

		// 加载单条剧本数据并填充表单
		async loadScriptData(id) {
			try {
				uni.showLoading({ title: '加载中...' });
				const res = await uniCloud.callFunction({ name: 'getScript', data: { id } });
				uni.hideLoading();
				console.log('getScript raw response:', res);
				const payload = (res && res.result) ? res.result : res;
				console.log('getScript payload:', payload);
				if (res && res.result && res.result.code === 0 && res.result.data && res.result.data.length > 0) {
					const script = res.result.data[0];
					console.log('fetched script:', script);
					// 规范化 images 为 {url,...} 格式，jsonFile 也尽量统一为 object
					const normalizedImages = (script.images || []).map(img => {
						if (!img) return null;
						if (typeof img === 'string') return { url: img };
						if (typeof img === 'object') {
							// keep url or construct from thumbnail/fileId if present
							if (img.url) return img;
							if (img.fileId) return { url: img.fileId, fileId: img.fileId };
							return img;
						}
						return null;
					}).filter(Boolean);

					let normalizedJson = null;
					if (script.jsonFile) {
						if (typeof script.jsonFile === 'string') {
							normalizedJson = { url: script.jsonFile };
						} else if (typeof script.jsonFile === 'object') {
							normalizedJson = script.jsonFile;
						}
					}

					this.formData = {
						title: script.title || '',
						author: script.author || '',
						version: script.version || '1.0',
						description: script.description || '',
						playerCount: script.playerCount || '8-12',
						difficulty: script.difficulty || '中等',
						usageCount: script.usageCount || 0,
						tag: script.tag || '娱乐',
						jsonFile: normalizedJson,
						images: normalizedImages
					};
				} else {
					uni.showToast({ title: '加载数据失败', icon: 'none' });
				}
			} catch (err) {
				uni.hideLoading();
				console.error('loadScriptData error', err);
				uni.showToast({ title: '加载数据失败', icon: 'none' });
			}
		},

		previewJson() {
			const jf = this.formData.jsonFile;
			if (!jf) return;
			// 如果有可直接访问的 url，打开新窗口
			if (jf.url && typeof jf.url === 'string') {
				try {
					window.open(jf.url, '_blank');
				} catch (e) {
					uni.showToast({ title: '打开失败', icon: 'none' });
				}
				return;
			}
			// 如果存在 fileId，尝试下载并打开
			if (jf.fileId) {
				uni.showLoading({ title: '加载中...' });
				uniCloud.downloadFile({ fileID: jf.fileId }).then(res => {
					uni.hideLoading();
					if (res && res.tempFilePath) {
						uni.openDocument({ filePath: res.tempFilePath });
					} else {
						uni.showToast({ title: '无法打开文件', icon: 'none' });
					}
				}).catch(err => {
					uni.hideLoading();
					console.error('previewJson download error', err);
					uni.showToast({ title: '下载失败', icon: 'none' });
				});
				return;
			}
			uni.showToast({ title: '无可预览文件', icon: 'none' });
		},

		removeJson() {
			this.formData.jsonFile = null;
		},
		
		// JSON 选择事件（尝试读取并保留原始内容）
		async onJsonSelect(files) {
			if (!files || !files.length) return;
			const file = files[0];
			// try fetch by url (H5)
			try {
				if (file.url && typeof fetch === 'function') {
					const resp = await fetch(file.url);
					if (resp.ok) {
						const text = await resp.text();
						try {
							this.formData.jsonContent = JSON.parse(text);
						} catch (e) {
							// keep raw text if not json
							this.formData.jsonContent = text;
						}
						console.log('jsonContent loaded from url', this.formData.jsonContent);
						this._applyJsonToForm(this.formData.jsonContent);
						return;
					}
				}
			} catch (e) {
				console.warn('onJsonSelect fetch failed', e);
			}
			// Try read via local FS for native
			try {
				const fs = uni.getFileSystemManager && uni.getFileSystemManager();
				if (fs && file.tempFilePath) {
					const content = fs.readFileSync ? fs.readFileSync(file.tempFilePath, 'utf8') : null;
					if (content) {
						try {
							this.formData.jsonContent = JSON.parse(content);
						} catch (e) {
							this.formData.jsonContent = content;
						}
						this._applyJsonToForm(this.formData.jsonContent);
					}
				}
			} catch (e) {
				console.warn('onJsonSelect readFile failed', e);
			}
		},

		// 将 json 内容中的字段应用到表单（只在对应表单项为空时填充）
		_applyJsonToForm(json) {
			if (!json || typeof json !== 'object') return;
			const title = json.title || json.name || json.scriptName || json.titleName;
			const author = json.author || json.authorName || json.creator;
			const description = json.description || json.intro || json.summary;
			if (title && !this.formData.title) this.formData.title = title;
			if (author && !this.formData.author) this.formData.author = author;
			if (description && !this.formData.description) this.formData.description = description;
		},

	},
	async onLoad(options) {
		if (options && options.id) {
			this.id = options.id;
			await this.loadScriptData(this.id);
		}
		// set navigation bar / document title to match pageTitle
		try {
			const title = this.pageTitle;
			if (typeof uni !== 'undefined' && uni.setNavigationBarTitle) {
				uni.setNavigationBarTitle({ title });
			}
			if (typeof document !== 'undefined' && document.title !== undefined) {
				document.title = title;
			}
		} catch (e) {
			console.warn('set title failed', e);
		}
	}
};
</script>

<style lang="scss" scoped>
.upload-section {
  .upload-box {
    border: 1px dashed #d9d9d9;
    padding: 20px;
    border-radius: 6px;
    text-align: center;
    cursor: pointer;
    background-color: #fafafa;
    transition: all 0.3s;

    &:hover {
      border-color: #1890ff;
      background-color: #f0f8ff;
    }

    .upload-icon {
      font-size: 32px;
      color: #1890ff;
      margin-bottom: 8px;
    }

    .upload-text {
      color: #666;
      font-size: 14px;
    }

    .file-info {
      margin-top: 8px;
      color: #52c41a;
      font-size: 12px;
    }
  }
}

// 表单项标签宽度调整
::v-deep .uni-forms-item__label {
  width: 100px !important;
}

// 文件上传区域样式
.upload-section {
  ::v-deep .uni-file-picker__files-list {
    margin-top: 10px;
  }
}

// 图片上传区域样式
.images-section {
  ::v-deep .uni-file-picker__files-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  ::v-deep .uni-file-picker__file {
    width: 120px;
    height: 80px;
  }
}

// 适应不同屏幕尺寸
@media (min-width: 768px) {
  .images-section {
    ::v-deep .uni-file-picker__file {
      width: 140px;
      height: 94px;
    }
  }
}
</style>


