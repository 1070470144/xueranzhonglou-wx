# research.md — 批量 JSON 上传（列表界面）

## Decision: 平台支持范围（Q1）

- Chosen: 首要支持桌面 H5 与原生原生 App（iOS/Android）对“文件夹选择”及递归读取的体验；对受限平台（如微信小程序或受限浏览器）提供降级方案（多文件选择或压缩包上传）。  
- Rationale: 浏览器及小程序在安全限制下通常不允许直接读取任意本地文件夹。为覆盖主要用户场景（桌面管理后台与移动原生 App 管理端），优先实现桌面 H5 / 原生 App 的最优体验，并提供降级替代以保证功能可用性。  
- Alternatives considered: 强制仅允许单文件上传（太慢），或仅支持压缩包（增加用户步骤）。选择支持文件夹+降级更平衡 UX 与实现成本。

## Decision: JSON→字段映射策略（Q2）

- Chosen: 默认自动提取常见 meta 字段（title/author/description/tags/usageCount/likes）；对于其余复杂或自定义字段，将原始 JSON 放入 `content` 字段。提供上传前预览页面，允许用户对每个文件的提取字段做局部编辑（但不实现复杂的可视化字段映射编辑器作为首发功能）。  
- Rationale: 自动提取覆盖大多数常规 JSON，减少用户操作；预览+编辑能在出问题时进行修正，且实施复杂度远低于通用映射器。
- Alternatives considered: 一次性实现可视化映射界面——付出高开发成本且稀有场景受益小，故延后。

## Decision: 冲突处理策略（Q3）

- Chosen: 默认策略为“跳过并记录冲突”（Skip），并在上传确认面板中提供用户可选策略：A) 跳过（默认）、B) 覆盖、C) 新建并重命名（添加后缀）。用户可对整批选择统一策略，或对单个文件在预览中逐条指定。  
- Rationale: 默认跳过最安全，避免意外覆盖；同时允许用户显式选择覆盖/重命名以满足批量更新场景。

## Implementation notes / constraints

- 为避免浏览器安全限制，H5 实现依赖浏览器是否支持目录选择 API；若不支持，前端会建议用户上传 zip 文件或使用 App 客户端。  
- 性能：前端应采用分批与并发限制（例如每批 5-10 个并发请求）以避免同时发起过多请求影响网络或后端。后端应把批量作业以异步任务（job）方式处理并返回 jobId，前端通过轮询/WS 订阅获取进度。  
- 审计：创建 `BulkUploadJob` 记录，包含 jobId 与统计信息，便于回溯与导出失败列表。

## Metadata Extraction Optimization (优化)

- Chosen approach: 多策略自适应提取算法
  - 优先识别标准 Clocktower 格式（_meta + 角色数组）
  - 支持常见 JSON 结构变体和自定义格式
  - 实现字段别名映射和类型推断
  - 提供提取准确性统计和错误诊断

- Rationale: 自适应算法提供最佳兼容性
  - 支持多种 JSON 格式自动识别，无需用户手动配置
  - 提高元数据提取准确率，减少人工修正需求
  - 保持向后兼容，不影响现有上传流程
  - Alternatives considered: 固定格式解析（兼容性差）、可视化映射器（复杂度高）

- Extraction Algorithm decisions:
  - 多级策略：标准格式 → 启发式识别 → 文件名回退
  - 字段映射：支持 title/name、author/creator、description/summary 等别名
  - 类型检测：自动识别字符串、数字、布尔值字段
  - 验证机制：提取结果完整性检查和置信度评分

- Performance considerations:
  - 单文件提取超时：10秒限制，避免阻塞批量处理
  - 内存优化：及时清理临时解析结果
  - 并发处理：保持现有分批上传机制

## JSON Format Compatibility Enhancement (优化)

- Extended format support:
  - Clocktower标准格式：`_meta`对象 + 角色数组
  - 简化格式：直接包含 title/author/description 的对象
  - 嵌套格式：metadata 在子对象中的结构
  - 数组格式：多个剧本信息在数组中的结构

- Enhanced extraction rules:
  - Title: `_meta.name` → `title` → `name` → filename (优先级递减)
  - Author: `_meta.author` → `author` → `creator` → "未知作者"
  - Description: `_meta.description` → `description` → `summary` → 自动生成
  - Tags: 默认添加"娱乐"标签，支持从JSON中提取其他标签

- Validation and defaults:
  - 激活状态：新上传剧本默认设置为激活状态
  - 标签设置：自动添加"娱乐"分类标签
  - 完整性检查：确保必要字段都有合理默认值

## Folder selection & recursion (补充)

- Chosen approach:
  - H5: 首选 `input[type=file][webkitdirectory]`（若浏览器支持）或 `showDirectoryPicker()`（更现代的 API）来选择目录并递归读取目录下文件，保留相对路径用于 manifest；若不支持则回退到多文件选择或 zip 上传。
  - App (原生): 使用 `uni.chooseFile` / 原生文件系统接口递归读取目录并返回文件列表（包含相对路径或 tempPath）。

- Manifest format recommendation:
  - 每项包含：`fileName`, `relativePath`, `content`（或 `tempPath`）, `extractedMeta`。后端使用 `relativePath` 写入 `sourceFileName` 以便追溯原始相对路径。

- Security & limitations:
  - 浏览器目录选择受限，需用户授权；小程序不保证支持文件夹选择。
  - 对大数量文件建议转为异步后端处理（worker），避免云函数超时。



