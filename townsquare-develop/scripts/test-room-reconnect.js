const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const WS_URL = process.env.ROOM_TEST_WS_URL || "ws://localhost:8081";
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

async function createRoom(host, name) {
  host.send("room:create", {
    name,
    visibility: "public",
    scriptName: "Reconnect Script"
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

async function main() {
  writeLog("INFO", "room reconnect tests started", {
    wsUrl: WS_URL,
    origin: ORIGIN,
    logPath
  });
  await runReconnectScenario();
  await runHostRefreshScenario();
  writeLog("PASS", "room reconnect tests completed", { logPath });
}

main().catch(error => {
  writeLog("FAIL", "room reconnect tests failed", {
    error: error.message,
    stack: error.stack
  });
  console.error(`Room reconnect test log: ${logPath}`);
  process.exit(1);
});
