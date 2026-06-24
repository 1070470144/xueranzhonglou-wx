const crypto = require("crypto");

const MAX_PLAYERS = 20;
const DEFAULT_MAX_PLAYERS = 10;
const MAX_NOTE_LENGTH = 80;
const DEFAULT_HOST_NAME = "Storyteller";
const DEFAULT_SCRIPT_NAME = "未选择剧本";
const rooms = new Map();

function sanitizeId(value) {
  return String(value || "")
    .toLocaleLowerCase()
    .replace(/[^0-9a-z]/g, "")
    .substr(0, 10);
}

function createRoomId(name) {
  const base = sanitizeId(name) || "room";
  let id = base;
  let suffix = 1;
  while (rooms.has(id)) {
    const suffixText = String(suffix);
    id = `${base.substr(0, 10 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }
  return id;
}

function passwordHash(password) {
  if (!password) return "";
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function extractScriptName(scriptJson) {
  if (!scriptJson) return DEFAULT_SCRIPT_NAME;
  const script = typeof scriptJson === "string" ? JSON.parse(scriptJson) : scriptJson;
  const meta = Array.isArray(script)
    ? script.find(item => item && (item.id === "_meta" || item.id === "custom"))
    : null;
  return (meta && meta.name) || "Custom Script";
}

function sanitizeDisplayName(value, fallback) {
  return String(value || "")
    .trim()
    .substr(0, 30) || fallback;
}

function normalizeStatus(status) {
  return status === "playing" ? "playing" : "waiting";
}

function normalizeMaxPlayers(value, minimum = 1) {
  const parsed = Number.parseInt(value, 10);
  const count = Number.isFinite(parsed) ? parsed : DEFAULT_MAX_PLAYERS;
  return Math.max(minimum, Math.min(MAX_PLAYERS, count));
}

function normalizePlayerCount(value, maxPlayers = MAX_PLAYERS) {
  const parsed = Number.parseInt(value, 10);
  const count = Number.isFinite(parsed) ? parsed : 0;
  return Math.max(0, Math.min(normalizeMaxPlayers(maxPlayers), count));
}

function normalizeNote(value) {
  return String(value || "")
    .trim()
    .substr(0, MAX_NOTE_LENGTH);
}

function isHostConnected(room) {
  if (!room || !room.host) return false;
  if (typeof room.host.readyState !== "number") return true;
  return room.host.readyState === 1;
}

function createInviteToken() {
  return crypto.randomBytes(18).toString("base64url");
}

function summarize(room, options = {}) {
  const onlinePlayerCount = Array.from(room.players.values()).filter(
    player =>
      player &&
      !player.disconnectedAt &&
      player.ws &&
      player.ws.readyState === 1
  ).length;
  const playerCount = Number.isFinite(room.playerCount)
    ? room.playerCount
    : onlinePlayerCount;
  const summary = {
    id: room.id,
    name: room.name,
    visibility: room.visibility,
    isPrivate: room.visibility === "private",
    hostName: room.hostName,
    note: room.note,
    playerCount,
    maxPlayers: room.maxPlayers,
    scriptName: room.scriptName,
    status: room.status,
    voiceMode: room.voiceMode,
    hasVoiceUrl: !!room.voiceUrl,
    updatedAt: room.updatedAt
  };
  if (options.includeInviteToken) summary.inviteToken = room.inviteToken;
  return summary;
}

function clearPlayerDisconnectTimer(player) {
  if (!player || !player.disconnectTimer) return;
  clearTimeout(player.disconnectTimer);
  player.disconnectTimer = null;
}

function createRoom({ host, name, hostName = "", note = "", visibility = "public", password = "", maxPlayers, scriptJson = "", scriptName = "", status = "waiting", voiceUrl = "" }) {
  const cleanName = String(name || "").trim();
  if (!cleanName) throw new Error("invalid_room_name");
  const isPrivate = visibility === "private";
  if (isPrivate && !String(password || "").trim()) {
    throw new Error("password_required");
  }
  const now = Date.now();
  const room = {
    id: createRoomId(cleanName),
    name: cleanName,
    visibility: isPrivate ? "private" : "public",
    passwordHash: isPrivate ? passwordHash(password) : "",
    maxPlayers: normalizeMaxPlayers(maxPlayers),
    host,
    hostDisconnectedAt: 0,
    inviteToken: createInviteToken(),
    hostName: sanitizeDisplayName(hostName, DEFAULT_HOST_NAME),
    note: normalizeNote(note),
    players: new Map(),
    playerCount: null,
    bannedPlayerIds: new Set(),
    scriptName: scriptJson ? extractScriptName(scriptJson) : sanitizeDisplayName(scriptName, DEFAULT_SCRIPT_NAME),
    scriptJson: scriptJson || "",
    status: normalizeStatus(status),
    voiceMode: voiceUrl ? "external" : "none",
    voiceUrl: String(voiceUrl || "").trim(),
    createdAt: now,
    updatedAt: now
  };
  rooms.set(room.id, room);
  return room;
}

function listRooms() {
  return Array.from(rooms.values())
    .filter(room => !room.hostDisconnectedAt && isHostConnected(room))
    .map(summarize)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function closeRoomsWhere(predicate) {
  const closedRooms = [];
  rooms.forEach(room => {
    if (!predicate(room)) return;
    room.players.forEach(clearPlayerDisconnectTimer);
    rooms.delete(room.id);
    closedRooms.push(room);
  });
  return closedRooms;
}

function getRoom(id) {
  return rooms.get(sanitizeId(id));
}

function verifyJoin({ roomId, playerId, password, inviteToken }) {
  const room = getRoom(roomId);
  if (!room) throw new Error("room_not_found");
  if (room.hostDisconnectedAt || !isHostConnected(room)) throw new Error("host_disconnected");
  if (room.bannedPlayerIds.has(playerId)) throw new Error("banned");
  const existingPlayer = room.players.get(playerId);
  if (!existingPlayer && room.players.size >= room.maxPlayers) throw new Error("room_full");
  if (room.visibility === "private" && inviteToken) {
    if (inviteToken !== room.inviteToken) throw new Error("invalid_invite");
    return room;
  }
  if (room.visibility === "private" && room.passwordHash !== passwordHash(password)) {
    throw new Error(password ? "invalid_password" : "password_required");
  }
  return room;
}

function addPlayer(roomId, ws, playerName) {
  const room = getRoom(roomId);
  if (!room) throw new Error("room_not_found");
  const cleanName = String(playerName || "").trim();
  if (!cleanName) throw new Error("invalid_player_name");
  const existingPlayer = room.players.get(ws.playerId);
  clearPlayerDisconnectTimer(existingPlayer);
  room.players.set(ws.playerId, {
    ws,
    name: cleanName,
    joinedAt: existingPlayer ? existingPlayer.joinedAt : Date.now(),
    disconnectedAt: 0,
    disconnectTimer: null
  });
  room.updatedAt = Date.now();
  return room;
}

function updateRoom(roomId, patch) {
  const room = getRoom(roomId);
  if (!room) throw new Error("room_not_found");
  if (Object.prototype.hasOwnProperty.call(patch, "name")) {
    const cleanName = String(patch.name || "").trim();
    if (!cleanName) throw new Error("invalid_room_name");
    room.name = cleanName;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "visibility")) {
    room.visibility = patch.visibility === "private" ? "private" : "public";
    if (room.visibility === "public") room.passwordHash = "";
  }
  if (room.visibility === "private" && Object.prototype.hasOwnProperty.call(patch, "password")) {
    if (!String(patch.password || "").trim()) throw new Error("password_required");
    room.passwordHash = passwordHash(patch.password);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "scriptJson")) {
    room.scriptName = patch.scriptJson ? extractScriptName(patch.scriptJson) : DEFAULT_SCRIPT_NAME;
    room.scriptJson = patch.scriptJson || "";
  }
  if (Object.prototype.hasOwnProperty.call(patch, "scriptName")) {
    room.scriptName = sanitizeDisplayName(patch.scriptName, DEFAULT_SCRIPT_NAME);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "hostName")) {
    room.hostName = sanitizeDisplayName(patch.hostName, DEFAULT_HOST_NAME);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "note")) {
    room.note = normalizeNote(patch.note);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "maxPlayers")) {
    room.maxPlayers = normalizeMaxPlayers(patch.maxPlayers, room.players.size || 1);
    if (Number.isFinite(room.playerCount)) {
      room.playerCount = normalizePlayerCount(room.playerCount, room.maxPlayers);
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "playerCount")) {
    room.playerCount = normalizePlayerCount(patch.playerCount, room.maxPlayers);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "status")) {
    room.status = normalizeStatus(patch.status);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "voiceUrl")) {
    room.voiceUrl = String(patch.voiceUrl || "").trim();
    room.voiceMode = room.voiceUrl ? "external" : "none";
  }
  room.updatedAt = Date.now();
  return room;
}

function removePlayer(roomId, playerId) {
  const room = getRoom(roomId);
  if (!room) return null;
  room.players.delete(playerId);
  room.updatedAt = Date.now();
  return room;
}

function removePlayerConnection(roomId, playerId, ws) {
  const room = getRoom(roomId);
  if (!room) return { room: null, player: null, removed: false };
  const player = room.players.get(playerId);
  if (!player || player.ws !== ws) return { room, player: null, removed: false };
  clearPlayerDisconnectTimer(player);
  room.players.delete(playerId);
  room.updatedAt = Date.now();
  return { room, player, removed: true };
}

function reconnectPlayer(roomId, ws) {
  const room = getRoom(roomId);
  if (!room) return null;
  const player = room.players.get(ws.playerId);
  if (!player) return null;
  clearPlayerDisconnectTimer(player);
  player.ws = ws;
  player.disconnectedAt = 0;
  player.disconnectTimer = null;
  room.updatedAt = Date.now();
  return room;
}

function markPlayerDisconnected(roomId, playerId, ws, disconnectedAt = Date.now()) {
  const room = getRoom(roomId);
  if (!room) return { room: null, player: null, marked: false };
  const player = room.players.get(playerId);
  if (!player || player.ws !== ws) return { room, player: null, marked: false };
  player.disconnectedAt = disconnectedAt;
  room.updatedAt = disconnectedAt;
  return { room, player, marked: true };
}

function kickPlayer(roomId, playerId) {
  const room = getRoom(roomId);
  if (!room) throw new Error("room_not_found");
  room.bannedPlayerIds.add(playerId);
  const player = room.players.get(playerId);
  clearPlayerDisconnectTimer(player);
  room.players.delete(playerId);
  room.updatedAt = Date.now();
  return player;
}

function closeRoom(roomId) {
  const room = getRoom(roomId);
  if (!room) return null;
  room.players.forEach(clearPlayerDisconnectTimer);
  rooms.delete(room.id);
  return room;
}

module.exports = {
  MAX_PLAYERS,
  DEFAULT_MAX_PLAYERS,
  MAX_NOTE_LENGTH,
  normalizeMaxPlayers,
  normalizeNote,
  isHostConnected,
  createRoom,
  listRooms,
  getRoom,
  verifyJoin,
  addPlayer,
  reconnectPlayer,
  updateRoom,
  removePlayer,
  removePlayerConnection,
  markPlayerDisconnected,
  kickPlayer,
  closeRoom,
  closeRoomsWhere,
  summarize,
  extractScriptName
};
