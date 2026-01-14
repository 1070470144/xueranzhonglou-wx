<template>
	<view class="container">
		<!-- 搜索栏 -->
		<view class="search-bar">
			<view class="search-input">
				<uni-icons type="search" size="16" color="#999"></uni-icons>
				<input
					v-model="searchText"
					placeholder="搜索剧本..."
					placeholder-style="color: #999"
					class="input-field"
				/>
			</view>
		</view>

		<!-- 剧本列表 - 四宫格布局 -->
		<view :class="['script-grid', animationsEnabled ? 'animations-enabled' : '']">
			<view
				v-for="(script, index) in scriptList"
				:key="script._id"
				class="script-card"
				@click="goToDetail(script)"
			>
				<!-- 剧本图片轮播 -->
				<view class="image-carousel">
					<swiper
						:indicator-dots="false"
						:autoplay="false"
						:circular="true"
						class="swiper-container"
					>
						<swiper-item
							v-for="(image, imgIndex) in script.images.slice(0, 1)"
							:key="imgIndex"
							class="swiper-item"
						>
							<image
								:src="image"
								mode="aspectFill"
								class="script-image"
								@error="onImageError"
							/>
						</swiper-item>
						<!-- 如果没有图片，显示默认图片 -->
						<swiper-item v-if="script.images.length === 0" class="swiper-item">
							<view class="default-image">
								<uni-icons type="image" size="32" color="#ccc"></uni-icons>
							</view>
						</swiper-item>
					</swiper>
					<!-- 图片数量指示器 -->
					<view v-if="script.images.length > 1" class="image-count">
						{{ script.images.length }}
					</view>
				</view>

				<!-- 剧本信息 -->
				<view class="script-info">
					<view class="script-header">
						<text class="script-title">{{ script.title }}</text>
						<view class="like-section">
							<uni-icons type="heart-filled" size="14" color="#ff4757"></uni-icons>
							<text class="like-count">{{ script.likes || 0 }}</text>
						</view>
					</view>

					<view class="script-meta">
						<text class="author">{{ script.author }}</text>
					</view>

					<view class="script-tags">
						<text
							v-for="tag in script.tags.slice(0, 2)"
							:key="tag"
							class="tag"
						>{{ tag }}</text>
					</view>
				</view>
			</view>

			<!-- 加载更多 -->
			<view v-if="loading" class="loading">
				<text>加载中...</text>
			</view>

			<!-- 空状态 -->
			<view v-if="!loading && scriptList.length === 0" class="empty-state">
				<text class="empty-text">暂无剧本</text>
			</view>
		</view>

		<!-- 底部导航 -->
		<view class="bottom-nav">
			<view class="nav-item active">
				<uni-icons type="home" size="20" color="#007AFF"></uni-icons>
				<text class="nav-text">展览</text>
			</view>
			<view class="nav-item" @click="goToRankings">
				<uni-icons type="bars" size="20" color="#666"></uni-icons>
				<text class="nav-text">排行</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			searchText: '',
			loading: false,
			scriptList: [],
			animationsEnabled: true
		}
	},
	async onLoad() {
		// 页面加载时的初始化
		console.log('剧本展览页面加载')
		await this.initDatabase()
		await this.loadScripts()
	},
	async mounted() {
		// read animations setting from storage (default true)
		try {
			const stored = uni.getStorageSync && uni.getStorageSync('animationsEnabled')
			if (typeof stored !== 'undefined' && stored !== null) {
				this.animationsEnabled = !!stored
			}
		} catch (e) {
			// ignore
		}
	},
	methods: {
		async initDatabase() {
			try {
				console.log('初始化数据库...')

				// 在开发环境下，添加force参数强制重新初始化
				const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV
				const initData = {
					method: 'initScripts'
				}

				if (isDev) {
					initData.force = true
				}

				const result = await uniCloud.callFunction({
					name: 'script-service',
					data: initData
				})

				console.log('初始化返回结果:', JSON.stringify(result, null, 2))

				if (result.result.success) {
					console.log('数据库初始化成功:', result.result.message)
				} else {
					console.log('数据库初始化失败:', result.result.message)
				}
			} catch (error) {
				console.error('数据库初始化失败:', error)
				console.error('错误详情:', error)
			}
		},

		async loadScripts() {
			this.loading = true
			try {
				const result = await uniCloud.callFunction({
					name: 'script-service',
					data: {
						method: 'getScriptList',
						params: [{
							page: 1,
							pageSize: 20
						}]
					}
				})

				if (result.result.success) {
					console.log('剧本数据:', JSON.stringify(result.result.data, null, 2))
					this.scriptList = result.result.data.list
					console.log('设置的剧本列表:', this.scriptList)
					console.log('剧本列表长度:', this.scriptList ? this.scriptList.length : 'undefined')
				} else {
					console.error('加载剧本失败:', result.result.message)
					uni.showToast({
						title: '加载失败',
						icon: 'none'
					})
				}
			} catch (error) {
				console.error('加载剧本失败:', error)
				uni.showToast({
					title: '网络错误',
					icon: 'none'
				})
			} finally {
				this.loading = false
			}
		},

		async searchScripts() {
			if (!this.searchText.trim()) {
				await this.loadScripts()
				return
			}

			this.loading = true
			try {
				const result = await uniCloud.callFunction({
					name: 'script-service',
					data: {
						method: 'searchScripts',
						params: [{
							keyword: this.searchText.trim(),
							page: 1,
							pageSize: 20
						}]
					}
				})

				if (result.result.success) {
					this.scriptList = result.result.data.list
				} else {
					console.error('搜索失败:', result.result.message)
					uni.showToast({
						title: '搜索失败',
						icon: 'none'
					})
				}
			} catch (error) {
				console.error('搜索失败:', error)
				uni.showToast({
					title: '网络错误',
					icon: 'none'
				})
			} finally {
				this.loading = false
			}
		},

		goToDetail(script) {
			uni.navigateTo({
				url: `/pages/detail/detail?id=${script._id || script.id}`
			})
		},

		goToRankings() {
			uni.navigateTo({
				url: '/pages/rankings/rankings'
			})
		},

		onImageError() {
			// 处理图片加载失败
			console.log('图片加载失败')
		}
	}
}
</script>

<style scoped>
.container {
	min-height: 100vh;
	background-color: #f8f8f8;
	padding-bottom: 60px; /* 为底部导航留空间 */
}

.search-bar {
	padding: 16px;
	background-color: #fff;
	border-bottom: 1px solid #e5e5e5;
}

.search-input {
	display: flex;
	align-items: center;
	background-color: #f5f5f5;
	border-radius: 20px;
	padding: 8px 16px;
}

.input-field {
	flex: 1;
	margin-left: 8px;
	font-size: 14px;
}

.script-grid {
	padding: 16px;
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
	min-height: calc(100vh - 140px);
}

.script-card {
	background-color: #fff;
	border-radius: 8px;
	flex: 0 0 calc(25% - 9px); /* 四宫格布局，每个卡片占25%宽度，减去gap */
	min-width: 0; /* 防止flex子项溢出 */
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	overflow: hidden;
	transition: transform 0.2s;
	cursor: pointer;
}

.script-card:active {
	transform: scale(0.95);
}

.image-carousel {
	position: relative;
	height: 120px;
	width: 100%;
}

.swiper-container {
	height: 100%;
}

.swiper-item {
	height: 100%;
}

.script-image {
	width: 100%;
	height: 100%;
	display: block;
	object-fit: cover;
	max-width: 100%;
}

.default-image {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #f5f5f5;
}

.image-count {
	position: absolute;
	top: 8px;
	right: 8px;
	background-color: rgba(0, 0, 0, 0.6);
	color: #fff;
	font-size: 12px;
	padding: 4px 8px;
	border-radius: 12px;
}

.script-info {
	padding: 12px;
	height: 100px;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}

/* animations */
.animations-enabled .script-card {
	animation: cardIn 360ms ease both;
}

@keyframes cardIn {
	from {
		opacity: 0;
		transform: translateY(6px) scale(0.995);
	}
	to {
		opacity: 1;
		transform: translateY(0) scale(1);
	}
}

/* 响应式设计 */
@media screen and (max-width: 768px) {
	.script-card {
		flex: 0 0 calc(50% - 6px); /* 小屏幕两列 */
	}

	.script-info {
		padding: 10px;
		height: 90px;
	}

	.script-title {
		font-size: 13px;
	}

	.author {
		font-size: 11px;
	}

	.image-carousel {
		height: 100px;
	}
}

@media screen and (max-width: 480px) {
	.script-card {
		flex: 0 0 100%; /* 超小屏幕单列 */
	}

	.script-grid {
		gap: 8px;
		padding: 12px;
	}

	.image-carousel {
		height: 140px;
	}

	.script-info {
		height: 110px;
		padding: 12px;
	}
}

.script-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 6px;
	gap: 6px;
}

.script-title {
	font-size: 14px;
	font-weight: 600;
	color: #333;
	flex: 1;
	line-height: 1.3;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	min-width: 0;
}

.like-section {
	display: flex;
	align-items: center;
	flex-shrink: 0;
}

.like-count {
	font-size: 14px;
	color: #666;
	margin-left: 4px;
}

.script-meta {
	margin-bottom: 8px;
}

.author {
	font-size: 12px;
	color: #666;
	line-height: 1.2;
	display: -webkit-box;
	-webkit-line-clamp: 1;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.script-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}

.tag {
	background-color: #f0f0f0;
	color: #666;
	font-size: 10px;
	padding: 2px 6px;
	border-radius: 8px;
	line-height: 1.2;
}

.loading {
	text-align: center;
	padding: 40px;
	color: #999;
}

.empty-state {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	width: 100%;
	min-height: calc(100vh - 140px);
	padding: 20px;
	box-sizing: border-box;
}

.empty-text {
	color: #999;
	font-size: 16px;
	font-weight: 500;
	text-align: center;
	line-height: 1.5;
}

.bottom-nav {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	background-color: #fff;
	border-top: 1px solid #e5e5e5;
	display: flex;
	padding: 8px 0;
}

.nav-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 8px 0;
	transition: opacity 0.2s;
}

.nav-item.active .nav-text {
	color: #007AFF;
}

.nav-item:active {
	opacity: 0.7;
}

.nav-text {
	font-size: 12px;
	color: #666;
	margin-top: 4px;
}
</style>
