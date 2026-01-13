<template>
	<view class="fix-top-window">
		<view class="uni-header">
			<uni-stat-breadcrumb />
			<view class="uni-group">
				<input class="uni-search" type="text" v-model="query" @confirm="search" placeholder="按标题或作者搜索" />
				<button class="uni-button hide-on-phone" type="default" size="mini" @click="search">搜索</button>
				<button class="uni-button" type="primary" size="mini" @click="navigateTo('./edit')">新增剧本</button>
				<button class="uni-button" type="warn" size="mini" :disabled="!selectedIndexs.length" @click="delTable">批量删除</button>
			</view>
		</view>
		<view class="uni-container">
			<unicloud-db ref="udb" collection="scripts" :where="where" page-data="replace"
				:orderby="orderby" :getcount="true" :page-size="options.pageSize" :page-current="options.pageCurrent"
				v-slot:default="{ data, pagination, loading, error, options }" :options="options" loadtime="manual"
				@load="onqueryload">
				<uni-table ref="table" :loading="loading" :emptyText="error.message || '暂无数据'" border stripe
					type="selection" @selection-change="selectionChange">
					<uni-tr>
						<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'title')"
							sortable @sort-change="sortChange($event, 'title')">剧本标题</uni-th>
						<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'author')"
							sortable @sort-change="sortChange($event, 'author')">作者</uni-th>
						<uni-th align="center">版本</uni-th>
						<uni-th align="center" filter-type="select" :filter-data="tagOptions"
							@filter-change="filterChange($event, 'tag')">标签</uni-th>
						<uni-th align="center">封面</uni-th>
						<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'usageCount')"
							sortable @sort-change="sortChange($event, 'usageCount')">使用次数</uni-th>
						<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'likes')"
							sortable @sort-change="sortChange($event, 'likes')">点赞数</uni-th>
						<uni-th align="center" filter-type="timestamp" @filter-change="filterChange($event, 'updateTime')"
							sortable @sort-change="sortChange($event, 'updateTime')">更新时间</uni-th>
						<uni-th align="center">操作</uni-th>
					</uni-tr>
					<uni-tr v-for="(item,index) in data" :key="index">
						<uni-td align="center">{{item.title}}</uni-td>
						<uni-td align="center">{{item.author}}</uni-td>
						<uni-td align="center">{{item.version}}</uni-td>
						<uni-td align="center">
							<uni-tag type="primary" inverted size="small" :text="item.tag || '未分类'"></uni-tag>
						</uni-td>
						<uni-td align="center">
							<image v-if="item.images && item.images[0]" :src="item.images[0].url || item.images[0]"
								class="cover-image" mode="aspectFill" @click="previewImage(item.images[0].url || item.images[0])" />
							<view v-else class="no-image">暂无封面</view>
						</uni-td>
						<uni-td align="center">{{item.usageCount || 0}}</uni-td>
						<uni-td align="center">{{item.likes || 0}}</uni-td>
						<uni-td align="center">
							<uni-dateformat :threshold="[0, 0]" :date="item.updateTime || item.createdAt"></uni-dateformat>
						</uni-td>
						<uni-td align="center">
							<view class="uni-group">
								<button @click="navigateTo('./edit?id=' + item._id, false)" class="uni-button" size="mini"
									type="primary">编辑</button>
								<button @click="confirmDelete(item._id)" class="uni-button" size="mini"
									type="warn">删除</button>
							</view>
						</uni-td>
					</uni-tr>
				</uni-table>
				<view class="uni-pagination-box">
					<uni-pagination show-icon show-page-size :page-size="pagination.size" v-model="pagination.current"
						:total="pagination.count" @change="onPageChanged" @pageSizeChange="changeSize" />
				</view>
			</unicloud-db>
		</view>
		<!-- #ifndef H5 -->
		<fix-window />
		<!-- #endif -->
	</view>
</template>

<script>
const db = uniCloud.database()
const dbOrderBy = 'updateTime desc'
const dbSearchFields = ['title', 'author']
const pageSize = 20
const pageCurrent = 1

const orderByMapping = {
	"ascending": "asc",
	"descending": "desc"
}

export default {
	data() {
		return {
			// use literal collection name for unicloud-db component
			query: '',
			where: '',
			orderby: dbOrderBy,
			orderByFieldName: "",
			selectedIndexs: [],
			pageSizeIndex: 0,
			pageSizeOption: [20, 50, 100, 500],
			options: {
				pageSize,
				pageCurrent,
				filterData: {
					"tag_localdata": [
						{ "text": "娱乐", "value": "娱乐" },
						{ "text": "推理", "value": "推理" },
						{ "text": "恐怖", "value": "恐怖" },
						{ "text": "情感", "value": "情感" },
						{ "text": "其他", "value": "其他" }
					]
				}
			},
			tagOptions: [
				{ "text": "娱乐", "value": "娱乐" },
				{ "text": "推理", "value": "推理" },
				{ "text": "恐怖", "value": "恐怖" },
				{ "text": "情感", "value": "情感" },
				{ "text": "其他", "value": "其他" }
			]
		}
	},
	computed: {
		tagOptionsForFilter() {
			return this.tagOptions
		}
	},
	methods: {
		onqueryload(data) {
			// 数据预处理
			for (let i = 0; i < data.length; i++) {
				let item = data[i]
				// 处理图片数据
				if (Array.isArray(item.images)) {
					item.images = item.images.map(img => {
						if (typeof img === 'string') {
							return { url: img }
						}
						return img
					})
				}
				// 确保时间字段存在
				if (!item.updateTime && item.createdAt) {
					item.updateTime = item.createdAt
				}
			}
		},
		changeSize(pageSize) {
			this.options.pageSize = pageSize
			this.options.pageCurrent = 1
			this.$nextTick(() => {
				this.loadData()
			})
		},
		getWhere() {
			const query = this.query.trim()
			if (!query) {
				return ''
			}
			const queryRe = new RegExp(query, 'i')
			return db.command.or(
				dbSearchFields.map(name => ({
					[name]: queryRe
				}))
			)
		},
		search() {
			const newWhere = this.getWhere()
			this.where = newWhere
			this.$nextTick(() => {
				this.loadData()
			})
		},
		loadData(clear = true) {
			// defensive: inspect refs and where before calling loadData on the unicloud-db component
			try {
				console.log('loadData called, where type:', typeof this.where, this.where);
				try {
					console.log('where keys:', this.where && typeof this.where === 'object' ? Object.keys(this.where) : 'n/a');
					if (this.where && typeof this.where === 'object') {
						for (const k in this.where) {
							const v = this.where[k];
							console.log(`where[${k}] -> type: ${typeof v}, toString: ${Object.prototype.toString.call(v)}`);
						}
					}
				} catch (inner) {
					console.warn('failed to inspect where:', inner);
				}
				console.log('collectionList type:', Object.prototype.toString.call(this.collectionList), this.collectionList);
				if (this.$refs && this.$refs.udb && typeof this.$refs.udb.loadData === 'function') {
					try {
						this.$refs.udb.loadData({ clear });
					} catch (errLoad) {
						console.error('unicloud-db.loadData threw:', errLoad);
						throw errLoad;
					}
				} else {
					console.warn('unicloud-db ref not ready or loadData not a function');
				}
			} catch (err) {
				console.error('loadData error:', err);
			}
		},
		onPageChanged(e) {
			this.selectedIndexs.length = 0
			if (this.$refs.table) {
				this.$refs.table.clearSelection()
			}
			if (this.$refs.udb) {
				this.$refs.udb.loadData({
					current: e.current
				})
			}
		},
		navigateTo(url, clear) {
			// clear 表示刷新列表时是否清除页码，true 表示刷新并回到列表第 1 页，默认为 true
			uni.navigateTo({
				url,
				events: {
					refreshData: () => {
						this.loadData(clear)
					}
				}
			})
		},
		// 多选处理
		selectedItems() {
			if (!this.$refs.udb || !this.$refs.udb.dataList) return []
			let dataList = this.$refs.udb.dataList
			return this.selectedIndexs.map(i => dataList[i]._id)
		},
		// 批量删除
		delTable() {
			const ids = this.selectedItems()
			if (!ids.length) return
			uni.showModal({
				title: '确认批量删除',
				content: `确定要删除选中的 ${ids.length} 个剧本吗？`,
				success: async (res) => {
					if (!res.confirm) return;
					uni.showLoading({ title: '删除中...', mask: true });
					console.log('delTable removing ids', ids);
					try {
						const deletePromises = ids.map(id => uniCloud.callFunction({
							name: 'adminScript',
							data: { action: 'delete', id }
						}));
						const results = await Promise.all(deletePromises);
						uni.hideLoading();
						const failed = results.filter(r => {
							const rr = (r && r.result) ? r.result : r;
							return !(rr && rr.code === 0);
						});
						if (failed.length === 0) {
							if (this.$refs.table) this.$refs.table.clearSelection();
							this.selectedIndexs = [];
							uni.showToast({ title: '批量删除成功', icon: 'success' });
						} else {
							uni.showToast({ title: `部分删除失败 (${failed.length})`, icon: 'none' });
						}
						this.loadData();
					} catch (err) {
						uni.hideLoading();
						console.error('Batch delete error:', err);
						uni.showToast({ title: '批量删除失败', icon: 'none' });
					}
				}
			})
		},
		// 多选
		selectionChange(e) {
			this.selectedIndexs = e.detail.index
		},
		confirmDelete(id) {
			uni.showModal({
				title: '确认删除',
				content: '确定要删除这个剧本吗？',
				success: (res) => {
					if (!res.confirm) return;
					// Call cloud function directly as fallback when udb.remove doesn't invoke success
					(async () => {
						try {
							uni.showLoading({ title: '删除中...' });
							const r = await uniCloud.callFunction({
								name: 'adminScript',
								data: { action: 'delete', id }
							});
							uni.hideLoading();
							const rr = (r && r.result) ? r.result : r;
							console.log('adminScript delete result', rr);
							if (rr && rr.code === 0) {
								uni.showToast({ title: '删除成功' });
								this.loadData();
							} else {
								uni.showToast({ title: rr.errMsg || '删除失败', icon: 'none' });
							}
						} catch (err) {
							uni.hideLoading();
							console.error('direct delete error', err);
							uni.showToast({ title: '删除失败', icon: 'none' });
						}
					})()
				}
			})
		},
		sortChange(e, name) {
			this.orderByFieldName = name;
			if (e.order) {
				this.orderby = name + ' ' + orderByMapping[e.order]
			} else {
				this.orderby = ''
			}
			if (this.$refs.table) {
				this.$refs.table.clearSelection()
			}
			this.$nextTick(() => {
				this.loadData()
			})
		},
		filterChange(e, name) {
			this._filter = this._filter || {}
			this._filter[name] = {
				type: e.filterType,
				value: e.filter
			}
			let newWhere = this.filterToWhere(this._filter, db.command)
			if (Object.keys(newWhere).length) {
				this.where = newWhere
			} else {
				this.where = ''
			}
			this.$nextTick(() => {
				this.loadData()
			})
		},
		filterToWhere(filters, command) {
			let where = {}
			Object.keys(filters).forEach(key => {
				let filter = filters[key]
				if (filter.type === 'search') {
					if (filter.value) {
						where[key] = new RegExp(filter.value, 'i')
					}
				} else if (filter.type === 'select') {
					if (filter.value && filter.value.length) {
						where[key] = command.in(filter.value)
					}
				} else if (filter.type === 'timestamp') {
					if (filter.value && filter.value.length === 2) {
						where[key] = command.and([
							command.gte(filter.value[0]),
							command.lte(filter.value[1])
						])
					}
				}
			})
			return where
		},
		previewImage(url) {
			if (url) {
				uni.previewImage({
					urls: [url],
					current: url
				})
			}
		}
	},
	onLoad() {
		this._filter = {}
	},
	onReady() {
		this.loadData()
	}
}
</script>

<style lang="scss" scoped>
// 封面图片样式
.cover-image {
	width: 60px;
	height: 40px;
	border-radius: 4px;
	object-fit: cover;
	cursor: pointer;
	border: 1px solid #d9d9d9;

	&:hover {
		border-color: #1890ff;
	}
}

.no-image {
	width: 60px;
	height: 40px;
	background: linear-gradient(135deg, #f5f5f5, #e9e9e9);
	display: flex;
	align-items: center;
	justify-content: center;
	color: #999;
	border-radius: 4px;
	font-size: 12px;
	border: 1px solid #d9d9d9;
}

// 表格中图片的响应式设计
@media (min-width: 768px) {
	.cover-image,
	.no-image {
		width: 80px;
		height: 60px;
	}
}
</style>


