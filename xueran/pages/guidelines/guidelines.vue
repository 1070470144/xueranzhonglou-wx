<template>
	<view class="container">
		<view class="content">
			<view class="section">
				<text class="section-title">投稿须知</text>
				<text class="section-content">
					欢迎您参与血染钟楼剧本创作！为了保证投稿质量和平台秩序，请仔细阅读以下投稿须知：

					1. 原创性要求：投稿作品必须为原创内容，不得抄袭他人作品。如有侵权行为，平台将立即下架作品并永久封禁账号。

					2. 内容规范：剧本内容应健康积极，不得包含暴力、色情、歧视性言论或其他违反法律法规的内容。

					3. 格式要求：请按照平台规定的剧本格式提交，包括剧本标题、作者信息、版本号、剧本描述、角色设置等必填项。

					4. 图片要求：请提供至少1张、最多3张剧本相关图片，图片格式支持JPG、PNG，大小不超过5MB。

					5. 审核周期：投稿后将在3-5个工作日内完成审核，审核通过后作品将正式发布。

					6. 版权说明：投稿作品的版权归作者所有，但平台享有展示、使用权。如需商业化使用，请提前联系平台。

					7. 修改建议：审核过程中如有修改建议，我们会通过站内信通知您，请及时处理。

					感谢您的理解与支持，祝您创作愉快！
				</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {}
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
	background-color: #fff;
	border-radius: 12px;
	padding: 20px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section {
	margin-bottom: 16px;
}

.section-title {
	font-size: 18px;
	font-weight: 600;
	color: #333;
	margin-bottom: 12px;
	display: block;
}

.section-content {
	font-size: 14px;
	line-height: 1.6;
	color: #666;
	white-space: pre-line;
}
</style>
