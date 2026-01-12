# Implementation Plan: Optimize Detail Page Back Arrow with Built-in Icons

**Branch**: `006-fix-detail-back-btn` | **Date**: 2026-01-12 | **Spec**: [specs/006-fix-detail-back-btn/spec.md](specs/006-fix-detail-back-btn/spec.md)
**Input**: Feature specification from `/specs/006-fix-detail-back-btn/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## 概要

目标：参考 Google 应用（Material 风格），对剧本详情页左上角的返回按钮进行视觉优化，使其更符合现代移动端设计规范并提升触控可用性。要求：

- 继续使用 uni-app 内置的 `uni-icons` 组件（不引入自定义图标）；
- 将按钮容器改为圆形表现（直径 48px），图标保持 24px；在标题空间受限时回退为圆角矩形（border-radius: 12px）以避免遮挡；
- 添加轻微阴影与半透明背景，保证在浅色/深色头图上均可见且不遮挡主要内容；
- 保持现有导航行为（调用 `uni.navigateBack()`）与可访问性属性（`aria-label`、`role`）；
- 后续所有文档（research.md、data-model.md、quickstart.md 等）均以中文书写。

## 技术上下文

**语言/版本**：Vue.js（uni-app），本次为组件级样式调整（不修改 JS 运行逻辑）  
**主要依赖**：uni-app、uni-icons 组件、Vue.js  
**存储**：无（仅 UI 更改）  
**测试**：Vitest（单元测试），项目现有视觉回归测试（将新增返回按钮基线截图）  
**目标平台**：微信小程序、HBuilderX 预览，跨平台 uni-app  
**项目类型**：移动混合应用（uni-app）  
**性能目标**：UI 响应时间 ≤ 100ms，不增加包体积  
**约束**：遵守项目宪法（优先使用内置组件），避免在窄屏或长标题场景造成布局挤压或遮挡  
**规模/范围**：单页面样式调整为主，涉及 `xueran/pages/detail/detail.vue` 中的 CSS 与注释更新，以及相关文档和视觉基线更新

## Constitution Check

*GATE: Must pass before Phase 0 research. ✅ PASSED after Phase 1 design.*

**UI Component Priority (UNI-APP-FIRST)**: ✅ PASS - Implementation uses uni-app's built-in uni-icons component exclusively. No custom components required.

**Test-First (TDD)**: ✅ PASS - Design includes unit tests for component verification and visual regression tests. Test coverage will be maintained above 90%.

**Cross-Platform Compatibility**: ✅ PASS - uni-icons component provides native cross-platform rendering for WeChat Mini Program and HBuilderX environments.

**Performance & Observability**: ✅ PASS - Built-in components are optimized; design maintains <100ms UI response time with no performance impact.

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
xueran/
├── pages/
│   └── detail/
│       └── detail.vue          # Target file for back button modification
├── tests/
│   └── pages/
│       └── detail/
│           └── detail.test.js  # Unit tests for detail page
└── components/                 # Shared components (if any changes needed)

tests/
├── visual/
│   └── baseline.spec.js        # Visual regression tests
└── setup.js                    # Test setup configuration
```

**Structure Decision**: This is a uni-app project with a clear separation between source code (xueran/) and tests. The change is isolated to a single Vue component file with corresponding test updates.

## Complexity Tracking

*No constitution violations - feature uses standard uni-app patterns and built-in components.*

## Implementation Status

- ✅ **Phase 0 (Research)**: Completed - No unknowns requiring clarification
- ✅ **Phase 1 (Design)**: Completed - Data model, contracts, and quickstart guide created
- ✅ **Phase 2 (Tasks)**: Ready - Implementation plan complete, proceed to `/speckit.tasks` command
