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

## Parsing Progress Bar Implementation (新增)

- Chosen approach: 前端Web Worker + 主线程状态同步
  - 使用 Web Worker 在后台线程处理JSON文件解析，避免阻塞主UI线程
  - 主线程负责进度条更新和用户交互响应
  - 通过 postMessage 实现 Worker 与主线程的进度状态同步

- Rationale: Web Worker 方案提供最佳用户体验
  - 解析大量JSON文件时不会导致页面冻结或无响应
  - 进度条可以实时更新，显示具体文件名和解析进度
  - 内存管理更可控，可以及时清理已解析的文件数据
  - Alternatives considered: 主线程解析（会导致UI阻塞，不适合大批量文件）

- UX Design decisions:
  - 进度条显示：总体进度百分比 + 当前处理文件名 + 已处理/总数统计
  - 状态反馈：解析中/成功/失败 三种状态用不同颜色区分
  - 错误处理：解析失败的文件单独展示，允许用户查看具体错误信息
  - 取消功能：提供取消按钮允许用户中断解析过程

- Performance considerations:
  - 单文件解析超时：30秒超时限制，避免单个大文件阻塞整个流程
  - 内存监控：定期检查内存使用，超过阈值时触发垃圾回收
  - 并发控制：默认同时解析3个文件，可配置调整

## JSON Format Analysis (新增)

- Clocktower script format identified:
  - Structure: Array with first element being `_meta` object, followed by role objects
  - Meta fields: `name`, `author`, `description`, `logo`, `id: "_meta"`
  - Role fields: `name`, `ability`, `team`, `firstNight`, `otherNight`, `image`, etc.

- Extraction rules:
  - Title: `_meta.name` 或 fallback 到 filename
  - Author: `_meta.author`
  - Description: `_meta.description`
  - Logo: `_meta.logo`
  - Roles count: array length - 1 (excluding meta)

- Validation rules:
  - Must be valid JSON array
  - First element must have `id: "_meta"`
  - Must contain at least one role object
  - Required meta fields: name, author

## Folder selection & recursion (补充)

- Chosen approach:
  - H5: 首选 `input[type=file][webkitdirectory]`（若浏览器支持）或 `showDirectoryPicker()`（更现代的 API）来选择目录并递归读取目录下文件，保留相对路径用于 manifest；若不支持则回退到多文件选择或 zip 上传。
  - App (原生): 使用 `uni.chooseFile` / 原生文件系统接口递归读取目录并返回文件列表（包含相对路径或 tempPath）。

- Manifest format recommendation:
  - 每项包含：`fileName`, `relativePath`, `content`（或 `tempPath`）, `extractedMeta`。后端使用 `relativePath` 写入 `sourceFileName` 以便追溯原始相对路径。

- Security & limitations:
  - 浏览器目录选择受限，需用户授权；小程序不保证支持文件夹选择。
  - 对大数量文件建议转为异步后端处理（worker），避免云函数超时。



