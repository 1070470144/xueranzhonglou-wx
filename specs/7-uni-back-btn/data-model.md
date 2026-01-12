# 数据模型（UI 说明）：使用 uni-app 内置回退控件

**日期**：2026-01-12  
**Feature**：`specs/7-uni-back-btn/spec.md`

## 概述

本次为 UI 变更，不引入新持久化数据。仅替换或调整 `BackButton` 的实现以使用 uni-app 内置图标或官方导航 API。

## 受影响元素

- `BackButton`（位于 `xueran/pages/detail/detail.vue`）  
  - 属性：`iconType`（内置类型），`iconSize`（24），`aria-label`（返回）  
  - 样式：触控区 ≥44×44 px，可通过 CSS 变量调整背景/边框以适应浅/深背景

## 验证规则

- 确认使用内置图标类型（`left`/`chevron-left` 等）  
- 点击触发 `uni.navigateBack()` 或等效平台回退  
- 可访问性属性存在（aria-label / role）


