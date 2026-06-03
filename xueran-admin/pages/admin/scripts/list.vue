<template>
	<view class="fix-top-window">
		<view class="uni-header">
			<uni-stat-breadcrumb />
			<view class="uni-group">
				<input class="uni-search" type="text" v-model="searchKeyword" @confirm="handleSearch" placeholder="搜索剧本标题、作者或描述" />
				<button class="uni-button hide-on-phone" type="default" size="mini" @click="handleSearch">搜索</button>
				<select class="uni-select" v-model="statusFilter" @change="handleFilterChange">
					<option value="">全部状态</option>
					<option value="published">已上架</option>
					<option value="pending">待审核</option>
					<option value="rejected">已拒绝</option>
					<option value="inactive">已下架</option>
				</select>
				<select class="uni-select" v-model="sourceFilter" @change="handleFilterChange">
					<option value="">全部来源</option>
					<option value="user_upload">用户上传</option>
					<option value="admin_upload">后台上传</option>
					<option value="system_seed">系统数据</option>
				</select>
				<button class="uni-button" type="primary" size="mini" @click="navigateTo('./bulk-upload')">批量上传</button>
				<button class="uni-button" type="primary" size="mini" @click="navigateTo('./edit')">新增剧本</button>
				<button class="uni-button" type="warn" size="mini" @click="handleBatchDelete">批量删除</button>
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
				<uni-table ref="table" border stripe type="selection" row-key="_id" @selection-change="handleSelectionChange">
					<uni-tr>
						<uni-th align="center">剧本标题</uni-th>
						<uni-th align="center">作者</uni-th>
						<uni-th align="center">状态</uni-th>
						<uni-th align="center">来源</uni-th>
						<uni-th align="center">上传用户</uni-th>
						<uni-th align="center">拒绝原因</uni-th>
						<uni-th align="center">标签</uni-th>
						<uni-th align="center">封面</uni-th>
						<uni-th align="center">使用次数</uni-th>
						<uni-th align="center">点赞数</uni-th>
						<uni-th align="center">文件大小</uni-th>
						<uni-th align="center">更新时间</uni-th>
						<uni-th align="center">操作</uni-th>
					</uni-tr>
					<uni-tr v-for="(item, index) in scriptList" :key="item._id">
						<uni-td align="center">{{ item.title }}</uni-td>
						<uni-td align="center">{{ item.author }}</uni-td>
						<uni-td align="center">
							<button
								v-if="isPendingState(item)"
								class="status-review-button"
								size="mini"
								@click="openPreview(item)">待审核</button>
							<uni-tag
								v-else
								:type="getScriptStateType(item)"
								inverted
								size="small"
								:text="getScriptStateText(item)" />
						</uni-td>
						<uni-td align="center">{{ getSourceText(item.source) }}</uni-td>
						<uni-td align="center">
							<view class="owner-cell">
								<text>{{ getOwnerName(item) }}</text>
								<text v-if="item.ownerUserId" class="owner-id">{{ item.ownerUserId }}</text>
							</view>
						</uni-td>
						<uni-td align="center">
							<text v-if="shouldShowReviewReason(item)" class="review-reason">{{ item.reviewReason }}</text>
							<text v-else class="muted-text">-</text>
						</uni-td>
						<uni-td align="center">
							<view class="tags-container">
								<!-- 只显示 tag 字段 -->
								<uni-tag
									v-if="item.tag"
									type="primary"
									inverted
									size="mini"
									:text="item.tag" />
							</view>
						</uni-td>
						<uni-td align="center">
							<image
								v-if="resolveImageUrl(item)"
								:src="resolveImageUrl(item)"
								class="cover-image"
								mode="aspectFill"
								@click="previewImage(item)" />
							<view v-else class="no-image">暂无封面</view>
						</uni-td>
						<uni-td align="center">{{ item.usageCount || 0 }}</uni-td>
						<uni-td align="center">{{ item.likes || 0 }}</uni-td>
						<uni-td align="center">
							{{ item.fileSize ? formatFileSize(item.fileSize) : '未知' }}
						</uni-td>
						<uni-td align="center">
							<uni-dateformat :date="item.updateTime" />
						</uni-td>
						<uni-td align="center">
							<view class="uni-group">
								<button v-if="canReview(item)" @click="handleReview(item, 'approve')" class="uni-button" size="mini" type="primary">通过</button>
								<button v-if="canReview(item)" @click="handleReview(item, 'reject')" class="uni-button" size="mini" type="warn">拒绝</button>
								<button @click="openPreview(item)" class="uni-button" size="mini" type="default">查看</button>
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

		<view v-if="previewVisible" class="preview-mask" @click="closePreview">
			<view class="preview-panel" @click.stop>
				<view class="preview-header">
					<view>
						<text class="preview-title">{{ previewItem.title || '剧本详情' }}</text>
						<text class="preview-subtitle">{{ previewItem.author || '-' }} · {{ getSourceText(previewItem.source) }}</text>
					</view>
					<button class="uni-button" size="mini" type="default" @click="closePreview">关闭</button>
				</view>
				<scroll-view scroll-y class="preview-body">
					<view class="preview-grid">
						<view class="preview-field">
							<text class="field-label">标题</text>
							<text class="field-value">{{ previewItem.title || '-' }}</text>
						</view>
						<view class="preview-field">
							<text class="field-label">作者</text>
							<text class="field-value">{{ previewItem.author || '-' }}</text>
						</view>
						<view class="preview-field">
							<text class="field-label">状态</text>
							<text class="field-value">{{ getScriptStateText(previewItem) }}</text>
						</view>
						<view class="preview-field preview-field-full">
							<text class="field-label">简介</text>
							<text class="field-value">{{ previewItem.description || '-' }}</text>
						</view>
						<view class="preview-field preview-field-full">
							<text class="field-label">JSON / 内容摘要</text>
							<text class="json-text">{{ previewContent }}</text>
						</view>
					</view>
				</scroll-view>
			</view>
		</view>
		<!-- #ifndef H5 -->
		<fix-window />
		<!-- #endif -->
	</view>
</template>

<script>
import { getScriptList, deleteScript, reviewScript } from '@/utils/scriptApi.js'

export default {
	data() {
		return {
			scriptList: [],
			currentPage: 1,
			pageSize: 20,
			totalCount: 0,
			searchKeyword: '',
			statusFilter: '',
			sourceFilter: '',
			selectedScripts: [],
			previewVisible: false,
			previewItem: {},

			loading: false,
			error: null
		}
	},

	computed: {
		totalPages() {
			return Math.ceil(this.totalCount / this.pageSize)
		},
		previewContent() {
			const item = this.previewItem || {}
			const content = item.content || item.jsonContent || item.rawJson || item.rawData || ''
			if (!content) return '-'

			try {
				const parsed = typeof content === 'string' ? JSON.parse(content) : content
				return JSON.stringify(parsed, null, 2)
			} catch (error) {
				return typeof content === 'string' ? content : JSON.stringify(content, null, 2)
			}
		}
	},

	async onLoad() {
		await this.loadScripts()
	},

	// 页面显示时检查是否需要刷新数据
	async onShow() {
		// 检查是否有刷新标记
		const needRefresh = uni.getStorageSync('scriptListNeedRefresh')
		if (needRefresh) {
			console.log('Detected need to refresh script list')
			uni.removeStorageSync('scriptListNeedRefresh')
			await this.loadScripts()
		}
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
					status: this.statusFilter || undefined,
					source: this.sourceFilter || undefined
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

		async handlePageChange(event) {
			const page = typeof event === 'number' ? event : event && (event.current || event.detail?.current)
			this.currentPage = page || 1
			await this.loadScripts()
		},

		async handlePageSizeChange(event) {
			const size = typeof event === 'number' ? event : event && (event.pageSize || event.detail?.pageSize)
			this.pageSize = size || this.pageSize
			this.currentPage = 1 // 重置到第一页
			await this.loadScripts()
		},

		handleSelectionChange(selection) {
			// Support multiple payload shapes from uni-table across platforms:
			// - { detail: { value: [...] } } (row objects)
			// - { detail: { index: [...] } } (indexes relative to data)
			// - { selectedRows: [...] } | { rows: [...] } | plain array
			let rows = []
			let ids = []

			if (selection && selection.detail) {
				// Prefer detail.value when present
				if (Array.isArray(selection.detail.value) && selection.detail.value.length) {
					rows = selection.detail.value
				}
				// If value is empty but index exists, map indexes back to scriptList
				if ((!rows || rows.length === 0) && Array.isArray(selection.detail.index) && selection.detail.index.length) {
					const indexList = selection.detail.index
					for (const idx of indexList) {
						const row = this.scriptList && this.scriptList[idx]
						if (row) ids.push(row._id || row.id)
					}
				}
			}

			// other shapes
			if ((!rows || rows.length === 0) && selection && Array.isArray(selection.selectedRows)) {
				rows = selection.selectedRows
			}
			if ((!rows || rows.length === 0) && selection && Array.isArray(selection.rows)) {
				rows = selection.rows
			}
			if ((!rows || rows.length === 0) && Array.isArray(selection)) {
				rows = selection
			}

			// If we have row objects, extract ids
			if (rows && rows.length) {
				ids = rows.map(item => (item && (item._id || item.id || item[this.rowKey]))).filter(Boolean)
			}

			this.selectedScripts = ids
		},

		canReview(item) {
			return this.isPendingState(item)
		},

		async handleReview(item, action) {
			if (!item || !item._id) return

			let reason = ''
			if (action === 'reject') {
				const inputRes = await uni.showModal({
					title: '拒绝原因',
					editable: true,
					placeholderText: '请输入拒绝原因',
					showCancel: true,
					confirmText: '拒绝'
				})
				if (!inputRes.confirm) return
				reason = String(inputRes.content || '').trim()
				if (!reason) {
					uni.showToast({ title: '拒绝原因不能为空', icon: 'none' })
					return
				}
				if (reason.length > 200) {
					uni.showToast({ title: '拒绝原因不能超过200字', icon: 'none' })
					return
				}
			} else {
				const modalRes = await uni.showModal({
					title: '确认通过',
					content: '通过后该剧本会显示在小程序展览列表中。',
					showCancel: true,
					confirmText: '通过'
				})
				if (!modalRes.confirm) return
			}

			const response = await reviewScript(item._id, action, reason)
			if (response.success) {
				uni.showToast({ title: action === 'approve' ? '已通过' : '已拒绝', icon: 'success' })
				await this.loadScripts()
				return
			}
			uni.showToast({ title: response.message || '审核失败', icon: 'none' })
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
			// Ensure we have current selection; some table implementations may not
			// emit selection-change for "select all", so fallback to reading ref.
			if (!this.selectedScripts || this.selectedScripts.length === 0) {
				try {
					const tableRef = this.$refs.table
					let rows = []
					if (tableRef) {
						// Try common APIs in order
						if (typeof tableRef.getSelection === 'function') {
							rows = await tableRef.getSelection()
						} else if (typeof tableRef.getSelectedRows === 'function') {
							rows = await tableRef.getSelectedRows()
						} else if (Array.isArray(tableRef.selection)) {
							rows = tableRef.selection
						} else if (Array.isArray(tableRef.selectedRows)) {
							rows = tableRef.selectedRows
						} else if (tableRef.getCheckedItems && typeof tableRef.getCheckedItems === 'function') {
							rows = await tableRef.getCheckedItems()
						}
					}
					if (Array.isArray(rows) && rows.length) {
						this.selectedScripts = rows.map(r => r && r._id).filter(Boolean)
					}
				} catch (err) {
					console.warn('fallback read selection failed', err)
				}
			}

			if (!this.selectedScripts || this.selectedScripts.length === 0) {
				// No selection - give user feedback
				uni.showToast({ title: '请先选择要删除的剧本', icon: 'none' })
				return
			}

			try {
				const count = this.selectedScripts.length
				const modalRes = await uni.showModal({
					title: '确认批量删除',
					content: `确定要删除选中的 ${count} 个剧本吗？此操作不可恢复。`,
					showCancel: true,
					confirmText: '删除',
					confirmColor: '#ff0000'
				})
				if (!modalRes.confirm) return

				let successCount = 0
				let failCount = 0
				for (const scriptId of this.selectedScripts) {
					try {
						const response = await deleteScript(scriptId)
						if (response && response.success) {
							successCount++
						} else {
							failCount++
						}
					} catch (error) {
						failCount++
					}
				}

				if (failCount === 0) {
					uni.showToast({ title: `成功删除 ${successCount} 个剧本`, icon: 'success' })
				} else {
					uni.showToast({ title: `删除完成：${successCount} 成功，${failCount} 失败`, icon: 'none' })
				}

				this.selectedScripts = []
				await this.loadScripts() // 刷新列表
			} catch (error) {
				console.error('handleBatchDelete error', error)
				uni.showToast({ title: '批量删除失败', icon: 'none' })
			}
		},

		getScriptStateType(item) {
			if (this.isPendingState(item)) return 'warning'
			if (item && item.source === 'user_upload' && (item.reviewStatus || item.status) === 'rejected') return 'error'

			const status = (item && item.status) || 'active'
			if (status === 'published' || status === 'active') return 'success'
			if (status === 'inactive') return 'default'
			if (status === 'rejected') return 'error'
			return 'warning'
		},

		getScriptStateText(item) {
			if (!item) return '-'
			if (this.isPendingState(item)) return '待审核'
			if (item.source === 'user_upload' && (item.reviewStatus || item.status) === 'rejected') return '已拒绝'

			const status = item.status || 'active'
			if (status === 'published' || status === 'active') return '已上架'
			if (status === 'inactive') return '已下架'
			if (status === 'rejected') return '已拒绝'
			return '未上架'
		},

		getSourceText(source) {
			const textMap = {
				'user_upload': '用户上传',
				'admin_upload': '后台上传',
				'system_seed': '系统数据'
			}
			return textMap[source] || '官方'
		},

		getOwnerName(item) {
			if (!item) return '-'
			if (item.ownerNickname) return item.ownerNickname
			if (item.ownerUserId) return '用户上传'
			return '官方'
		},

		isPendingState(item) {
			return !!(item && (item.reviewStatus || item.status) === 'pending')
		},

		shouldShowReviewReason(item) {
			return !!(
				item &&
				item.source === 'user_upload' &&
				(item.reviewStatus || item.status) === 'rejected' &&
				item.reviewReason
			)
		},

		formatFileSize(bytes) {
			if (!bytes || typeof bytes !== 'number' || bytes <= 0) return '未知'
			const sizes = ['B', 'KB', 'MB', 'GB']
			const i = Math.floor(Math.log(bytes) / Math.log(1024))
			return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
		},

		async previewImage(target) {
			try {
				if (!target) return

				// If a string URL was passed
				if (typeof target === 'string') {
					uni.previewImage({ urls: [target], current: target })
					return
				}

				// Otherwise treat target as an item object
				const item = target

				// Try images array first
				if (item.images && item.images.length) {
					const img = item.images[0]
					// img can be string or object
					if (typeof img === 'string') {
						uni.previewImage({ urls: [img], current: img })
						return
					}
					// if url present use it
					if (img.url) {
						uni.previewImage({ urls: [img.url], current: img.url })
						return
					}
					// if fileId present, download temp file and preview
					const fid = img.fileId || img.fileID
					if (fid) {
						const res = await uniCloud.downloadFile({ fileID: fid })
						if (res && res.tempFilePath) {
							uni.previewImage({ urls: [res.tempFilePath], current: res.tempFilePath })
							return
						}
					}
				}

				// fallback to top-level fileUrl or fileId
				if (item.fileUrl) {
					uni.previewImage({ urls: [item.fileUrl], current: item.fileUrl })
					return
				}
				const topFid = item.fileId || item.fileID
				if (topFid) {
					const res = await uniCloud.downloadFile({ fileID: topFid })
					if (res && res.tempFilePath) {
						uni.previewImage({ urls: [res.tempFilePath], current: res.tempFilePath })
						return
					}
				}

				uni.showToast({ title: '没有可预览的图片', icon: 'none' })
			} catch (err) {
				console.error('previewImage error:', err)
				uni.showToast({ title: '预览失败', icon: 'none' })
			}
		},

		resolveImageUrl(item) {
			if (!item) return null
			if (item.images && item.images.length) {
				const img = item.images[0]
				if (typeof img === 'string') return img
				// support multiple possible fields returned by different upload implementations
				return img.url || img.fileUrl || img.fileId || img.fileID || img.path || null
			}
			// fallback to thumbnails or top-level fileUrl/fileId
			if (item.thumbnails && item.thumbnails.length) {
				const t = item.thumbnails[0]
				if (typeof t === 'string') return t
				return t.url || t.fileUrl || t.fileId || t.fileID || null
			}
			return item.fileUrl || item.fileId || item.fileID || null
		},

		openPreview(item) {
			this.previewItem = item || {}
			this.previewVisible = true
		},

		closePreview() {
			this.previewVisible = false
			this.previewItem = {}
		},

		navigateTo(url, isTab = false) {
			if (isTab) {
				uni.switchTab({ url })
			} else {
				uni.navigateTo({ url })
			}
		},

		// 切换上传区域显示
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

.owner-cell {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	max-width: 160px;
}

.owner-id {
	max-width: 150px;
	font-size: 12px;
	line-height: 1.4;
	color: #8c8c8c;
	word-break: break-all;
}

.muted-text {
	color: #999;
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

.upload-controls { display: none; }


.cover-image {
	width: 60px;
	height: 60px;
	border-radius: 4px;
}

.no-image {
	color: #999;
	font-size: 12px;
	text-align: center;
	line-height: 60px;
	border: 1px dashed #ddd;
	border-radius: 4px;
}

.review-reason {
	max-width: 180px;
	font-size: 12px;
	line-height: 1.4;
	color: #c45656;
	word-break: break-all;
}

.status-review-button {
	height: 24px;
	line-height: 22px;
	padding: 0 10px;
	font-size: 12px;
	color: #b26a00;
	background: #fff7e6;
	border: 1px solid #ffd591;
	border-radius: 4px;
}

.preview-mask {
	position: fixed;
	z-index: 999;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(0, 0, 0, 0.35);
}

.preview-panel {
	width: min(920px, 92vw);
	max-height: 86vh;
	background: #fff;
	border-radius: 6px;
	box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
	overflow: hidden;
}

.preview-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding: 18px 20px;
	border-bottom: 1px solid #ebeef5;
	background: #fafafa;
}

.preview-title {
	display: block;
	font-size: 18px;
	font-weight: 600;
	color: #303133;
}

.preview-subtitle {
	display: block;
	margin-top: 6px;
	font-size: 13px;
	color: #909399;
}

.preview-body {
	max-height: calc(86vh - 76px);
	padding: 20px;
	box-sizing: border-box;
}

.preview-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 14px;
}

.preview-field {
	padding: 12px;
	border: 1px solid #ebeef5;
	border-radius: 4px;
	background: #fff;
}

.preview-field-full {
	grid-column: 1 / -1;
}

.field-label {
	display: block;
	margin-bottom: 8px;
	font-size: 12px;
	color: #909399;
}

.field-value,
.json-text {
	display: block;
	font-size: 14px;
	line-height: 1.6;
	color: #303133;
	word-break: break-word;
	white-space: pre-wrap;
}

.json-text {
	font-family: Consolas, Monaco, monospace;
	font-size: 12px;
	max-height: 360px;
	overflow: auto;
	padding: 12px;
	background: #f7f8fa;
	border-radius: 4px;
}
</style>
