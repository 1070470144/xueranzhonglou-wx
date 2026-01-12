# 组件契约：返回按钮接口（中文）

**功能**：优化详情页返回箭头，使用内置图标与 Google 风格外观  
**组件**：BackButton  
**位置**：`xueran/pages/detail/detail.vue`

## 接口定义

### Props
```typescript
interface BackButtonProps {
  // 图标配置
  iconType: 'left' | 'back' | 'arrow-left';  // 必须使用内置 uni-icons 类型
  iconSize: number;                         // 图标大小（像素，默认：24）
  iconColor: string;                        // 图标颜色（默认：'#333'）

  // 可访问性
  ariaLabel: string;                        // 无障碍标签（默认：'返回'）
  role: string;                             // ARIA 角色（默认：'button'）

  // 交互
  disabled?: boolean;                       // 禁用状态（默认：false）
  loading?: boolean;                        // 加载状态（默认：false）
}
```

### 事件
```typescript
interface BackButtonEvents {
  click: () => void;    // 点击时触发
  navigate: () => void; // 成功导航后触发（可选）
}
```

### 方法
```typescript
interface BackButtonMethods {
  focus(): void;        // 聚焦按钮（无障碍）
  blur(): void;         // 取消聚焦
}
```

## 实现约定

### 视觉约定
- **图标**：必须使用 `<uni-icons>` 内置图标类型（不使用外部图片）  
- **尺寸**：触控目标最小为 44×44 px（推荐容器 48×48 px）  
- **位置**：位于页面头部左上角  
- **样式**：使用半透明背景与轻微阴影以保证在图片头图或深色背景下可见

### 功能约定
- **导航**：点击必须调用 `uni.navigateBack()` 返回上一页  
- **错误处理**：导航失败时应有优雅回退（日志或轻量提示）  
- **可访问性**：支持屏幕阅读器与键盘操作（保留 aria-label 与 role）

### 性能约定
- **加载成本**：不影响页面加载性能（UI 响应 < 100ms）  
- **包体**：不新增依赖（使用内置组件）  
- **渲染**：跨平台渲染一致

## 测试契约

### 单元测试
```javascript
describe('BackButton', () => {
  it('渲染 uni-icons 组件', () => {
    // 验证 uni-icons 被渲染
  });

  it('点击时调用 navigateBack', () => {
    // 验证导航函数被调用
  });

  it('保持无障碍属性', () => {
    // 验证 aria-label 与 role
  });
});
```

### 视觉测试
```javascript
describe('BackButton 视觉', () => {
  it('在所有目标平台上渲染一致', () => {
    // 截图比对测试
  });

  it('保持最小触控尺寸', () => {
    // 验证触控目标 >= 44x44px
  });
});
```

## 兼容性

- ✅ 微信小程序  
- ✅ HBuilderX 预览  
- ✅ uni-app 跨平台

## 浏览器/设备支持（参考）

- iOS Safari（若干版本）  
- Android Chrome（若干版本）  
- 微信内置浏览器

## 迁移说明

**从**：当前实现（已使用 uni-icons）  
**到**：显式记录使用内置图标的实现与视觉契约  
**破坏性变更**：无  
**弃用**：无
