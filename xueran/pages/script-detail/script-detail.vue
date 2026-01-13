<template>
	<view class="container">
		<scroll-view scroll-y="true" class="scroll-container">
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

				<!-- 操作按钮 -->
				<view class="action-buttons">
					<button
						class="action-btn primary"
						@click="copyJsonUrl"
					>
						复制JSON地址
					</button>
					<button
						class="action-btn secondary"
						@click="toggleLike"
					>
						{{ isLiked ? '已点赞' : '点赞' }} ({{ script.likes }})
					</button>
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
							<text class="label">游戏时长：</text>
							<text class="value">{{ script.duration }}</text>
						</view>
						<view class="info-item">
							<text class="label">难度等级：</text>
							<text class="value">{{ script.difficulty }}</text>
						</view>
						<view class="info-item">
							<text class="label">使用次数：</text>
							<text class="value">{{ script.usageCount }}</text>
						</view>
					</view>
				</view>

				<!-- 角色列表 -->
				<view class="roles-section">
					<view class="section-title">角色列表</view>
					<view class="roles-list">
						<view
							v-for="role in script.roles"
							:key="role.id"
							class="role-item"
						>
							<view class="role-header">
								<text class="role-name">{{ role.name }}</text>
								<text class="role-team" :class="role.team">{{ role.team }}</text>
							</view>
							<view class="role-description">{{ role.description }}</view>
						</view>
					</view>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			scriptId: null,
			isLiked: false,
			script: {
				id: 1,
				title: '经典剧本：狼人杀',
				author: '血染钟楼官方',
				version: '1.0.0',
				updateTime: '2024-01-12',
				jsonUrl: 'https://example.com/script1.json',
				description: '经典的狼人杀剧本，适合新手入门。游戏中狼人会在夜晚行动，村民需要在白天找出并处决狼人。',
				playerCount: '8-12人',
				duration: '30-45分钟',
				difficulty: '简单',
				usageCount: 1250,
				likes: 156,
				images: [
					'/static/script1.jpg',
					'/static/script2.jpg'
				],
				roles: [
					{
						id: 1,
						name: '狼人',
						team: '狼人',
						description: '夜晚可以杀死一名玩家'
					},
					{
						id: 2,
						name: '预言家',
						team: '村民',
						description: '夜晚可以查验一名玩家的身份'
					},
					{
						id: 3,
						name: '村民',
						team: '村民',
						description: '普通村民，没有特殊能力'
					}
				]
			}
		}
	},
	onLoad(options) {
		this.scriptId = options.id;
		// 这里可以根据scriptId从服务器获取剧本详情
		this.loadScriptDetail();
	},
	methods: {
		loadScriptDetail() {
			// 模拟加载剧本详情
			// 在实际项目中，这里应该调用API获取数据
			console.log('加载剧本详情:', this.scriptId);
		},
		copyJsonUrl() {
			uni.setClipboardData({
				data: this.script.jsonUrl,
				success: () => {
					uni.showToast({
						title: 'JSON地址已复制',
						icon: 'success'
					});
				}
			});
		},
		toggleLike() {
			this.isLiked = !this.isLiked;
			if (this.isLiked) {
				this.script.likes++;
				uni.showToast({
					title: '点赞成功',
					icon: 'success'
				});
			} else {
				this.script.likes--;
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

.roles-section {
	margin-top: 32rpx;
}

.roles-list {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.role-item {
	background-color: #f8f8f8;
	border-radius: 8rpx;
	padding: 20rpx;
}

.role-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 8rpx;
}

.role-name {
	font-size: 30rpx;
	font-weight: bold;
	color: #333;
}

.role-team {
	font-size: 24rpx;
	padding: 4rpx 12rpx;
	border-radius: 12rpx;
	font-weight: bold;

	&.狼人 {
		background-color: #ff4757;
		color: white;
	}

	&.村民 {
		background-color: #3742fa;
		color: white;
	}
}

.role-description {
	font-size: 26rpx;
	color: #666;
	line-height: 1.5;
}
</style>
