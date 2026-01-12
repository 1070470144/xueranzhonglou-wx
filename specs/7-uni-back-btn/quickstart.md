# 快速入门：将返回按钮替换为 uni-app 自带实现

**Feature**：7-uni-back-btn  
**预估工时**：30–60 分钟  
**风险等级**：低（UI 与少量测试）

## 步骤

1. 打开 `xueran/pages/detail/detail.vue`。  
2. 将返回控件替换为使用内置 `uni-icons`（优先 `chevron-left` 或 `left`）或直接调用 `uni.navigateBack()` 的标准实现。示例：

```vue
<view class="back-btn" @click="goBack" role="button" aria-label="返回">
  <uni-icons type="left" :size="24" color="#333" />
</view>

methods: {
  goBack() {
    uni.navigateBack()
  }
}
```

3. 更新样式以保证触控目标与对比度（触控区 ≥44×44 px，浅底时启用轻填充或边框）。  
4. 更新或添加单元测试：验证使用内置图标类型、点击触发 `uni.navigateBack()`。  
5. 运行视觉回归测试并保存基线截图（浅色/深色头图场景）。  
6. 提交 PR 并附带视觉差异截图，申请 Code Review。

## 验证清单

- [ ] 页面使用内置 `uni-icons` 或等效实现  
- [ ] 点击能成功返回上一页（手工或自动化验证）  
- [ ] 视觉基线截图已更新并通过比对


