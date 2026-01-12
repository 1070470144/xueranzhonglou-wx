# Uni-App 多页面导航配置问题解决方案

## 问题描述

项目出现以下错误：
```
当前项目为单页面工程，不能执行页面跳转api。如果需进行页面跳转，需要在pages.json文件的pages字段中配置多个页面，然后重新运行。
```

## 解决方案概览

### ✅ 已完成的配置

1. **多页面配置**: 在 `pages.json` 中配置了4个页面
2. **页面文件**: 创建了对应的Vue页面组件
3. **TabBar导航**: 配置了底部导航栏
4. **测试覆盖**: 为所有页面创建了测试用例

### 🔧 解决步骤

#### 步骤1: 清除项目缓存
```bash
# 在HBuilderX中执行
菜单 -> 运行 -> 清除缓存
# 或删除以下目录
rm -rf unpackage/
```

#### 步骤2: 重新编译项目
```bash
# 在HBuilderX中
点击"运行" -> "运行到小程序模拟器"
# 或
点击"发行" -> "小程序-微信"
```

#### 步骤3: 验证配置
检查以下文件是否正确配置：

**pages.json 配置验证:**
```json
{
  "pages": [
    {
      "path": "pages/exhibition/exhibition",
      "style": {
        "navigationBarTitleText": "剧本展览",
        "navigationStyle": "custom"
      }
    },
    {
      "path": "pages/rankings/rankings",
      "style": {
        "navigationBarTitleText": "剧本排行榜",
        "navigationStyle": "custom"
      }
    },
    {
      "path": "pages/detail/detail",
      "style": {
        "navigationBarTitleText": "剧本详情",
        "navigationStyle": "custom"
      }
    }
  ],
  "tabBar": {
    "list": [
      {
        "pagePath": "pages/exhibition/exhibition",
        "text": "展览"
      },
      {
        "pagePath": "pages/rankings/rankings",
        "text": "排行"
      }
    ]
  }
}
```

#### 步骤4: 测试页面跳转

**测试代码示例:**
```javascript
// 在页面中测试跳转
uni.navigateTo({
  url: '/pages/detail/detail?id=123',
  success: () => {
    console.log('跳转成功')
  },
  fail: (err) => {
    console.error('跳转失败:', err)
  }
})
```

## 文件结构

```
xueran/
├── pages.json                    # ✅ 已配置多页面和TabBar
├── pages/
│   ├── exhibition/exhibition.vue # ✅ 剧本展览页面
│   ├── rankings/rankings.vue     # ✅ 剧本排行榜页面
│   └── detail/detail.vue         # ✅ 剧本详情页面
├── static/
│   └── logo.png
└── tests/pages/                  # ✅ 页面测试用例
    ├── exhibition/
    ├── rankings/
    └── detail/
```

## 常见问题排查

### 问题1: 页面跳转仍然失败
**检查项:**
- [ ] pages.json 中的页面路径是否正确
- [ ] 对应的 .vue 文件是否存在
- [ ] 文件路径大小写是否正确
- [ ] HBuilderX 是否重新编译

### 问题2: TabBar不显示
**检查项:**
- [ ] tabBar 配置是否正确
- [ ] pagePath 是否与 pages.json 中的页面路径匹配
- [ ] 是否至少配置了2个页面

### 问题3: 页面样式异常
**检查项:**
- [ ] navigationStyle 设置是否正确
- [ ] 页面组件是否有语法错误
- [ ] CSS样式是否正确加载

## 验收测试

### 功能测试
1. **页面跳转测试**
   - [ ] 从展览页跳转到详情页
   - [ ] 从排行榜页跳转到详情页
   - [ ] 返回导航正常工作

2. **TabBar测试**
   - [ ] 底部TabBar正确显示
   - [ ] Tab切换正常工作
   - [ ] 选中状态正确显示

3. **参数传递测试**
   - [ ] 页面间参数正确传递
   - [ ] 参数在目标页面正确接收

### 性能测试
- [ ] 页面切换时间 < 300ms
- [ ] 无卡顿或闪烁
- [ ] 内存使用正常

## 技术规范

### 页面配置规范
- 页面路径: `pages/{页面名}/{页面名}.vue`
- 导航栏: 自定义样式 (`navigationStyle: "custom"`)
- 启动页: 展览页面 (`pages/exhibition/exhibition`)

### API使用规范
```javascript
// 页面跳转
uni.navigateTo({
  url: '/pages/detail/detail?id=123&name=test'
})

// 返回上一页
uni.navigateBack({
  delta: 1
})

// TabBar切换
uni.switchTab({
  url: '/pages/rankings/rankings'
})
```

## 后续优化建议

1. **图标资源**: 为TabBar添加自定义图标
2. **页面预加载**: 优化页面切换性能
3. **错误处理**: 添加页面不存在的错误处理
4. **缓存策略**: 实现页面数据缓存

## 支持与反馈

如果按照此解决方案仍然遇到问题，请检查：
1. HBuilderX版本是否 >= 3.6.0
2. uni-app版本是否 >= 4.36
3. 微信开发者工具是否为最新版本

---

**状态**: ✅ 配置完成，等待测试验证
**分支**: `1-uniapp-page-navigation`
**负责人**: 开发团队
