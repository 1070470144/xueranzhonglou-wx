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
- `tag`: 标签 (枚举: 推理/娱乐，单值)
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
  tag: true,
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
  tag: true,
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

## JSON复制功能技术分析

### 现有实现分析

**getScriptJson云函数现状**:
- 云函数已存在 (`xueran/uniCloud-aliyun/cloudfunctions/getScriptJson/index.js`)
- 支持获取剧本的content字段并解析为JSON
- 已支持download=true参数返回HTML格式的JSON显示
- 有完整的CORS处理和错误处理
- 支持多种触发器传参形式

**前端复制按钮现状**:
- script-detail.vue页面已有"复制JSON地址"按钮
- 调用copyJsonUrl()方法，复制this.script.jsonUrl到剪贴板
- jsonUrl来自于后端返回的fileUrl字段

### 功能需求分析

**核心功能**:
- 完善现有的"复制JSON地址"按钮功能
- 点击后生成包含完整剧本数据的JSON格式链接
- 链接格式为 `.json` 后缀，可在浏览器直接打开查看
- 保持现有的UI和交互方式

**用户场景**:
- 开发者需要查看剧本的完整数据结构用于调试
- 高级用户需要导出剧本数据进行分析
- 支持数据共享和备份需求

### 技术实现方案评估

#### 方案1: 修改现有getScriptJson云函数
**实现方式**:
- 修改现有getScriptJson云函数，增加生成浏览器直接访问URL的功能
- 云函数返回一个data:application/json格式的URL
- 前端复制这个URL到剪贴板

**优势**:
- 充分利用现有云函数，无需新增
- 保持架构的一致性
- 减少代码重复

**劣势**:
- 需要修改现有云函数逻辑
- 需要确保向后兼容性

**技术可行性**: 高

#### 方案2: 前端直接生成JSON链接
**实现方式**:
- 前端调用现有getScriptJson获取数据
- 使用 `data:text/json` 生成可下载链接
- 直接复制到剪贴板

**优势**:
- 修改量小，只需修改前端
- 响应速度快
- 无需修改后端

**劣势**:
- 数据传输到前端后生成链接，存在安全风险
- 不符合云对象优先的架构原则
- 无法利用后端的格式化处理

**技术可行性**: 高

### 推荐方案选择

**Decision**: 采用方案1（修改现有getScriptJson云函数）

**Rationale**:
- 充分利用现有云函数，避免重复建设
- 符合项目宪章的云对象优先原则
- 保持后端数据处理的优势
- 确保数据安全性和一致性

**Alternatives considered**:
- 方案2（前端生成）被拒绝，因为存在数据安全风险和不符合云对象优先的架构原则

## 使用次数统计技术分析

### 功能需求分析

**核心功能**:
- 在每次成功复制JSON时，自动增加剧本的使用次数
- 同步更新后台数据库中的统计数据
- 确保计数准确性和并发安全性

**用户场景**:
- 剧本作者查看剧本使用情况和受欢迎程度
- 管理员分析用户行为和剧本热度
- 为推荐算法提供数据支持

### 技术实现方案评估

#### 方案1: 在getScriptJson云函数中集成统计
**实现方式**:
- 在getScriptJson云函数成功生成JSON后，调用数据库更新usageCount
- 使用原子操作确保计数准确性
- 返回更新后的使用次数给前端

**优势**:
- 操作原子性，保证数据一致性
- 减少网络请求，前后端集成良好
- 错误处理集中化

**劣势**:
- 增加云函数复杂度
- JSON生成和统计更新耦合

**技术可行性**: 高

#### 方案2: 独立的使用次数统计云函数
**实现方式**:
- 新增incrementUsage云函数专门处理统计
- 前端在复制JSON成功后调用统计函数
- 两个独立的操作，可重试和错误处理

**优势**:
- 职责分离，代码更清晰
- 统计功能可重用
- 失败时不影响主要功能

**劣势**:
- 需要额外网络请求
- 可能存在并发问题

**技术可行性**: 高

### 推荐方案选择

**Decision**: 采用方案1（在getScriptJson中集成统计）

**Rationale**:
- 减少网络请求，提升用户体验
- 保证操作的原子性，避免并发问题
- 简化前端逻辑，集中错误处理
- 符合单一职责原则的扩展

**Alternatives considered**:
- 方案2（独立统计函数）被拒绝，因为会增加网络开销和复杂性

### 并发处理策略

**数据库原子操作**:
```javascript
// 使用uniCloud数据库的原子操作
await db.collection('scripts').doc(scriptId).update({
  usageCount: db.command.inc(1),  // 原子递增
  updateTime: new Date()
});
```

**乐观锁机制**:
- 读取当前usageCount
- 递增后更新，检查是否被其他操作修改
- 如有冲突则重试

**最终选择**: 数据库原子操作，性能更好且保证一致性

### 详细技术设计

#### 云函数修改方案 (getScriptJson)

**现有云函数分析**:
- 已支持获取剧本content字段并解析为JSON
- 已支持download=true参数返回HTML格式显示
- 有完整的参数解析和错误处理

**需要增加的功能**:
- 新增link=true参数，返回浏览器可直接访问的data:application/json URL
- 保持现有download=true功能的向后兼容性
- 优化JSON格式化输出

**修改后的输入参数**:
```javascript
{
  scriptId: "string", // 剧本ID，必填
  link: "boolean", // 是否返回data URL链接，默认为false
  format: "json|pretty", // 输出格式，默认json（当link=true时有效）
  download: "boolean" // 保持向后兼容，返回HTML格式显示
}
```

**输出格式**:
- Content-Type: application/json
- 支持JSON格式化和压缩
- 包含完整的剧本数据结构

**安全考虑**:
- 验证用户权限
- 记录访问日志
- 支持数据脱敏（如移除敏感字段）

#### 前端实现设计

**按钮交互优化**:
- 利用现有的"复制JSON地址"按钮（UI已存在）
- 修改copyJsonUrl()方法，调用getScriptJson云函数生成data URL
- 自动复制生成的data URL到剪贴板
- 显示成功提示

**链接格式**:
```
data:application/json;charset=utf-8;base64,eyJ0aXRsZSI6I...完整JSON数据...
```

**兼容性处理**:
- 保持现有按钮的UI和交互方式
- 处理剪贴板API兼容性问题
- 提供降级方案（显示链接让用户手动复制）
- 处理网络异常情况

### 实施风险评估

#### 低风险项目
- 云函数实现 (遵循现有模式)
- 前端按钮添加 (UI改动小)
- 链接生成逻辑 (标准URL构造)

#### 中等风险项目
- 剪贴板API兼容性 (需要处理不同浏览器)
- CORS配置 (小程序环境可能有限制)

#### 实施建议

1. **分阶段实施**:
   - 第一阶段：实现基础云函数和前端按钮
   - 第二阶段：添加格式化和安全功能
   - 第三阶段：兼容性测试和优化

2. **测试策略**:
   - 功能测试：验证链接生成和JSON输出
   - 兼容性测试：不同浏览器和小程序环境
   - 安全测试：验证数据访问控制

3. **监控和日志**:
   - 记录JSON导出操作日志
   - 监控异常访问和错误率
   - 提供使用统计信息