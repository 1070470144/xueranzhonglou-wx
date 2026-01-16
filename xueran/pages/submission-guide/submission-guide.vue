<template>
	<view class="container fade-in">
		<!-- 页面头部 -->
		<view class="header slide-down">
			<view class="nav-bar">
				<view class="back-btn" @click="goBack">
					<text class="back-icon">←</text>
				</view>
				<view class="title">投稿须知</view>
				<view class="placeholder"></view>
			</view>
		</view>

		<!-- 内容区域 -->
		<view class="content">
			<view class="text-content slide-up">
				<!-- 欢迎段落 -->
				<view class="paragraph">
					<text class="paragraph-text">欢迎您参与血染钟楼剧本创作！</text>
				</view>

				<view class="paragraph">
					<text class="paragraph-text">为了确保社区内容的质量和版权合规性，请遵守以下投稿要求：</text>
				</view>

				<!-- 投稿要求列表 -->
				<view class="ordered-list">
					<view class="list-title">投稿要求</view>
					<view class="list-item">
						<text class="item-number">1.</text>
						<text class="item-text">剧本必须为原创作品，不得侵犯他人版权</text>
					</view>
					<view class="list-item">
						<text class="item-number">2.</text>
						<text class="item-text">内容应积极健康，符合社区价值观</text>
					</view>
					<view class="list-item">
						<text class="item-number">3.</text>
						<text class="item-text">包含完整的游戏规则和角色设定</text>
					</view>
					<view class="list-item">
						<text class="item-number">4.</text>
						<text class="item-text">建议提供剧本相关图片（可选）</text>
					</view>
				</view>

				<!-- 格式要求列表 -->
				<view class="unordered-list">
					<view class="list-title">投稿格式要求</view>
					<view class="list-item">
						<text class="item-bullet">•</text>
						<text class="item-text">使用标准JSON格式</text>
					</view>
					<view class="list-item">
						<text class="item-bullet">•</text>
						<text class="item-text">包含标题、作者、版本等基本信息</text>
					</view>
				</view>

				<!-- 审核流程列表 -->
				<view class="ordered-list">
					<view class="list-title">审核流程</view>
					<view class="list-item">
						<text class="item-number">1.</text>
						<text class="item-text">提交后一周内完成审核并上传</text>
					</view>
					<view class="list-item">
						<text class="item-number">2.</text>
						<text class="item-text">通过审核的剧本将公开展示</text>
					</view>
					<view class="list-item">
						<text class="item-number">3.</text>
						<text class="item-text">不符合要求的将收到修改建议</text>
					</view>
				</view>

				<!-- 联系方式 -->
				<view class="contact-section">
					<view class="contact-title">投稿邮箱</view>
					<view class="contact-content" @click="copyEmail">1070470144@qq.com</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	methods: {
		goBack() {
			uni.navigateBack({
				delta: 1
			});
		},

		copyEmail() {
			uni.setClipboardData({
				data: '1070470144@qq.com',
				success: () => {
					uni.showToast({
						title: '邮箱已复制',
						icon: 'success',
						duration: 2000
					});
				},
				fail: () => {
					uni.showToast({
						title: '复制失败',
						icon: 'none',
						duration: 2000
					});
				}
			});
		}
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

.container {
	min-height: 100vh;
	background-color: #f8f8f8;
	opacity: 0;
	animation: fadeIn 0.6s ease-out forwards;
}

.header {
	background-color: #fff;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
	transform: translateY(-20rpx);
	opacity: 0;
	animation: slideDown 0.5s ease-out 0.2s forwards;
}

.nav-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20rpx 30rpx;
	height: 88rpx;
}

.back-btn {
	width: 60rpx;
	height: 60rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background-color: #f8f8f8;
	transition: background-color 0.2s;

	&:active {
		background-color: #e8e8e8;
	}
}

.back-icon {
	font-size: 32rpx;
	color: #333;
	font-weight: bold;
}

.title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	flex: 1;
	text-align: center;
}

.placeholder {
	width: 60rpx;
}

.content {
	padding: 30rpx 20rpx;
	min-height: calc(100vh - 88rpx);
}

.text-content {
	background-color: #fff;
	border-radius: 16rpx;
	padding: 40rpx 30rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	transform: translateY(30rpx);
	opacity: 0;
	animation: slideUp 0.6s ease-out 0.4s forwards;
}

// 段落样式
.paragraph {
	margin-bottom: 32rpx;

	&-text {
		font-size: 28rpx;
		line-height: 1.6;
		color: #555;
		text-align: justify;
		display: block;
	}
}

// 列表样式
.ordered-list, .unordered-list {
	margin-bottom: 40rpx;

	.list-title {
		font-size: 30rpx;
		font-weight: 500;
		color: #333;
		margin-bottom: 24rpx;
		line-height: 1.4;
	}

	.list-item {
		display: flex;
		align-items: flex-start;
		margin-bottom: 16rpx;
		padding-left: 40rpx;
		min-height: 60rpx;

		.item-number, .item-bullet {
			font-size: 28rpx;
			color: #666;
			margin-right: 16rpx;
			flex-shrink: 0;
			line-height: 1.6;
			margin-top: 2rpx;
		}

		.item-text {
			font-size: 28rpx;
			line-height: 1.6;
			color: #555;
			flex: 1;
			text-align: justify;
		}
	}
}

// 联系方式样式
.contact-section {
	background-color: #f8f9fa;
	border-radius: 12rpx;
	padding: 32rpx 24rpx;
	text-align: center;
	margin-top: 16rpx;
	border: 2rpx solid #e9ecef;
	transition: all 0.3s ease;

	&:active {
		background-color: #e9ecef;
		transform: scale(0.98);
	}

	.contact-title {
		font-size: 30rpx;
		font-weight: 500;
		color: #333;
		margin-bottom: 16rpx;
		line-height: 1.4;
	}

	.contact-content {
		font-size: 28rpx;
		color: #007AFF;
		text-decoration: underline;
		line-height: 1.6;
		transition: color 0.2s ease;

		&:active {
			color: #0056CC;
		}
	}
}
</style>
