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

		<!-- 剧本列表 -->
		<view :class="['script-list', animationsEnabled ? 'animations-enabled' : '']">
			<view
				v-for="(script, index) in scriptList"
				:key="script.id"
				class="script-card"
				@click="goToDetail(script)"
			>
				<!-- 剧本图片轮播 -->
				<view class="image-carousel">
					<swiper
						:indicator-dots="script.images.length > 1"
						:autoplay="false"
						:circular="true"
						class="swiper-container"
					>
						<swiper-item
							v-for="(image, imgIndex) in script.images"
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
					</swiper>
					<!-- 图片数量指示器 -->
					<view v-if="script.images.length > 1" class="image-count">
						{{ script.images.length }}/3
					</view>
				</view>

				<!-- 剧本信息 -->
				<view class="script-info">
					<view class="script-header">
						<text class="script-title">{{ script.title }}</text>
						<view class="like-section">
							<uni-icons type="heart-filled" size="16" color="#ff4757"></uni-icons>
							<text class="like-count">{{ script.likes }}</text>
						</view>
					</view>

					<view class="script-meta">
						<text class="version">v{{ script.version }}</text>
						<text class="separator">·</text>
						<text class="author">{{ script.author }}</text>
					</view>

					<view class="script-tags">
						<text
							v-for="tag in script.tags"
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
					this.scriptList = result.result.data.list
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

.script-list {
	height: calc(100vh - 140px);
	padding: 16px;
	overflow-x: hidden; /* 防止横向溢出 */
	/* Ensure child elements respect container width */
	box-sizing: border-box;
}

.script-card {
	background-color: #fff;
	border-radius: 12px;
	margin-bottom: 16px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	overflow: hidden;
	transition: transform 0.2s;
	max-width: 100%;
	box-sizing: border-box;
}

.script-card:active {
	transform: scale(0.98);
}

.image-carousel {
	position: relative;
	height: 200px;
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
	padding: 16px;
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

.script-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 8px;
	gap: 8px;
}

.script-title {
	font-size: 16px;
	font-weight: 600;
	color: #333;
	flex: 1;
	margin-right: 12px;
	/* allow flex item to shrink properly on small screens */
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
	display: flex;
	align-items: center;
	margin-bottom: 12px;
}

.version {
	font-size: 12px;
	color: #007AFF;
	font-weight: 500;
}

.separator {
	margin: 0 8px;
	color: #ccc;
	font-size: 12px;
}

.author {
	font-size: 12px;
	color: #666;
}

.script-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.tag {
	background-color: #f0f0f0;
	color: #666;
	font-size: 11px;
	padding: 4px 8px;
	border-radius: 12px;
}

.loading {
	text-align: center;
	padding: 40px;
	color: #999;
}

.empty-state {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 200px;
}

.empty-text {
	color: #999;
	font-size: 14px;
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
