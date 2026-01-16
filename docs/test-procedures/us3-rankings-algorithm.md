# 测试流程：热度算法验证 (US3)

**用户故事**: US3 - 查看热度排行榜
**测试目标**: 精确验证热度计算公式的每个步骤，确保算法实现100%正确
**测试环境**: 数据库查询工具 + 计算器/编程环境 + 小程序测试

## 前置条件

1. 完全理解热度算法公式：
   ```
   热度分数 = (使用次数 × 1 + 点赞数 × 3) × 时间权重
   时间权重 = e^(-0.1 × 天数)
   ```

2. 准备精确的测试数据集
3. 确保updateTime字段格式正确（Date类型或ISO字符串）
4. 当前时间已知且稳定

## 测试步骤

### 步骤1: 准备测试数据

创建精确的测试数据集：

```javascript
// 测试剧本数据（插入到scripts集合）
const testScripts = [
  {
    _id: "hot_test_001",
    title: "新热门剧本",
    author: "测试作者",
    usageCount: 100,
    likes: 50,
    updateTime: new Date(), // 现在
    status: "active"
  },
  {
    _id: "hot_test_002",
    title: "三天前热门",
    author: "测试作者",
    usageCount: 200,
    likes: 30,
    updateTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3天前
    status: "active"
  },
  {
    _id: "hot_test_003",
    title: "一周前热门",
    author: "测试作者",
    usageCount: 300,
    likes: 20,
    updateTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7天前
    status: "active"
  }
];
```

### 步骤2: 手动计算预期结果

使用当前时间点，手动计算每个剧本的热度分数：

```javascript
// 手动计算函数
function manualHotScore(usageCount, likes, updateTime, currentTime) {
  // 1. 计算基础分数
  const baseScore = usageCount * 1 + likes * 3;

  // 2. 计算天数差
  const daysDiff = (currentTime - new Date(updateTime)) / (1000 * 60 * 60 * 24);

  // 3. 计算时间权重
  const timeWeight = Math.pow(Math.E, -0.1 * daysDiff);

  // 4. 计算最终热度
  const hotScore = baseScore * timeWeight;

  return {
    baseScore,
    daysDiff,
    timeWeight,
    hotScore,
    roundedHotScore: Math.round(hotScore * 10) / 10 // 保留1位小数
  };
}

// 计算结果
const currentTime = new Date();
const results = testScripts.map(script => ({
  id: script._id,
  ...manualHotScore(script.usageCount, script.likes, script.updateTime, currentTime)
}));

console.table(results);
```

**预期计算结果示例**：
- hot_test_001: baseScore=250, daysDiff=0, timeWeight=1.0, hotScore=250.0
- hot_test_002: baseScore=290, daysDiff=3, timeWeight≈0.741, hotScore≈215.0
- hot_test_003: baseScore=360, daysDiff=7, timeWeight≈0.497, hotScore≈179.0

### 步骤3: 验证数据库聚合结果

直接查询数据库聚合结果：

```javascript
// 在云数据库中执行聚合查询验证
db.collection('scripts').aggregate([
  {
    $match: { status: 'active' }
  },
  {
    $addFields: {
      daysSinceUpdate: {
        $divide: [
          { $subtract: [new Date(), '$updateTime'] },
          1000 * 60 * 60 * 24
        ]
      },
      timeWeight: {
        $pow: [Math.E, { $multiply: ['$daysSinceUpdate', -0.1] }]
      },
      baseScore: {
        $add: ['$usageCount', { $multiply: ['$likes', 3] }]
      },
      hotScore: {
        $multiply: ['$baseScore', '$timeWeight']
      }
    }
  },
  {
    $sort: { hotScore: -1 }
  },
  {
    $limit: 20
  },
  {
    $project: {
      _id: 1,
      title: 1,
      baseScore: 1,
      daysSinceUpdate: 1,
      timeWeight: 1,
      hotScore: 1
    }
  }
])
```

### 步骤4: 验证云函数API结果

调用getRankings云函数验证结果：

```javascript
// 测试API调用
const result = await uniCloud.callFunction({
  name: 'getRankings',
  data: { type: 'hot', limit: 20 }
});

console.log('API Response:', result.result);

// 验证每个剧本的热度值
result.result.data.forEach(item => {
  console.log(`Script ${item.scriptId}: ${item.value}`);
});
```

### 步骤5: 端到端验证

1. **小程序显示验证**
   - 打开排行榜页面
   - 切换到"热度排行"
   - 记录显示的热度值
   - 与手动计算结果比较

2. **排序验证**
   - 确认按热度值降序排列
   - 验证排名计算正确
   - 检查奖牌显示

3. **数据一致性验证**
   - 确保所有中间步骤结果一致：
     - 手动计算 = 数据库聚合 = 云函数计算 = 小程序显示

## 验收标准

### ✅ 通过标准

**算法正确性**
- [ ] 基础分数计算正确：usageCount × 1 + likes × 3
- [ ] 天数差计算准确
- [ ] 时间权重计算精确：e^(-0.1 × days)
- [ ] 最终热度值与手动计算误差 < 0.1

**数据一致性**
- [ ] 数据库聚合结果与手动计算一致
- [ ] 云函数返回结果与聚合结果一致
- [ ] 小程序显示值与API结果一致

**排序正确性**
- [ ] 按热度值降序排列
- [ ] 排名连续且正确
- [ ] 相同热度值排序稳定

### ❌ 失败标准

- [ ] 任何计算步骤结果不准确
- [ ] 数据在不同环节不一致
- [ ] 排序结果错误
- [ ] 数值显示格式错误

## 高级验证测试

### 边界值测试

1. **时间边界**
   ```javascript
   // 测试各种时间差
   const timeTests = [
     { days: 0, expectedWeight: 1.0 },
     { days: 0.5, expectedWeight: Math.pow(Math.E, -0.05) },
     { days: 1, expectedWeight: Math.pow(Math.E, -0.1) },
     { days: 10, expectedWeight: Math.pow(Math.E, -1) },
     { days: 50, expectedWeight: Math.pow(Math.E, -5) }
   ];
   ```

2. **数值边界**
   ```javascript
   // 测试极端数值
   const valueTests = [
     { usage: 0, likes: 0, expectedBase: 0 },
     { usage: 1000000, likes: 100000, expectedBase: 1300000 },
     { usage: 1, likes: 1, expectedBase: 4 }
   ];
   ```

### 性能测试

1. **计算性能**
   - 测试100个剧本的计算时间
   - 验证聚合查询性能
   - 检查内存使用情况

2. **并发测试**
   - 模拟多个用户同时请求
   - 验证缓存机制有效性
   - 检查数据库查询压力

## 调试和故障排除

### 常见问题诊断

1. **热度值不匹配**
   ```javascript
   // 添加调试日志
   console.log('Debug calculation:', {
     usageCount,
     likes,
     updateTime,
     currentTime,
     daysDiff,
     baseScore,
     timeWeight,
     hotScore
   });
   ```

2. **时间计算错误**
   ```javascript
   // 验证时间差计算
   const updateTime = new Date(script.updateTime);
   const now = new Date();
   const daysDiff = (now - updateTime) / (1000 * 60 * 60 * 24);
   console.log('Time debug:', { updateTime, now, daysDiff });
   ```

3. **排序问题**
   ```javascript
   // 检查排序前的原始数据
   const rawData = await db.collection('scripts')
     .aggregate([/* 聚合管道，但不排序 */])
     .end();
   console.log('Raw hot scores:', rawData.data.map(d => ({
     id: d._id,
     hotScore: d.hotScore
   })));
   ```

## 自动化测试脚本

创建完整的自动化验证脚本：

```javascript
// complete-hot-ranking-test.js
async function runHotRankingTest() {
  console.log('=== 热度排行榜算法验证测试 ===');

  // 1. 准备测试数据
  await prepareTestData();

  // 2. 手动计算预期结果
  const expectedResults = calculateExpectedResults();

  // 3. 获取数据库聚合结果
  const dbResults = await getDatabaseResults();

  // 4. 获取API结果
  const apiResults = await getAPIResults();

  // 5. 比较所有结果
  const testPassed = compareResults(expectedResults, dbResults, apiResults);

  console.log(`测试结果: ${testPassed ? '✅ 通过' : '❌ 失败'}`);
  return testPassed;
}
```

## 文档和维护

### 算法变更记录
- v1.0: 基础算法 (使用次数 × 1 + 点赞数 × 3) × 时间权重
- 时间权重: e^(-0.1 × 天数)

### 监控要点
- 定期验证算法准确性
- 监控计算性能
- 跟踪用户反馈和数据分布

## 备注

- 热度算法对时间精度要求很高，确保服务器时间同步
- 测试数据应该定期更新以反映真实的updateTime分布
- 建议建立自动化监控，定期验证算法正确性