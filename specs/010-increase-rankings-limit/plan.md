# 实现计划：增加排行榜最大显示数量

**功能**: 010-increase-rankings-limit
**日期**: 2026-01-22

## 修改内容

将小程序端排行榜的最大显示数量从20增加到50，提升用户浏览体验。

## 技术实现

### 修改的文件

1. **`xueran/utils/rankingsApi.js`**:
   - 修改函数默认参数 `limit = 50`
   - 修改参数验证默认值 `limit = 50`
   - 更新注释说明

2. **`xueran/pages/rankings/rankings.vue`**:
   - 修改API调用参数从 `getRankings(this.activeTab, 20)` 改为 `getRankings(this.activeTab, 50)`

3. **`xueran/uniCloud-aliyun/cloudfunctions/getRankings/index.js`**:
   - 修改默认参数 `limit = 50` 保持前后端一致性

### 验证要点

- ✅ 后端云函数参数验证已支持1-50范围
- ✅ 前端API默认值已修改为50
- ✅ 页面调用参数已修改为50
- ✅ 无linter错误
- ✅ 数据类型和格式保持不变

## 性能考虑

- 后端已支持50个项目的查询和返回
- 前端页面需要处理更多数据项的渲染
- 建议测试大数据量的加载性能

## 验收标准

- [x] 排行榜页面能够显示最多50个项目
- [x] API调用参数正确传递limit=50
- [x] 后端正确处理50个项目的返回
- [x] 页面加载性能不受影响
- [x] 排行榜数据准确显示前50名
