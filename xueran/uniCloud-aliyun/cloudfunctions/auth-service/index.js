'use strict';

const crypto = require('crypto');

const TOKEN_TTL = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_SALT_BYTES = 16;
const DEFAULT_WX_MP_APPID = 'wx507ffa5fa6ed62f6';

function now() {
  return Date.now();
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function cleanText(value, max = 300) {
  return String(value || '').trim().slice(0, max);
}

function makeId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex');
}

function makePasswordHash(password) {
  const salt = crypto.randomBytes(PASSWORD_SALT_BYTES).toString('hex');
  return `pbkdf2_sha256$120000$${salt}$${hashPassword(password, salt)}`;
}

function verifyPassword(password, storedHash) {
  const parts = String(storedHash || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha256') {
    return false;
  }

  const iterations = Number(parts[1]);
  const salt = parts[2];
  const expected = parts[3];
  if (!iterations || !salt || !expected) {
    return false;
  }

  const actual = crypto.pbkdf2Sync(String(password), salt, iterations, 32, 'sha256').toString('hex');
  if (actual.length !== expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function publicUser(user) {
  return {
    id: user._id,
    email: user.email || '',
    nickname: user.nickname || user.email || '微信用户',
    avatarUrl: user.avatarUrl || '',
    loginType: user.loginType || (user.wxOpenid ? 'weixin-mp' : 'email'),
    registerTime: user.registerTime
  };
}

async function createSession(db, user) {
  const token = makeId('tok');
  const session = {
    token,
    userId: user._id,
    email: user.email || '',
    createTime: now(),
    expireTime: now() + TOKEN_TTL
  };
  await db.collection('auth-sessions').add(session);
  return token;
}

function getWxMpConfig() {
  const env = typeof process !== 'undefined' && process.env ? process.env : {};
  return {
    appid: env.WX_MP_APPID || env.WEIXIN_MP_APPID || DEFAULT_WX_MP_APPID,
    secret: env.WX_MP_APP_SECRET || env.WEIXIN_MP_APPSECRET || env.WEIXIN_MP_APP_SECRET || ''
  };
}

async function getWxSession(code) {
  const config = getWxMpConfig();
  if (!config.appid || !config.secret) {
    throw new Error('微信小程序 AppSecret 未配置');
  }

  const response = await uniCloud.httpclient.request('https://api.weixin.qq.com/sns/jscode2session', {
    method: 'GET',
    dataType: 'json',
    timeout: 10000,
    data: {
      appid: config.appid,
      secret: config.secret,
      js_code: code,
      grant_type: 'authorization_code'
    }
  });
  const body = response.data || {};
  if (!body.openid) {
    throw new Error(body.errmsg || '微信登录凭证校验失败');
  }
  return body;
}

async function verifyToken(db, token) {
  if (!token) {
    return null;
  }

  const sessionResult = await db.collection('auth-sessions')
    .where({ token })
    .limit(1)
    .get();
  const session = sessionResult.data && sessionResult.data[0];
  if (!session || session.expireTime <= now()) {
    return null;
  }

  const userResult = await db.collection('app-users').doc(session.userId).get();
  const user = userResult.data && userResult.data[0];
  if (!user || user.status === 'disabled') {
    return null;
  }

  return { session, user };
}

async function register(data) {
  const email = normalizeEmail(data && data.email);
  const password = data && data.password;

  if (!email || !password) {
    return { success: false, message: '邮箱和密码不能为空' };
  }
  if (String(password).length < 6) {
    return { success: false, message: '密码至少 6 位' };
  }

  const db = uniCloud.database();
  const existed = await db.collection('app-users').where({ email }).limit(1).get();
  if (existed.data && existed.data.length) {
    return { success: false, message: '该邮箱已注册' };
  }

  const userDoc = {
    email,
    nickname: email,
    passwordHash: makePasswordHash(password),
    status: 'active',
    registerTime: now(),
    lastLoginTime: now()
  };
  const addResult = await db.collection('app-users').add(userDoc);
  userDoc._id = addResult.id;

  const token = await createSession(db, userDoc);
  return { success: true, data: { token, user: publicUser(userDoc) } };
}

async function login(data) {
  const email = normalizeEmail(data && data.email);
  const password = data && data.password;

  if (!email || !password) {
    return { success: false, message: '邮箱和密码不能为空' };
  }

  const db = uniCloud.database();
  const result = await db.collection('app-users').where({ email }).limit(1).get();
  const user = result.data && result.data[0];
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { success: false, message: '邮箱或密码错误' };
  }
  if (user.status === 'disabled') {
    return { success: false, message: '账号已被禁用' };
  }

  await db.collection('app-users').doc(user._id).update({ lastLoginTime: now() });
  const token = await createSession(db, user);
  return { success: true, data: { token, user: publicUser(user) } };
}

async function weixinLogin(data) {
  const code = cleanText(data && data.code, 120);
  const config = getWxMpConfig();
  const allowMock = !!(data && data.mock && !config.secret);
  if (!code && !allowMock) {
    return { success: false, message: '微信登录凭证不能为空' };
  }

  const wxSession = allowMock
    ? { openid: `mock_${cleanText(data.mockOpenid, 120) || 'hbuilderx'}` }
    : await getWxSession(code);
  const openid = cleanText(wxSession.openid, 120);
  const unionid = cleanText(wxSession.unionid, 120);
  const userInfo = (data && data.userInfo) || {};
  const db = uniCloud.database();

  const result = await db.collection('app-users').where({ wxOpenid: openid }).limit(1).get();
  let user = result.data && result.data[0];
  const nickname = cleanText(userInfo.nickName || userInfo.nickname, 80) || (user && user.nickname) || `微信用户${openid.slice(-6)}`;
  const avatarUrl = cleanText(userInfo.avatarUrl, 500) || (user && user.avatarUrl) || '';

  if (user && user.status === 'disabled') {
    return { success: false, message: '账号已被禁用' };
  }

  if (user) {
    await db.collection('app-users').doc(user._id).update({
      nickname,
      avatarUrl,
      wxUnionid: unionid || user.wxUnionid || '',
      loginType: 'weixin-mp',
      lastLoginTime: now()
    });
    user = {
      ...user,
      nickname,
      avatarUrl,
      wxUnionid: unionid || user.wxUnionid || '',
      loginType: 'weixin-mp',
      lastLoginTime: now()
    };
  } else {
    const userDoc = {
      email: '',
      nickname,
      avatarUrl,
      passwordHash: '',
      wxOpenid: openid,
      wxUnionid: unionid,
      loginType: 'weixin-mp',
      status: 'active',
      registerTime: now(),
      lastLoginTime: now()
    };
    const addResult = await db.collection('app-users').add(userDoc);
    userDoc._id = addResult.id;
    user = userDoc;
  }

  const token = await createSession(db, user);
  return { success: true, data: { token, user: publicUser(user) } };
}

async function me(data) {
  const db = uniCloud.database();
  const auth = await verifyToken(db, data && data.token);
  if (!auth) {
    return { success: false, message: '登录已失效' };
  }
  return { success: true, data: { user: publicUser(auth.user) } };
}

async function logout(data) {
  const token = data && data.token;
  if (!token) {
    return { success: true };
  }

  const db = uniCloud.database();
  const sessions = await db.collection('auth-sessions').where({ token }).get();
  for (const session of sessions.data || []) {
    await db.collection('auth-sessions').doc(session._id).remove();
  }
  return { success: true };
}

exports.main = async (event) => {
  const { method, params = [] } = event || {};
  try {
    switch (method) {
      case 'register':
        return await register(params[0] || {});
      case 'login':
        return await login(params[0] || {});
      case 'weixinLogin':
        return await weixinLogin(params[0] || {});
      case 'me':
        return await me(params[0] || {});
      case 'logout':
        return await logout(params[0] || {});
      default:
        return { success: false, message: `Unknown method: ${method}` };
    }
  } catch (error) {
    console.error('auth-service error', error);
    return { success: false, message: '服务异常，请稍后重试' };
  }
};

exports.verifyToken = verifyToken;
