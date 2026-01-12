<template>
	<view v-if="visible" class="overlay" @click.self="close">
		<view class="panel">
			<view class="panel-header">
				<text class="title">{{ title }}</text>
				<button class="close-btn" @click="close">关闭</button>
			</view>
			<scroll-view class="panel-body" scroll-y>
				<text class="content">{{ content }}</text>
			</scroll-view>
		</view>
	</view>
</template>

<script>
export default {
	props: {
		visible: { type: Boolean, default: false },
		title: { type: String, default: '信息' },
		content: { type: String, default: '' }
	},
	methods: {
		close() {
			this.$emit('close')
		}
	}
}
</script>

<style scoped>
.overlay {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	background-color: rgba(0,0,0,0.5);
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 16px;
	z-index: 9999;
}
.panel {
	width: 100%;
	max-width: 720px;
	height: 70%;
	background-color: #fff;
	border-radius: 12px;
	overflow: hidden;
	display: flex;
	flex-direction: column;
}
.panel-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 12px 16px;
	border-bottom: 1px solid #eee;
}
.title {
	font-size: 16px;
	font-weight: 600;
}
.close-btn {
	background: none;
	border: none;
	color: #007AFF;
	font-weight: 600;
}
.panel-body {
	padding: 16px;
}
.content {
	font-size: 14px;
	color: #333;
	line-height: 1.6;
	white-space: pre-wrap;
}
</style>


