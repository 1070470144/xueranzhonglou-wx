# Implementation Plan: 优化现有 Bulk JSON 上传（列表界面）

**Branch**: `002-bulk-json-upload` | **Date**: 2026-01-14 | **Spec**: specs/002-bulk-json-upload/spec.md
**Input**: 在现有批量上传功能基础上增加解析进度条，并参考提供的JSON格式样本进行优化

## Summary

本次计划在现有批量上传功能基础上增加解析进度条，重点目标：
- 在文件选择后立即显示解析进度条，实时展示JSON文件的读取和解析进度
- 解析过程中显示当前处理的文件名和进度百分比，避免大批量文件时的UI阻塞感
- 解析完成后显示解析结果统计（成功/失败文件数）再进入上传确认流程
- 优化JSON格式识别，支持标准Clocktower剧本格式（包含_meta元数据和角色数组）
- 遵循项目宪章（管理端 H5-only、Ant Design 风格、云对象优先）进行实现

## Technical Context

**Language/Version**: JavaScript (Node.js for cloud objects) + Vue 2.x (uni-app / uni-h5)
**Primary Dependencies**: uni-app, uniCloud 云对象、uniCloud 云存储、browser File API (H5)
**Storage**: uniCloud 云数据库（scripts 集合），云存储用于大型文件（如需）
**Testing**: 以手动 E2E 为主，补充关键集成/契约测试（若时间允许）
**Target Platform**: 管理端限定为浏览器（H5），按宪章不强制兼容原生 App/小程序
**Project Type**: uni-app 前端 + uniCloud 云对象后端
**Performance Goals**: 解析阶段显示实时进度，处理 100 个 JSON 的解析时间 < 30秒；UI响应流畅，无明显阻塞
**JSON Format Reference**: Clocktower剧本格式，包含_meta元数据对象和角色数组，参考 @f:\BaiduNetdiskDownload\剧本JSON（SE整理版）
**Constraints**: 浏览器File API限制、大文件JSON解析性能、内存使用控制、现有接口契约保持兼容

## Constitution Check

本次功能增强受宪章约束：
- 管理端目标平台（强制）：仅在 H5 浏览器环境实现，保持平台一致性
- UI 设计规范（强制）：进度条和解析界面遵循 Ant Design 进度条组件规范
- 文件上传与数据一致性：解析逻辑不改变现有上传接口契约，新增解析状态为前端增强
- 云对象优先：解析逻辑在前端处理，不增加后端云对象复杂度

GATE: 新增功能不改变现有API契约，无需额外批准。

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

## Phase 0: Research & Design (1-2 days)

目标：调研解析进度条实现方案，分析JSON格式特征，设计用户体验流程。

关键研究点：
- 进度条实现：Web Worker vs 主线程解析，内存管理策略
- JSON格式分析：Clocktower剧本结构特征，元数据提取规则
- UX设计：解析阶段的状态展示，错误处理展示
- 性能评估：大批量JSON文件的解析性能瓶颈分析

验收：research.md 更新解析进度条实现方案和技术选型

## Phase 1: Implementation (iterative, small PRs)

按功能模块拆分为多个小的 PR：

1) 解析进度条核心 (PR A)
- 实现文件选择后的即时解析进度显示
- 支持 Web Worker 后台解析避免UI阻塞
- 实时显示当前文件名和总体进度百分比

2) JSON格式识别与元数据提取 (PR B)
- 实现Clocktower剧本JSON格式识别（_meta + 角色数组）
- 自动提取剧本元数据（名称、作者、描述、logo等）
- 支持格式校验和错误收集

3) 解析结果展示与状态管理 (PR C)
- 解析完成后的结果统计界面（成功/失败文件数）
- 解析错误的文件列表和错误原因展示
- 解析状态与上传流程的衔接

4) 性能优化与边界处理 (PR D)
- 大文件JSON的流式解析优化
- 内存使用监控和垃圾回收
- 解析中断/取消功能实现

每个 PR 应包含：
- 变更说明、兼容性/回归风险、回归测试步骤（手动）、CI lint 通过

## Phase 2: Validation & Rollout

- 手动 E2E 测试（10/100 文件样本）执行，重点验证解析进度条的实时性和准确性
- 性能测试：验证100个JSON文件的解析时间 < 30秒，内存使用峰值 < 100MB
- 若无兼容问题，按小步部署策略合并到主分支并在次日观察（保留回滚计划）
- 更新 `specs/002-bulk-json-upload/quickstart.md` 与 `docs/test-procedures/us2-upload-progress.md`

## Outputs (paths)

- Updated plan: `specs/002-bulk-json-upload/plan.md` (this file)
- Research findings: `specs/002-bulk-json-upload/research.md` (updated)
- Implementation PRs: small, focused PRs (A-D as above)

## Next actions (I will do now if you confirm)

1. 运行快速审计（复现回退/manifest 问题）并在 `specs/002-bulk-json-upload/audit-report.md` 提交问题清单（我可以立即开始）  
2. 在获得你的确认后，按优先级提交第一个 PR（Quick fixes）以修复目录回退与 hidden input 问题

*** End Plan

