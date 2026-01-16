# 测试流程：热度排行榜功能 (US3)

**用户故事**: US3 - 查看热度排行榜
**测试目标**: 验证热度排行榜使用正确的算法计算热度分数，按热度降序排列
**测试环境**: 小程序开发工具 / 真机 + 数据库查询工具

## 前置条件

1. 已完成US1和US2的实现和测试
2. 小程序排行榜页面支持三种排行榜切换
3. scripts集合中至少有10个剧本，包含不同的updateTime和使用/点赞数据
4. 了解热度算法：热度 = (使用次数 × 1 + 点赞数 × 3) × e^(-0.1 × 天数)

## 测试步骤

### 基本功能测试

1. **选项卡切换测试**
   - 从其他排行切换到"热度排行"
   - 验证选项卡高亮状态正确
   - 检查页面显示"热度值"标签

2. **数据加载测试**
   - 等待热度排行数据加载完成
   - 验证数据加载成功，无错误提示
   - 检查排行榜列表正常显示

3. **显示格式验证**
   - 验证热度值显示为小数格式（保留1位小数）
   - 检查"热度值"标签正确显示
   - 确认奖牌和排名显示与前两个排行一致

### 热度算法验证

4. **算法正确性测试**
   - 准备已知数据的测试剧本
   - 手动计算每个剧本的热度分数
   - 验证小程序显示的热度值与手动计算结果一致

5. **时间权重测试**
   - 测试不同updateTime的剧本：
     - 今天更新的剧本（权重≈1.0）
     - 3天前更新的剧本（权重≈0.74）
     - 7天前更新的剧本（权重≈0.50）
     - 30天前更新的剧本（权重≈0.05）
   - 验证时间权重正确应用

6. **排序验证**
   - 检查排行榜按热度分数降序排列
   - 验证相同热度分数的排序稳定
   - 确认排序结果与预期一致

### 数据边界测试

7. **极端值测试**
   - 测试使用次数和点赞数都为0的剧本
   - 测试使用次数或点赞数很大的剧本
   - 测试updateTime为很久以前的剧本

8. **时间边界测试**
   - 测试刚创建的剧本（updateTime为当前时间）
   - 测试很久没有更新的剧本
   - 测试updateTime为空或无效的情况

### 算法性能测试

9. **计算性能验证**
   - 测试大量剧本（100+）时的计算时间
   - 验证计算结果的准确性
   - 检查是否有性能瓶颈

## 验收标准

### ✅ 通过标准

**算法正确性**
- [ ] 热度分数计算公式正确：(usage × 1 + likes × 3) × timeWeight
- [ ] 时间权重计算正确：e^(-0.1 × days)
- [ ] 排序结果与手动计算完全一致

**功能完整性**
- [ ] 热度排行数据加载正常
- [ ] 数值显示格式正确（1位小数）
- [ ] UI显示与前两个排行保持一致

**性能表现**
- [ ] 大数据量计算时间合理（< 3秒）
- [ ] 排序结果稳定准确
- [ ] 无计算错误或异常

### ❌ 失败标准

- [ ] 热度分数计算错误
- [ ] 时间权重应用错误
- [ ] 排序结果不正确
- [ ] 数值显示格式错误
- [ ] 性能不符合要求

## 测试数据准备

### 标准测试数据集

准备以下测试数据验证算法：

| 剧本ID | 使用次数 | 点赞数 | 更新天数 | 预期热度值 | 排名 |
|--------|----------|--------|----------|------------|------|
| script_001 | 1000 | 100 | 0 | 1300.0 | 1 |
| script_002 | 800 | 80 | 1 | ~960.5 | 2 |
| script_003 | 600 | 60 | 3 | ~648.6 | 3 |
| script_004 | 400 | 40 | 7 | ~245.2 | 4 |
| script_005 | 200 | 20 | 14 | ~55.4 | 5 |
| script_006 | 100 | 10 | 30 | ~2.7 | 6 |

**计算说明**：
- script_001: (1000×1 + 100×3) × e^(0) = 1300 × 1 = 1300.0
- script_002: (800×1 + 80×3) × e^(-0.1×1) = 1040 × 0.905 = 941.2
- script_003: (600×1 + 60×3) × e^(-0.1×3) = 780 × 0.741 = 577.98
- 以此类推...

### 手动验证脚本

```javascript
// 热度计算验证函数
function calculateHotScore(usageCount, likes, daysSinceUpdate) {
  const baseScore = usageCount * 1 + likes * 3;
  const timeWeight = Math.pow(Math.E, -0.1 * daysSinceUpdate);
  return Math.round(baseScore * timeWeight * 10) / 10;
}

// 测试数据验证
const testData = [
  { usage: 1000, likes: 100, days: 0, expected: 1300.0 },
  { usage: 800, likes: 80, days: 1, expected: 941.2 },
  { usage: 600, likes: 60, days: 3, expected: 578.0 }
];

testData.forEach((data, index) => {
  const actual = calculateHotScore(data.usage, data.likes, data.days);
  console.log(`Test ${index + 1}: Expected ${data.expected}, Actual ${actual}`);
});
```

## 算法详细验证

### 时间权重计算验证

```javascript
// 验证时间权重计算
function verifyTimeWeight() {
  const testCases = [
    { days: 0, expected: 1.0 },
    { days: 1, expected: 0.905 },
    { days: 3, expected: 0.741 },
    { days: 7, expected: 0.497 },
    { days: 14, expected: 0.247 },
    { days: 30, expected: 0.0498 }
  ];

  testCases.forEach(test => {
    const actual = Math.pow(Math.E, -0.1 * test.days);
    console.log(`Days: ${test.days}, Expected: ${test.expected.toFixed(3)}, Actual: ${actual.toFixed(3)}`);
  });
}
```

### 排序稳定性测试

1. 准备两个热度分数相同的剧本
2. 验证排序结果稳定（相同分数按ID排序）
3. 检查排名连续性

## 性能基准

- **小数据集（<50剧本）**: 计算时间 < 1秒
- **大数据集（100-500剧本）**: 计算时间 < 3秒
- **内存使用**: < 100MB
- **准确率**: 100%（与手动计算完全一致）

## 与前两个排行的对比

- **数据获取**: 使用相同的API接口和缓存机制
- **UI显示**: 保持一致的列表布局和交互
- **错误处理**: 使用相同的错误处理策略
- **性能**: 类似的数据加载和显示性能

## 调试和故障排除

### 常见问题

1. **热度值不准确**
   - 检查updateTime字段是否正确
   - 验证时间权重计算
   - 确认基础分数计算正确

2. **排序错误**
   - 检查聚合管道语法
   - 验证sort参数
   - 确认数据类型一致性

3. **性能问题**
   - 检查索引是否生效
   - 验证查询条件
   - 确认聚合管道优化

### 调试工具

```javascript
// 在云函数中添加调试日志
console.log('Hot ranking calculation for script:', scriptId);
console.log('Usage:', usageCount, 'Likes:', likes, 'Days:', daysSinceUpdate);
console.log('Base score:', baseScore, 'Time weight:', timeWeight);
console.log('Final hot score:', hotScore);
```

## 备注

- 热度算法对时间权重非常敏感，测试时需要精确控制updateTime
- 建议在测试环境中准备固定的测试数据，避免数据变化影响测试结果
- 算法验证需要同时进行手动计算和自动化验证