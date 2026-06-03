<template>
  <view class="fix-top-window">
    <view class="uni-header">
      <uni-stat-breadcrumb />
      <view class="toolbar">
        <view class="filters">
          <input class="uni-search search" v-model="keyword" placeholder="搜索标题、摘要或正文" @confirm="handleSearch" />
          <select class="uni-select select" v-model="status" @change="handleSearch">
            <option value="">全部状态</option>
            <option value="draft">草稿</option>
            <option value="published">已发布</option>
            <option value="offline">已下架</option>
          </select>
          <select class="uni-select select" v-model="type" @change="handleSearch">
            <option value="">全部类型</option>
            <option value="notice">公告</option>
            <option value="update">更新</option>
            <option value="maintenance">维护</option>
            <option value="important">重要</option>
          </select>
          <button class="uni-button" size="mini" @click="handleSearch">搜索</button>
        </view>
        <button class="uni-button" type="primary" size="mini" @click="openEditor()">新增公告</button>
      </view>
    </view>

    <view class="uni-container">
      <view class="summary">共 {{ total }} 条公告</view>
      <view class="table-card">
        <scroll-view scroll-x class="table-scroll">
          <uni-table class="table" border stripe :loading="loading" emptyText="暂无公告">
            <uni-tr>
              <uni-th align="left">标题</uni-th>
              <uni-th align="center">类型</uni-th>
              <uni-th align="center">状态</uni-th>
              <uni-th align="center">置顶</uni-th>
              <uni-th align="center">优先级</uni-th>
              <uni-th align="center">展示时间</uni-th>
              <uni-th align="center">更新时间</uni-th>
              <uni-th align="center">操作</uni-th>
            </uni-tr>
            <uni-tr v-for="item in list" :key="item._id">
              <uni-td align="left">
                <view class="title-cell">
                  <text class="item-title">{{ item.title || '-' }}</text>
                  <text class="item-summary">{{ item.summary || '-' }}</text>
                </view>
              </uni-td>
              <uni-td align="center">{{ typeText(item.type) }}</uni-td>
              <uni-td align="center"><uni-tag :type="statusTagType(item.status)" inverted size="small" :text="statusText(item.status)" /></uni-td>
              <uni-td align="center">{{ item.pinned ? '是' : '否' }}</uni-td>
              <uni-td align="center">{{ item.priority || 0 }}</uni-td>
              <uni-td align="center">
                <view class="time-cell">
                  <text>{{ formatTime(item.startTime) || '立即' }}</text>
                  <text>{{ formatTime(item.endTime) || '长期' }}</text>
                </view>
              </uni-td>
              <uni-td align="center"><uni-dateformat :date="item.updateTime" /></uni-td>
              <uni-td align="center">
                <view class="actions">
                  <button class="uni-button" size="mini" type="primary" @click="openEditor(item)">编辑</button>
                  <button v-if="item.status !== 'published'" class="uni-button" size="mini" type="primary" @click="changeStatus(item, 'published')">发布</button>
                  <button v-else class="uni-button" size="mini" type="default" @click="changeStatus(item, 'offline')">下架</button>
                  <button class="uni-button danger-button" size="mini" type="warn" @click="remove(item)">删除</button>
                </view>
              </uni-td>
            </uni-tr>
          </uni-table>
        </scroll-view>
      </view>
      <view v-if="total > 0" class="uni-pagination-box">
        <uni-pagination show-icon :page-size="pageSize" v-model="page" :total="total" @change="onPageChange" />
      </view>
    </view>

    <view v-if="editorVisible" class="editor-mask" @click="closeEditor">
      <view class="editor" @click.stop>
        <view class="editor-head">
          <text class="editor-title">{{ form._id ? '编辑公告' : '新增公告' }}</text>
          <button class="uni-button" size="mini" @click="closeEditor">关闭</button>
        </view>
        <scroll-view scroll-y class="editor-body">
          <view class="form-row">
            <text class="label">标题</text>
            <input class="input" v-model="form.title" placeholder="公告标题" />
          </view>
          <view class="form-row">
            <text class="label">摘要</text>
            <input class="input" v-model="form.summary" placeholder="首页和列表展示的简短摘要" />
          </view>
          <view class="form-row">
            <text class="label">类型</text>
            <select class="input" v-model="form.type">
              <option value="notice">公告</option>
              <option value="update">更新</option>
              <option value="maintenance">维护</option>
              <option value="important">重要</option>
            </select>
          </view>
          <view class="form-row">
            <text class="label">状态</text>
            <select class="input" v-model="form.status">
              <option value="draft">草稿</option>
              <option value="published">已发布</option>
              <option value="offline">已下架</option>
            </select>
          </view>
          <view class="form-row">
            <text class="label">置顶</text>
            <switch :checked="form.pinned" @change="form.pinned = $event.detail.value" />
          </view>
          <view class="form-row">
            <text class="label">优先级</text>
            <input class="input" type="number" v-model="form.priority" placeholder="数字越大越靠前" />
          </view>
          <view class="form-row">
            <text class="label">开始时间</text>
            <input class="input" v-model="form.startTimeText" placeholder="可空，格式 2026-06-03 12:00" />
          </view>
          <view class="form-row">
            <text class="label">结束时间</text>
            <input class="input" v-model="form.endTimeText" placeholder="可空，格式 2026-06-10 12:00" />
          </view>
          <view class="form-row form-row-top">
            <text class="label">正文</text>
            <textarea class="textarea" v-model="form.content" placeholder="公告正文" />
          </view>
        </scroll-view>
        <view class="editor-foot">
          <button class="uni-button" size="mini" @click="closeEditor">取消</button>
          <button class="uni-button" type="primary" size="mini" :disabled="saving" @click="save">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { listAnnouncements, saveAnnouncement, deleteAnnouncement, updateAnnouncementStatus } from '@/utils/aiAdminApi.js';

function emptyForm() {
  return {
    _id: '',
    title: '',
    summary: '',
    content: '',
    type: 'notice',
    status: 'draft',
    pinned: false,
    priority: 0,
    startTimeText: '',
    endTimeText: ''
  };
}

export default {
  data() {
    return {
      keyword: '',
      status: '',
      type: '',
      list: [],
      page: 1,
      pageSize: 20,
      total: 0,
      loading: false,
      saving: false,
      editorVisible: false,
      form: emptyForm()
    };
  },
  async onLoad() {
    await this.load();
  },
  methods: {
    async load() {
      this.loading = true;
      try {
        const res = await listAnnouncements({ page: this.page, pageSize: this.pageSize, keyword: this.keyword, status: this.status, type: this.type });
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
    openEditor(item) {
      if (!item) {
        this.form = emptyForm();
      } else {
        this.form = {
          ...emptyForm(),
          ...item,
          startTimeText: this.formatDateTime(item.startTime),
          endTimeText: this.formatDateTime(item.endTime)
        };
      }
      this.editorVisible = true;
    },
    closeEditor() {
      this.editorVisible = false;
    },
    async save() {
      const payload = {
        ...this.form,
        startTime: this.parseDateTime(this.form.startTimeText),
        endTime: this.parseDateTime(this.form.endTimeText),
        priority: Number(this.form.priority || 0)
      };
      this.saving = true;
      try {
        const res = await saveAnnouncement(payload);
        uni.showToast({ title: res.success ? '已保存' : (res.message || '保存失败'), icon: res.success ? 'success' : 'none' });
        if (res.success) {
          this.closeEditor();
          await this.load();
        }
      } finally {
        this.saving = false;
      }
    },
    changeStatus(item, status) {
      uni.showModal({
        title: '确认操作',
        content: `确定${status === 'published' ? '发布' : '下架'}该公告吗？`,
        success: async (res) => {
          if (!res.confirm) return;
          const result = await updateAnnouncementStatus({ id: item._id, status });
          uni.showToast({ title: result.success ? '已更新' : (result.message || '操作失败'), icon: result.success ? 'success' : 'none' });
          if (result.success) await this.load();
        }
      });
    },
    remove(item) {
      uni.showModal({
        title: '删除公告',
        content: '删除后不可恢复，确定删除吗？',
        success: async (res) => {
          if (!res.confirm) return;
          const result = await deleteAnnouncement(item._id);
          uni.showToast({ title: result.success ? '已删除' : (result.message || '删除失败'), icon: result.success ? 'success' : 'none' });
          if (result.success) await this.load();
        }
      });
    },
    typeText(type) {
      const map = { notice: '公告', update: '更新', maintenance: '维护', important: '重要' };
      return map[type] || '公告';
    },
    statusText(status) {
      const map = { draft: '草稿', published: '已发布', offline: '已下架' };
      return map[status] || '草稿';
    },
    statusTagType(status) {
      const map = { draft: 'default', published: 'success', offline: 'warning' };
      return map[status] || 'default';
    },
    formatTime(value) {
      return this.formatDateTime(value) || '';
    },
    formatDateTime(value) {
      if (!value) return '';
      const date = new Date(Number(value));
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${d} ${hh}:${mm}`;
    },
    parseDateTime(value) {
      if (!value) return null;
      const normalized = String(value).trim().replace(/-/g, '/');
      const time = new Date(normalized).getTime();
      return Number.isFinite(time) ? time : null;
    }
  }
};
</script>

<style scoped>
.toolbar,
.filters,
.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar {
  justify-content: space-between;
  width: 100%;
}

.filters {
  flex: 1;
  min-width: 420px;
}

.search {
  min-width: 260px;
  max-width: 420px;
  flex: 1;
}

.select {
  width: 120px;
}

.summary {
  margin-bottom: 12px;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
}

.table-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
}

.table-scroll {
  width: 100%;
}

.table {
  min-width: 1100px;
}

.title-cell,
.time-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-title {
  color: #303133;
  font-size: 14px;
  font-weight: 600;
}

.item-summary {
  max-width: 360px;
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-mask {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
}

.editor {
  width: min(760px, calc(100vw - 48px));
  max-height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 6px;
  overflow: hidden;
}

.editor-head,
.editor-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;
}

.editor-foot {
  justify-content: flex-end;
  border-top: 1px solid #ebeef5;
  border-bottom: 0;
}

.editor-title {
  color: #303133;
  font-size: 18px;
  font-weight: 600;
}

.editor-body {
  max-height: calc(100vh - 220px);
  padding: 20px;
  box-sizing: border-box;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}

.form-row-top {
  align-items: flex-start;
}

.label {
  width: 72px;
  color: #606266;
  font-size: 14px;
}

.input,
.textarea {
  flex: 1;
  padding: 0 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 14px;
}

.input {
  height: 36px;
}

.textarea {
  min-height: 220px;
  padding-top: 10px;
  line-height: 1.6;
}
</style>
