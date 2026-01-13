<template>
	<view class="container fade-in">
		<!-- 用户信息区域 -->
		<view class="user-info slide-down">
			<view class="avatar bounce-in">
				<image src="/static/default-avatar.png" class="avatar-image" />
			</view>
			<view class="user-details slide-right">
				<view class="username">游客用户</view>
				<view class="user-desc">登录后可享受更多功能</view>
			</view>
		</view>

		<!-- 菜单列表 -->
		<view class="menu-list slide-up">
			<view class="menu-item" @click="goToSubmissionGuide">
				<view class="menu-icon">
					<text class="icon-text">📋</text>
				</view>
				<view class="menu-content">
					<view class="menu-title">投稿须知</view>
					<view class="menu-desc">了解投稿规则和要求</view>
				</view>
				<view class="menu-arrow">></view>
			</view>

			<view class="menu-item">
				<view class="menu-icon">
					<text class="icon-text">⚙️</text>
				</view>
				<view class="menu-content">
					<view class="menu-title">设置</view>
					<view class="menu-desc">应用设置和偏好</view>
				</view>
				<view class="menu-arrow">></view>
			</view>
		</view>

	</view>
</template>

<script>
export default {
	methods: {
		goToSubmissionGuide() {
			uni.navigateTo({
				url: '/pages/submission-guide/submission-guide'
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

@keyframes slideRight {
	0% {
		opacity: 0;
		transform: translateX(-30rpx);
	}
	100% {
		opacity: 1;
		transform: translateX(0);
	}
}

@keyframes bounceIn {
	0% {
		opacity: 0;
		transform: scale(0.3);
	}
	50% {
		opacity: 1;
		transform: scale(1.05);
	}
	70% {
		transform: scale(0.9);
	}
	100% {
		opacity: 1;
		transform: scale(1);
	}
}

@keyframes float {
	0%, 100% {
		transform: translateY(0rpx);
	}
	50% {
		transform: translateY(-6rpx);
	}
}

.container {
	min-height: 100vh;
	background-color: #f8f8f8;
	padding: 20rpx;
	opacity: 0;
	animation: fadeIn 0.6s ease-out forwards;
}

.user-info {
	background-color: #fff;
	border-radius: 16rpx;
	padding: 30rpx;
	display: flex;
	align-items: center;
	margin-bottom: 20rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	transition: all 0.3s ease;
	transform: translateY(-20rpx);
	opacity: 0;
	animation: slideDown 0.5s ease-out 0.2s forwards;

	&:hover {
		transform: translateY(-24rpx);
		box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.12);
	}
}

.avatar {
	margin-right: 24rpx;
}

.avatar-image {
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
	background-color: #f0f0f0;
}

.user-details {
	flex: 1;
}

.username {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 8rpx;
}

.user-desc {
	font-size: 26rpx;
	color: #999;
}

.menu-list {
	background-color: #fff;
	border-radius: 16rpx;
	overflow: hidden;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	transform: translateY(30rpx);
	opacity: 0;
	animation: slideUp 0.6s ease-out 0.4s forwards;
}

.menu-item {
	display: flex;
	align-items: center;
	padding: 30rpx;
	border-bottom: 1rpx solid #f0f0f0;
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	cursor: pointer;

	&:last-child {
		border-bottom: none;
	}

	&:hover {
		background: linear-gradient(90deg, rgba(0, 122, 255, 0.02) 0%, rgba(0, 122, 255, 0.05) 100%);
		transform: translateX(8rpx);
	}

	&:active {
		transform: scale(0.98) translateX(4rpx);
		transition-duration: 0.1s;
		background: linear-gradient(90deg, rgba(0, 122, 255, 0.05) 0%, rgba(0, 122, 255, 0.08) 100%);
	}
}

.menu-icon {
	margin-right: 24rpx;
}

.icon-text {
	font-size: 40rpx;
}

.menu-content {
	flex: 1;
}

.menu-title {
	font-size: 30rpx;
	color: #333;
	margin-bottom: 4rpx;
	font-weight: 500;
}

.menu-desc {
	font-size: 24rpx;
	color: #999;
}

.menu-arrow {
	font-size: 32rpx;
	color: #ccc;
}

</style>
