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
- 元数据: tag, category, description

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
  tag: '推理' | '娱乐',  // 标签，只能选择推理或娱乐
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

## 批量上传和进度条技术分析

### 5. 批量上传技术方案

**问题**: 如何实现高效的多文件批量上传？

**调研结果**:
- **前端方案**: File API + FormData，支持多文件选择和队列管理
- **传输策略**: 分批上传避免内存溢出，控制并发数量(3-5个)
- **状态管理**: 为每个文件维护上传状态(待上传/上传中/成功/失败)
- **错误处理**: 单文件失败不影响其他文件，失败文件可重试

**决策**: 实现前端队列管理和分批上传机制

### 6. JSON扫描进度条实现

**问题**: 如何在JSON文件扫描过程中显示实时进度？

**调研结果**:
- **扫描策略**: Web Worker实现后台扫描，避免阻塞UI
- **进度计算**: 基于文件大小或行数估算进度
- **状态反馈**: 实时更新扫描状态(扫描中/验证中/完成/错误)
- **用户体验**: 流畅的进度动画和状态文字

**决策**: 使用Web Worker + 进度回调实现实时进度显示

### 7. 批量处理状态管理

**问题**: 如何管理批量上传的复杂状态？

**调研结果**:
- **状态机模式**: 为批量操作定义状态(初始化/扫描/上传/完成)
- **进度聚合**: 汇总所有文件的进度计算总体进度
- **结果统计**: 统计成功/失败文件数量和原因
- **取消支持**: 允许用户取消正在进行的批量操作

**决策**: 实现完整的状态机管理批量上传流程

## Recommendations

1. **采用云对象统一管理**: 完全替代云函数，提高性能和可维护性
2. **标准化数据结构**: 建立统一的剧本数据模型
3. **加强验证机制**: 通过完善的验证替代兜底逻辑
4. **渐进式实施**: 分阶段实施，确保每个阶段可验证
5. **批量上传优化**: 使用队列管理和分批上传确保稳定性
6. **进度反馈增强**: 实时进度条提升用户体验
7. **状态管理完善**: 完整的批量操作状态跟踪