<template>
  <view class="page">
    <view class="toolbar">
      <view class="search-box">
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索问题、回答或板子"
          confirm-type="search"
          @confirm="searchRecords"
        />
        <button class="small-btn" @click="searchRecords">查询</button>
      </view>
    </view>

    <view v-if="selectedRecord" class="detail">
      <view class="detail-head">
        <text class="section-title">记录详情</text>
        <button class="text-btn" @click="closeDetail">返回列表</button>
      </view>

      <view class="detail-block">
        <text class="field-label">问题</text>
        <text class="detail-text strong">{{ selectedRecord.question }}</text>
      </view>

      <view class="detail-block">
        <text class="field-label">回答</text>
        <text class="detail-text">{{ selectedRecord.answer }}</text>
      </view>

      <view v-if="selectedRecord.correctedAnswer" class="detail-block">
        <text class="field-label">修正回答</text>
        <text class="detail-text">{{ selectedRecord.correctedAnswer }}</text>
      </view>

      <view v-if="selectedRecord.analysis" class="detail-block">
        <text class="field-label">简短分析</text>
        <text class="detail-text">{{ selectedRecord.analysis }}</text>
      </view>

      <view class="meta-panel">
        <view class="meta-row">
          <text>板子</text>
          <text>{{ selectedRecord.scriptTitle || '通用问题' }}</text>
        </view>
        <view class="meta-row">
          <text>创建时间</text>
          <text>{{ formatTime(selectedRecord.createTime) }}</text>
        </view>
        <view class="meta-row">
          <text>更新时间</text>
          <text>{{ formatTime(selectedRecord.updateTime) }}</text>
        </view>
      </view>

      <view class="actions">
        <button class="delete-btn" :disabled="deleting" @click="confirmDelete">{{ deleting ? '删除中...' : '删除记录' }}</button>
      </view>
    </view>

    <view v-else>
      <view class="list-head">
        <text class="section-title">问答记录</text>
        <text class="count-text">{{ total }} 条</text>
      </view>

      <view v-if="loading" class="empty">加载中...</view>
      <view v-else-if="!records.length" class="empty">暂无记录</view>
      <view v-else class="record-list">
        <view v-for="item in records" :key="item._id" class="record-item" @click="openRecord(item)">
          <view class="record-question">{{ item.question }}</view>
          <view class="record-answer">{{ item.correctedAnswer || item.answer }}</view>
          <view class="record-meta">
            <text>{{ item.scriptTitle || '通用问题' }}</text>
            <text>{{ formatTime(item.updateTime || item.createTime) }}</text>
          </view>
        </view>
      </view>

      <button v-if="hasMore && !loading" class="load-more" @click="loadMore">加载更多</button>
      <view v-else-if="records.length" class="end-text">已显示全部记录</view>
    </view>
  </view>
</template>

<script>
import { requireLogin } from '@/utils/auth.js';
import {
  deleteQuestionRecord,
  getQuestionHistory,
  getQuestionRecord
} from '@/utils/aiApi.js';

export default {
  data() {
    return {
      keyword: '',
      records: [],
      page: 1,
      pageSize: 10,
      total: 0,
      loading: false,
      deleting: false,
      selectedRecord: null
    };
  },
  computed: {
    hasMore() {
      return this.records.length < this.total;
    }
  },
  onLoad() {
    if (!requireLogin('/pages/question-records/question-records')) return;
    this.loadRecords(true);
  },
  onPullDownRefresh() {
    this.loadRecords(true).finally(() => uni.stopPullDownRefresh());
  },
  methods: {
    async loadRecords(reset = false) {
      if (this.loading) return;
      this.loading = true;
      if (reset) this.page = 1;
      try {
        const res = await getQuestionHistory({
          page: this.page,
          pageSize: this.pageSize,
          keyword: this.keyword.trim()
        });
        if (!res.success) {
          uni.showToast({ title: res.message || '加载失败', icon: 'none' });
          return;
        }
        const data = res.data || {};
        const list = data.list || [];
        this.records = reset ? list : this.records.concat(list);
        this.total = data.total || 0;
      } finally {
        this.loading = false;
      }
    },
    searchRecords() {
      this.loadRecords(true);
    },
    loadMore() {
      if (!this.hasMore || this.loading) return;
      this.page += 1;
      this.loadRecords(false);
    },
    async openRecord(item) {
      const res = await getQuestionRecord(item._id);
      if (!res.success) {
        uni.showToast({ title: res.message || '记录不存在', icon: 'none' });
        return;
      }
      const record = (res.data && res.data.record) || item;
      this.selectedRecord = record;
    },
    closeDetail() {
      this.selectedRecord = null;
    },
    confirmDelete() {
      uni.showModal({
        title: '删除记录',
        content: '确定删除这条问答记录吗？',
        confirmText: '删除',
        confirmColor: '#b42318',
        success: async (res) => {
          if (!res.confirm) return;
          await this.removeRecord();
        }
      });
    },
    async removeRecord() {
      if (!this.selectedRecord || !this.selectedRecord._id || this.deleting) return;
      this.deleting = true;
      try {
        const res = await deleteQuestionRecord(this.selectedRecord._id);
        if (!res.success) {
          uni.showToast({ title: res.message || '删除失败', icon: 'none' });
          return;
        }
        uni.showToast({ title: '已删除', icon: 'success' });
        this.selectedRecord = null;
        await this.loadRecords(true);
      } finally {
        this.deleting = false;
      }
    },
    formatTime(value) {
      if (!value) return '';
      const date = new Date(value);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      return `${month}-${day} ${hour}:${minute}`;
    }
  }
};
</script>

<style scoped>
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 24rpx 24rpx 56rpx;
  background: #f6f2ec;
  color: #241f1a;
}

.toolbar,
.detail,
.record-item {
  box-sizing: border-box;
  border: 1rpx solid #e5d8c8;
  border-radius: 22rpx;
  background: #fffaf4;
  box-shadow: 0 12rpx 36rpx rgba(72, 45, 22, 0.08);
}

.toolbar {
  padding: 20rpx;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.search-input {
  box-sizing: border-box;
  width: 100%;
  height: 72rpx;
  padding: 0 20rpx;
  border-radius: 16rpx;
  border: 1rpx solid #e2d2bf;
  background: #fffdf9;
  color: #241f1a;
  font-size: 26rpx;
}

.small-btn,
.text-btn,
.load-more {
  margin: 0;
  padding: 0 22rpx;
  height: 72rpx;
  line-height: 72rpx;
  border-radius: 16rpx;
  border: 1rpx solid #d8cbbd;
  background: #fffaf4;
  color: #4a3624;
  font-size: 26rpx;
}

.small-btn {
  flex-shrink: 0;
}

.list-head,
.detail-head,
.record-meta,
.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.list-head {
  margin: 30rpx 8rpx 16rpx;
}

.section-title {
  color: #2d241d;
  font-size: 32rpx;
  font-weight: 700;
}

.count-text,
.end-text,
.empty {
  color: #8a7a68;
  font-size: 24rpx;
}

.empty,
.end-text {
  padding: 34rpx 0;
  text-align: center;
}

.record-item {
  margin-bottom: 16rpx;
  padding: 22rpx;
}

.record-question {
  color: #2d241d;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 1.45;
}

.record-answer {
  margin-top: 10rpx;
  color: #6d604f;
  font-size: 25rpx;
  line-height: 1.5;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.record-meta {
  margin-top: 12rpx;
  color: #9b8a77;
  font-size: 22rpx;
}

.detail {
  margin-top: 20rpx;
  padding: 24rpx;
}

.detail-block {
  margin-top: 24rpx;
}

.field-label {
  display: block;
  margin-bottom: 12rpx;
  color: #7d6b58;
  font-size: 24rpx;
}

.detail-text {
  display: block;
  color: #342b23;
  font-size: 28rpx;
  line-height: 1.65;
  white-space: pre-wrap;
}

.detail-text.strong {
  font-weight: 600;
}

.meta-panel {
  margin-top: 24rpx;
  padding: 18rpx 20rpx;
  border-radius: 16rpx;
  background: #f4eadf;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  padding: 8rpx 0;
  color: #7a6043;
  font-size: 24rpx;
}

.actions {
  margin-top: 28rpx;
}

.delete-btn {
  margin: 0;
  height: 84rpx;
  line-height: 84rpx;
  border-radius: 18rpx;
  font-size: 29rpx;
  font-weight: 700;
}

.delete-btn {
  width: 100%;
  background: #fff7f5;
  color: #b42318;
  border: 1rpx solid #f3c5bd;
}

.load-more {
  width: 100%;
  margin-top: 18rpx;
}

button::after {
  border: none;
}
</style>
