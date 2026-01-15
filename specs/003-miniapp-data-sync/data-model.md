# Data Model: 小程序端数据结构统一与同步

**Date**: 2026-01-15
**Purpose**: 定义小程序端适配管理端数据结构后的完整数据模型

## 核心实体定义

### 剧本实体 (Script) - 小程序端适配版

基于管理端剧本实体定义，适配小程序端显示和交互需求。

**字段定义**:

| 字段名 | 类型 | 必需 | 描述 | 验证规则 | 小程序端映射 |
|--------|------|------|------|----------|--------------|
| `_id` | String | 是 | 云数据库自动生成ID | 系统生成 | id |
| `title` | String | 是 | 剧本标题 | 1-200字符，非空 | title |
| `content` | String | 是 | 剧本正文内容 | 非空 | (详情页使用) |
| `author` | String | 是 | 剧本作者 | 1-100字符 | author |
| `fileId` | String | 否 | 上传文件ID | UUID格式 | (预留) |
| `fileUrl` | String | 否 | 文件访问URL | 有效URL格式 | jsonUrl |
| `fileSize` | Number | 否 | 文件大小(字节) | >0 | (预留) |
| `mimeType` | String | 否 | 文件MIME类型 | 标准MIME格式 | (预留) |
| `status` | String | 是 | 剧本状态 | 枚举: active/inactive | status |
| `tags` | Array<String> | 否 | 标签列表 | 枚举: 推理/娱乐 | tags → tag |
| `category` | String | 否 | 分类 | 1-100字符 | (预留) |
| `description` | String | 否 | 剧本描述 | 0-1000字符 | description |
| `createTime` | Date | 是 | 创建时间 | 系统生成 | createdAt |
| `updateTime` | Date | 是 | 更新时间 | 系统生成 | updateTime |
| `usageCount` | Number | 否 | 使用次数 | >=0，默认0 | usageCount |
| `likes` | Number | 否 | 点赞数 | >=0，默认0 | likes |
| `images` | Array<Object> | 否 | 封面图片列表 | 包含url等信息 | images |

### 小程序端数据映射规则

#### 字段映射策略

1. **直接映射字段**:
   - title → title
   - author → author
   - likes → likes
   - createTime → createdAt
   - updateTime → updateTime
   - description → description

2. **转换映射字段**:
   - tags (数组) → tag (字符串): 取第一个标签或默认值
   - _id → id: 前端统一使用id字段

3. **默认值处理**:
   - status: 默认 'active' 如果不存在
   - usageCount: 默认 0 如果不存在
   - tag: 默认 '推理' 如果tags数组为空
   - version: 从其他字段推导或使用默认值

#### 图片字段处理逻辑

```javascript
// 小程序端图片处理优先级
function resolveImages(script) {
  // 优先使用 thumbnails (管理端标准)
  if (script.thumbnails && Array.isArray(script.thumbnails)) {
    return script.thumbnails.slice(0, 3);
  }

  // 降级到 thumbnail (单个图片)
  if (script.thumbnail) {
    return [script.thumbnail];
  }

  // 最后使用 images 数组
  if (script.images && Array.isArray(script.images)) {
    return script.images.slice(0, 3);
  }

  return [];
}
```

## 数据关系

### 小程序端数据流

```
管理端数据库 → 云函数(listScripts/getScript) → 小程序前端 → UI显示
```

### 字段一致性保证

1. **云函数字段投影**: 确保所有管理端字段都被正确投影
2. **前端字段映射**: 统一字段名和格式转换
3. **默认值处理**: 为缺失字段提供合理默认值
4. **类型转换**: 处理数组到字符串等类型转换

## 验证规则

### 小程序端数据验证

```javascript
const miniappValidation = {
  // 基础字段验证
  title: {
    required: true,
    minLength: 1,
    maxLength: 200
  },
  author: {
    required: true,
    minLength: 1,
    maxLength: 100
  },

  // 状态字段验证
  status: {
    enum: ['active', 'inactive'],
    default: 'active'
  },

  // 数值字段验证
  likes: {
    type: 'number',
    min: 0,
    default: 0
  },
  usageCount: {
    type: 'number',
    min: 0,
    default: 0
  },

  // 标签字段验证
  tags: {
    type: 'array',
    enum: ['推理', '娱乐'],
    maxLength: 2
  },

  // 图片字段验证
  images: {
    type: 'array',
    maxLength: 3
  }
}
```

### 数据转换规则

```javascript
const dataTransformRules = {
  // 标签数组转字符串
  tagsToTag: (tags) => {
    if (Array.isArray(tags) && tags.length > 0) {
      return tags[0]; // 取第一个标签
    }
    return '推理'; // 默认标签
  },

  // ID字段标准化
  normalizeId: (script) => {
    script.id = script._id || script.id;
    delete script._id;
    return script;
  },

  // 图片字段标准化
  normalizeImages: (script) => {
    script.images = resolveImages(script);
    return script;
  }
}
```

## 性能优化

### 云函数查询优化

1. **字段投影**: 只查询小程序端需要的字段
2. **索引使用**: 利用createTime降序索引
3. **分页限制**: 限制每次查询的数量

### 前端缓存策略

1. **列表数据缓存**: 对剧本列表数据进行本地缓存
2. **详情数据缓存**: 对剧本详情进行页面级缓存
3. **增量更新**: 支持数据增量刷新而非全量加载

## 兼容性处理

### 旧数据兼容

1. **缺失字段处理**: 为不存在的字段提供默认值
2. **字段格式转换**: 处理不同格式的数据字段
3. **渐进式迁移**: 支持新旧数据格式的混合使用

### 版本兼容

1. **API版本控制**: 云函数支持版本化调用
2. **数据版本标识**: 在数据中标识版本信息
3. **降级处理**: 当新版本功能不可用时提供降级方案

## 测试数据示例

### 完整数据示例

```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "经典狼人杀剧本",
  "author": "官方出品",
  "description": "经典的狼人杀游戏剧本，适合新手入门",
  "status": "active",
  "tags": ["推理"],
  "tag": "推理",
  "category": "桌游",
  "usageCount": 1250,
  "likes": 156,
  "createTime": "2024-01-12T10:00:00Z",
  "updateTime": "2024-01-15T08:30:00Z",
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  "fileUrl": "https://example.com/script.json",
  "version": "1.0.0"
}
```

### 最小数据示例 (兼容旧数据)

```json
{
  "id": "507f1f77bcf86cd799439012",
  "title": "简单剧本",
  "author": "测试作者",
  "createdAt": "2024-01-10T10:00:00Z",
  "likes": 10
}
```

通过这种设计，小程序端能够完全兼容管理端的数据结构，同时保持良好的用户体验和性能表现。