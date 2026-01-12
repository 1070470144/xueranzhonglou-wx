# Quick Start: 云对象功能实现

## 功能概述

本功能实现完整的云对象服务体系，为"血染钟楼"剧本管理平台提供后端API支持。

## 主要服务

### 1. ScriptService (剧本服务)

#### 获取剧本列表
```javascript
const scriptService = uniCloud.importObject('script-service')
const result = await scriptService.getScriptList({
  page: 1,
  pageSize: 20,
  category: 'all'
})
```

#### 搜索剧本
```javascript
const result = await scriptService.searchScripts({
  keyword: '经典版',
  tags: ['入门'],
  page: 1
})
```

#### 获取剧本详情
```javascript
const result = await scriptService.getScriptDetail({
  scriptId: 'script_001'
})
```

#### 创建剧本
```javascript
const result = await scriptService.createScript({
  scriptData: {
    title: '新剧本',
    author: '作者名',
    description: '剧本描述',
    tags: ['推理', '5-8人']
  }
})
```

### 2. RankingService (排行服务)

#### 获取排行榜
```javascript
const rankingService = uniCloud.importObject('ranking-service')
const result = await rankingService.getRankingList({
  type: 'likes', // likes, views, recent
  limit: 50
})
```

#### 获取标签排行榜
```javascript
const result = await rankingService.getTagRanking({
  limit: 20
})
```

## 前端集成示例

### 修改剧本展览页面

```javascript
// pages/exhibition/exhibition.vue
export default {
  data() {
    return {
      scriptList: [],
      loading: false
    }
  },
  async onLoad() {
    await this.loadScripts()
  },
  methods: {
    async loadScripts() {
      this.loading = true
      try {
        const scriptService = uniCloud.importObject('script-service')
        const result = await scriptService.getScriptList({
          page: 1,
          pageSize: 20
        })
        if (result.success) {
          this.scriptList = result.data.list
        }
      } catch (error) {
        console.error('加载剧本失败:', error)
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },

    async searchScripts(keyword) {
      try {
        const scriptService = uniCloud.importObject('script-service')
        const result = await scriptService.searchScripts({
          keyword,
          page: 1
        })
        if (result.success) {
          this.scriptList = result.data.list
        }
      } catch (error) {
        console.error('搜索失败:', error)
      }
    }
  }
}
```

## 数据迁移

### 从硬编码数据迁移到云对象

1. **备份现有数据**
2. **创建数据库集合**
3. **导入初始数据**
4. **修改前端调用**

### 示例：剧本数据迁移

```javascript
// 迁移脚本示例
const scripts = [
  {
    title: '经典版血染钟楼',
    version: '1.0.0',
    author: '官方团队',
    likes: 1250,
    images: ['/static/script1-1.jpg', '/static/script1-2.jpg'],
    tags: ['经典', '入门', '5-8人']
  }
  // ... 其他剧本数据
]

const db = uniCloud.database()
for (const script of scripts) {
  await db.collection('scripts').add({
    ...script,
    status: 'published',
    createTime: Date.now(),
    updateTime: Date.now()
  })
}
```

## 测试指南

### 单元测试
```javascript
// 云对象测试示例
const scriptService = uniCloud.importObject('script-service')

// 测试获取剧本列表
const result = await scriptService.getScriptList({ page: 1, pageSize: 10 })
console.assert(result.success, '获取剧本列表失败')
console.assert(Array.isArray(result.data.list), '返回数据格式错误')
```

### 集成测试
```javascript
// 前后端集成测试
describe('剧本展览页面集成测试', () => {
  it('应该能够加载剧本列表', async () => {
    const page = await createPage('/pages/exhibition/exhibition')
    await page.waitForSelector('.script-card')
    const cards = await page.$$('.script-card')
    expect(cards.length).toBeGreaterThan(0)
  })
})
```

## 部署和维护

### 环境配置
- 开发环境：配置测试数据库
- 生产环境：配置生产数据库和CDN

### 监控和日志
- API调用监控
- 错误日志收集
- 性能指标监控

### 备份策略
- 每日自动备份数据库
- 关键数据异地备份
- 备份数据验证机制
