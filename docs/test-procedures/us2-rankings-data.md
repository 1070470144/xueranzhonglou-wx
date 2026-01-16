# 测试流程：点赞数据准确性验证 (US2)

**用户故事**: US2 - 查看点赞排行榜
**测试目标**: 验证点赞排行榜显示的数据与数据库中的实际数据完全一致
**测试环境**: 小程序开发工具 + 云数据库直接查询

## 前置条件

1. 可以直接访问uniCloud数据库进行查询
2. 知道至少5个测试剧本的具体ID
3. 这些剧本的点赞数据已知且稳定（测试期间不发生变化）

## 测试步骤

### 数据一致性验证

1. **数据库直接查询**
   - 使用uniCloud控制台或API直接查询scripts集合
   - 记录前20个（或全部）剧本的以下字段：
     - _id (剧本ID)
     - title (标题)
     - author (作者)
     - likes (点赞数)
     - status (状态，必须为'active')

2. **小程序排行榜数据获取**
   - 打开小程序排行榜页面
   - 切换到"点赞排行"选项卡
   - 等待数据加载完成
   - 记录显示的前N个剧本的完整信息

3. **数据比对验证**
   - 比较数据库查询结果与小程序显示结果
   - 验证以下字段完全一致：
     - 剧本ID (_id)
     - 标题 (title)
     - 作者 (author)
     - 点赞数 (likes)
   - 检查排序是否正确（按likes降序）

### 排序准确性测试

4. **排序逻辑验证**
   - 从数据库查询结果中手动排序
   - 验证排序规则：likes降序，相同likes时按_id排序
   - 确认小程序显示的排序与手动排序结果完全一致

5. **排名计算验证**
   - 检查排名数字是否连续（1,2,3...）
   - 验证相同点赞数的剧本排名处理
   - 确认前三名显示奖牌，其他显示数字

### 边界情况测试

6. **数据边界测试**
   - 测试点赞数为0的剧本
   - 测试点赞数很大的剧本（千位以上）
   - 测试包含特殊字符的标题和作者

7. **列表长度测试**
   - 当数据库中剧本总数 < 20时，验证显示全部剧本
   - 当数据库中剧本总数 >= 20时，验证只显示前20个
   - 确认"显示全部" vs "显示前20个"的逻辑正确

### 数据更新测试

8. **实时性验证**（可选）
   - 在测试过程中修改某个剧本的点赞数
   - 等待或手动刷新排行榜
   - 验证排行榜反映了最新的数据变化

## 验收标准

### ✅ 通过标准

**数据一致性**
- [ ] 小程序显示的剧本ID与数据库完全一致
- [ ] 标题、作者信息与数据库完全一致
- [ ] 点赞数值与数据库完全一致
- [ ] 无数据丢失或数据错误

**排序准确性**
- [ ] 按点赞数降序排列正确
- [ ] 相同点赞数的排序稳定合理
- [ ] 排名计算正确无误

**边界情况**
- [ ] 点赞数为0时显示正确
- [ ] 大数字显示格式正确
- [ ] 列表长度控制正确

### ❌ 失败标准

- [ ] 任何数据显示与数据库不一致
- [ ] 排序结果错误
- [ ] 排名计算错误
- [ ] 边界情况处理失败

## 测试数据准备

### 手动准备测试数据

在数据库中准备以下测试数据：

```javascript
// 测试剧本数据
const testScripts = [
  { _id: "test_001", title: "高点赞剧本A", author: "测试作者1", likes: 1500, status: "active" },
  { _id: "test_002", title: "高点赞剧本B", author: "测试作者2", likes: 1450, status: "active" },
  { _id: "test_003", title: "中等点赞剧本A", author: "测试作者3", likes: 800, status: "active" },
  { _id: "test_004", title: "中等点赞剧本B", author: "测试作者4", likes: 800, status: "active" }, // 相同点赞数测试
  { _id: "test_005", title: "低点赞剧本", author: "测试作者5", likes: 100, status: "active" },
  { _id: "test_006", title: "零点赞剧本", author: "测试作者6", likes: 0, status: "active" },
  { _id: "test_007", title: "Inactive剧本", author: "测试作者7", likes: 2000, status: "inactive" } // 应该不显示
];
```

### 预期排序结果

点赞排行榜应显示（按likes降序，相同likes按_id排序）：

1. test_001: 高点赞剧本A (1500 likes) 🥇
2. test_002: 高点赞剧本B (1450 likes) 🥈
3. test_003: 中等点赞剧本A (800 likes) 🥉
4. test_004: 中等点赞剧本B (800 likes) 4
5. test_005: 低点赞剧本 (100 likes) 5
6. test_006: 零点赞剧本 (0 likes) 6

注意：test_007因status为inactive不应该出现在排行榜中。

## 验证脚本

使用以下查询验证数据库数据：

```javascript
// 查询活跃剧本的点赞排行
db.collection('scripts')
  .where({ status: 'active' })
  .orderBy('likes', 'desc')
  .limit(20)
  .get()
```

## 自动化验证（可选）

如果有测试框架，可以编写自动化脚本：

```javascript
// 自动化数据一致性测试
async function verifyLikesRankingAccuracy() {
  // 获取数据库数据
  const dbResult = await db.collection('scripts')
    .where({ status: 'active' })
    .orderBy('likes', 'desc')
    .limit(20)
    .get();

  // 获取小程序API数据
  const apiResult = await getRankings('likes', 20);

  // 比较数据一致性
  assert.equal(dbResult.data.length, apiResult.data.length);

  for (let i = 0; i < dbResult.data.length; i++) {
    assert.equal(dbResult.data[i]._id, apiResult.data[i].scriptId);
    assert.equal(dbResult.data[i].likes, apiResult.data[i].value);
  }
}
```

## 性能验证

- 数据查询时间：< 1秒
- API响应时间：< 2秒
- 数据比对时间：< 100ms

## 备注

- 这个测试需要同时访问数据库和小程序，确保测试期间数据不发生变化
- 建议在独立的测试环境中进行，避免影响生产数据
- 如果数据经常变化，考虑使用快照测试方法