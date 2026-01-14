# Implementation Plan: 优化现有 Bulk JSON 上传（列表界面）

**Branch**: `002-bulk-json-upload` | **Date**: 2026-01-14 | **Spec**: specs/002-bulk-json-upload/spec.md
**Input**: 不是全新实现，而是基于已存在 `BulkUploadPanel.vue` 与 `bulkUpload` 接口的增量优化与修正

## Summary

本次计划以“最小变更、快速交付”为原则，对现有管理端批量上传页面和后端接口做定向优化，重点目标：
- 修复 H5 目录选择与回退 UX 问题（确保在支持和不支持目录 API 的浏览器上均能正确触发文件选择）  
- 在 manifest 中记录 `relativePath` 并稳定抽取 `extractedMeta`（便于回溯与审计）  
- 前端实现可配置的并发/分批上传与更友好的进度/错误展示（避免 UI 阻塞）  
- 后端增强 job 接口的错误/失败导出与批处理健壮性（processor 重试/批次控制、审计日志）  
- 遵循项目宪章（管理端 H5-only、Ant Design 风格、云对象优先）进行小范围兼容性保证

## Technical Context

**Language/Version**: JavaScript (Node.js for cloud objects) + Vue 2.x (uni-app / uni-h5)  
**Primary Dependencies**: uni-app, uniCloud 云对象、uniCloud 云存储、browser File API (H5)  
**Storage**: uniCloud 云数据库（scripts 集合），云存储用于大型文件（如需）  
**Testing**: 以手动 E2E 为主，补充关键集成/契约测试（若时间允许）  
**Target Platform**: 管理端限定为浏览器（H5），按宪章不强制兼容原生 App/小程序  
**Project Type**: uni-app 前端 + uniCloud 云对象后端  
**Performance Goals**: UI 不阻塞，默认并发 5、每批建议最大 200 条，处理 100 个 JSON 的交互体验良好  
**Constraints**: 浏览器对目录访问差异、云对象执行时间与并发限制、避免破坏现有接口契约

## Constitution Check

本次优化受宪章约束：
- 管理端目标平台（强制）：仅覆盖 H5 行为与降级方案（符合宪章）  
- UI 设计规范（强制）：任何 UI/交互改进需保持 Ant Design 风格或在 PR 中说明偏差  
- 文件上传与数据一致性：前端/后端校验规则不能与现有契约冲突；若需变更契约必须提交迁移与兼容说明

GATE: 若优化需改变外部契约或字段名（例如改变 `fileId`/`fileID` 行为），必须在 PR 中声明并获得至少两位维护者批准。

## Project Structure (existing)

```text
specs/002-bulk-json-upload/
├── spec.md
├── research.md
├── plan.md             # 此文件（优化版）
├── data-model.md
├── quickstart.md
└── contracts/
    └── bulk-upload-api.yaml
```

### Source Code (areas to change)

```text
xueran-admin/
├── pages/admin/scripts/components/BulkUploadPanel.vue  # 优化点：目录回退、manifest、preview、batching
├── pages/admin/scripts/bulk-upload.vue                # 路由/页面包装
├── utils/bulkUploadApi.js                             # 增强错误处理与兼容
└── uniCloud-aliyun/cloudfunctions/bulkUpload/        # 优化 backend processor / error export
    ├── index.js
    ├── processor.js
    └── validators.js
```

## Phase 0: Audit (1-2 days)

目标：审阅现有实现、复现已知问题并产出修复优先级清单。输出：
- 审计报告（issues with repro steps）  
- 优先级与估时（quick wins vs medium/large work）  
- 变更兼容性评估（是否影响现有调用方）

关键审计点：
- 回退/目录选择：修复 showDirectoryPicker 分支不触发 fallback input 的逻辑  
- Manifest：确保 `relativePath` 字段被保存并随 manifest 发送给后端  
- Error format：后端 job 返回错误数组的字段名与格式需标准化（便于前端 CSV 导出）  
- Concurrency：前端并发控制点（默认 5）与可配置接口

验收：审计报告提交到 `specs/002-bulk-json-upload/`，并在 PR 中列出需改动的文件清单

## Phase 1: Implementation (iterative, small PRs)

按优先级拆分为多个小的 PR：

1) Quick fixes (PR A)
- 修复目录选择回退逻辑并在 H5 中支持 `showDirectoryPicker()` 的可选路径（实现兼容 fallback）  
- 确保 hidden input 与 DOM click 能在所有目标浏览器上触发

2) Manifest & Meta (PR B)
- 确保前端构建 manifest 含 `fileName`, `relativePath`, `content`, `extractedMeta`  
- 后端接受 manifest 时保留 `relativePath` 并写入 `UploadedScript.sourceFileName`（回溯路径）

3) Backend robustness (PR C)
- 明确定义 `createJob` 返回格式（jobId、queuedCount）与 `getJob` 状态字段（status, successCount, failCount）  
- 实现 `getJobErrors` 返回标准化 errors 数组：[{ fileName, error }]  
- Processor 支持批处理/重试策略与审计日志

4) Frontend UX & batching (PR D)
- 可配置并发/批次控制（默认并发 = 5）并在 UI 中暴露基础配置（高级设置隐藏）  
- 改进预览编辑流程（小改：编辑 metadata 并映射到 manifest）  
- 改进轮询与失败导出的 UX（CSV 导出）

每个 PR 应包含：
- 变更说明、兼容性/回归风险、回归测试步骤（手动）、CI lint 通过

## Phase 2: Validation & Rollout

- 手动 E2E 测试（10/100 文件样本）执行并记录性能数据  
- 若无兼容问题，按小步部署策略合并到主分支并在次日观察（保留回滚计划）
- 更新 `specs/002-bulk-json-upload/quickstart.md` 与 `docs/test-procedures/us1-bulk-upload.md`

## Outputs (paths)

- Updated plan: `specs/002-bulk-json-upload/plan.md` (this file)  
- Audit report: `specs/002-bulk-json-upload/audit-report.md` (to be created)  
- Implementation PRs: small, focused PRs (A-D as above)

## Next actions (I will do now if you confirm)

1. 运行快速审计（复现回退/manifest 问题）并在 `specs/002-bulk-json-upload/audit-report.md` 提交问题清单（我可以立即开始）  
2. 在获得你的确认后，按优先级提交第一个 PR（Quick fixes）以修复目录回退与 hidden input 问题

*** End Plan

