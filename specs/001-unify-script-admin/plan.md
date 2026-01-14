# Implementation Plan: 统一剧本管理接口

**Branch**: `001-unify-script-admin` | **Date**: 2026-01-14 | **Spec**: specs/001-unify-script-admin/spec.md
**Input**: Feature specification from `/specs/001-unify-script-admin/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

重新设计并统一当前管理端剧本管理功能，实现统一的上传、列表、更新接口，移除所有兜底逻辑，确保数据一致性。采用云对象优先策略，统一定义接口数据结构，简化开发和维护复杂度。

技术方案：基于现有 HBuilderX 云对象架构，重构现有分散的剧本管理接口，合并为统一的 API 集合，确保所有操作使用一致的数据结构和错误处理机制。

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: JavaScript/Vue 2.x (uni-app框架)
**Primary Dependencies**: uni-app, uniCloud云对象, 云存储, 云数据库
**Storage**: uniCloud云数据库 (优先使用云对象，位于 xueran-admin/uniCloud-aliyun/database/)
**Testing**: 手动测试流程 (按宪章要求)
**Target Platform**: H5、小程序、App多端部署
**Project Type**: uni-app前端项目 + 云对象后端 (云对象位于 xueran-admin/uniCloud-aliyun/cloudfunctions/)
**Performance Goals**: 页面加载<10秒，上传成功率99%，更新响应<5秒
**Constraints**: 必须使用云对象优先策略，禁止使用云函数兜底逻辑
**Scale/Scope**: 剧本管理模块重构，涉及上传、列表、编辑三大核心功能

## Constitution Check

- **必须通过项（在 Phase 0 研究前）**：
  - **运行时约束**：优先使用 HBuilderX 的云对象（云对象/云存储），尽量避免使用云函数（仅在确有必要且有明确理由时允许）。
  - **文档语言**：所有计划、规范、任务和快速上手文档必须使用**中文**，除非在文档中明确说明并获得批准。
  - **文件上传与一致性**：若功能涉及文件/图片上传，计划 MUST 定义文件字段验证、上传回调验证、存储落盘验证，以及对 `fileID`/`fileId` 字段的兼容处理。
  - **测试规范**：计划必须定义代码完整性检查标准，并提供详细的手动测试流程；开发者将按照测试流程手动执行并反馈结果。
  - **可观测性与监控**：关键操作（例如上传/删除/第三方 API 调用）必须在计划中指明日志点和错误处理策略。
  - **代码编写规范**：计划 MUST 明确定义统一的接口和规范，且禁止使用保底、回退等兜底逻辑；任何问题应以修复为主而非妥协。

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
xueran-admin/                    # uni-app管理端项目
├── pages/
│   └── admin/
│       └── scripts/             # 剧本管理页面
│           ├── list.vue         # 剧本列表页面
│           └── edit.vue         # 剧本编辑页面
├── components/                  # 通用组件
├── utils/                       # 工具函数
└── uniCloud-aliyun/             # 云对象和云函数
    ├── cloudfunctions/          # 云函数
    │   ├── scriptManager/       # 统一剧本管理云对象
    │   │   └── index.js         # 统一API实现
    │   ├── getScript/           # 获取剧本云函数 (待移除)
    │   └── listScripts/         # 列表剧本云函数 (待移除)
    └── database/                # 云数据库schema
        └── scripts.schema.json  # 剧本数据结构定义
```

**Structure Decision**: 基于现有uni-app项目结构，专注于重构剧本管理相关页面和云对象。保留现有目录结构，只修改剧本管理相关文件，移除不必要的云函数依赖。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
