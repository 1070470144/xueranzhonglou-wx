<template>
  <view class="page">
    <view class="hero">
      <text class="title">组局报名说明</text>
      <text class="subtitle">本功能用于血染钟楼剧本活动的场次发布、报名管理和人数补位。</text>
    </view>

    <view class="section">
      <text class="section-title">服务说明</text>
      <text class="section-text">平台仅提供剧本活动信息发布、报名提交、发起人审核和人数管理能力。</text>
      <text class="section-text">平台不提供出行合乘、车辆调度、交易支付、社交撮合或即时聊天服务。</text>
    </view>

    <view class="section">
      <text class="section-title">信息使用</text>
      <text class="section-text">报名时填写的联系方式和备注，仅用于报名审核通过后的活动沟通。</text>
      <text class="section-text">联系方式不会在广场公开展示，未通过报名的用户无法查看发起人的联系方式。</text>
    </view>

    <view class="section">
      <text class="section-title">报名管理</text>
      <text class="section-text">用户可以提交报名或取消报名。</text>
      <text class="section-text">发起人可以审核、拒绝或移除报名用户，并可关闭已结束的场次。</text>
    </view>

    <view class="section">
      <text class="section-title">安全提示</text>
      <text class="section-text">线下活动由用户自行组织，请自行判断活动信息真实性，并注意人身及财产安全。</text>
    </view>

    <view class="review-box">
      <text class="section-title">平台说明摘要</text>
      <text class="review-text">本版本提供“组局报名”功能，用于血染钟楼剧本活动的场次信息发布、玩家报名、人数补位和发起人审核。平台不提供出行合乘、车辆调度、社交撮合、即时聊天、交易支付等服务。联系方式仅在报名审核通过后用于活动沟通，用户可取消报名，发起人可审核、拒绝和移除报名。</text>
      <button class="copy-btn" @tap="copyReviewText">复制说明</button>
    </view>
  </view>
</template>

<script>
const reviewText = '本版本提供“组局报名”功能，用于血染钟楼剧本活动的场次信息发布、玩家报名、人数补位和发起人审核。平台不提供出行合乘、车辆调度、社交撮合、即时聊天、交易支付等服务。联系方式仅在报名审核通过后用于活动沟通，用户可取消报名，发起人可审核、拒绝和移除报名。';

export default {
  methods: {
    copyReviewText() {
      uni.setClipboardData({
        data: reviewText,
        success: () => uni.showToast({ title: '已复制', icon: 'success' })
      });
    }
  }
};
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 28rpx;
  background: #f7f8fa;
  color: #1f2329;
}
.hero,
.section,
.review-box {
  background: #fff;
  border-radius: 10rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.title {
  display: block;
  font-size: 36rpx;
  font-weight: 800;
}
.subtitle {
  display: block;
  margin-top: 12rpx;
  color: #646a73;
  font-size: 25rpx;
  line-height: 1.55;
}
.section-title {
  display: block;
  margin-bottom: 12rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: #1f2329;
}
.section-text {
  display: block;
  margin-top: 8rpx;
  color: #646a73;
  font-size: 25rpx;
  line-height: 1.65;
}
.review-box {
  border: 1rpx solid #d9f0e3;
}
.review-text {
  display: block;
  padding: 18rpx;
  border-radius: 8rpx;
  background: #f5f8f6;
  color: #444b52;
  font-size: 24rpx;
  line-height: 1.65;
}
.copy-btn {
  margin-top: 18rpx;
  height: 72rpx;
  line-height: 72rpx;
  border-radius: 10rpx;
  background: #1f8f4d;
  color: #fff;
  font-size: 26rpx;
}
.copy-btn::after {
  border: 0;
}
</style>
