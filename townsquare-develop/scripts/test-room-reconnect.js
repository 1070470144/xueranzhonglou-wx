const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

process.env.NODE_ENV = "development";
process.env.TOWNSQUARE_WS_PORT = process.env.TOWNSQUARE_WS_PORT || "18083";
process.env.TOWNSQUARE_PLAYER_RECONNECT_GRACE_MS =
  process.env.TOWNSQUARE_PLAYER_RECONNECT_GRACE_MS || "1000";
if (!process.env.ROOM_TEST_WS_URL) require("../server/index");

const WS_URL =
  process.env.ROOM_TEST_WS_URL || `ws://localhost:${process.env.TOWNSQUARE_WS_PORT}`;
const ORIGIN = process.env.ROOM_TEST_ORIGIN || "http://localhost:8080";
const REQUEST_TIMEOUT = Number(process.env.ROOM_TEST_TIMEOUT || 5000);

const logDir = path.join(__dirname, "../logs/room-tests");
fs.mkdirSync(logDir, { recursive: true });

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace("T", "_")
  .replace("Z", "");
const logPath = path.join(logDir, `room-reconnect-${stamp}.log`);

function writeLog(level, message, data) {
  const line = JSON.stringify({
    at: new Date().toISOString(),
    level,
    message,
    data
  });
  fs.appendFileSync(logPath, `${line}\n`);
  const suffix = data === undefined ? "" : ` ${JSON.stringify(data)}`;
  console.log(`[${level}] ${message}${suffix}`);
}

function assert(condition, message, data) {
  if (!condition) {
    writeLog("FAIL", message, data);
    throw new Error(message);
  }
  writeLog("PASS", message, data);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class TestClient {
  constructor(label, playerId) {
    this.label = label;
    this.playerId = playerId;
    this.messages = [];
    this.waiters = [];
    this.ws = null;
  }

  async connect(channel = "lobby") {
    const url = `${WS_URL}/${channel}/${this.playerId}`;
    writeLog("INFO", `${this.label} connecting`, { url });
    this.ws = new WebSocket(url, { headers: { Origin: ORIGIN } });
    this.ws.on("message", data => this.handleMessage(data));
    this.ws.on("close", (code, reason) => {
      writeLog("INFO", `${this.label} closed`, {
        code,
        reason: reason && reason.toString()
      });
    });
    this.ws.on("error", error => {
      writeLog("ERROR", `${this.label} socket error`, { error: error.message });
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`${this.label} connect timeout`)),
        REQUEST_TIMEOUT
      );
      this.ws.once("open", () => {
        clearTimeout(timer);
        writeLog("INFO", `${this.label} connected`, { channel });
        resolve();
      });
      this.ws.once("error", reject);
    });
  }

  handleMessage(data) {
    let message;
    try {
      message = JSON.parse(data);
    } catch (error) {
      writeLog("ERROR", `${this.label} received invalid json`, {
        raw: data.toString()
      });
      return;
    }
    const [command, params] = message;
    writeLog("RECV", this.label, { command, params });
    this.messages.push(message);
    this.waiters = this.waiters.filter(waiter => {
      if (!waiter.predicate(command, params)) return true;
      clearTimeout(waiter.timer);
      waiter.resolve(message);
      return false;
    });
  }

  send(command, params = {}) {
    writeLog("SEND", this.label, { command, params });
    this.ws.send(JSON.stringify([command, params]));
  }

  waitFor(commandOrPredicate, timeout = REQUEST_TIMEOUT) {
    const predicate =
      typeof commandOrPredicate === "function"
        ? commandOrPredicate
        : command => command === commandOrPredicate;
    const existing = this.messages.find(([command, params]) =>
      predicate(command, params)
    );
    if (existing) return Promise.resolve(existing);
    return this.waitForNext(predicate, timeout);
  }

  waitForNext(commandOrPredicate, timeout = REQUEST_TIMEOUT) {
    const predicate =
      typeof commandOrPredicate === "function"
        ? commandOrPredicate
        : command => command === commandOrPredicate;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${this.label} timed out waiting for next message`));
      }, timeout);
      this.waiters.push({ predicate, resolve, timer });
    });
  }

  close() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.close(1000);
  }
}

async function createRoom(host, name, overrides = {}) {
  host.send("room:create", {
    name,
    visibility: "public",
    scriptName: "Reconnect Script",
    ...overrides
  });
  const [, payload] = await host.waitFor("room:create:ok");
  assert(payload.room && payload.room.id, "room created", payload.room);
  return payload.room;
}

async function joinRoom(client, roomId, playerName) {
  client.send("room:join", { roomId, playerName, password: "" });
  return client.waitForNext(command =>
    ["room:join:ok", "room:join:error"].includes(command)
  );
}

async function waitForPlayers(host, predicate, label) {
  const existing = [...host.messages].reverse().find(([command, players]) =>
    command === "room:players" && predicate(players)
  );
  if (existing) {
    writeLog("INFO", `${label} matched existing player list`, existing[1]);
    return existing[1];
  }
  const [, players] = await host.waitForNext(
    (command, params) => command === "room:players" && predicate(params),
    REQUEST_TIMEOUT * 2
  );
  writeLog("INFO", `${label} matched new player list`, players);
  return players;
}

async function runReconnectScenario() {
  const suffix = Date.now().toString(36);
  const host = new TestClient("reconnect-host", `reconnect-host-${suffix}`);
  const first = new TestClient("player-first-tab", `reconnect-player-${suffix}`);
  const second = new TestClient("player-refresh-tab", first.playerId);

  await host.connect();
  const room = await createRoom(host, `Reconnect ${suffix}`);

  await first.connect();
  let [command, payload] = await joinRoom(first, room.id, "Refresh Player");
  assert(command === "room:join:ok", "first connection joins room", payload.room);
  await waitForPlayers(
    host,
    players => players.length === 1 && players[0].id === first.playerId,
    "host sees first connection"
  );

  await second.connect();
  [command, payload] = await joinRoom(second, room.id, "Refresh Player");
  assert(command === "room:join:ok", "same player id can reconnect", payload.room);
  const afterReconnect = await waitForPlayers(
    host,
    players => players.length === 1 && players[0].id === second.playerId,
    "host still sees one player after reconnect"
  );
  assert(
    afterReconnect.length === 1,
    "reconnect does not duplicate room player count",
    afterReconnect
  );

  first.close();
  await delay(300);
  second.send("claim", [0, second.playerId]);
  const [, claimPayload] = await host.waitForNext(
    (nextCommand, params) =>
      nextCommand === "claim" &&
      Array.isArray(params) &&
      params[0] === 0 &&
      params[1] === second.playerId
  );
  assert(
    claimPayload[1] === second.playerId,
    "new connection can still claim after old connection closes",
    claimPayload
  );

  host.send("room:kick", { playerId: second.playerId });
  const [, kickedPayload] = await second.waitFor("room:kicked");
  assert(kickedPayload.roomId === room.id, "reconnected player can be kicked", kickedPayload);

  const banned = new TestClient("player-banned-rejoin", second.playerId);
  await banned.connect();
  [command, payload] = await joinRoom(banned, room.id, "Banned Player");
  assert(
    command === "room:join:error" && payload.reason === "banned",
    "kicked reconnected player cannot immediately rejoin",
    payload
  );

  [first, second, banned].forEach(client => client.close());
  host.close();
  await delay(200);
}

async function runPlayerDisconnectGraceScenario() {
  const suffix = Date.now().toString(36);
  const host = new TestClient("grace-host", `grace-host-${suffix}`);
  const lobby = new TestClient("grace-lobby-watcher", `grace-lobby-${suffix}`);
  const first = new TestClient("grace-player-original", `grace-player-${suffix}`);
  const second = new TestClient("grace-player-reconnect", first.playerId);

  await host.connect();
  await lobby.connect();
  const room = await createRoom(host, `Player Grace ${suffix}`);

  await first.connect();
  let [command, payload] = await joinRoom(first, room.id, "Grace Player");
  assert(command === "room:join:ok", "player joins before transient disconnect", payload.room);
  await waitForPlayers(
    host,
    players => players.length === 1 && players[0].id === first.playerId,
    "host sees player before transient disconnect"
  );

  first.ws.terminate();
  await delay(300);
  const latestPlayersMessage = [...host.messages]
    .reverse()
    .find(([nextCommand]) => nextCommand === "room:players");
  const duringGrace = latestPlayersMessage && latestPlayersMessage[1];
  assert(
    duringGrace.length === 1,
    "player disconnect grace should not drop the player immediately",
    duringGrace
  );
  lobby.send("room:list", {});
  const [, roomsDuringGrace] = await lobby.waitForNext(
    (nextCommand, params) =>
      nextCommand === "room:list:update" &&
      Array.isArray(params) &&
      params.some(item => item.id === room.id),
    REQUEST_TIMEOUT * 2
  );
  const roomDuringGrace = roomsDuringGrace.find(item => item.id === room.id);
  assert(
    roomDuringGrace.playerCount === 0,
    "lobby online count excludes disconnected players during reconnect grace",
    roomDuringGrace
  );

  await second.connect();
  [command, payload] = await joinRoom(second, room.id, "Grace Player");
  assert(command === "room:join:ok", "same player id rejoins during disconnect grace", payload.room);
  const afterReconnect = await waitForPlayers(
    host,
    players => players.length === 1 && players[0].id === second.playerId,
    "host still sees one player after grace reconnect"
  );
  assert(
    afterReconnect.length === 1,
    "same player reconnect during grace does not duplicate players",
    afterReconnect
  );

  second.send("claim", [0, second.playerId]);
  const [, claimPayload] = await host.waitForNext(
    (nextCommand, params) =>
      nextCommand === "claim" &&
      Array.isArray(params) &&
      params[0] === 0 &&
      params[1] === second.playerId
  );
  assert(
    claimPayload[1] === second.playerId,
    "reconnected player can send game actions after grace reconnect",
    claimPayload
  );

  second.close();
  lobby.close();
  host.close();
  await delay(200);
}

async function runHostRefreshScenario() {
  const suffix = Date.now().toString(36);
  const host = new TestClient("refresh-host-original", `refresh-host-${suffix}`);
  const refreshedHost = new TestClient("refresh-host-new-tab", "host");
  const player = new TestClient("refresh-player", `refresh-player-${suffix}`);

  await host.connect();
  const room = await createRoom(host, `Host Refresh ${suffix}`);

  await player.connect();
  let [command, payload] = await joinRoom(player, room.id, "Refresh Player");
  assert(command === "room:join:ok", "player joins before host refresh", payload.room);

  host.close();
  await delay(300);

  await refreshedHost.connect(room.id);
  refreshedHost.send("room:state:get", {});
  const [, statePayload] = await refreshedHost.waitForNext(
    nextCommand => nextCommand === "room:state",
    REQUEST_TIMEOUT * 2
  );
  assert(
    statePayload.room && statePayload.room.id === room.id,
    "host refresh can reclaim existing room",
    statePayload
  );

  player.send("claim", [0, player.playerId]);
  const [, claimPayload] = await refreshedHost.waitForNext(
    (nextCommand, params) =>
      nextCommand === "claim" &&
      Array.isArray(params) &&
      params[0] === 0 &&
      params[1] === player.playerId
  );
  assert(
    claimPayload[1] === player.playerId,
    "reclaimed host receives player messages after refresh",
    claimPayload
  );

  player.close();
  refreshedHost.close();
  await delay(200);
}

function findLatestMessage(client, command, predicate = () => true) {
  return [...client.messages]
    .reverse()
    .find(([nextCommand, params]) => nextCommand === command && predicate(params));
}

function findVoiceChannel(state, type) {
  return state && Array.isArray(state.channels)
    ? state.channels.find(channel => channel.type === type)
    : null;
}

async function runFullDataRestoreScenario() {
  const suffix = Date.now().toString(36);
  const scriptJson = JSON.stringify([
    { id: "_meta", name: `Restore Script ${suffix}`, author: "Reconnect Test" },
    { id: "washerwoman", team: "townsfolk", name: "Washerwoman" }
  ]);
  const host = new TestClient("restore-host-original", `restore-host-${suffix}`);
  const refreshedHost = new TestClient("restore-host-new-tab", "host");
  const firstPlayer = new TestClient("restore-player-original", `restore-player-${suffix}`);
  const refreshedPlayer = new TestClient("restore-player-reconnect", firstPlayer.playerId);

  await host.connect();
  const room = await createRoom(host, `Restore ${suffix}`, {
    hostName: "Restore Storyteller",
    note: `restore-note-${suffix}`,
    maxPlayers: 12,
    status: "playing",
    voiceUrl: "https://voice.example/restore",
    scriptJson
  });
  assert(
    room.hostName === "Restore Storyteller" &&
      room.note === `restore-note-${suffix}` &&
      room.maxPlayers === 12 &&
      room.status === "playing" &&
      room.hasVoiceUrl &&
      room.scriptName === `Restore Script ${suffix}`,
    "created room snapshot includes metadata that must survive reconnect",
    room
  );

  await firstPlayer.connect();
  let [command, payload] = await joinRoom(firstPlayer, room.id, "Restore Player");
  assert(
    command === "room:join:ok" && payload.scriptJson === scriptJson,
    "player receives room metadata and script before reconnect",
    payload
  );

  host.send("voice:muteAll:set", { value: true });
  const [, mutedVoice] = await host.waitForNext(
    (nextCommand, params) => nextCommand === "voice:state" && params && params.muteAll === true
  );
  assert(
    mutedVoice.participants.some(participant => participant.id === "host") &&
      mutedVoice.participants.some(participant => participant.id === firstPlayer.playerId),
    "voice state records host and player before reconnect",
    mutedVoice
  );

  host.send("voice:invite:create", { invitedIds: [firstPlayer.playerId] });
  const [, invitedVoice] = await host.waitForNext(
    (nextCommand, params) =>
      nextCommand === "voice:state" &&
      findVoiceChannel(params, "private") &&
      params.invitations.some(invite => invite.invitedIds.includes(firstPlayer.playerId))
  );
  const privateChannel = findVoiceChannel(invitedVoice, "private");
  assert(
    privateChannel &&
      privateChannel.memberIds.includes("host") &&
      privateChannel.invitedIds.includes(firstPlayer.playerId),
    "voice private channel and invitation exist before reconnect",
    invitedVoice
  );

  firstPlayer.ws.terminate();
  await delay(300);
  await refreshedPlayer.connect();
  [command, payload] = await joinRoom(refreshedPlayer, room.id, "Restore Player");
  assert(
    command === "room:join:ok" &&
      payload.room.id === room.id &&
      payload.room.playerCount === 1 &&
      payload.scriptJson === scriptJson,
    "player reconnect restores room snapshot and script json",
    payload
  );
  const [, playerVoice] = await refreshedPlayer.waitFor(
    (nextCommand, params) =>
      nextCommand === "voice:state" &&
      params &&
      params.muteAll === true &&
      params.participants.some(participant => participant.id === refreshedPlayer.playerId),
    REQUEST_TIMEOUT * 2
  );
  assert(
    findVoiceChannel(playerVoice, "private") &&
      playerVoice.invitations.some(invite => invite.invitedIds.includes(refreshedPlayer.playerId)),
    "player reconnect restores voice state including private invitation",
    playerVoice
  );

  refreshedPlayer.send("direct", {
    host: ["getGamestate", refreshedPlayer.playerId]
  });
  const [, gamestateRequestPlayerId] = await host.waitForNext(
    (nextCommand, params) => nextCommand === "getGamestate" && params === refreshedPlayer.playerId
  );
  assert(
    gamestateRequestPlayerId === refreshedPlayer.playerId,
    "reconnected player can request current gamestate from host",
    gamestateRequestPlayerId
  );

  host.send("direct", {
    [refreshedPlayer.playerId]: [
      "gs",
      {
        gamestate: [
          { name: "Restore Seat", id: refreshedPlayer.playerId, isDead: true, isVoteless: false }
        ],
        isNight: true,
        isVoteHistoryAllowed: true,
        markedPlayer: 0,
        fabled: []
      }
    ]
  });
  const [, gamestatePayload] = await refreshedPlayer.waitForNext(
    (nextCommand, params) =>
      nextCommand === "gs" &&
      params &&
      params.isNight === true &&
      Array.isArray(params.gamestate) &&
      params.gamestate[0] &&
      params.gamestate[0].id === refreshedPlayer.playerId
  );
  assert(
    gamestatePayload.gamestate[0].isDead === true,
    "reconnected player receives full gamestate from host",
    gamestatePayload
  );

  host.close();
  await delay(300);
  await refreshedHost.connect(room.id);
  refreshedHost.send("room:state:get", {});
  const [, statePayload] = await refreshedHost.waitForNext(
    nextCommand => nextCommand === "room:state",
    REQUEST_TIMEOUT * 2
  );
  assert(
    statePayload.room.id === room.id &&
      statePayload.room.hostName === "Restore Storyteller" &&
      statePayload.room.note === `restore-note-${suffix}` &&
      statePayload.room.maxPlayers === 12 &&
      statePayload.room.status === "playing" &&
      statePayload.room.hasVoiceUrl &&
      statePayload.room.playerCount === 1 &&
      statePayload.scriptJson === scriptJson,
    "host reconnect restores complete room metadata and script json",
    statePayload
  );
  const hostPlayers = await waitForPlayers(
    refreshedHost,
    players => players.length === 1 && players[0].id === refreshedPlayer.playerId,
    "reconnected host restores player list"
  );
  assert(
    hostPlayers[0].name === "Restore Player",
    "reconnected host restores player identity",
    hostPlayers
  );
  const hostVoiceMessage = findLatestMessage(
    refreshedHost,
    "voice:state",
    params =>
      params &&
      params.muteAll === true &&
      params.participants.some(participant => participant.id === "host") &&
      params.participants.some(participant => participant.id === refreshedPlayer.playerId)
  );
  assert(
    hostVoiceMessage &&
      findVoiceChannel(hostVoiceMessage[1], "private") &&
      hostVoiceMessage[1].invitations.some(invite =>
        invite.invitedIds.includes(refreshedPlayer.playerId)
      ),
    "host reconnect restores voice state including participants and invitations",
    hostVoiceMessage && hostVoiceMessage[1]
  );

  refreshedPlayer.send("claim", [1, refreshedPlayer.playerId]);
  const [, claimPayload] = await refreshedHost.waitForNext(
    (nextCommand, params) =>
      nextCommand === "claim" &&
      Array.isArray(params) &&
      params[0] === 1 &&
      params[1] === refreshedPlayer.playerId
  );
  assert(
    claimPayload[1] === refreshedPlayer.playerId,
    "restored host receives player game actions after full reconnect",
    claimPayload
  );

  refreshedPlayer.close();
  refreshedHost.close();
  await delay(200);
}

async function main() {
  writeLog("INFO", "room reconnect tests started", {
    wsUrl: WS_URL,
    origin: ORIGIN,
    logPath
  });
  await runReconnectScenario();
  await runPlayerDisconnectGraceScenario();
  await runHostRefreshScenario();
  await runFullDataRestoreScenario();
  writeLog("PASS", "room reconnect tests completed", { logPath });
  process.exit(0);
}

main().catch(error => {
  writeLog("FAIL", "room reconnect tests failed", {
    error: error.message,
    stack: error.stack
  });
  console.error(`Room reconnect test log: ${logPath}`);
  process.exit(1);
});
