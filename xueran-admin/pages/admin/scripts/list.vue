<template>
	<view class="container">
	<view class="header card">
			<view class="title">剧本管理</view>
			<view class="actions">
				<button class="btn primary" @click="onCreate">新增剧本</button>
			</view>
		</view>

		<view class="search-row card">
			<input class="search-input" v-model="q" placeholder="按标题或作者搜索" @confirm="onSearch" />
			<button class="btn" @click="onSearch">搜索</button>
		</view>

		<view class="table">
			<view class="tr header">
				<view class="td thumb">封面</view>
				<view class="td">标题 / 作者</view>
				<view class="td">版本</view>
				<view class="td">标签</view>
				<view class="td">使用 / 点赞</view>
				<view class="td">更新时间</view>
				<view class="td">操作</view>
			</view>
			<view v-for="item in list" :key="item.id" class="tr row-card">
				<view class="td thumb">
					<image v-if="item.images && item.images[0]" :src="item.images[0]" class="thumb-img" mode="aspectFill"/>
					<view v-else class="thumb-empty">暂无图片</view>
				</view>
				<view class="td">
					<view class="item-title">{{ item.title }}</view>
					<view class="item-sub">{{ item.author }}</view>
				</view>
				<view class="td">{{ item.version }}</view>
				<view class="td"><text class="tag-pill">{{ item.tag }}</text></view>
				<view class="td">{{ item.usageCount }} / {{ item.likes }}</view>
				<view class="td">{{ item.createdAt ? (item.createdAt | date) : '' }}</view>
				<view class="td">
					<view class="action-row">
						<button class="btn" @click="onEdit(item)">编辑</button>
						<button class="btn danger" @click="onDelete(item)">删除</button>
					</view>
				</view>
			</view>
		</view>

		<!-- pagination -->
		<view class="pager">
			<button :disabled="page<=1" @click="goPage(1)">首页</button>
			<button :disabled="page<=1" @click="goPage(page-1)">上一页</button>
			<text>第 {{ page }} / {{ totalPages }} 页</text>
			<button :disabled="page>=totalPages" @click="goPage(page+1)">下一页</button>
			<button :disabled="page>=totalPages" @click="goPage(totalPages)">尾页</button>
			<input v-model.number="jump" placeholder="跳转页" style="width:120rpx;margin-left:10rpx"/>
			<button @click="goJump">跳转</button>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			list: [],
			page: 1,
			pageSize: 12,
			total: 0,
			q: '',
			loading: false,
			jump: ''
		}
	},
	computed: {
		totalPages() {
			return Math.max(1, Math.ceil(this.total / this.pageSize));
		}
	},
	filters: {
		date(val) {
			if (!val) return '';
			const d = new Date(val);
			return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
		}
	},
	methods: {
		async fetchList(page = 1) {
			if (this.loading) return;
			this.loading = true;
			try {
				const res = await uniCloud.callFunction({
					name: 'listScripts',
					data: { page, pageSize: this.pageSize, q: this.q }
				});
				const result = (res && res.result) ? res.result : res;
				this.list = result.data || [];
				this.total = result.total || (this.list.length);
				this.page = page;
			} catch (err) {
				uni.showToast({ title: '加载失败', icon: 'none' });
				console.error(err);
			} finally {
				this.loading = false;
			}
		},
		onSearch() {
			this.fetchList(1);
		},
		onCreate() {
			uni.navigateTo({ url: '/pages/admin/scripts/edit' });
		},
		onEdit(item) {
			uni.navigateTo({ url: `/pages/admin/scripts/edit?id=${item.id}` });
		},
		async onDelete(item) {
			const ok = await new Promise(resolve => {
				uni.showModal({ title: '确认', content: `删除《${item.title}》？`, success: res => resolve(res.confirm) });
			});
			if (!ok) return;
			try {
				const res = await uniCloud.callFunction({ name: 'adminScript', data: { action: 'delete', id: item.id }});
				const r = (res && res.result) ? res.result : res;
				if (r && r.code === 0) {
					uni.showToast({ title: '删除成功' });
					this.fetchList(this.page);
				} else {
					uni.showToast({ title: r.errMsg || '删除失败', icon: 'none' });
				}
			} catch (err) {
				console.error(err);
				uni.showToast({ title: '删除失败', icon: 'none' });
			}
		},
		goPage(p) {
			p = Math.max(1, Math.min(this.totalPages, p));
			this.fetchList(p);
		},
		goJump() {
			const p = parseInt(this.jump, 10);
			if (isNaN(p)) return;
			this.goPage(p);
		}
	},
	onLoad() {
		this.fetchList(1);
	}
}
</script>

<style scoped>
.container { padding: 20rpx; }
.header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20rpx; }
.title { font-size:32rpx; font-weight:600; }
.search-row { display:flex; gap:10rpx; margin-bottom:10rpx; }
.table { border-top:1rpx solid #eee; }
.tr { display:flex; padding:12rpx 0; border-bottom:1rpx solid #f5f5f5; align-items:center; }
.tr.header { background:#fafafa; font-weight:600; color:#333; }
.td { flex:1; padding:0 8rpx; }
.td.thumb { width:140rpx; flex:0 0 140rpx; }
.thumb-img { width:120rpx; height:80rpx; border-radius:8rpx; box-shadow: 0 6rpx 16rpx rgba(0,0,0,0.12); }
.thumb-empty { width:120rpx; height:80rpx; background:linear-gradient(135deg,#f0f0f0,#e9e9e9); display:flex; align-items:center; justify-content:center; color:#999; border-radius:8rpx; }
.row-card { background:#fff; border-radius:10rpx; padding:12rpx; margin-bottom:12rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.item-title { font-size:28rpx; font-weight:600; color:#222; margin-bottom:6rpx; }
.item-sub { font-size:22rpx; color:#777; }
.tag-pill { display:inline-block; padding:6rpx 12rpx; background:#f0f6ff; color:#2a6cff; border-radius:16rpx; font-size:22rpx; }
.btn { padding:6rpx 10rpx; border-radius:6rpx; background:transparent; border:1rpx solid #dcdcdc; color:#333; margin-right:8rpx; font-size:24rpx; }
.btn.primary { background:#2a6cff; color:#fff; border-color:transparent; padding:6rpx 10rpx; font-size:24rpx; }
.btn.danger { background:#ff6b6b; color:#fff; border-color:transparent; padding:6rpx 10rpx; font-size:24rpx; }
.pager { display:flex; align-items:center; gap:10rpx; margin-top:16rpx; }
.action-row { display:flex; gap:12rpx; align-items:center; justify-content:center; }
.action-row .btn { min-width:120rpx; padding:8rpx 12rpx; }
</style>


