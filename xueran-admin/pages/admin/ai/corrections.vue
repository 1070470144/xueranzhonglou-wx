<template>
  <view class="fix-top-window corrections-page">
    <view class="uni-header">
      <uni-stat-breadcrumb />
      <view class="corrections-toolbar">
        <input class="uni-search corrections-search" v-model="keyword" placeholder="搜索问题、修正答案、板子或用户" @confirm="handleSearch" />
        <select class="filter" v-model="enabledFilter" @change="handleSearch">
          <option value="">全部状态</option>
          <option value="true">启用</option>
          <option value="false">停用</option>
        </select>
        <button class="uni-button" size="mini" @click="handleSearch">搜索</button>
      </view>
    </view>

    <view class="uni-container">
      <view v-if="pageMode === 'list'" class="list-panel">
        <view class="list-summary">
          <text class="summary-main">共 {{ total }} 条知识修正</text>
        </view>
        <view class="table-card">
          <scroll-view scroll-x class="table-scroll">
            <uni-table class="corrections-table" border stripe :loading="loading" emptyText="暂无知识修正">
              <uni-tr>
                <uni-th align="left">问题</uni-th>
                <uni-th align="left">修正答案</uni-th>
                <uni-th align="center">适用板子</uni-th>
                <uni-th align="center">状态</uni-th>
                <uni-th align="center">优先级</uni-th>
                <uni-th align="center">更新时间</uni-th>
                <uni-th align="center">操作</uni-th>
              </uni-tr>
              <uni-tr v-for="item in list" :key="item._id">
                <uni-td align="left">
                  <view class="question-cell">{{ item.question || '-' }}</view>
                  <view class="sub-cell">{{ item.email || item.userId || '系统修正' }}</view>
                </uni-td>
                <uni-td align="left"><view class="answer-cell">{{ item.correctedAnswer || '-' }}</view></uni-td>
                <uni-td align="center">{{ item.scriptTitle || '通用' }}</uni-td>
                <uni-td align="center">
                  <uni-tag :type="item.enabled === false ? 'default' : 'success'" inverted size="small" :text="item.enabled === false ? '停用' : '启用'" />
                </uni-td>
                <uni-td align="center">{{ item.priority || 100 }}</uni-td>
                <uni-td align="center">{{ formatTime(item.updateTime || item.createTime) }}</uni-td>
                <uni-td align="center">
                  <view class="table-actions">
                    <button class="uni-button" size="mini" @click="edit(item)">查看</button>
                    <button class="uni-button" size="mini" type="primary" @click="toggle(item)">{{ item.enabled === false ? '启用' : '停用' }}</button>
                    <button class="uni-button" size="mini" type="warn" @click="remove(item)">删除</button>
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

      <view v-else class="detail-panel">
        <view class="detail-header">
          <view>
            <view class="detail-title">知识修正</view>
            <view class="detail-subtitle">启用后会优先于百科知识库参与小程序 AI 问答</view>
          </view>
          <view class="detail-actions">
            <button class="uni-button" size="mini" @click="backToList">返回列表</button>
            <button class="uni-button" size="mini" type="primary" :disabled="saving" @click="save">保存</button>
          </view>
        </view>

        <view class="form-card">
          <view class="form-grid">
            <view class="form-item form-full">
              <text class="label">问题</text>
              <textarea class="textarea small" v-model="form.question" />
            </view>
            <view class="form-item form-full">
              <text class="label">修正答案</text>
              <textarea class="textarea" v-model="form.correctedAnswer" />
            </view>
            <view class="form-item">
              <text class="label">适用板子</text>
              <input class="input" v-model="form.scriptTitle" placeholder="为空表示通用" />
            </view>
            <view class="form-item">
              <text class="label">优先级</text>
              <input class="input" type="number" v-model="form.priority" />
            </view>
            <view class="form-item">
              <text class="label">状态</text>
              <select class="input" v-model="enabledValue">
                <option value="true">启用</option>
                <option value="false">停用</option>
              </select>
            </view>
            <view class="form-item form-full">
              <text class="label">关键词</text>
              <input class="input" v-model="keywordsText" placeholder="用逗号分隔；为空时保存会自动生成" />
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { deleteCorrection, getCorrection, listCorrections, saveCorrection, toggleCorrection } from '@/utils/aiAdminApi.js';

const emptyForm = () => ({
  _id: '',
  question: '',
  correctedAnswer: '',
  scriptId: '',
  scriptTitle: '',
  priority: 100,
  enabled: true,
  keywords: []
});

export default {
  data() {
    return {
      keyword: '',
      enabledFilter: '',
      list: [],
      page: 1,
      pageSize: 20,
      total: 0,
      loading: false,
      saving: false,
      pageMode: 'list',
      form: emptyForm(),
      keywordsText: '',
      enabledValue: 'true'
    };
  },
  async onLoad() {
    await this.load();
  },
  methods: {
    async load() {
      this.loading = true;
      try {
        const params = { page: this.page, pageSize: this.pageSize, keyword: this.keyword };
        if (this.enabledFilter) params.enabled = this.enabledFilter === 'true';
        const res = await listCorrections(params);
        if (res.success && res.data) {
          this.list = res.data.list || [];
          this.total = res.data.total || 0;
        } else {
          this.toast(res.message || '加载失败');
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
    async edit(item) {
      const res = await getCorrection(item._id);
      if (res.success && res.data && res.data.item) {
        this.form = { ...emptyForm(), ...res.data.item };
        this.enabledValue = this.form.enabled === false ? 'false' : 'true';
        this.keywordsText = Array.isArray(this.form.keywords) ? this.form.keywords.join(',') : '';
        this.pageMode = 'detail';
      } else {
        this.toast(res.message || '加载详情失败');
      }
    },
    async save() {
      this.saving = true;
      try {
        const payload = {
          ...this.form,
          enabled: this.enabledValue === 'true',
          priority: Number(this.form.priority || 100),
          keywords: this.keywordsText.split(/[,，\n]/).map(item => item.trim()).filter(Boolean)
        };
        const res = await saveCorrection(payload);
        this.toast(res.success ? '已保存' : (res.message || '保存失败'));
        if (res.success) {
          this.pageMode = 'list';
          await this.load();
        }
      } finally {
        this.saving = false;
      }
    },
    async toggle(item) {
      const res = await toggleCorrection({ id: item._id, enabled: item.enabled === false });
      this.toast(res.success ? '已更新' : (res.message || '更新失败'));
      if (res.success) await this.load();
    },
    async remove(item) {
      const modal = await uni.showModal({ title: '确认删除', content: `删除这条知识修正？`, confirmColor: '#dd524d' });
      if (!modal.confirm) return;
      const res = await deleteCorrection(item._id);
      this.toast(res.success ? '已删除' : (res.message || '删除失败'));
      if (res.success) await this.load();
    },
    backToList() {
      this.pageMode = 'list';
      this.form = emptyForm();
    },
    formatTime(value) {
      if (!value) return '-';
      const date = new Date(value);
      const pad = num => String(num).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    },
    toast(title) {
      uni.showToast({ title, icon: 'none' });
    }
  }
};
</script>

<style scoped>
.corrections-page {
  background: #f6f7f9;
}
.corrections-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  flex-wrap: wrap;
}
.corrections-search {
  min-width: 280px;
  max-width: 460px;
  flex: 1;
}
.filter,
.input {
  height: 32px;
  box-sizing: border-box;
  padding: 0 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
}
.filter {
  width: 110px;
}
.list-summary {
  margin-bottom: 12px;
}
.summary-main {
  color: #303133;
  font-size: 14px;
  font-weight: 600;
}
.table-card,
.form-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
}
.table-scroll {
  width: 100%;
}
.corrections-table {
  min-width: 1080px;
}
.question-cell,
.answer-cell {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 320px;
  line-height: 1.5;
  word-break: break-word;
}
.question-cell {
  -webkit-line-clamp: 2;
  color: #303133;
  font-weight: 600;
}
.answer-cell {
  -webkit-line-clamp: 3;
  color: #606266;
}
.sub-cell {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
  word-break: break-all;
}
.table-actions,
.detail-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
}
.uni-pagination-box {
  margin-top: 16px;
  padding: 16px 0 0;
}
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.detail-title {
  color: #303133;
  font-size: 20px;
  font-weight: 600;
}
.detail-subtitle {
  margin-top: 6px;
  color: #909399;
  font-size: 13px;
}
.form-card {
  padding: 18px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.form-full {
  grid-column: 1 / -1;
}
.label {
  display: block;
  margin-bottom: 8px;
  color: #606266;
  font-size: 13px;
  font-weight: 600;
}
.input,
.textarea {
  width: 100%;
  box-sizing: border-box;
}
.textarea {
  min-height: 240px;
  padding: 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  line-height: 1.6;
}
.textarea.small {
  min-height: 100px;
}
@media screen and (max-width: 960px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .detail-header {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
