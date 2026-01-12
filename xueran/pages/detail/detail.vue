<template>
	<view class="container">
		<!-- 使用系统导航栏（navigationStyle: default），页面内容直接从顶部下方开始 -->

		<!-- 图片轮播 -->
		<view class="image-carousel">
			<swiper
				:indicator-dots="true"
				:autoplay="true"
				:circular="true"
				:interval="3000"
				class="swiper-container"
			>
				<swiper-item
					v-for="(image, index) in scriptDetail.images"
					:key="index"
					class="swiper-item"
				>
					<image
						:src="image"
						mode="aspectFill"
						class="carousel-image"
						@error="onImageError"
					/>
				</swiper-item>
			</swiper>

			<!-- 图片数量指示器 -->
			<view class="image-indicator">
				{{ currentImageIndex + 1 }}/{{ scriptDetail.images.length }}
			</view>
		</view>

		<!-- 剧本信息 -->
		<view class="script-info">
			<view class="info-header">
				<view class="title-section">
					<text class="script-title">{{ scriptDetail.title }}</text>
					<view class="version-badge">
						<text class="version-text">v{{ scriptDetail.version }}</text>
					</view>
				</view>

				<view class="author-section">
					<text class="author-label">作者</text>
					<text class="author-name">{{ scriptDetail.author }}</text>
				</view>
			</view>

			<view class="stats-section">
				<view class="stat-item">
					<uni-icons type="download" size="16" color="#007AFF"></uni-icons>
					<text class="stat-label">使用</text>
					<text class="stat-value">{{ formatNumber(scriptDetail.downloads) }}</text>
				</view>
				<view class="stat-item">
					<uni-icons type="heart-filled" size="16" color="#FF4757"></uni-icons>
					<text class="stat-label">点赞</text>
					<text class="stat-value">{{ formatNumber(scriptDetail.likes) }}</text>
				</view>
			</view>

			<view class="tags-section">
				<text
					v-for="tag in scriptDetail.tags"
					:key="tag"
					class="tag"
				>{{ tag }}</text>
			</view>

			<view class="description-section">
				<text class="description-title">剧本简介</text>
				<text class="description-text">{{ scriptDetail.description }}</text>
			</view>
		</view>

		<!-- 操作按钮 -->
		<view class="action-buttons">
			<view class="button-row">
				<button
					class="action-btn copy-btn"
					@click="copyJson"
					:loading="copying"
				>
					<uni-icons type="redo" size="16" color="#fff"></uni-icons>
					<text class="btn-text">{{ copying ? '复制中...' : '复制JSON' }}</text>
				</button>
			</view>
		</view>

		<!-- 底部留白 -->
		<view class="bottom-spacer"></view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			currentImageIndex: 0,
			copying: false,
			downloading: false,
			animationsEnabled: true,
			loading: false,
			scriptDetail: {}
		}
	},
	async onLoad(options) {
		console.log('剧本详情页面加载', options)
		if (options.id) {
			await this.loadScriptDetail(options.id)
		}
	},
	methods: {
		goBack() {
			uni.navigateBack()
		},
		async loadScriptDetail(scriptId) {
			this.loading = true
			try {
				const result = await uniCloud.callFunction({
					name: 'script-service',
					data: {
						method: 'getScriptDetail',
						params: [{
							scriptId: scriptId
						}]
					}
				})

				if (result.result.success) {
					this.scriptDetail = result.result.data.script
				} else {
					console.error('加载剧本详情失败:', result.result.message)
					uni.showToast({
						title: '加载失败',
						icon: 'none'
					})
				}
			} catch (error) {
				console.error('加载剧本详情失败:', error)
				uni.showToast({
					title: '网络错误',
					icon: 'none'
				})
			} finally {
				this.loading = false
			}
		},
		onImageError() {
			console.log('图片加载失败')
		},
		formatNumber(num) {
			if (num >= 10000) {
				return (num / 10000).toFixed(1) + 'w'
			} else if (num >= 1000) {
				return (num / 1000).toFixed(1) + 'k'
			}
			return num.toString()
		},
		async copyJson() {
			this.copying = true
			try {
				// 模拟JSON数据
				const jsonData = {
					title: this.scriptDetail.title,
					version: this.scriptDetail.version,
					author: this.scriptDetail.author,
					description: this.scriptDetail.description,
					players: [
						{ role: '狼人', count: 2 },
						{ role: '村民', count: 3 },
						{ role: '预言家', count: 1 },
						{ role: '女巫', count: 1 },
						{ role: '猎人', count: 1 }
					],
					rules: '标准狼人杀规则...',
					tags: this.scriptDetail.tags
				}

				const jsonString = JSON.stringify(jsonData, null, 2)

				// 使用 uni-app 的复制API
				uni.setClipboardData({
					data: jsonString,
					success: () => {
						uni.showToast({
							title: 'JSON已复制到剪贴板',
							icon: 'success',
							duration: 2000
						})
					},
					fail: () => {
						uni.showToast({
							title: '复制失败',
							icon: 'error',
							duration: 2000
						})
					}
				})
			} catch (error) {
				console.error('复制JSON失败:', error)
				uni.showToast({
					title: '复制失败',
					icon: 'error',
					duration: 2000
				})
			} finally {
				setTimeout(() => {
					this.copying = false
				}, 1000)
			}
		},
		async downloadJson() {
			this.downloading = true
			try {
				// 模拟JSON数据
				const jsonData = {
					title: this.scriptDetail.title,
					version: this.scriptDetail.version,
					author: this.scriptDetail.author,
					description: this.scriptDetail.description,
					players: [
						{ role: '狼人', count: 2 },
						{ role: '村民', count: 3 },
						{ role: '预言家', count: 1 },
						{ role: '女巫', count: 1 },
						{ role: '猎人', count: 1 }
					],
					rules: '标准狼人杀规则...',
					tags: this.scriptDetail.tags,
					downloadTime: new Date().toISOString()
				}

				const jsonString = JSON.stringify(jsonData, null, 2)
				const fileName = `${this.scriptDetail.title.replace(/[^a-zA-Z0-9]/g, '_')}_v${this.scriptDetail.version}.json`

				// 在小程序环境中，可以使用 uni.saveFile 或其他方式保存文件
				// 这里先用提示代替实际的文件保存
				console.log('下载JSON:', fileName, jsonString)

				uni.showToast({
					title: 'JSON文件已准备下载',
					icon: 'success',
					duration: 2000
				})

				// 实际的文件下载逻辑需要根据平台实现
				// 可以考虑使用 uni.saveFile 或其他文件系统API

			} catch (error) {
				console.error('下载JSON失败:', error)
				uni.showToast({
					title: '下载失败',
					icon: 'error',
					duration: 2000
				})
			} finally {
				setTimeout(() => {
					this.downloading = false
				}, 1000)
			}
		}
	},
	// 监听轮播图变化
	onSwiperChange(e) {
		this.currentImageIndex = e.detail.current
	}
	,
	mounted() {
		try {
			const stored = uni.getStorageSync && uni.getStorageSync('animationsEnabled')
			if (typeof stored !== 'undefined' && stored !== null) {
				this.animationsEnabled = !!stored
			}
		} catch (e) {
			// ignore
		}
	}
}
</script>

<style scoped>
.container {
	min-height: 100vh;
	background-color: #f8f8f8;
}

.header {
	background-color: #fff;
	border-bottom: 1px solid #e5e5e5;
}

.nav-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px;
	height: 44px;
}

.back-btn {
	width: 48px;
	height: 48px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	/* Material toolbar leading icon style: no visible solid background, keep touch target */
	border-radius: 50% !important;
	transition: transform 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
	/* very light filled background to improve contrast on white headers (选项2) */
	background-color: rgba(0,0,0,0.04) !important;
	/* 微弱阴影以提供轻微抬升感 */
	box-shadow: 0 1px 3px rgba(0,0,0,0.06);
	/* ensure minimum touch target on small screens */
	min-width: 48px;
	min-height: 48px;
	padding: 12px;
}

.back-btn:active {
	/* subtle press feedback */
	transform: scale(0.96);
	background-color: rgba(0,0,0,0.06);
}

/* Disable animations when global flag is false */
:root .back-btn[aria-disabled="true"] {
	transition: none;
}

.title {
	font-size: 18px;
	font-weight: 600;
	color: #333;
}

.placeholder {
	width: 44px;
}

.image-carousel {
	position: relative;
	height: 250px;
	background-color: #000;
}

.swiper-container {
	height: 100%;
}

.swiper-item {
	height: 100%;
}

.carousel-image {
	width: 100%;
	height: 100%;
}

.image-indicator {
	position: absolute;
	bottom: 16px;
	right: 16px;
	background-color: rgba(0, 0, 0, 0.6);
	color: #fff;
	font-size: 12px;
	padding: 4px 8px;
	border-radius: 12px;
}

.script-info {
	background-color: #fff;
	margin: 16px;
	border-radius: 12px;
	padding: 20px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.info-header {
	margin-bottom: 20px;
}

.title-section {
	margin-bottom: 12px;
}

.script-title {
	font-size: 20px;
	font-weight: 700;
	color: #333;
	line-height: 1.4;
	display: block;
	margin-bottom: 8px;
}

.version-badge {
	display: inline-block;
	background-color: #007AFF;
	color: #fff;
	font-size: 12px;
	padding: 4px 8px;
	border-radius: 12px;
	font-weight: 500;
}

.author-section {
	display: flex;
	align-items: center;
}

.author-label {
	font-size: 14px;
	color: #666;
	margin-right: 8px;
}

.author-name {
	font-size: 16px;
	font-weight: 600;
	color: #333;
}

.stats-section {
	display: flex;
	justify-content: space-around;
	margin-bottom: 20px;
	padding: 16px 0;
	border-top: 1px solid #f0f0f0;
	border-bottom: 1px solid #f0f0f0;
}

.stat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	flex: 1;
}

.stat-label {
	font-size: 12px;
	color: #666;
	margin: 4px 0;
}

.stat-value {
	font-size: 16px;
	font-weight: 600;
	color: #333;
}

.tags-section {
	margin-bottom: 20px;
}

.tag {
	display: inline-block;
	background-color: #f0f0f0;
	color: #666;
	font-size: 12px;
	padding: 6px 12px;
	border-radius: 16px;
	margin-right: 8px;
	margin-bottom: 8px;
}

.description-section {
}

.description-title {
	font-size: 16px;
	font-weight: 600;
	color: #333;
	margin-bottom: 12px;
	display: block;
}

.description-text {
	font-size: 14px;
	color: #666;
	line-height: 1.6;
}

.action-buttons {
	padding: 0 16px 20px 16px;
}

.button-row {
	display: flex;
	gap: 12px;
}

.action-btn {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 14px;
	border-radius: 12px;
	border: none;
	font-size: 14px;
	font-weight: 600;
	transition: opacity 0.2s;
}

.action-btn:active {
	opacity: 0.8;
}

.copy-btn {
	background-color: #007AFF;
}

.download-btn {
	background-color: #34C759;
}

.btn-text {
	color: #fff;
	margin-left: 6px;
}

.bottom-spacer {
	height: 20px;
}
</style>
