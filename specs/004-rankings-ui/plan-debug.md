# Implementation Plan: 调试排行榜功能错误

**Branch**: `004-rankings-ui` | **Date**: 2026-01-16 | **Spec**: [link to spec.md]
**Input**: Error: "Load rankings failed: 获取排行榜失败 at pages\rankings\rankings.vue:121"

**Note**: This is a debug plan to resolve the rankings functionality error.

## Summary

排行榜功能在运行时报错"获取排行榜失败"，经过调试发现问题是API代码中的变量引用错误。云函数调用本身是正常的。

## Technical Context

**Error Location**: `xueran/utils/rankingsApi.js:53`
**Error Message**: ReferenceError: cacheKey is not defined
**Root Cause**: 调试过程中注释了cacheKey变量定义，但未注释使用该变量的代码

**Resolution**: 修复了API代码中的变量引用错误，排行榜功能现在应该正常工作。

## Constitution Check

- **运行时约束**: 云函数调用失败，可能未上传或执行错误
- **文档语言**: 调试过程使用中文记录
- **测试规范**: 通过手动测试定位问题

## Project Structure

### Source Code (repository root)
```text
xueran/
├── pages/rankings/rankings.vue         # 错误发生位置
├── utils/rankingsApi.js                 # API封装
└── uniCloud-aliyun/cloudfunctions/
    └── getRankings/index.js             # 云函数实现
```

## Complexity Tracking

**当前问题**: 排行榜API调用失败
**优先级**: 高 - 核心功能无法使用

## Debug Steps

### Phase 1: 基础检查

1. **检查云函数上传状态**
   - 确认 `getRankings` 云函数已上传到uniCloud
   - 检查 HBuilderX 云函数状态

2. **验证云函数语法**
   - 检查 `getRankings/index.js` 语法是否正确
   - 运行本地语法检查

3. **测试云函数直接调用**
   - 使用 uniCloud 控制台直接调用云函数
   - 测试不同参数组合

### Phase 2: API层调试

4. **检查API封装**
   - 验证 `rankingsApi.js` 中的调用逻辑
   - 检查参数传递是否正确

5. **网络请求调试**
   - 检查小程序端的网络权限
   - 验证 uniCloud 调用是否正常

### Phase 3: 数据库层调试

6. **数据库连接检查**
   - 验证数据库连接状态
   - 检查 collection 权限

7. **查询语句验证**
   - 测试各个排行榜类型的查询语句
   - 验证聚合管道语法

### Phase 4: 数据层调试

8. **数据存在性检查**
   - 确认 scripts collection 中有数据
   - 检查 status 字段值

9. **字段完整性验证**
   - 验证 usageCount, likes, updateTime 字段存在
   - 检查字段数据类型

## Resolution Plan

### 可能的问题及解决方案

1. **云函数未上传**
   - 解决方案: 重新上传云函数
   - 验证方法: 检查uniCloud控制台

2. **数据库查询错误**
   - 解决方案: 修复查询语句
   - 验证方法: 直接在数据库中测试查询

3. **权限问题**
   - 解决方案: 检查云函数权限设置
   - 验证方法: 查看错误日志

4. **参数传递问题**
   - 解决方案: 检查API调用参数
   - 验证方法: 添加调试日志

## Implementation Tasks

- [x] T001: 验证云函数上传状态
- [x] T002: 检查云函数语法和执行
- [x] T003: 测试API调用参数
- [x] T004: 验证数据库查询
- [x] T005: 检查数据完整性
- [x] T006: 添加详细错误日志
- [x] T007: 修复发现的问题 (cacheKey变量引用错误)
- [ ] T008: 重新测试功能 (等待用户验证)

## Final Status

✅ **问题已修复**: rankingsApi.js中的变量引用错误已修复
✅ **云函数正常**: 从日志可以看出云函数调用成功，返回正确数据
✅ **功能就绪**: 可以重新测试排行榜功能

请重新运行小程序，测试排行榜页面是否正常工作。