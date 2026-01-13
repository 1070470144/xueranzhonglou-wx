<template>
	<view class="container">
		<!-- 搜索栏 -->
		<view class="search-bar">
			<input
				v-model="searchKeyword"
				placeholder="搜索剧本名称或作者"
				class="search-input"
				@input="onSearch"
			/>
		</view>

		<!-- 剧本列表 -->
		<view class="script-list">
			<view
				v-for="script in filteredScripts"
				:key="script.id"
				class="script-item"
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
						<button
							class="copy-btn"
							size="mini"
							@click.stop="copyJsonUrl(script.jsonUrl)"
						>
							复制JSON地址
						</button>
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
			scripts: [
				{
					id: 1,
					title: '经典剧本：狼人杀',
					author: '血染钟楼官方',
					version: '1.0.0',
					jsonUrl: 'https://example.com/script1.json',
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
		goToDetail(script) {
			uni.navigateTo({
				url: `/pages/script-detail/script-detail?id=${script.id}`
			});
		},
		copyJsonUrl(url) {
			uni.setClipboardData({
				data: url,
				success: () => {
					uni.showToast({
						title: 'JSON地址已复制',
						icon: 'success'
					});
				}
			});
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	padding: 20rpx;
}

.search-bar {
	margin-bottom: 20rpx;
}

.search-input {
	border: 1rpx solid #ddd;
	border-radius: 8rpx;
	padding: 16rpx;
	font-size: 28rpx;
	background-color: #f8f8f8;
}

.script-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.script-item {
	background-color: #fff;
	border-radius: 12rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
	overflow: hidden;
	transition: transform 0.2s;

	&:active {
		transform: scale(0.98);
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

.copy-btn {
	background-color: #007AFF;
	color: white;
	border-radius: 6rpx;
	font-size: 24rpx;
}
</style>
