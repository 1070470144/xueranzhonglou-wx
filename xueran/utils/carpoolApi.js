import { getAuthToken, requireLogin } from '@/utils/auth.js';

const carpoolService = uniCloud.importObject('carpool-service');

function normalizeResult(result) {
  return result || { success: false, message: '服务无响应' };
}

function withToken(params = {}, redirectUrl = '/pages/carpool/carpool') {
  const token = getAuthToken();
  if (!token) {
    requireLogin(redirectUrl);
    return null;
  }
  return { ...params, token };
}

export function listCarpoolPosts(params = {}) {
  return carpoolService.listPosts(params).then(normalizeResult);
}

export function getHomeCarpoolPosts() {
  return carpoolService.getHomeQuickPosts().then(normalizeResult);
}

export function getCarpoolDetail(id) {
  const token = getAuthToken();
  return carpoolService.getPostDetail(token ? { id, token } : { id }).then(normalizeResult);
}

export function createCarpoolPost(params = {}) {
  const authed = withToken(params, '/pages/carpool-publish/carpool-publish');
  if (!authed) return Promise.resolve({ success: false, message: '请先登录' });
  return carpoolService.createPost(authed).then(normalizeResult);
}

export function updateCarpoolPost(id, params = {}) {
  const authed = withToken({ id, ...params }, `/pages/carpool-publish/carpool-publish?id=${id}`);
  if (!authed) return Promise.resolve({ success: false, message: '请先登录' });
  return carpoolService.updatePost(authed).then(normalizeResult);
}

export function uploadCarpoolImage(params = {}) {
  const authed = withToken(params, '/pages/carpool-publish/carpool-publish');
  if (!authed) return Promise.resolve({ success: false, message: '请先登录' });
  return carpoolService.uploadImage(authed).then(normalizeResult);
}

export function requestJoinCarpool(postId, requesterContact = '', requesterRemark = '') {
  const authed = withToken({ postId, requesterContact, requesterRemark }, `/pages/carpool-detail/carpool-detail?id=${postId}`);
  if (!authed) return Promise.resolve({ success: false, message: '请先登录' });
  return carpoolService.requestJoin(authed).then(normalizeResult);
}

export function leaveCarpool(postId) {
  const authed = withToken({ postId }, `/pages/carpool-detail/carpool-detail?id=${postId}`);
  if (!authed) return Promise.resolve({ success: false, message: '请先登录' });
  return carpoolService.leaveRequest(authed).then(normalizeResult);
}

export function updateCarpoolRequest(requestId, action) {
  const authed = withToken({ requestId, action }, '/pages/my-carpools/my-carpools');
  if (!authed) return Promise.resolve({ success: false, message: '请先登录' });
  return carpoolService.updateRequest(authed).then(normalizeResult);
}

export function closeCarpoolPost(id) {
  const authed = withToken({ id }, '/pages/my-carpools/my-carpools');
  if (!authed) return Promise.resolve({ success: false, message: '请先登录' });
  return carpoolService.closePost(authed).then(normalizeResult);
}

export function deleteCarpoolPost(id) {
  const authed = withToken({ id }, '/pages/my-carpools/my-carpools');
  if (!authed) return Promise.resolve({ success: false, message: '请先登录' });
  return carpoolService.deletePost(authed).then(normalizeResult);
}

export function listMyCarpools() {
  const authed = withToken({}, '/pages/my-carpools/my-carpools');
  if (!authed) return Promise.resolve({ success: false, message: '请先登录', data: { posts: [], requests: [] } });
  return carpoolService.listMine(authed).then(normalizeResult);
}
