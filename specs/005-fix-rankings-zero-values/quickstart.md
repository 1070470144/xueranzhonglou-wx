# 修复热度榜单零值问题 - 快速开始指南

## 问题描述

小程序热度榜单显示的数值始终为0，导致用户无法看到剧本的真实热度信息。

## 解决方案概述

通过调整热度计算算法，为零值剧本提供最小热度保证，并优化时间衰减系数。

## 修复步骤

### 1. 修改热度计算逻辑

**文件位置：** `xueran/uniCloud-aliyun/cloudfunctions/getRankings/index.js`

**修改内容：**
```javascript
// 修改热度计算部分
baseScore: $.add([
  $.multiply([$.ifNull(['$usageCount', 0]), 1]),
  $.multiply([$.ifNull(['$likes', 0]), 3])
]),

// 调整时间衰减系数（从0.1改为0.01，使衰减更平缓）
timeWeight: $.divide([
  1,
  $.add([1, $.multiply([0.01, '$daysSinceUpdate'])])
]),

// 为零值剧本提供最小热度保证
hotScore: $.max([
  $.multiply([$.ifNull(['$baseScore', 0]), $.ifNull(['$timeWeight', 0])]),
  0.1  // 最小热度值
])
```

### 2. 测试修复效果

**验证步骤：**

1. **插入测试数据：**
   ```javascript
   // 在 uniCloud 控制台或 JQL 查询中执行
   db.collection('scripts').add({
     title: "测试剧本1",
     author: "测试作者",
     status: "active",
     usageCount: 100,
     likes: 20,
     updateTime: Date.now(),
     createTime: Date.now()
   });
   ```

2. **调用排行榜API：**
   ```javascript
   // 在小程序中切换到热度排行标签
   // 或在控制台调用云函数
   uniCloud.callFunction({
     name: 'getRankings',
     data: { type: 'hot', limit: 20, debug: true }
   });
   ```

3. **验证结果：**
   - 应该能看到非零的热度数值
   - 调试模式下会显示详细的计算过程
   - 零值剧本应该显示0.1的最小热度

### 3. 部署验证

**部署步骤：**

1. **上传云函数：**
   ```bash
   # 在 HBuilderX 中右键云函数目录，选择"上传"
   # 或使用 uniCloud 控制台上传
   ```

2. **小程序端测试：**
   - 清除缓存：设置 > 存储 > 清除缓存
   - 重启小程序
   - 访问排行榜页面，切换到"热度排行"
   - 验证数值不再为0

## 预期结果

修复后应该能够看到：

- ✅ 活跃剧本显示正确的热度数值
- ✅ 零值剧本显示最小热度0.1
- ✅ 时间衰减更加合理，不会过快衰减到0
- ✅ 调试模式提供详细的计算信息

## 回滚计划

如果修复出现问题，可以：

1. **恢复原始代码：**
   ```javascript
   // 移除 $.max() 调用和最小热度保证
   hotScore: $.multiply([$.ifNull(['$baseScore', 0]), $.ifNull(['$timeWeight', 0])])
   ```

2. **恢复时间衰减系数：**
   ```javascript
   // 从0.01改回0.1
   timeWeight: $.divide([
     1,
     $.add([1, $.multiply([0.1, '$daysSinceUpdate'])]))
   ```

## 监控要点

**关键指标：**
- 热度排行榜数值分布（不应全部为0）
- 零值剧本的最小热度保证（应为0.1）
- API响应时间（不应显著增加）
- 错误率（不应上升）

**日志检查：**
- 云函数控制台日志中的调试信息
- 前端错误日志
- 数据库查询性能