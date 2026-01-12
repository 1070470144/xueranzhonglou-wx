# 快速入门（中文）：参考 Google 风格优化返回按钮

**功能**：006-fix-detail-back-btn（视觉优化）  
**预估工时**：30–90 分钟  
**风险等级**：极低（仅 CSS 与注释修改）

## 前置条件

- 分支 `006-fix-detail-back-btn` 已检出  
- 可访问 `xueran/pages/detail/detail.vue`  
- 本地已配置 uni-app 开发环境与测试工具（Vitest、视觉测试脚本）

## 实施步骤

1. 打开 `xueran/pages/detail/detail.vue`，定位 `.back-btn` 容器与内部 `<uni-icons>`。  
2. 修改样式以接近 Google App（Material）风格：  
   - 容器：`width: 48px; height: 48px; border-radius: 50%; padding: 8px;`  
   - 背景：`background-color: rgba(255,255,255,0.92);`（半透明以提高在图片头图上的可读性）  
   - 阴影：`box-shadow: 0 1px 6px rgba(0,0,0,0.12);`  
   - 按下反馈：`transform: scale(0.96); background-color: rgba(0,0,0,0.06);`  
   - 响应式回退：当头部空间受限或标题碰撞时，使用 `border-radius: 12px` 作为回退样式。  
3. 保持 `<uni-icons type="left" :size="24" />` 不变，确保图标水平垂直居中。  
4. 在模板中添加中文注释，说明采用 Google 风格及回退策略。  
5. 更新单元测试 `xueran/tests/pages/detail/detail.test.js`，增加断言以验证 `back-btn` 类存在、图标类型与尺寸保持不变，并验证点击触发 `uni.navigateBack()`。  
6. 运行视觉测试，生成并保存新的基线截图（包括浅色头图与深色头图场景）。

## 常用命令

```bash
# 执行 detail 页面单元测试
cd xueran && npm test -- xueran/tests/pages/detail/detail.test.js

# 运行视觉测试（项目脚本）
npm run test:visual
```

## 验证清单（发布前需通过）

- [ ] 返回按钮视觉为圆形（48×48），图标居中且为 24px  
- [ ] 触控目标 >= 44×44 px  
- [ ] 按下反馈存在且自然（scale 或暗色遮罩）  
- [ ] 窄屏或长标题场景下不会遮挡标题（已启用回退样式）  
- [ ] 浅色/深色头图场景的视觉基线截图已生成并通过比对  
- [ ] 单元测试与视觉测试均通过

## 回滚计划

如发生问题，回滚至上一个提交并调查 uni-icons 在特定平台的加载或样式问题；必要时临时恢复为文本按钮以保证导航可用。

# Quick Start: Optimize Detail Page Back Arrow with Built-in Icons

**Feature**: 006-fix-detail-back-btn
**Estimated Effort**: 2-4 hours
**Risk Level**: Low (UI-only change)

## Prerequisites

- [x] Feature specification approved
- [x] Branch `006-fix-detail-back-btn` created
- [x] uni-app development environment set up
- [x] Access to `xueran/pages/detail/detail.vue`

## Implementation Steps

### Step 1: Verify Current Implementation (15 minutes)

```bash
# Check current back button implementation
code xueran/pages/detail/detail.vue
```

**Expected**: Back button already uses `<uni-icons type="left" :size="24" color="#333"></uni-icons>`

### Step 2: Run Existing Tests (10 minutes)

```bash
# Ensure current tests pass
npm test -- xueran/tests/pages/detail/detail.test.js
```

### Step 3: Update Implementation (30 minutes)

**File**: `xueran/pages/detail/detail.vue`

No code changes required - current implementation already meets requirements:
- ✅ Uses `uni-icons` component
- ✅ Uses built-in "left" icon type
- ✅ Maintains 24px size
- ✅ Preserves accessibility attributes
- ✅ Keeps navigation functionality

### Step 4: Add Documentation Comments (15 minutes)

Add comments to document the built-in icon usage:

```vue
<!-- Back button using uni-app built-in icons for cross-platform compatibility -->
<view class="back-btn" @click="goBack" role="button" :aria-label="'返回'" title="返回">
  <!-- Using uni-icons component as required by UNI-APP-FIRST principle -->
  <uni-icons type="left" :size="24" color="#333"></uni-icons>
</view>
```

### Step 5: Update Tests (30 minutes)

**File**: `xueran/tests/pages/detail/detail.test.js`

Add test to explicitly verify uni-icons usage:

```javascript
describe('BackButton Icon Usage', () => {
  it('uses built-in uni-icons component', () => {
    const wrapper = mount(DetailPage);
    const icon = wrapper.find('uni-icons');
    expect(icon.exists()).toBe(true);
    expect(icon.attributes('type')).toBe('left');
  });
});
```

### Step 6: Visual Regression Test (20 minutes)

```bash
# Run visual tests to ensure no layout changes
npm run test:visual
```

### Step 7: Cross-Platform Testing (30 minutes)

Test on both platforms:
- [ ] HBuilderX preview
- [ ] WeChat Mini Program simulator

## Verification Checklist

- [ ] Back button visible and clickable
- [ ] Icon renders correctly (left-pointing arrow)
- [ ] Navigation works (returns to previous page)
- [ ] Accessibility attributes present
- [ ] Touch target meets minimum size (44x44px)
- [ ] No visual regressions
- [ ] Tests pass with >90% coverage

## Rollback Plan

If issues arise:
1. Revert to previous commit on branch
2. Check if uni-icons component has platform-specific issues
3. Consider fallback to basic text button if icon fails to load

## Success Criteria

✅ **Feature Complete**: Back button uses built-in uni-icons component
✅ **No Regressions**: All existing functionality preserved
✅ **Performance**: No impact on load times
✅ **Compatibility**: Works on all target platforms
✅ **Accessibility**: Meets WCAG guidelines
✅ **Test Coverage**: All tests pass with required coverage

## Next Steps

After implementation:
1. Create pull request with visual diff screenshots
2. Request code review from maintainers
3. Merge after approval and CI passes
4. Close related issue/ticket
