# 快速开始：统一剧本管理接口

**目标受众**: 开发人员
**预估完成时间**: 30分钟
**前置条件**: 已配置uni-app开发环境和uniCloud账户

## 环境准备

### 1. 确认开发环境
```bash
# 检查uni-app CLI版本
npx @dcloudio/uvm --version

# 检查HBuilderX版本 (推荐3.6+)
# 在HBuilderX中：帮助 → 关于
```

### 2. 云端配置验证
```javascript
// 在项目中验证uniCloud配置
console.log('uniCloud环境:', uniCloud.getCurrentEnv())
```

## 核心功能演示

### 剧本列表查询

```javascript
// 1. 基础列表查询
const scriptList = await uniCloud.callFunction({
  name: 'scriptManager',
  data: {
    action: 'list',
    page: 1,
    pageSize: 20
  }
})

// 2. 带搜索的查询
const searchResult = await uniCloud.callFunction({
  name: 'scriptManager',
  data: {
    action: 'list',
    keyword: '武侠',
    status: 'active',
    page: 1,
    pageSize: 10
  }
})
```

### 剧本详情获取

```javascript
// 获取单个剧本详情
const scriptDetail = await uniCloud.callFunction({
  name: 'scriptManager',
  data: {
    action: 'get',
    id: 'script_id_here'
  }
})
```

### 剧本创建

```javascript
// 创建新剧本
const newScript = await uniCloud.callFunction({
  name: 'scriptManager',
  data: {
    action: 'create',
    title: '新剧本标题',
    content: '剧本正文内容...',
    author: '作者姓名',
    status: 'inactive',
    tags: ['奇幻', '冒险'],
    category: '小说',
    description: '剧本简介'
  }
})
```

### 剧本更新

```javascript
// 更新剧本信息
const updateResult = await uniCloud.callFunction({
  name: 'scriptManager',
  data: {
    action: 'update',
    id: 'script_id_here',
    title: '更新后的标题',
    status: 'active'
  }
})
```

### 文件上传

```javascript
// 1. 选择文件
const fileResult = await uni.chooseFile({
  count: 1,
  type: 'file',
  extension: ['txt', 'md', 'json']
})

// 2. 上传文件并创建剧本
const uploadResult = await uniCloud.callFunction({
  name: 'scriptManager',
  data: {
    action: 'upload',
    filePath: fileResult.tempFilePaths[0],
    title: '上传的剧本',
    author: '上传者',
    description: '通过文件上传创建的剧本'
  }
})
```

## 前端集成示例

### 页面结构示例

```vue
<template>
  <view class="script-manager">
    <!-- 剧本列表 -->
    <view class="script-list">
      <view v-for="script in scriptList" :key="script._id" class="script-item">
        <text>{{ script.title }}</text>
        <text>{{ script.author }}</text>
        <text>{{ script.status }}</text>
        <button @click="editScript(script._id)">编辑</button>
      </view>
    </view>

    <!-- 分页控件 -->
    <view class="pagination">
      <button @click="loadPrevPage" :disabled="currentPage === 1">上一页</button>
      <text>第{{ currentPage }}页 / 共{{ totalPages }}页</text>
      <button @click="loadNextPage" :disabled="currentPage === totalPages">下一页</button>
    </view>

    <!-- 上传区域 -->
    <view class="upload-section">
      <button @click="chooseFile">选择文件</button>
      <button @click="uploadScript" :disabled="!selectedFile">上传剧本</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      scriptList: [],
      currentPage: 1,
      pageSize: 20,
      totalCount: 0,
      selectedFile: null,
      loading: false
    }
  },

  computed: {
    totalPages() {
      return Math.ceil(this.totalCount / this.pageSize)
    }
  },

  async onLoad() {
    await this.loadScripts()
  },

  methods: {
    async loadScripts() {
      this.loading = true
      try {
        const result = await uniCloud.callFunction({
          name: 'scriptManager',
          data: {
            action: 'list',
            page: this.currentPage,
            pageSize: this.pageSize
          }
        })

        if (result.result.code === 0) {
          this.scriptList = result.result.data.list
          this.totalCount = result.result.data.total
        }
      } catch (error) {
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },

    async loadNextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++
        await this.loadScripts()
      }
    },

    async loadPrevPage() {
      if (this.currentPage > 1) {
        this.currentPage--
        await this.loadScripts()
      }
    },

    async chooseFile() {
      try {
        const result = await uni.chooseFile({
          count: 1,
          type: 'file',
          extension: ['txt', 'md', 'json']
        })

        this.selectedFile = result.tempFiles[0]
      } catch (error) {
        // 用户取消选择
      }
    },

    async uploadScript() {
      if (!this.selectedFile) return

      const loading = uni.showLoading({
        title: '上传中...'
      })

      try {
        const result = await uniCloud.callFunction({
          name: 'scriptManager',
          data: {
            action: 'upload',
            filePath: this.selectedFile.path,
            title: this.selectedFile.name,
            author: '当前用户' // 从用户信息获取
          }
        })

        if (result.result.code === 0) {
          uni.showToast({
            title: '上传成功',
            icon: 'success'
          })
          this.selectedFile = null
          await this.loadScripts() // 刷新列表
        } else {
          throw new Error(result.result.message)
        }
      } catch (error) {
        uni.showToast({
          title: error.message || '上传失败',
          icon: 'none'
        })
      } finally {
        uni.hideLoading()
      }
    },

    editScript(scriptId) {
      uni.navigateTo({
        url: `/pages/admin/scripts/edit?id=${scriptId}`
      })
    }
  }
}
</script>
```

## 测试验证

### 手动测试清单

1. **列表功能测试**
   - [ ] 打开剧本管理页面，能正常显示剧本列表
   - [ ] 分页功能正常，点击上一页/下一页能正确切换
   - [ ] 搜索功能正常，输入关键词后列表正确过滤
   - [ ] 状态筛选功能正常

2. **详情查看测试**
   - [ ] 点击剧本标题，能跳转到详情页面
   - [ ] 详情页面正确显示所有剧本信息
   - [ ] 文件链接能正常下载

3. **创建功能测试**
   - [ ] 点击创建按钮，打开创建表单
   - [ ] 填写必要信息后提交，剧本创建成功
   - [ ] 创建后自动跳转回列表页面，新剧本出现在列表中

4. **编辑功能测试**
   - [ ] 点击编辑按钮，打开编辑表单
   - [ ] 修改信息后提交，更新成功
   - [ ] 列表页面显示更新后的信息

5. **上传功能测试**
   - [ ] 点击选择文件按钮，能打开文件选择器
   - [ ] 选择有效文件后，上传按钮变为可用
   - [ ] 上传过程中显示进度提示
   - [ ] 上传完成后显示成功提示，文件出现在列表中

6. **错误处理测试**
   - [ ] 上传无效格式文件时显示错误提示
   - [ ] 网络异常时显示友好错误信息
   - [ ] 权限不足时正确提示

## 故障排除

### 常见问题

1. **云函数调用失败**
   ```
   错误: 云函数 scriptManager 不存在
   解决: 确认云对象已正确部署到uniCloud
   ```

2. **文件上传失败**
   ```
   错误: 文件大小超过限制
   解决: 检查文件大小是否超过10MB限制
   ```

3. **权限错误**
   ```
   错误: 没有操作权限
   解决: 确认用户已登录且具有相应权限
   ```

### 调试技巧

- 使用 `console.log()` 输出关键变量
- 在HBuilderX中查看网络请求详情
- 检查云对象日志了解服务端错误

## 扩展功能

### 高级查询

```javascript
// 高级筛选查询
const advancedQuery = await uniCloud.callFunction({
  name: 'scriptManager',
  data: {
    action: 'list',
    filters: {
      status: 'published',
      category: '小说',
      tags: ['奇幻', '冒险'],
      createTime: {
        $gte: '2024-01-01',
        $lte: '2024-12-31'
      }
    },
    sort: {
      createTime: -1 // 降序排列
    }
  }
})
```

### 批量操作

```javascript
// 批量状态更新
const batchUpdate = await uniCloud.callFunction({
  name: 'scriptManager',
  data: {
    action: 'batchUpdate',
    ids: ['id1', 'id2', 'id3'],
    updates: {
      status: 'published',
      updateTime: new Date()
    }
  }
})
```

---

**下一步**: 完成上述测试后，可以开始 `/speckit.tasks` 创建详细的任务分解。
