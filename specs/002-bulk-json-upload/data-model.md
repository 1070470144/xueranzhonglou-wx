# Data Model: 批量 JSON 上传（列表界面）

## 核心实体

### BulkUploadJob
表示一次批量上传作业。

字段（示例）:
- `jobId` (String) 必需 — 作业唯一标识  
- `userId` (String) 必需 — 启动作业的用户ID  
- `startTime` (Date) 必需  
- `endTime` (Date) 可选  
- `totalFiles` (Number) 必需  
- `successCount` (Number) 必需  
- `failCount` (Number) 必需  
- `status` (String) 必需 — 枚举: `pending`, `running`, `completed`, `failed`  
- `errorSummary` (Object) 可选 — 失败统计或示例错误  
- `createdAt` / `updatedAt` (Date)

索引与查询:
- 按 `userId` 和 `status` 查询作业；按 `createdAt` 排序以展示历史。

### UploadedScript (扩展现有 Script)
在创建 Script 时记录来源信息以便追溯。

额外字段:
- `sourceJobId` (String) 可选 — 关联的 BulkUploadJob.jobId  
- `sourceFileName` (String) 可选 — 原始相对路径或文件名

### FileMeta (临时/内存结构)
用于前端/后端在处理批量文件时的中间表示。

字段:
- `fileName` (String)
- `relativePath` (String) 可选 — 相对路径以便追溯目录结构
- `fileSize` (Number) 可选 — 文件大小（字节），用于进度估算
- `content` (String) — JSON 文本或摘要
- `extractedMeta` (Object) — `{ title, author, description, tags, usageCount, likes, rolesCount }`
- `status` (String) — `pending` / `parsing` / `parsed` / `failed`
- `parseProgress` (Number) 可选 — 解析进度百分比 (0-100)
- `error` (String) 可选 — 解析或验证错误信息
- `parsedAt` (Date) 可选 — 解析完成时间戳

### ParsingProgress (前端状态管理)
用于前端展示解析进度条的状态管理。

字段:
- `totalFiles` (Number) — 总文件数
- `parsedFiles` (Number) — 已解析文件数
- `currentFile` (String) — 当前正在解析的文件名
- `overallProgress` (Number) — 总体进度百分比 (0-100)
- `status` (String) — `idle` / `parsing` / `completed` / `cancelled`
- `errors` (Array) — 解析失败的文件列表 `[{fileName, error}]`

## 验证规则

- 每个 JSON 文件必须能被解析为合法 JSON；否则标记为失败并在 job 的失败列表中记录错误信息。  
- `title`: 若提取到则必须为 1-200 字符；若缺失则使用文件名作为 title。  
- `author`: 若存在则为 1-100 字符；若缺失可以填充为 `unknown`（或由用户在预览时填写）。  
- `tags`: 若存在则至多 2 个，且值需在允许枚举内（例如 `推理`、`娱乐`）。

## 迁移/兼容策略

- 对旧脚本记录需保持字段兼容：在迁移时将原有文件关联信息映射到 `sourceFileName`。  
- 若数据库 schema 变更，提供增量迁移脚本以为历史记录填充 `sourceJobId`/`sourceFileName`（可选）。

# data-model.md — 批量 JSON 上传（列表界面）

## Entities

1. BulkUploadJob  
   - 描述：一次批量上传作业的元数据与状态追踪  
   - 字段（示例，不含实现细节）：  
     - jobId: 唯一标识（字符串）  
     - userId: 发起上传的用户标识  
     - startTime / endTime: 时间戳  
     - totalFiles: 提交处理的文件总数  
     - successCount / failCount: 成功/失败数量统计  
     - status: pending / running / completed / failed  
     - errorSummary: 简要失败统计或第一条错误信息  
     - detailsLink: 用于下载失败明细或查看日志的引用

2. UploadedScript (extends existing Script entity)  
   - 描述：由批量上传创建的剧本记录，保留来源追溯信息  
   - 新增/衍生字段（示例）：  
     - sourceJobId: 关联 BulkUploadJob.jobId  
     - sourceFileName: 原始文件名（带路径或相对路径）  
     - importedAt: 导入时间戳

3. FileMeta (临时/内存结构)  
   - 描述：前端或后端处理队列中单个文件的临时元数据  
   - 字段示例： filePath, fileName, extractedMeta ({title,author,description,tags,usageCount,likes}), status, errorMessage

## Validation rules (from requirements)

- usageCount 与 likes 必须为非负整数（若存在）。  
- JSON 内容必须至少包含可解析为字符串/对象的 content，且在提取 meta 时应具备容错（若缺失字段则用文件名或默认值填充）。

## Notes

- BulkUploadJob 为审计与回溯关键表，建议保留足够日志与失败样本以便后续复现问题。  
- UploadedScript 应与现有 Script 实体兼容，仅增加可选的追溯字段，不应改变现有检索索引或影响列表页默认行为（除非按 jobId 过滤）。


