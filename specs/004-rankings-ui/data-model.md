# Data Model: 小程序端排行榜界面

**Feature**: `004-rankings-ui` | **Date**: 2026-01-16
**Input**: Entities from spec.md and research findings

## 实体定义

### ScriptRanking (排行榜数据)

**Purpose**: 表示单个剧本在排行榜中的排名信息

**Attributes**:
- `scriptId` (string, required): 剧本ID，对应scripts集合的_id
- `title` (string, required): 剧本标题
- `author` (string, required): 剧本作者
- `usageCount` (number, default: 0): 使用次数
- `likes` (number, default: 0): 点赞数
- `hotScore` (number, computed): 热度分数，计算公式 = (usageCount × 1 + likes × 3) × timeWeight
- `timeWeight` (number, computed): 时间权重，计算公式 = e^(-0.1 × daysSinceLastUpdate)
- `rankingType` (enum: 'usage'|'likes'|'hot', required): 排行榜类型
- `rank` (number, required): 排名位置（1-20）
- `lastUpdated` (Date, required): 最后更新时间

**Relationships**:
- Belongs to: Script (通过scriptId关联)

**Validation Rules**:
- `rank` must be between 1-20
- `rankingType` must be one of: 'usage', 'likes', 'hot'
- `hotScore` and `timeWeight` are computed fields, not stored directly

---

### RankingType (排行榜类型枚举)

**Purpose**: 定义支持的排行榜类型

**Values**:
- `USAGE`: 使用排行 - 按usageCount降序
- `LIKES`: 点赞排行 - 按likes降序
- `HOT`: 热度排行 - 按hotScore降序

---

### RankingCache (排行榜缓存)

**Purpose**: 缓存计算好的排行榜数据，提高查询性能

**Attributes**:
- `type` (enum: 'usage'|'likes'|'hot', required): 缓存类型
- `rankings` (array of ScriptRanking, required): 排行榜数据数组
- `totalCount` (number, required): 总剧本数量
- `lastCalculated` (Date, required): 最后计算时间
- `expiresAt` (Date, required): 缓存过期时间

**Relationships**:
- Contains: Multiple ScriptRanking objects

**Validation Rules**:
- `rankings` array length must not exceed 20
- `expiresAt` must be in the future

## 数据流

### 排行榜计算流程

1. **触发时机**: 每日定时任务或管理员手动刷新
2. **数据源**: 从scripts集合获取所有剧本的基本信息
3. **计算步骤**:
   - 获取所有剧本的usageCount、likes、updateTime
   - 对于热度排行：计算timeWeight = e^(-0.1 × daysSinceUpdate)
   - 计算hotScore = (usageCount × 1 + likes × 3) × timeWeight
   - 按对应指标降序排序
   - 取前20个剧本分配排名
4. **存储**: 将计算结果存储到RankingCache集合

### 查询流程

1. **客户端请求**: getRankings(type, limit=20)
2. **缓存检查**: 查询RankingCache中对应type的缓存数据
3. **缓存命中**: 如果缓存存在且未过期，直接返回
4. **缓存未命中**: 重新计算排行榜数据并更新缓存
5. **返回结果**: 返回排行榜数组，包含排名和剧本信息

## 索引设计

### scripts集合索引
- `{ usageCount: -1 }`: 支持使用排行查询
- `{ likes: -1 }`: 支持点赞排行查询
- `{ updateTime: -1 }`: 支持热度计算中的时间权重

### RankingCache集合索引
- `{ type: 1, expiresAt: 1 }`: 支持按类型和过期时间查询缓存

## 性能考虑

### 查询优化
- 使用缓存减少重复计算
- 排行榜数据限制在20条，查询性能稳定
- 索引优化排序操作

### 存储优化
- RankingCache只存储计算结果，不存储原始数据
- 缓存过期时间设置为24小时（每日刷新）
- 自动清理过期缓存数据

## 边界情况处理

### 数据不足情况
- 当剧本总数 < 20时，返回所有剧本
- 当某类型数据为0时，仍正常显示（显示为0）

### 时间权重计算
- 新剧本（updateTime为今天）：timeWeight = 1.0
- 超过30天的剧本：timeWeight ≈ 0.05（基本不影响排名）
- 处理updateTime为空的情况：默认为当前时间

### 排名并列处理
- 使用scriptId作为二级排序键保证排名稳定
- 并列剧本显示相同排名数字