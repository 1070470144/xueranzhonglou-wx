<template>
	<view class="container">
		<view class="header">
			<view class="title">{{ id ? '编辑剧本' : '新增剧本' }}</view>
		</view>

	<form @submit.prevent="onSubmit" class="card">
			<view class="field">
				<label>剧本名</label>
				<input class="input" v-model="form.title" placeholder="剧本名" />
			</view>
			<view class="field">
				<label>作者</label>
				<input class="input" v-model="form.author" placeholder="作者名" />
			</view>
			<view class="field">
				<label>版本</label>
				<input class="input" v-model="form.version" placeholder="版本号" />
			</view>
			<view class="field">
				<label>简介</label>
				<textarea class="textarea" v-model="form.description" placeholder="剧本简介"></textarea>
			</view>
			<view class="field">
				<label>玩家人数</label>
				<input class="input" v-model="form.playerCount" placeholder="如 8-12人" />
			</view>
			<view class="field">
				<label>难度</label>
				<input class="input" v-model="form.difficulty" placeholder="简单/中等/困难" />
			</view>
			<view class="field">
				<label>使用次数</label>
				<input class="input" v-model.number="form.usageCount" type="number" />
			</view>
			<view class="field">
				<label>标签</label>
				<select class="input" v-model="form.tag">
					<option value="娱乐">娱乐</option>
					<option value="推理">推理</option>
				</select>
			</view>

			<!-- JSON upload -->
			<view class="field">
				<label>上传 JSON 源文件</label>
				<button class="btn primary" @click.prevent="pickJson">选择文件并上传</button>
				<text v-if="form.jsonFile && form.jsonFile.url" class="muted">已选：{{ form.jsonFile.url }}</text>
			</view>
			<!-- images upload -->
			<view class="field">
				<label>图片（0-3）</label>
				<view class="images">
					<view v-for="(img, idx) in form.images" :key="idx" class="img-wrap">
						<image :src="img.url" class="img-preview" mode="aspectFill"/>
						<button class="btn danger" @click.prevent="removeImage(idx)">删除</button>
					</view>
					<button v-if="form.images.length<3" class="btn" @click.prevent="pickImage">添加图片</button>
				</view>
			</view>

			<view class="actions">
				<button class="btn primary" type="submit">{{ id ? '保存' : '创建' }}</button>
				<button class="btn" @click.prevent="onCancel">取消</button>
			</view>
		</form>
	</view>
</template>

<script>
export default {
	data() {
		return {
			id: null,
			form: {
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
			}
		}
	},
	methods: {
		async pickJson() {
			try {
				const chooseRes = await uni.chooseFile({ count: 1 });
				const tempPath = (chooseRes && chooseRes.tempFiles && chooseRes.tempFiles[0]) ? chooseRes.tempFiles[0].path : null;
				if (!tempPath) {
					uni.showToast({ title: '未选择文件', icon: 'none' });
					return;
				}
				uni.showLoading({ title: '上传中...' });
				const upRes = await uniCloud.uploadFile({ filePath: tempPath });
				uni.hideLoading();
				if (upRes && upRes.fileID) {
					this.form.jsonFile = { fileId: upRes.fileID, url: tempPath };
					uni.showToast({ title: 'JSON 上传成功', icon: 'success' });
				} else {
					uni.showToast({ title: '上传失败', icon: 'none' });
				}
			} catch (err) {
				uni.hideLoading();
				console.error('pickJson error', err);
				uni.showToast({ title: '上传失败', icon: 'none' });
			}
		},
		async pickImage() {
			try {
				const chooseRes = await uni.chooseImage({ count: 1 });
				const tempFilePaths = chooseRes && chooseRes.tempFilePaths ? chooseRes.tempFilePaths : [];
				if (!tempFilePaths.length) return;
				const src = tempFilePaths[0];
				// upload original
				uni.showLoading({ title: '上传图片...' });
				const upOrig = await uniCloud.uploadFile({ filePath: src });
				// create thumbnail (client-side compress)
				let thumbPath = src;
				try {
					const comp = await uni.compressImage({ src, quality: 80 });
					thumbPath = comp.tempFilePath || src;
				} catch (e) {
					// fallback to original if compress not available
					thumbPath = src;
				}
				const upThumb = await uniCloud.uploadFile({ filePath: thumbPath });
				uni.hideLoading();
				const origId = upOrig && upOrig.fileID ? upOrig.fileID : null;
				const thumbId = upThumb && upThumb.fileID ? upThumb.fileID : null;
				this.form.images.push({
					url: src,
					fileId: origId,
					thumbUrl: thumbPath,
					thumbFileId: thumbId
				});
				uni.showToast({ title: '图片上传成功', icon: 'success' });
			} catch (err) {
				uni.hideLoading();
				console.error('pickImage error', err);
				uni.showToast({ title: '上传失败', icon: 'none' });
			}
		},
		removeImage(idx) {
			this.form.images.splice(idx, 1);
		},
		onCancel() {
			uni.navigateBack();
		},
		async onSubmit() {
			// basic validation
			if (!this.form.title || !this.form.author) {
				uni.showToast({ title: '请填写标题和作者', icon: 'none' });
				return;
			}
			try {
				uni.showLoading({ title: '保存中...' });
				const payload = {
					title: this.form.title,
					author: this.form.author,
					version: this.form.version,
					updateTime: Date.now(),
					description: this.form.description,
					playerCount: this.form.playerCount,
					difficulty: this.form.difficulty,
					usageCount: this.form.usageCount || 0,
					tag: this.form.tag || '',
					likes: this.form.likes || 0
				};
				const imageFileIds = (this.form.images || []).map(i => i.fileId).filter(Boolean);
				const thumbnails = (this.form.images || []).map(i => i.thumbFileId).filter(Boolean);
				const jsonFileId = (this.form.jsonFile && this.form.jsonFile.fileId) ? this.form.jsonFile.fileId : null;
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
					uni.navigateBack();
				} else {
					uni.showToast({ title: result.errMsg || '保存失败', icon: 'none' });
				}
			} catch (err) {
				uni.hideLoading();
				console.error('onSubmit error', err);
				uni.showToast({ title: '保存失败', icon: 'none' });
			}
		}
	},
	onLoad(options) {
		if (options && options.id) {
			this.id = options.id;
			// load item via adminGetScript (to be implemented)
		}
	}
}
</script>

<style scoped>
.container { padding: 24rpx; background:#f7f8fb; min-height:100vh; }
.card { background:#fff; padding:20rpx; border-radius:12rpx; box-shadow:0 6rpx 20rpx rgba(0,0,0,0.04); }
.header { margin-bottom: 16rpx; display:flex; align-items:center; justify-content:space-between; }
.title { font-size: 28rpx; font-weight:700; color:#222; }
.field { margin-bottom: 14rpx; display:flex; flex-direction:column; }
.input, .textarea, select { padding:10rpx 12rpx; border:1rpx solid #e6e9ef; border-radius:8rpx; font-size:26rpx; background:#fcfdff; }
.textarea { min-height:140rpx; resize:none; }
.images { display:flex; gap:12rpx; align-items:center; }
.img-preview { width:160rpx; height:100rpx; border-radius:8rpx; object-fit:cover; box-shadow:0 6rpx 16rpx rgba(0,0,0,0.06); }
.actions { margin-top:20rpx; display:flex; gap:10rpx; }
.muted { color:#888; margin-left:12rpx; }
.btn { padding:6rpx 10rpx; border-radius:6rpx; border:1rpx solid #dcdcdc; background:transparent; font-size:24rpx; }
.btn.primary { background:#2a6cff; color:#fff; border-color:transparent; padding:6rpx 10rpx; }
.btn.danger { background:#ff6b6b; color:#fff; border-color:transparent; padding:6rpx 10rpx; }
</style>
</style>


