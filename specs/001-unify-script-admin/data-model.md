# Data Model: 统一剧本管理接口

**Date**: 2026-01-14
**Purpose**: Define unified data structures for script management operations

## 核心实体定义

### 剧本实体 (Script)

剧本是系统的核心数据实体，包含剧本内容、元数据和文件信息。

**字段定义**:

| 字段名 | 类型 | 必需 | 描述 | 验证规则 |
|--------|------|------|------|----------|
| `_id` | String | 是 | 云数据库自动生成ID | 系统生成 |
| `title` | String | 是 | 剧本标题 | 1-200字符，非空 |
| `content` | String | 是 | 剧本正文内容 | 非空 |
| `author` | String | 是 | 剧本作者 | 1-100字符 |
| `fileId` | String | 否 | 上传文件ID | UUID格式，兼容fileID |
| `fileUrl` | String | 否 | 文件访问URL | 有效URL格式 |
| `fileSize` | Number | 否 | 文件大小(字节) | >0 |
| `mimeType` | String | 否 | 文件MIME类型 | 标准MIME格式 |
| `status` | String | 是 | 剧本状态 | 枚举: active/inactive (激活/未激活) |
| `tags` | Array<String> | 否 | 标签列表 | 枚举: 推理/娱乐 |
| `category` | String | 否 | 分类 | 1-100字符 |
| `description` | String | 否 | 剧本描述 | 0-1000字符 |
| `createTime` | Date | 是 | 创建时间 | 系统生成 |
| `updateTime` | Date | 是 | 更新时间 | 系统生成 |
| `usageCount` | Number | 否 | 使用次数 | >=0，默认0 |
| `likes` | Number | 否 | 点赞数 | >=0，默认0 |
| `images` | Array<Object> | 否 | 封面图片列表 | 包含url等信息 |
| `usageCount` | Number | 否 | 使用次数 | >=0，默认0 |
| `likes` | Number | 否 | 点赞数 | >=0，默认0 |
| `images` | Array<Object> | 否 | 封面图片列表 | 包含url等信息 |

**状态说明**:
- `active`：剧本处于可用/激活状态，可以被展示和使用（显示为“激活”）。
- `inactive`：剧本处于不可用/未激活状态，不会被普通列表优先展示（显示为“未激活”）。
- 状态变更需管理员权限并记录操作日志。

### 上传记录实体 (UploadRecord)

记录每次文件上传操作，用于审计和错误追踪。

**字段定义**:

| 字段名 | 类型 | 必需 | 描述 | 验证规则 |
|--------|------|------|------|----------|
| `_id` | String | 是 | 云数据库自动生成ID | 系统生成 |
| `scriptId` | String | 否 | 关联剧本ID | 有效剧本ID |
| `fileName` | String | 是 | 原始文件名 | 1-255字符 |
| `fileSize` | Number | 是 | 文件大小 | >0 |
| `mimeType` | String | 是 | 文件类型 | 标准MIME格式 |
| `uploadTime` | Date | 是 | 上传时间 | 系统生成 |
| `uploadUser` | String | 是 | 上传用户 | 有效用户ID |
| `status` | String | 是 | 上传状态 | 枚举: success/failed/processing |
| `errorMessage` | String | 否 | 错误信息 | 失败时必需 |

## 数据关系

### 剧本与上传记录关系
- 一个剧本可以有多个上传记录 (历史版本)
- 每个上传记录关联到一个剧本
- 通过 `scriptId` 建立关联

### 数据完整性约束
- 删除剧本时，级联删除相关上传记录
- 剧本状态变更需要记录操作日志
- 文件上传成功后必须更新剧本的fileId和fileUrl字段

## 验证规则

### 剧本验证
```javascript
const scriptValidation = {
  title: {
    required: true,
    minLength: 1,
    maxLength: 200
  },
  content: {
    required: true,
    minLength: 1
  },
  author: {
    required: true,
    minLength: 1,
    maxLength: 100
  },
  status: {
    required: true,
    enum: ['active', 'inactive']
  },
  tags: {
    enum: ['推理', '娱乐']
  }
}
```

### 文件上传验证
```javascript
const fileValidation = {
  allowedTypes: ['text/plain', 'application/json', 'text/markdown'],
  maxSize: 10 * 1024 * 1024, // 10MB
  namePattern: /^[a-zA-Z0-9_\-\.\s\u4e00-\u9fa5]+$/
}
```

## 数据迁移策略

### 从现有结构迁移
1. **字段映射**: 将现有字段映射到新结构
2. **数据清理**: 移除无效或冗余数据
3. **状态标准化**: 统一状态字段值为枚举值
4. **关联重建**: 重新建立文件与剧本的关联关系

### 兼容性处理
- 旧接口字段名兼容 (fileId/fileID)
- 渐进式迁移，避免服务中断
- 回滚计划和数据备份

## 性能优化

### 索引策略
- `title`: 文本索引 (支持搜索)
- `author`: 普通索引
- `status`: 普通索引
- `createTime`: 降序索引
- `tags`: 多键索引

### 查询优化
- 分页查询使用游标
- 搜索功能使用文本索引
- 状态筛选使用索引
- 文件大小限制避免内存溢出

## 安全考虑

### 数据验证
- 所有输入数据进行服务端验证
- 文件类型和服务端双重校验
- XSS和注入攻击防护

### 访问控制
- 剧本权限基于用户角色
- 文件上传需要认证
- 删除操作需要管理员权限

### 审计日志
- 所有数据变更记录操作日志
- 敏感操作记录用户IP和时间戳
- 定期审查和清理审计日志
