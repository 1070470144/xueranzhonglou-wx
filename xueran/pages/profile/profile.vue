<template>
	<view class="container">
		<!-- 用户信息区域 -->
		<view class="user-info">
			<view class="avatar">
				<image src="/static/default-avatar.png" class="avatar-image" />
			</view>
			<view class="user-details">
				<view class="username">游客用户</view>
				<view class="user-desc">登录后可享受更多功能</view>
			</view>
		</view>

		<!-- 菜单列表 -->
		<view class="menu-list">
			<view class="menu-item" @click="showSubmissionGuide">
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
					<text class="icon-text">⭐</text>
				</view>
				<view class="menu-content">
					<view class="menu-title">我的收藏</view>
					<view class="menu-desc">查看收藏的剧本</view>
				</view>
				<view class="menu-arrow">></view>
			</view>

			<view class="menu-item">
				<view class="menu-icon">
					<text class="icon-text">📊</text>
				</view>
				<view class="menu-content">
					<view class="menu-title">使用统计</view>
					<view class="menu-desc">查看游戏数据</view>
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

		<!-- 投稿须知弹窗 -->
		<view class="modal-overlay" v-if="showModal" @click="hideModal">
			<view class="modal-content" @click.stop>
				<view class="modal-header">
					<view class="modal-title">投稿须知</view>
					<view class="modal-close" @click="hideModal">×</view>
				</view>
				<scroll-view scroll-y="true" class="modal-body">
					<view class="guide-content">
						<view class="guide-section">
							<view class="section-title">🎯 投稿要求</view>
							<view class="section-content">
								<view class="guide-item">• 剧本必须原创，未侵犯他人版权</view>
								<view class="guide-item">• 剧本内容健康，积极向上</view>
								<view class="guide-item">• 包含完整的角色设定和游戏规则</view>
								<view class="guide-item">• 建议包含3-5张剧本相关图片</view>
							</view>
						</view>

						<view class="guide-section">
							<view class="section-title">📝 投稿格式</view>
							<view class="section-content">
								<view class="guide-item">• 使用标准的JSON格式</view>
								<view class="guide-item">• 包含剧本标题、作者、版本信息</view>
								<view class="guide-item">• 详细描述每个角色的能力和背景</view>
								<view class="guide-item">• 注明推荐玩家人数和游戏时长</view>
							</view>
						</view>

						<view class="guide-section">
							<view class="section-title">🔍 审核流程</view>
							<view class="section-content">
								<view class="guide-item">• 投稿后将在3-5个工作日内完成审核</view>
								<view class="guide-item">• 通过审核的剧本将公开展示</view>
								<view class="guide-item">• 不符合要求的剧本将收到修改建议</view>
								<view class="guide-item">• 严重违规的投稿将被永久屏蔽</view>
							</view>
						</view>

						<view class="guide-section">
							<view class="section-title">📞 联系我们</view>
							<view class="section-content">
								<view class="guide-item">• 如有疑问请通过以下方式联系：</view>
								<view class="guide-item">• 邮箱：support@bloodontheclocktower.cn</view>
								<view class="guide-item">• 微信公众号：血染钟楼中文社区</view>
							</view>
						</view>
					</view>
				</scroll-view>
				<view class="modal-footer">
					<button class="confirm-btn" @click="hideModal">我知道了</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			showModal: false
		}
	},
	methods: {
		showSubmissionGuide() {
			this.showModal = true;
		},
		hideModal() {
			this.showModal = false;
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	min-height: 100vh;
	background-color: #f8f8f8;
	padding: 20rpx;
}

.user-info {
	background-color: #fff;
	border-radius: 12rpx;
	padding: 30rpx;
	display: flex;
	align-items: center;
	margin-bottom: 20rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
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
	border-radius: 12rpx;
	overflow: hidden;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.menu-item {
	display: flex;
	align-items: center;
	padding: 30rpx;
	border-bottom: 1rpx solid #f0f0f0;
	transition: background-color 0.2s;

	&:last-child {
		border-bottom: none;
	}

	&:active {
		background-color: #f8f8f8;
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

// 弹窗样式
.modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
}

.modal-content {
	background-color: #fff;
	border-radius: 12rpx;
	width: 90%;
	max-width: 600rpx;
	max-height: 80vh;
	display: flex;
	flex-direction: column;
}

.modal-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 30rpx;
	border-bottom: 1rpx solid #f0f0f0;
}

.modal-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.modal-close {
	font-size: 40rpx;
	color: #999;
	line-height: 1;
	padding: 0 10rpx;
}

.modal-body {
	flex: 1;
	padding: 30rpx;
	max-height: 60vh;
}

.guide-content {
	display: flex;
	flex-direction: column;
	gap: 32rpx;
}

.guide-section {
	margin-bottom: 24rpx;
}

.section-title {
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 16rpx;
}

.section-content {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.guide-item {
	font-size: 26rpx;
	color: #555;
	line-height: 1.6;
	text-align: justify;
}

.modal-footer {
	padding: 30rpx;
	border-top: 1rpx solid #f0f0f0;
	text-align: center;
}

.confirm-btn {
	background-color: #007AFF;
	color: white;
	border-radius: 8rpx;
	font-size: 28rpx;
	padding: 20rpx 60rpx;
	border: none;
}
</style>
