# Implementation Plan: [修复小程序热度榜单数值一直是0的问题]

**Branch**: `005-fix-rankings-zero-values` | **Date**: 2026-01-16 | **Spec**: specs/005-fix-rankings-zero-values/spec.md
**Input**: Feature specification from `/specs/005-fix-rankings-zero-values/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

修复小程序中热度榜单数值始终显示为0的问题。需要调查热度计算逻辑、数据同步机制和前端展示代码，确保热度值能正确计算并显示。

## Technical Context

**Language/Version**: JavaScript/Node.js (uni-app/HBuilderX云对象)
**Primary Dependencies**: uniCloud云对象、云数据库、Vue.js
**Storage**: uniCloud云数据库
**Testing**: 手动测试流程验证
**Target Platform**: 小程序端（微信小程序）
**Project Type**: uni-app小程序应用
**Performance Goals**: 榜单数据加载时间 < 2秒
**Constraints**: 使用云对象优先，避免云函数；数据一致性保证
**Scale/Scope**: 单表查询，热度计算逻辑修复

## Constitution Check

- **必须通过项（在 Phase 0 研究前）**：
  - **运行时约束**：使用云对象进行数据查询和计算，符合项目宪章要求。
  - **文档语言**：计划文档使用中文编写。
  - **文件上传与一致性**：不涉及文件上传，无需特殊处理。
  - **测试规范**：将提供详细的手动测试流程验证热度计算和显示功能。
  - **可观测性与监控**：关键操作添加日志记录，便于问题排查。
  - **代码编写规范**：定义统一的热度计算接口规范，禁止使用兜底逻辑。
  - **UI 设计规范**：涉及UI显示，但为修复性改动，遵循现有设计规范。
  - **管理端平台**：不涉及管理端功能。

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

## Project Structure

### Documentation (this feature)

```text
specs/005-fix-rankings-zero-values/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
xueran/
├── uniCloud-aliyun/
│   └── cloudfunctions/
│       └── getRankings/
│           └── index.js      # 热度计算逻辑修复
└── pages/
    └── rankings/
        └── rankings.vue      # 前端显示修复
```

**Structure Decision**: 主要修改云函数getRankings的热度计算逻辑和前端rankings页面的数据显示逻辑。

## Complexity Tracking

无宪章违反，无需复杂度追踪。