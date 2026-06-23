const assert = require("assert");
const fs = require("fs");
const path = require("path");

const socketSource = fs.readFileSync(
  path.join(__dirname, "../src/store/socket.js"),
  "utf8"
);
const serverSource = fs.readFileSync(
  path.join(__dirname, "../server/index.js"),
  "utf8"
);

[
  'case "room:list:update"',
  'case "room:create:ok"',
  'case "room:join:ok"',
  'case "room:state"',
  'case "room:update"',
  'case "room:players"',
  'case "room:kicked"',
  'case "room:closed"',
  "requestRoomList()",
  "createRoom(payload)",
  "ensureRoomSeats(room)",
  "joinRoom(payload)",
  "updateRoom(payload)",
  "kickRoomPlayer(playerId)",
  "_ensureLobbySocket()",
  "isLobbyConnected()",
  "_sendWhenOpen(command, params)",
  "_startRoomRequestTimeout",
  "connection_timeout",
  "_applyRoomJoined",
  "_syncRoomPlayers",
  "_pendingPlayerNames",
  "_applyPendingPlayerName",
  "_isRoomSession",
  "room/clearRoom",
  "_isApplyingRoomSnapshot",
  "if (session._isApplyingRoomSnapshot) return",
  "_isJoiningRoom",
  "_store.state.room.current",
  "const seatIsAvailable =",
  "this._handlePing([value, 0])",
  "_loadRoomScript",
  "_withCurrentScript",
  "scriptName",
  "scriptJson",
  "JSON.stringify",
  "customRolesStripped",
  'item.id !== "_meta"',
  'commit("setCustomRoles", roles)',
  "isConnectedTo(channel)",
  'case "room/requestList"',
  'case "room/create"',
  'case "room/join"',
  'case "room/update"',
  'case "room/kick"',
  "parseRoomShareHash"
].forEach(needle => assert(socketSource.includes(needle), `missing ${needle}`));

assert(
  !socketSource.includes("this._handlePing([true, value, 0])"),
  "claim seat should record the real player id as the ping key"
);

assert(
  socketSource.indexOf("this._players[playerIdOrCount] = now") <
    socketSource.indexOf("remove claimed seats from players"),
  "claim seat should record the player before clearing disconnected seats"
);

const applyRoomJoinedStart = socketSource.indexOf("_applyRoomJoined(");
const applyRoomJoinedEnd = socketSource.indexOf("\n  _loadRoomScript(scriptJson) {", applyRoomJoinedStart);
const applyRoomJoinedSource = socketSource.slice(applyRoomJoinedStart, applyRoomJoinedEnd);

assert(
  applyRoomJoinedSource.includes('commit("session/claimSeat", -1)'),
  "joining a room should clear any locally claimed seat from a previous room"
);

assert(
  applyRoomJoinedSource.includes('commit("players/clear")'),
  "joining a room should clear stale local player ids before the host gamestate arrives"
);

assert(
  /case "room:create:ok":[\s\S]*?this\._applyRoomJoined\(params, false, \{ resetSeats: true \}\)/.test(socketSource),
  "creating a new room should reset stale local seats before applying the room player count"
);

assert(
  applyRoomJoinedSource.includes("resetSeats") &&
    applyRoomJoinedSource.includes(
      'if (isSpectator || resetSeats) this._store.commit("players/clear")'
    ),
  "new room setup should clear stale local player names while spectator joins still clear before the host gamestate"
);

assert(
  applyRoomJoinedSource.includes('commit("roleDraw/resetSession")'),
  "joining a room should clear stale role draw state from previous rooms"
);

assert(
  applyRoomJoinedSource.includes("this.ensureRoomSeats(room)") &&
    socketSource.includes('commit("players/setCount"') &&
    socketSource.includes("room.maxPlayers"),
  "creating a room as storyteller should set local player seats to the room player count instead of appending seats"
);
const ensureRoomSeatsStart = socketSource.indexOf("ensureRoomSeats(room) {");
const ensureRoomSeatsEnd = socketSource.indexOf("\n  _loadRoomScript", ensureRoomSeatsStart);
const ensureRoomSeatsSource = socketSource.slice(
  ensureRoomSeatsStart,
  ensureRoomSeatsEnd
);
assert(
  ensureRoomSeatsSource.includes('commit("players/setCount", maxPlayers)') &&
    !ensureRoomSeatsSource.includes("length < maxPlayers"),
  "room seat sync should shrink stale seats when a new room has fewer max players"
);

assert(
  socketSource.includes('case "room:update"') &&
    socketSource.includes('case "room:update:ok"') &&
    /case "room:update":[\s\S]*?case "room:update:ok":[\s\S]*?this\.ensureRoomSeats\(params && params\.room\)/.test(socketSource),
  "room max player updates should overwrite the scene seat count when the storyteller receives a room update"
);

assert(
  socketSource.includes('case "players/setCount"') &&
    socketSource.indexOf('case "players/setCount"') < socketSource.indexOf('session.sendGamestate("", true)'),
  "setting the scene player count should sync the replaced gamestate to room players"
);

assert(
  socketSource.includes("const seatIsAvailable =") &&
    socketSource.includes("!players[seat].id"),
  "room players should not be allowed to claim seats that already have a player id"
);

assert(
  /claimSeat\(seat\)[\s\S]*?this\._send\("claim", \[seat, this\._store\.state\.session\.playerId\]\);[\s\S]*?this\.sendClaimedPlayerName\(seat\);/.test(
    socketSource
  ),
  "claiming a room seat should immediately send the player's chosen name instead of waiting for a later sync"
);

assert(
  /_updatePlayerName\(\{ playerId, index, name \} = \{\}\)[\s\S]*?this\._pendingPlayerNames\[playerId\] = cleanName/.test(
    socketSource
  ),
  "early playerName messages should be cached when they arrive before the claim seat update"
);

assert(
  /_updateSeat\(\[index, value\]\)[\s\S]*?this\._applyPendingPlayerName\(index, value\)/.test(
    socketSource
  ),
  "claim seat updates should apply any cached player name immediately after binding the player id"
);

assert(
  socketSource.includes("if (session._isApplyingRoomSnapshot) return") &&
    socketSource.indexOf("if (session._isApplyingRoomSnapshot) return") <
      socketSource.indexOf("if (state.session.sessionId)"),
  "room script snapshots should not clear the room socket while applying host updates"
);

assert(
  /case "room:players":[\s\S]*?this\._syncRoomPlayers\(params\)/.test(socketSource),
  "room player snapshots should refresh the storyteller online-player cache after reconnect"
);

assert(
  /case "session\/setSessionId":[\s\S]*?else \{[\s\S]*?store\.commit\("roleDraw\/resetSession"\)/.test(
    socketSource
  ),
  "leaving a room should clear role draw session state without waiting for a page refresh"
);

assert(
  /if \(isSpectator\)[\s\S]*?this\._sendDirect\([\s\S]*?"host"[\s\S]*?"getGamestate"/.test(
    applyRoomJoinedSource
  ),
  "joining a room should request the host gamestate on the reused room socket"
);

assert(
  socketSource.includes('this._send("room:state:get", {})'),
  "storyteller reconnect should request room state from the server"
);

const roomSocketOnCloseStart = socketSource.indexOf("socket.onclose = (err) => {");
const roomSocketOnCloseEnd = socketSource.indexOf("\n  }\n\n  /**\n   * Send a message", roomSocketOnCloseStart);
const roomSocketOnCloseSource = socketSource.slice(
  roomSocketOnCloseStart,
  roomSocketOnCloseEnd
);

assert(
  roomSocketOnCloseSource.includes("if (this._socket !== socket) return"),
  "stale socket close events should not clear or reconnect a newer room socket"
);

assert(
  roomSocketOnCloseSource.includes("shouldRecoverRoomSession") &&
    /err\.code !== 1000 \|\| shouldRecoverRoomSession/.test(roomSocketOnCloseSource),
  "mobile browser normal-close events for an active room session should reconnect instead of clearing the room"
);

assert(
  !/else \{[\s\S]*?commit\("voice\/clear"\)[\s\S]*?commit\("room\/clearRoom"\)[\s\S]*?commit\("session\/setSessionId", ""\)/.test(
    roomSocketOnCloseSource
  ),
  "room socket normal close should not be treated as an implicit user leave"
);

assert(
  socketSource.includes("resumeCurrentSession()") &&
    socketSource.includes('window.addEventListener("pageshow", resumeCurrentSession)') &&
    socketSource.includes('document.addEventListener("visibilitychange"') &&
    socketSource.includes("session.resumeCurrentSession()"),
  "returning to the mobile browser should immediately resume the persisted room session"
);

assert(
  /_onOpen\(\)[\s\S]*?this\._store\.state\.room\.current[\s\S]*?this\._send\("room:state:get", \{\}\)/.test(
    socketSource
  ),
  "storyteller room socket reopen should request room state when recovering an existing room"
);

const onOpenStart = socketSource.indexOf("_onOpen() {");
const onOpenEnd = socketSource.indexOf("\n  /**\n   * Send a ping", onOpenStart);
const onOpenSource = socketSource.slice(onOpenStart, onOpenEnd);
const recoveringRoomStart = onOpenSource.indexOf(
  "this._store.state.room.current"
);
const recoveringRoomEnd = onOpenSource.indexOf("} else {", recoveringRoomStart);
const recoveringRoomSource = onOpenSource.slice(
  recoveringRoomStart,
  recoveringRoomEnd
);

assert(
  recoveringRoomSource.includes('this._send("room:state:get", {})'),
  "storyteller socket reopen for an existing room should pull the authoritative room snapshot"
);

assert(
  !recoveringRoomSource.includes("this.sendGamestate()"),
  "storyteller socket reopen should not broadcast stale local gamestate before room state recovery"
);

assert(
  /_onOpen\(\)[\s\S]*?this\._sendDirect\([\s\S]*?"host"[\s\S]*?"getGamestate"[\s\S]*?this\.requestVoiceState\(\)/.test(
    socketSource
  ),
  "player room socket reopen should request host gamestate and voice state"
);

assert(
  /parseRoomShareHash[\s\S]*?URLSearchParams[\s\S]*?inviteToken/.test(socketSource) &&
    /const sharedRoom[\s\S]*?room\/updateJoinForm[\s\S]*?room\/join/.test(socketSource),
  "opening a room share hash should automatically join with invite token"
);

assert(
  serverSource.includes('case "room:create"') && serverSource.includes("note: params.note"),
  "room create websocket handler should pass notes into the room registry"
);

console.log("room socket source tests passed");
