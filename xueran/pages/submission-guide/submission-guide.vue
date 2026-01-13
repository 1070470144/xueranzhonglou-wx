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
				<text class="guide-text">
					欢迎您参与血染钟楼剧本创作！

					为了确保社区内容的质量和版权合规性，请遵守以下投稿要求：

					1. 剧本必须为原创作品，不得侵犯他人版权
					2. 内容应积极健康，符合社区价值观
					3. 包含完整的游戏规则和角色设定
					4. 建议提供剧本相关图片（可选）

					投稿格式要求：
					- 使用标准JSON格式
					- 包含标题、作者、版本等基本信息
					- 详细描述角色能力和游戏规则

					审核流程：
					- 提交后3-5个工作日内完成审核
					- 通过审核的剧本将公开展示
					- 不符合要求的将收到修改建议

					如有疑问，请联系：support@bloodontheclocktower.cn
				</text>
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

.guide-text {
	font-size: 28rpx;
	line-height: 1.8;
	color: #555;
	display: block;
	white-space: pre-line;
	text-align: justify;
	transition: color 0.3s ease;
}

.text-content:hover .guide-text {
	color: #333;
}
</style>
