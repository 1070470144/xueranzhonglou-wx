<template>
	<view class="container">
		<view class="header">
			<text class="title">我的</text>
		</view>

		<view class="content">
			<view class="item" @click="openSubmission">
				<text class="item-text">投稿要求</text>
			</view>
		</view>

		<info-panel
			:visible="panelVisible"
			title="投稿要求"
			:content="submissionText"
			@close="panelVisible = false"
		/>
	</view>
</template>

<script>
import InfoPanel from '../../components/InfoPanel.vue'
import submissionContent, { submissionContent as txt } from '../../common/submissionContent.js'

export default {
	components: {
		InfoPanel
	},
	data() {
		return {
			panelVisible: false,
			submissionText: submissionContent || txt
		}
	},
	methods: {
		openSubmission() {
			this.panelVisible = true
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
.header {
	padding: 12px 0;
	display: flex;
	justify-content: center;
}
.title {
	font-size: 18px;
	font-weight: 700;
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


