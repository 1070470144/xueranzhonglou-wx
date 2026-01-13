<template>
	<view class="container">
		<!-- 标签页切换 -->
		<view class="tab-bar">
			<view
				v-for="tab in tabs"
				:key="tab.key"
				class="tab-item"
				:class="{ active: activeTab === tab.key }"
				@click="switchTab(tab.key)"
			>
				{{ tab.label }}
			</view>
		</view>

		<!-- 排行榜内容 -->
		<scroll-view scroll-y="true" class="rankings-content">
			<view class="rankings-list">
				<view
					v-for="(item, index) in currentRankings"
					:key="item.id"
					class="ranking-item"
					@click="goToScriptDetail(item)"
				>
					<!-- 排名 -->
					<view class="rank-number" :class="getRankClass(index + 1)">
						{{ index + 1 }}
					</view>

					<!-- 剧本信息 -->
					<view class="script-info">
						<view class="script-title">{{ item.title }}</view>
						<view class="script-meta">
							<text class="author">作者：{{ item.author }}</text>
							<text class="value">{{ activeTab === 'usage' ? `使用次数：${item.usageCount}` : `点赞数：${item.likes}` }}</text>
						</view>
					</view>

					<!-- 数值显示 -->
					<view class="rank-value">
						<text class="value-text">{{ activeTab === 'usage' ? item.usageCount : item.likes }}</text>
						<text class="value-label">{{ activeTab === 'usage' ? '次使用' : '个点赞' }}</text>
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
			activeTab: 'usage',
			tabs: [
				{ key: 'usage', label: '使用排行' },
				{ key: 'likes', label: '点赞排行' }
			],
			usageRankings: [
				{
					id: 1,
					title: '经典剧本：狼人杀',
					author: '血染钟楼官方',
					usageCount: 1250,
					likes: 156
				},
				{
					id: 2,
					title: '扩展包：恶魔的觉醒',
					author: '社区贡献者',
					usageCount: 890,
					likes: 134
				},
				{
					id: 3,
					title: '欢乐剧本：僵尸危机',
					author: '创意工作室',
					usageCount: 756,
					likes: 98
				},
				{
					id: 4,
					title: '推理剧本：神秘古堡',
					author: '推理大师',
					usageCount: 623,
					likes: 87
				},
				{
					id: 5,
					title: '搞笑剧本：校园奇谈',
					author: '幽默小队',
					usageCount: 545,
					likes: 76
				}
			],
			likesRankings: [
				{
					id: 1,
					title: '经典剧本：狼人杀',
					author: '血染钟楼官方',
					usageCount: 1250,
					likes: 156
				},
				{
					id: 2,
					title: '扩展包：恶魔的觉醒',
					author: '社区贡献者',
					usageCount: 890,
					likes: 134
				},
				{
					id: 3,
					title: '欢乐剧本：僵尸危机',
					author: '创意工作室',
					usageCount: 756,
					likes: 98
				},
				{
					id: 4,
					title: '推理剧本：神秘古堡',
					author: '推理大师',
					usageCount: 623,
					likes: 87
				},
				{
					id: 6,
					title: '竞技剧本：诸神之战',
					author: '竞技高手',
					usageCount: 432,
					likes: 89
				}
			]
		}
	},
	computed: {
		currentRankings() {
			return this.activeTab === 'usage' ? this.usageRankings : this.likesRankings;
		}
	},
	methods: {
		switchTab(tabKey) {
			this.activeTab = tabKey;
		},
		getRankClass(rank) {
			if (rank === 1) return 'gold';
			if (rank === 2) return 'silver';
			if (rank === 3) return 'bronze';
			return 'normal';
		},
		goToScriptDetail(script) {
			uni.navigateTo({
				url: `/pages/script-detail/script-detail?id=${script.id}`
			});
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	height: 100vh;
	background-color: #f8f8f8;
}

.tab-bar {
	display: flex;
	background-color: #fff;
	border-bottom: 1rpx solid #e5e5e5;
}

.tab-item {
	flex: 1;
	text-align: center;
	padding: 30rpx 0;
	font-size: 28rpx;
	color: #666;
	position: relative;

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
		}
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
	border-radius: 12rpx;
	padding: 24rpx;
	margin-bottom: 16rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
	transition: transform 0.2s;

	&:active {
		transform: scale(0.98);
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
</style>
