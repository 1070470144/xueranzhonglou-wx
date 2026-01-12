<template>
	<view class="container">
		<!-- 使用系统导航栏显示标题与返回 -->
		<view class="content">
			<view class="list">
				<view
					class="item"
					v-for="(item, index) in submissions"
					:key="item.id"
				>
					<text class="item-title">{{ index + 1 }}. {{ item.title }}</text>
					<text class="item-meta">作者：{{ item.author }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			submissions: [
				{ id: 's1', title: '我的投稿示例一', author: '作者A' },
				{ id: 's2', title: '我的投稿示例二', author: '作者B' },
				{ id: 's3', title: '我的投稿示例三', author: '作者C' }
			]
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
.list {
	margin-top: 8px;
}
.item {
	background: #fff;
	padding: 12px;
	border-radius: 8px;
	margin-bottom: 10px;
	box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.item-title {
	font-size: 16px;
	font-weight: 600;
	color: #333;
}
.item-meta {
	font-size: 12px;
	color: #666;
	margin-top: 6px;
}
</style>


