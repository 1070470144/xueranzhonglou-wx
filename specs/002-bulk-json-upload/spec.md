# Feature Specification: 批量 JSON 上传（列表界面）

**Feature Branch**: `002-bulk-json-upload`  
**Created**: 2026-01-14  
**Status**: Draft  
**Input**: User description: "在列表界面新增批量上传功能，输入是一个文件夹，递归循环内部所有的json上传"

**文档语言**: 本规范与其衍生文档须使用中文编写。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 批量选择文件夹并上传（Priority: P1）

普通管理员在剧本列表页需要一次性导入多个本地 JSON 文件。用户从列表页点击“批量上传”，选择一个本地文件夹，系统递归读取该文件夹内所有 `.json` 文件并对每个文件执行上传与创建流程。

**Why this priority**: 极大提高脚本导入效率，适用于需迁移/导入大量剧本的场景，为主要需求。

**Independent Test**: 手动在 H5（或 App）端选择一个包含 10 个 JSON 文件的目录，启动上传；验证所有文件被处理且在列表页出现对应记录或有明确错误报告。

**Acceptance Scenarios**:
1. Given 管理员在列表页，When 点击“批量上传”并选择包含多个 JSON 的文件夹，Then 系统显示待上传文件清单并开始上传（或按用户确认后上传）。
2. Given 某个 JSON 文件格式不合法，When 上传进行中，Then 系统为该文件显示错误并继续处理其他文件，最终在完成摘要中列出失败项与成功项。
3. Given 上传包含与现有剧本重复（同 title 或 fileId），When 上传发生冲突，Then 系统根据“冲突策略”（见假设/Clarification）执行跳过或覆盖，并在摘要中体现处理结果。
4. Given 文件非常多（例如 >500），When 上传进行，Then 系统显示进度条并分批/异步处理以避免界面阻塞。

---

### User Story 2 - 上传映射与预览（Priority: P2）

管理员在上传前可以看到每个 JSON 的预览（元信息如 title/author/简述），并可选择对单个或全部文件指定标签/状态（例如默认标签、是否激活）。

**Why this priority**: 提高导入质量与可控性，防止错误数据直接入库。

**Independent Test**: 选择文件夹后，在上传确认页面检查预览信息并修改某项元数据，上传后对应记录反映修改。

**Acceptance Scenarios**:
1. Given 上传列表，When 点击某文件预览，Then 弹出 JSON 摘要（title/author/description）供用户确认。
2. Given 用户为全部文件设置标签“娱乐”，When 上传完成，Then 新建记录全部包含该标签（除非 JSON 明确覆盖）。

---

### Edge Cases

- 文件夹中包含非 JSON 文件：系统应忽略非 `.json` 文件并在摘要中告知被忽略的文件数与类型。  
- JSON 数量极大或单个文件过大：系统应限制单次最大文件数量（见假设）或提示分批上传。  
- 权限问题导致无法访问本地文件系统（浏览器安全/小程序限制）：应提示用户使用支持的平台或提供替代上载方式。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 在剧本列表页新增“批量上传”入口，点击后弹出上传面板/模态窗口。  
- **FR-002**: 系统 MUST 允许用户选择一个本地文件夹作为输入（在平台支持的情况下）。若平台不支持文件夹选择，提供多文件选择或压缩包上传的替代方案。 **[NEEDS CLARIFICATION: 平台支持范围见 Q1]**  
- **FR-003**: 系统 MUST 递归遍历所选文件夹，识别所有后缀为 `.json` 的文件并列出为待上传项。  
- **FR-004**: 用户在上传前可以对每个待上传项查看并编辑映射字段（title、author、tag、usageCount、likes、description），或使用默认映射策略（优先使用 JSON 内 meta 字段，否则将整个 JSON 存为 content）。 **[NEEDS CLARIFICATION: JSON 到字段的映射策略见 Q2]**  
- **FR-005**: 对于每个 JSON 文件，系统 MUST 发起与单文件上传相同的创建逻辑（包含 content、images、tags 等），并在上传完成后返回成功/失败状态与错误信息（若有）。  
- **FR-006**: 系统 MUST 支持并行/分批上传以避免单次阻塞（前端显示总体进度与当前速率）。  
- **FR-007**: 上传过程中遇到重复检测（例如根据 title 或 fileId 判定为重复）时，系统应根据冲突处理策略执行跳过/覆盖/重命名，并在摘要中列出冲突详情。 **[NEEDS CLARIFICATION: 冲突策略见 Q3]**  
- **FR-008**: 上传完成后，系统应在列表页显示成功导入的记录，并提供“查看失败详情”链接供用户导出失败文件列表与错误原因（CSV 或 JSON）。  
- **FR-009**: 系统日志需记录批量上传作业 ID、启动用户、文件计数、成功数、失败数、处理时间用于审计与排错。

### Key Entities

- **BulkUploadJob**: 表示一次批量上传会话。属性（示例）: jobId, userId, startTime, endTime, totalFiles, successCount, failCount, status, errorSummary。  
- **UploadedScript**: 继承现有 Script 实体，新增来源字段 sourceJobId 与 sourceFileName（记录原始文件名）。  
- **FileMeta**: 临时内存结构：filePath, fileName, jsonContent, extractedMeta (title/author/description), status, error.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户在支持的平台上能够从列表页完成一次批量上传（>=10 个 JSON 文件）并在 3 分钟内完成处理（包含并行/分批处理及网络延迟）。  
- **SC-002**: 在成功上传样本（100 个文件）中，至少 95% 的文件应成功创建为剧本或在摘要中明确失败原因（无模糊错误）。  
- **SC-003**: 上传失败项可导出，且导出的错误条目包含文件名与具体错误信息（可用于后续修复）。  
- **SC-004**: 系统在上传结束后在列表页显示由该作业创建的所有新记录，并将 `UploadedScript.sourceJobId` 与 `sourceFileName` 可追溯。

## Assumptions

- 假设大部分用户会在能支持文件夹选择的平台（例如桌面 H5 或原生 App）上使用此功能；若浏览器不允许文件夹选择，将回退到多文件选择或压缩包上传。  
- 假设单次批量上传的最大推荐文件数为 500（可配置），超过时建议分批上传以减少失败影响。  
- 默认映射规则：优先从 JSON 中的常见 meta 字段（title/author/description）提取元数据，若不存在则将整个 JSON 存入 `content` 字段并填写最小元信息（title 使用文件名）。

## Open Questions / NEEDS CLARIFICATION (最多 3)

1. Q1 - 平台支持范围：请确认该功能是否必须在所有平台（H5、微信小程序、App）均可用，还是只需支持桌面 H5 与原生 App（因为文件夹选择在某些平台受限）。  
2. Q2 - JSON 到系统字段的映射：当 JSON 包含复杂结构时，是否采用“自动提取 meta 字段并保存 content”为默认策略，还是需要一个可视化映射界面让用户手动映射字段（影响实施复杂度）？  
3. Q3 - 冲突处理策略：当检测到与现有记录冲突（例如 same title 或相同 fileId），默认应选择哪种策略：A) 跳过并记录失败；B) 覆盖现有记录；C) 创建新记录并重命名（添加后缀）；还是由用户在上传前选择策略？

## Test Scenarios (manual)

1. 基础导入：准备包含 10 个合法 JSON 的文件夹 → 列表页 → 批量上传 → 观察进度 → 验证 10 个剧本出现在列表页且数据与 JSON 对应。  
2. 部分错误：夹中包含 8 个合法、2 个非法 JSON → 上传 → 验证 8 个成功、2 个失败，失败详情可下载且错误描述清晰。  
3. 冲突处理：准备包含与现有剧本同名的 JSON，选择不同冲突策略 → 执行上传 → 验证行为符合所选策略。  
4. 大量导入与性能：准备 200 个 JSON 文件 → 批量上传 → 验证系统分批处理且前端显示合理进度，不阻塞主线程或界面。

## Readiness

当上面的三个 Clarification（Q1-Q3）至少部分回应并同意默认假设时，规范可进入计划阶段（/speckit.plan）。

---

**Spec author**: automated assistant


