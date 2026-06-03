<template>
  <view class="page">
    <view class="tool-list">
      <view class="tool-item" @tap="openTool('/pages/announcements/announcements')">
        <view class="tool-icon notice">告</view>
        <view class="tool-main">
          <text class="tool-title">公告中心</text>
          <text class="tool-desc">查看平台公告、更新说明和维护通知</text>
        </view>
        <text class="arrow">›</text>
      </view>

      <view class="tool-item" @tap="openTool('/pages/tool-upload/tool-upload')">
        <view class="tool-icon upload">上</view>
        <view class="tool-main">
          <text class="tool-title">上传剧本</text>
          <text class="tool-desc">提交 JSON 和封面图片，查看审核状态</text>
        </view>
        <text class="arrow">›</text>
      </view>

      <view class="tool-item" @tap="openTool('/pages/tool-rankings/tool-rankings')">
        <view class="tool-icon rank">榜</view>
        <view class="tool-main">
          <text class="tool-title">排行</text>
          <text class="tool-desc">查看使用、点赞、推理和娱乐排行</text>
        </view>
        <text class="arrow">›</text>
      </view>

      <view class="tool-item" @tap="openTool('/pages/tool-exam/tool-exam')">
        <view class="tool-icon exam">考</view>
        <view class="tool-main">
          <text class="tool-title">模拟考</text>
          <text class="tool-desc">1星、2星限时考试，自动记录成绩</text>
        </view>
        <text class="arrow">›</text>
      </view>

      <view class="tool-item" @tap="openTool('/pages/tool-practice/tool-practice')">
        <view class="tool-icon practice">练</view>
        <view class="tool-main">
          <text class="tool-title">做题</text>
          <text class="tool-desc">随机练习一星、二星和收藏题</text>
        </view>
        <text class="arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  methods: {
    openTool(url) {
      uni.navigateTo({ url });
    }
  }
};
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 64rpx 44rpx 56rpx;
  background: #ffffff;
  color: #1f2329;
}

.tool-list {
  display: flex;
  flex-direction: column;
}

.tool-item {
  display: flex;
  align-items: center;
  min-height: 132rpx;
  padding: 28rpx 0;
  background: #ffffff;
  border-bottom: 1rpx solid #edf0f2;
  box-sizing: border-box;
}

.tool-icon {
  width: 72rpx;
  height: 72rpx;
  line-height: 72rpx;
  margin-right: 20rpx;
  border-radius: 10rpx;
  text-align: center;
  font-size: 26rpx;
  font-weight: 700;
}

.tool-icon.upload,
.tool-icon.rank,
.tool-icon.exam,
.tool-icon.practice,
.tool-icon.notice {
  color: #1f8f4d;
  background: #f0f9f4;
}

.tool-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.tool-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2329;
}

.tool-desc {
  font-size: 24rpx;
  color: #8f959e;
  line-height: 1.45;
}

.arrow {
  margin-left: 16rpx;
  color: #c9cdd4;
  font-size: 48rpx;
  line-height: 1;
}
</style>
