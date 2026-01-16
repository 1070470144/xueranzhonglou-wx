# Implementation Plan: 小程序端排行榜感叹号位置调整

**Branch**: `003-miniapp-data-sync` | **Date**: 2026-01-16 | **Spec**: UI调整需求
**Input**: 用户需求：感叹号放在排行榜界面右下角

**Note**: 本计划针对小程序端排行榜页面信息提示按钮的位置调整，按照项目宪章要求在当前分支进行开发。

## Summary

将排行榜页面的信息提示按钮（感叹号ℹ️）从排行标题下方移动到页面的右下角，使用固定定位确保在所有情况下都可见。

## Technical Context

**Language/Version**: Vue.js + uni-app (小程序端)
**Primary Dependencies**: uni-app框架，现有排行榜页面组件
**Storage**: N/A (UI调整不涉及数据存储)
**Testing**: 手动测试界面布局和按钮功能
**Target Platform**: 微信小程序
**Project Type**: 小程序端UI调整
**Performance Goals**: UI渲染性能不受影响，保持固定定位的流畅性
**Constraints**: 按钮必须在滚动时保持可见，不影响主要内容区域
**Scale/Scope**: 单页面UI调整，影响排行榜页面布局

## Constitution Check

- **必须通过项**：
  - **运行时约束**：UI调整不涉及后端逻辑，无需云对象/云函数变更。
  - **文档语言**：计划文档使用中文编写。
  - **文件上传与一致性**：不涉及文件上传功能。
  - **测试规范**：提供手动测试流程验证UI调整效果。
  - **可观测性与监控**：UI调整不涉及关键操作监控。
  - **代码编写规范**：调整遵循现有代码规范，使用统一的样式定义。
  - **UI 设计规范**：调整后的按钮位置应符合小程序设计规范，提供良好的用户体验。
  - **管理端平台**：不涉及管理端功能，仅小程序端调整。

*GATE: 通过 - 无宪章违反*

## Project Structure

### Documentation (this feature)

```text
specs/003-miniapp-data-sync/
└── plan-rankings-exclamation.md    # 本文件
```

### Source Code (repository root)

```text
xueran/
├── pages/
│   └── rankings/
│       └── rankings.vue       # 需要修改的排行榜页面
```

**Structure Decision**: 单文件UI调整，修改现有排行榜页面文件

## Complexity Tracking

无宪章违反，无需复杂度说明。

## Implementation Phases

### Phase 0: 分析与设计 (已完成)
- ✅ 分析当前按钮位置（排行标题下方居中）
- ✅ 确定新位置（页面右下角固定定位）
- ✅ 评估样式调整影响和用户体验

### Phase 1: 实现调整 (已完成)
- ✅ 修改按钮定位样式为固定定位（position: fixed）
- ✅ 设置右下角位置（bottom: 40rpx, right: 40rpx）
- ✅ 调整z-index为1000确保按钮在最上层
- ✅ 优化滚动区域高度，恢复合理空间分配
 - ✅ 上调 bottom 为 160rpx，避免被底部选项卡遮挡

### Phase 2: 测试验证 (已完成)
- ✅ 修复按钮定位问题：将按钮移出scroll-view容器
- ✅ 验证固定定位在滚动时的表现
- ✅ 确认按钮始终固定在视窗右下角
- ✅ 测试在不同设备上的显示效果

### Phase 3: 问题修复 (已完成)
- ✅ 发现问题：按钮在scroll-view内时随内容滚动
- ✅ 解决方案：将固定定位按钮移到scroll-view外面
- ✅ 验证修复：按钮现在正确固定在屏幕右下角

## Risks & Mitigations

**Risk**: 固定定位按钮可能遮挡重要内容
**Mitigation**: 设置合适的边距，确保不遮挡主要功能区域

**Risk**: 在小屏幕设备上按钮可能过大或位置不当
**Mitigation**: 使用相对单位(rpx)并在不同屏幕尺寸下测试

**Risk**: 按钮层级可能与其他元素冲突
**Mitigation**: 设置较高的z-index值并测试弹窗交互

## Success Criteria

- ✅ 信息提示按钮成功移至页面右下角
- ✅ 按钮使用固定定位，在页面滚动时保持可见
- ✅ 按钮功能保持完整（点击弹出信息弹窗）
- ✅ 按钮不遮挡主要内容区域
- ✅ 在不同设备和屏幕尺寸上显示正常
- ✅ 视觉效果良好，用户体验优化