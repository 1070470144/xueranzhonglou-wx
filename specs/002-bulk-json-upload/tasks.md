---

description: "Task list for feature 002-bulk-json-upload — 批量 JSON 上传（管理端 H5-only）"
---

# Tasks: 批量 JSON 上传（H5 管理端）

**Input**: Design documents from `/specs/002-bulk-json-upload/`  
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件、无依赖关系）  
- **[Story]**: 用户故事标签（例如: [US1], [US2]）

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 项目初始化和基础结构准备（为所有用户故事提供支持）

- [ ] T001 Create database schema `xueran-admin/uniCloud-aliyun/database/schemas/bulkUploadJob.json` from `specs/002-bulk-json-upload/data-model.md`
- [ ] T002 [P] Verify or add API contract `specs/002-bulk-json-upload/contracts/bulk-upload-api.yaml` (ensure endpoints `/bulk/createJob`, `/bulk/getJob`, `/bulk/getJobErrors`)
- [ ] T003 [P] Ensure plan/research/data-model/quickstart files exist under `specs/002-bulk-json-upload/` and reference them in PR description
- [ ] T004 [P] Ensure front-end API wrapper `xueran-admin/utils/bulkUploadApi.js` exists and document its expected methods (`createJob`, `getJob`, `getJobErrors`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 核心后端与队列支持，必须在任何用户故事实现前完成

- [ ] T005 Audit existing `xueran-admin/uniCloud-aliyun/cloudfunctions/bulkUpload/index.js` and `processor.js`; produce `specs/002-bulk-json-upload/audit-report.md` listing repro steps and priority fixes
- [ ] T006 [P] Ensure `bulkUpload/index.js` returns standardized response `{ code, data: { jobId }, message }` and `getJob`/`getJobErrors` return agreed formats
- [ ] T007 [P] Add or verify `xueran-admin/uniCloud-aliyun/cloudfunctions/bulkUpload/processor.js` supports batch size config and retry policy (update code or create TODO for backend change)
- [ ] T008 Implement/verify server-side validation helpers `xueran-admin/uniCloud-aliyun/cloudfunctions/bulkUpload/validators.js` (JSON parse, meta extraction, size checks)
- [ ] T009 Add audit logging in cloud object `xueran-admin/uniCloud-aliyun/cloudfunctions/bulkUpload/logs.js` (record jobId, userId, counts)

---

## Phase 3: 用户故事 1 - 批量选择文件夹并上传 (Priority: P1)

**Goal**: 在剧本列表页实现批量上传入口，允许管理员选择本地文件夹（H5-only）或使用降级上传（多文件/zip），构建 manifest 并创建后台作业

**Independent Test**: 在 H5 浏览器中选择一个包含 10 个 JSON 的目录 → 点击开始上传 → 验证 10 个剧本最终出现在列表页或在失败详情中列出错误

### Manual Testing Procedures (REQUIRED)

- [ ] T010 [US1] Create manual test procedure `docs/test-procedures/us1-bulk-upload.md` describing selection, preview, start, progress, and failure export steps

### Implementation (optimize existing)

- [X] T011 [US1] PR A: Quick-fix `xueran-admin/pages/admin/scripts/components/BulkUploadPanel.vue` — fix directory selection fallback and ensure hidden input `click()` triggers across target browsers (file path)
- [X] T012 [US1] PR B: Ensure manifest builder in `BulkUploadPanel.vue` includes `relativePath`, stable `extractedMeta`, and content; update code at `xueran-admin/pages/admin/scripts/components/BulkUploadPanel.vue`
- [ ] T013 [US1] PR C: Backend contract stabilization — standardize `bulkUpload` cloud object responses in `xueran-admin/uniCloud-aliyun/cloudfunctions/bulkUpload/index.js` and implement `getJobErrors` format
- [ ] T014 [US1] PR D: Frontend batching & UX — add configurable concurrency and batch controls to `BulkUploadPanel.vue` and expose basic advanced settings in UI
- [ ] T015 [US1] Integrate enhanced `utils/bulkUploadApi.js` usage in `BulkUploadPanel.vue` to handle new response format and error handling
- [ ] T016 [US1] Verify job polling and failure export using `xueran-admin/utils/bulkUploadApi.js` and `BulkUploadPanel.vue`
 - [X] T014 [US1] PR D: Frontend batching & UX — add configurable concurrency and batch controls to `BulkUploadPanel.vue` and expose basic advanced settings in UI (partially: implemented showDirectoryPicker recursive handling)
 - [ ] T015 [US1] Integrate enhanced `utils/bulkUploadApi.js` usage in `BulkUploadPanel.vue` to handle new response format and error handling
 - [ ] T016 [US1] Verify job polling and failure export using `xueran-admin/utils/bulkUploadApi.js` and `BulkUploadPanel.vue`
 - [X] T014 [US1] PR D: Frontend batching & UX — add configurable concurrency and batch controls to `BulkUploadPanel.vue` and expose basic advanced settings in UI (partially: implemented showDirectoryPicker recursive handling and preview modal)
 - [X] T015 [US1] Integrate enhanced `utils/bulkUploadApi.js` usage in `BulkUploadPanel.vue` to handle new response format and error handling
 - [ ] T016 [US1] Verify job polling and failure export using `xueran-admin/utils/bulkUploadApi.js` and `BulkUploadPanel.vue`

---

## Phase 4: 用户故事 2 - 上传映射与预览 (Priority: P2)

**Goal**: 在上传前展示每个 JSON 的预览并允许对抽取的 meta 做本地编辑与批量设置冲突策略

**Independent Test**: 选择文件夹 → 在预览中修改某文件 title → 上传后该记录显示修改后的 title

### Implementation

- [ ] T017 [US2] Create preview modal component `xueran-admin/components/BulkUploadPreview.vue` (显示 parsed JSON meta，允许编辑并 mark skip/overwrite/newname)
- [ ] T018 [US2] Wire preview edits to manifest preparation in `BulkUploadPanel.vue` so `createJob` receives the final content/meta for each file
- [ ] T019 [US2] Add UI control for conflict strategy (全局选择：Skip/Overwrite/NewName) in `BulkUploadPanel.vue` and persist selection to job manifest
- [ ] T020 [US2] Implement metadata defaults: if JSON lacks title → use fileName; if author missing → set `unknown` or allow edit in preview
- [ ] T021 [US2] Add front-end validation for file size and allowed fields before submitting manifest (`BulkUploadPanel.vue`)

---

## Phase 5: 用户故事 3 - 大量文件与性能 (Priority: P3)

**Goal**: 优化并发、分批与后端处理，确保大量文件（>500）可稳定处理且界面不阻塞

- [ ] T022 [US3] Implement backend batch processing configuration in `xueran-admin/uniCloud-aliyun/cloudfunctions/bulkUpload/processor.js` (batch size, retry policy)
- [ ] T023 [US3] Add front-end batch UI hints and auto-split for very large selections in `xueran-admin/pages/admin/scripts/components/BulkUploadPanel.vue`
- [ ] T024 [US3] Add metrics and monitoring hooks in cloud object `xueran-admin/uniCloud-aliyun/cloudfunctions/bulkUpload/index.js` (processing time, per-file latency)
- [ ] T025 [US3] Add DB indexes for `bulkUploadJob` collection to support fast job queries `xueran-admin/uniCloud-aliyun/database/schemas/...`

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: 最终改进、日志与文档

- [ ] T026 [P] Add comprehensive logging for all bulk operations in cloud object and processor (`xueran-admin/uniCloud-aliyun/cloudfunctions/bulkUpload/logs.js`)
- [ ] T027 [P] Implement user-facing error messages and accessibility improvements in `xueran-admin/pages/admin/scripts/components/BulkUploadPanel.vue`
- [ ] T028 [P] Ensure `docs/test-procedures/us1-bulk-upload.md` and `docs/test-procedures/us2-bulk-upload-preview.md` exist and are up-to-date
- [ ] T029 [P] Update `README.md` and `specs/002-bulk-json-upload/quickstart.md` to reflect H5-only management platform and usage notes
- [ ] T030 [P] Run manual end-to-end test and mark acceptance in `specs/002-bulk-json-upload/plan.md`

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: 无依赖，可以并行完成某些任务（T002/T003/T004）  
- **Foundational (Phase 2)**: 依赖 Setup 完成；阻塞用户故事实现（T005 - T009 必须完成）  
- **用户故事 (Phase 3+)**: 在 Foundational 完成后可以并行实现，但同一文件的修改需顺序执行  

## Parallel opportunities

- 前端组件不同子模块（preview, manifest builder, polling）可并行开发（标记为 [P] 的任务）  
- 后端 validator、logger、processor 可并行实现（T006/T008/T009 标记为并行）

## Implementation strategy

1. 完成 Phase 1 + Phase 2（Foundational） → 后端 job 接口可用  
2. 实现 User Story 1（基础上传流程）并手动测试 → 提供 MVP（最小可用体验）  
3. 实现 User Story 2（预览与映射）→ 完整上传控制  
4. 实现 User Story 3（性能/监控）→ 规模稳定运行  

*** End Tasks

# 任务：002-bulk-json-upload

**输入**：来自 `specs/002-bulk-json-upload/` 的设计文档  
**先决条件**：`spec.md`、`research.md`、`data-model.md`、`contracts/`、`quickstart.md`

## 第一阶段：准备（共享基础设施）

 - [X] T001 创建功能 UI 骨架 `xueran-admin/pages/admin/scripts/bulk-upload.vue`
 - [X] T002 [P] 在列表页面添加“批量上传”按钮 `xueran-admin/pages/admin/scripts/list.vue`
 - [X] T003 [P] 创建前端面板组件 `xueran-admin/pages/admin/scripts/components/BulkUploadPanel.vue`
 - [ ] T004 [P] 添加 API 合约审阅文件 `specs/002-bulk-json-upload/contracts/bulk-upload-api.yaml`
 - [X] T005 [P] 创建云函数脚手架 `xueran-admin/uniCloud-aliyun/cloudfunctions/bulkUpload/index.js`
 - [X] T006 [P] 添加 BulkUploadJob 的数据库 schema 文件 `xueran-admin/uniCloud-aliyun/database/schemas/bulkUploadJob.json`

---

## 第二阶段：基础（阻塞前提）

 - [X] T007 在服务器端实现作业记录创建与存储（`bulkUpload/index.js`），确保返回 jobId 给客户端
 - [X] T008 实现用于批量作业的基础日志/审计辅助模块（`xueran-admin/uniCloud-aliyun/cloudfunctions/lib/logging.js`）
 - [X] T009 添加后端批处理限制配置文件 `xueran-admin/uniCloud-aliyun/config/bulk-upload-config.json`
 - [X] T010 [P] 确保 `scriptManager` 云函数在创建记录时接受 `sourceJobId` 与 `sourceFileName`（`uniCloud-aliyun/cloudfunctions/scriptManager/index.js`）

---

## 第三阶段：用户故事 1 - 批量选择文件夹并上传（优先级：P1）

**目标**：从列表页选择文件夹或 zip，递归识别 JSON 文件并发起批量上传，返回 jobId 并在前端显示进度与结果摘要。  
**独立测试**：在支持的平台选择包含 10 个 JSON 的文件夹并执行上传，验证 10 条记录被创建或失败详情列出错误。

 - [X] T011 [US1] 在 `xueran-admin/pages/admin/scripts/list.vue` 中增加“批量上传”操作的绑定，打开 `BulkUploadPanel.vue`
 - [X] T012 [US1] 在 `BulkUploadPanel.vue` 中实现文件夹选择与清单(manifest) 创建（H5 文件夹 API 或 zip 回退）
 - [X] T013 [US1] 在 `BulkUploadPanel.vue` 中实现清单预览 UI，列出每个 JSON 提取的元信息
 - [X] T014 [US1] 在 `BulkUploadPanel.vue` 中实现冲突策略（跳过/覆盖/重命名）用户控制
 - [X] T015 [US1] 在 `BulkUploadPanel.vue` 中实现客户端上传请求 POST `/bulk-upload`（参照合约）
 - [X] T016 [US1] 在 `BulkUploadPanel.vue` 中实现前端轮询 GET `/bulk-upload/{jobId}` 并显示进度
 - [X] T017 [US1] 在 `BulkUploadPanel.vue` 中实现调用 `/bulk-upload/{jobId}/errors` 的错误下载链接
 - [ ] T018 [US1] 实现 zip 上传的回退处理（`BulkUploadPanel.vue`）以及服务器端的解压支持（`bulkUpload/index.js`） (CANCELLED - zip unsupported)

---

## 第四阶段：用户故事 2 - 上传映射与预览（优先级：P2）

**目标**：在上传前允许用户审阅并局部编辑每个 JSON 提取的元数据（title、author、tags、usageCount、likes）。  
**独立测试**：选择文件夹后修改某个文件的 title 并上传，验证创建的记录使用修改后的 title。

- [ ] T019 [US2] 在 `BulkUploadPanel.vue` 中实现每项的编辑 UI（内联编辑或弹窗）
- [ ] T020 [US2] 在发送到后端前将编辑后的元数据保存到清单负载中（`BulkUploadPanel.vue`）
- [ ] T021 [US2] 在预览面板中实现对所选项应用批量标签/字段的能力（`BulkUploadPanel.vue`）

---

## 第五阶段：后端处理（与 US1/US2 并行）

 - [X] T022 [US1] 实现 `bulkUpload/index.js` 的 POST 处理器：接受 manifest，创建 BulkUploadJob 记录，入队处理
 - [X] T023 [US1] 在 `bulkUpload/index.js` 内实现作业处理器（或 worker 函数）：遍历文件、验证 JSON、调用 `scriptManager` create/update、记录每文件结果（已实现简易同步路径）
 - [X] T024 [US1] 实现 GET `/bulk-upload/{jobId}`，返回作业状态与每文件摘要（`bulkUpload/index.js`）
 - [X] T025 [US1] 实现 GET `/bulk-upload/{jobId}/errors`，以 JSON 或 CSV 返回失败项（`bulkUpload/index.js`）
 - [ ] T026 [P] [US1] 在作业处理器中添加重试逻辑与每文件错误分类（`bulkUpload/index.js`）
 - [ ] T027 [US1] 确保创建的 `UploadedScript` 记录包含 `sourceJobId` 与 `sourceFileName`（更新 `scriptManager` 的使用）

---

## 第六阶段：文档、测试与手动验证

- [ ] T028 创建手动测试流程文档 `docs/test-procedures/us-bulk-upload.md`
- [ ] T029 [P] 在 `docs/test-data/bulk-upload/` 中准备样本数据集（10/100/200 个 JSON）供 QA 使用
- [ ] T030 [US1] 在 H5/App 上运行端到端手动测试：文件夹选择 → 上传 → 验证创建记录与错误导出
- [ ] T031 [US1] 在 `specs/002-bulk-json-upload/quickstart.md` 中记录已知限制与推荐的平台

---

## 第七阶段：优化与跨切关注点

- [ ] T032 [P] 添加遥测：统计作业时长、成功率、每文件平均耗时（`uniCloud-aliyun/cloudfunctions/metrics.js`）
- [ ] T033 [P] 添加 UI 改善：在 `BulkUploadPanel.vue` 中实现暂停/恢复、取消作业
- [ ] T034 清理：重构 `bulkUpload` 与 `scriptManager` 云函数间的重复逻辑

---

## 依赖与执行顺序

- 基础任务（T007-T010）必须在作业处理任务（T022-T027）之前完成。  
- UI 任务 T011-T016 可以与后端脚手架 T005 及基础任务并行开发，但端到端测试需要前后端同时完成。  
- 建议的 MVP 范围：完成第一阶段（T001-T006） + 基础（T007-T010） + US1 核心任务（T011-T017, T022-T025）。

---

## 实施策略

1. 先实现 MVP：最小端到端路径（选择文件夹/zip → POST manifest → 创建 job → 处理小清单 → 报告结果）。  
2. 递进式：逐步添加预览/编辑 UX、冲突策略选项、重试与导出功能。  
3. 并行工作：前端面板与后端作业处理器可以由不同开发者并行实现。


