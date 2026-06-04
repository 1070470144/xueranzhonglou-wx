'use strict';

const db = uniCloud.database();

const TABLE = 'game-records';

function ok(data = {}, message = '操作成功') {
  return { success: true, message, data };
}

function fail(message = '操作失败') {
  return { success: false, message };
}

function now() {
  return Date.now();
}

function cleanText(value, max = 100000) {
  return String(value || '').trim().slice(0, max);
}

function normalizeTime(value) {
  if (value === null || value === undefined || value === '') return null;
  const time = Number(value);
  return Number.isFinite(time) && time > 0 ? time : null;
}

function positiveInt(value, defaultValue, maxValue) {
  const raw = value && typeof value === 'object' ? (value.current || value.value) : value;
  const number = Number(raw);
  const integer = Number.isInteger(number) && number > 0 ? number : defaultValue;
  return maxValue ? Math.min(maxValue, integer) : integer;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeWinner(value) {
  return ['good', 'evil', 'unknown'].includes(value) ? value : 'unknown';
}

function normalizeAlignment(value, team) {
  if (value === 'good' || value === 'evil') return value;
  return team === 'minion' || team === 'demon' ? 'evil' : (team ? 'good' : 'unknown');
}

function normalizeGameRecord(item = {}) {
  const winner = normalizeWinner(item.winner);
  const storyteller = item.storyteller || {};
  const script = item.script || {};
  const startTime = normalizeTime(item.startTime) || now();
  const endTime = normalizeTime(item.endTime) || now();
  const players = safeArray(item.players).map((player, index) => {
    const team = cleanText(player.team || '', 40);
    const alignment = normalizeAlignment(player.alignment, team);
    const userId = cleanText(player.userId || '', 120);
    return {
      seatIndex: Number.isFinite(Number(player.seatIndex)) ? Number(player.seatIndex) : index,
      name: cleanText(player.name || '', 80),
      userId,
      nickname: cleanText(player.nickname || '', 80),
      roleId: cleanText(player.roleId || '', 80),
      roleName: cleanText(player.roleName || '', 120),
      team,
      alignment,
      won: winner === 'unknown' || alignment === 'unknown' ? null : alignment === winner,
      isLoggedIn: !!userId
    };
  });
  const participantUserIds = Array.from(new Set(players.map(player => player.userId).filter(Boolean)));
  return {
    source: cleanText(item.source || 'townsquare-web', 60),
    sessionId: cleanText(item.sessionId || '', 80),
    status: 'finished',
    winner,
    storyteller: {
      userId: cleanText(storyteller.userId || '', 120),
      nickname: cleanText(storyteller.nickname || '', 80)
    },
    script: {
      id: cleanText(script.id || 'custom', 120),
      name: cleanText(script.name || '自定义剧本', 200),
      author: cleanText(script.author || '', 120),
      isOfficial: !!script.isOfficial
    },
    playerCount: positiveInt(item.playerCount, players.length || 0, 30),
    startTime,
    endTime,
    duration: Math.max(0, Number(item.duration) || (endTime - startTime)),
    players,
    participantUserIds,
    updateTime: now()
  };
}

function getRecordUserId(params = {}) {
  return cleanText(params.userId || params.uid || '', 120);
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

async function getAuthedUserId(params = {}) {
  const auth = await verifyAuthToken(params.token);
  if (auth && auth.user && auth.user._id) return auth.user._id;
  return '';
}

function getPlayerInRecord(record, userId) {
  return safeArray(record.players).find(player => player.userId === userId) || null;
}

function formatGameListItem(record, mode, userId) {
  const player = mode === 'player' ? getPlayerInRecord(record, userId) : null;
  return {
    id: record._id,
    mode,
    storyteller: record.storyteller || {},
    script: record.script || {},
    playerCount: record.playerCount || safeArray(record.players).length,
    duration: record.duration || 0,
    winner: record.winner || 'unknown',
    endTime: record.endTime || record.updateTime || record.createTime || 0,
    role: player ? { id: player.roleId, name: player.roleName, team: player.team, alignment: player.alignment } : null,
    won: player ? player.won : null
  };
}

function winRate(wins, total) {
  return total ? Math.round((wins / total) * 1000) / 10 : 0;
}

function mostCommon(items, fallback = '') {
  const counts = {};
  safeArray(items).filter(Boolean).forEach(item => {
    counts[item] = (counts[item] || 0) + 1;
  });
  const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  return top || fallback;
}

module.exports = {
  async saveGameRecord(item = {}) {
    const authedUserId = await getAuthedUserId(item);
    const doc = normalizeGameRecord(item);
    if (authedUserId) {
      doc.storyteller.userId = authedUserId;
    } else {
      doc.storyteller.userId = '';
      doc.storyteller.nickname = doc.storyteller.nickname || '游客说书人';
    }
    if (!doc.players.length) return fail('missing players');
    doc.createTime = now();
    const res = await db.collection(TABLE).add(doc);
    return ok({ id: res.id }, 'saved');
  },

  async listMyGameRecords(params = {}) {
    const userId = await getAuthedUserId(params) || getRecordUserId(params);
    if (!userId) return fail('missing user id');
    const mode = params.mode === 'storyteller' ? 'storyteller' : 'player';
    const page = positiveInt(params.page, 1);
    const pageSize = positiveInt(params.pageSize, 10, 50);
    const keyword = cleanText(params.q || params.keyword || '', 100).toLowerCase();
    const query = mode === 'storyteller'
      ? { 'storyteller.userId': userId }
      : { participantUserIds: userId };
    const skip = (page - 1) * pageSize;
    const res = await db.collection(TABLE).where(query).orderBy('endTime', 'desc').skip(skip).limit(pageSize).get();
    const count = await db.collection(TABLE).where(query).count();
    let list = (res.data || []).map(record => formatGameListItem(record, mode, userId));
    if (keyword) {
      list = list.filter(item => [
        item.storyteller && item.storyteller.nickname,
        item.script && item.script.name,
        item.role && item.role.name,
        item.winner
      ].filter(Boolean).join(' ').toLowerCase().includes(keyword));
    }
    return ok({ list, total: count.total || 0, page, pageSize });
  },

  async getMyGameRecordDetail(params = {}) {
    const userId = await getAuthedUserId(params) || getRecordUserId(params);
    const id = cleanText(params.id || '', 120);
    if (!userId) return fail('missing user id');
    if (!id) return fail('missing record id');
    const res = await db.collection(TABLE).doc(id).get();
    const item = res.data && res.data[0];
    if (!item) return fail('record not found');
    const isStoryteller = item.storyteller && item.storyteller.userId === userId;
    const isParticipant = safeArray(item.participantUserIds).includes(userId);
    if (!isStoryteller && !isParticipant) return fail('no permission');
    return ok({ item });
  },

  async getMyGameRecordStats(params = {}) {
    const userId = await getAuthedUserId(params) || getRecordUserId(params);
    if (!userId) return fail('missing user id');
    const playerRes = await db.collection(TABLE).where({ participantUserIds: userId }).limit(500).get();
    const storytellerRes = await db.collection(TABLE).where({ 'storyteller.userId': userId }).limit(500).get();
    const playerRecords = playerRes.data || [];
    const storytellerRecords = storytellerRes.data || [];
    const playerEntries = playerRecords.map(record => ({ record, player: getPlayerInRecord(record, userId) })).filter(item => item.player);
    const playerFinished = playerEntries.filter(item => item.player.won === true || item.player.won === false);
    const playerWins = playerFinished.filter(item => item.player.won).length;
    const hostedFinished = storytellerRecords.filter(record => record.winner === 'good' || record.winner === 'evil');
    const goodWins = hostedFinished.filter(record => record.winner === 'good').length;
    const evilWins = hostedFinished.filter(record => record.winner === 'evil').length;
    return ok({
      player: {
        total: playerEntries.length,
        finished: playerFinished.length,
        winRate: winRate(playerWins, playerFinished.length),
        bestPosition: mostCommon(playerEntries.map(item => item.player.team), '暂无'),
        bestRole: mostCommon(playerEntries.filter(item => item.player.won).map(item => item.player.roleName), '暂无')
      },
      storyteller: {
        total: storytellerRecords.length,
        finished: hostedFinished.length,
        goodWinRate: winRate(goodWins, hostedFinished.length),
        evilWinRate: winRate(evilWins, hostedFinished.length),
        averageDuration: storytellerRecords.length
          ? Math.round(storytellerRecords.reduce((sum, record) => sum + (Number(record.duration) || 0), 0) / storytellerRecords.length)
          : 0,
        favoriteScript: mostCommon(storytellerRecords.map(record => record.script && record.script.name), '暂无')
      }
    });
  }
};
