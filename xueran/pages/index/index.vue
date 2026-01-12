<template>
	<view class="redirect-container">
		<view class="loading">
			<text class="loading-text">正在加载...</text>
		</view>
	</view>
</template>

<script>
	export default {
		onLoad() {
			// 自动跳转到剧本展览页面
			setTimeout(() => {
				uni.reLaunch({
					url: '/pages/exhibition/exhibition'
				})
			}, 500)
		}
	}
</script>

<style scoped>
.redirect-container {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 100vh;
	background-color: #f8f8f8;
}

.loading {
	text-align: center;
}

.loading-text {
	color: #666;
	font-size: 14px;
}
</style>
