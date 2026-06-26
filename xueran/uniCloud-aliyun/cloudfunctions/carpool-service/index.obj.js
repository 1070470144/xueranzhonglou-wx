'use strict';

const db = uniCloud.database();
const dbCmd = db.command;
const POSTS = 'carpool-posts';
const REQUESTS = 'carpool-requests';
const CARPOOL_IMAGE_MAX_SIZE = 8 * 1024 * 1024;

function ok(data = {}, message = '操作成功') {
  return { success: true, message, data };
}

function fail(message = '操作失败') {
  return { success: false, message };
}

function now() {
  return Date.now();
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function cleanText(value, max = 200) {
  return String(value || '').trim().slice(0, max);
}

function normalizeImages(images, max = 3) {
  if (!Array.isArray(images)) return [];
  return images.map(item => cleanText(item, 500)).filter(Boolean).slice(0, max);
}

function getImageExtension(fileName, contentType) {
  const type = String(contentType || '').toLowerCase();
  if (type.includes('png')) return '.png';
  if (type.includes('webp')) return '.webp';
  if (type.includes('gif')) return '.gif';
  if (type.includes('jpeg') || type.includes('jpg')) return '.jpg';
  const ext = String(fileName || '').match(/\.[a-zA-Z0-9]+$/);
  if (ext && ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext[0].toLowerCase())) {
    return ext[0].toLowerCase() === '.jpeg' ? '.jpg' : ext[0].toLowerCase();
  }
  return '.jpg';
}

function parseImageDataUrl(dataUrl) {
  const value = String(dataUrl || '');
  const matched = value.match(/^data:([^;,]+)?;base64,(.+)$/);
  if (!matched) return { contentType: '', base64: value };
  return { contentType: matched[1] || '', base64: matched[2] || '' };
}

function bool(value) {
  return value === true;
}

function positiveInt(value, fallback = 1, max = 30) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) return fallback;
  return Math.min(number, max);
}

function normalizeTime(value) {
  const time = Number(value);
  return Number.isFinite(time) && time > 0 ? time : 0;
}

async function verifyAuthToken(token) {
  const cleanToken = cleanText(token || '', 120);
  if (!cleanToken) return null;
  const sessionResult = await db.collection('auth-sessions').where({ token: cleanToken }).limit(1).get();
  const session = sessionResult.data && sessionResult.data[0];
  if (!session || session.expireTime <= now()) return null;
  const userResult = await db.collection('app-users').doc(session.userId).get();
  const user = userResult.data && userResult.data[0];
  if (!user || user.status === 'disabled') return null;
  return { session, user };
}

function publicPost(post = {}, canSeeContact = false) {
  return {
    id: post._id,
    title: post.title,
    regionCity: post.regionCity,
    regionDistrict: post.regionDistrict,
    addressDetail: post.addressDetail,
    scriptId: post.scriptId,
    scriptName: post.scriptName,
    startTime: post.startTime,
    mode: post.mode,
    playerCount: post.playerCount,
    joinedCount: post.joinedCount || 0,
    requestCount: post.requestCount || 0,
    status: post.status,
    hostId: post.hostId,
    hostName: post.hostName,
    storytellerName: post.storytellerName || '',
    notes: post.notes,
    scriptImages: normalizeImages(post.scriptImages),
    venueImages: normalizeImages(post.venueImages),
    beginnerFriendly: !!post.beginnerFriendly,
    needStoryteller: !!post.needStoryteller,
    feeNotes: post.feeNotes,
    waitingListEnabled: !!post.waitingListEnabled,
    contactMethod: canSeeContact ? post.contactMethod : '',
    createTime: post.createTime,
    updateTime: post.updateTime
  };
}

function publicRequest(request = {}, userMap = {}) {
  const user = userMap[request.requesterId] || {};
  return {
    ...request,
    requesterName: request.requesterName || user.nickname || user.email || '玩家',
    requesterAvatarUrl: request.requesterAvatarUrl || user.avatarUrl || ''
  };
}

function publicMember(request = {}, userMap = {}) {
  const user = userMap[request.requesterId] || {};
  return {
    _id: request._id,
    requesterId: request.requesterId,
    requesterName: request.requesterName || user.nickname || user.email || '玩家',
    requesterAvatarUrl: request.requesterAvatarUrl || user.avatarUrl || '',
    status: request.status
  };
}

async function getAuthedUser(params = {}) {
  const auth = await verifyAuthToken(params.token);
  return auth && auth.user ? auth.user : null;
}

function buildStartRange(params, where) {
  const startFrom = Math.max(normalizeTime(params.startFrom), startOfToday());
  const startTo = normalizeTime(params.startTo);
  where.startTime = {};
  where.startTime = { ...where.startTime, $gte: startFrom };
  if (startTo) where.startTime = { ...where.startTime, $lte: startTo };
}

module.exports = {
  async listPosts(params = {}) {
    const page = positiveInt(params.page, 1, 1000);
    const pageSize = positiveInt(params.pageSize, 10, 30);
    const sort = params.sort === 'hot' ? 'hot' : 'recent';
    const where = { status: dbCmd.in(['open', 'full']) };
    const city = cleanText(params.regionCity || '', 80);
    const district = cleanText(params.regionDistrict || '', 80);
    const scriptName = cleanText(params.scriptName || '', 120);
    const mode = params.mode === 'online' || params.mode === 'offline' ? params.mode : '';

    if (city) where.regionCity = city;
    if (district) where.regionDistrict = district;
    if (scriptName) where.scriptName = new RegExp(scriptName, 'i');
    if (mode) where.mode = mode;
    buildStartRange(params, where);

    const collection = db.collection(POSTS).where(where);
    const totalRes = await collection.count();
    const orderField = sort === 'hot' ? 'requestCount' : 'startTime';
    const res = await collection.orderBy(orderField, sort === 'hot' ? 'desc' : 'asc').skip((page - 1) * pageSize).limit(pageSize).get();
    return ok({
      list: (res.data || []).map(item => publicPost(item)),
      total: totalRes.total || 0,
      page,
      pageSize
    });
  },

  async getHomeQuickPosts() {
    const where = { status: dbCmd.in(['open', 'full']), startTime: { $gte: startOfToday() } };
    const recentRes = await db.collection(POSTS).where(where).orderBy('startTime', 'asc').limit(3).get();
    const hotRes = await db.collection(POSTS).where(where).orderBy('requestCount', 'desc').limit(3).get();
    return ok({
      recent: (recentRes.data || []).map(item => publicPost(item)),
      hot: (hotRes.data || []).map(item => publicPost(item))
    });
  },

  async createPost(params = {}) {
    const user = await getAuthedUser(params);
    if (!user) return fail('请先登录');
    const startTime = normalizeTime(params.startTime);
    const doc = {
      title: cleanText(params.title, 80),
      regionCity: cleanText(params.regionCity, 80),
      regionDistrict: cleanText(params.regionDistrict, 80),
      addressDetail: cleanText(params.addressDetail, 200),
      scriptId: cleanText(params.scriptId, 120),
      scriptName: cleanText(params.scriptName, 120),
      startTime,
      mode: params.mode === 'online' ? 'online' : 'offline',
      playerCount: positiveInt(params.playerCount, 5, 30),
      joinedCount: 0,
      requestCount: 0,
      status: 'open',
      hostId: user._id,
      hostName: cleanText(user.nickname || user.email || '车主', 80),
      storytellerName: cleanText(params.storytellerName, 80),
      notes: cleanText(params.notes, 1000),
      scriptImages: normalizeImages(params.scriptImages),
      venueImages: normalizeImages(params.venueImages),
      beginnerFriendly: bool(params.beginnerFriendly),
      needStoryteller: bool(params.needStoryteller),
      feeNotes: cleanText(params.feeNotes, 200),
      waitingListEnabled: bool(params.waitingListEnabled),
      contactMethod: cleanText(params.contactMethod, 300),
      createTime: now(),
      updateTime: now()
    };
    if (!doc.title || !doc.regionCity || !doc.regionDistrict || !doc.scriptName || !doc.startTime || !doc.contactMethod) {
      return fail('请填写完整拼车信息');
    }
    const res = await db.collection(POSTS).add(doc);
    return ok({ id: res.id }, '发布成功');
  },

  async uploadImage(params = {}) {
    try {
      const user = await getAuthedUser(params);
      if (!user) return fail('请先登录');
      const parsed = parseImageDataUrl(params.dataUrl);
      const contentType = cleanText(params.contentType || parsed.contentType, 80);
      if (contentType && !contentType.startsWith('image/')) return fail('只能上传图片');
      const declaredSize = Number(params.size) || 0;
      if (declaredSize > CARPOOL_IMAGE_MAX_SIZE) return fail('图片不能超过8MB');
      const base64 = String(parsed.base64 || '').replace(/\s/g, '');
      if (!base64) return fail('图片内容为空');
      const fileContent = Buffer.from(base64, 'base64');
      if (!fileContent.length) return fail('图片内容无效');
      if (fileContent.length > CARPOOL_IMAGE_MAX_SIZE) return fail('图片不能超过8MB');
      const folder = params.folder === 'carpool-script' ? 'carpool-script' : 'carpool-venue';
      const suffix = getImageExtension(params.fileName, contentType);
      const userId = String(user._id || 'user').replace(/[^\w-]+/g, '-');
      const cloudPath = `${folder}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}${suffix}`;
      const uploadRes = await uniCloud.uploadFile({ cloudPath, fileContent });
      const fileID = uploadRes.fileID || uploadRes.fileId || uploadRes.url || '';
      if (!fileID) return fail('上传失败，请检查云存储配置');
      return ok({ fileID, fileId: fileID, url: fileID, cloudPath }, '上传成功');
    } catch (error) {
      console.error('Upload carpool image error:', error);
      return fail((error && error.message) || '上传失败');
    }
  },

  async updatePost(params = {}) {
    const user = await getAuthedUser(params);
    if (!user) return fail('请先登录');
    const id = cleanText(params.id || '', 120);
    if (!id) return fail('缺少拼车ID');
    const res = await db.collection(POSTS).doc(id).get();
    const post = res.data && res.data[0];
    if (!post || post.hostId !== user._id) return fail('无权限操作');
    if (post.status === 'closed') return fail('已关闭的拼车不能修改');
    const startTime = normalizeTime(params.startTime);
    const playerCount = positiveInt(params.playerCount, 5, 30);
    const joinedCount = Number(post.joinedCount) || 0;
    if (playerCount < joinedCount) return fail('人数不能小于已加入人数');
    const doc = {
      title: cleanText(params.title, 80),
      regionCity: cleanText(params.regionCity, 80),
      regionDistrict: cleanText(params.regionDistrict, 80),
      addressDetail: cleanText(params.addressDetail, 200),
      scriptId: cleanText(params.scriptId, 120),
      scriptName: cleanText(params.scriptName, 120),
      startTime,
      mode: params.mode === 'online' ? 'online' : 'offline',
      playerCount,
      status: joinedCount >= playerCount ? 'full' : 'open',
      storytellerName: cleanText(params.storytellerName, 80),
      notes: cleanText(params.notes, 1000),
      scriptImages: normalizeImages(params.scriptImages),
      venueImages: normalizeImages(params.venueImages),
      beginnerFriendly: bool(params.beginnerFriendly),
      needStoryteller: bool(params.needStoryteller),
      feeNotes: cleanText(params.feeNotes, 200),
      waitingListEnabled: bool(params.waitingListEnabled),
      contactMethod: cleanText(params.contactMethod, 300),
      updateTime: now()
    };
    if (!doc.title || !doc.regionCity || !doc.regionDistrict || !doc.scriptName || !doc.startTime || !doc.contactMethod) {
      return fail('请填写完整拼车信息');
    }
    await db.collection(POSTS).doc(id).update(doc);
    return ok({ id }, '保存成功');
  },

  async getPostDetail(params = {}) {
    const user = await getAuthedUser(params);
    const id = cleanText(params.id || '', 120);
    if (!id) return fail('缺少拼车ID');
    const res = await db.collection(POSTS).doc(id).get();
    const post = res.data && res.data[0];
    if (!post) return fail('拼车不存在');
    const viewerId = user && user._id;
    const isHost = !!viewerId && post.hostId === viewerId;
    const requestRes = await db.collection(REQUESTS).where({ postId: id }).orderBy('requestTime', 'desc').limit(100).get();
    const requests = requestRes.data || [];
    const viewerRequest = viewerId ? requests.find(item => item.requesterId === viewerId) : null;
    const canSeeContact = !!viewerId && (post.hostId === viewerId || (viewerRequest && viewerRequest.status === 'confirmed'));
    let publicRequests = [];
    const requesterIds = Array.from(new Set(requests.map(item => item.requesterId).filter(Boolean)));
    const userRes = requesterIds.length
      ? await db.collection('app-users').where({ _id: dbCmd.in(requesterIds) }).limit(100).get()
      : { data: [] };
    const userMap = {};
    (userRes.data || []).forEach(item => {
      userMap[item._id] = item;
    });
    if (isHost) {
      publicRequests = requests.map(item => publicRequest(item, userMap));
    } else {
      publicRequests = requests.filter(item => item.status === 'confirmed').map(item => publicMember(item, userMap));
    }
    return ok({
      item: publicPost(post, canSeeContact),
      myRequest: viewerRequest || null,
      requests: publicRequests,
      isHost
    });
  },

  async requestJoin(params = {}) {
    const user = await getAuthedUser(params);
    if (!user) return fail('请先登录');
    const postId = cleanText(params.postId || '', 120);
    const postRes = await db.collection(POSTS).doc(postId).get();
    const post = postRes.data && postRes.data[0];
    if (!post) return fail('拼车不存在');
    if (post.hostId === user._id) return fail('不能报名自己的拼车');
    if (post.status === 'closed') return fail('拼车已关闭');
    if (post.status === 'full' && !post.waitingListEnabled) return fail('拼车已满');
    const existingRes = await db.collection(REQUESTS).where({ postId, requesterId: user._id, status: dbCmd.in(['pending', 'confirmed']) }).limit(1).get();
    if (existingRes.data && existingRes.data.length) return fail('已报名，请勿重复提交');
    const requesterContact = cleanText(params.requesterContact, 300);
    if (!requesterContact) return fail('请填写联系方式');
    const requesterRemark = cleanText(params.requesterRemark, 300);
    const doc = {
      postId,
      requesterId: user._id,
      requesterName: cleanText(user.nickname || user.email || '玩家', 80),
      requesterAvatarUrl: cleanText(user.avatarUrl || '', 500),
      requesterContact,
      requesterRemark,
      status: 'pending',
      requestTime: now(),
      confirmedTime: 0,
      updateTime: now()
    };
    await db.collection(REQUESTS).add(doc);
    await db.collection(POSTS).doc(postId).update({
      requestCount: (Number(post.requestCount) || 0) + 1,
      updateTime: now()
    });
    return ok({}, '报名已提交');
  },

  async leaveRequest(params = {}) {
    const user = await getAuthedUser(params);
    if (!user) return fail('请先登录');
    const postId = cleanText(params.postId || '', 120);
    const postRes = await db.collection(POSTS).doc(postId).get();
    const post = postRes.data && postRes.data[0];
    if (!post) return fail('拼车不存在');
    const requestRes = await db.collection(REQUESTS).where({ postId, requesterId: user._id, status: dbCmd.in(['pending', 'confirmed']) }).limit(1).get();
    const request = requestRes.data && requestRes.data[0];
    if (!request) return fail('没有可退出的报名');
    await db.collection(REQUESTS).doc(request._id).update({
      status: 'cancelled',
      updateTime: now()
    });
    const postUpdate = {
      updateTime: now()
    };
    if (request.status === 'confirmed') {
      const joinedCount = Math.max(0, (Number(post.joinedCount) || 0) - 1);
      postUpdate.joinedCount = joinedCount;
      postUpdate.status = post.status === 'full' ? 'open' : post.status;
    }
    await db.collection(POSTS).doc(postId).update(postUpdate);
    return ok({}, request.status === 'confirmed' ? '已退出拼车' : '已取消申请');
  },

  async updateRequest(params = {}) {
    const user = await getAuthedUser(params);
    if (!user) return fail('请先登录');
    const requestId = cleanText(params.requestId || '', 120);
    const action = params.action === 'confirm' ? 'confirm' : params.action === 'remove' ? 'remove' : 'reject';
    const requestRes = await db.collection(REQUESTS).doc(requestId).get();
    const request = requestRes.data && requestRes.data[0];
    if (!request) return fail('报名不存在');
    const postRes = await db.collection(POSTS).doc(request.postId).get();
    const post = postRes.data && postRes.data[0];
    if (!post || post.hostId !== user._id) return fail('无权限操作');
    if ((action === 'confirm' || action === 'reject') && request.status !== 'pending') {
      return fail('只能审核待处理申请');
    }
    if (action === 'confirm' && (Number(post.joinedCount) || 0) >= (Number(post.playerCount) || 0)) {
      return fail('拼车人数已满');
    }
    if (action === 'remove' && request.status !== 'confirmed') {
      return fail('只能移出已确认玩家');
    }
    const status = action === 'confirm' ? 'confirmed' : action === 'remove' ? 'cancelled' : 'rejected';
    await db.collection(REQUESTS).doc(requestId).update({
      status,
      confirmedTime: status === 'confirmed' ? now() : request.confirmedTime || 0,
      updateTime: now()
    });
    if (status === 'confirmed' && request.status !== 'confirmed') {
      const joinedCount = (Number(post.joinedCount) || 0) + 1;
      await db.collection(POSTS).doc(request.postId).update({
        joinedCount,
        status: joinedCount >= post.playerCount ? 'full' : post.status,
        updateTime: now()
      });
    }
    if (status === 'cancelled' && request.status === 'confirmed') {
      const joinedCount = Math.max(0, (Number(post.joinedCount) || 0) - 1);
      await db.collection(POSTS).doc(request.postId).update({
        joinedCount,
        status: post.status === 'full' ? 'open' : post.status,
        updateTime: now()
      });
    }
    return ok({}, status === 'confirmed' ? '已确认' : status === 'cancelled' ? '已移出' : '已拒绝');
  },

  async closePost(params = {}) {
    const user = await getAuthedUser(params);
    if (!user) return fail('请先登录');
    const id = cleanText(params.id || '', 120);
    const res = await db.collection(POSTS).doc(id).get();
    const post = res.data && res.data[0];
    if (!post || post.hostId !== user._id) return fail('无权限操作');
    await db.collection(POSTS).doc(id).update({ status: 'closed', updateTime: now() });
    return ok({}, '已关闭');
  },

  async deletePost(params = {}) {
    const user = await getAuthedUser(params);
    if (!user) return fail('请先登录');
    const id = cleanText(params.id || '', 120);
    const res = await db.collection(POSTS).doc(id).get();
    const post = res.data && res.data[0];
    if (!post || post.hostId !== user._id) return fail('无权限操作');
    if (post.status !== 'closed') return fail('请先关闭拼车后再删除');
    await db.collection(POSTS).doc(id).remove();
    await db.collection(REQUESTS).where({ postId: id }).remove();
    return ok({}, '已删除');
  },

  async listMine(params = {}) {
    const user = await getAuthedUser(params);
    if (!user) return fail('请先登录');
    const postsRes = await db.collection(POSTS).where({ hostId: user._id }).orderBy('createTime', 'desc').limit(100).get();
    const requestsRes = await db.collection(REQUESTS).where({ requesterId: user._id }).orderBy('requestTime', 'desc').limit(100).get();
    const requests = requestsRes.data || [];
    const postIds = Array.from(new Set(requests.map(item => item.postId).filter(Boolean)));
    const requestPosts = postIds.length
      ? await db.collection(POSTS).where({ _id: dbCmd.in(postIds) }).limit(100).get()
      : { data: [] };
    const postMap = {};
    (requestPosts.data || []).forEach(post => {
      postMap[post._id] = post;
    });
    return ok({
      posts: (postsRes.data || []).map(item => publicPost(item, true)),
      requests: requests.map(item => {
        const post = postMap[item.postId] || {};
        return {
          ...item,
          postTitle: post.title || post.scriptName || '',
          postRegionCity: post.regionCity || '',
          postRegionDistrict: post.regionDistrict || '',
          postStartTime: post.startTime || 0,
          postStatus: post.status || ''
        };
      })
    });
  }
};
