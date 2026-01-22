<template>
	<view class="container">
		<scroll-view scroll-y="true" class="scroll-container">
			<!-- 图片轮播 -->
			<view class="image-carousel" v-if="script.images && script.images.length > 0" @click="openImageViewer">
				<swiper
					:indicator-dots="script.images.length > 1"
					:autoplay="script.images.length > 1"
					:interval="3000"
					:duration="500"
					class="swiper"
					@change="onSwiperChange"
				>
					<swiper-item
						v-for="(image, index) in script.images"
						:key="index"
					>
					<image :src="image" class="script-image" mode="aspectFill" @click="openImageViewer" />
					</swiper-item>
				</swiper>
				<view class="zoom-hint" v-if="script.images && script.images.length > 0">
					<text class="zoom-icon">🔍</text>
				</view>
			</view>

			<!-- 全屏图片查看器 -->
			<view class="image-viewer" v-if="showImageViewer" @click="closeImageViewer">
				<view class="viewer-header">
					<view class="viewer-close" @click.stop="closeImageViewer">
						<text class="close-icon">✕</text>
					</view>
				<view class="viewer-indicator">
					<text class="indicator-text">{{ currentImageIndex + 1 }} / {{ viewerImages.length }}</text>
				</view>
				<view class="viewer-original-btn" @click.stop="toggleOriginal">
					<text class="original-text">{{ showingOriginals ? '缩略' : '原图' }}</text>
				</view>
				</view>

				<swiper
					:current="currentImageIndex"
					:indicator-dots="false"
					class="viewer-swiper"
					@change="onViewerChange"
				>
					<swiper-item
						v-for="(image, index) in viewerImages"
						:key="index"
					>
						<image :src="image" class="viewer-image" mode="aspectFit" @click.stop @longpress="onImageLongPress(image)" />
					</swiper-item>
				</swiper>

				<view class="viewer-nav" v-if="script.images.length > 1">
					<view class="nav-btn prev-btn" @click.stop="prevImage" v-if="currentImageIndex > 0">
						<text class="nav-icon">‹</text>
					</view>
					<view class="nav-btn next-btn" @click.stop="nextImage" v-if="currentImageIndex < script.images.length - 1">
						<text class="nav-icon">›</text>
					</view>
				</view>

				<!-- 长按保存提示 -->
				<view class="save-hint">
					<text class="save-hint-text">长按可保存图片</text>
				</view>
			</view>

			<!-- 剧本详情信息 -->
			<view class="script-detail">
				<view class="script-header">
					<view class="script-title">{{ script.title }}</view>
					<view class="script-meta">
						<view class="meta-item">
							<text class="label">作者：</text>
							<text class="value">{{ script.author }}</text>
						</view>
						<view class="meta-item">
							<text class="label">版本：</text>
							<text class="value">{{ script.version }}</text>
						</view>
						<view class="meta-item">
							<text class="label">更新时间：</text>
							<text class="value">{{ script.updateTime }}</text>
						</view>
					</view>
				</view>

				<!-- 剧本描述 -->
				<view class="script-description">
					<view class="section-title">剧本简介</view>
					<view class="description-content">{{ script.description }}</view>
				</view>

				<!-- 游戏信息 -->
				<view class="game-info">
					<view class="section-title">游戏信息</view>
					<view class="info-grid">
						<view class="info-item">
							<text class="label">推荐玩家数：</text>
							<text class="value">{{ script.playerCount }}</text>
						</view>
						<view class="info-item">
							<text class="label">难度等级：</text>
							<text class="value">{{ script.difficulty }}</text>
						</view>
						<view class="info-item">
							<text class="label">使用次数：</text>
							<text class="value">{{ script.usageCount }}</text>
						</view>
						<view class="info-item">
							<text class="label">标签：</text>
							<text class="value">{{ script.tag }}</text>
						</view>
					</view>
				</view>

				<!-- 底部操作按钮 -->
				<view class="bottom-actions">
					<button
						class="action-btn secondary"
						@click="shareScript"
					>
						分享剧本
					</button>
					<button
						class="action-btn secondary"
						@click="toggleLike"
					>
						{{ isLiked ? '已点赞' : '点赞' }} ({{ script.likes }})
					</button>
					<button
						class="action-btn primary"
						@click="copyJsonUrl"
					>
						复制JSON地址
					</button>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import { likeScript, unlikeScript, initScriptLikeStatus } from '@/utils/api.js';

export default {
	data() {
		return {
			scriptId: null,
			isLiked: false,
			showImageViewer: false,
			currentImageIndex: 0,
			viewerImages: [],
			showingOriginals: false,
			script: {
				id: 1,
				title: '经典剧本：狼人杀',
				author: '血染钟楼官方',
				version: '1.0.0',
				updateTime: '2024-01-12',
				jsonUrl: 'https://example.com/script1.json',
				description: '经典的狼人杀剧本，适合新手入门。游戏中狼人会在夜晚行动，村民需要在白天找出并处决狼人。',
				playerCount: '8-12人',
				difficulty: '简单',
				usageCount: 1250,
				tag: '推理',
				likes: 156,
				images: [
					'/static/script1.jpg',
					'/static/script2.jpg'
				]
			}
		}
	},
	onLoad(options) {
		this.scriptId = options.id;
		// 启用微信转发功能
		this.enableShareMenu();
		// 这里可以根据scriptId从服务器获取剧本详情
		this.loadScriptDetail();
	},
	// (enabled via methods) -- placeholder removed to keep onShareAppMessage at page root
	// 微信小程序转发功能
	onShareAppMessage() {
		const shareData = {
			title: `${this.script.title} - ${this.script.author}`,
			path: `/pages/script-detail/script-detail?id=${this.scriptId}`,
			imageUrl: this.script.images && this.script.images.length > 0 ? this.script.images[0] : undefined
		};

		return shareData;
	},
	methods: {
		// 启用微信转发菜单（仅在微信小程序环境）
		enableShareMenu() {
			// #ifdef MP-WEIXIN
			wx.showShareMenu({
				withShareTicket: true,
				menus: ['shareAppMessage', 'shareTimeline']
			});
			// #endif
		},

		// 主动触发分享（绑定到页面按钮）
		shareScript() {
			// #ifdef MP-WEIXIN
			uni.showShareMenu({
				withShareTicket: true
			});
			// #endif

			// #ifndef MP-WEIXIN
			uni.showToast({
				title: '请使用微信小程序体验分享功能',
				icon: 'none'
			});
			// #endif
		},
		// 图片长按保存入口
		onImageLongPress(imageUrl) {
			try {
				// 在 HBuilderX / H5 环境中，原生 action sheet 可能被全屏图片遮挡，
				// 临时隐藏全屏查看器以确保 action sheet 在最上层显示。
				// #ifdef H5
				const wasViewerOpen = this.showImageViewer;
				if (wasViewerOpen) this.showImageViewer = false;
				// #endif

				uni.showActionSheet({
					itemList: ['保存图片']
				}).then(res => {
					if (res.tapIndex === 0) {
						this.saveImageToAlbum(imageUrl);
					}
				}).catch(() => {
					// 用户取消或不支持
				}).finally(() => {
					// 恢复全屏查看器（仅在之前是打开的情况下）
					// #ifdef H5
					if (wasViewerOpen) this.showImageViewer = true;
					// #endif
				});
			} catch (e) {
				// 兼容回退
				try {
					uni.showActionSheet({
						itemList: ['保存图片'],
						success: function (r) {
							if (r.tapIndex === 0) {
								// fallback to callback style
							}
						},
						fail: function () {}
					});
				} catch (err) {
					// ignore
				}
			}
		},

		// 保存图片到相册，支持远程和本地路径
		async saveImageToAlbum(url) {
			if (!url) {
				uni.showToast({ title: '图片地址无效', icon: 'none' });
				return;
			}

			try {
				let filePath = url;
				// 下载远程图片
				if (/^https?:\/\//i.test(url)) {
					const dl = await new Promise((resolve, reject) => {
						uni.downloadFile({
							url,
							success: res => {
								if (res.statusCode === 200 && res.tempFilePath) {
									resolve(res.tempFilePath);
								} else {
									reject(new Error('下载失败'));
								}
							},
							fail: reject
						});
					});
					filePath = dl;
				}

				// 保存到相册
				await new Promise((resolve, reject) => {
					uni.saveImageToPhotosAlbum({
						filePath,
						success: resolve,
						fail: err => reject(err)
					});
				});

				uni.showToast({ title: '保存成功', icon: 'success' });
			} catch (err) {
				console.error('保存图片失败', err);
				const msg = (err && err.errMsg) ? String(err.errMsg) : String(err);
				// 授权未通过或被拒绝
				if (msg.toLowerCase().includes('authorize') || msg.toLowerCase().includes('auth') || msg.toLowerCase().includes('permission')) {
					uni.showModal({
						title: '保存失败',
						content: '请授予相册权限以保存图片，是否前往设置？',
						success: res => {
							if (res.confirm) {
								uni.openSetting();
							}
						}
					});
				} else {
					uni.showToast({ title: '保存失败', icon: 'none' });
				}
			}
		},

		async loadScriptDetail() {
			if (!this.scriptId) return;

			try {
				this._lastError = null;
				const res = await uniCloud.callFunction({
					name: 'getScript',
					data: { id: this.scriptId }
				});
				const result = (res && res.result) ? res.result : res;

				// Support result.data as array or single object
				let item = null;
				if (result && result.code === 0 && result.data) {
					if (Array.isArray(result.data)) {
						item = result.data[0];
					} else if (typeof result.data === 'object') {
						item = result.data;
					} else {
						// Try parse JSON string
						try {
							item = JSON.parse(result.data);
						} catch (parseErr) {
							console.warn('getScript returned data in unexpected format', parseErr, result.data);
							item = null;
						}
					}
				}

				if (item && typeof item === 'object') {
					// 数据结构统一适配 - defensive: wrap per-field operations to avoid throwing
					try {
						// ID字段标准化
						item.id = item._id || item.id;
						delete item._id;

						// 图片字段处理
						this.resolveImages(item);

						// 状态字段默认值
						item.status = item.status || 'active';

						// 标签字段转换：数组转字符串（用于显示）
						if (Array.isArray(item.tags) && item.tags.length > 0) {
							item.tag = item.tags[0];
						} else {
							item.tag = '推理';
						}

						// 时间字段映射/格式化
						item.updateTime = item.updateTime || item.createdAt;

						// 统计字段默认值
						item.usageCount = item.usageCount || 0;
						item.likes = item.likes || 0;

						// 版本字段默认值
						item.version = item.version || '1.0.0';

						// 其他字段默认值
						item.playerCount = item.playerCount || '8-12人';
						item.difficulty = item.difficulty || '中等';
						item.jsonUrl = item.fileUrl || item.jsonUrl || '#';
					} catch (procErr) {
						console.error('process fetched script failed', procErr, item && item.id);
					}

					// 初始化点赞状态 safely
					try {
						item = initScriptLikeStatus(item);
						this.isLiked = !!item.isLiked;
					} catch (likeErr) {
						console.warn('initScriptLikeStatus failed', likeErr);
						this.isLiked = false;
					}

					this.script = item;
				} else {
					console.error('剧本详情加载失败: invalid data', result);
					this._lastError = result;
					uni.showToast({ title: '加载失败，请稍后重试', icon: 'none' });
				}
			} catch (err) {
				// Log full error for debugging but show friendly UI message
				console.error('loadScriptDetail error', err);
				this._lastError = err;
				uni.showToast({ title: '加载失败，请稍后重试', icon: 'none' });
			}
		},

		// 图片字段处理方法
		resolveImages(item) {
			let processedImages = [];

			// 优先使用 thumbnails (管理端标准)
			if (Array.isArray(item.thumbnails) && item.thumbnails.length) {
				processedImages = item.thumbnails.slice(0, 3);
			} else if (item.thumbnail) {
				// 降级到 thumbnail (单个图片)
				processedImages = [item.thumbnail];
			} else if (Array.isArray(item.images) && item.images.length) {
				// 处理 images 数组中的对象或字符串
				processedImages = item.images.slice(0, 3).map(img => {
					// 如果是字符串，直接使用
					if (typeof img === 'string') {
						return img;
					}
					// 如果是对象，尝试获取url属性
					if (typeof img === 'object' && img !== null) {
						return img.url || img.fileId || img.path || null;
					}
					return null;
				}).filter(url => url && typeof url === 'string');
			}

			// 确保至少有一个有效的URL
			item.images = processedImages.length > 0 ? processedImages : [];
		},
		// fetch full-size images for viewer
		async fetchFullImages() {
			if (!this.scriptId) return;
			try {
				const res = await uniCloud.callFunction({
					name: 'getScript',
					data: { id: this.scriptId }
				});
				const result = (res && res.result) ? res.result : res;
				if (result && result.code === 0 && Array.isArray(result.data) && result.data.length) {
					const item = result.data[0];
					// use original images if present, convert objects to URLs
					if (Array.isArray(item.images) && item.images.length) {
						this.viewerImages = item.images.map(img => {
							// 如果是字符串，直接使用
							if (typeof img === 'string') {
								return img;
							}
							// 如果是对象，尝试获取url属性
							if (typeof img === 'object' && img !== null) {
								return img.url || img.fileId || img.path || null;
							}
							return null;
						}).filter(url => url && typeof url === 'string');
						this.showingOriginals = true;
						return;
					}
				}
			} catch (err) {
				console.error('fetchFullImages error', err);
			}
			// fallback: keep current viewerImages
		},
		// toggle between thumbnails and originals
		async toggleOriginal() {
			if (this.showingOriginals) {
				// switch back to thumbnails (current images should already be processed URLs)
				this.viewerImages = (this.script.images || []).slice(0, 3);
				this.showingOriginals = false;
			} else {
				// fetch originals then show
				await this.fetchFullImages();
			}
		},
		openImageViewer() {
			// open with thumbnails first
			this.viewerImages = (this.script.images || []).slice(0, 3);
			this.showingOriginals = false;
			this.showImageViewer = true;
		},
		closeImageViewer() {
			this.showImageViewer = false;
		},
		onSwiperChange(e) {
			this.currentImageIndex = e.detail.current;
		},
		onViewerChange(e) {
			this.currentImageIndex = e.detail.current;
		},
		prevImage() {
			if (this.currentImageIndex > 0) {
				this.currentImageIndex--;
			}
		},
		nextImage() {
			if (this.currentImageIndex < this.script.images.length - 1) {
				this.currentImageIndex++;
			}
		},
		async copyJsonUrl() {
			try {
				uni.showLoading({ title: '生成链接中...' });

				// 调用getScriptJson云函数，设置link=true生成data URL
				const res = await uniCloud.callFunction({
					name: 'getScriptJson',
					data: {
						scriptId: this.scriptId,
						link: true,
						format: 'pretty'
					}
				});
				const result = (res && res.result) ? res.result : res;

				if (result && result.jsonUrl) {
					// 复制生成的data URL到剪贴板
					await uni.setClipboardData({
						data: result.jsonUrl,
						success: () => {
							// 更新本地使用次数显示
							if (result.usageUpdated && result.usageCount !== undefined) {
								this.script.usageCount = result.usageCount;
							}

							uni.showToast({
								title: 'JSON链接已复制',
								icon: 'success'
							});
						}
					});
				} else {
					throw new Error('生成链接失败');
				}
			} catch (error) {
				console.error('Copy JSON URL error:', error);
				uni.showToast({
					title: '复制失败',
					icon: 'error'
				});
			} finally {
				uni.hideLoading();
			}
		},
		async toggleLike() {
			const newLikedState = !this.isLiked;

			try {
				let result;
				if (newLikedState) {
					// 点赞
					result = await likeScript(this.script.id);
					if (result.success) {
						this.script.likes++;
					}
				} else {
					// 取消点赞
					result = await unlikeScript(this.script.id);
					if (result.success) {
						this.script.likes = Math.max(0, this.script.likes - 1);
					}
				}

				if (result.success) {
					this.isLiked = newLikedState;
					this.script.isLiked = newLikedState;
					uni.showToast({
						title: result.message,
						icon: 'success'
					});
				} else {
					uni.showToast({
						title: result.message,
						icon: 'none'
					});
				}
			} catch (error) {
				console.error('点赞操作失败:', error);
				uni.showToast({
					title: '操作失败，请重试',
					icon: 'none'
				});
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	height: 100vh;
	background-color: #f8f8f8;
}

.scroll-container {
	height: 100%;
}

.image-carousel {
	height: 400rpx;
	position: relative;
	margin-bottom: 20rpx;
	cursor: pointer;

	&:active {
		opacity: 0.9;
	}
}

.swiper {
	height: 100%;
}

.script-image {
	width: 100%;
	height: 100%;
}

.script-detail {
	background-color: #fff;
	border-radius: 12rpx 12rpx 0 0;
	margin-top: -20rpx;
	padding: 30rpx;
	min-height: calc(100vh - 400rpx);
}

.script-header {
	border-bottom: 1rpx solid #f0f0f0;
	padding-bottom: 20rpx;
	margin-bottom: 20rpx;
}

.script-title {
	font-size: 36rpx;
	font-weight: bold;
	color: #333;
	line-height: 1.4;
	margin-bottom: 16rpx;
}

.script-meta {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.meta-item {
	display: flex;
	font-size: 26rpx;
	line-height: 1.5;
}

.label {
	color: #666;
	min-width: 120rpx;
}

.value {
	color: #333;
}

.action-buttons {
	display: flex;
	gap: 20rpx;
	margin: 24rpx 0;
}

.bottom-actions {
	display: flex;
	gap: 20rpx;
	margin: 40rpx 0 20rpx 0;
	padding-top: 20rpx;
	border-top: 1rpx solid #e8e8e8;
}

.action-btn {
	flex: 1;
	border-radius: 8rpx;
	font-size: 28rpx;
	height: 80rpx;
	line-height: 80rpx;
}

.primary {
	background-color: #007AFF;
	color: white;
}

.secondary {
	background-color: #f8f8f8;
	color: #007AFF;
	border: 1rpx solid #007AFF;
}

.section-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	margin: 32rpx 0 16rpx 0;
}

.description-content {
	font-size: 28rpx;
	line-height: 1.6;
	color: #555;
	text-align: justify;
}

.game-info {
	margin-top: 32rpx;
}

.info-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 16rpx;
}

.info-item {
	display: flex;
	flex-direction: column;
	background-color: #f8f8f8;
	padding: 16rpx;
	border-radius: 8rpx;
	font-size: 24rpx;
}

.zoom-hint {
	position: absolute;
	top: 20rpx;
	right: 20rpx;
	background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%);
	border: 1rpx solid rgba(255, 255, 255, 0.3);
	border-radius: 20rpx;
	padding: 10rpx 16rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	backdrop-filter: blur(10rpx);
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.2);
	transition: all 0.3s ease;

	&:hover {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%);
		transform: scale(1.05);
	}
}

.zoom-icon {
	font-size: 24rpx;
	color: white;
	font-weight: 300;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.3);
}

// 图片查看器样式
.image-viewer {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background: linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(20, 20, 30, 0.98) 100%);
	z-index: 2000;
	display: flex;
	flex-direction: column;
	animation: fadeIn 0.3s ease-out;
	backdrop-filter: blur(2rpx);
}

.viewer-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 50rpx 30rpx 30rpx;
	color: white;
	position: relative;
}

.viewer-header::after {
	content: '';
	position: absolute;
	bottom: 0;
	left: 30rpx;
	right: 30rpx;
	height: 1rpx;
	background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
}

.viewer-close {
	width: 56rpx;
	height: 56rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%);
	border: 2rpx solid rgba(255, 255, 255, 0.2);
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.3);

	&:active {
		transform: scale(0.92);
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.2) 100%);
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.4);
	}

	&:hover {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%);
	}
}

.close-icon {
	font-size: 28rpx;
	color: white;
	font-weight: 300;
	line-height: 1;
}

.viewer-indicator {
	background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%);
	border: 1rpx solid rgba(255, 255, 255, 0.2);
	border-radius: 20rpx;
	padding: 12rpx 20rpx;
	font-size: 26rpx;
	color: white;
	font-weight: 500;
	backdrop-filter: blur(10rpx);
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.2);
}

.viewer-swiper {
	flex: 1;
	height: calc(100vh - 120rpx);
}

.viewer-image {
	width: 100%;
	height: 100%;
}

.viewer-nav {
	position: absolute;
	bottom: 80rpx;
	left: 0;
	right: 0;
	display: flex;
	justify-content: space-between;
	padding: 0 50rpx;
	pointer-events: none;
}

.nav-btn {
	width: 72rpx;
	height: 72rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, rgba(255, 255, 255, 0.30) 0%, rgba(255, 255, 255, 0.18) 100%);
	border: 2rpx solid rgba(255, 255, 255, 0.36);
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
	pointer-events: auto;
	box-shadow: 0 12rpx 36rpx rgba(0, 0, 0, 0.36);
	position: relative;
	overflow: hidden;

	&::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, transparent 50%);
		border-radius: 50%;
		opacity: 0;
		transition: opacity 0.24s;
	}

	&:active {
		transform: scale(0.9);
		box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.44);

		&::before {
			opacity: 1;
		}
	}

	&:hover {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.34) 0%, rgba(255, 255, 255, 0.22) 100%);
		transform: translateY(-3rpx);
		box-shadow: 0 16rpx 40rpx rgba(0, 0, 0, 0.44);
	}
}

.nav-icon {
	font-size: 52rpx;
	color: white;
	font-weight: 300;
	line-height: 1;
	position: relative;
	z-index: 1;
	text-shadow: 0 6rpx 12rpx rgba(0, 0, 0, 0.45);
	letter-spacing: 2rpx;
}

.save-hint {
	position: absolute;
	bottom: 30rpx;
	left: 50%;
	transform: translateX(-50%);
	background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%);
	border: 1rpx solid rgba(255, 255, 255, 0.2);
	border-radius: 20rpx;
	padding: 12rpx 24rpx;
	backdrop-filter: blur(10rpx);
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.2);
	animation: fadeInUp 0.5s ease-out;
}

.save-hint-text {
	font-size: 26rpx;
	color: white;
	font-weight: 500;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.3);
}

@keyframes fadeInUp {
	from {
		opacity: 0;
		transform: translateX(-50%) translateY(20rpx);
	}
	to {
		opacity: 1;
		transform: translateX(-50%) translateY(0);
	}
}
</style>
