<template>
	<view class="container">
		<view class="content">
			<view class="item" @click="openGuidelines">
				<text class="item-text">投稿须知</text>
			</view>
		</view>
	</view>
</template>

<script>
import submissionContent, { submissionContent as txt } from '../../common/submissionContent.js'

export default {
	data() {
		return {
			submissionText: submissionContent || txt
		}
	},
	methods: {
		openGuidelines() {
			uni.navigateTo({ url: '/pages/guidelines/guidelines' })
		}
	}
}
</script>

<style scoped>
.container {
	min-height: 100vh;
	background-color: #f8f8f8;
	padding: 16px;
}
.content {
	margin-top: 16px;
}
.item {
	background: #fff;
	padding: 14px;
	border-radius: 10px;
	margin-bottom: 12px;
	box-shadow: 0 1px 6px rgba(0,0,0,0.06);
}
.item-text {
	font-size: 16px;
	color: #333;
}
</style>


