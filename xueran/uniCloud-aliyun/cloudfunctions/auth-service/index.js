'use strict';

const crypto = require('crypto');

const TOKEN_TTL = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_SALT_BYTES = 16;

function now() {
  return Date.now();
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
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
    email: user.email,
    nickname: user.nickname || user.email,
    registerTime: user.registerTime
  };
}

async function createSession(db, user) {
  const token = makeId('tok');
  const session = {
    token,
    userId: user._id,
    email: user.email,
    createTime: now(),
    expireTime: now() + TOKEN_TTL
  };
  await db.collection('auth-sessions').add(session);
  return token;
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
