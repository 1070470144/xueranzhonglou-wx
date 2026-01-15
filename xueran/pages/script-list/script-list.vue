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
import { likeScript, unlikeScript, initScriptsLikeStatus } from '@/utils/api.js';

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
			error: null,
			// cache
			cacheKey: 'script_list_cache',
			cacheExpiry: 5 * 60 * 1000, // 5分钟缓存
			lastCacheTime: null,
			// retry
			maxRetries: 3,
			retryDelay: 1000 // 1秒重试延迟
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
		async toggleLike(script) {
			// 添加点赞动画
			script.likeAnimating = true;
			setTimeout(() => {
				script.likeAnimating = false;
			}, 300);

			const wasLiked = script.isLiked;
			const newLikedState = !wasLiked;

			try {
				let result;
				if (newLikedState) {
					// 点赞
					result = await likeScript(script.id);
					if (result.success) {
						script.likes++;
					}
				} else {
					// 取消点赞
					result = await unlikeScript(script.id);
					if (result.success) {
						script.likes = Math.max(0, script.likes - 1);
					}
				}

				if (result.success) {
					script.isLiked = newLikedState;
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
			} finally {
				// 无论成功失败，都停止动画
				setTimeout(() => {
					script.likeAnimating = false;
				}, 300);
			}
		},
		// 缓存管理方法
		saveToCache(data) {
			try {
				const cacheData = {
					data: data,
					timestamp: Date.now(),
					searchKeyword: this.searchKeyword
				};
				uni.setStorageSync(this.cacheKey, JSON.stringify(cacheData));
				this.lastCacheTime = Date.now();
			} catch (e) {
				console.warn('Failed to save cache:', e);
			}
		},
		loadFromCache() {
			try {
				const cacheStr = uni.getStorageSync(this.cacheKey);
				if (!cacheStr) return null;

				const cacheData = JSON.parse(cacheStr);
				const now = Date.now();

				// 检查缓存是否过期
				if (now - cacheData.timestamp > this.cacheExpiry) {
					uni.removeStorageSync(this.cacheKey);
					return null;
				}

				// 检查搜索关键词是否匹配
				if (cacheData.searchKeyword !== this.searchKeyword) {
					return null;
				}

				this.lastCacheTime = cacheData.timestamp;
				return cacheData.data;
			} catch (e) {
				console.warn('Failed to load cache:', e);
				return null;
			}
		},
		clearCache() {
			try {
				uni.removeStorageSync(this.cacheKey);
				this.lastCacheTime = null;
			} catch (e) {
				console.warn('Failed to clear cache:', e);
			}
		},

		// 重试机制
		async retryWithBackoff(fn, retries = this.maxRetries) {
			for (let i = 0; i < retries; i++) {
				try {
					return await fn();
				} catch (error) {
					if (i === retries - 1) throw error;
					console.warn(`Retry ${i + 1}/${retries} failed:`, error);
					await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, i)));
				}
			}
		},

		// fetch paginated scripts from cloud
		async fetchScripts({ page = 1, append = false, q = '', useCache = true } = {}) {
			if (this.loading) return;
			this.loading = true;
			this.error = null;

			try {
				// 对于第一页且启用缓存，尝试从缓存加载
				if (page === 1 && useCache && !append) {
					const cachedData = this.loadFromCache();
					if (cachedData) {
						this.scripts = cachedData.scripts || [];
						this.page = cachedData.page || 1;
						this.noMore = cachedData.noMore || false;
						this.loading = false;
						return;
					}
				}
				// 使用重试机制调用云函数
				const result = await this.retryWithBackoff(async () => {
					const res = await uniCloud.callFunction({
						name: 'listScripts',
						data: {
							page,
							pageSize: this.pageSize,
							q
						}
					});
					return (res && res.result) ? res.result : res;
				});
				const rawList = (result && result.data) ? result.data : [];
				const processedList = [];
				for (let i = 0; i < rawList.length; i++) {
					const item = rawList[i];
					try {
						// ID字段标准化
						item.id = item._id || item.id;
						delete item._id;

						// 确保images是数组且包含有效的URL
						if (Array.isArray(item.images)) {
							item.images = item.images.slice(0, 3).map(img => {
								// 如果是对象，尝试获取url属性；如果是字符串，直接使用
								if (typeof img === 'object' && img !== null) {
									return img.url || img.fileId || img.path || null;
								} else if (typeof img === 'string') {
									return img;
								}
								return null;
							}).filter(url => url && typeof url === 'string');
						} else {
							item.images = [];
						}

						// 数据结构统一适配
						// 状态字段默认值
						item.status = item.status || 'active';

						// 标签字段转换：数组转字符串
						if (Array.isArray(item.tags) && item.tags.length > 0) {
							item.tag = item.tags[0]; // 取第一个标签
						} else {
							item.tag = '推理'; // 默认标签
						}

						// 时间字段映射
						item.updateTime = item.updateTime || item.createdAt;

						// 统计字段默认值
						item.usageCount = item.usageCount || 0;

						// 版本字段默认值
						item.version = item.version || '1.0.0';

						processedList.push(item);
					} catch (itemErr) {
						// 单条数据处理失败，记录并跳过该条，继续处理余下数据
						console.error('process script item error', itemErr, item && item.id ? item.id : i);
					}
				}

				// 初始化点赞状态（只对成功处理的条目）
				const list = initScriptsLikeStatus(processedList);

				if (append) {
					this.scripts = this.scripts.concat(list);
				} else {
					this.scripts = list;
					// 保存第一页数据到缓存
					this.saveToCache({
						scripts: list,
						page: this.page,
						noMore: this.noMore,
						total: result.total
					});
				}
				if (!result.total) {
					this.noMore = list.length < this.pageSize;
				} else {
					this.noMore = (page * this.pageSize) >= result.total;
				}
				this.page = page;
			} catch (err) {
				// 记录完整错误用于调试，但对用户显示友好信息，避免将内部错误细节暴露给用户
				console.error('fetchScripts error', err);
				this._lastError = err;
				this.error = '加载数据失败，请稍后重试';
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
			// 清除缓存，强制重新加载最新数据
			this.clearCache();
			await this.fetchScripts({ page: 1, append: false, q: this.searchKeyword, useCache: false });
		},
		// reach bottom load more
		async handleReachBottom() {
			if (this.loading || this.noMore) return;

			// 性能优化：限制最大页数，避免过度加载
			const maxPages = 10;
			if (this.page >= maxPages) {
				this.noMore = true;
				return;
			}

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
