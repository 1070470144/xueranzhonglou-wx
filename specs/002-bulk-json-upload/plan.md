# Implementation Plan: 优化现有 Bulk JSON 上传（列表界面）

**Branch**: `002-bulk-json-upload` | **Date**: 2026-01-14 | **Spec**: specs/002-bulk-json-upload/spec.md
**Input**: 在现有批量上传功能基础上增加解析进度条，并参考提供的JSON格式样本进行优化

## Summary

本次计划优化现有批量上传功能的自动获取能力，重点目标：
- 优化JSON元数据的自动提取算法，提高剧本名字、作者名、剧本描述的识别准确率
- 实现默认设置功能：为新上传的剧本自动设置"娱乐"标签和激活状态
- 增强元数据映射策略，支持更多JSON格式的自动识别和转换
- 在上传确认界面提供元数据预览和批量编辑功能
- 遵循项目宪章（管理端 H5-only、Ant Design 风格、云对象优先）进行实现

## Technical Context

**Language/Version**: JavaScript (Node.js for cloud objects) + Vue 2.x (uni-app / uni-h5)
**Primary Dependencies**: uni-app, uniCloud 云对象、uniCloud 云存储、browser File API (H5)
**Storage**: uniCloud 云数据库（scripts 集合），云存储用于大型文件（如需）
**Testing**: 以手动 E2E 为主，补充关键集成/契约测试（若时间允许）
**Target Platform**: 管理端限定为浏览器（H5），按宪章不强制兼容原生 App/小程序
**Project Type**: uni-app 前端 + uniCloud 云对象后端
**Performance Goals**: 元数据提取准确率 > 95%，处理 100 个 JSON 的解析时间 < 30秒；UI响应流畅，无明显阻塞
**JSON Format Support**: Clocktower剧本格式及其他常见JSON结构，支持_meta元数据、标准字段映射
**Metadata Extraction**: 自动识别剧本名字、作者名、描述，支持多种JSON结构的自适应提取
**Default Settings**: 新上传剧本自动设置"娱乐"标签和激活状态，可在上传前预览修改
**Constraints**: 浏览器File API限制、JSON格式多样性、元数据提取准确性、现有接口契约保持兼容

## Constitution Check

本次功能优化受宪章约束：
- **运行时约束**：优先使用云对象处理上传逻辑，元数据提取在前端完成，不增加云函数使用
- **文档语言**：所有文档使用中文编写，符合项目规范
- **文件上传与数据一致性**：优化不改变现有上传接口契约，新增元数据提取逻辑需验证fileID字段兼容性
- **测试规范**：提供详细的手动测试流程验证元数据提取准确性和默认设置功能
- **可观测性与监控**：关键操作记录日志，元数据提取失败时提供清晰错误信息
- **代码编写规范**：定义统一的元数据提取接口规范，不使用保底逻辑
- **UI 设计规范**：上传确认界面和元数据预览遵循 Ant Design 设计规范
- **管理端平台**：仅在 H5 浏览器环境实现，符合宪章要求

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

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

### Source Code (areas to optimize)

```text
xueran-admin/
├── pages/admin/scripts/components/BulkUploadPanel.vue  # 优化点：元数据提取算法、默认设置、预览界面
├── pages/admin/scripts/bulk-upload.vue                # 路由/页面包装
├── utils/bulkUploadApi.js                             # 增强元数据提取与默认值设置
└── uniCloud-aliyun/cloudfunctions/bulkUpload/        # 后端处理逻辑（保持兼容）
    ├── index.js
    ├── processor.js
    └── validators.js
```

## Phase 0: Research & Design (1-2 days)

目标：调研元数据提取优化方案，分析JSON格式多样性，设计自动识别算法。

关键研究点：
- 元数据提取算法：支持多种JSON结构的自动识别和映射
- 默认设置实现：娱乐标签和激活状态的自动应用逻辑
- JSON格式兼容性：Clocktower格式及其他常见剧本JSON结构的处理
- UX设计：元数据预览和批量编辑界面的用户体验
- 准确性验证：不同JSON格式的元数据提取成功率评估

验收：research.md 更新元数据提取优化方案和技术选型

## Phase 1: Implementation (iterative, small PRs)

按功能模块拆分为多个小的 PR：

1) 元数据提取算法优化 (PR A)
- 增强JSON格式自动识别，支持多种剧本结构
- 优化剧本名字、作者名、描述的提取准确率
- 实现自适应元数据映射策略

2) 默认设置功能实现 (PR B)
- 实现新上传剧本的默认"娱乐"标签设置
- 实现默认激活状态设置
- 支持在上传前预览和修改默认设置

3) 元数据预览界面优化 (PR C)
- 增强上传确认界面的元数据预览功能
- 支持批量编辑和单个文件调整
- 改进错误显示和处理反馈

4) 兼容性测试与优化 (PR D)
- 验证各种JSON格式的元数据提取兼容性
- 优化提取算法的准确性和性能
- 完善错误处理和边界情况

每个 PR 应包含：
- 变更说明、兼容性/回归风险、回归测试步骤（手动）、CI lint 通过

## Phase 2: Validation & Rollout

- 手动 E2E 测试（10/100 文件样本）执行，重点验证元数据提取准确性和默认设置功能
- 准确性测试：验证不同JSON格式的元数据提取成功率 > 95%
- 若无兼容问题，按小步部署策略合并到主分支并在次日观察（保留回滚计划）
- 更新 `specs/002-bulk-json-upload/quickstart.md` 与相关测试文档

## Outputs (paths)

- Updated plan: `specs/002-bulk-json-upload/plan.md` (this file)
- Research findings: `specs/002-bulk-json-upload/research.md` (updated)
- Implementation PRs: small, focused PRs (A-D as above)

## Next actions

1. 运行元数据提取算法测试并验证现有JSON格式的兼容性
2. 在获得确认后，按优先级实施元数据提取优化和默认设置功能

*** End Plan

