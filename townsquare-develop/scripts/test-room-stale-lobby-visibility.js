const assert = require("assert");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

process.env.NODE_ENV = "development";
process.env.TOWNSQUARE_WS_PORT = process.env.TOWNSQUARE_WS_PORT || "18084";
process.env.TOWNSQUARE_HOST_RECONNECT_GRACE_MS =
  process.env.TOWNSQUARE_HOST_RECONNECT_GRACE_MS || "250";
require("../server/index");

const WS_URL = `ws://localhost:${process.env.TOWNSQUARE_WS_PORT}`;
const ORIGIN = "http://localhost:8080";
const REQUEST_TIMEOUT = 4000;

const logDir = path.join(__dirname, "../logs/room-tests");
fs.mkdirSync(logDir, { recursive: true });
const logPath = path.join(
  logDir,
  `room-stale-lobby-${new Date().toISOString().replace(/[:.]/g, "-")}.log`
);

function writeLog(level, message, data) {
  const line = JSON.stringify({
    at: new Date().toISOString(),
    level,
    message,
    data
  });
  fs.appendFileSync(logPath, `${line}\n`);
  console.log(`[${level}] ${message}${data === undefined ? "" : ` ${JSON.stringify(data)}`}`);
}

function pass(message, data) {
  writeLog("PASS", message, data);
}

function fail(message, data) {
  writeLog("FAIL", message, data);
  throw new Error(message);
}

function expect(condition, message, data) {
  if (!condition) fail(message, data);
  pass(message, data);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function findRoom(list, roomId) {
  return Array.isArray(list) ? list.find(room => room.id === roomId) : null;
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

async function waitForRoomList(client, roomId, shouldExist) {
  const predicate = (command, params) =>
    command === "room:list:update" && !!findRoom(params, roomId) === shouldExist;
  if (shouldExist) {
    const existing = [...client.messages].reverse().find(([command, params]) =>
      predicate(command, params)
    );
    if (existing) return findRoom(existing[1], roomId);
  }
  const [, list] = await client.waitForNext(predicate, REQUEST_TIMEOUT * 2);
  return findRoom(list, roomId);
}

async function createRoom(host, name) {
  host.send("room:create", {
    name,
    visibility: "public",
    scriptName: "Stale Visibility Script"
  });
  const [, payload] = await host.waitFor("room:create:ok");
  assert(payload.room && payload.room.id);
  return payload.room;
}

async function joinRoom(client, roomId, playerName) {
  client.send("room:join", { roomId, playerName, password: "" });
  return client.waitForNext(command =>
    ["room:join:ok", "room:join:error"].includes(command)
  );
}

async function main() {
  await delay(100);
  writeLog("INFO", "room stale lobby visibility test started", {
    wsUrl: WS_URL,
    origin: ORIGIN,
    reconnectGraceMs: process.env.TOWNSQUARE_HOST_RECONNECT_GRACE_MS,
    logPath
  });

  const suffix = Date.now().toString(36);
  const watcher = new TestClient("lobby-watcher", `stale-watcher-${suffix}`);
  const host = new TestClient("original-host", `stale-host-${suffix}`);
  const player = new TestClient("existing-player", `stale-player-${suffix}`);

  await watcher.connect();
  await host.connect();
  watcher.send("room:list", {});
  await watcher.waitFor("room:list:update");

  const room = await createRoom(host, `Stale Visibility ${suffix}`);
  const listedRoom = await waitForRoomList(watcher, room.id, true);
  expect(listedRoom && listedRoom.id === room.id, "active room is visible in lobby", listedRoom);

  await player.connect();
  const [joinCommand, joinPayload] = await joinRoom(player, room.id, "Existing Player");
  expect(joinCommand === "room:join:ok", "player can join while host is connected", joinPayload);

  host.close();
  const hiddenDuringGrace = await waitForRoomList(watcher, room.id, false);
  expect(!hiddenDuringGrace, "host-disconnected room is hidden from lobby immediately", {
    roomId: room.id
  });

  const lateJoiner = new TestClient("late-joiner", `late-joiner-${suffix}`);
  await lateJoiner.connect();
  const [lateCommand, latePayload] = await joinRoom(lateJoiner, room.id, "Late Joiner");
  expect(
    lateCommand === "room:join:error" && latePayload.reason === "host_disconnected",
    "new players cannot join a room while its host is disconnected",
    latePayload
  );

  const refreshedHost = new TestClient("refreshed-host", "host");
  await refreshedHost.connect(room.id);
  refreshedHost.send("room:state:get", {});
  const [, statePayload] = await refreshedHost.waitFor("room:state");
  expect(
    statePayload.room && statePayload.room.id === room.id,
    "host can reclaim hidden room during reconnect grace",
    statePayload.room
  );
  const visibleAgain = await waitForRoomList(watcher, room.id, true);
  expect(visibleAgain && visibleAgain.id === room.id, "reclaimed room is visible again", visibleAgain);

  refreshedHost.close();
  await waitForRoomList(watcher, room.id, false);
  const [, closedPayload] = await player.waitFor("room:closed", REQUEST_TIMEOUT * 2);
  expect(
    closedPayload.roomId === room.id,
    "players are notified when reconnect grace expires",
    closedPayload
  );

  const expiredHost = new TestClient("expired-host", "host");
  await expiredHost.connect(room.id);
  expiredHost.send("room:state:get", {});
  const [, expiredPayload] = await expiredHost.waitFor("room:state:get:error");
  expect(
    expiredPayload.reason === "room_not_found",
    "expired hidden room cannot be reclaimed after grace",
    expiredPayload
  );

  [watcher, player, lateJoiner, expiredHost].forEach(client => client.close());
  writeLog("PASS", "room stale lobby visibility test completed", { logPath });
  await delay(50);
  process.exit(0);
}

main().catch(error => {
  writeLog("FAIL", "room stale lobby visibility test failed", {
    error: error.message,
    stack: error.stack
  });
  console.error(`Room stale lobby visibility log: ${logPath}`);
  process.exit(1);
});
