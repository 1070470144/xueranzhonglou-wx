const TOKEN_KEY = 'xueran_auth_token';
const USER_KEY = 'xueran_auth_user';

export function getAuthToken() {
  return uni.getStorageSync(TOKEN_KEY) || '';
}

export function getCurrentUser() {
  return uni.getStorageSync(USER_KEY) || null;
}

export function isLoggedIn() {
  return !!getAuthToken();
}

export function setAuthSession(token, user) {
  uni.setStorageSync(TOKEN_KEY, token);
  uni.setStorageSync(USER_KEY, user);
}

export function setCurrentUser(user) {
  uni.setStorageSync(USER_KEY, user);
}

export function clearAuthSession() {
  uni.removeStorageSync(TOKEN_KEY);
  uni.removeStorageSync(USER_KEY);
}

async function callAuth(method, params) {
  const res = await uniCloud.callFunction({
    name: 'auth-service',
    data: {
      method,
      params: [params]
    }
  });
  return (res && res.result) ? res.result : res;
}

export async function loginWithEmail(email, password) {
  const result = await callAuth('login', { email, password });
  if (result && result.success && result.data) {
    setAuthSession(result.data.token, result.data.user);
  }
  return result;
}

export async function registerWithEmail(email, password) {
  const result = await callAuth('register', { email, password });
  if (result && result.success && result.data) {
    setAuthSession(result.data.token, result.data.user);
  }
  return result;
}

function uniLogin(provider = 'weixin') {
  return new Promise((resolve, reject) => {
    uni.login({
      provider,
      success: resolve,
      fail: reject
    });
  });
}

function getDevMockOpenid() {
  const key = 'xueran_dev_mock_openid';
  let openid = uni.getStorageSync(key);
  if (!openid) {
    openid = `dev_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
    uni.setStorageSync(key, openid);
  }
  return openid;
}

function getClientPlatform() {
  // #ifdef MP-WEIXIN
  return 'mp-weixin';
  // #endif
  // #ifdef H5
  return 'h5';
  // #endif
  // #ifdef APP-PLUS
  return 'app-plus';
  // #endif
  return 'devtools';
}

export async function loginWithWeixin(userInfo = {}) {
  let loginRes = null;
  try {
    loginRes = await uniLogin('weixin');
  } catch (error) {
    loginRes = null;
  }
  const params = loginRes && loginRes.code
    ? { code: loginRes.code, userInfo }
    : { mock: true, mockOpenid: getDevMockOpenid(), userInfo, clientPlatform: getClientPlatform() };
  const result = await callAuth('weixinLogin', params);
  if (result && result.success && result.data) {
    setAuthSession(result.data.token, result.data.user);
  }
  return result;
}

export async function completeWeixinProfile(userInfo = {}) {
  const currentUser = getCurrentUser() || {};
  const nickname = userInfo.nickName || userInfo.nickname || currentUser.nickname || '';
  const avatarUrl = userInfo.avatarUrl || currentUser.avatarUrl || '';
  if (!nickname || !avatarUrl) return { success: false, message: '微信资料不完整' };
  return updateProfile({ nickname, avatarUrl });
}

export async function updateProfile(profile = {}) {
  const token = getAuthToken();
  const result = await callAuth('updateProfile', { ...profile, token });
  if (result && result.success && result.data && result.data.user) {
    setCurrentUser(result.data.user);
  }
  return result;
}

export async function logout() {
  const token = getAuthToken();
  try {
    if (token) {
      await callAuth('logout', { token });
    }
  } finally {
    clearAuthSession();
  }
}

export async function approveWebLogin(ticket) {
  const token = getAuthToken();
  if (!token) return { success: false, message: '请先登录' };
  return callAuth('approveWebLoginTicket', {
    ticket,
    token,
    clientPlatform: getClientPlatform()
  });
}

export function requireLogin(redirectUrl) {
  if (isLoggedIn()) {
    return true;
  }

  const query = redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : '';
  uni.navigateTo({
    url: `/pages/login/login${query}`
  });
  return false;
}
