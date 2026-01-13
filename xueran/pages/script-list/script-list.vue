<template>
	<view class="container fade-in">
		<!-- 搜索栏 -->
		<view class="search-bar slide-down">
			<input
				v-model="searchKeyword"
				placeholder="搜索剧本名称或作者"
				class="search-input"
				@focus="onSearchFocus"
				@blur="onSearchBlur"
				@input="onSearch"
			/>
		</view>

		<!-- 剧本网格 / 骨架占位 -->
		<view v-if="loading && scripts.length === 0" class="script-grid">
			<view v-for="n in pageSize" :key="'skeleton-'+n" class="script-item skeleton">
				<view class="script-cover skeleton-cover"></view>
				<view class="script-info">
					<view class="skeleton-line title"></view>
					<view class="skeleton-line meta"></view>
				</view>
			</view>
		</view>
		<view v-else class="script-grid">
			<view
				v-for="(script, index) in filteredScripts"
				:key="script.id"
				class="script-item slide-up"
				:style="{ animationDelay: index * 0.05 + 's' }"
				@click="goToDetail(script)"
			>
				<!-- 剧本封面 -->
				<view class="script-cover">
					<image
						v-if="script.images && script.images.length > 0"
						:src="script.images[0]"
						class="cover-image"
						mode="aspectFill"
					/>
					<view v-else class="no-image">
						<text class="no-image-text">暂无图片</text>
					</view>
				</view>

				<!-- 剧本信息 -->
				<view class="script-info">
					<view class="script-title">{{ script.title || '无标题' }}</view>
					<view class="script-meta">
						<text class="author">{{ script.author || '未知作者' }}</text>
						<text class="version">{{ script.version || 'v1.0' }}</text>
					</view>
					<view class="script-stats">
						<view class="like-section" @click.stop="toggleLike(script)">
							<text class="like-icon">{{ script.isLiked ? '❤️' : '🤍' }}</text>
							<text class="like-count">{{ script.likes }}</text>
						</view>
					</view>
				</view>
			</view>
		</view>

		<!-- 列表底部状态 -->
		<view class="list-footer" v-if="loading && scripts.length > 0">
			<text>加载中...</text>
		</view>
		<view class="list-footer" v-else-if="noMore && scripts.length > 0">
			<text>没有更多了</text>
		</view>
		<view class="list-footer" v-else-if="error">
			<text>{{ error }}</text>
			<button @click="fetchScripts({ page: 1, append: false, q: searchKeyword })">重试</button>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			searchKeyword: '',
			searchFocused: false,
			scripts: [],
			// pagination
			page: 1,
			pageSize: 12,
			loading: false,
			noMore: false,
			refreshing: false,
			error: null
		}
	},
	computed: {
		filteredScripts() {
			if (!this.searchKeyword) {
				return this.scripts;
			}
			const keyword = this.searchKeyword.toLowerCase();
			return this.scripts.filter(script => {
				const title = script.title ? String(script.title).toLowerCase() : '';
				const author = script.author ? String(script.author).toLowerCase() : '';
				return title.includes(keyword) || author.includes(keyword);
			});
		}
	},
	methods: {
		onSearch() {
			// 搜索逻辑已在computed中处理
		},
		onSearchFocus() {
			this.searchFocused = true;
		},
		onSearchBlur() {
			this.searchFocused = false;
		},
		goToDetail(script) {
			// 添加点击动画
			script.clicked = true;
			setTimeout(() => {
				script.clicked = false;
			}, 200);

			uni.navigateTo({
				url: `/pages/script-detail/script-detail?id=${script.id}`
			});
		},
		toggleLike(script) {
			// 添加点赞动画
			script.likeAnimating = true;
			setTimeout(() => {
				script.likeAnimating = false;
			}, 300);

			script.isLiked = !script.isLiked;
			if (script.isLiked) {
				script.likes++;
				uni.showToast({
					title: '点赞成功',
					icon: 'success'
				});
			} else {
				script.likes--;
			}
		},
		// fetch paginated scripts from cloud
		async fetchScripts({ page = 1, append = false, q = '' } = {}) {
			if (this.loading) return;
			this.loading = true;
			this.error = null;
			try {
				const res = await uniCloud.callFunction({
					name: 'listScripts',
					data: {
						page,
						pageSize: this.pageSize,
						q
					}
				});
				const result = (res && res.result) ? res.result : res;
				const list = (result && result.data) ? result.data : [];
				list.forEach(item => {
					// 确保images是数组且包含有效的URL
					if (Array.isArray(item.images)) {
						item.images = item.images.slice(0, 3).map(img => {
							// 如果是对象，尝试获取url属性；如果是字符串，直接使用
							if (typeof img === 'object' && img.url) {
								return img.url;
							} else if (typeof img === 'string') {
								return img;
							}
							return null;
						}).filter(url => url && typeof url === 'string');
					} else {
						item.images = [];
					}
				});
				if (append) {
					this.scripts = this.scripts.concat(list);
				} else {
					this.scripts = list;
				}
				if (!result.total) {
					this.noMore = list.length < this.pageSize;
				} else {
					this.noMore = (page * this.pageSize) >= result.total;
				}
				this.page = page;
			} catch (err) {
				console.error('fetchScripts error', err);
				this.error = err.message || '加载失败';
			} finally {
				this.loading = false;
				if (this.refreshing) {
					uni.stopPullDownRefresh && uni.stopPullDownRefresh();
					this.refreshing = false;
				}
			}
		},
		// pull down refresh
		async handlePullDownRefresh() {
			this.refreshing = true;
			this.noMore = false;
			await this.fetchScripts({ page: 1, append: false, q: this.searchKeyword });
		},
		// reach bottom load more
		async handleReachBottom() {
			if (this.loading || this.noMore) return;
			const next = this.page + 1;
			await this.fetchScripts({ page: next, append: true, q: this.searchKeyword });
		}
	},
	onLoad() {
		// 页面加载，先加载第一页
		this.fetchScripts({ page: 1, append: false });
	}
	// uni-app page hooks
	,onPullDownRefresh() {
		this.handlePullDownRefresh();
	}
	,onReachBottom() {
		this.handleReachBottom();
	}
}
</script>

<style lang="scss" scoped>
// 关键帧动画定义
@keyframes fadeIn {
	0% {
		opacity: 0;
		transform: translateY(20rpx);
	}
	100% {
		opacity: 1;
		transform: translateY(0);
	}
}

@keyframes slideDown {
	0% {
		opacity: 0;
		transform: translateY(-30rpx);
	}
	100% {
		opacity: 1;
		transform: translateY(0);
	}
}

@keyframes slideUp {
	0% {
		opacity: 0;
		transform: translateY(40rpx);
	}
	100% {
		opacity: 1;
		transform: translateY(0);
	}
}

@keyframes bounce {
	0%, 20%, 53%, 80%, 100% {
		transform: translate3d(0, 0, 0);
	}
	40%, 43% {
		transform: translate3d(0, -8rpx, 0);
	}
	70% {
		transform: translate3d(0, -4rpx, 0);
	}
	90% {
		transform: translate3d(0, -2rpx, 0);
	}
}

@keyframes pulse {
	0% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.1);
	}
	100% {
		transform: scale(1);
	}
}

.container {
	padding: 20rpx;
	opacity: 0;
	animation: fadeIn 0.6s ease-out forwards;
}

.search-bar {
	margin-bottom: 20rpx;
	transform: translateY(-20rpx);
	opacity: 0;
	animation: slideDown 0.5s ease-out 0.2s forwards;
}

.search-input {
	border: 1rpx solid #ddd;
	border-radius: 25rpx;
	padding: 16rpx 24rpx;
	font-size: 28rpx;
	background-color: #f8f8f8;
	transition: all 0.3s ease;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);

	&:focus {
		border-color: #007AFF;
		background-color: #fff;
		box-shadow: 0 4rpx 16rpx rgba(0, 122, 255, 0.15);
		transform: scale(1.02);
	}
}

.script-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 20rpx;
	padding: 20rpx;
}

.script-item {
	background-color: #fff;
	border-radius: 16rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	overflow: hidden;
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	transform: translateY(30rpx);
	opacity: 0;
	animation: slideUp 0.5s ease-out forwards;
	cursor: pointer;

	&:hover {
		transform: translateY(-4rpx);
		box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.12);
	}

	&:active {
		transform: scale(0.96) translateY(-2rpx);
		transition-duration: 0.1s;
	}
}

.script-cover {
	position: relative;
	height: 200rpx;
	background-color: #f8f8f8;
}

.cover-image {
	width: 100%;
	height: 100%;
	border-radius: 12rpx 12rpx 0 0;
}

.no-image {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 12rpx 12rpx 0 0;
}

.no-image-text {
	color: rgba(255, 255, 255, 0.8);
	font-size: 24rpx;
}

.script-info {
	padding: 16rpx;
	height: 140rpx;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}

.script-title {
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
	line-height: 1.3;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	line-clamp: 2;
	overflow: hidden;
	margin-bottom: 8rpx;
}

.script-meta {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12rpx;
}

.author, .version {
	font-size: 22rpx;
	color: #666;
}

.author {
	flex: 1;
}

.version {
	font-size: 20rpx;
	background-color: #f0f0f0;
	padding: 2rpx 8rpx;
	border-radius: 8rpx;
}

.script-stats {
	display: flex;
	justify-content: flex-end;
}

.like-section {
	display: flex;
	align-items: center;
	cursor: pointer;
	padding: 6rpx 12rpx;
	border-radius: 16rpx;
	background-color: #f8f8f8;
	transition: all 0.3s ease;
	border: 1rpx solid #e8e8e8;

	&:active {
		transform: scale(0.9);
		transition-duration: 0.1s;
	}
}

.like-icon {
	font-size: 24rpx;
	margin-right: 4rpx;
	display: inline-block;
}

.like-count {
	font-size: 22rpx;
	color: #666;
	font-weight: 500;
}

/* skeleton styles */
.skeleton {
	background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
	box-shadow: none;
}
.skeleton-cover {
	height: 200rpx;
	background: linear-gradient(90deg, #eee 0%, #f5f5f5 50%, #eee 100%);
	border-radius: 12rpx 12rpx 0 0;
}
.skeleton-line {
	height: 28rpx;
	background: linear-gradient(90deg, #eee 0%, #f5f5f5 50%, #eee 100%);
	border-radius: 6rpx;
	margin-bottom: 12rpx;
}
.skeleton-line.title {
	width: 80%;
	height: 32rpx;
}
.skeleton-line.meta {
	width: 50%;
	height: 24rpx;
}

.list-footer {
	text-align: center;
	padding: 24rpx 0;
	color: #999;
	font-size: 26rpx;
}
</style>
