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
