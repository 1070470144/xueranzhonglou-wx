# 快速开始：微信小程序转发功能

**功能**: 011-wechat-share
**日期**: 2026-01-22

## 功能验证

### 1. 转发按钮测试
1. 打开微信小程序，进入任意剧本详情页面
2. 检查页面底部是否有"分享剧本"按钮
3. 点击按钮，确认能触发转发菜单

### 2. 右上角转发测试
1. 在剧本详情页面，点击右上角"..."按钮
2. 确认菜单中包含"转发"选项
3. 点击转发，确认能正常弹出转发界面

### 3. 转发内容验证
1. 触发转发后，检查转发预览内容：
   - ✅ 标题格式：`{剧本标题} - {作者}`
   - ✅ 包含剧本封面图片
   - ✅ 描述信息完整


## 技术实现要点

### 前端代码
```javascript
// 页面加载时启用转发
onLoad() {
  this.enableShareMenu();
  this.loadScriptDetail();
}

// 转发菜单启用
enableShareMenu() {
  // #ifdef MP-WEIXIN
  wx.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline']
  });
  // #endif
}

// 转发内容配置
onShareAppMessage() {
  return {
    title: `${this.script.title} - ${this.script.author}`,
    path: `/pages/script-detail/script-detail?id=${this.scriptId}`,
    imageUrl: this.script.images[0]
  };
}
```


## 注意事项

1. **平台兼容**: 转发功能仅在微信小程序中可用
2. **条件编译**: 使用 `#ifdef MP-WEIXIN` 确保只在微信环境中执行
3. **错误处理**: 转发功能失败不影响其他页面功能

## 常见问题

### Q: 转发按钮不显示？
A: 确认在微信小程序环境中运行，检查条件编译是否正确。

### Q: 转发内容不完整？
A: 检查 `onShareAppMessage` 返回的数据格式是否正确。

通过以上验证，微信小程序转发功能即可正常使用！ 🎉
