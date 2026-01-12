# 数据模型（UI 变更说明）：返回按钮形状与样式

**日期**：2026-01-12  
**功能**：`specs/006-fix-detail-back-btn/spec.md`

## 概述

此功能为纯 UI 更改，不引入持久化数据或新实体。仅修改返回按钮容器的样式（`back-btn` 类）与相关注释，并更新测试与视觉基线。

## 受影响的 UI 元素

- **BackButton（现有）**  
  - 位置：`xueran/pages/detail/detail.vue`  
  - 影响项：CSS 类 `back-btn`（修改 border-radius、padding、shadow、背景与按下态），`uni-icons` 属性保持不变（`type="left"`, `size=24`）

## 验证规则

- 触控目标必须 ≥ 44×44 px（实现采用 48×48 容器）  
- 图标需在容器内视觉居中  
- 背景需在浅色/深色头图上均有足够对比（采用半透明背景与阴影）  
- 响应式回退：当头部空间受限时，容器退为圆角矩形（border-radius: 12px）以避免遮挡标题

## 状态与交互

不引入新的运行时状态；仅增加视觉反馈（按下状态：scale 或背景色变化）。

## 测试要点

- 单元测试：验证组件中存在 `uni-icons`、`back-btn` 类，以及点击事件绑定（调用 `uni.navigateBack()`）  
- 视觉回归测试：在不同平台与分辨率下截图比对返回按钮显示（包括浅色/深色头图场景）  
- 可访问性：确认 `aria-label` 与 `role="button"` 存在且正确

## 数据流（不变）

```
用户交互 → 点击 BackButton → uni.navigateBack() → 页面返回
```
