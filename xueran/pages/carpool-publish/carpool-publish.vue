<template>
  <view class="page">
    <view class="form-card">
      <view class="field">
        <text class="label">标题</text>
        <input v-model="form.title" class="input" placeholder="比如：周六晚线下开局" />
      </view>
      <view class="field">
        <text class="label">地区</text>
        <picker mode="region" :value="regionValue" @change="onRegionChange">
          <view class="picker-value">{{ regionLabel }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">详细地址</text>
        <input v-model="form.addressDetail" class="input" placeholder="线下地址 / 店名 / 房间号，可留空" />
      </view>
      <view class="row">
        <view class="field">
          <text class="label">日期</text>
          <picker mode="date" :value="form.date" @change="form.date = $event.detail.value">
            <view class="picker-value">{{ form.date || '选择日期' }}</view>
          </picker>
        </view>
        <view class="field">
          <text class="label">时间</text>
          <picker mode="time" :value="form.time" @change="form.time = $event.detail.value">
            <view class="picker-value">{{ form.time || '选择时间' }}</view>
          </picker>
        </view>
      </view>
      <view class="field">
        <text class="label">剧本</text>
        <input v-model="form.scriptName" class="input" placeholder="剧本名" />
      </view>
      <view class="field">
        <text class="label">剧本图片</text>
        <view class="image-grid">
          <view v-for="(image, index) in form.scriptImages" :key="image" class="image-item">
            <image :src="image" class="picked-image" mode="aspectFill" @tap="previewImage(image, 'scriptImages')" />
            <view class="remove-image" @tap.stop="removeImage('scriptImages', index)">x</view>
          </view>
          <view v-if="form.scriptImages.length < 3" class="add-image" @tap="chooseImages('scriptImages', 'carpool-script')">+</view>
        </view>
      </view>
      <view class="field">
        <text class="label">模式</text>
        <view class="segmented">
          <view v-for="item in modeOptions" :key="item.value" class="segment" :class="{ active: form.mode === item.value }" @tap="form.mode = item.value">{{ item.label }}</view>
        </view>
      </view>
      <view class="field">
        <text class="label">人数</text>
        <input v-model.number="form.playerCount" class="input" type="number" min="1" max="30" />
      </view>
      <view class="field">
        <text class="label">说书人名字</text>
        <input v-model="form.storytellerName" class="input" placeholder="已确定可填写，可留空" />
      </view>
      <view class="toggles">
        <view class="toggle-chip" :class="{ active: form.beginnerFriendly }" @tap="form.beginnerFriendly = !form.beginnerFriendly">新手友好</view>
        <view class="toggle-chip" :class="{ active: form.needStoryteller }" @tap="form.needStoryteller = !form.needStoryteller">缺说书人</view>
        <view class="toggle-chip" :class="{ active: form.waitingListEnabled }" @tap="form.waitingListEnabled = !form.waitingListEnabled">允许候补</view>
      </view>
      <view class="field">
        <text class="label">费用说明</text>
        <input v-model="form.feeNotes" class="input" placeholder="AA / 免费 / 场地费等" />
      </view>
      <view class="field">
        <text class="label">备注</text>
        <textarea v-model="form.notes" class="textarea" placeholder="补充座位、角色、规则偏好等" />
      </view>
      <view class="field">
        <text class="label">场地图片</text>
        <view class="image-grid">
          <view v-for="(image, index) in form.venueImages" :key="image" class="image-item">
            <image :src="image" class="picked-image" mode="aspectFill" @tap="previewImage(image, 'venueImages')" />
            <view class="remove-image" @tap.stop="removeImage('venueImages', index)">x</view>
          </view>
          <view v-if="form.venueImages.length < 3" class="add-image" @tap="chooseImages('venueImages', 'carpool-venue')">+</view>
        </view>
      </view>
      <view class="field">
        <text class="label">联系方式</text>
        <input v-model="form.contactMethod" class="input" placeholder="微信 / 群号 / 电话等" />
      </view>
      <button class="submit" :disabled="submitting || loading" @tap="submit">{{ submitText }}</button>
    </view>
  </view>
</template>

<script>
import { createCarpoolPost, getCarpoolDetail, updateCarpoolPost, uploadCarpoolImage } from '@/utils/carpoolApi.js';

function buildStartTime(dateText, timeText) {
  if (!dateText || !timeText) return 0;
  const dateParts = dateText.split('-').map(Number);
  const timeParts = timeText.split(':').map(Number);
  if (dateParts.length !== 3 || timeParts.length < 2) return 0;
  const [year, month, day] = dateParts;
  const [hour, minute] = timeParts;
  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
}

function pad(value) {
  return `${value}`.padStart(2, '0');
}

function splitStartTime(value) {
  const date = new Date(Number(value) || 0);
  if (!date.getTime()) return { date: '', time: '' };
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`
  };
}

function getPickedPaths(res = {}) {
  const tempFiles = Array.isArray(res.tempFiles)
    ? res.tempFiles.map(item => item && (item.path || item.tempFilePath)).filter(Boolean)
    : [];
  return tempFiles.length ? tempFiles : (res.tempFilePaths || []);
}

function getFileName(filePath) {
  return String(filePath || '').split(/[\\/]/).pop() || 'carpool-image.jpg';
}

function getContentType(fileName) {
  const name = String(fileName || '').toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

function readImageAsBase64(filePath) {
  return new Promise((resolve, reject) => {
    if (typeof wx !== 'undefined' && wx.getFileSystemManager && filePath) {
      wx.getFileSystemManager().readFile({
        filePath,
        encoding: 'base64',
        success: res => resolve(res.data || ''),
        fail: err => reject(new Error((err && err.errMsg) || '读取图片失败'))
      });
      return;
    }
    reject(new Error('当前环境不支持读取图片'));
  });
}

function getUploadUrl(result = {}) {
  const data = result.data || result;
  return data.fileID || data.fileId || data.url || data.tempFileURL || '';
}

export default {
  data() {
    return {
      id: '',
      editing: false,
      loading: false,
      submitting: false,
      modeOptions: [
        { label: '线上', value: 'online' },
        { label: '线下', value: 'offline' }
      ],
      form: {
        title: '',
        regionCity: '',
        regionDistrict: '',
        addressDetail: '',
        date: '',
        time: '',
        scriptId: '',
        scriptName: '',
        scriptImages: [],
        mode: 'offline',
        playerCount: 5,
        storytellerName: '',
        beginnerFriendly: false,
        needStoryteller: false,
        feeNotes: '',
        waitingListEnabled: false,
        notes: '',
        venueImages: [],
        contactMethod: ''
      }
    };
  },
  computed: {
    submitText() {
      if (this.loading) return '加载中...';
      if (this.submitting) return this.editing ? '保存中...' : '发布中...';
      return this.editing ? '保存修改' : '发布拼车';
    },
    regionValue() {
      return ['', this.form.regionCity || '', this.form.regionDistrict || ''];
    },
    regionLabel() {
      const city = this.form.regionCity || '';
      const district = this.form.regionDistrict || '';
      return city ? `${city}${district ? ' / ' + district : ''}` : '选择地区';
    }
  },
  onLoad(query = {}) {
    if (query.id) {
      this.id = query.id;
      this.editing = true;
      uni.setNavigationBarTitle({ title: '修改拼车' });
      this.loadPost();
    }
  },
  methods: {
    async loadPost() {
      if (!this.id) return;
      this.loading = true;
      const res = await getCarpoolDetail(this.id);
      this.loading = false;
      if (!res || !res.success || !res.data || !res.data.item) {
        uni.showToast({ title: (res && res.message) || '加载失败', icon: 'none' });
        return;
      }
      if (!res.data.isHost) {
        uni.showToast({ title: '只有房主可以修改', icon: 'none' });
        setTimeout(() => uni.navigateBack(), 800);
        return;
      }
      const item = res.data.item;
      const start = splitStartTime(item.startTime);
      this.form = {
        title: item.title || '',
        regionCity: item.regionCity || '',
        regionDistrict: item.regionDistrict || '',
        addressDetail: item.addressDetail || '',
        date: start.date,
        time: start.time,
        scriptId: item.scriptId || '',
        scriptName: item.scriptName || '',
        scriptImages: Array.isArray(item.scriptImages) ? item.scriptImages.slice(0, 3) : [],
        mode: item.mode || 'offline',
        playerCount: Number(item.playerCount) || 5,
        storytellerName: item.storytellerName || '',
        beginnerFriendly: !!item.beginnerFriendly,
        needStoryteller: !!item.needStoryteller,
        feeNotes: item.feeNotes || '',
        waitingListEnabled: !!item.waitingListEnabled,
        notes: item.notes || '',
        venueImages: Array.isArray(item.venueImages) ? item.venueImages.slice(0, 3) : [],
        contactMethod: item.contactMethod || ''
      };
    },
    onRegionChange(e) {
      const value = (e && e.detail && e.detail.value) || [];
      this.form.regionCity = value[1] || value[0] || '';
      this.form.regionDistrict = value[2] || '';
    },
    chooseImages(field, folder) {
      const list = this.form[field] || [];
      if (list.length >= 3) return;
      uni.chooseImage({
        count: 3 - list.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async res => {
          const paths = getPickedPaths(res);
          if (!paths.length) {
            uni.showToast({ title: '未选择图片', icon: 'none' });
            return;
          }
          uni.showLoading({ title: '上传中...' });
          let error = null;
          try {
            for (const file of paths) {
              if ((this.form[field] || []).length >= 3) break;
              const fileName = getFileName(file);
              const contentType = getContentType(fileName);
              const base64 = await readImageAsBase64(file);
              const uploaded = await uploadCarpoolImage({
                folder,
                fileName,
                contentType,
                dataUrl: `data:${contentType};base64,${base64}`,
                size: Math.ceil((base64.length * 3) / 4)
              });
              if (!uploaded || !uploaded.success) throw new Error((uploaded && uploaded.message) || '上传失败');
              const url = getUploadUrl(uploaded);
              if (!url) throw new Error('上传失败，请检查云存储配置');
              this.form[field].push(url);
            }
          } catch (e) {
            error = e;
          } finally {
            uni.hideLoading();
          }
          if (error) {
            uni.showToast({ title: (error && error.message) || '上传失败', icon: 'none' });
          }
        }
      });
    },
    removeImage(field, index) {
      if (Array.isArray(this.form[field])) this.form[field].splice(index, 1);
    },
    previewImage(current, field) {
      uni.previewImage({ current, urls: this.form[field] || [] });
    },
    async submit() {
      if (this.submitting) return;
      const startTime = buildStartTime(this.form.date, this.form.time);
      const payload = {
        title: this.form.title.trim(),
        regionCity: this.form.regionCity.trim(),
        regionDistrict: this.form.regionDistrict.trim(),
        addressDetail: this.form.addressDetail.trim(),
        scriptId: this.form.scriptId.trim(),
        scriptName: this.form.scriptName.trim(),
        scriptImages: this.form.scriptImages.slice(0, 3),
        mode: this.form.mode,
        playerCount: Number(this.form.playerCount) || 0,
        storytellerName: this.form.storytellerName.trim(),
        beginnerFriendly: !!this.form.beginnerFriendly,
        needStoryteller: !!this.form.needStoryteller,
        feeNotes: this.form.feeNotes.trim(),
        waitingListEnabled: !!this.form.waitingListEnabled,
        notes: this.form.notes.trim(),
        venueImages: this.form.venueImages.slice(0, 3),
        contactMethod: this.form.contactMethod.trim(),
        startTime
      };
      if (!payload.title || !payload.regionCity || !payload.regionDistrict || !payload.scriptName || !payload.startTime || !payload.contactMethod) {
        uni.showToast({ title: '请填写完整信息', icon: 'none' });
        return;
      }
      this.submitting = true;
      try {
        const res = this.editing ? await updateCarpoolPost(this.id, payload) : await createCarpoolPost(payload);
        uni.showToast({ title: res.message || (res.success ? '保存成功' : '操作失败'), icon: res.success ? 'success' : 'none' });
        const targetId = this.editing ? this.id : (res.data && res.data.id);
        if (res.success && targetId) {
          uni.redirectTo({ url: `/pages/carpool-detail/carpool-detail?id=${targetId}` });
        }
      } catch (e) {
        uni.showToast({ title: (e && e.message) || '操作失败', icon: 'none' });
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>

<style scoped lang="scss">
.page { min-height: 100vh; padding: 28rpx; background: #f7f8fa; }
.form-card { padding: 20rpx; background: #fff; border-radius: 10rpx; }
.field { margin-bottom: 18rpx; }
.row { display: flex; gap: 12rpx; }
.row .field { flex: 1; }
.label { display: block; margin-bottom: 10rpx; font-size: 24rpx; color: #646a73; }
.input,.textarea,.picker-value {
  width: 100%;
  box-sizing: border-box;
  padding: 0 16rpx;
  border: 1rpx solid #dfe2e6;
  border-radius: 10rpx;
  background: #fff;
  font-size: 26rpx;
}
.input,.picker-value { height: 72rpx; line-height: 72rpx; }
.textarea { min-height: 160rpx; padding: 16rpx; }
.segmented { display: flex; gap: 12rpx; }
.segment {
  flex: 1;
  text-align: center;
  height: 72rpx;
  line-height: 72rpx;
  border-radius: 10rpx;
  background: #f5f6f7;
  color: #646a73;
  font-size: 26rpx;
}
.segment.active { background: #e8f7ef; color: #1f8f4d; }
.toggles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; margin: 18rpx 0; }
.toggle-chip {
  height: 68rpx;
  line-height: 68rpx;
  text-align: center;
  border: 1rpx solid #dfe2e6;
  border-radius: 10rpx;
  background: #fff;
  color: #646a73;
  font-size: 24rpx;
}
.toggle-chip.active { border-color: #bfe8d0; background: #e8f7ef; color: #1f8f4d; font-weight: 600; }
.image-grid { display: flex; flex-wrap: wrap; gap: 14rpx; }
.image-item, .add-image { position: relative; width: 136rpx; height: 136rpx; border-radius: 10rpx; overflow: hidden; }
.picked-image { width: 100%; height: 100%; }
.remove-image { position: absolute; right: 8rpx; top: 8rpx; width: 34rpx; height: 34rpx; line-height: 32rpx; text-align: center; border-radius: 50%; color: #fff; background: rgba(0,0,0,.55); font-size: 24rpx; }
.add-image { display: flex; align-items: center; justify-content: center; border: 2rpx dashed #d9f0e3; color: #1f8f4d; font-size: 44rpx; background: #f0f9f4; box-sizing: border-box; }
.submit { margin-top: 8rpx; background: #1f8f4d; color: #fff; border-radius: 10rpx; }
.submit::after { border: 0; }
</style>
