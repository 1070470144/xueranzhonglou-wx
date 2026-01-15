---

description: "Task list for feature 002-bulk-json-upload — 批量 JSON 上传（管理端 H5-only）"
---

# Tasks: 批量 JSON 上传（H5 管理端）

**Input**: Design documents from `specs/002-bulk-json-upload/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件、无依赖关系）  
- **[Story]**: 用户故事标签（例如: [US1], [US2], [US3]）

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 项目初始化和基础结构准备（为所有用户故事提供支持）

- [X] T001 Create database schema `xueran-admin/uniCloud-aliyun/database/schemas/bulkUploadJob.json` from `specs/002-bulk-json-upload/data-model.md`
- [X] T002 [P] Verify or add API contract `specs/002-bulk-json-upload/contracts/bulk-upload-api.yaml` (ensure endpoints `/bulk/createJob`, `/bulk/getJob`, `/bulk/getJobErrors`)
- [X] T003 [P] Ensure plan/research/data-model/quickstart files exist under `specs/002-bulk-json-upload/` and reference them in PR description
- [X] T004 [P] Ensure front-end API wrapper `xueran-admin/utils/bulkUploadApi.js` exists and document its expected methods (`createJob`, `getJob`, `getJobErrors`)
- [X] T005 [P] Setup Ant Design UI components and theme configuration for progress bars and file upload interfaces in `xueran-admin/common/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 核心后端与队列支持，必须在任何用户故事实现前完成

- [X] T006 Audit existing `xueran-admin/uniCloud-aliyun/cloudfunctions/bulkUpload/index.js` and `processor.js`; produce `specs/002-bulk-json-upload/audit-report.md` listing repro steps and priority fixes
- [X] T007 [P] Ensure `bulkUpload/index.js` returns standardized response `{ code, data: { jobId }, message }` and `getJob`/`getJobErrors` return agreed formats
- [X] T008 [P] Add or verify `xueran-admin/uniCloud-aliyun/cloudfunctions/bulkUpload/processor.js` supports batch size config and retry policy (update code or create TODO for backend change)
- [X] T009 Implement/verify server-side validation helpers `xueran-admin/uniCloud-aliyun/cloudfunctions/bulkUpload/validators.js` (JSON parse, meta extraction, size checks)
- [X] T010 Add audit logging in cloud object `xueran-admin/uniCloud-aliyun/cloudfunctions/bulkUpload/logs.js` (record jobId, userId, counts)

---

## Phase 3: User Story 1 - 批量选择文件夹并上传 (Priority: P1) 🎯 MVP

**Goal**: 在剧本列表页实现批量上传入口，允许管理员选择本地文件夹（H5-only）或使用降级上传，构建 manifest 并创建后台作业

**Independent Test**: 在 H5 浏览器中选择一个包含 10 个 JSON 的目录，启动上传；验证所有文件被处理且在列表页出现对应记录或有明确错误报告

### Manual Testing Procedures for User Story 1 (REQUIRED) ⚠️

- [X] T011 [US1] Define manual test procedures for folder selection and upload flow in `docs/test-procedures/us1-bulk-upload.md`
- [X] T012 [US1] Define manual test procedures for error handling and job status tracking in `docs/test-procedures/us1-bulk-upload.md`

### Implementation for User Story 1

- [X] T013 [US1] Create bulk upload entry button in `xueran-admin/pages/admin/scripts/list.vue`
- [X] T014 [US1] Implement folder selection logic in `xueran-admin/pages/admin/scripts/components/BulkUploadPanel.vue` (webkitdirectory API with fallbacks)
- [X] T015 [US1] Add manifest building logic in `BulkUploadPanel.vue` to collect file metadata and content
- [X] T016 [US1] Implement job creation API call in `BulkUploadPanel.vue` using `utils/bulkUploadApi.js`
- [X] T017 [US1] Add upload progress tracking and status polling in `BulkUploadPanel.vue`
- [X] T018 [US1] Implement error summary display and export functionality in `BulkUploadPanel.vue`
- [X] T019 [US1] Add success/failure statistics display in `BulkUploadPanel.vue`
- [X] T020 [US1] Integrate uploaded scripts display in list page `xueran-admin/pages/admin/scripts/list.vue`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently - basic bulk upload from folder to job completion

---

## Phase 4: User Story 2 - 上传映射与预览 (Priority: P2)

**Goal**: 在上传前允许用户预览和编辑每个 JSON 文件的元数据映射，提供更好的上传控制和质量保证

**Independent Test**: 选择文件夹后，在预览页面修改某个文件的 title 并上传，验证创建的记录使用修改后的 title

### Manual Testing Procedures for User Story 2 (REQUIRED) ⚠️

- [ ] T021 [US2] Define manual test procedures for metadata preview and editing in `docs/test-procedures/us2-upload-preview.md`
- [ ] T022 [US2] Define manual test procedures for conflict resolution strategies in `docs/test-procedures/us2-upload-preview.md`

### Implementation for User Story 2

- [ ] T023 [US2] Create metadata preview component in `xueran-admin/components/BulkUploadPreview.vue`
- [X] T024 [US2] Implement JSON metadata extraction logic in `BulkUploadPanel.vue` (title, author, description, roles count)
- [ ] T025 [US2] Add inline editing capabilities for file metadata in preview component
- [ ] T026 [US2] Implement conflict resolution strategy selection (skip/overwrite/rename) in `BulkUploadPanel.vue`
- [ ] T027 [US2] Add bulk metadata editing for all files in `BulkUploadPanel.vue`
- [ ] T028 [US2] Integrate preview workflow into upload flow in `BulkUploadPanel.vue`
- [ ] T029 [US2] Add validation for edited metadata before upload submission

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently with preview and editing capabilities

---

## Phase 5: User Story 3 - 解析进度条 (Priority: P1)

**Goal**: 在文件选择后立即显示解析进度条，实时展示JSON文件的读取和解析进度，提供更好的用户体验和状态反馈

**Independent Test**: 选择包含100个JSON的文件夹，观察解析进度条实时更新，验证解析完成后显示正确的成功/失败统计

### Manual Testing Procedures for User Story 3 (REQUIRED) ⚠️

- [ ] T030 [US3] Define manual test procedures for parsing progress display in `docs/test-procedures/us3-parsing-progress.md`
- [ ] T031 [US3] Define manual test procedures for parsing error handling in `docs/test-procedures/us3-parsing-progress.md`

### Implementation for User Story 3

- [ ] T032 [US3] Create Web Worker for JSON parsing `xueran-admin/utils/jsonParser.worker.js`
- [ ] T033 [US3] Implement parsing progress state management in `BulkUploadPanel.vue`
- [ ] T034 [US3] Add real-time progress UI components (Ant Design Progress) in `BulkUploadPanel.vue`
- [ ] T035 [US3] Implement Clocktower JSON format validation in Web Worker
- [ ] T036 [US3] Add parsing error collection and reporting in `BulkUploadPanel.vue`
- [ ] T037 [US3] Implement parsing cancellation functionality in `BulkUploadPanel.vue`
- [ ] T038 [US3] Add memory management and performance monitoring in Web Worker
- [ ] T039 [US3] Create parsing results summary display in `BulkUploadPanel.vue`

**Checkpoint**: At this point, all user stories should work with enhanced parsing progress feedback

---

## Phase 6: User Story 4 - 大量文件与性能优化 (Priority: P3)

**Goal**: 优化并发、分批处理和后端处理，确保大量文件（>500）可稳定处理且界面不阻塞

**Independent Test**: 准备200个JSON文件进行批量上传，验证系统分批处理且前端显示合理进度，不阻塞主线程

### Manual Testing Procedures for User Story 4 (REQUIRED) ⚠️

- [ ] T040 [US4] Define manual test procedures for large file set performance in `docs/test-procedures/us4-performance.md`
- [ ] T041 [US4] Define manual test procedures for batch processing and concurrency in `docs/test-procedures/us4-performance.md`

### Implementation for User Story 4

- [ ] T042 [US4] Implement configurable batch processing in `xueran-admin/uniCloud-aliyun/cloudfunctions/bulkUpload/processor.js`
- [ ] T043 [US4] Add frontend concurrency controls in `BulkUploadPanel.vue` (batch size, parallel uploads)
- [ ] T044 [US4] Implement upload queue management and retry logic in `BulkUploadPanel.vue`
- [ ] T045 [US4] Add backend performance monitoring in `xueran-admin/uniCloud-aliyun/cloudfunctions/bulkUpload/index.js`
- [ ] T046 [US4] Optimize file processing pipeline for large datasets
- [ ] T047 [US4] Add memory usage monitoring and cleanup in Web Worker and main thread

**Checkpoint**: All user stories should now be fully functional with performance optimizations

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 最终改进、文档与测试

- [ ] T048 [P] Add comprehensive logging for all bulk operations in cloud object and processor (`xueran-admin/uniCloud-aliyun/cloudfunctions/bulkUpload/logs.js`)
- [ ] T049 [P] Implement user-facing error messages and accessibility improvements in `BulkUploadPanel.vue`
- [ ] T050 [P] Ensure `docs/test-procedures/us1-bulk-upload.md`, `us2-upload-preview.md`, `us3-parsing-progress.md` exist and are up-to-date
- [ ] T051 [P] Update `README.md` and `specs/002-bulk-json-upload/quickstart.md` to reflect H5-only management platform and usage notes
- [ ] T052 [P] Run manual end-to-end test and mark acceptance in `specs/002-bulk-json-upload/plan.md`
- [ ] T053 Add performance metrics collection and reporting
- [ ] T054 Implement advanced error recovery and retry mechanisms
- [ ] T055 Add internationalization support for bulk upload interface

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US3 → US2 → US4)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 3 (P1)**: Can start after Foundational - Independent of US1 but enhances UX
- **User Story 2 (P2)**: Can start after Foundational - May integrate with US1/US3 but independently testable
- **User Story 4 (P3)**: Can start after Foundational - Performance optimizations for all stories

### Within Each User Story

- UI components before business logic
- Core functionality before advanced features
- Error handling throughout implementation
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, US1, US3, and US2 can start in parallel
- US4 (performance) can start after any core story is working
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: Multiple User Stories

```bash
# Team can work on different stories simultaneously:
Developer A: "T013 [US1] Create bulk upload entry button in xueran-admin/pages/admin/scripts/list.vue"
Developer B: "T032 [US3] Create Web Worker for JSON parsing xueran-admin/utils/jsonParser.worker.js"
Developer C: "T023 [US2] Create metadata preview component in xueran-admin/components/BulkUploadPreview.vue"

# Within a story, parallel tasks:
Task: "T034 [US3] Add real-time progress UI components in BulkUploadPanel.vue"
Task: "T035 [US3] Implement Clocktower JSON format validation in Web Worker"
Task: "T036 [US3] Add parsing error collection in BulkUploadPanel.vue"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (basic bulk upload)
4. Complete Phase 5: User Story 3 (parsing progress - enhances US1)
5. **STOP and VALIDATE**: Test US1+US3 independently as enhanced MVP
6. Deploy/demo if ready

### Full Feature Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 + User Story 3 → Enhanced MVP with progress feedback
3. Add User Story 2 → Full preview and editing capabilities
4. Add User Story 4 → Performance optimizations for scale
5. Each increment adds value without breaking previous functionality

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (core upload flow)
   - Developer B: User Story 3 (parsing progress + Web Worker)
   - Developer C: User Story 2 (preview + editing)
3. Stories complete independently, then integrate
4. Developer D: User Story 4 (performance) once core stories working

---

## Notes

- [P] tasks = different files, no cross-dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Parsing progress (US3) enhances US1 but can be implemented independently
- Manual testing procedures are REQUIRED for each user story
- Verify tests fail before implementing (TDD where possible)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

*** End Tasks