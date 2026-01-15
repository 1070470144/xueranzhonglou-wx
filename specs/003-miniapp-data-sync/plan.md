# Implementation Plan: 小程序端数据结构统一与同步

**Branch**: `003-miniapp-data-sync` | **Date**: 2026-01-15 | **Spec**: specs/003-miniapp-data-sync/spec.md
**Input**: Feature specification from `/specs/003-miniapp-data-sync/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

适配现有小程序界面和数据结构，使其与管理端保持一致的数据字段定义，确保小程序能正常刷新和管理端数据库的数据。重点是数据结构统一和同步机制，不涉及界面重新设计。

## Technical Context

**Language/Version**: JavaScript/Vue 2.x (uni-app框架)
**Primary Dependencies**: uni-app, uniCloud 云对象、云数据库
**Storage**: uniCloud 云数据库（scripts 集合），与管理端共享
**Testing**: 手动测试流程，重点验证数据同步和字段一致性
**Target Platform**: 小程序端（H5兼容），适配现有界面
**Project Type**: uni-app前端项目 + 云对象后端（基于现有架构）
**Performance Goals**: 数据刷新响应时间不超过3秒，99%的用户能够成功加载数据
**Constraints**: 必须适配现有小程序界面，不重新设计UI；数据结构必须与管理端完全一致
**Scale/Scope**: 小程序端数据结构统一，涉及剧本列表和详情页面的数据同步

## Constitution Check

- **必须通过项（在 Phase 0 研究前）**：
  - **运行时约束**：优先使用现有云对象（listScripts、getScript），扩展现有云对象以支持管理端数据结构。
  - **文档语言**：所有计划、规范、任务和快速上手文档必须使用**中文**，除非另有说明并获得批准。
  - **文件上传与一致性**：不涉及文件上传，重点是数据读取和同步。
  - **测试规范**：计划必须定义代码完整性检查标准，并提供详细的手动测试流程；开发者将按照测试流程手动执行并反馈结果。
  - **可观测性与监控**：关键操作（数据同步、字段映射）必须在计划中指明日志点和错误处理策略。
  - **代码编写规范**：计划 MUST 明确定义统一的数据结构映射，且禁止使用保底、回退等兜底逻辑；任何问题应以修复为主而非妥协。
  - **UI 设计规范**：适配现有小程序界面，不重新设计UI，保持现有交互体验。
  - **管理端平台**：本功能针对小程序端，不涉及管理端平台限制。

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

## Project Structure

### Documentation (this feature)

```text
specs/003-miniapp-data-sync/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
xueran/                          # 现有小程序项目
├── pages/
│   ├── script-list/             # 剧本列表页面 - 适配管理端数据字段
│   │   └── script-list.vue
│   └── script-detail/           # 剧本详情页面 - 适配管理端数据字段
│       └── script-detail.vue
└── uniCloud-aliyun/cloudfunctions/
    ├── listScripts/             # 扩展云函数支持管理端数据字段
    │   └── index.js
    └── getScript/               # 扩展云函数支持管理端数据字段
        └── index.js
```

**Structure Decision**: 基于现有小程序项目结构，专注于数据结构适配和同步机制，不涉及新的页面或组件创建。主要修改云函数以支持管理端完整数据字段，并调整前端数据映射逻辑。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 数据结构扩展 | 需要支持管理端完整字段以确保数据一致性 | 简化字段会导致数据丢失和管理端小程序数据不一致 |
| 云函数修改 | 现有云函数字段投影不完整 | 不修改云函数会导致无法获取管理端新增字段 |

## Phase 0: Outline & Research

### 研究任务

1. **分析现有数据结构差异**：
   - 对比管理端和小程序端当前使用的字段
   - 识别缺失的管理端字段（status、tags、category、description、fileSize等）
   - 分析字段映射和兼容性问题

2. **评估数据同步机制**：
   - 分析现有云函数的字段投影配置
   - 确定需要扩展的字段列表
   - 评估对现有小程序界面的影响

3. **验证数据一致性策略**：
   - 研究字段默认值处理
   - 分析状态字段的显示逻辑
   - 确定数据刷新和缓存策略

### 输出
research.md 文件，包含数据结构对比分析和适配策略

## Phase 1: Design & Contracts

### 数据模型设计 (data-model.md)
基于管理端数据结构，定义小程序端需要支持的完整字段映射：
- 剧本实体字段扩展（status、tags、category、description等）
- 数据验证规则适配
- 字段默认值和兼容性处理

### API合约设计 (contracts/)
- listScripts API扩展：支持管理端完整字段投影
- getScript API扩展：支持管理端数据结构
- 响应格式标准化

### 快速开始指南 (quickstart.md)
- 小程序端数据结构适配说明
- 测试数据准备指南
- 验证步骤说明

## Phase 2: Implementation

### 云函数扩展
- listScripts云函数：添加管理端字段到投影配置
- getScript云函数：扩展字段获取范围
- 保持向后兼容性

### 前端数据适配
- script-list.vue：适配新增字段的显示逻辑
- script-detail.vue：支持完整数据字段展示
- 数据映射和格式化处理

### 测试验证
- 字段完整性测试
- 数据同步测试
- 兼容性验证测试