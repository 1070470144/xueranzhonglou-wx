<template>
  <view class="fix-top-window knowledge-page">
    <view class="uni-header">
      <uni-stat-breadcrumb class="uni-stat-breadcrumb-on-phone" />
      <view class="uni-group knowledge-toolbar">
        <input class="uni-search" v-model="keyword" placeholder="搜索标题或内容" @confirm="search" />
        <select class="filter" v-model="typeFilter" @change="search">
          <option value="">全部类型</option>
          <option value="role">角色</option>
          <option value="rule">规则</option>
          <option value="script">剧本</option>
          <option value="term">术语</option>
          <option value="manual">人工</option>
          <option value="other">其他</option>
        </select>
        <select class="filter" v-model="statusFilter" @change="search">
          <option value="">全部状态</option>
          <option value="active">启用</option>
          <option value="inactive">停用</option>
        </select>
        <button class="uni-button" size="mini" @click="search">搜索</button>
        <button class="uni-button" size="mini" @click="openCrawl">抓取知识</button>
        <button class="uni-button" type="warn" size="mini" :disabled="!selectedIds.length" @click="batchRemove">批量删除</button>
      </view>
    </view>

    <view class="uni-container">
      <view class="list-panel" v-if="pageMode === 'list'">
        <uni-table border stripe :loading="loading" emptyText="暂无知识">
          <uni-tr>
            <uni-th width="50" align="center">
              <checkbox :checked="isAllSelected" @click="toggleAll" />
            </uni-th>
            <uni-th align="left">标题</uni-th>
            <uni-th width="90" align="center">类型</uni-th>
            <uni-th width="120" align="center">分类</uni-th>
            <uni-th width="90" align="center">状态</uni-th>
            <uni-th width="150" align="center">更新时间</uni-th>
            <uni-th width="270" align="center">操作</uni-th>
          </uni-tr>
          <uni-tr v-for="item in list" :key="item._id">
            <uni-td align="center">
              <checkbox :checked="selectedIds.includes(item._id)" @click="toggleSelect(item._id)" />
            </uni-td>
            <uni-td>
              <view class="title-cell">{{ item.title }}</view>
              <view class="source-cell">{{ item.sourceUrl || 'manual' }}</view>
            </uni-td>
            <uni-td align="center">{{ typeText(item.type) }}</uni-td>
            <uni-td align="center">{{ item.roleType || item.category || '-' }}</uni-td>
            <uni-td align="center">{{ statusText(item.status) }}</uni-td>
            <uni-td align="center">{{ formatTime(item.updateTime) }}</uni-td>
            <uni-td align="center">
              <view class="uni-group table-actions">
                <button class="uni-button" size="mini" @click="viewItem(item)">查看</button>
                <button class="uni-button" type="primary" size="mini" @click="edit(item)">编辑</button>
                <button class="uni-button" type="primary" size="mini" :disabled="!item.sourceUrl || crawling" @click="recrawl(item)">重抓</button>
                <button class="uni-button" type="warn" size="mini" @click="remove(item)">删除</button>
              </view>
            </uni-td>
          </uni-tr>
        </uni-table>
        <view class="uni-pagination-box knowledge-pagination">
          <text>已选择 {{ selectedIds.length }} 条</text>
          <uni-pagination v-if="total > 0" show-icon :page-size="pageSize" v-model="page" :total="total" @change="onPageChange" />
        </view>
      </view>

      <view class="sub-page" v-if="pageMode === 'crawl'">
        <view class="sub-header">
          <view>
            <view class="sub-title">抓取知识</view>
            <view class="sub-desc">按角色、URL 或固定规则抓取并写入知识库</view>
          </view>
          <view class="uni-button-group sub-actions">
            <button class="uni-button" size="mini" @click="backToList">返回列表</button>
            <button class="uni-button" type="primary" size="mini" :disabled="crawlSubmitDisabled" @click="submitCrawl">{{ crawlSubmitText }}</button>
          </view>
        </view>

        <view class="card">
          <view class="tabs">
            <button v-for="tab in crawlTabs" :key="tab.value" class="tab" :class="{ active: crawlMode === tab.value }" @click="crawlMode = tab.value">{{ tab.label }}</button>
          </view>

          <view v-if="crawlMode === 'role'">
            <input class="input" v-model="roleForm.roleName" placeholder="角色名，例如：国王" />
            <input class="input" v-model="roleForm.script" placeholder="剧本，可选" />
          </view>

          <view v-if="crawlMode === 'batch'">
            <textarea class="textarea small" v-model="batchRoleText" placeholder="一行一个角色名" />
            <input class="input" v-model="batchScript" placeholder="剧本，可选" />
          </view>

          <view v-if="crawlMode === 'url'">
            <input class="input" v-model="urlForm.url" placeholder="百科页面 URL" />
            <select class="input" v-model="urlForm.type">
              <option value="role">角色</option>
              <option value="rule">规则</option>
              <option value="script">剧本</option>
              <option value="term">术语</option>
              <option value="other">其他</option>
            </select>
            <input class="input" v-model="urlForm.category" placeholder="分类" />
          </view>

          <view v-if="crawlMode === 'rule'">
            <checkbox-group @change="onRuleChange">
              <view class="rule-section">
                <view class="rule-section-title">固定规则</view>
                <view class="rule-list rule-list-basic">
                  <label class="rule-item" v-for="rule in fixedRules" :key="rule.key">
                    <checkbox :value="rule.key" :checked="selectedRules.includes(rule.key)" />
                    <text>{{ rule.label }}</text>
                  </label>
                </view>
              </view>
              <view class="rule-section">
                <view class="rule-section-title">角色能力类别</view>
                <view class="rule-list rule-list-ability">
                  <label class="rule-item" v-for="rule in abilityRules" :key="rule.key">
                    <checkbox :value="rule.key" :checked="selectedRules.includes(rule.key)" />
                    <text>{{ rule.label }}</text>
                  </label>
                </view>
              </view>
            </checkbox-group>
          </view>

          <view class="crawl-result" v-if="crawlResult">
            <view>{{ crawlResult }}</view>
          </view>
        </view>
      </view>

      <view class="sub-page" v-if="pageMode === 'view'">
        <view class="sub-header">
          <view>
            <view class="sub-title">{{ detail.title || '知识详情' }}</view>
            <view class="sub-desc">{{ typeText(detail.type) }} / {{ detail.roleType || detail.category || '-' }} / {{ statusText(detail.status) }}</view>
          </view>
          <view class="uni-button-group sub-actions">
            <button class="uni-button" size="mini" @click="backToList">返回列表</button>
            <button class="uni-button" type="primary" size="mini" @click="edit(detail)">编辑</button>
          </view>
        </view>

        <view class="card">
          <view class="detail-summary">
            <view class="summary-item">
              <text class="summary-label">标题</text>
              <text class="summary-value">{{ detail.title || '-' }}</text>
            </view>
            <view class="summary-item">
              <text class="summary-label">类型</text>
              <text class="summary-value">{{ typeText(detail.type) }}</text>
            </view>
            <view class="summary-item">
              <text class="summary-label">分类</text>
              <text class="summary-value">{{ detail.roleType || detail.category || '-' }}</text>
            </view>
            <view class="summary-item">
              <text class="summary-label">状态</text>
              <text class="summary-value">{{ statusText(detail.status) }}</text>
            </view>
            <view class="summary-item summary-full" v-if="detail.sourceUrl">
              <text class="summary-label">来源</text>
              <text class="summary-value source-text">{{ detail.sourceUrl }}</text>
            </view>
          </view>
          <view class="meta-grid" v-if="hasRoleMeta(detail)">
            <view class="meta-item" v-if="detail.englishName">
              <text class="meta-label">英文名</text>
              <text>{{ detail.englishName }}</text>
            </view>
            <view class="meta-item" v-if="detail.scripts && detail.scripts.length">
              <text class="meta-label">所属剧本</text>
              <text>{{ detail.scripts.join('、') }}</text>
            </view>
            <view class="meta-item" v-if="detail.abilityTypes && detail.abilityTypes.length">
              <text class="meta-label">能力类型</text>
              <text>{{ detail.abilityTypes.join('、') }}</text>
            </view>
          </view>
          <view class="panel-title">正文内容</view>
          <scroll-view class="content-viewer" scroll-y>
            <view v-if="detail.sections && detail.sections.length">
              <view class="section-block" v-for="section in detail.sections" :key="section.key || section.title">
                <view class="section-title">{{ section.title }}</view>
                <text>{{ section.content }}</text>
              </view>
            </view>
            <text v-else>{{ detail.content }}</text>
          </scroll-view>
        </view>
      </view>

      <view class="sub-page" v-if="pageMode === 'edit'">
        <view class="sub-header">
          <view>
            <view class="sub-title">编辑知识</view>
            <view class="sub-desc">保存后会同步更新检索文本，供小程序 AI 问答使用</view>
          </view>
          <view class="uni-button-group sub-actions">
            <button class="uni-button" size="mini" @click="backToList">返回列表</button>
            <button class="uni-button" type="primary" size="mini" :disabled="saving" @click="save">保存知识</button>
          </view>
        </view>

        <view class="card form-card">
          <input class="input" v-model="form.title" placeholder="标题" />
          <select class="input" v-model="form.type">
            <option value="manual">人工</option>
            <option value="role">角色</option>
            <option value="rule">规则</option>
            <option value="script">剧本</option>
            <option value="term">术语</option>
            <option value="other">其他</option>
          </select>
          <input class="input" v-model="form.category" placeholder="分类" />
          <input class="input" v-model="form.roleType" placeholder="角色类型，可选" />
          <input class="input" v-model="form.script" placeholder="剧本，可选" />
          <input class="input" v-model="form.sourceUrl" placeholder="来源 URL" />
          <select class="input" v-model="form.status">
            <option value="active">启用</option>
            <option value="inactive">停用</option>
          </select>
          <textarea class="textarea" v-model="form.content" placeholder="知识内容" />
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import {
  batchCrawlRoles,
  batchDeleteKnowledge,
  crawlFixedRule,
  crawlRole,
  crawlWikiPage,
  deleteKnowledge,
  getKnowledgeDetail,
  listKnowledge,
  recrawlKnowledge,
  saveKnowledge
} from '@/utils/aiAdminApi.js';

const emptyForm = () => ({
  _id: '',
  title: '',
  type: 'manual',
  category: 'manual',
  roleType: '',
  script: '',
  englishName: '',
  scripts: [],
  abilityTypes: [],
  sections: [],
  searchText: '',
  tags: [],
  sourceUrl: '',
  sourceType: 'manual',
  status: 'active',
  content: ''
});

export default {
  data() {
    return {
      keyword: '',
      typeFilter: '',
      statusFilter: '',
      list: [],
      page: 1,
      pageSize: 20,
      total: 0,
      selectedIds: [],
      loading: false,
      saving: false,
      crawling: false,
      form: emptyForm(),
      pageMode: 'list',
      detail: emptyForm(),
      crawlMode: 'role',
      crawlTabs: [
        { value: 'role', label: '角色' },
        { value: 'batch', label: '批量角色' },
        { value: 'url', label: 'URL' },
        { value: 'rule', label: '固定规则' }
      ],
      roleForm: { roleName: '', script: '' },
      batchRoleText: '',
      batchScript: '',
      urlForm: { url: '', type: 'rule', category: 'wiki' },
      fixedRules: [
        { key: 'rules_summary', label: '规则概要' },
        { key: 'important_details', label: '重要细节' },
        { key: 'terms', label: '术语汇总' },
        { key: 'storyteller_advice', label: '给说书人的建议' },
        { key: 'jinxes', label: '相克规则' }
      ],
      abilityRules: [
        { key: 'ability_visit_storyteller', label: '拜访说书人' },
        { key: 'ability_protection', label: '保护' },
        { key: 'ability_expose_role', label: '暴露角色' },
        { key: 'ability_continuous_detection', label: '持续检测型能力' },
        { key: 'ability_execution', label: '处决' },
        { key: 'ability_extra_death', label: '额外死亡' },
        { key: 'ability_madness', label: '疯狂' },
        { key: 'ability_resurrection', label: '复活' },
        { key: 'ability_change_target', label: '更换选择目标' },
        { key: 'ability_public_trigger', label: '公开触发能力' },
        { key: 'ability_gain_ability', label: '获得能力' },
        { key: 'ability_info', label: '获取信息' },
        { key: 'ability_interaction_interference', label: '互动干扰' },
        { key: 'ability_retrospective', label: '回溯型能力' },
        { key: 'ability_entry', label: '进场能力' },
        { key: 'ability_role_change', label: '角色变化' },
        { key: 'ability_neighboring', label: '邻近' },
        { key: 'ability_immune_death', label: '免死' },
        { key: 'ability_effect_interference', label: '能力效果干扰' },
        { key: 'ability_cognition_override', label: '认知覆盖' },
        { key: 'ability_setup_adjustment', label: '设置调整' },
        { key: 'ability_dead_ability_retained', label: '死后能力保留' },
        { key: 'ability_death_trigger', label: '死亡触发能力' },
        { key: 'ability_special_win_loss', label: '特殊胜利失败条件' },
        { key: 'ability_nomination', label: '提名' },
        { key: 'ability_vote', label: '投票' },
        { key: 'ability_limited_use', label: '限次能力' },
        { key: 'ability_influence', label: '影响' },
        { key: 'ability_alignment_change', label: '阵营转变' },
        { key: 'ability_poisoned', label: '中毒' },
        { key: 'ability_drunk', label: '醉酒' }
      ],
      selectedRules: [],
      crawlResult: ''
    };
  },
  computed: {
    isAllSelected() {
      return this.list.length > 0 && this.list.every(item => this.selectedIds.includes(item._id));
    },
    crawlSubmitText() {
      const map = { role: '抓取角色', batch: '批量抓取', url: '抓取 URL', rule: '抓取规则' };
      return map[this.crawlMode] || '开始抓取';
    },
    crawlSubmitDisabled() {
      if (this.crawling) return true;
      if (this.crawlMode === 'role') return !this.roleForm.roleName;
      if (this.crawlMode === 'batch') return !this.batchRoleText;
      if (this.crawlMode === 'url') return !this.urlForm.url;
      if (this.crawlMode === 'rule') return false;
      return false;
    }
  },
  async onLoad() {
    await this.load();
  },
  methods: {
    async load() {
      this.loading = true;
      try {
        const res = await listKnowledge({
          page: this.page,
          pageSize: this.pageSize,
          keyword: this.keyword,
          type: this.typeFilter,
          status: this.statusFilter
        });
        if (res.success && res.data) {
          this.list = res.data.list || [];
          this.total = res.data.total || 0;
          this.selectedIds = this.selectedIds.filter(id => this.list.some(item => item._id === id));
        } else {
          this.toast(res.message || '加载失败');
        }
      } finally {
        this.loading = false;
      }
    },
    async search() {
      this.page = 1;
      await this.load();
    },
    async onPageChange(event) {
      this.page = Number(event && event.current ? event.current : event) || 1;
      await this.load();
    },
    toggleSelect(id) {
      this.selectedIds = this.selectedIds.includes(id)
        ? this.selectedIds.filter(item => item !== id)
        : this.selectedIds.concat(id);
    },
    toggleAll() {
      this.selectedIds = this.isAllSelected ? [] : this.list.map(item => item._id);
    },
    onRuleChange(event) {
      const values = event && event.detail && Array.isArray(event.detail.value) ? event.detail.value : [];
      this.selectedRules = values;
    },
    backToList() {
      this.pageMode = 'list';
    },
    openCrawl() {
      this.pageMode = 'crawl';
    },
    submitCrawl() {
      if (this.crawlMode === 'role') return this.crawlOneRole();
      if (this.crawlMode === 'batch') return this.crawlRoleBatch();
      if (this.crawlMode === 'url') return this.crawlUrl();
      if (this.crawlMode === 'rule') return this.crawlRules();
    },
    async viewItem(item) {
      const res = await getKnowledgeDetail(item._id);
      if (res.success && res.data && res.data.item) {
        this.detail = { ...emptyForm(), ...res.data.item };
        this.pageMode = 'view';
      } else {
        this.toast(res.message || '加载详情失败');
      }
    },
    async edit(item) {
      const res = await getKnowledgeDetail(item._id);
      if (res.success && res.data && res.data.item) {
        this.form = { ...emptyForm(), ...res.data.item };
        this.pageMode = 'edit';
      } else {
        this.toast(res.message || '加载详情失败');
      }
    },
    async save() {
      this.saving = true;
      try {
        const res = await saveKnowledge(this.form);
        this.toast(res.success ? '已保存' : (res.message || '保存失败'));
        if (res.success) {
          this.pageMode = 'list';
          this.form = emptyForm();
          await this.load();
        }
      } finally {
        this.saving = false;
      }
    },
    async remove(item) {
      const modal = await uni.showModal({ title: '确认删除', content: '删除知识「' + item.title + '」？' });
      if (!modal.confirm) return;
      const res = await deleteKnowledge(item._id);
      this.toast(res.success ? '已删除' : (res.message || '删除失败'));
      if (res.success) await this.load();
    },
    async batchRemove() {
      const modal = await uni.showModal({ title: '确认批量删除', content: '删除选中的 ' + this.selectedIds.length + ' 条知识？' });
      if (!modal.confirm) return;
      const res = await batchDeleteKnowledge(this.selectedIds);
      this.toast(res.success ? '已删除' : (res.message || '删除失败'));
      if (res.success) {
        this.selectedIds = [];
        await this.load();
      }
    },
    async recrawl(item) {
      this.crawling = true;
      try {
        const res = await recrawlKnowledge(item._id);
        this.crawlResult = res.message || '';
        this.toast(res.success ? '已重抓' : (res.message || '重抓失败'));
        if (res.success) await this.load();
      } finally {
        this.crawling = false;
      }
    },
    async crawlOneRole() {
      this.crawling = true;
      try {
        const res = await crawlRole(this.roleForm);
        this.crawlResult = res.message || '';
        this.toast(res.success ? '角色已保存' : (res.message || '抓取失败'));
        if (res.success) await this.load();
      } finally {
        this.crawling = false;
      }
    },
    async crawlRoleBatch() {
      this.crawling = true;
      try {
        const res = await batchCrawlRoles({ roleNames: this.batchRoleText, script: this.batchScript });
        this.crawlResult = res.message || '';
        this.toast(res.success ? '批量抓取完成' : (res.message || '抓取失败'));
        if (res.success) await this.load();
      } finally {
        this.crawling = false;
      }
    },
    async crawlUrl() {
      this.crawling = true;
      try {
        const res = await crawlWikiPage(this.urlForm);
        this.crawlResult = res.message || '';
        this.toast(res.success ? 'URL 已保存' : (res.message || '抓取失败'));
        if (res.success) await this.load();
      } finally {
        this.crawling = false;
      }
    },
    async crawlRules() {
      if (!this.selectedRules.length) {
        this.toast('请先选择要抓取的规则');
        return;
      }
      this.crawling = true;
      const results = [];
      try {
        for (const key of this.selectedRules) {
          try {
            const res = await crawlFixedRule({ key });
            results.push((res.success ? '成功：' : '失败：') + (res.message || key));
          } catch (error) {
            results.push('失败：' + key + '，' + (error.message || String(error)));
          }
        }
        this.crawlResult = results.join('\n');
        const hasSuccess = results.some(item => item.indexOf('成功：') === 0);
        const hasFailed = results.some(item => item.indexOf('失败：') === 0);
        this.toast(hasSuccess ? '规则抓取完成' : '规则抓取失败');
        if (hasFailed) {
          uni.showModal({
            title: hasSuccess ? '部分抓取失败' : '抓取失败',
            content: this.crawlResult.slice(0, 800),
            showCancel: false
          });
        }
        await this.load();
      } finally {
        this.crawling = false;
      }
    },
    typeText(type) {
      const map = { role: '角色', rule: '规则', script: '剧本', term: '术语', manual: '人工', correction: '修正', other: '其他' };
      return map[type] || '其他';
    },
    statusText(status) {
      return status === 'inactive' ? '停用' : '启用';
    },
    hasRoleMeta(item) {
      return !!(item && (item.englishName || (item.scripts && item.scripts.length) || (item.abilityTypes && item.abilityTypes.length)));
    },
    formatTime(value) {
      if (!value) return '-';
      const date = new Date(value);
      const pad = num => String(num).padStart(2, '0');
      return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
    },
    toast(title) {
      uni.showToast({ title, icon: 'none' });
    }
  }
};
</script>

<style scoped>
.knowledge-page {
  background: #f6f7f9;
}
.knowledge-toolbar {
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-start;
  width: 100%;
}
.filter {
  width: 110px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
}
.list-panel {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 150px);
}
.sub-page {
  min-height: calc(100vh - 150px);
}
.sub-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid #ebeef5;
}
.sub-title {
  color: #303133;
  font-size: 20px;
  font-weight: 600;
}
.sub-desc {
  margin-top: 6px;
  color: #909399;
  font-size: 13px;
}
.sub-actions,
.form-actions {
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-start;
}
.card {
  box-sizing: border-box;
  padding: 20px 0;
  background: #fff;
}
.panel-title {
  margin-bottom: 14px;
  font-size: 16px;
  font-weight: 600;
}
.tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.tab {
  min-width: 88px;
  height: 32px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  color: #606266;
  font-size: 12px;
}
.tab.active {
  border-color: #2979ff;
  color: #2979ff;
  background: #ecf5ff;
}
.input,
.textarea {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 16px;
  padding: 0 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
}
.input {
  height: 36px;
}
.textarea {
  min-height: 320px;
  padding: 10px;
}
.textarea.small {
  min-height: 140px;
}
.form-card {
  width: 100%;
}
.table-actions {
  gap: 6px;
  justify-content: center;
  flex-wrap: nowrap;
}
.title-cell {
  color: #303133;
  font-weight: 500;
}
.source-cell {
  overflow: hidden;
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.knowledge-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding: 16px 0 0;
  color: #606266;
  font-size: 13px;
}
.content-viewer {
  box-sizing: border-box;
  height: 520px;
  padding: 18px 20px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background: #fff;
  color: #303133;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
}
.detail-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 14px;
  border: 1px solid #ebeef5;
  border-right: 0;
  border-bottom: 0;
  background: #fff;
}
.summary-item {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  min-height: 42px;
  border-right: 1px solid #ebeef5;
  border-bottom: 1px solid #ebeef5;
  color: #303133;
  font-size: 13px;
}
.summary-full {
  grid-column: 1 / -1;
}
.summary-label {
  display: flex;
  align-items: center;
  padding: 0 12px;
  background: #f8f9fb;
  color: #909399;
}
.summary-value {
  display: block;
  min-width: 0;
  padding: 11px 12px;
  overflow-wrap: anywhere;
  line-height: 1.5;
}
.source-text {
  color: #606266;
}
.meta-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  margin-bottom: 18px;
  border: 1px solid #ebeef5;
  border-right: 0;
  border-bottom: 0;
  border-radius: 4px;
  background: #fff;
}
.meta-item {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  color: #303133;
  font-size: 13px;
  line-height: 1.5;
  border-right: 1px solid #ebeef5;
  border-bottom: 1px solid #ebeef5;
}
.meta-label {
  padding: 11px 12px;
  background: #f8f9fb;
  color: #909399;
}
.meta-item text:last-child {
  min-width: 0;
  padding: 11px 12px;
  overflow-wrap: anywhere;
}
.section-block {
  padding: 0 0 20px;
  margin-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
}
.section-title {
  margin-bottom: 10px;
  color: #303133;
  font-size: 15px;
  font-weight: 600;
}
.rule-list {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}
.rule-section {
  margin-bottom: 22px;
}
.rule-section-title {
  margin-bottom: 10px;
  color: #303133;
  font-size: 15px;
  font-weight: 600;
}
.rule-list-basic {
  grid-template-columns: repeat(5, minmax(120px, 1fr));
}
.rule-list-ability {
  grid-template-columns: repeat(5, minmax(120px, 1fr));
}
.rule-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  box-sizing: border-box;
  padding: 0 10px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background: #fff;
  color: #303133;
  font-size: 14px;
}
.crawl-result {
  margin-top: 12px;
  padding: 8px;
  color: #606266;
  background: #f7f8fa;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.6;
}
@media screen and (max-width: 1100px) {
  .sub-header {
    align-items: stretch;
    flex-direction: column;
  }
  .sub-actions {
    justify-content: flex-start;
  }
  .detail-summary,
  .meta-grid {
    grid-template-columns: 1fr;
  }
  .rule-list-basic,
  .rule-list-ability {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .table-actions {
    flex-wrap: wrap;
  }
}
</style>
