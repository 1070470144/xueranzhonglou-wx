<template>
	<view class="container">
		<scroll-view scroll-y="true" class="scroll-container">
			<!-- 图片轮播 -->
			<view class="image-carousel" v-if="script.images && script.images.length > 0" @click="openImageViewer">
				<swiper
					:indicator-dots="script.images.length > 1"
					:autoplay="script.images.length > 1"
					:interval="3000"
					:duration="500"
					class="swiper"
					@change="onSwiperChange"
				>
					<swiper-item
						v-for="(image, index) in script.images"
						:key="index"
					>
					<image :src="image" class="script-image" mode="aspectFill" @click="openImageViewer" />
					</swiper-item>
				</swiper>
				<view class="zoom-hint" v-if="script.images && script.images.length > 0">
					<text class="zoom-icon">🔍</text>
				</view>
			</view>

			<!-- 全屏图片查看器 -->
			<view class="image-viewer" v-if="showImageViewer" @click="closeImageViewer">
				<view class="viewer-header">
					<view class="viewer-close" @click.stop="closeImageViewer">
						<text class="close-icon">✕</text>
					</view>
				<view class="viewer-indicator">
					<text class="indicator-text">{{ currentImageIndex + 1 }} / {{ viewerImages.length }}</text>
				</view>
				<view class="viewer-original-btn" @click.stop="toggleOriginal">
					<text class="original-text">{{ showingOriginals ? '缩略' : '原图' }}</text>
				</view>
				</view>

				<swiper
					:current="currentImageIndex"
					:indicator-dots="false"
					class="viewer-swiper"
					@change="onViewerChange"
				>
					<swiper-item
						v-for="(image, index) in viewerImages"
						:key="index"
					>
						<image :src="image" class="viewer-image" mode="aspectFit" @click.stop @longpress="onImageLongPress(image)" />
					</swiper-item>
				</swiper>

				<view class="viewer-nav" v-if="script.images.length > 1">
					<view class="nav-btn prev-btn" @click.stop="prevImage" v-if="currentImageIndex > 0">
						<text class="nav-icon">‹</text>
					</view>
					<view class="nav-btn next-btn" @click.stop="nextImage" v-if="currentImageIndex < script.images.length - 1">
						<text class="nav-icon">›</text>
					</view>
				</view>

				<!-- 长按保存提示 -->
				<view class="save-hint">
					<text class="save-hint-text">长按可保存图片</text>
				</view>
			</view>

			<!-- 剧本详情信息 -->
			<view class="script-detail">
				<view class="script-header">
					<view class="script-title">{{ script.title }}</view>
					<view class="script-meta">
						<view class="meta-item">
							<text class="label">作者：</text>
							<text class="value">{{ script.author }}</text>
						</view>
						<view class="meta-item">
							<text class="label">版本：</text>
							<text class="value">{{ script.version }}</text>
						</view>
						<view class="meta-item">
							<text class="label">更新时间：</text>
							<text class="value">{{ script.updateTime }}</text>
						</view>
					</view>
				</view>

				<!-- 剧本描述 -->
				<view class="script-description">
					<view class="section-title">剧本简介</view>
					<view class="description-content">{{ script.description }}</view>
				</view>

				<!-- 游戏信息 -->
				<view class="game-info">
					<view class="section-title">游戏信息</view>
					<view class="info-grid">
						<view class="info-item">
							<text class="label">推荐玩家数：</text>
							<text class="value">{{ script.playerCount }}</text>
						</view>
						<view class="info-item">
							<text class="label">难度等级：</text>
							<text class="value">{{ script.difficulty }}</text>
						</view>
						<view class="info-item">
							<text class="label">使用次数：</text>
							<text class="value">{{ script.usageCount }}</text>
						</view>
						<view class="info-item">
							<text class="label">标签：</text>
							<text class="value">{{ script.tag }}</text>
						</view>
					</view>
				</view>

				<!-- 剧本角色展示 -->
				<view class="character-section" role="region" aria-label="剧本角色信息">
					<view class="character-header" @click="toggleCharacterDisplay" role="button" tabindex="0" aria-expanded="{{ showCharacters }}" aria-controls="character-content">
						<view class="section-title">剧本角色</view>
						<view class="expand-icon" :class="{ 'expanded': showCharacters }">
							<text class="icon-text">{{ showCharacters ? '▼' : '▶' }}</text>
						</view>
					</view>
					<view class="character-content" v-if="showCharacters" id="character-content">
						<view class="character-groups" v-if="hasCharacters">
							<!-- 镇民 -->
							<view class="character-group" v-if="characters.townsfolk && characters.townsfolk.length > 0">
								<view class="group-header" @click="toggleCategory('townsfolk')" role="button" tabindex="0" aria-expanded="{{ characterCategoryStates.townsfolk }}" aria-controls="townsfolk-list">
									<view class="group-title-row">
										<text class="group-title">镇民</text>
										<text class="group-count">({{ characters.townsfolk.length }})</text>
									</view>
									<view class="category-expand-icon" :class="{ 'expanded': characterCategoryStates.townsfolk }">
										<text class="icon-text">{{ characterCategoryStates.townsfolk ? '▼' : '▶' }}</text>
									</view>
								</view>
								<view class="character-list" v-if="characterCategoryStates.townsfolk" id="townsfolk-list" role="list">
									<view
										class="character-card"
										v-for="(character, index) in characters.townsfolk"
										:key="`townsfolk-${index}`"
										role="listitem"
										tabindex="0"
									>
										<view class="character-icon" v-if="character.icon">
											<image :src="character.icon" class="icon-image" mode="aspectFit" />
										</view>
										<view class="character-icon-placeholder" v-else>
											<text class="placeholder-text">{{ character.name ? character.name.charAt(0) : '?' }}</text>
										</view>
										<view class="character-info">
											<view class="character-name">{{ character.name || '未知角色' }}</view>
									<view class="character-ability" v-if="character.skills && character.skills.length > 0">
										<view class="ability-content">
											<text class="ability-text" v-for="(skill, skillIndex) in character.skills" :key="skillIndex">
												{{ skill }}{{ skillIndex < character.skills.length - 1 ? '。' : '' }}
											</text>
										</view>
									</view>
										</view>
									</view>
								</view>
							</view>

							<!-- 外来者 -->
							<view class="character-group" v-if="characters.outsiders && characters.outsiders.length > 0">
								<view class="group-header" @click="toggleCategory('outsiders')" role="button" tabindex="0" aria-expanded="{{ characterCategoryStates.outsiders }}" aria-controls="outsiders-list">
									<view class="group-title-row">
										<text class="group-title">外来者</text>
										<text class="group-count">({{ characters.outsiders.length }})</text>
									</view>
									<view class="category-expand-icon" :class="{ 'expanded': characterCategoryStates.outsiders }">
										<text class="icon-text">{{ characterCategoryStates.outsiders ? '▼' : '▶' }}</text>
									</view>
								</view>
								<view class="character-list" v-if="characterCategoryStates.outsiders" id="outsiders-list" role="list">
									<view
										class="character-card"
										v-for="(character, index) in characters.outsiders"
										:key="`outsiders-${index}`"
										role="listitem"
										tabindex="0"
									>
										<view class="character-icon" v-if="character.icon">
											<image :src="character.icon" class="icon-image" mode="aspectFit" />
										</view>
										<view class="character-icon-placeholder" v-else>
											<text class="placeholder-text">{{ character.name ? character.name.charAt(0) : '?' }}</text>
										</view>
										<view class="character-info">
											<view class="character-name">{{ character.name || '未知角色' }}</view>
									<view class="character-ability" v-if="character.skills && character.skills.length > 0">
										<view class="ability-content">
											<text class="ability-text" v-for="(skill, skillIndex) in character.skills" :key="skillIndex">
												{{ skill }}{{ skillIndex < character.skills.length - 1 ? '。' : '' }}
											</text>
										</view>
									</view>
										</view>
									</view>
								</view>
							</view>

							<!-- 爪牙 -->
							<view class="character-group" v-if="characters.minions && characters.minions.length > 0">
								<view class="group-header" @click="toggleCategory('minions')" role="button" tabindex="0" aria-expanded="{{ characterCategoryStates.minions }}" aria-controls="minions-list">
									<view class="group-title-row">
										<text class="group-title">爪牙</text>
										<text class="group-count">({{ characters.minions.length }})</text>
									</view>
									<view class="category-expand-icon" :class="{ 'expanded': characterCategoryStates.minions }">
										<text class="icon-text">{{ characterCategoryStates.minions ? '▼' : '▶' }}</text>
									</view>
								</view>
								<view class="character-list" v-if="characterCategoryStates.minions" id="minions-list" role="list">
									<view
										class="character-card"
										v-for="(character, index) in characters.minions"
										:key="`minions-${index}`"
										role="listitem"
										tabindex="0"
									>
										<view class="character-icon" v-if="character.icon">
											<image :src="character.icon" class="icon-image" mode="aspectFit" />
										</view>
										<view class="character-icon-placeholder" v-else>
											<text class="placeholder-text">{{ character.name ? character.name.charAt(0) : '?' }}</text>
										</view>
										<view class="character-info">
											<view class="character-name">{{ character.name || '未知角色' }}</view>
									<view class="character-ability" v-if="character.skills && character.skills.length > 0">
										<view class="ability-content">
											<text class="ability-text" v-for="(skill, skillIndex) in character.skills" :key="skillIndex">
												{{ skill }}{{ skillIndex < character.skills.length - 1 ? '。' : '' }}
											</text>
										</view>
									</view>
										</view>
									</view>
								</view>
							</view>

							<!-- 恶魔 -->
							<view class="character-group" v-if="characters.demons && characters.demons.length > 0">
								<view class="group-header" @click="toggleCategory('demons')" role="button" tabindex="0" aria-expanded="{{ characterCategoryStates.demons }}" aria-controls="demons-list">
									<view class="group-title-row">
										<text class="group-title">恶魔</text>
										<text class="group-count">({{ characters.demons.length }})</text>
									</view>
									<view class="category-expand-icon" :class="{ 'expanded': characterCategoryStates.demons }">
										<text class="icon-text">{{ characterCategoryStates.demons ? '▼' : '▶' }}</text>
									</view>
								</view>
								<view class="character-list" v-if="characterCategoryStates.demons" id="demons-list" role="list">
									<view
										class="character-card"
										v-for="(character, index) in characters.demons"
										:key="`demons-${index}`"
										role="listitem"
										tabindex="0"
									>
										<view class="character-icon" v-if="character.icon">
											<image :src="character.icon" class="icon-image" mode="aspectFit" />
										</view>
										<view class="character-icon-placeholder" v-else>
											<text class="placeholder-text">{{ character.name ? character.name.charAt(0) : '?' }}</text>
										</view>
										<view class="character-info">
											<view class="character-name">{{ character.name || '未知角色' }}</view>
									<view class="character-ability" v-if="character.skills && character.skills.length > 0">
										<view class="ability-content">
											<text class="ability-text" v-for="(skill, skillIndex) in character.skills" :key="skillIndex">
												{{ skill }}{{ skillIndex < character.skills.length - 1 ? '。' : '' }}
											</text>
										</view>
									</view>
										</view>
									</view>
								</view>
							</view>

							<!-- 旅行者 -->
							<view class="character-group" v-if="characters.travelers && characters.travelers.length > 0">
								<view class="group-header" @click="toggleCategory('travelers')" role="button" tabindex="0" aria-expanded="{{ characterCategoryStates.travelers }}" aria-controls="travelers-list">
									<view class="group-title-row">
										<text class="group-title">旅行者</text>
										<text class="group-count">({{ characters.travelers.length }})</text>
									</view>
									<view class="category-expand-icon" :class="{ 'expanded': characterCategoryStates.travelers }">
										<text class="icon-text">{{ characterCategoryStates.travelers ? '▼' : '▶' }}</text>
									</view>
								</view>
								<view class="character-list" v-if="characterCategoryStates.travelers" id="travelers-list" role="list">
									<view
										class="character-card"
										v-for="(character, index) in characters.travelers"
										:key="`travelers-${index}`"
										role="listitem"
										tabindex="0"
									>
										<view class="character-icon" v-if="character.icon">
											<image :src="character.icon" class="icon-image" mode="aspectFit" />
										</view>
										<view class="character-icon-placeholder" v-else>
											<text class="placeholder-text">{{ character.name ? character.name.charAt(0) : '?' }}</text>
										</view>
										<view class="character-info">
											<view class="character-name">{{ character.name || '未知角色' }}</view>
									<view class="character-ability" v-if="character.skills && character.skills.length > 0">
										<view class="ability-content">
											<text class="ability-text" v-for="(skill, skillIndex) in character.skills" :key="skillIndex">
												{{ skill }}{{ skillIndex < character.skills.length - 1 ? '。' : '' }}
											</text>
										</view>
									</view>
										</view>
									</view>
								</view>
							</view>

							<!-- 传奇角色 -->
							<view class="character-group" v-if="characters.fabled && characters.fabled.length > 0">
								<view class="group-header" @click="toggleCategory('fabled')" role="button" tabindex="0" aria-expanded="{{ characterCategoryStates.fabled }}" aria-controls="fabled-list">
									<view class="group-title-row">
										<text class="group-title">传奇角色</text>
										<text class="group-count">({{ characters.fabled.length }})</text>
									</view>
									<view class="category-expand-icon" :class="{ 'expanded': characterCategoryStates.fabled }">
										<text class="icon-text">{{ characterCategoryStates.fabled ? '▼' : '▶' }}</text>
									</view>
								</view>
								<view class="character-list" v-if="characterCategoryStates.fabled" id="fabled-list" role="list">
									<view
										class="character-card"
										v-for="(character, index) in characters.fabled"
										:key="`fabled-${index}`"
										role="listitem"
										tabindex="0"
									>
										<view class="character-icon" v-if="character.icon">
											<image :src="character.icon" class="icon-image" mode="aspectFit" />
										</view>
										<view class="character-icon-placeholder" v-else>
											<text class="placeholder-text">{{ character.name ? character.name.charAt(0) : '?' }}</text>
										</view>
										<view class="character-info">
											<view class="character-name">{{ character.name || '未知角色' }}</view>
									<view class="character-ability" v-if="character.skills && character.skills.length > 0">
										<view class="ability-content">
											<text class="ability-text" v-for="(skill, skillIndex) in character.skills" :key="skillIndex">
												{{ skill }}{{ skillIndex < character.skills.length - 1 ? '。' : '' }}
											</text>
										</view>
									</view>
										</view>
									</view>
								</view>
							</view>

							<!-- 其他 -->
							<view class="character-group" v-if="characters.other && characters.other.length > 0">
								<view class="group-header" @click="toggleCategory('other')" role="button" tabindex="0" aria-expanded="{{ characterCategoryStates.other }}" aria-controls="other-list">
									<view class="group-title-row">
										<text class="group-title">其他</text>
										<text class="group-count">({{ characters.other.length }})</text>
									</view>
									<view class="category-expand-icon" :class="{ 'expanded': characterCategoryStates.other }">
										<text class="icon-text">{{ characterCategoryStates.other ? '▼' : '▶' }}</text>
									</view>
								</view>
								<view class="character-list" v-if="characterCategoryStates.other" id="other-list" role="list">
									<view
										class="character-card"
										v-for="(character, index) in characters.other"
										:key="`other-${index}`"
										role="listitem"
										tabindex="0"
									>
										<view class="character-icon" v-if="character.icon">
											<image :src="character.icon" class="icon-image" mode="aspectFit" />
										</view>
										<view class="character-icon-placeholder" v-else>
											<text class="placeholder-text">{{ character.name ? character.name.charAt(0) : '?' }}</text>
										</view>
										<view class="character-info">
											<view class="character-name">{{ character.name || '未知角色' }}</view>
									<view class="character-ability" v-if="character.skills && character.skills.length > 0">
										<view class="ability-content">
											<text class="ability-text" v-for="(skill, skillIndex) in character.skills" :key="skillIndex">
												{{ skill }}{{ skillIndex < character.skills.length - 1 ? '。' : '' }}
											</text>
										</view>
									</view>
										</view>
									</view>
								</view>
							</view>
						</view>
						<view class="no-characters" v-else>
							<text class="no-characters-text">暂无角色信息</text>
						</view>
					</view>
				</view>

				<!-- 底部操作按钮 -->
				<view class="bottom-actions">
					<button
						class="action-btn secondary"
						@click="shareScript"
					>
						分享剧本
					</button>
					<button
						class="action-btn secondary"
						@click="toggleLike"
					>
						{{ isLiked ? '已点赞' : '点赞' }} ({{ script.likes }})
					</button>
					<button
						class="action-btn primary"
						@click="copyJsonUrl"
					>
						复制JSON
					</button>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import { likeScript, unlikeScript, initScriptLikeStatus } from '@/utils/api.js';
import { getAuthToken } from '@/utils/auth.js';

export default {
	data() {
		return {
			scriptId: null,
			isLiked: false,
			showImageViewer: false,
			currentImageIndex: 0,
			viewerImages: [],
			showingOriginals: false,
			showCharacters: false,
			characterCategoryStates: {
				townsfolk: false,   // 镇民默认收缩
				outsiders: false,   // 外来者默认收缩
				minions: false,     // 爪牙默认收缩
				demons: false,      // 恶魔默认收缩
				travelers: false,   // 旅行者默认收缩
				fabled: false,      // 传奇角色默认收缩
				other: false        // 其他默认收缩
			},
			characters: {
				townsfolk: [],    // 镇民
				outsiders: [],    // 外来者
				minions: [],      // 爪牙
				demons: [],       // 恶魔
				travelers: [],    // 旅行者
				fabled: [],       // 传奇角色
				other: []         // 其他
			},
			script: {
				id: 1,
				title: '经典剧本：狼人杀',
				author: '血染钟楼官方',
				version: '1.0.0',
				updateTime: '2024-01-12',
				jsonUrl: 'https://example.com/script1.json',
				description: '经典的狼人杀剧本，适合新手入门。游戏中狼人会在夜晚行动，村民需要在白天找出并处决狼人。',
				playerCount: '8-12人',
				difficulty: '简单',
				usageCount: 1250,
				tag: '推理',
				likes: 156,
				images: [
					'/static/script1.jpg',
					'/static/script2.jpg'
				]
			}
		}
	},
	onLoad(options) {
		this.scriptId = options.id;
		// 启用微信转发功能
		this.enableShareMenu();
		// 这里可以根据scriptId从服务器获取剧本详情
		this.loadScriptDetail();
	},
	// (enabled via methods) -- placeholder removed to keep onShareAppMessage at page root
	// 微信小程序转发功能
	onShareAppMessage() {
		const shareData = {
			title: `${this.script.title} - ${this.script.author}`,
			path: `/pages/script-detail/script-detail?id=${this.scriptId}`,
			imageUrl: this.script.images && this.script.images.length > 0 ? this.script.images[0] : undefined
		};

		return shareData;
	},
	methods: {
		// 启用微信转发菜单（仅在微信小程序环境）
		enableShareMenu() {
			// #ifdef MP-WEIXIN
			wx.showShareMenu({
				withShareTicket: true,
				menus: ['shareAppMessage', 'shareTimeline']
			});
			// #endif
		},

		// 主动触发分享（绑定到页面按钮）
		shareScript() {
			console.log('分享按钮被点击');
			// #ifdef MP-WEIXIN
			try {
				console.log('调用 wx.showShareMenu');
				// 使用微信小程序原生API
				wx.showShareMenu({
					withShareTicket: true,
					menus: ['shareAppMessage', 'shareTimeline'],
					success: function() {
						console.log('wx.showShareMenu 成功');
						// 直接显示引导提示
						uni.showToast({
							title: '请点击右上角进行分享',
							icon: 'none',
							duration: 3000
						});
					},
					fail: function(err) {
						console.error('wx.showShareMenu 失败:', err);
						uni.showToast({
							title: '请点击右上角进行分享',
							icon: 'none',
							duration: 2000
						});
					}
				});
			} catch (error) {
				console.error('分享功能调用出错:', error);
				uni.showToast({
					title: '分享功能暂时不可用',
					icon: 'none'
				});
			}
			// #endif

			// #ifndef MP-WEIXIN
			console.log('非微信小程序环境');
			uni.showToast({
				title: '请使用微信小程序体验分享功能',
				icon: 'none'
			});
			// #endif
		},
		// 图片长按保存入口
		onImageLongPress(imageUrl) {
			try {
				// 在 HBuilderX / H5 环境中，原生 action sheet 可能被全屏图片遮挡，
				// 临时隐藏全屏查看器以确保 action sheet 在最上层显示。
				// #ifdef H5
				const wasViewerOpen = this.showImageViewer;
				if (wasViewerOpen) this.showImageViewer = false;
				// #endif

				uni.showActionSheet({
					itemList: ['保存图片']
				}).then(res => {
					if (res.tapIndex === 0) {
						this.saveImageToAlbum(imageUrl);
					}
				}).catch(() => {
					// 用户取消或不支持
				}).finally(() => {
					// 恢复全屏查看器（仅在之前是打开的情况下）
					// #ifdef H5
					if (wasViewerOpen) this.showImageViewer = true;
					// #endif
				});
			} catch (e) {
				// 兼容回退
				try {
					uni.showActionSheet({
						itemList: ['保存图片'],
						success: function (r) {
							if (r.tapIndex === 0) {
								// fallback to callback style
							}
						},
						fail: function () {}
					});
				} catch (err) {
					// ignore
				}
			}
		},

		// 保存图片到相册，支持远程和本地路径
		async saveImageToAlbum(url) {
			if (!url) {
				uni.showToast({ title: '图片地址无效', icon: 'none' });
				return;
			}

			try {
				let filePath = url;
				// 下载远程图片
				if (/^https?:\/\//i.test(url)) {
					const dl = await new Promise((resolve, reject) => {
						uni.downloadFile({
							url,
							success: res => {
								if (res.statusCode === 200 && res.tempFilePath) {
									resolve(res.tempFilePath);
								} else {
									reject(new Error('下载失败'));
								}
							},
							fail: reject
						});
					});
					filePath = dl;
				}

				// 保存到相册
				await new Promise((resolve, reject) => {
					uni.saveImageToPhotosAlbum({
						filePath,
						success: resolve,
						fail: err => reject(err)
					});
				});

				uni.showToast({ title: '保存成功', icon: 'success' });
			} catch (err) {
				console.error('保存图片失败', err);
				const msg = (err && err.errMsg) ? String(err.errMsg) : String(err);
				// 授权未通过或被拒绝
				if (msg.toLowerCase().includes('authorize') || msg.toLowerCase().includes('auth') || msg.toLowerCase().includes('permission')) {
					uni.showModal({
						title: '保存失败',
						content: '请授予相册权限以保存图片，是否前往设置？',
						success: res => {
							if (res.confirm) {
								uni.openSetting();
							}
						}
					});
				} else {
					uni.showToast({ title: '保存失败', icon: 'none' });
				}
			}
		},

		async loadScriptDetail() {
			if (!this.scriptId) return;

			try {
				this._lastError = null;
				const res = await uniCloud.callFunction({
					name: 'getScript',
					data: { id: this.scriptId }
				});
				const result = (res && res.result) ? res.result : res;

				// Support result.data as array or single object
				let item = null;
				if (result && result.code === 0 && result.data) {
					if (Array.isArray(result.data)) {
						item = result.data[0];
					} else if (typeof result.data === 'object') {
						item = result.data;
					} else {
						// Try parse JSON string
						try {
							item = JSON.parse(result.data);
						} catch (parseErr) {
							console.warn('getScript returned data in unexpected format', parseErr, result.data);
							item = null;
						}
					}
				}

				if (item && typeof item === 'object') {
					// 数据结构统一适配 - defensive: wrap per-field operations to avoid throwing
					try {
						// ID字段标准化
						item.id = item._id || item.id;
						delete item._id;

						// 图片字段处理
						this.resolveImages(item);

						// 状态字段默认值
						item.status = item.status || 'active';

						// 标签字段转换：数组转字符串（用于显示）
						if (Array.isArray(item.tags) && item.tags.length > 0) {
							item.tag = item.tags[0];
						} else {
							item.tag = '推理';
						}

						// 时间字段映射/格式化
						item.updateTime = item.updateTime || item.createdAt;

						// 统计字段默认值
						item.usageCount = item.usageCount || 0;
						item.likes = item.likes || 0;

						// 版本字段默认值
						item.version = item.version || '1.0.0';

						// 其他字段默认值
						item.playerCount = item.playerCount || '8-12人';
						item.difficulty = item.difficulty || '中等';
						item.jsonUrl = item.fileUrl || item.jsonUrl || '#';
					} catch (procErr) {
						console.error('process fetched script failed', procErr, item && item.id);
					}

					// 初始化点赞状态 safely
					try {
						item = initScriptLikeStatus(item);
						this.isLiked = !!item.isLiked;
					} catch (likeErr) {
						console.warn('initScriptLikeStatus failed', likeErr);
						this.isLiked = false;
					}

					this.script = item;

					// 提取角色数据
					await this.extractCharacterData(this.scriptId);
				} else {
					console.error('剧本详情加载失败: invalid data', result);
					this._lastError = result;
					uni.showToast({ title: '加载失败，请稍后重试', icon: 'none' });
				}
			} catch (err) {
				// Log full error for debugging but show friendly UI message
				console.error('loadScriptDetail error', err);
				this._lastError = err;
				uni.showToast({ title: '加载失败，请稍后重试', icon: 'none' });
			}
		},

		// 图片字段处理方法
		resolveImages(item) {
			let processedImages = [];

			// 优先使用 thumbnails (管理端标准)
			if (Array.isArray(item.thumbnails) && item.thumbnails.length) {
				processedImages = item.thumbnails.slice(0, 3);
			} else if (item.thumbnail) {
				// 降级到 thumbnail (单个图片)
				processedImages = [item.thumbnail];
			} else if (Array.isArray(item.images) && item.images.length) {
				// 处理 images 数组中的对象或字符串
				processedImages = item.images.slice(0, 3).map(img => {
					// 如果是字符串，直接使用
					if (typeof img === 'string') {
						return img;
					}
					// 如果是对象，尝试获取url属性
					if (typeof img === 'object' && img !== null) {
						return img.url || img.fileId || img.path || null;
					}
					return null;
				}).filter(url => url && typeof url === 'string');
			}

			// 确保至少有一个有效的URL
			item.images = processedImages.length > 0 ? processedImages : [];
		},
		// fetch full-size images for viewer
		async fetchFullImages() {
			if (!this.scriptId) return;
			try {
				const res = await uniCloud.callFunction({
					name: 'getScript',
					data: { id: this.scriptId }
				});
				const result = (res && res.result) ? res.result : res;
				if (result && result.code === 0 && Array.isArray(result.data) && result.data.length) {
					const item = result.data[0];
					// use original images if present, convert objects to URLs
					if (Array.isArray(item.images) && item.images.length) {
						this.viewerImages = item.images.map(img => {
							// 如果是字符串，直接使用
							if (typeof img === 'string') {
								return img;
							}
							// 如果是对象，尝试获取url属性
							if (typeof img === 'object' && img !== null) {
								return img.url || img.fileId || img.path || null;
							}
							return null;
						}).filter(url => url && typeof url === 'string');
						this.showingOriginals = true;
						return;
					}
				}
			} catch (err) {
				console.error('fetchFullImages error', err);
			}
			// fallback: keep current viewerImages
		},
		// toggle between thumbnails and originals
		async toggleOriginal() {
			if (this.showingOriginals) {
				// switch back to thumbnails (current images should already be processed URLs)
				this.viewerImages = (this.script.images || []).slice(0, 3);
				this.showingOriginals = false;
			} else {
				// fetch originals then show
				await this.fetchFullImages();
			}
		},
		openImageViewer() {
			// open with thumbnails first
			this.viewerImages = (this.script.images || []).slice(0, 3);
			this.showingOriginals = false;
			this.showImageViewer = true;
		},
		closeImageViewer() {
			this.showImageViewer = false;
		},
		onSwiperChange(e) {
			this.currentImageIndex = e.detail.current;
		},
		onViewerChange(e) {
			this.currentImageIndex = e.detail.current;
		},
		prevImage() {
			if (this.currentImageIndex > 0) {
				this.currentImageIndex--;
			}
		},
		nextImage() {
			if (this.currentImageIndex < this.script.images.length - 1) {
				this.currentImageIndex++;
			}
		},
		async copyJsonUrl() {
			try {
				uni.showLoading({ title: '生成链接中...' });

				// 调用getScriptJson云函数，设置link=true生成data URL
				const res = await uniCloud.callFunction({
					name: 'getScriptJson',
					data: {
						scriptId: this.scriptId,
						link: true,
						token: getAuthToken(),
						format: 'pretty'
					}
				});
				const result = (res && res.result) ? res.result : res;

				if (result && result.jsonUrl) {
					// 复制生成的data URL到剪贴板
					await uni.setClipboardData({
						data: result.jsonUrl,
						success: () => {
							// 更新本地使用次数显示
							if (result.usageUpdated && result.usageCount !== undefined) {
								this.script.usageCount = result.usageCount;
							}

							uni.showToast({
								title: 'JSON链接已复制',
								icon: 'success'
							});
						}
					});
				} else {
					throw new Error('生成链接失败');
				}
			} catch (error) {
				console.error('Copy JSON URL error:', error);
				const message = error && error.message ? error.message : '复制失败';
				uni.showToast({ title: message, icon: 'none' });
			} finally {
				uni.hideLoading();
			}
		},
		async toggleLike() {
			const newLikedState = !this.isLiked;

			try {
				let result;
				if (newLikedState) {
					// 点赞
					result = await likeScript(this.script.id);
					if (result.success) {
						this.script.likes++;
					}
				} else {
					// 取消点赞
					result = await unlikeScript(this.script.id);
					if (result.success) {
						this.script.likes = Math.max(0, this.script.likes - 1);
					}
				}

				if (result.success) {
					this.isLiked = newLikedState;
					this.script.isLiked = newLikedState;
					uni.showToast({
						title: result.message,
						icon: 'success'
					});
				} else {
					uni.showToast({
						title: result.message,
						icon: 'none'
					});
				}
			} catch (error) {
				console.error('点赞操作失败:', error);
				uni.showToast({
					title: '操作失败，请重试',
					icon: 'none'
				});
			}
		},

		// 切换角色展示区域的展开/收起状态
		toggleCharacterDisplay() {
			this.showCharacters = !this.showCharacters;
		},

		// 切换角色类别的展开/收起状态
		toggleCategory(category) {
			this.characterCategoryStates[category] = !this.characterCategoryStates[category];
		},

		// 提取角色技能信息
		extractSkills(character) {
			// 优先级：skills数组 > abilities数组 > skill字符串 > ability字符串
			if (Array.isArray(character.skills) && character.skills.length > 0) {
				return character.skills;
			}
			if (Array.isArray(character.abilities) && character.abilities.length > 0) {
				return character.abilities;
			}
			if (character.skill && typeof character.skill === 'string') {
				return [character.skill];
			}
			if (character.ability && typeof character.ability === 'string') {
				// 对于ability字符串，我们可以尝试分割成多个技能
				// 通常技能描述中可能包含多个句子或段落
				const skills = character.ability.split(/[。！？]/).filter(s => s.trim().length > 0);
				return skills.length > 0 ? skills : [character.ability];
			}
			return [];
		},

		// 标准化角色类别名称
		normalizeCategory(category) {
			if (!category || typeof category !== 'string') {
				return 'other';
			}

			const normalized = category.toLowerCase().trim();

			const categoryMap = {
				// 镇民 (Townsfolk)
				'townsfolk': 'townsfolk',
				'镇民': 'townsfolk',
				'villager': 'townsfolk',
				'town': 'townsfolk',

				// 外来者 (Outsiders)
				'outsider': 'outsiders',
				'outsiders': 'outsiders',
				'外来者': 'outsiders',

				// 爪牙 (Minions)
				'minion': 'minions',
				'minions': 'minions',
				'爪牙': 'minions',

				// 恶魔 (Demons)
				'demon': 'demons',
				'demons': 'demons',
				'恶魔': 'demons',

				// 旅行者 (Travelers)
				'traveler': 'travelers',
				'travelers': 'travelers',
				'traveller': 'travelers',
				'travellers': 'travelers',
				'旅行者': 'travelers',

				// 传奇角色 (Fabled)
				'fabled': 'fabled',
				'传奇角色': 'fabled',
				'fable': 'fabled',
				'legendary': 'fabled',

				// 处理特殊情况和变体
				'a jinxed': 'other',  // 特殊状态的角色

				// 其他保持为other
				'other': 'other',
				'其他': 'other',
				'unknown': 'other'
			};

			const result = categoryMap[normalized] || 'other';
			return result;
		},

		// 从剧本JSON数据中提取角色信息
		async extractCharacterData(scriptId) {
			try {
				// 调用getScriptJson云函数获取完整的JSON数据
				const res = await uniCloud.callFunction({
					name: 'getScriptJson',
					data: { scriptId: scriptId }
				});

				if (res && res.result) {
					let jsonData = res.result;

					// 处理角色数据
					let characters = [];

					// 支持多种JSON结构
					if (Array.isArray(jsonData)) {
						// 如果是直接的角色数组
						characters = jsonData;
					} else if (jsonData && Array.isArray(jsonData.roles)) {
						// 如果角色数据在roles属性中
						characters = jsonData.roles;
					} else if (jsonData && Array.isArray(jsonData.content)) {
						// 如果在content属性中
						characters = jsonData.content;
					} else if (jsonData && typeof jsonData === 'object') {
						// 尝试查找可能的角色字段
						characters = jsonData.characters || jsonData.roles || jsonData.players || [];
					}

					// 标准化角色数据格式并按类别分组
					const categorizedCharacters = {
						townsfolk: [],    // 镇民
						outsiders: [],    // 外来者
						minions: [],      // 爪牙
						demons: [],       // 恶魔
						travelers: [],    // 旅行者
						fabled: [],       // 传奇角色
						other: []         // 其他
					};

					characters.forEach((character, index) => {
						let normalizedChar = null;

						// 跳过元数据对象（没有name字段的对象）
						if (typeof character === 'object' && character !== null && !character.name && character.id === '_meta') {
							return; // 跳过元数据
						}

						if (typeof character === 'string') {
							// 如果是字符串，转换为对象格式
							normalizedChar = {
								name: character,
								icon: null,
								skills: [],
								category: 'other'
							};
						} else if (typeof character === 'object' && character !== null && character.name) {
							// 如果是对象且有name字段，标准化字段
							const rawCategory = character.team || character.category || character.type || character.roleType || 'other';
							const normalizedCategory = this.normalizeCategory(rawCategory);

							normalizedChar = {
								name: character.name || character.title || character.role || '未知角色',
								icon: character.icon || character.image || character.avatar || null,
								skills: this.extractSkills(character),
								category: normalizedCategory
							};

						}

						if (normalizedChar) {
							// 根据类别分组
							const category = normalizedChar.category;
							if (categorizedCharacters[category]) {
								categorizedCharacters[category].push(normalizedChar);
							} else {
								categorizedCharacters.other.push(normalizedChar);
							}
						}
					});

					this.characters = categorizedCharacters;

				} else {
					console.warn('Failed to fetch character data for script:', scriptId);
					this.characters = [];
				}
			} catch (error) {
				console.error('Error extracting character data:', error);
				this.characters = [];
			}
		}
	},
	computed: {
		hasCharacters() {
			return this.characters &&
				   (this.characters.townsfolk.length > 0 ||
					this.characters.outsiders.length > 0 ||
					this.characters.minions.length > 0 ||
					this.characters.demons.length > 0 ||
					this.characters.travelers.length > 0 ||
					this.characters.fabled.length > 0 ||
					this.characters.other.length > 0);
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	height: 100vh;
	background-color: #ffffff;
	color: #1f2329;
}

.scroll-container {
	height: 100%;
}

.image-carousel {
	height: 400rpx;
	position: relative;
	margin-bottom: 20rpx;
	cursor: pointer;

	&:active {
		opacity: 0.9;
	}
}

.swiper {
	height: 100%;
}

.script-image {
	width: 100%;
	height: 100%;
}

.script-detail {
	background-color: #fff;
	border-radius: 10rpx 10rpx 0 0;
	margin-top: -20rpx;
	padding: 34rpx 44rpx;
	min-height: calc(100vh - 400rpx);
}

.script-header {
	border-bottom: 1rpx solid #edf0f2;
	padding-bottom: 20rpx;
	margin-bottom: 20rpx;
}

.script-title {
	font-size: 36rpx;
	font-weight: bold;
	color: #1f2329;
	line-height: 1.4;
	margin-bottom: 16rpx;
}

.script-meta {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.meta-item {
	display: flex;
	font-size: 26rpx;
	line-height: 1.5;
}

.label {
	color: #8f959e;
	min-width: 120rpx;
}

.value {
	color: #1f2329;
}

.action-buttons {
	display: flex;
	gap: 20rpx;
	margin: 24rpx 0;
}

.bottom-actions {
	display: flex;
	gap: 20rpx;
	margin: 40rpx 0 20rpx 0;
	padding-top: 20rpx;
	border-top: 1rpx solid #edf0f2;
}

.action-btn {
	flex: 1;
	border-radius: 8rpx;
	font-size: 28rpx;
	height: 80rpx;
	line-height: 80rpx;
}

.primary {
	background-color: #20b15a;
	color: white;
}

.secondary {
	background-color: #ffffff;
	color: #1f8f4d;
	border: 1rpx solid #d9f0e3;
}

.section-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #1f2329;
	margin: 28rpx 0 12rpx 0;
	position: relative;

	&::before {
		content: '';
		display: inline-block;
		width: 14rpx;
		height: 14rpx;
		border-radius: 50%;
		background: #20b15a;
		margin-right: 12rpx;
		vertical-align: middle;
	}
}

.description-content {
	font-size: 28rpx;
	line-height: 1.6;
	color: #646a73;
	text-align: justify;
}

.game-info {
	margin-top: 32rpx;
}

.info-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 16rpx;
}

.info-item {
	display: flex;
	flex-direction: column;
	background-color: #f7f8fa;
	padding: 16rpx;
	border-radius: 8rpx;
	font-size: 24rpx;
}

.zoom-hint {
	position: absolute;
	top: 20rpx;
	right: 20rpx;
	background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%);
	border: 1rpx solid rgba(255, 255, 255, 0.3);
	border-radius: 20rpx;
	padding: 10rpx 16rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	backdrop-filter: blur(10rpx);
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.2);
	transition: all 0.3s ease;

	&:hover {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%);
		transform: scale(1.05);
	}
}

.zoom-icon {
	font-size: 24rpx;
	color: white;
	font-weight: 300;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.3);
}

// 图片查看器样式
.image-viewer {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background: linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(20, 20, 30, 0.98) 100%);
	z-index: 2000;
	display: flex;
	flex-direction: column;
	animation: fadeIn 0.3s ease-out;
	backdrop-filter: blur(2rpx);
}

.viewer-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 50rpx 30rpx 30rpx;
	color: white;
	position: relative;
}

.viewer-header::after {
	content: '';
	position: absolute;
	bottom: 0;
	left: 30rpx;
	right: 30rpx;
	height: 1rpx;
	background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
}

.viewer-close {
	width: 56rpx;
	height: 56rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%);
	border: 2rpx solid rgba(255, 255, 255, 0.2);
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.3);

	&:active {
		transform: scale(0.92);
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.2) 100%);
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.4);
	}

	&:hover {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%);
	}
}

.close-icon {
	font-size: 28rpx;
	color: white;
	font-weight: 300;
	line-height: 1;
}

.viewer-indicator {
	background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%);
	border: 1rpx solid rgba(255, 255, 255, 0.2);
	border-radius: 20rpx;
	padding: 12rpx 20rpx;
	font-size: 26rpx;
	color: white;
	font-weight: 500;
	backdrop-filter: blur(10rpx);
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.2);
}

.viewer-swiper {
	flex: 1;
	height: calc(100vh - 120rpx);
}

.viewer-image {
	width: 100%;
	height: 100%;
}

.viewer-nav {
	position: absolute;
	bottom: 80rpx;
	left: 0;
	right: 0;
	display: flex;
	justify-content: space-between;
	padding: 0 50rpx;
	pointer-events: none;
}

.nav-btn {
	width: 72rpx;
	height: 72rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, rgba(255, 255, 255, 0.30) 0%, rgba(255, 255, 255, 0.18) 100%);
	border: 2rpx solid rgba(255, 255, 255, 0.36);
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
	pointer-events: auto;
	box-shadow: 0 12rpx 36rpx rgba(0, 0, 0, 0.36);
	position: relative;
	overflow: hidden;

	&::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, transparent 50%);
		border-radius: 50%;
		opacity: 0;
		transition: opacity 0.24s;
	}

	&:active {
		transform: scale(0.9);
		box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.44);

		&::before {
			opacity: 1;
		}
	}

	&:hover {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.34) 0%, rgba(255, 255, 255, 0.22) 100%);
		transform: translateY(-3rpx);
		box-shadow: 0 16rpx 40rpx rgba(0, 0, 0, 0.44);
	}
}

.nav-icon {
	font-size: 52rpx;
	color: white;
	font-weight: 300;
	line-height: 1;
	position: relative;
	z-index: 1;
	text-shadow: 0 6rpx 12rpx rgba(0, 0, 0, 0.45);
	letter-spacing: 2rpx;
}

.save-hint {
	position: absolute;
	bottom: 30rpx;
	left: 50%;
	transform: translateX(-50%);
	background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%);
	border: 1rpx solid rgba(255, 255, 255, 0.2);
	border-radius: 20rpx;
	padding: 12rpx 24rpx;
	backdrop-filter: blur(10rpx);
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.2);
	animation: fadeInUp 0.5s ease-out;
}

.save-hint-text {
	font-size: 26rpx;
	color: white;
	font-weight: 500;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.3);
}

@keyframes fadeInUp {
	from {
		opacity: 0;
		transform: translateX(-50%) translateY(20rpx);
	}
	to {
		opacity: 1;
		transform: translateX(-50%) translateY(0);
	}
}

// 角色展示区域样式
.character-section {
	margin-top: 20rpx;
	border-top: 1rpx solid #edf0f2;
	padding-top: 12rpx;
	background-color: #fff;
	border-radius: 0;
	margin-left: 0;
	margin-right: 0;
	padding-left: 0;
	padding-right: 0;
	box-shadow: none;
}

.character-groups {
	display: flex;
	flex-direction: column;
	gap: 14rpx;
}

.character-group {
	margin-bottom: 8rpx;
	/* remove surrounding box to match script info */
	background: transparent;
	border-radius: 0;
	box-shadow: none;
	overflow: visible;
	border: none;
	padding: 0;
}

.group-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 8rpx 12rpx;
	background: transparent;
	color: #1f2329;
	cursor: pointer;
	transition: all 0.15s ease;
	position: relative;

	&:active {
		transform: scale(0.995);
	}

	&::before {
		/* keep small left accent dot handled in .group-title */
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 0;
	}

	&:focus {
		outline: none;
		box-shadow: none;
	}

	// 创建一个容器来包含标题和计数，使计数右对齐
	.group-title-row {
		display: flex;
		align-items: center;
		flex: 1;
		justify-content: space-between;
		margin-right: 12rpx;
	}
}

.group-title {
	font-size: 28rpx;
	font-weight: 600;
	color: #1f8f4d;
	margin-right: 10rpx;
	letter-spacing: 0.4rpx;

	&::before {
		content: '';
		display: inline-block;
		width: 8rpx;
		height: 8rpx;
		border-radius: 50%;
		background: #20b15a;
		margin-right: 8rpx;
		vertical-align: middle;
	}
}

.group-count {
	font-size: 26rpx;
	color: #646a73;
	font-weight: 500;
	background-color: #f7f8fa;
	padding: 4rpx 10rpx;
	border-radius: 20rpx;
	backdrop-filter: none;
}

.category-expand-icon {
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	transform-origin: center;

	&.expanded {
		transform: rotate(180deg) scale(1.1);
	}

	.icon-text {
		font-size: 28rpx;
		color: #1f8f4d;
		font-weight: bold;
		text-shadow: none;
		transition: all 0.2s ease;
	}
}

.character-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 24rpx 0;
	cursor: pointer;
	margin-bottom: 16rpx;
	background-color: transparent;
	border-radius: 0;
	padding-left: 0;
	padding-right: 0;
	border: none;
	box-shadow: none;

	&:active {
		transform: none;
		box-shadow: none;
	}

	&:focus {
		outline: none;
		box-shadow: none;
	}
}

.section-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #1f2329;
	margin: 32rpx 0 16rpx 0;
}

.expand-icon {
	transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	transform-origin: center;

	&.expanded {
		transform: rotate(180deg) scale(1.1);
	}

	.icon-text {
		font-size: 28rpx;
		color: #1f8f4d;
		font-weight: bold;
		transition: all 0.2s ease;
	}
}

.character-content {
	animation: slideDown 0.32s cubic-bezier(0.4, 0, 0.2, 1);
	padding: 10rpx 10rpx 12rpx 10rpx;
}

.character-list {
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.character-card {
	display: flex;
	align-items: flex-start; /* 改为顶部对齐，让icon和名字顶部对齐 */
	background-color: transparent;
	border-radius: 0;
	padding: 8rpx 0;
	border: none;
	box-shadow: none;
	transition: all 0.18s ease;
	position: relative;
	overflow: hidden;
	min-height: 64rpx; /* Minimum touch target */

	&::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 0;
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	&:active {
		transform: none;
	}

	&:hover {
		box-shadow: none;
	}

	&:focus {
		outline: none;
		box-shadow: none;
	}
}

.character-icon {
	width: 104rpx;
	height: 104rpx;
	border-radius: 18rpx;
	overflow: hidden;
	margin-right: 26rpx;
	background-color: #fff;
	border: 2rpx solid #e8ecf1;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	box-shadow: none;
	transition: all 0.3s ease;
}

.icon-image {
	width: 100%;
	height: 100%;
	transition: transform 0.3s ease;
}

.character-card:active .icon-image {
	transform: scale(1.05);
}

.character-icon-placeholder {
	width: 104rpx;
	height: 104rpx;
	border-radius: 18rpx;
	background: #f0f9f4;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 26rpx;
	flex-shrink: 0;
	border: 2rpx solid #e8ecf1;
	box-shadow: none;
	position: relative;
	overflow: hidden;

	&::before {
		content: '';
		position: absolute;
		top: -50%;
		left: -50%;
		width: 200%;
		height: 200%;
		background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.08) 50%, transparent 70%);
		transform: rotate(45deg);
		transition: all 0.6s ease;
	}

	&:active::before {
		animation: shimmer 1.5s ease-in-out;
	}

	.placeholder-text {
		font-size: 32rpx;
		color: #1f8f4d;
		font-weight: 800;
		text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.2);
		z-index: 1;
		position: relative;
	}
}

.character-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	justify-content: flex-start; /* 改为顶部对齐，与icon保持一致 */
}

.character-name {
	font-size: 28rpx;
	font-weight: 700;
	color: #2d3748;
	line-height: 1.2;
	word-break: break-word;
	letter-spacing: 0.2rpx;
	transition: color 0.3s ease;
	margin-bottom: 6rpx;
	margin-top: 2rpx; /* 添加顶部间距，与icon顶部对齐 */
}

.character-card:active .character-name {
	color: #1f8f4d;
}

.character-ability {
	margin-top: 0;
}

.ability-content {
	background-color: transparent;
	border-radius: 0;
	padding: 8rpx 0;
	border-left: none;
	box-shadow: none;
	position: relative;
	transition: all 0.2s ease;
	border: none;
}

.ability-text {
	font-size: 24rpx;
	color: #4a5568;
	line-height: 1.5;
	display: block;
	margin-bottom: 6rpx;
	text-align: left;
	word-break: break-word;
	font-weight: 400;

	&:last-child {
		margin-bottom: 0;
	}

	&:first-letter {
		font-weight: 600;
		color: #4a5568;
		font-size: 24rpx;
	}
}

.no-characters {
	text-align: center;
	padding: 40rpx 20rpx;
	color: #8f959e;
	font-size: 28rpx;
}

@keyframes slideDown {
	from {
		opacity: 0;
		max-height: 0;
		transform: translateY(-20rpx);
	}
	to {
		opacity: 1;
		max-height: 2000rpx;
		transform: translateY(0);
	}
}

@keyframes shimmer {
	0% {
		transform: translateX(-100%) translateY(-100%) rotate(45deg);
	}
	100% {
		transform: translateX(100%) translateY(100%) rotate(45deg);
	}
}

// 响应式设计
@media screen and (max-width: 750rpx) {
	.character-section {
		margin-left: -8rpx;
		margin-right: -8rpx;
		padding-left: 8rpx;
		padding-right: 8rpx;
	}

	.character-groups {
		gap: 20rpx;
	}

	.group-header {
		padding: 16rpx 16rpx;
	}

	.group-title {
		font-size: 30rpx;
	}

	.character-card {
		padding: 16rpx 20rpx;
		min-height: 80rpx;
	}

	.character-icon {
		width: 80rpx;
		height: 80rpx;
		margin-right: 20rpx;
	}

	.character-icon-placeholder {
		width: 80rpx;
		height: 80rpx;
		margin-right: 20rpx;
	}

	.character-name {
		font-size: 30rpx;
	}

	.ability-content {
		padding: 12rpx 16rpx;
	}
}

@media screen and (min-width: 751rpx) {
	.character-section {
		max-width: 700rpx;
		margin-left: auto;
		margin-right: auto;
	}
}
</style>
