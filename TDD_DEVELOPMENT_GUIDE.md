# 血染钟楼微信小程序 - TDD 开发规范

## 项目概述

本项目是一个基于 uni-app 框架开发的血染钟楼游戏微信小程序，采用 TDD (测试驱动开发) 模式进行开发。

## 技术栈

### 前端框架
- **uni-app 4.36+**: 跨平台开发框架
- **Vue 3**: 前端框架
- **HBuilderX 3.6.0+**: 开发工具

### 测试框架
- **Vitest**: 现代化测试框架
- **@vue/test-utils**: Vue 组件测试工具
- **@vitest/coverage-v8**: 测试覆盖率工具
- **happy-dom**: DOM 模拟环境

### 后端服务
- **uniCloud (阿里云)**: 云服务
- **uniCloud Database**: 云数据库
- **uniCloud Functions**: 云函数

### UI 组件库
- **uni-ui**: 官方组件库
- **自定义组件**: 基于 uni-app 开发

## TDD 开发流程

### 1. 红灯阶段 (Red)
- **先写测试**: 为新功能编写测试用例
- **测试失败**: 确保测试在功能实现前失败
- **测试命名**: 使用 `describe` 和 `it` 描述测试场景

### 2. 绿灯阶段 (Green)
- **实现功能**: 编写最简单的代码使测试通过
- **避免过度设计**: 只实现测试要求的功能
- **重构准备**: 为后续重构做准备

### 3. 重构阶段 (Refactor)
- **代码优化**: 改进代码结构和性能
- **保持测试通过**: 重构过程中测试必须一直通过
- **性能优化**: 确保 UI 响应时间 < 100ms

## 测试规范

### 测试文件结构
```
tests/
├── setup.js                    # 测试环境配置
├── pages/                      # 页面测试
│   ├── index/
│   │   └── index.test.js
│   └── ...
├── components/                 # 组件测试
├── utils/                      # 工具函数测试
├── stores/                     # 状态管理测试
└── cloudfunctions/            # 云函数测试
```

### 测试命名规范
```javascript
// 页面测试
describe('Index Page', () => {
  it('should render correctly', () => {
    // 测试内容
  })

  it('should handle user interaction', () => {
    // 测试内容
  })
})

// 组件测试
describe('GameCard Component', () => {
  it('should display game information', () => {
    // 测试内容
  })
})

// 工具函数测试
describe('GameLogic Utils', () => {
  describe('calculateScore', () => {
    it('should return correct score for valid input', () => {
      // 测试内容
    })
  })
})
```

### 测试覆盖率要求
- **总覆盖率**: ≥ 90%
- **语句覆盖率**: ≥ 90%
- **分支覆盖率**: ≥ 90%
- **函数覆盖率**: ≥ 90%
- **行覆盖率**: ≥ 90%

### 性能测试要求
- **UI 响应时间**: ≤ 100ms
- **页面加载时间**: ≤ 500ms
- **内存使用**: 合理范围内

## 代码规范

### Vue 组件规范
```vue
<template>
  <view class="component">
    <!-- 模板内容 -->
  </view>
</template>

<script setup>
// 使用 Composition API
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  gameData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['game-started', 'game-ended'])

const gameState = ref('waiting')
const gameScore = ref(0)

const displayScore = computed(() => {
  return `分数: ${gameScore.value}`
})

const startGame = () => {
  gameState.value = 'playing'
  emit('game-started')
}

onMounted(() => {
  // 初始化逻辑
})
</script>

<style scoped>
.component {
  /* 组件样式 */
}
</style>
```

### JavaScript/TypeScript 规范
- 使用 ES6+ 语法
- 使用 const/let 替代 var
- 使用箭头函数
- 使用 async/await 处理异步
- 使用解构赋值
- 函数参数不超过 3 个
- 函数体不超过 30 行

### 云函数规范

#### 云对象要求
**所有云函数必须使用云对象的方式进行编写，云对象具有以下优势：**
- 更好的错误处理和类型安全
- 自动生成客户端调用代码
- 更好的开发体验和维护性
- 统一的数据验证和返回格式

#### 云对象编写规范
```javascript
// 云对象示例 - gameService.js
'use strict'

const {
  Controller
} = require('uni-cloud-router')

module.exports = class GameService extends Controller {
  // 获取游戏信息
  async getGame() {
    const { gameId } = this.ctx.data

    // 输入验证
    if (!gameId) {
      return this.fail('gameId is required')
    }

    try {
      // 业务逻辑
      const db = uniCloud.database()
      const result = await db.collection('games')
        .doc(gameId)
        .get()

      if (!result.data || result.data.length === 0) {
        return this.fail('Game not found')
      }

      // 返回结果
      return this.success({
        game: result.data[0]
      })
    } catch (error) {
      console.error('Get game error:', error)
      return this.fail('Internal server error')
    }
  }

  // 创建游戏
  async createGame() {
    const { gameData } = this.ctx.data

    // 输入验证
    if (!gameData || !gameData.name) {
      return this.fail('Game name is required')
    }

    try {
      const db = uniCloud.database()
      const result = await db.collection('games').add({
        ...gameData,
        createTime: Date.now(),
        status: 'waiting'
      })

      return this.success({
        gameId: result.id
      })
    } catch (error) {
      console.error('Create game error:', error)
      return this.fail('Failed to create game')
    }
  }

  // 更新游戏状态
  async updateGameStatus() {
    const { gameId, status } = this.ctx.data

    // 输入验证
    if (!gameId || !status) {
      return this.fail('gameId and status are required')
    }

    const validStatuses = ['waiting', 'playing', 'finished']
    if (!validStatuses.includes(status)) {
      return this.fail('Invalid status')
    }

    try {
      const db = uniCloud.database()
      await db.collection('games')
        .doc(gameId)
        .update({
          status,
          updateTime: Date.now()
        })

      return this.success({
        message: 'Game status updated successfully'
      })
    } catch (error) {
      console.error('Update game status error:', error)
      return this.fail('Failed to update game status')
    }
  }
}
```

#### 云对象调用方式
```javascript
// 客户端调用云对象
const gameService = uniCloud.importObject('gameService')

// 获取游戏信息
const result = await gameService.getGame({
  gameId: 'game123'
})

if (result.success) {
  console.log('Game data:', result.data)
} else {
  console.error('Error:', result.message)
}

// 创建游戏
const createResult = await gameService.createGame({
  gameData: {
    name: '血染钟楼游戏',
    players: 8
  }
})
```

#### 云函数目录结构
```
uniCloud-aliyun/
├── cloudfunctions/           # 云函数目录
│   ├── common/              # 公共模块
│   │   ├── uni-cloud-router/
│   │   └── middleware/
│   └── game-service/        # 游戏服务云对象
│       ├── index.js         # 云对象入口
│       ├── gameService.js   # 游戏服务类
│       └── package.json
└── database/                # 数据库配置
```

#### 云对象测试规范
```javascript
// 云对象测试示例
describe('GameService', () => {
  let gameService

  beforeEach(() => {
    // Mock 云对象上下文
    gameService = new GameService()
    gameService.ctx = {
      data: {},
      auth: { uid: 'test-user' }
    }
  })

  describe('getGame', () => {
    it('should return game data when game exists', async () => {
      gameService.ctx.data = { gameId: 'game123' }

      // Mock 数据库
      uniCloud.database = vi.fn(() => ({
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn(() => Promise.resolve({
              data: [{ id: 'game123', name: 'Test Game' }]
            }))
          }))
        }))
      }))

      const result = await gameService.getGame()

      expect(result.success).toBe(true)
      expect(result.data.game.name).toBe('Test Game')
    })

    it('should return error when gameId is missing', async () => {
      gameService.ctx.data = {}

      const result = await gameService.getGame()

      expect(result.success).toBe(false)
      expect(result.message).toBe('gameId is required')
    })
  })
})
```

## 性能优化

### UI 性能监控
```javascript
// 性能监控工具
const PerformanceMonitor = {
  mark(name) {
    if (typeof performance !== 'undefined') {
      performance.mark(name)
    }
  },

  measure(name, startMark, endMark) {
    if (typeof performance !== 'undefined') {
      performance.measure(name, startMark, endMark)
      const measure = performance.getEntriesByName(name)[0]
      return measure.duration
    }
    return 0
  },

  checkUIResponseTime(duration) {
    if (duration > 100) {
      console.warn(`UI response time exceeded 100ms: ${duration}ms`)
    }
    return duration <= 100
  }
}

export default PerformanceMonitor
```

### 优化策略
1. **组件懒加载**: 使用动态导入
2. **图片优化**: 使用合适格式和尺寸
3. **列表虚拟化**: 长列表使用虚拟滚动
4. **防抖节流**: 用户交互优化
5. **缓存策略**: 合理使用本地存储

## Git 工作流程

### 分支管理
- `main`: 主分支，生产环境代码
- `develop`: 开发分支
- `feature/*`: 功能分支
- `hotfix/*`: 热修复分支

### 提交规范
```bash
# 提交类型
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建工具配置
```

### 提交示例
```bash
git commit -m "feat: 添加游戏开始功能

- 实现游戏初始化逻辑
- 添加玩家角色选择
- 编写相应的测试用例

测试覆盖率: 95%"
```

## CI/CD 配置

### GitHub Actions 示例
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm install

    - name: Run tests
      run: npm run test:coverage

    - name: Check coverage
      run: |
        COVERAGE=$(jq '.total.lines.pct' coverage/coverage-summary.json)
        if (( $(echo "$COVERAGE < 90" | bc -l) )); then
          echo "Coverage is below 90%: $COVERAGE%"
          exit 1
        fi
```

## 开发环境设置

### 1. 安装依赖
```bash
# 安装项目依赖
npm install

# 安装 uni-app CLI (如果需要)
npm install -g @dcloudio/uni-cli
```

### 2. 运行测试
```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行特定测试文件
npm test -- tests/pages/index/index.test.js

# 运行测试 UI
npm run test:ui
```

### 3. 开发调试
```bash
# 在 HBuilderX 中打开项目
# 使用微信开发者工具进行小程序调试
# 使用浏览器进行 H5 版本调试
```

## 质量保证

### 代码审查清单
- [ ] 测试覆盖率 ≥ 90%
- [ ] UI 响应时间 ≤ 100ms
- [ ] 代码符合 ESLint 规范
- [ ] 组件有相应的测试
- [ ] 云函数有错误处理
- [ ] 数据库操作有验证

### 发布前检查
1. 所有测试通过
2. 覆盖率报告生成
3. 性能测试通过
4. 代码审查完成
5. 文档更新完毕

## 常见问题

### Q: 如何测试异步操作？
```javascript
it('should handle async operation', async () => {
  const result = await someAsyncFunction()
  expect(result).toBe(expectedValue)
})
```

### Q: 如何测试用户交互？
```javascript
it('should handle button click', async () => {
  const wrapper = mount(Component)
  await wrapper.find('button').trigger('click')
  expect(wrapper.emitted()).toHaveProperty('clicked')
})
```

### Q: 如何模拟 uni-app API？
```javascript
// 在 setup.js 中配置全局 mock
global.uni = {
  request: vi.fn(),
  showToast: vi.fn()
}

// 在测试中使用
it('should call API', () => {
  // 测试代码
  expect(uni.request).toHaveBeenCalledWith(expectedParams)
})
```

---

*遵循 TDD 原则，让我们编写高质量、可维护的代码！*
