# 数据模型设计

## 概述

修复热度榜单数值一直是0的问题需要调整排行榜数据的计算和存储逻辑。主要涉及剧本集合的热度分数计算。

## 实体定义

### 剧本实体 (scripts)

**现有字段：**
- `_id`: 字符串，剧本唯一标识
- `title`: 字符串，剧本标题
- `author`: 字符串，作者姓名
- `usageCount`: 整数，使用次数，默认0
- `likes`: 整数，点赞数，默认0
- `status`: 字符串，状态枚举 ("draft", "published", "archived")，默认"draft"
- `updateTime`: 时间戳，最后更新时间
- `createTime`: 时间戳，创建时间

**新增计算字段（运行时）：**
- `hotScore`: 数值，热度分数，计算公式：`(usageCount * 1 + likes * 3) * timeWeight`
- `timeWeight`: 数值，时间权重，计算公式：`1 / (1 + 0.01 * daysSinceUpdate)`

## 数据流

### 热度计算流程

```mermaid
graph TD
    A[获取活跃剧本] --> B[计算基础分数]
    B --> C[计算时间权重]
    C --> D[计算最终热度]
    D --> E[排序并返回]

    B1[usageCount * 1] --> B
    B2[likes * 3] --> B
    B --> B3[baseScore = B1 + B2]

    C1[计算距今天数] --> C
    C --> C2[timeWeight = 1/(1+0.01*天数)]

    D1[hotScore = baseScore * timeWeight] --> D
```

### 数据验证规则

**输入验证：**
- `usageCount`: >= 0
- `likes`: >= 0
- `status`: 必须为 "active" 才能进入排行榜

**输出验证：**
- `hotScore`: >= 0.1（为零值剧本提供最小热度）
- 排行榜最多返回50条记录

## 状态转换

### 剧本状态对排行榜的影响

| 状态 | 使用排行 | 点赞排行 | 热度排行 | 说明 |
|------|----------|----------|----------|------|
| draft | ❌ | ❌ | ❌ | 草稿状态不参与排行 |
| published | ❌ | ❌ | ❌ | 已发布但非活跃状态 |
| active | ✅ | ✅ | ✅ | 活跃状态参与所有排行 |

### 热度计算状态

| 条件 | baseScore | timeWeight | hotScore | 处理策略 |
|------|-----------|------------|----------|----------|
| usageCount=0, likes=0 | 0 | 任意 | 0 → 0.1 | 提供最小热度值 |
| usageCount>0 或 likes>0 | >0 | 1.0-0.1 | 正常计算 | 标准计算 |
| updateTime无效 | >0 | 1.0 | baseScore | 使用默认权重 |

## 索引设计

**现有索引（从indexes.jql）：**
- `usage_ranking_index`: {usageCount: -1, status: 1}
- `likes_ranking_index`: {likes: -1, status: 1}
- `update_time_ranking_index`: {updateTime: -1, status: 1}
- `status_update_time_index`: {status: 1, updateTime: -1}

**新增索引建议：**
- 复合热度索引：{status: 1, hotScore: -1}（如果需要持久化热度值）

## 数据一致性保证

### 计算一致性
- 热度计算在每次查询时实时进行，确保数据新鲜度
- 使用原子聚合操作避免竞态条件
- 提供调试模式输出中间计算结果

### 缓存策略
- 前端缓存10分钟，避免频繁查询
- 云函数不缓存，确保数据实时性
- 错误情况下返回缓存数据作为降级方案