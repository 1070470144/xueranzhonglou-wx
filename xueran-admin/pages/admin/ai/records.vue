<template>
  <view class="fix-top-window">
    <view class="uni-header">
      <uni-stat-breadcrumb />
      <view class="records-toolbar">
        <view class="toolbar-filters">
          <input class="uni-search records-search" v-model="keyword" placeholder="搜索问题、答案、邮箱" @confirm="handleSearch" />
          <input class="uni-search records-user-search" v-model="userKeyword" placeholder="按用户搜索：邮箱、昵称或ID" @confirm="handleSearch" />
          <button class="uni-button" size="mini" @click="handleSearch">搜索</button>
        </view>
      </view>
    </view>

    <view class="uni-container">
      <view class="list-panel">
        <view class="list-summary">
          <text class="summary-main">共 {{ total }} 条问答记录</text>
        </view>
        <view class="records-table-card">
          <scroll-view scroll-x class="records-table-scroll">
            <uni-table class="records-table" border stripe :loading="loading" emptyText="暂无问答记录">
              <uni-tr>
                <uni-th align="left">用户</uni-th>
                <uni-th align="left">问题</uni-th>
                <uni-th align="left">回答摘要</uni-th>
                <uni-th align="center">板子</uni-th>
                <uni-th align="center">修正</uni-th>
                <uni-th align="center">操作</uni-th>
              </uni-tr>
              <uni-tr v-for="item in list" :key="item._id">
                <uni-td align="left">
                  <view class="user-cell">
                    <text class="user-name">{{ getUserName(item) }}</text>
                    <text v-if="getUserSubText(item)" class="user-sub">{{ getUserSubText(item) }}</text>
                  </view>
                </uni-td>
                <uni-td align="left">
                  <view class="question-cell">{{ item.question || '-' }}</view>
                </uni-td>
                <uni-td align="left">
                  <view class="answer-cell">{{ item.answer || '-' }}</view>
                </uni-td>
                <uni-td align="center">{{ item.scriptTitle || '通用' }}</uni-td>
                <uni-td align="center">
                  <uni-tag :type="item.isCorrected ? 'success' : 'default'" inverted size="small" :text="item.isCorrected ? '已修正' : '未修正'" />
                </uni-td>
                <uni-td align="center">
                  <view class="record-actions">
                    <button class="uni-button" size="mini" type="default" @click="openDetail(item)">查看</button>
                  </view>
                </uni-td>
              </uni-tr>
            </uni-table>
          </scroll-view>
        </view>
        <view class="uni-pagination-box" v-if="total > 0">
          <uni-pagination show-icon :page-size="pageSize" v-model="page" :total="total" @change="onPageChange" />
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { listQuestionRecords } from '@/utils/aiAdminApi.js';

export default {
  data() {
    return {
      keyword: '',
      userKeyword: '',
      list: [],
      page: 1,
      pageSize: 20,
      total: 0,
      loading: false
    };
  },
  async onLoad() {
    await this.load();
  },
  methods: {
    async load() {
      this.loading = true;
      try {
        const res = await listQuestionRecords({
          page: this.page,
          pageSize: this.pageSize,
          keyword: this.keyword,
          userKeyword: this.userKeyword
        });
        if (res.success && res.data) {
          this.list = res.data.list || [];
          this.total = res.data.total || 0;
        }
      } finally {
        this.loading = false;
      }
    },
    async handleSearch() {
      this.page = 1;
      await this.load();
    },
    async onPageChange(page) {
      this.page = typeof page === 'number' ? page : (page && (page.current || page.detail?.current)) || 1;
      await this.load();
    },
    getUserName(item) {
      if (!item) return '-';
      return item.nickname || item.userNickname || item.email || item.userId || item.user_id || item.uid || '-';
    },
    getUserSubText(item) {
      if (!item) return '';
      const id = item.userId || item.user_id || item.uid || '';
      if (item.email && item.email !== this.getUserName(item)) return item.email;
      return id && id !== this.getUserName(item) ? id : '';
    },
    openDetail(item) {
      if (!item || !item._id) return;
      uni.navigateTo({ url: `./record-detail?id=${item._id}` });
    }
  }
};
</script>

<style scoped>
.records-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  flex-wrap: wrap;
}

.toolbar-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 420px;
  flex-wrap: wrap;
}

.records-search {
  min-width: 260px;
  max-width: 420px;
  flex: 1;
}

.records-user-search {
  min-width: 220px;
  max-width: 320px;
}

.list-panel {
  min-width: 0;
}

.list-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 0 2px;
}

.summary-main {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.records-table-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
}

.records-table-scroll {
  width: 100%;
}

.records-table {
  min-width: 980px;
}

.user-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 190px;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: #303133;
  word-break: break-all;
}

.user-sub {
  font-size: 12px;
  line-height: 1.4;
  color: #909399;
  word-break: break-all;
}

.question-cell,
.answer-cell {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 280px;
  line-height: 1.5;
  color: #303133;
  word-break: break-word;
}

.question-cell {
  -webkit-line-clamp: 2;
  font-weight: 600;
}

.answer-cell {
  -webkit-line-clamp: 3;
  color: #606266;
}

.record-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 64px;
}

.uni-pagination-box {
  margin-top: 16px;
  padding: 16px;
  background: #f8f8f8;
  border-radius: 4px;
}
@media screen and (max-width: 960px) {
  .toolbar-filters {
    min-width: 0;
  }
}
</style>
