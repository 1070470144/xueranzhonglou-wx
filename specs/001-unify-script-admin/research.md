# Research Phase: 统一剧本管理接口

**Date**: 2026-01-14
**Purpose**: Resolve technical unknowns and validate approach for unifying script management interfaces

## Research Questions & Findings

### 1. 当前剧本管理接口分析

**问题**: 现有剧本管理功能使用了哪些接口和数据结构？

**调研结果**:
- **前端页面**: `xueran-admin/pages/admin/scripts/list.vue` (列表), `edit.vue` (编辑)
- **云函数**: `uniCloud-aliyun/cloudfunctions/getScript/`, `listScripts/`
- **数据存储**: 云数据库中的剧本集合

**决策**: 需要重构现有分散的接口为统一的云对象API

### 2. 云对象 vs 云函数选择

**问题**: 是否可以完全使用云对象替代现有的云函数？

**调研结果**:
- 云对象支持CRUD操作，完全可以替代 `getScript` 和 `listScripts` 功能
- 云对象提供更好的类型安全和序列化支持
- 符合宪章要求的"优先使用云对象"原则

**决策**: 完全使用云对象，移除云函数依赖

### 3. 统一数据结构设计

**问题**: 剧本数据的统一接口格式应该包含哪些字段？

**调研结果**:
- 剧本基本信息: id, title, content, author, createTime, updateTime
- 文件信息: fileId, fileUrl, fileSize, mimeType
- 状态信息: status, publishStatus, version
- 元数据: tags, category, description

**决策**: 定义标准化的剧本数据结构，所有接口使用统一格式

### 4. 文件上传处理策略

**问题**: 如何确保文件上传的一致性和错误处理？

**调研结果**:
- 需要前端后端双重验证
- 文件ID字段兼容性处理 (fileId/fileID)
- 上传进度显示和错误恢复机制
- 日志记录和错误追踪

**决策**: 实现完整的前后端验证和错误处理流程

### 5. 移除兜底逻辑的影响

**问题**: 移除兜底逻辑后如何确保系统稳定性？

**调研结果**:
- 需要加强错误处理和用户反馈
- 建立完整的验证机制
- 实现渐进式部署策略

**决策**: 通过完善的验证和错误处理替代兜底逻辑

## Technical Approach Validation

### 云对象API设计

```javascript
// 统一剧本管理API
const scriptAPI = {
  // 列表查询
  list: (params) => uniCloud.callFunction({ name: 'scriptManager', data: { action: 'list', ...params } }),

  // 获取单个剧本
  get: (id) => uniCloud.callFunction({ name: 'scriptManager', data: { action: 'get', id } }),

  // 创建剧本
  create: (data) => uniCloud.callFunction({ name: 'scriptManager', data: { action: 'create', ...data } }),

  // 更新剧本
  update: (id, data) => uniCloud.callFunction({ name: 'scriptManager', data: { action: 'update', id, ...data } }),

  // 删除剧本
  delete: (id) => uniCloud.callFunction({ name: 'scriptManager', data: { action: 'delete', id } })
}
```

### 数据结构规范

```javascript
// 剧本数据结构
interface Script {
  _id: string,           // 云数据库ID
  title: string,         // 剧本标题
  content: string,       // 剧本内容
  author: string,        // 作者
  fileId?: string,       // 文件ID (兼容fileID)
  fileUrl?: string,      // 文件URL
  fileSize?: number,     // 文件大小
  mimeType?: string,     // 文件类型
  status: 'active' | 'inactive',  // 状态 (active=激活, inactive=未激活)
  tags: string[],        // 标签
  category?: string,     // 分类
  description?: string,  // 描述
  createTime: Date,      // 创建时间
  updateTime: Date       // 更新时间
}
```

## Implementation Strategy

### Phase 1: 核心云对象开发
1. 创建统一的剧本管理云对象
2. 实现CRUD操作
3. 定义数据验证规则
4. 建立错误处理机制

### Phase 2: 前端界面重构
1. 重构列表页面使用新API
2. 重构编辑页面集成统一接口
3. 实现文件上传组件
4. 添加进度显示和错误反馈

### Phase 3: 测试和优化
1. 编写手动测试流程
2. 性能优化和错误边界处理
3. 文档更新和培训

## Risk Assessment

### 高风险项目
1. **数据迁移**: 现有剧本数据需要确保兼容性
2. **API变更**: 前端需要适应新的接口结构
3. **错误处理**: 移除兜底逻辑后需要完善错误处理

### 缓解策略
1. 渐进式部署，先保留旧接口作为备份
2. 充分的测试覆盖所有使用场景
3. 详细的回滚计划和监控机制

## Recommendations

1. **采用云对象统一管理**: 完全替代云函数，提高性能和可维护性
2. **标准化数据结构**: 建立统一的剧本数据模型
3. **加强验证机制**: 通过完善的验证替代兜底逻辑
4. **渐进式实施**: 分阶段实施，确保每个阶段可验证
