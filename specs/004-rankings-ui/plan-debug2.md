# Implementation Plan: 调试排行榜功能错误 (第二阶段)

**Branch**: `004-rankings-ui` | **Date**: 2026-01-16 | **Spec**: [link to spec.md]
**Input**: Error: "DEBUG: API call failed with message: 获取排行榜失败 at utils\rankingsApi.js:50"

**Note**: 云函数执行出错，需深入调试云函数内部逻辑。

## Summary

排行榜功能在云函数执行阶段出错，返回"获取排行榜失败"消息。需要检查云函数逻辑，特别是数据库查询和聚合管道。

## Technical Context

**Error Location**: 云函数 `getRankings/index.js` catch块
**Error Message**: "获取排行榜失败"
**Possible Causes**:
1. 数据库查询失败 (collection不存在或权限问题)
2. 聚合管道语法错误
3. 数据字段不存在或格式不匹配
4. Math.E 在聚合管道中不可用

## Constitution Check

- **运行时约束**: 云函数在uniCloud环境中执行，语法需符合uniCloud规范
- **数据完整性**: 需验证scripts collection存在且字段完整
- **错误处理**: 需要更详细的错误日志来定位问题

## Project Structure

### Source Code (repository root)
```text
xueran/uniCloud-aliyun/cloudfunctions/getRankings/
├── index.js              # 主云函数 (有错误)
└── [test.js]             # 调试用，已删除
```

## Complexity Tracking

**当前问题**: 云函数执行失败
**优先级**: 高 - 核心功能无法使用

## Debug Steps

### Phase 1: 云函数调试

1. **添加详细错误日志**
   - 在每个排行榜函数中添加try-catch
   - 记录具体的错误信息和堆栈

2. **验证数据库查询**
   - 检查scripts collection是否存在
   - 验证字段名称和类型
   - 测试基础查询是否正常

3. **修复聚合管道问题**
   - Math.E可能在聚合管道中不可用
   - 检查updateTime字段是否存在

4. **简化测试版本**
   - 创建一个简化版本，只返回基本数据
   - 逐步添加复杂查询

### Phase 2: 数据验证

5. **检查数据存在性**
   - 确认scripts collection中有数据
   - 验证status字段值为'active'
   - 检查usageCount, likes, updateTime字段

6. **字段格式验证**
   - 确保字段类型正确
   - 检查日期字段格式

### Phase 3: 逐步恢复

7. **恢复使用排行榜**
   - 先恢复最简单的使用排行榜
   - 确认基础功能正常

8. **恢复点赞排行榜**
   - 添加点赞排行榜功能
   - 测试数据查询

9. **恢复热度排行榜**
   - 修复聚合管道语法
   - 使用正确的数学常量

## Resolution Plan

### 可能的解决方案

1. **聚合管道Math.E问题**
   ```javascript
   // 错误写法
   timeWeight: $.pow([Math.E, $.multiply(['$daysSinceUpdate', -0.1])])

   // 正确写法
   timeWeight: $.pow([2.718281828459045, $.multiply(['$daysSinceUpdate', -0.1])])
   ```

2. **字段不存在问题**
   - 检查updateTime字段是否存在
   - 如果不存在，使用createTime或当前时间

3. **权限和collection问题**
   - 验证数据库权限设置
   - 确认collection名称正确

## Implementation Tasks

- [x] T001: 在云函数中添加详细错误日志
- [x] T002: 修复聚合管道Math.E问题 (使用2.718281828459045替代Math.E)
- [x] T003: 处理updateTime字段缺失问题 (使用$.ifNull处理)
- [x] T004: 添加数据库连接验证
- [x] T005: 在API中添加调试信息
- [ ] T006: 重新上传云函数到uniCloud
- [ ] T007: 重新测试排行榜功能

## 已实施的修复

1. **Math.E问题修复**:
   ```javascript
   // 修复前
   timeWeight: $.pow([Math.E, $.multiply(['$daysSinceUpdate', -0.1])])

   // 修复后
   timeWeight: $.pow([2.718281828459045, $.multiply(['$daysSinceUpdate', -0.1])])
   ```

2. **字段缺失处理**:
   ```javascript
   // 添加了对updateTime字段缺失的处理
   updateTimeOrDefault: $.ifNull(['$updateTime', $.ifNull(['$createTime', now])])
   ```

3. **详细错误日志**:
   - 在主函数和各个子函数中添加了console.error和console.log
   - 添加了堆栈跟踪信息
   - 添加了数据库连接验证

## 预期结果

修复后，云函数应该能够：
- 成功连接数据库
- 正确查询scripts collection
- 处理缺失字段的情况
- 返回正确的排行榜数据