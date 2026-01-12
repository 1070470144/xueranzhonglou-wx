<template>
	<view :class="['container', animationsEnabled ? 'animations-enabled' : '']">
		<!-- 使用系统导航栏（navigationStyle: default），页面内容直接从顶部下方开始 -->

		<!-- 榜单切换 -->
		<view class="tab-bar">
			<view
				v-for="(tab, index) in tabs"
				:key="tab.key"
				class="tab-item"
				:class="{ active: currentTab === index }"
				@click="switchTab(index)"
			>
				<text class="tab-text">{{ tab.name }}</text>
				<view v-if="currentTab === index" class="tab-indicator"></view>
			</view>
		</view>

		<!-- 排行榜内容 -->
		<scroll-view class="ranking-list" scroll-y="true">
			<view
				v-for="(item, index) in currentRankingList"
				:key="item.id"
				class="ranking-item"
				@click="goToDetail(item)"
			>
				<!-- 排名 -->
				<view class="rank-section">
					<view
						class="rank-number"
						:class="{
							'rank-1': index === 0,
							'rank-2': index === 1,
							'rank-3': index === 2
						}"
					>
						<text>{{ index + 1 }}</text>
					</view>
					<view v-if="index < 3" class="rank-icon">
						<uni-icons
							v-if="index === 0"
							type="medal"
							size="16"
							color="#FFD700"
						></uni-icons>
						<uni-icons
							v-else-if="index === 1"
							type="medal"
							size="16"
							color="#C0C0C0"
						></uni-icons>
						<uni-icons
							v-else
							type="medal"
							size="16"
							color="#CD7F32"
						></uni-icons>
					</view>
				</view>

				<!-- 剧本信息 -->
				<view class="item-content">
					<view class="item-header">
						<text class="item-title">{{ item.title }}</text>
						<view class="item-stats">
							<view class="stat-item">
								<uni-icons
									:type="getStatIcon(currentTab)"
									size="14"
									:color="getStatColor(currentTab)"
								></uni-icons>
								<text class="stat-value">{{ getStatValue(item, currentTab) }}</text>
							</view>
						</view>
					</view>

					<view class="item-meta">
						<text class="author">作者：{{ item.author }}</text>
						<text class="version">v{{ item.version }}</text>
					</view>

					<view class="item-tags">
						<text
							v-for="tag in item.tags"
							:key="tag"
							class="tag"
						>{{ tag }}</text>
					</view>
				</view>

				<!-- 缩略图 -->
				<view class="item-thumbnail">
					<image
						:src="item.thumbnail"
						mode="aspectFill"
						class="thumbnail-image"
						@error="onImageError"
					/>
				</view>
			</view>

			<!-- 加载更多 -->
			<view v-if="loading" class="loading">
				<text>加载中...</text>
			</view>

			<!-- 空状态 -->
			<view v-if="!loading && currentRankingList.length === 0" class="empty-state">
				<text class="empty-text">暂无数据</text>
			</view>
		</scroll-view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			animationsEnabled: true,
			currentTab: 0,
			loading: false,
			tabs: [
				{ key: 'likes', name: '点赞榜' },
				{ key: 'views', name: '浏览榜' },
				{ key: 'recent', name: '最新发布' }
			],
			rankingData: {
				likes: [],
				views: [],
				recent: []
			}
		}
	},
	computed: {
		currentRankingList() {
			const tabKey = this.tabs[this.currentTab].key
			return this.rankingData[tabKey] || []
		}
	},
	methods: {
		currentRankingList() {
			switch (this.currentTab) {
				case 0: return this.downloadsList
				case 1: return this.likesList
				default: return this.downloadsList
			}
		}
	},
	async onLoad() {
		console.log('剧本排行榜页面加载')
		await this.loadRankings()
	},
	methods: {
		async switchTab(index) {
			this.currentTab = index
			const tabKey = this.tabs[index].key
			if (!this.rankingData[tabKey] || this.rankingData[tabKey].length === 0) {
				await this.loadRankingData(tabKey)
			}
		},

		async loadRankings() {
			await this.loadRankingData('likes') // 默认加载点赞榜
		},

		async loadRankingData(type) {
			this.loading = true
			try {
				const result = await uniCloud.callFunction({
					name: 'ranking-service',
					data: {
						method: 'getRankingList',
						params: [{
							type: type,
							limit: 50
						}]
					}
				})

				if (result.result.success) {
					this.rankingData[type] = result.result.data.list
				} else {
					console.error('加载排行榜失败:', result.result.message)
					uni.showToast({
						title: '加载失败',
						icon: 'none'
					})
				}
			} catch (error) {
				console.error('加载排行榜失败:', error)
				uni.showToast({
					title: '网络错误',
					icon: 'none'
				})
			} finally {
				this.loading = false
			}
		},
		goBack() {
			uni.navigateBack()
		},
		goToDetail(item) {
			uni.navigateTo({
				url: `/pages/detail/detail?id=${item._id || item.id}`
			})
		},
		getStatIcon(tabIndex) {
			switch (tabIndex) {
				case 0: return 'heart-filled' // 点赞榜
				case 1: return 'eye' // 浏览榜
				case 2: return 'calendar' // 最新发布
				default: return 'bars'
			}
		},
		getStatColor(tabIndex) {
			switch (tabIndex) {
				case 0: return '#FF4757' // 点赞榜
				case 1: return '#007AFF' // 浏览榜
				case 2: return '#28A745' // 最新发布
				default: return '#666'
			}
		},
		getStatValue(item, tabIndex) {
			switch (tabIndex) {
				case 0: return this.formatNumber(item.likes || 0)
				case 1: return this.formatNumber(item.views || 0)
				case 2: return this.formatDate(item.createTime)
				default: return '0'
			}
		},

		formatDate(timestamp) {
			if (!timestamp) return ''
			const date = new Date(timestamp)
			const now = new Date()
			const diff = now - date
			const days = Math.floor(diff / (1000 * 60 * 60 * 24))

			if (days === 0) return '今天'
			if (days === 1) return '昨天'
			if (days < 7) return `${days}天前`
			if (days < 30) return `${Math.floor(days / 7)}周前`
			return `${Math.floor(days / 30)}月前`
		},
		formatNumber(num) {
			if (num >= 10000) {
				return (num / 10000).toFixed(1) + 'w'
			} else if (num >= 1000) {
				return (num / 1000).toFixed(1) + 'k'
			}
			return num.toString()
		},
		onImageError() {
			console.log('缩略图加载失败')
		}
	},
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
	width: 44px;
	height: 44px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 22px;
	transition: background-color 0.2s;
}

.back-btn:active {
	background-color: #f5f5f5;
}

.title {
	font-size: 18px;
	font-weight: 600;
	color: #333;
}

.placeholder {
	width: 44px;
}

.tab-bar {
	display: flex;
	background-color: #fff;
	border-bottom: 1px solid #e5e5e5;
}

.tab-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 16px 0;
	position: relative;
	transition: color 0.2s;
}

.tab-item.active {
	color: #007AFF;
}

.tab-text {
	font-size: 14px;
	color: #666;
	font-weight: 500;
}

.tab-item.active .tab-text {
	color: #007AFF;
}

.tab-indicator {
	position: absolute;
	bottom: 0;
	left: 50%;
	transform: translateX(-50%);
	width: 30px;
	height: 3px;
	background-color: #007AFF;
	border-radius: 2px;
	transition: left 220ms ease, transform 220ms ease;
}

.ranking-list {
	height: calc(100vh - 140px);
	padding: 16px;
}

.ranking-item {
	background-color: #fff;
	border-radius: 12px;
	margin-bottom: 12px;
	padding: 16px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	display: flex;
	align-items: center;
	transition: transform 0.2s;
}

.ranking-item:active {
	transform: scale(0.98);
}

.rank-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 60px;
	margin-right: 12px;
}

.rank-number {
	width: 32px;
	height: 32px;
	border-radius: 16px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 14px;
	font-weight: 600;
	margin-bottom: 4px;
}

.rank-1 {
	background-color: #FFD700;
	color: #fff;
}

.rank-2 {
	background-color: #C0C0C0;
	color: #fff;
}

.rank-3 {
	background-color: #CD7F32;
	color: #fff;
}

.rank-number:not(.rank-1):not(.rank-2):not(.rank-3) {
	background-color: #f0f0f0;
	color: #666;
}

.item-content {
	flex: 1;
}

.item-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 8px;
}

.item-title {
	font-size: 16px;
	font-weight: 600;
	color: #333;
	flex: 1;
	margin-right: 12px;
	line-height: 1.4;
}

.item-stats {
	flex-shrink: 0;
}

.stat-item {
	display: flex;
	align-items: center;
}

.stat-value {
	font-size: 14px;
	color: #666;
	margin-left: 4px;
	font-weight: 500;
}

.item-meta {
	display: flex;
	align-items: center;
	margin-bottom: 8px;
}

.author {
	font-size: 12px;
	color: #666;
	margin-right: 12px;
}

.version {
	font-size: 12px;
	color: #007AFF;
	font-weight: 500;
}

.item-tags {
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
}

.item-thumbnail {
	width: 60px;
	height: 60px;
	border-radius: 8px;
	overflow: hidden;
	margin-left: 12px;
	flex-shrink: 0;
}

.thumbnail-image {
	width: 100%;
	height: 100%;
}

/* animations */
.animations-enabled .ranking-item {
	animation: rankingCardIn 360ms ease both;
}

@keyframes rankingCardIn {
	from {
		opacity: 0;
		transform: translateY(6px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
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
</style>
