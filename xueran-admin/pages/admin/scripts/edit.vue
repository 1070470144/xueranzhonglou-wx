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
          <uni-file-picker
            v-model="formData.jsonFile"
            return-type="object"
            file-mediatype="all"
            :file-extname="['json']"
            limit="1"
            mode="list"
            @success="onJsonUploadSuccess"
            @fail="onUploadFail"
          >
            <view class="upload-box">
              <view class="upload-icon">📄</view>
              <view class="upload-text">选择 JSON 文件（最大1MB）</view>
              <view v-if="formData.jsonFile && formData.jsonFile.url" class="file-info">
                已选：{{ formData.jsonFile.name || formData.jsonFile.url }}
              </view>
            </view>
          </uni-file-picker>
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
				version: '',
				description: '',
				playerCount: '',
				difficulty: '',
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
	methods: {
		/**
		 * 触发表单提交
		 */
		submitForm() {
			this.$refs.form.submit();
		},

		/**
		 * 表单提交
		 */
		submit(event) {
			const { value, errors } = event.detail;

			// 表单校验失败页面会提示报错，要停止表单提交逻辑
			if (errors) {
				return;
			}

			this.saveScript(value);
		},

		/**
		 * 保存剧本数据
		 */
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
						data: {
							action: 'update',
							id: this.id,
							payload,
							jsonFileId,
							imageFileIds,
							thumbnails
						}
					});
				} else {
					res = await uniCloud.callFunction({
						name: 'adminScript',
						data: {
							action: 'create',
							payload,
							jsonFileId,
							imageFileIds,
							thumbnails
						}
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

		/**
		 * JSON上传成功处理
		 */
		onJsonUploadSuccess(res) {
			console.log('JSON upload success:', res);
			if (res && res.tempFilePath) {
				uni.showToast({ title: 'JSON 上传成功', icon: 'success' });
			}
		},

		/**
		 * 图片上传成功处理
		 */
		onImageUploadSuccess(res) {
			console.log('Image upload success:', res);
			if (res && res.tempFilePaths && res.tempFilePaths.length > 0) {
				uni.showToast({ title: '图片上传成功', icon: 'success' });
			}
		},

		/**
		 * 图片删除处理
		 */
		onImageDelete(res) {
			console.log('Image delete:', res);
		},

		/**
		 * 上传失败处理
		 */
		onUploadFail(err) {
			console.error('Upload fail:', err);
			uni.showToast({ title: '上传失败', icon: 'none' });
		}
	},
	async onLoad(options) {
		if (options && options.id) {
			this.id = options.id;
			await this.loadScriptData(this.id);
		}
	},
	async loadScriptData(id) {
		try {
			uni.showLoading({ title: '加载中...' });
			const res = await uniCloud.callFunction({
				name: 'getScript',
				data: { id }
			});
			uni.hideLoading();

			if (res && res.result && res.result.code === 0 && res.result.data && res.result.data.length > 0) {
				const script = res.result.data[0];
				// 填充表单数据
				this.formData = {
					title: script.title || '',
					author: script.author || '',
					version: script.version || '',
					description: script.description || '',
					playerCount: script.playerCount || '',
					difficulty: script.difficulty || '',
					usageCount: script.usageCount || 0,
					tag: script.tag || '娱乐',
					jsonFile: script.jsonFile || null,
					images: script.images || []
				};
			} else {
				uni.showToast({ title: '加载数据失败', icon: 'none' });
			}
		} catch (err) {
			uni.hideLoading();
			console.error('loadScriptData error', err);
			uni.showToast({ title: '加载数据失败', icon: 'none' });
		}
	}
}
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


