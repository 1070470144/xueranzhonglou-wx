# 小程序端字段验证和映射文档

**创建时间**: 2026-01-15
**更新时间**: 2026-01-15
**功能**: 003-miniapp-data-sync

## 概述

本文档定义了小程序端数据字段的验证规则、映射逻辑和兼容性处理策略，确保小程序端与管理端数据结构的一致性和可靠性。

## 字段验证规则

### 核心必填字段

| 字段名 | 类型 | 验证规则 | 默认值 | 说明 |
|--------|------|----------|--------|------|
| `id` | String | 非空，UUID格式 | - | 系统自动生成，删除`_id`字段 |
| `title` | String | 1-200字符，非空 | "未命名剧本" | 剧本标题 |
| `author` | String | 1-100字符，非空 | "未知作者" | 剧本作者 |

### 可选字段

| 字段名 | 类型 | 验证规则 | 默认值 | 说明 |
|--------|------|----------|--------|------|
| `status` | String | 枚举: active/inactive/published/draft/archived | "active" | 剧本状态 |
| `description` | String | 0-1000字符 | "" | 剧本描述 |
| `content` | String | JSON字符串 | "" | 剧本内容 |
| `version` | String | 语义化版本 | "1.0.0" | 版本号 |
| `tag` | String | 单个标签，1-20字符 | null | 标签 |
| `category` | String | 1-100字符 | "" | 分类 |

### 数值字段

| 字段名 | 类型 | 验证规则 | 默认值 | 说明 |
|--------|------|----------|--------|------|
| `likes` | Number | >=0 | 0 | 点赞数 |
| `usageCount` | Number | >=0 | 0 | 使用次数 |
| `fileSize` | Number | >=0 | 0 | 文件大小(字节) |

### 时间字段

| 字段名 | 类型 | 验证规则 | 默认值 | 说明 |
|--------|------|----------|--------|------|
| `createTime` | Date | 有效日期 | 当前时间 | 创建时间 |
| `updateTime` | Date | 有效日期 | createTime | 更新时间 |

### 媒体字段

| 字段名 | 类型 | 验证规则 | 默认值 | 说明 |
|--------|------|----------|--------|------|
| `images` | Array<String> | 最多3个有效URL | [] | 图片URL数组 |
| `thumbnails` | Array<String> | 最多3个有效URL | [] | 缩略图URL数组 |
| `thumbnail` | String | 有效URL | "" | 单个缩略图URL |

## 字段映射逻辑

### 数组到字符串转换

```javascript
// 标签字段映射：兼容旧数据（接受 tags 数组或 tag 字符串）
function mapTagsToString(tagOrTags) {
  if (!tagOrTags) return '推理';
  if (typeof tagOrTags === 'string') return tagOrTags;
  if (Array.isArray(tagOrTags) && tagOrTags.length > 0) return tagOrTags[0];
  return '推理';
}
```

### 图片字段优先级

```javascript
// 图片字段处理优先级
function resolveImages(script) {
  // 优先使用 thumbnails (管理端标准)
  if (Array.isArray(script.thumbnails) && script.thumbnails.length) {
    return script.thumbnails.slice(0, 3);
  }

  // 降级到 thumbnail (单个图片)
  if (script.thumbnail) {
    return [script.thumbnail];
  }

  // 最后使用 images 数组
  if (Array.isArray(script.images)) {
    return script.images.slice(0, 3);
  }

  return [];
}
```

### 时间字段标准化

```javascript
// 时间字段验证和标准化
function normalizeDate(dateValue) {
  if (!dateValue) return new Date();

  if (dateValue instanceof Date) return dateValue;

  try {
    return new Date(dateValue);
  } catch (e) {
    console.warn('Invalid date value:', dateValue);
    return new Date();
  }
}
```

## 数据一致性检查

### 前端验证规则

```javascript
const frontendValidation = {
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
  tag: {
    type: 'string',
    enum: ['推理', '娱乐']
  },

  // 图片字段验证
  images: {
    type: 'array',
    maxLength: 3
  }
};
```

### 后端验证规则

```javascript
const backendValidation = {
  // 云函数数据验证逻辑
  validateScriptData: (script) => {
    const errors = [];

    // ID验证
    if (!script.id && !script._id) {
      errors.push('Missing id field');
    }

    // 标题验证
    if (!script.title || typeof script.title !== 'string') {
      errors.push('Invalid title field');
    }

    // 状态验证
    const validStatuses = ['active', 'inactive', 'published', 'draft', 'archived'];
    if (script.status && !validStatuses.includes(script.status)) {
      errors.push('Invalid status value');
    }

    return errors;
  }
};
```

## 向后兼容性处理

### 缺失字段默认值策略

1. **安全默认值**: 为所有可选字段提供合理的默认值
2. **渐进式升级**: 允许旧数据和新数据混合存在
3. **错误恢复**: 单条数据验证失败不影响其他数据处理

### 数据迁移考虑

1. **字段重命名**: 通过映射逻辑处理字段名变更
2. **类型转换**: 自动转换兼容的数据类型
3. **数据清理**: 过滤无效或恶意数据

## 错误处理和日志记录

### 验证错误处理

```javascript
// 云函数错误处理
try {
  const validatedData = validateAndNormalizeScript(rawData);
  return { code: 0, data: [validatedData] };
} catch (validationError) {
  console.error('Script validation failed:', validationError);
  return { code: -1, errMsg: 'Data validation failed' };
}
```

### 前端错误处理

```javascript
// 前端数据处理错误处理
try {
  const processedData = processScriptData(rawData);
  this.scripts.push(processedData);
} catch (processError) {
  console.error('Script processing failed:', processError);
  // 跳过该条数据，继续处理其他数据
}
```

## 测试验证

### 字段验证测试用例

```javascript
// 测试数据验证
const testCases = [
  {
    name: 'Valid script data',
    data: { id: '123', title: 'Test', author: 'Author', status: 'active' },
    expected: true
  },
  {
    name: 'Missing title',
    data: { id: '123', author: 'Author' },
    expected: false
  },
  {
    name: 'Invalid status',
    data: { id: '123', title: 'Test', author: 'Author', status: 'invalid' },
    expected: false
  }
];
```

### 映射逻辑测试用例

```javascript
// 测试字段映射
const mappingTests = [
  {
    name: 'Tag string passthrough',
    input: { tag: '推理' },
    expected: '推理'
  },
  {
    name: 'Tags array compatibility',
    input: { tags: ['推理', '娱乐'] },
    expected: '推理'
  },
  {
    name: 'Image priority resolution',
    input: { thumbnails: ['thumb1.jpg'], images: ['img1.jpg'] },
    expected: ['thumb1.jpg']
  }
];
```

## 维护和更新

### 字段变更流程

1. **评估影响**: 确定字段变更对现有数据的影响
2. **更新验证规则**: 修改相应的验证逻辑
3. **更新映射逻辑**: 调整字段映射规则
4. **测试验证**: 确保变更不会破坏现有功能
5. **文档更新**: 更新本文档和相关文档

### 监控和告警

1. **错误率监控**: 监控数据验证失败率
2. **性能监控**: 监控字段处理性能
3. **数据质量监控**: 监控数据完整性指标

---

本文档由 `/speckit.tasks` 命令生成，用于指导字段验证和数据一致性实现。