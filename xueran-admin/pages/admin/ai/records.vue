<template>
  <view class="fix-top-window">
    <view class="uni-header">
      <uni-stat-breadcrumb />
      <view class="uni-group">
        <input class="uni-search" v-model="keyword" placeholder="搜索邮箱、问题、答案" @confirm="load" />
        <button class="uni-button" size="mini" @click="load">搜索</button>
      </view>
    </view>

    <view class="uni-container split">
      <view class="list-panel">
        <uni-table border stripe :loading="loading" emptyText="暂无问答记录">
          <uni-tr>
            <uni-th align="left">用户</uni-th>
            <uni-th align="left">问题</uni-th>
            <uni-th align="center">板子</uni-th>
            <uni-th align="center">修正</uni-th>
            <uni-th align="center">操作</uni-th>
          </uni-tr>
          <uni-tr v-for="item in list" :key="item._id">
            <uni-td>{{ item.email || '-' }}</uni-td>
            <uni-td>{{ item.question }}</uni-td>
            <uni-td align="center">{{ item.scriptTitle || '通用' }}</uni-td>
            <uni-td align="center">{{ item.isCorrected ? '是' : '否' }}</uni-td>
            <uni-td align="center">
              <button class="uni-button" size="mini" @click="select(item)">查看</button>
            </uni-td>
          </uni-tr>
        </uni-table>
        <view class="uni-pagination-box" v-if="total > 0">
          <uni-pagination show-icon :page-size="pageSize" v-model="page" :total="total" @change="onPageChange" />
        </view>
      </view>

      <view class="detail-panel" v-if="current">
        <view class="panel-title">问答详情</view>
        <view class="meta">{{ current.email }} · {{ current.scriptTitle || '通用问题' }}</view>
        <view class="block-title">问题</view>
        <view class="content">{{ current.question }}</view>
        <view class="block-title">AI 回答</view>
        <view class="content pre">{{ current.answer }}</view>
        <view class="block-title">简短分析</view>
        <view class="content">{{ current.analysis || '-' }}</view>
        <view class="block-title">修正答案</view>
        <textarea class="textarea" v-model="correctedAnswer" placeholder="如果 AI 答案不准确，在这里写入正确版本" />
        <button class="uni-button save" type="primary" :disabled="saving" @click="saveCorrection">保存修正</button>
      </view>
      <view class="detail-panel empty" v-else>选择一条记录查看详情</view>
    </view>
  </view>
</template>

<script>
import { correctAnswer, listQuestionRecords } from '@/utils/aiAdminApi.js';

export default {
  data() {
    return {
      keyword: '',
      list: [],
      page: 1,
      pageSize: 20,
      total: 0,
      loading: false,
      saving: false,
      current: null,
      correctedAnswer: ''
    };
  },
  async onLoad() {
    await this.load();
  },
  methods: {
    async load() {
      this.loading = true;
      try {
        const res = await listQuestionRecords({ page: this.page, pageSize: this.pageSize, keyword: this.keyword });
        if (res.success && res.data) {
          this.list = res.data.list || [];
          this.total = res.data.total || 0;
        }
      } finally {
        this.loading = false;
      }
    },
    async onPageChange(page) {
      this.page = page;
      await this.load();
    },
    select(item) {
      this.current = item;
      this.correctedAnswer = item.correctedAnswer || item.answer || '';
    },
    async saveCorrection() {
      if (!this.current) return;
      this.saving = true;
      try {
        const res = await correctAnswer({ recordId: this.current._id, correctedAnswer: this.correctedAnswer });
        uni.showToast({ title: res.success ? '已修正' : (res.message || '保存失败'), icon: res.success ? 'success' : 'none' });
        if (res.success) await this.load();
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style scoped>
.split {
  display: grid;
  grid-template-columns: minmax(560px, 1fr) 460px;
  gap: 16px;
}
.detail-panel {
  min-width: 0;
  padding: 18px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}
.panel-title {
  font-size: 16px;
  font-weight: 600;
}
.meta {
  margin-top: 8px;
  color: #909399;
  font-size: 13px;
}
.block-title {
  margin-top: 16px;
  margin-bottom: 8px;
  color: #606266;
  font-weight: 600;
}
.content {
  color: #303133;
  line-height: 1.6;
}
.pre {
  white-space: pre-wrap;
}
.textarea {
  width: 100%;
  min-height: 180px;
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}
.save {
  width: 100%;
  margin-top: 12px;
}
.empty {
  color: #909399;
}
.uni-pagination-box {
  margin-top: 16px;
}
@media screen and (max-width: 960px) {
  .split {
    grid-template-columns: 1fr;
  }
}
</style>

