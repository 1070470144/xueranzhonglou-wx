# Research: 小程序端数据结构统一与同步

**Date**: 2026-01-15
**Purpose**: 分析现有小程序端与管理端数据结构差异，确定适配策略

## 现有数据结构对比分析

### 管理端数据结构 (specs/001-unify-script-admin/data-model.md)

**剧本实体完整字段**:
- `_id`: 云数据库自动生成ID
- `title`: 剧本标题 (必需, 1-200字符)
- `content`: 剧本正文内容 (必需)
- `author`: 剧本作者 (必需, 1-100字符)
- `fileId`: 上传文件ID (兼容fileID)
- `fileUrl`: 文件访问URL
- `fileSize`: 文件大小(字节)
- `mimeType`: 文件MIME类型
- `status`: 剧本状态 (必需, active/inactive)
- `tags`: 标签列表 (枚举: 推理/娱乐, 最多2个)
- `category`: 分类 (1-100字符)
- `description`: 剧本描述 (0-1000字符)
- `createTime`: 创建时间
- `updateTime`: 更新时间
- `usageCount`: 使用次数 (>=0, 默认0)
- `likes`: 点赞数 (>=0, 默认0)
- `images`: 封面图片列表

### 小程序端当前数据结构

**listScripts云函数投影字段**:
```javascript
.field({
  title: true,
  author: true,
  version: true,
  likes: true,
  images: true,
  _id: true,
  createdAt: true
})
```

**getScript云函数投影字段**:
```javascript
.field({
  title: true,
  author: true,
  version: true,
  likes: true,
  images: true,
  thumbnails: true,
  thumbnail: true,
  createdAt: true,
  _id: true
})
```

**小程序界面使用的字段**:
- script-list.vue: title, author, version, likes, images
- script-detail.vue: title, author, version, description, jsonUrl, playerCount, difficulty, usageCount, tag, likes, images

## 数据结构差异分析

### 缺失的管理端字段

1. **状态相关字段**:
   - `status`: 剧本激活状态 (小程序端无)
   - `updateTime`: 最后更新时间 (小程序端使用createdAt)

2. **内容相关字段**:
   - `content`: 剧本正文内容 (小程序端无)
   - `description`: 剧本描述 (小程序端有，但字段名不同)

3. **文件相关字段**:
   - `fileId`: 文件ID
   - `fileUrl`: 文件URL
   - `fileSize`: 文件大小
   - `mimeType`: MIME类型

4. **分类和标签字段**:
   - `category`: 分类
   - `tags`: 标签数组 (小程序端使用单个tag字段)

5. **统计字段**:
   - `usageCount`: 使用次数 (小程序端有，但可能未正确映射)

### 字段映射问题

1. **时间字段不一致**:
   - 管理端: createTime, updateTime
   - 小程序端: createdAt (映射到createTime)

2. **标签字段格式不同**:
   - 管理端: tags (数组)
   - 小程序端: tag (单个字符串)

3. **图片字段处理逻辑不同**:
   - 管理端: images (对象数组，可能包含url、fileId等)
   - 小程序端: images (URL字符串数组)

## 适配策略

### 云函数扩展策略

**listScripts云函数需要添加的字段**:
```javascript
.field({
  // 现有字段
  title: true,
  author: true,
  version: true,
  likes: true,
  images: true,
  _id: true,
  createdAt: true,

  // 新增管理端字段
  status: true,
  tags: true,
  category: true,
  description: true,
  updateTime: true,
  usageCount: true,
  fileSize: true,
  mimeType: true
})
```

**getScript云函数需要添加的字段**:
```javascript
.field({
  // 现有字段
  title: true,
  author: true,
  version: true,
  likes: true,
  images: true,
  thumbnails: true,
  thumbnail: true,
  createdAt: true,
  _id: true,

  // 新增管理端字段
  status: true,
  tags: true,
  category: true,
  description: true,
  content: true,
  updateTime: true,
  usageCount: true,
  fileId: true,
  fileUrl: true,
  fileSize: true,
  mimeType: true
})
```

### 前端数据适配策略

**字段映射和默认值处理**:

1. **状态字段**:
   - 如果status不存在，默认设为'active'
   - 在界面中根据status显示激活状态

2. **标签字段**:
   - 将管理端的tags数组转换为小程序端的单个tag字符串
   - 如果tags数组存在，取第一个标签作为tag

3. **时间字段**:
   - updateTime映射到updateTime字段
   - 如果updateTime不存在，使用createdAt

4. **统计字段**:
   - usageCount直接映射
   - 如果不存在，默认值为0

5. **图片字段**:
   - 保持现有逻辑，支持thumbnails、thumbnail、images的降级处理

### 兼容性考虑

**向后兼容性**:
- 现有小程序代码无需大幅修改
- 新字段提供默认值处理
- 保持现有API响应格式

**数据一致性**:
- 确保字段映射逻辑在前端和后端保持一致
- 添加字段验证和格式化处理
- 处理字段缺失或格式不正确的情况

## 实施风险评估

### 低风险项目
- 云函数字段投影扩展 (现有逻辑兼容)
- 前端字段映射适配 (渐进式添加)
- 默认值处理 (安全降级)

### 中等风险项目
- 标签字段格式转换 (需要确保显示正确性)
- 时间字段映射 (可能影响排序和显示)

### 实施建议

1. **分阶段实施**:
   - 第一阶段：扩展云函数字段投影
   - 第二阶段：前端字段映射适配
   - 第三阶段：功能验证和测试

2. **测试策略**:
   - 单元测试：字段映射逻辑
   - 集成测试：端到端数据流
   - 兼容性测试：旧数据和新数据处理

3. **回滚策略**:
   - 云函数可以快速回滚字段投影
   - 前端可以保持向后兼容处理