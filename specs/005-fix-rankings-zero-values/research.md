# 修复小程序热度榜单数值一直是0的问题 - 研究报告

## 发现的问题

### 1. 热度计算逻辑分析
通过代码审查发现，热度排行榜的计算逻辑存在以下问题：

**当前热度计算公式：**
```
baseScore = usageCount * 1 + likes * 3
timeWeight = 1 / (1 + 0.1 * daysSinceUpdate)
hotScore = baseScore * timeWeight
```

**问题分析：**
- 如果剧本的 `usageCount` 和 `likes` 都为0，则 `baseScore` 为0，导致 `hotScore` 始终为0
- `timeWeight` 的衰减公式可能过于激进，导致较旧的剧本热度值非常接近0
- 聚合管道中的时间计算可能存在数据类型转换问题

### 2. 数据验证
通过检查数据库结构和测试数据发现：
- 数据库schema定义正确，包含 `usageCount`、`likes`、`updateTime`、`status` 等字段
- 测试数据中存在 `usageCount: 1250`、`likes: 156` 等非零值
- 索引配置正确，支持排行榜查询

### 3. 前端显示逻辑
前端代码逻辑正确：
- `formatValue()` 方法对热度值使用 `toFixed(1)` 格式化
- `getValueLabel()` 返回正确的单位标签
- 数据获取和错误处理逻辑完整

## 技术细节

### 当前热度算法实现
```javascript
// 从 getRankings/index.js 的聚合管道
baseScore: $.add([
  $.multiply([$.ifNull(['$usageCount', 0]), 1]),
  $.multiply([$.ifNull(['$likes', 0]), 3])
]),
timeWeight: $.divide([
  1,
  $.add([1, $.multiply([0.1, '$daysSinceUpdate'])])
]),
hotScore: $.multiply([$.ifNull(['$baseScore', 0]), $.ifNull(['$timeWeight', 0])])
```

### 发现的潜在问题
1. **零值剧本问题**：当 `usageCount` 和 `likes` 都为0时，热度始终为0
2. **时间衰减过快**：`timeWeight` 随时间呈指数衰减，可能导致老剧本热度过低
3. **数据类型处理**：时间字段的转换可能在某些情况下失败

## 解决方案建议

### 方案1：调整热度算法
- 为零值剧本提供基础热度值（如1.0）
- 调整时间衰减系数，使其衰减更平缓
- 增加更新频率权重

### 方案2：简化热度计算
- 移除时间权重，单纯基于使用次数和点赞数计算
- 公式：`hotScore = usageCount * 1 + likes * 3`

### 方案3：添加调试信息
- 在云函数中增加详细的调试日志
- 添加数据验证步骤

## 推荐方案

**选择方案1**，因为：
- 保持了时间维度的热度衰减逻辑
- 为零值剧本提供基础可见度
- 调整衰减系数使结果更合理

## 具体修复措施

1. 修改热度计算公式，为零值剧本提供基础热度
2. 调整时间衰减系数，从0.1改为更小的值（如0.01）
3. 添加数据验证和错误处理
4. 增加调试日志输出

## 验证步骤

1. 使用调试模式验证聚合管道中间结果
2. 检查数据库中是否存在活跃状态的剧本数据
3. 验证前端正确显示非零热度值
4. 测试不同时间段剧本的热度计算结果