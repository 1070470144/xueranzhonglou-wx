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

		<!-- 剧本列表 -->
		<view class="script-list">
			<view
				v-for="(script, index) in filteredScripts"
				:key="script.id"
				class="script-item slide-up"
				:style="{ animationDelay: index * 0.1 + 's' }"
				@click="goToDetail(script)"
			>
				<!-- 图片轮播 -->
				<view class="image-carousel" v-if="script.images && script.images.length > 0">
					<swiper
						:indicator-dots="script.images.length > 1"
						:autoplay="script.images.length > 1"
						:interval="3000"
						:duration="500"
						class="swiper"
					>
						<swiper-item
							v-for="(image, index) in script.images"
							:key="index"
						>
							<image :src="image" class="script-image" mode="aspectFill" />
						</swiper-item>
					</swiper>
				</view>

				<!-- 剧本信息 -->
				<view class="script-info">
					<view class="script-title">{{ script.title }}</view>
					<view class="script-meta">
						<text class="author">作者：{{ script.author }}</text>
						<text class="version">版本：{{ script.version }}</text>
					</view>
					<view class="script-actions">
						<view class="like-section" @click.stop="toggleLike(script)">
							<text class="like-icon">{{ script.isLiked ? '❤️' : '🤍' }}</text>
							<text class="like-count">{{ script.likes }}</text>
						</view>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			searchKeyword: '',
			searchFocused: false,
			scripts: [
				{
					id: 1,
					title: '经典剧本：狼人杀',
					author: '血染钟楼官方',
					version: '1.0.0',
					jsonUrl: 'https://example.com/script1.json',
					likes: 156,
					isLiked: false,
					images: [
						'/static/script1.jpg',
						'/static/script2.jpg'
					]
				},
				{
					id: 2,
					title: '扩展包：恶魔的觉醒',
					author: '社区贡献者',
					version: '2.1.0',
					jsonUrl: 'https://example.com/script2.json',
					likes: 134,
					isLiked: false,
					images: [
						'/static/script3.jpg'
					]
				}
			]
		}
	},
	computed: {
		filteredScripts() {
			if (!this.searchKeyword) {
				return this.scripts;
			}
			return this.scripts.filter(script =>
				script.title.toLowerCase().includes(this.searchKeyword.toLowerCase()) ||
				script.author.toLowerCase().includes(this.searchKeyword.toLowerCase())
			);
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
		}
	},
	onLoad() {
		// 页面加载动画
		this.pageLoaded = true;
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

.script-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.script-item {
	background-color: #fff;
	border-radius: 16rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	overflow: hidden;
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	transform: translateY(30rpx);
	opacity: 0;
	animation: slideUp 0.6s ease-out forwards;

	&:hover {
		transform: translateY(-4rpx);
		box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.12);
	}

	&:active {
		transform: scale(0.96) translateY(-2rpx);
		transition-duration: 0.1s;
	}
}

.image-carousel {
	height: 300rpx;
	position: relative;
}

.swiper {
	height: 100%;
}

.script-image {
	width: 100%;
	height: 100%;
}

.script-info {
	padding: 20rpx;
}

.script-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 12rpx;
	line-height: 1.4;
}

.script-meta {
	display: flex;
	justify-content: space-between;
	margin-bottom: 16rpx;
}

.author, .version {
	font-size: 24rpx;
	color: #666;
}

.script-actions {
	display: flex;
	justify-content: flex-end;
}

.like-section {
	display: flex;
	align-items: center;
	cursor: pointer;
	padding: 10rpx 16rpx;
	border-radius: 20rpx;
	background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%);
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);

	&:hover {
		background: linear-gradient(135deg, #f0f4ff 0%, #e8f2ff 100%);
		transform: translateY(-2rpx);
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
	}

	&:active {
		transform: scale(0.95) translateY(0rpx);
		transition-duration: 0.1s;
	}
}

.like-icon {
	font-size: 32rpx;
	margin-right: 6rpx;
	transition: all 0.3s ease;
	display: inline-block;
}

.like-count {
	font-size: 26rpx;
	color: #666;
	font-weight: 600;
	transition: all 0.3s ease;
}
</style>
