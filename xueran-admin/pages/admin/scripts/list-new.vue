<template>
	<view class="fix-top-window">
		<view class="uni-header">
			<uni-stat-breadcrumb />
			<view class="uni-group">
				<input class="uni-search" type="text" v-model="searchKeyword" @confirm="handleSearch" placeholder="搜索剧本标题、作者或描述" />
				<button class="uni-button hide-on-phone" type="default" size="mini" @click="handleSearch">搜索</button>
				<select class="uni-select" v-model="statusFilter" @change="handleFilterChange">
					<option value="">全部状态</option>
					<option value="active">激活</option>
					<option value="inactive">未激活</option>
				</select>
				<button class="uni-button" type="primary" size="mini" @click="navigateTo('./edit')">新增剧本</button>
				<button class="uni-button" type="warn" size="mini" :disabled="!selectedScripts.length" @click="handleBatchDelete">批量删除</button>
			</view>
		</view>

		<!-- 文件上传区域 -->
		<view class="upload-section">
			<view class="upload-controls">
				<button class="uni-button" type="default" size="mini" @click="chooseFile">
					{{ selectedFile ? '重新选择文件' : '选择剧本文件' }}
				</button>
				<text v-if="selectedFile && selectedFile.name" class="file-info">{{ selectedFile.name }}</text>
				<button class="uni-button" type="primary" size="mini" @click="uploadScript" :disabled="!selectedFile">
					上传剧本
				</button>
			</view>
		</view>

		<view class="uni-container">
			<!-- 加载状态 -->
			<view v-if="loading" class="loading-container">
				<text>加载中...</text>
			</view>

			<!-- 错误状态 -->
			<view v-else-if="error" class="error-container">
				<text class="error-text">{{ error }}</text>
				<button class="uni-button" @click="loadScripts">重试</button>
			</view>

			<!-- 数据列表 -->
			<view v-else>
				<uni-table ref="table" border stripe type="selection" @selection-change="handleSelectionChange">
					<uni-tr>
						<uni-th align="center">剧本标题</uni-th>
						<uni-th align="center">作者</uni-th>
						<uni-th align="center">状态</uni-th>
						<uni-th align="center">标签</uni-th>
						<uni-th align="center">文件大小</uni-th>
						<uni-th align="center">更新时间</uni-th>
						<uni-th align="center">操作</uni-th>
					</uni-tr>
					<uni-tr v-for="(item, index) in scriptList" :key="item._id">
						<uni-td align="center">{{ item.title }}</uni-td>
						<uni-td align="center">{{ item.author }}</uni-td>
						<uni-td align="center">
							<uni-tag
								:type="getStatusType(item.status)"
								inverted
								size="small"
								:text="getStatusText(item.status)" />
						</uni-td>
						<uni-td align="center">
							<view class="tags-container">
								<uni-tag
									v-for="tag in item.tags"
									:key="tag"
									type="primary"
									inverted
									size="mini"
									:text="tag"
									style="margin-right: 4px;" />
							</view>
						</uni-td>
						<uni-td align="center">
							{{ item.fileSize ? formatFileSize(item.fileSize) : '未知' }}
						</uni-td>
						<uni-td align="center">
							<uni-dateformat :date="item.updateTime" />
						</uni-td>
						<uni-td align="center">
							<view class="uni-group">
								<button @click="navigateTo('./edit?id=' + item._id)" class="uni-button" size="mini" type="primary">编辑</button>
								<button @click="handleDelete(item._id)" class="uni-button" size="mini" type="warn">删除</button>
							</view>
						</uni-td>
					</uni-tr>
				</uni-table>

				<!-- 分页控件 -->
				<view v-if="totalCount > 0" class="uni-pagination-box">
					<uni-pagination
						show-icon
						show-page-size
						:page-size="pageSize"
						v-model="currentPage"
						:total="totalCount"
						@change="handlePageChange"
						@pageSizeChange="handlePageSizeChange" />
				</view>

				<!-- 空状态 -->
				<view v-if="scriptList.length === 0 && !loading" class="empty-container">
					<text class="empty-text">暂无剧本数据</text>
					<button class="uni-button" type="primary" @click="navigateTo('./edit')">创建第一个剧本</button>
				</view>
			</view>
		</view>
		<!-- #ifndef H5 -->
		<fix-window />
		<!-- #endif -->
	</view>
</template>

<script>
import { getScriptList, deleteScript } from '@/utils/scriptApi.js'

export default {
	data() {
		return {
			scriptList: [],
			currentPage: 1,
			pageSize: 20,
			totalCount: 0,
			searchKeyword: '',
			statusFilter: '',
			selectedScripts: [],
			selectedFile: null,
			loading: false,
			error: null
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
			this.error = null

			try {
				const params = {
					page: this.currentPage,
					pageSize: this.pageSize,
					keyword: this.searchKeyword || undefined,
					status: this.statusFilter || undefined
				}

				const response = await getScriptList(params)

				if (response.success) {
					this.scriptList = response.data.list || []
					this.totalCount = response.data.total || 0
				} else {
					this.error = response.message
				}
			} catch (error) {
				this.error = '加载数据失败，请稍后重试'
				console.error('Load scripts error:', error)
			} finally {
				this.loading = false
			}
		},

		async handleSearch() {
			this.currentPage = 1 // 重置到第一页
			await this.loadScripts()
		},

		async handleFilterChange() {
			this.currentPage = 1 // 重置到第一页
			await this.loadScripts()
		},

		async handlePageChange(page) {
			this.currentPage = page
			await this.loadScripts()
		},

		async handlePageSizeChange(size) {
			this.pageSize = size
			this.currentPage = 1 // 重置到第一页
			await this.loadScripts()
		},

		handleSelectionChange(selection) {
			this.selectedScripts = selection.map(item => item._id)
		},

		async handleDelete(scriptId) {
			try {
				await uni.showModal({
					title: '确认删除',
					content: '确定要删除这个剧本吗？此操作不可恢复。',
					showCancel: true,
					confirmText: '删除',
					confirmColor: '#ff0000'
				}).then(async (res) => {
					if (res.confirm) {
						const response = await deleteScript(scriptId)
						if (response.success) {
							uni.showToast({
								title: '删除成功',
								icon: 'success'
							})
							await this.loadScripts() // 刷新列表
						} else {
							uni.showToast({
								title: response.message,
								icon: 'none'
							})
						}
					}
				})
			} catch (error) {
				uni.showToast({
					title: '删除失败',
					icon: 'none'
				})
			}
		},

		async handleBatchDelete() {
			if (this.selectedScripts.length === 0) return

			try {
				await uni.showModal({
					title: '确认批量删除',
					content: `确定要删除选中的 ${this.selectedScripts.length} 个剧本吗？此操作不可恢复。`,
					showCancel: true,
					confirmText: '删除',
					confirmColor: '#ff0000'
				}).then(async (res) => {
					if (res.confirm) {
						let successCount = 0
						let failCount = 0

						for (const scriptId of this.selectedScripts) {
							try {
								const response = await deleteScript(scriptId)
								if (response.success) {
									successCount++
								} else {
									failCount++
								}
							} catch (error) {
								failCount++
							}
						}

						if (failCount === 0) {
							uni.showToast({
								title: `成功删除 ${successCount} 个剧本`,
								icon: 'success'
							})
						} else {
							uni.showToast({
								title: `删除完成：${successCount} 成功，${failCount} 失败`,
								icon: 'none'
							})
						}

						this.selectedScripts = []
						await this.loadScripts() // 刷新列表
					}
				})
			} catch (error) {
				uni.showToast({
					title: '批量删除失败',
					icon: 'none'
				})
		}
	},

	async chooseFile() {
		try {
			const result = await uni.chooseFile({
				count: 1,
				type: 'file',
				extension: ['txt', 'md', 'json']
			})

			if (result.tempFiles && result.tempFiles.length > 0) {
				this.selectedFile = result.tempFiles[0]
			}
		} catch (error) {
			// 用户取消选择文件
			console.log('用户取消选择文件')
		}
	},

	async uploadScript() {
		if (!this.selectedFile || !this.selectedFile.path || typeof this.selectedFile.path !== 'string') {
			uni.showToast({
				title: '请先选择有效的文件',
				icon: 'none'
			})
			return
		}

		const loading = uni.showLoading({
			title: '上传中...'
		})

		try {
			const result = await uniCloud.callFunction({
				name: 'scriptManager',
				data: {
					action: 'upload',
					filePath: this.selectedFile.path,
					title: this.selectedFile.name || '未命名剧本',
					author: '当前用户', // 这里应该从用户信息获取
					description: '通过文件上传创建的剧本'
				}
			})

			uni.hideLoading()

			if (result.result && result.result.code === 0) {
				uni.showToast({
					title: '上传成功',
					icon: 'success'
				})
				this.selectedFile = null
				await this.loadScripts() // 刷新列表
			} else {
				uni.showToast({
					title: result.result?.message || '上传失败',
					icon: 'none'
				})
			}
		} catch (error) {
			uni.hideLoading()
			uni.showToast({
				title: '上传失败：' + error.message,
				icon: 'none'
			})
		}
	},

	getStatusType(status) {
			const s = status || 'active'
			const typeMap = {
				'active': 'success',
				'inactive': 'default'
			}
			return typeMap[s] || 'default'
		},

		getStatusText(status) {
			const s = status || 'active'
			const textMap = {
				'active': '激活',
				'inactive': '未激活'
			}
			return textMap[s] || s
		},

		formatFileSize(bytes) {
			if (!bytes || typeof bytes !== 'number' || bytes <= 0) return '未知'
			const sizes = ['B', 'KB', 'MB', 'GB']
			const i = Math.floor(Math.log(bytes) / Math.log(1024))
			return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
		},

		navigateTo(url, isTab = false) {
			if (isTab) {
				uni.switchTab({ url })
			} else {
				uni.navigateTo({ url })
			}
		}
	}
}
</script>

<style>
.loading-container,
.error-container,
.empty-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 40px;
}

.error-text {
	color: #ff0000;
	margin-bottom: 16px;
}

.empty-text {
	color: #666;
	margin-bottom: 16px;
}

.tags-container {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
}

.uni-pagination-box {
	margin-top: 20px;
	padding: 16px;
	background: #f8f8f8;
	border-radius: 4px;
}

.upload-section {
	margin: 16px 0;
	padding: 16px;
	background: #f9f9f9;
	border-radius: 4px;
}

.upload-controls {
	display: flex;
	align-items: center;
	gap: 12px;
}

.file-info {
	flex: 1;
	color: #666;
	font-size: 14px;
}
</style>
