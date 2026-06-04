import { getCurrentUser, requireLogin } from '@/utils/auth.js';
import { getAuthToken } from '@/utils/auth.js';

function normalizeResult(res) {
  return res && res.result ? res.result : res;
}

function currentUserId() {
  const user = getCurrentUser() || {};
  return user.id || user._id || user.uid || user.userId || user.openid || '';
}

async function callGameRecordService(method, params = {}) {
  const userId = currentUserId();
  if (!userId) {
    requireLogin('/pages/my-games/my-games');
    return { success: false, message: '请先登录' };
  }
  const res = await uniCloud.callFunction({
    name: 'game-record-service',
    data: {
      method,
      params: [{ ...params, userId, token: getAuthToken() }]
    }
  });
  return normalizeResult(res);
}

export function getMyGameRecordStats() {
  return callGameRecordService('getMyGameRecordStats');
}

export function getMyGameRecords({ mode = 'player', page = 1, pageSize = 10, q = '' } = {}) {
  return callGameRecordService('listMyGameRecords', { mode, page, pageSize, q });
}

export function getMyGameRecordDetail(id) {
  return callGameRecordService('getMyGameRecordDetail', { id });
}
