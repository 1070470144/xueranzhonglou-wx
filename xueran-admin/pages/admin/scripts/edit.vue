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
          clearIcon="true"
        />
      </uni-forms-item>

      <uni-forms-item name="status" label="状态" required>
        <uni-data-picker
          v-model="formData.status"
          :localdata="statusOptions"
          placeholder="请选择剧本状态"
          clearIcon="false"
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
      <uni-forms-item name="likes" label="点赞数">
        <uni-easyinput
          type="number"
          v-model.number="formData.likes"
          placeholder="请输入点赞数"
        />
      </uni-forms-item>

      <uni-forms-item name="jsonFile" label="JSON 源文件" v-if="!id">
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

      <!-- JSON内容预览（Ant Design 风格） -->
      <uni-forms-item name="jsonContent" label="JSON内容预览" v-if="formData.jsonContent">
        <view class="ant-card" role="region" aria-label="JSON 预览">
          <view class="ant-card-head">
            <view class="ant-card-head-title">JSON 内容预览</view>
            <view class="ant-card-head-extra">
              <button class="ant-btn ant-btn-text" @click="showJsonDetail = !showJsonDetail" title="展开/收起">
                {{ showJsonDetail ? '收起' : '展开' }}
              </button>
            </view>
          </view>
          <view class="ant-card-body" v-if="showJsonDetail">
            <textarea
              v-model="jsonContentText"
              readonly
              class="json-textarea"
              placeholder="JSON内容将在这里显示"
            />
          </view>
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
			showJsonDetail: false,
			formData: {
				title: '',
				author: '',
				version: '1.0',
				description: '',
				playerCount: '8-12',
				difficulty: '中等',
				usageCount: 0,
				likes: 0,
				tag: '娱乐',
				status: 'published',
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
				},
				likes: {
					rules: [{
						min: 0,
						type: 'number',
						errorMessage: '点赞数必须大于等于0'
					}]
				},
				tag: {
					rules: [{
						required: true,
						errorMessage: '请选择标签'
					}, {
						validateFunction: function(rule, value, data, callback) {
							if (value !== '推理' && value !== '娱乐') {
								callback('标签只能选择推理或娱乐')
							} else {
								callback()
							}
						}
					}]
				},
				status: {
					rules: [{
						required: true,
						errorMessage: '请选择剧本状态'
					}, {
						validateFunction: function(rule, value, data, callback) {
							const validStatuses = ['inactive', 'published', 'pending', 'rejected'];
							if (!validStatuses.includes(value)) {
								callback('状态只能选择已上架、待审核、已拒绝或已下架')
							} else {
								callback()
							}
						}
					}]
				}
			},
			tagOptions: [
				{ value: '推理', text: '推理' },
				{ value: '娱乐', text: '娱乐' }
			],
			statusOptions: [
				{ value: 'published', text: '已上架' },
				{ value: 'pending', text: '待审核' },
				{ value: 'rejected', text: '已拒绝' },
				{ value: 'inactive', text: '已下架' }
			]
		}
	},
	computed: {
		pageTitle() {
			return (this.id && String(this.id).trim()) ? '编辑剧本' : '新增剧本';
		},
		jsonContentText() {
			if (!this.formData.jsonContent) return '';
			try {
				return JSON.stringify(this.formData.jsonContent, null, 2);
			} catch (e) {
				return String(this.formData.jsonContent);
			}
		}
	},
	methods: {
		getReviewFieldsByStatus(status) {
			if (status === 'pending') {
				return { reviewStatus: 'pending', reviewReason: '' };
			}
			if (status === 'rejected') {
				return { reviewStatus: 'rejected' };
			}
			if (status === 'published' || status === 'active') {
				return { reviewStatus: 'approved', reviewReason: '' };
			}
			return {};
		},

		normalizeStatusForForm(status) {
			return status === 'active' ? 'published' : (status || 'published');
		},

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
					status: this.normalizeStatusForForm(formValue.status),
					likes: formValue.likes || 0
				};
				const reviewFields = this.getReviewFieldsByStatus(payload.status);
				// normalize image entries to support various uploader return shapes (fileId, fileID, url, path, string)
				const normalizedImages = (formValue.images || []).map(img => {
					if (!img) return null;
					if (typeof img === 'string') return { url: img };
					return {
						fileId: img.fileId || img.fileID || img.id || null,
						url: img.url || img.path || img.tempFilePath || (img.tempFilePaths && img.tempFilePaths[0]) || null,
						name: img.name || null,
						thumbFileId: img.thumbFileId || img.thumbFileID || img.thumb || null
					};
				}).filter(Boolean);
				// prefer fileId, fall back to url (CDN URL is acceptable as fileId for storage reference)
				const imageFileIds = normalizedImages.map(i => i.fileId || i.url).filter(Boolean);
				const thumbnails = normalizedImages.map(i => i.thumbFileId || i.thumb || i.url).filter(Boolean);
				// debug log to ensure uploader returned expected ids
				console.log('saving images array (normalized):', normalizedImages, 'imageFileIds =>', imageFileIds, 'thumbnails =>', thumbnails);
				let jsonFileId = null;
				if (formValue.jsonFile) {
					jsonFileId = formValue.jsonFile.fileId || formValue.jsonFile.fileID || formValue.jsonFile.url || null;
				}

				let res;
				// ensure jsonContent is a plain object (not a Vue Proxy) for transmission
				let jsonContentForSend = null;
				try {
					if (this.formData.jsonContent !== undefined && this.formData.jsonContent !== null) {
						const parsed = JSON.parse(JSON.stringify(this.formData.jsonContent));
						// 如果是对象或数组，转换为JSON字符串；如果是字符串，直接使用
						jsonContentForSend = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
					}
				} catch (e) {
					console.warn('jsonContent stringify failed', e);
					jsonContentForSend = this.formData.jsonContent;
				}
				console.log('saveScript payload debug', { payload, jsonFileId, jsonContent: jsonContentForSend, imageFileIds, thumbnails });
				console.log('saveScript mode check - this.id:', this.id, 'jsonFileId:', jsonFileId);
				if (this.id) {
					console.log('Using scriptManager.update for existing script');
					res = await uniCloud.callFunction({
						name: 'scriptManager',
						data: {
							action: 'update',
							id: this.id,
							title: payload.title,
							author: payload.author,
							version: payload.version,
							description: payload.description,
							content: jsonContentForSend || '',
							tag: payload.tag,
							status: payload.status,
							...reviewFields,
							images: normalizedImages.map(img => ({
								fileId: img.fileId || img.fileID,
								url: img.url || img.fileId || img.fileID
							}))
							,
							usageCount: payload.usageCount,
							likes: payload.likes
						}
					});
				} else {
					// 新增模式
					if (this.formData.jsonFile && (this.formData.jsonFile.tempFilePath || this.formData.jsonFile.path)) {
						// 如果有JSON文件，使用upload API
						res = await uniCloud.callFunction({
							name: 'scriptManager',
							data: {
								action: 'upload',
								filePath: this.formData.jsonFile.tempFilePath || this.formData.jsonFile.path,
								title: payload.title,
								content: jsonContentForSend || '',
								author: payload.author,
								status: payload.status,
								...reviewFields,
								description: payload.description,
								tag: payload.tag,
								tags: payload.tag ? [payload.tag] : []
								,
								usageCount: payload.usageCount,
								likes: payload.likes
							}
						});
					} else {
						// 如果没有文件，使用create API
						res = await uniCloud.callFunction({
							name: 'scriptManager',
							data: {
								action: 'create',
								title: payload.title,
								content: jsonContentForSend || '',
								author: payload.author,
								status: payload.status,
								...reviewFields,
								description: payload.description,
								tag: payload.tag,
								tags: payload.tag ? [payload.tag] : [],
								images: normalizedImages.map(img => ({
									fileId: img.fileId || img.fileID,
									url: img.url || img.fileId || img.fileID
								}))
								,
								usageCount: payload.usageCount,
								likes: payload.likes
							}
						});
					}
				}

				uni.hideLoading();
				const result = (res && res.result) ? res.result : res;
				console.log('saveScript result:', result);
				if (result && result.code === 0) {
					uni.showToast({ title: '保存成功', icon: 'success' });
					// 设置列表页面的刷新标记
					uni.setStorageSync('scriptListNeedRefresh', true);
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
		async onJsonUploadSuccess(res) {
			console.log('JSON upload success:', res);
			uni.showToast({ title: 'JSON 上传成功', icon: 'success' });
			// Normalize possible locations of uploaded file URL / fileID
			let url = null;
			let fileId = null;
			if (!res) return;
			// uni.uploadFile-like response may include fileID or tempFilePath/tempFilePaths
			if (res.tempFilePath) url = res.tempFilePath;
			if (!url && res.tempFilePaths && res.tempFilePaths.length) url = res.tempFilePaths[0];
			if (!url && res.tempFiles && res.tempFiles.length && res.tempFiles[0].path) url = res.tempFiles[0].path;
			if (res.fileID) fileId = res.fileID;
			// set json file meta
			this.formData.jsonFile = { url, fileId, name: (res && res.name) || null };
			// try to load content from url or by downloading via fileId
			// First try fetch()
			if (url) {
				try {
					console.log('attempt fetch url:', url);
					if (typeof fetch === 'function') {
						const r = await fetch(url);
						if (r && r.ok) {
							const text = await r.text();
							try {
								this.formData.jsonContent = JSON.parse(text);
							} catch (e) {
								this.formData.jsonContent = text;
							}
							console.log('jsonContent loaded via fetch');
							this._applyJsonToForm(this.formData.jsonContent);
							return;
						} else {
							console.warn('fetch returned not ok', r && r.status);
						}
					}
				} catch (e) {
					console.warn('fetch json upload url failed', e);
				}
				// try uni.request as fallback (better CORS handling in uni-app)
				try {
					console.log('attempt uni.request url:', url);
					const uniReq = await new Promise((resolve, reject) => {
						uni.request({
							url,
							method: 'GET',
							success: resReq => resolve(resReq),
							fail: errReq => reject(errReq)
						});
					});
					if (uniReq && (uniReq.statusCode === 200 || uniReq.statusCode === 0)) {
						const text = uniReq.data;
						try {
							this.formData.jsonContent = typeof text === 'string' ? JSON.parse(text) : text;
						} catch (e) {
							this.formData.jsonContent = text;
						}
						console.log('jsonContent loaded via uni.request');
						this._applyJsonToForm(this.formData.jsonContent);
						return;
					} else {
						console.warn('uni.request failed status', uniReq && uniReq.statusCode);
					}
				} catch (e) {
					console.warn('uni.request failed', e);
				}
			}
			// fallback: if have fileId, try uniCloud.downloadFile
			if (fileId) {
				try {
					console.log('attempt downloadFile fileID:', fileId);
					uni.showLoading({ title: '读取 JSON...' });
					const dl = await uniCloud.downloadFile({ fileID: fileId });
					uni.hideLoading();
					if (dl && dl.tempFilePath) {
						try {
							const fs = uni.getFileSystemManager && uni.getFileSystemManager();
							if (fs && fs.readFileSync) {
								const content = fs.readFileSync(dl.tempFilePath, 'utf8');
								try {
									this.formData.jsonContent = JSON.parse(content);
								} catch (e) {
									this.formData.jsonContent = content;
								}
								console.log('jsonContent loaded via downloadFile');
								this._applyJsonToForm(this.formData.jsonContent);
								return;
							}
						} catch (e) {
							console.warn('read downloaded json failed', e);
						}
					}
				} catch (e) {
					uni.hideLoading();
					console.warn('downloadFile failed', e);
				}
			}
			console.warn('could not load json content for uploaded file');
		},

		// 图片上传成功处理
		onImageUploadSuccess(res) {
			console.log('Image upload success raw:', res);
			try {
				// Normalize the current formData.images array to consistent objects
				const normalizeEntry = (img) => {
					if (!img) return null;
					if (typeof img === 'string') return { url: img };
					return {
						fileId: img.fileId || img.fileID || img.id || null,
						url: img.url || img.path || img.tempFilePath || (img.tempFilePaths && img.tempFilePaths[0]) || null,
						name: img.name || null,
						thumbFileId: img.thumbFileId || img.thumbFileID || img.thumb || null
					};
				};

				// If uni-file-picker auto-updated v-model, use that; otherwise try to extract from callback
				let current = Array.isArray(this.formData.images) ? this.formData.images.slice() : [];

				// If callback provided explicit file info, merge/append it
				if (res) {
					const candidates = Array.isArray(res) ? res : (res.tempFiles || res.tempFilePaths || res.tempFilePath || res.fileID ? [res] : []);
					if (candidates && candidates.length) {
						candidates.forEach(c => {
							const e = normalizeEntry(c);
							if (e) current.push(e);
						});
					}
				}

				// normalize any existing entries
				current = current.map(normalizeEntry).filter(Boolean);
				// dedupe by fileId or url
				const seen = new Set();
				const deduped = [];
				for (const it of current) {
					const key = it.fileId || it.url || JSON.stringify(it);
					if (!seen.has(key)) {
						seen.add(key);
						deduped.push(it);
					}
				}
				this.formData.images = deduped.slice(0, 3);
				if (deduped.length) uni.showToast({ title: '图片上传成功', icon: 'success' });
			} catch (e) {
				console.warn('onImageUploadSuccess normalize failed', e, res);
				uni.showToast({ title: '图片上传处理异常', icon: 'none' });
			}
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
				const res = await uniCloud.callFunction({ name: 'scriptManager', data: { action: 'get', id } });
				uni.hideLoading();
				console.log('scriptManager raw response:', res);
				const payload = (res && res.result) ? res.result : res;
				console.log('scriptManager payload:', payload);
				if (res && res.result && res.result.code === 0 && res.result.data) {
					const script = res.result.data;
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

					// 解析content字段为jsonContent
					let parsedJsonContent = null;
					if (script.content) {
						try {
							parsedJsonContent = typeof script.content === 'string' ? JSON.parse(script.content) : script.content;
						} catch (e) {
							console.warn('Failed to parse content as JSON:', e);
							parsedJsonContent = script.content;
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
						likes: script.likes || 0,
						tag: script.tag || '娱乐',
						status: this.normalizeStatusForForm(script.status),
						jsonFile: normalizedJson,
						images: normalizedImages,
						jsonContent: parsedJsonContent
					};

					// 如果有jsonContent，应用到表单
					if (parsedJsonContent) {
						this._applyJsonToForm(parsedJsonContent);
					}
				} else {
					uni.showToast({ title: '加载数据失败1', icon: 'none' });
				}
			} catch (err) {
				uni.hideLoading();
				console.error('loadScriptData error', err);
				uni.showToast({ title: '加载数据失败2', icon: 'none' });
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

		// 复制/下载功能已删除，应按规范不提供该操作

		// 将 json 内容中的字段应用到表单（只在对应表单项为空时填充）
		_applyJsonToForm(json) {
			if (!json) return;
			let meta = json;
			// if json is an array, try to find _meta or use first element
			if (Array.isArray(json)) {
				meta = json.find(item => item && item.id === '_meta') || json[0] || {};
			}
			if (!meta || typeof meta !== 'object') return;
			const title = meta.title || meta.name || meta.scriptName || meta.titleName;
			const author = meta.author || meta.authorName || meta.creator;
			const description = meta.description || meta.intro || meta.summary;
			if (title) this.formData.title = title;
			if (author) this.formData.author = author;
			if (description) this.formData.description = description;
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

// JSON预览样式
.ant-card {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.06);
  border: 1px solid #f0f0f0;
  padding: 10px;
}
.ant-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 6px;
  border-bottom: 1px solid #f5f5f5;
}
.ant-card-head-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}
.ant-card-head-extra {
  display: flex;
  gap: 8px;
  align-items: center;
}
.ant-card-body {
  padding-top: 8px;
  overflow: hidden; /* prevent outer horizontal scroll */
  box-sizing: border-box;
}

.json-preview-container {
  width: 100%;
}

.json-toggle-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.json-toggle-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.json-toggle-btn:hover {
  background-color: #f5f5f5;
  border-color: #1890ff;
  color: #1890ff;
}

.toggle-text {
  font-size: 14px;
}

.toggle-icon {
  font-size: 12px;
  font-weight: bold;
}

.json-content {
  margin-top: 8px;
}

.json-textarea {
  box-sizing: border-box;
  width: 100%;
  height: 200px;
  padding: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background-color: #fafafa;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #333;
  /* wrap long lines to avoid horizontal scrollbar */
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
  overflow-y: auto;
  overflow-x: hidden;
  resize: none;
}

.json-textarea:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
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


