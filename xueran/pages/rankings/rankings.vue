<template>
	<view class="container fade-in">
		<!-- 标签页切换 -->
		<view class="tab-bar slide-down">
			<view
				v-for="tab in tabs"
				:key="tab.key"
				class="tab-item slide-in"
				:class="{ active: activeTab === tab.key }"
				@click="switchTab(tab.key)"
			>
				{{ tab.label }}
			</view>
		</view>

		<!-- 信息提示按钮（右下角固定定位） -->
		<view class="info-fab">
			<view class="info-icon" @tap="showInfoPopup">
				<text class="info-icon-text">ℹ️</text>
			</view>
		</view>

		<!-- 排行榜内容 -->
		<scroll-view scroll-y="true" class="rankings-content">
			<!-- 加载状态 -->
			<view v-if="loading" class="loading-container">
				<view class="loading-spinner">
					<text class="loading-text">加载中...</text>
				</view>
			</view>

			<!-- 错误状态 -->
			<view v-else-if="error" class="error-container">
				<view class="error-content">
					<text class="error-icon">⚠️</text>
					<text class="error-text">{{ error }}</text>
					<button class="retry-btn" @click="loadRankings">重试</button>
				</view>
			</view>

			<!-- 排行榜列表 -->
			<view v-else class="rankings-list">
				<view
					v-for="(item, index) in rankings"
					:key="item.scriptId"
					class="ranking-item slide-up"
					:style="{ animationDelay: index * 0.08 + 's' }"
					@click="goToScriptDetail(item)"
				>
					<!-- 排名 -->
					<view class="rank-number" :class="getRankClass(item.rank)">
						<text v-if="item.medal" class="medal">{{ item.medal }}</text>
						<text v-else class="rank-text">{{ item.rank }}</text>
					</view>

					<!-- 剧本信息 -->
					<view class="script-info">
						<view class="script-title">{{ item.title }}</view>
						<view class="script-meta">
							<text class="author">作者：{{ item.author }}</text>
						</view>
					</view>

					<!-- 数值显示 -->
					<view class="rank-value">
						<text class="value-text">{{ formatValue(item.value, activeTab) }}</text>
						<text class="value-label">{{ getValueLabel(activeTab) }}</text>
					</view>
				</view>
			</view>
		</scroll-view>

		<!-- 信息提示弹窗（简易实现：避免组件与 v-model 不同步问题） -->
		<view v-if="showInfo" class="modal-mask" @tap.self="closeInfoPopup">
			<view class="info-popup" @click.stop>
				<view class="popup-header">
					<text class="popup-title">排行榜说明</text>
				</view>
				<view class="popup-content">
					<text class="popup-text">排行榜每10分钟刷新一次</text>
				</view>
				<view class="popup-footer">
					<button class="popup-btn" @click="closeInfoPopup">知道了</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { getRankings } from '@/utils/rankingsApi.js';

export default {
	data() {
		return {
			activeTab: 'usage',
			tabs: [
				{ key: 'usage', label: '使用排行' },
				{ key: 'likes', label: '点赞排行' },
				{ key: 'hot', label: '热度排行' }
			],
			rankings: [], // 当前显示的排行榜数据
			loading: false, // 加载状态
			error: null, // 错误信息
			showInfo: false // 信息弹窗显示状态
		}
	},

	onLoad() {
		this.loadRankings();
	},

	onPullDownRefresh() {
		this.loadRankings();
		uni.stopPullDownRefresh();
	},

	methods: {
		/**
		 * 切换选项卡
		 * @param {string} tabKey - 选项卡键值
		 */
		switchTab(tabKey) {
			this.activeTab = tabKey;
			this.loadRankings();
		},

		/**
		 * 加载排行榜数据
		 */
		async loadRankings() {
			this.loading = true;
			this.error = null;

			try {
				const result = await getRankings(this.activeTab, 20);

				if (result.success) {
					this.rankings = result.data;
					console.log(`Loaded ${this.activeTab} rankings:`, this.rankings.length);
				} else {
					this.error = result.message;
					this.rankings = [];
					console.error('Load rankings failed:', result.message);
				}
			} catch (error) {
				this.error = '加载失败，请重试';
				this.rankings = [];
				console.error('Load rankings error:', error);
			} finally {
				this.loading = false;
			}
		},

		/**
		 * 获取排名样式类
		 * @param {number} rank - 排名
		 * @returns {string} CSS类名
		 */
		getRankClass(rank) {
			if (rank === 1) return 'gold';
			if (rank === 2) return 'silver';
			if (rank === 3) return 'bronze';
			return 'normal';
		},

		/**
		 * 跳转到剧本详情页
		 * @param {Object} item - 排行榜项
		 */
		goToScriptDetail(item) {
			uni.navigateTo({
				url: `/pages/script-detail/script-detail?id=${item.scriptId}`,
				fail: (error) => {
					console.error('Navigate to script detail failed:', error);
					uni.showToast({
						title: '跳转失败',
						icon: 'none'
					});
				}
			});
		},

		/**
		 * 格式化数值显示
		 * @param {number} value - 数值
		 * @param {string} type - 排行榜类型
		 * @returns {string} 格式化后的字符串
		 */
		formatValue(value, type) {
			if (type === 'hot') {
				return value.toFixed(1);
			}
			return value.toString();
		},

		/**
		 * 获取数值标签
		 * @param {string} type - 排行榜类型
		 * @returns {string} 标签文本
		 */
		getValueLabel(type) {
			switch (type) {
				case 'usage':
					return '次使用';
				case 'likes':
					return '个点赞';
				case 'hot':
					return '热度值';
				default:
					return '';
			}
		},

		/**
		 * 显示信息弹窗
		 */
		showInfoPopup() {
			console.log('DEBUG: showInfoPopup called');
			console.log('DEBUG: Current showInfo value:', this.showInfo);
			this.showInfo = true;
			console.log('DEBUG: showInfo set to', this.showInfo);
			// 额外验证
			this.$nextTick(() => {
				console.log('DEBUG: After nextTick, showInfo is:', this.showInfo);
			});
		},

		/**
		 * 关闭信息弹窗
		 */
		closeInfoPopup() {
			console.log('DEBUG: closeInfoPopup called');
			this.showInfo = false;
			this.$nextTick(() => {
				console.log('DEBUG: After close, showInfo is:', this.showInfo);
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
	}
	100% {
		opacity: 1;
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

@keyframes slideIn {
	0% {
		opacity: 0;
		transform: translateX(-20rpx);
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

.container {
	height: 100vh;
	background-color: #f8f8f8;
	opacity: 0;
	animation: fadeIn 0.6s ease-out forwards;
}

.tab-bar {
	display: flex;
	background-color: #fff;
	border-bottom: 1rpx solid #e5e5e5;
	transform: translateY(-20rpx);
	opacity: 0;
	animation: slideDown 0.5s ease-out 0.2s forwards;
}

.tab-item {
	flex: 1;
	text-align: center;
	padding: 30rpx 0;
	font-size: 28rpx;
	color: #666;
	position: relative;
	transition: all 0.3s ease;
	cursor: pointer;

	&:hover {
		color: #007AFF;
		background-color: rgba(0, 122, 255, 0.05);
	}

	&.active {
		color: #007AFF;
		font-weight: bold;

		&::after {
			content: '';
			position: absolute;
			bottom: 0;
			left: 50%;
			transform: translateX(-50%);
			width: 60rpx;
			height: 4rpx;
			background-color: #007AFF;
			border-radius: 2rpx;
			animation: bounceIn 0.4s ease-out;
		}
	}

	&:not(.active) {
		opacity: 0;
		animation: slideIn 0.4s ease-out forwards;
	}
}

.rankings-content {
	height: calc(100vh - 120rpx);
}

.rankings-list {
	padding: 20rpx;
}

.ranking-item {
	display: flex;
	align-items: center;
	background-color: #fff;
	border-radius: 16rpx;
	padding: 24rpx;
	margin-bottom: 16rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
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

.rank-number {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 32rpx;
	font-weight: bold;
	margin-right: 20rpx;

	&.gold {
		background: linear-gradient(135deg, #FFD700, #FFA500);
		color: white;
	}

	&.silver {
		background: linear-gradient(135deg, #C0C0C0, #A8A8A8);
		color: white;
	}

	&.bronze {
		background: linear-gradient(135deg, #CD7F32, #A0522D);
		color: white;
	}

	&.normal {
		background-color: #f0f0f0;
		color: #666;
	}
}

.script-info {
	flex: 1;
}

.script-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 8rpx;
	line-height: 1.4;
}

.script-meta {
	display: flex;
	flex-direction: column;
	gap: 4rpx;
}

.author, .value {
	font-size: 24rpx;
	color: #666;
	line-height: 1.3;
}

.rank-value {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	min-width: 120rpx;
}

.value-text {
	font-size: 36rpx;
	font-weight: bold;
	color: #007AFF;
	line-height: 1.2;
}

.value-label {
	font-size: 22rpx;
	color: #999;
	line-height: 1.2;
	text-align: right;
}

/* 加载状态 */
.loading-container {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 400rpx;
}

.loading-spinner {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.loading-text {
	font-size: 28rpx;
	color: #666;
	margin-top: 20rpx;
}

/* 错误状态 */
.error-container {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 400rpx;
	padding: 0 60rpx;
}

.error-content {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
}

.error-icon {
	font-size: 60rpx;
	margin-bottom: 20rpx;
}

.error-text {
	font-size: 28rpx;
	color: #666;
	margin-bottom: 30rpx;
	line-height: 1.5;
}

.retry-btn {
	background-color: #007AFF;
	color: white;
	border: none;
	border-radius: 8rpx;
	padding: 20rpx 40rpx;
	font-size: 28rpx;
	cursor: pointer;
	transition: background-color 0.3s ease;
}

.retry-btn:active {
	background-color: #0056CC;
}

/* 奖牌显示 */
.medal {
	font-size: 40rpx;
	line-height: 1;
}

.rank-text {
	font-size: 32rpx;
	font-weight: bold;
	line-height: 1;
}

/* 信息提示按钮（右下角固定定位） */
.info-fab {
	position: fixed;
	/* 上调以避免被底部选项卡或 tabbar 遮挡 */
	bottom: 160rpx;
	right: 40rpx;
	z-index: 1000;
	pointer-events: none; /* 由子元素接收点击 */
}

.info-icon {
	width: 60rpx;
	height: 60rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: rgba(0, 86, 204, 0.2);
	border: 2rpx solid rgba(0, 86, 204, 0.3);
	border-radius: 50%;
	cursor: pointer;
	transition: all 0.3s ease;
	position: relative;
	z-index: 60;
	pointer-events: auto; /* 接收点击 */
}

.info-icon:active {
	background-color: rgba(0, 86, 204, 0.2);
}

.info-icon-text {
	font-size: 32rpx;
	line-height: 1;
}

/* 信息弹窗 */
.info-popup {
	/* 强制居中模态弹窗，避免出现在底部滚动区域 */
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 600rpx;
	max-width: 90%;
	background-color: white;
	border-radius: 16rpx;
	overflow: hidden;
	box-shadow: 0 12rpx 30rpx rgba(0, 0, 0, 0.15);
	z-index: 9999;
}

.popup-header {
	padding: 40rpx 40rpx 20rpx 40rpx;
	text-align: center;
	border-bottom: 1rpx solid #f0f0f0;
}

.popup-title {
	font-size: 36rpx;
	font-weight: bold;
	color: #333;
}

.popup-content {
	padding: 40rpx;
	text-align: center;
}

.popup-text {
	font-size: 30rpx;
	color: #666;
	line-height: 1.5;
}

.popup-footer {
	padding: 20rpx 40rpx 40rpx 40rpx;
	text-align: center;
}

.popup-btn {
	background-color: #0056CC;
	color: white;
	border: none;
	border-radius: 8rpx;
	padding: 20rpx 60rpx;
	font-size: 28rpx;
	cursor: pointer;
	transition: background-color 0.3s ease;
	min-width: 200rpx;
}

.popup-btn:active {
	background-color: #004499;
}

/* 模态遮罩（自实现） */
.modal-mask {
	position: fixed;
	inset: 0;
	background-color: rgba(0,0,0,0.4);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 9998;
}
</style>
