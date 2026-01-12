# 实施计划：替换为 uni-app 自带回退按钮

**分支**：`7-uni-back-btn` | **日期**：2026-01-12 | **规范**：`specs/7-uni-back-btn/spec.md`
**输入**：`specs/7-uni-back-btn/spec.md`

## 概要

将详情页左上角的返回控件替换为 uni-app 的内置回退实现或等效标准实现，保证跨平台一致性、可访问性与视觉可辨识性，同时允许通过主题或 CSS 微调颜色/对比，但不引入外部图标库。

## 技术上下文

- 语言/框架：Vue.js（uni-app）  
- 依赖：uni-app 内置组件/API（uni-icons、uni.navigateBack 等）  
- 测试：Vitest（单元），视觉回归（Playwright 或项目既有脚本）  
- 目标平台：微信小程序、HBuilderX 预览，跨平台 uni-app  
- 约束：不修改后端、不引入第三方图标库；保持无障碍与触控目标最小值 44×44 px

## 宪法检查（Constitution Check）

- **UNI-APP-FIRST**：✅ 使用内置组件或内置图标实现  
- **TDD**：✅ 单元测试与视觉回归测试纳入计划  
- **跨平台兼容**：✅ 设计基于 uni-app 原生能力

## 项目结构（该功能相关）

```text
specs/7-uni-back-btn/
├── spec.md
├── plan.md        # 本文件
├── research.md
├── data-model.md
├── quickstart.md
└── checklists/
    └── requirements.md
```

## 研究与设计（Phase 0）

- 验证 uni-icons 是否提供合适的回退图标（如 chevron-left/left），若无则使用内置导航 API 并使用平台推荐图标。  
- 决策：优先使用 `uni-icons` 提供的内置类型和 `uni.navigateBack()` 实现回退；在白底头部通过样式微调提高对比度（半透明填充或轻边框）。

## 实施步骤（Phase 1）

1. 在 `xueran/pages/detail/detail.vue` 中替换或调整返回控件，确保使用内置 `uni-icons` 类型或 uni-app 提供的导航组件/API。  
2. 添加/更新样式以满足可见性（触控区 ≥44×44 px，浅色/深色场景均可辨识）。  
3. 更新单元测试：断言存在内置图标类型、点击调用 `uni.navigateBack()`。  
4. 运行视觉回归测试，生成并保存基线截图（包含浅色/深色头图场景）。  
5. 提交 PR，附带视觉差异截图并请求审查。

## 输出物（Phase 1 输出）

- `specs/7-uni-back-btn/research.md`  
- `specs/7-uni-back-btn/data-model.md`（UI 说明）  
- `specs/7-uni-back-btn/quickstart.md`（实现步骤）  
- 更新后的单元测试与视觉基线截图

## 风险与缓解

- 若内置图标在某平台显示异常：通过样式或条件渲染选择替代内置类型并记录差异；必要时回退为浅色填充圆形以保证可见性。  
- 测试环境差异：在 HBuilderX 与微信模拟器上分别验证并记录差异。

## 状态

- Phase 0：完成（研究与决策）  
- Phase 1：准备执行（待开发与测试）


