# Miniapp Carpool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first mini-program carpool board so users can browse, filter, publish, request to join, confirm requests, and reach carpool posts from the home and tool pages.

**Architecture:** Add a focused uniCloud object service named `carpool-service`, two database collections for posts and requests, a small mini-program API wrapper, and four pages: board, publish, detail, and my carpools. Keep home and tool-page changes as lightweight entry points that navigate into the same board.

**Tech Stack:** uni-app Vue 2 single-file components, JavaScript, SCSS, uniCloud Aliyun database schemas and object cloud functions.

---

## File Structure

- Create `xueran/uniCloud-aliyun/database/carpool-posts.schema.json`: post collection schema.
- Create `xueran/uniCloud-aliyun/database/carpool-posts.index.json`: indexes for filtering recent and hot posts.
- Create `xueran/uniCloud-aliyun/database/carpool-requests.schema.json`: join request collection schema.
- Create `xueran/uniCloud-aliyun/database/carpool-requests.index.json`: indexes for request lookups.
- Create `xueran/uniCloud-aliyun/cloudfunctions/carpool-service/index.obj.js`: server-side carpool business logic.
- Create `xueran/utils/carpoolApi.js`: client wrapper around `carpool-service`.
- Create `xueran/pages/carpool/carpool.vue`: board page with filters and list.
- Create `xueran/pages/carpool-publish/carpool-publish.vue`: publish form.
- Create `xueran/pages/carpool-detail/carpool-detail.vue`: detail page, join request, host review.
- Create `xueran/pages/my-carpools/my-carpools.vue`: user's posts and requests.
- Modify `xueran/pages.json`: register the four new pages.
- Modify `xueran/pages/home/home.vue`: add recent and hot carpool quick-join modules.
- Modify `xueran/pages/rankings/rankings.vue`: add carpool entry to the existing tool list.

## Task 1: Database Schemas

**Files:**
- Create: `xueran/uniCloud-aliyun/database/carpool-posts.schema.json`
- Create: `xueran/uniCloud-aliyun/database/carpool-posts.index.json`
- Create: `xueran/uniCloud-aliyun/database/carpool-requests.schema.json`
- Create: `xueran/uniCloud-aliyun/database/carpool-requests.index.json`

- [ ] **Step 1: Write the post schema**

Create `carpool-posts.schema.json`:

```json
{
  "bsonType": "object",
  "required": ["title", "regionCity", "regionDistrict", "scriptName", "startTime", "mode", "playerCount", "status", "hostId", "createTime", "updateTime"],
  "permission": {
    "read": true,
    "create": true,
    "update": true,
    "delete": true
  },
  "properties": {
    "_id": { "description": "ID" },
    "title": { "bsonType": "string", "title": "标题" },
    "regionCity": { "bsonType": "string", "title": "城市" },
    "regionDistrict": { "bsonType": "string", "title": "区县" },
    "scriptId": { "bsonType": "string", "title": "剧本ID" },
    "scriptName": { "bsonType": "string", "title": "剧本名" },
    "startTime": { "bsonType": "long", "title": "开局时间" },
    "mode": { "bsonType": "string", "enum": ["online", "offline"], "title": "线上线下" },
    "playerCount": { "bsonType": "int", "title": "目标人数" },
    "joinedCount": { "bsonType": "int", "title": "已确认人数" },
    "requestCount": { "bsonType": "int", "title": "报名人数" },
    "status": { "bsonType": "string", "enum": ["open", "full", "closed"], "title": "状态" },
    "hostId": { "bsonType": "string", "title": "车主ID" },
    "hostName": { "bsonType": "string", "title": "车主昵称" },
    "notes": { "bsonType": "string", "title": "备注" },
    "beginnerFriendly": { "bsonType": "bool", "title": "新手友好" },
    "needStoryteller": { "bsonType": "bool", "title": "缺主持" },
    "feeNotes": { "bsonType": "string", "title": "费用说明" },
    "waitingListEnabled": { "bsonType": "bool", "title": "允许候补" },
    "contactMethod": { "bsonType": "string", "title": "联系方式" },
    "createTime": { "bsonType": "long", "title": "创建时间" },
    "updateTime": { "bsonType": "long", "title": "更新时间" }
  }
}
```

- [ ] **Step 2: Write the post indexes**

Create `carpool-posts.index.json`:

```json
[
  {
    "IndexName": "status_startTime",
    "MgoKeySchema": {
      "MgoIndexKeys": [
        { "Name": "status", "Direction": "1" },
        { "Name": "startTime", "Direction": "1" }
      ],
      "MgoIsUnique": false
    }
  },
  {
    "IndexName": "region_time",
    "MgoKeySchema": {
      "MgoIndexKeys": [
        { "Name": "regionCity", "Direction": "1" },
        { "Name": "regionDistrict", "Direction": "1" },
        { "Name": "startTime", "Direction": "1" }
      ],
      "MgoIsUnique": false
    }
  },
  {
    "IndexName": "host_time",
    "MgoKeySchema": {
      "MgoIndexKeys": [
        { "Name": "hostId", "Direction": "1" },
        { "Name": "createTime", "Direction": "-1" }
      ],
      "MgoIsUnique": false
    }
  }
]
```

- [ ] **Step 3: Write the request schema**

Create `carpool-requests.schema.json`:

```json
{
  "bsonType": "object",
  "required": ["postId", "requesterId", "requesterName", "status", "requestTime", "updateTime"],
  "permission": {
    "read": true,
    "create": true,
    "update": true,
    "delete": true
  },
  "properties": {
    "_id": { "description": "ID" },
    "postId": { "bsonType": "string", "title": "拼车ID" },
    "requesterId": { "bsonType": "string", "title": "报名用户ID" },
    "requesterName": { "bsonType": "string", "title": "报名用户昵称" },
    "status": { "bsonType": "string", "enum": ["pending", "confirmed", "rejected", "cancelled"], "title": "状态" },
    "requestTime": { "bsonType": "long", "title": "报名时间" },
    "confirmedTime": { "bsonType": "long", "title": "确认时间" },
    "updateTime": { "bsonType": "long", "title": "更新时间" }
  }
}
```

- [ ] **Step 4: Write the request indexes**

Create `carpool-requests.index.json`:

```json
[
  {
    "IndexName": "post_status",
    "MgoKeySchema": {
      "MgoIndexKeys": [
        { "Name": "postId", "Direction": "1" },
        { "Name": "status", "Direction": "1" }
      ],
      "MgoIsUnique": false
    }
  },
  {
    "IndexName": "requester_time",
    "MgoKeySchema": {
      "MgoIndexKeys": [
        { "Name": "requesterId", "Direction": "1" },
        { "Name": "requestTime", "Direction": "-1" }
      ],
      "MgoIsUnique": false
    }
  }
]
```

- [ ] **Step 5: Validate JSON**

Run:

```powershell
node -e "for (const f of ['xueran/uniCloud-aliyun/database/carpool-posts.schema.json','xueran/uniCloud-aliyun/database/carpool-posts.index.json','xueran/uniCloud-aliyun/database/carpool-requests.schema.json','xueran/uniCloud-aliyun/database/carpool-requests.index.json']) JSON.parse(require('fs').readFileSync(f,'utf8')); console.log('carpool schema json ok')"
```

Expected: `carpool schema json ok`

- [ ] **Step 6: Commit**

```powershell
git add xueran/uniCloud-aliyun/database/carpool-posts.schema.json xueran/uniCloud-aliyun/database/carpool-posts.index.json xueran/uniCloud-aliyun/database/carpool-requests.schema.json xueran/uniCloud-aliyun/database/carpool-requests.index.json
git commit -m "feat: add carpool database schemas"
```

## Task 2: Cloud Service

**Files:**
- Create: `xueran/uniCloud-aliyun/cloudfunctions/carpool-service/index.obj.js`

- [ ] **Step 1: Create `carpool-service`**

Implement `index.obj.js` with these methods:

```js
'use strict';

const db = uniCloud.database();
const dbCmd = db.command;
const POSTS = 'carpool-posts';
const REQUESTS = 'carpool-requests';

function ok(data = {}, message = '操作成功') {
  return { success: true, message, data };
}

function fail(message = '操作失败') {
  return { success: false, message };
}

function now() {
  return Date.now();
}

function cleanText(value, max = 200) {
  return String(value || '').trim().slice(0, max);
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

function publicPost(post = {}, viewerId = '') {
  const isHost = viewerId && post.hostId === viewerId;
  return {
    id: post._id,
    title: post.title,
    regionCity: post.regionCity,
    regionDistrict: post.regionDistrict,
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
    notes: post.notes,
    beginnerFriendly: !!post.beginnerFriendly,
    needStoryteller: !!post.needStoryteller,
    feeNotes: post.feeNotes,
    waitingListEnabled: !!post.waitingListEnabled,
    contactMethod: isHost ? post.contactMethod : '',
    createTime: post.createTime,
    updateTime: post.updateTime
  };
}

async function getAuthedUser(params = {}) {
  const auth = await verifyAuthToken(params.token);
  return auth && auth.user ? auth.user : null;
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
    const startFrom = normalizeTime(params.startFrom);
    const startTo = normalizeTime(params.startTo);

    if (city) where.regionCity = city;
    if (district) where.regionDistrict = district;
    if (scriptName) where.scriptName = new RegExp(scriptName, 'i');
    if (mode) where.mode = mode;
    if (startFrom || startTo) {
      where.startTime = {};
      if (startFrom) where.startTime = { ...where.startTime, $gte: startFrom };
      if (startTo) where.startTime = { ...where.startTime, $lte: startTo };
    }

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
    const recentRes = await db.collection(POSTS).where({ status: 'open' }).orderBy('startTime', 'asc').limit(3).get();
    const hotRes = await db.collection(POSTS).where({ status: 'open' }).orderBy('requestCount', 'desc').limit(3).get();
    return ok({
      recent: (recentRes.data || []).map(item => publicPost(item)),
      hot: (hotRes.data || []).map(item => publicPost(item))
    });
  },

  async createPost(params = {}) {
    const user = await getAuthedUser(params);
    if (!user) return fail('请先登录');
    const startTime = normalizeTime(params.startTime);
    const playerCount = positiveInt(params.playerCount, 5, 30);
    const doc = {
      title: cleanText(params.title, 80),
      regionCity: cleanText(params.regionCity, 80),
      regionDistrict: cleanText(params.regionDistrict, 80),
      scriptId: cleanText(params.scriptId, 120),
      scriptName: cleanText(params.scriptName, 120),
      startTime,
      mode: params.mode === 'online' ? 'online' : 'offline',
      playerCount,
      joinedCount: 0,
      requestCount: 0,
      status: 'open',
      hostId: user._id,
      hostName: cleanText(user.nickname || user.email || '车主', 80),
      notes: cleanText(params.notes, 1000),
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

  async getPostDetail(params = {}) {
    const user = await getAuthedUser(params);
    const id = cleanText(params.id || '', 120);
    if (!id) return fail('缺少拼车ID');
    const res = await db.collection(POSTS).doc(id).get();
    const post = res.data && res.data[0];
    if (!post) return fail('拼车不存在');
    const viewerId = user && user._id;
    const requestRes = await db.collection(REQUESTS).where({ postId: id }).orderBy('requestTime', 'desc').limit(100).get();
    const requests = requestRes.data || [];
    const viewerRequest = viewerId ? requests.find(item => item.requesterId === viewerId) : null;
    const canSeeContact = viewerId && (post.hostId === viewerId || (viewerRequest && viewerRequest.status === 'confirmed'));
    const detail = publicPost({ ...post, contactMethod: canSeeContact ? post.contactMethod : '' }, canSeeContact ? post.hostId : '');
    return ok({
      item: { ...detail, contactMethod: canSeeContact ? post.contactMethod : '' },
      myRequest: viewerRequest || null,
      requests: viewerId === post.hostId ? requests : []
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
    const doc = {
      postId,
      requesterId: user._id,
      requesterName: cleanText(user.nickname || user.email || '玩家', 80),
      status: 'pending',
      requestTime: now(),
      confirmedTime: 0,
      updateTime: now()
    };
    await db.collection(REQUESTS).add(doc);
    await db.collection(POSTS).doc(postId).update({ requestCount: (Number(post.requestCount) || 0) + 1, updateTime: now() });
    return ok({}, '报名已提交');
  },

  async updateRequest(params = {}) {
    const user = await getAuthedUser(params);
    if (!user) return fail('请先登录');
    const requestId = cleanText(params.requestId || '', 120);
    const action = params.action === 'confirm' ? 'confirm' : 'reject';
    const requestRes = await db.collection(REQUESTS).doc(requestId).get();
    const request = requestRes.data && requestRes.data[0];
    if (!request) return fail('报名不存在');
    const postRes = await db.collection(POSTS).doc(request.postId).get();
    const post = postRes.data && postRes.data[0];
    if (!post || post.hostId !== user._id) return fail('无权限操作');
    const status = action === 'confirm' ? 'confirmed' : 'rejected';
    await db.collection(REQUESTS).doc(requestId).update({ status, confirmedTime: status === 'confirmed' ? now() : 0, updateTime: now() });
    if (status === 'confirmed') {
      const joinedCount = (Number(post.joinedCount) || 0) + 1;
      await db.collection(POSTS).doc(request.postId).update({
        joinedCount,
        status: joinedCount >= post.playerCount ? 'full' : post.status,
        updateTime: now()
      });
    }
    return ok({}, status === 'confirmed' ? '已确认' : '已拒绝');
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

  async listMine(params = {}) {
    const user = await getAuthedUser(params);
    if (!user) return fail('请先登录');
    const postsRes = await db.collection(POSTS).where({ hostId: user._id }).orderBy('createTime', 'desc').limit(100).get();
    const requestsRes = await db.collection(REQUESTS).where({ requesterId: user._id }).orderBy('requestTime', 'desc').limit(100).get();
    return ok({
      posts: (postsRes.data || []).map(item => publicPost(item, user._id)),
      requests: requestsRes.data || []
    });
  }
};
```

- [ ] **Step 2: Run syntax check**

Run:

```powershell
node --check xueran/uniCloud-aliyun/cloudfunctions/carpool-service/index.obj.js
```

Expected: `Syntax check passed` with exit code 0.

- [ ] **Step 3: Commit**

```powershell
git add xueran/uniCloud-aliyun/cloudfunctions/carpool-service/index.obj.js
git commit -m "feat: add carpool cloud service"
```

## Task 3: Client API Wrapper

**Files:**
- Create: `xueran/utils/carpoolApi.js`

- [ ] **Step 1: Create the wrapper**

Create `carpoolApi.js`:

```js
import { getAuthToken, requireLogin } from '@/utils/auth.js';

function normalizeResult(res) {
  return res && res.result ? res.result : res;
}

async function callCarpool(method, params = {}) {
  const res = await uniCloud.callFunction({
    name: 'carpool-service',
    data: {
      method,
      params: [params]
    }
  });
  return normalizeResult(res);
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
  return callCarpool('listPosts', params);
}

export function getHomeCarpoolPosts() {
  return callCarpool('getHomeQuickPosts', {});
}

export function getCarpoolDetail(id) {
  const token = getAuthToken();
  return callCarpool('getPostDetail', token ? { id, token } : { id });
}

export function createCarpoolPost(params = {}) {
  const authed = withToken(params, '/pages/carpool-publish/carpool-publish');
  if (!authed) return Promise.resolve({ success: false, message: '请先登录' });
  return callCarpool('createPost', authed);
}

export function requestJoinCarpool(postId) {
  const authed = withToken({ postId }, `/pages/carpool-detail/carpool-detail?id=${postId}`);
  if (!authed) return Promise.resolve({ success: false, message: '请先登录' });
  return callCarpool('requestJoin', authed);
}

export function updateCarpoolRequest(requestId, action) {
  const authed = withToken({ requestId, action }, '/pages/my-carpools/my-carpools');
  if (!authed) return Promise.resolve({ success: false, message: '请先登录' });
  return callCarpool('updateRequest', authed);
}

export function closeCarpoolPost(id) {
  const authed = withToken({ id }, '/pages/my-carpools/my-carpools');
  if (!authed) return Promise.resolve({ success: false, message: '请先登录' });
  return callCarpool('closePost', authed);
}

export function listMyCarpools() {
  const authed = withToken({}, '/pages/my-carpools/my-carpools');
  if (!authed) return Promise.resolve({ success: false, message: '请先登录', data: { posts: [], requests: [] } });
  return callCarpool('listMine', authed);
}
```

- [ ] **Step 2: Commit**

```powershell
git add xueran/utils/carpoolApi.js
git commit -m "feat: add carpool client api"
```

## Task 4: Register Pages

**Files:**
- Modify: `xueran/pages.json`

- [ ] **Step 1: Add page routes**

Add these page entries after `pages/script-detail/script-detail`:

```json
{
  "path": "pages/carpool/carpool",
  "style": {
    "navigationBarTitleText": "拼车广场",
    "enablePullDownRefresh": true
  }
},
{
  "path": "pages/carpool-publish/carpool-publish",
  "style": {
    "navigationBarTitleText": "发布拼车"
  }
},
{
  "path": "pages/carpool-detail/carpool-detail",
  "style": {
    "navigationBarTitleText": "拼车详情"
  }
},
{
  "path": "pages/my-carpools/my-carpools",
  "style": {
    "navigationBarTitleText": "我的拼车",
    "enablePullDownRefresh": true
  }
}
```

- [ ] **Step 2: Validate pages JSON**

Run:

```powershell
node -e "JSON.parse(require('fs').readFileSync('xueran/pages.json','utf8')); console.log('pages json ok')"
```

Expected: `pages json ok`

- [ ] **Step 3: Commit**

```powershell
git add xueran/pages.json
git commit -m "feat: register carpool pages"
```

## Task 5: Board Page

**Files:**
- Create: `xueran/pages/carpool/carpool.vue`

- [ ] **Step 1: Create the board page**

Build a page with:

- filter controls for city, district, script keyword, date quick filter, and mode
- list cards with script, region, time, mode, counts, and status
- empty/loading/error states
- buttons for publish and my carpools
- navigation to detail on card tap

Use these imports:

```js
import { listCarpoolPosts } from '@/utils/carpoolApi.js';
```

Use this method shape:

```js
async loadPosts(reset = false) {
  if (reset) this.page = 1;
  this.loading = true;
  this.error = '';
  const res = await listCarpoolPosts({
    page: this.page,
    pageSize: this.pageSize,
    regionCity: this.filters.city,
    regionDistrict: this.filters.district,
    scriptName: this.filters.script,
    mode: this.filters.mode,
    startFrom: this.dateRange.start,
    startTo: this.dateRange.end,
    sort: this.sort
  });
  this.loading = false;
  if (res.success && res.data) {
    this.posts = reset ? res.data.list : this.posts.concat(res.data.list || []);
    this.total = res.data.total || 0;
    return;
  }
  this.error = res.message || '加载失败';
}
```

- [ ] **Step 2: Add pull-down refresh**

Use:

```js
onPullDownRefresh() {
  this.loadPosts(true).finally(() => uni.stopPullDownRefresh());
}
```

- [ ] **Step 3: Commit**

```powershell
git add xueran/pages/carpool/carpool.vue
git commit -m "feat: add carpool board page"
```

## Task 6: Publish Page

**Files:**
- Create: `xueran/pages/carpool-publish/carpool-publish.vue`

- [ ] **Step 1: Create the publish form**

Fields:

- title
- city
- district
- start date
- start time
- script name
- online/offline selector
- player count
- beginner friendly
- need storyteller
- fee notes
- waiting list enabled
- notes
- contact method

Use:

```js
import { createCarpoolPost } from '@/utils/carpoolApi.js';
```

Submit shape:

```js
async submit() {
  if (this.submitting) return;
  const payload = {
    ...this.form,
    startTime: new Date(`${this.form.date} ${this.form.time}`).getTime()
  };
  if (!payload.title || !payload.regionCity || !payload.regionDistrict || !payload.scriptName || !payload.startTime || !payload.contactMethod) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' });
    return;
  }
  this.submitting = true;
  const res = await createCarpoolPost(payload);
  this.submitting = false;
  uni.showToast({ title: res.message || (res.success ? '发布成功' : '发布失败'), icon: res.success ? 'success' : 'none' });
  if (res.success) {
    uni.redirectTo({ url: `/pages/carpool-detail/carpool-detail?id=${res.data.id}` });
  }
}
```

- [ ] **Step 2: Commit**

```powershell
git add xueran/pages/carpool-publish/carpool-publish.vue
git commit -m "feat: add carpool publish page"
```

## Task 7: Detail Page

**Files:**
- Create: `xueran/pages/carpool-detail/carpool-detail.vue`

- [ ] **Step 1: Create detail view and join action**

Use:

```js
import { getCarpoolDetail, requestJoinCarpool, updateCarpoolRequest, closeCarpoolPost } from '@/utils/carpoolApi.js';
```

Required methods:

```js
async loadDetail() {
  this.loading = true;
  const res = await getCarpoolDetail(this.id);
  this.loading = false;
  if (res.success && res.data) {
    this.item = res.data.item;
    this.myRequest = res.data.myRequest;
    this.requests = res.data.requests || [];
    return;
  }
  this.error = res.message || '加载失败';
}

async requestJoin() {
  const res = await requestJoinCarpool(this.id);
  uni.showToast({ title: res.message || '已提交', icon: res.success ? 'success' : 'none' });
  if (res.success) this.loadDetail();
}

async updateRequest(requestId, action) {
  const res = await updateCarpoolRequest(requestId, action);
  uni.showToast({ title: res.message || '操作完成', icon: res.success ? 'success' : 'none' });
  if (res.success) this.loadDetail();
}

async closePost() {
  const res = await closeCarpoolPost(this.id);
  uni.showToast({ title: res.message || '已关闭', icon: res.success ? 'success' : 'none' });
  if (res.success) this.loadDetail();
}
```

- [ ] **Step 2: Display contact only when returned**

Render contact information only when `item.contactMethod` is non-empty. The server controls visibility.

- [ ] **Step 3: Commit**

```powershell
git add xueran/pages/carpool-detail/carpool-detail.vue
git commit -m "feat: add carpool detail page"
```

## Task 8: My Carpools Page

**Files:**
- Create: `xueran/pages/my-carpools/my-carpools.vue`

- [ ] **Step 1: Create tabs for my posts and my requests**

Use:

```js
import { listMyCarpools } from '@/utils/carpoolApi.js';
```

Data load:

```js
async loadMine() {
  this.loading = true;
  const res = await listMyCarpools();
  this.loading = false;
  if (res.success && res.data) {
    this.posts = res.data.posts || [];
    this.requests = res.data.requests || [];
    return;
  }
  this.error = res.message || '加载失败';
}
```

- [ ] **Step 2: Commit**

```powershell
git add xueran/pages/my-carpools/my-carpools.vue
git commit -m "feat: add my carpool page"
```

## Task 9: Home Quick Join

**Files:**
- Modify: `xueran/pages/home/home.vue`

- [ ] **Step 1: Add API import**

Extend imports:

```js
import { getHomeCarpoolPosts } from '@/utils/carpoolApi.js';
```

- [ ] **Step 2: Add data fields**

Add:

```js
carpoolRecent: [],
carpoolHot: [],
carpoolLoading: false
```

- [ ] **Step 3: Load quick posts with home data**

Add `this.loadCarpoolQuickPosts()` to `refreshHomeData()`.

Add method:

```js
async loadCarpoolQuickPosts() {
  this.carpoolLoading = true;
  try {
    const res = await getHomeCarpoolPosts();
    if (res.success && res.data) {
      this.carpoolRecent = res.data.recent || [];
      this.carpoolHot = res.data.hot || [];
    }
  } catch (error) {
    this.carpoolRecent = [];
    this.carpoolHot = [];
  } finally {
    this.carpoolLoading = false;
  }
}
```

- [ ] **Step 4: Add UI modules**

Add two compact sections below announcements and before the AI search panel. Each item taps into `pages/carpool-detail/carpool-detail?id=<id>`. Each header taps into `/pages/carpool/carpool?sort=recent` or `/pages/carpool/carpool?sort=hot`.

- [ ] **Step 5: Commit**

```powershell
git add xueran/pages/home/home.vue
git commit -m "feat: add home carpool shortcuts"
```

## Task 10: Tool Page Entry

**Files:**
- Modify: `xueran/pages/rankings/rankings.vue`

- [ ] **Step 1: Add carpool tool item**

Add one `tool-item` near the top:

```html
<view class="tool-item" @tap="openTool('/pages/carpool/carpool')">
  <view class="tool-icon carpool">拼</view>
  <view class="tool-main">
    <text class="tool-title">拼车广场</text>
    <text class="tool-desc">查找线上线下车局，按地域、时间和剧本快速加入</text>
  </view>
  <text class="arrow">›</text>
</view>
```

Extend the icon selector:

```scss
.tool-icon.upload,
.tool-icon.rank,
.tool-icon.exam,
.tool-icon.practice,
.tool-icon.notice,
.tool-icon.carpool {
  color: #1f8f4d;
  background: #f0f9f4;
}
```

- [ ] **Step 2: Commit**

```powershell
git add xueran/pages/rankings/rankings.vue
git commit -m "feat: add carpool tool entry"
```

## Task 11: Verification

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run JSON checks**

```powershell
node -e "for (const f of ['xueran/pages.json','xueran/uniCloud-aliyun/database/carpool-posts.schema.json','xueran/uniCloud-aliyun/database/carpool-posts.index.json','xueran/uniCloud-aliyun/database/carpool-requests.schema.json','xueran/uniCloud-aliyun/database/carpool-requests.index.json']) JSON.parse(require('fs').readFileSync(f,'utf8')); console.log('json ok')"
```

Expected: `json ok`

- [ ] **Step 2: Run cloud syntax check**

```powershell
node --check xueran/uniCloud-aliyun/cloudfunctions/carpool-service/index.obj.js
```

Expected: exit code 0.

- [ ] **Step 3: Run Vue script parse check**

```powershell
node -e "const fs=require('fs'); const p=require('./xueran/node_modules/@babel/parser'); for (const f of ['xueran/pages/carpool/carpool.vue','xueran/pages/carpool-publish/carpool-publish.vue','xueran/pages/carpool-detail/carpool-detail.vue','xueran/pages/my-carpools/my-carpools.vue','xueran/pages/home/home.vue','xueran/pages/rankings/rankings.vue']) { const s=fs.readFileSync(f,'utf8'); const m=s.match(/<script>([\\s\\S]*?)<\\/script>/); if (m) p.parse(m[1], { sourceType:'module' }); } console.log('vue script parse ok')"
```

Expected: `vue script parse ok`

- [ ] **Step 4: Run whitespace check**

```powershell
git diff --check
```

Expected: exit code 0.

- [ ] **Step 5: Manual mini-program verification**

Use HBuilderX or WeChat DevTools:

1. Open `xueran/`.
2. Deploy or upload `carpool-service` and database schemas to the dev uniCloud environment.
3. Open the home page and confirm recent/hot quick modules render.
4. Open the tool tab and confirm `拼车广场` navigates to the board.
5. Publish a test post.
6. Use another account to request joining.
7. Use the host account to confirm the request.
8. Confirm the requester sees contact information only after confirmation.

- [ ] **Step 6: Final commit if needed**

If verification fixes are required:

```powershell
git add xueran
git commit -m "fix: polish carpool verification issues"
```

