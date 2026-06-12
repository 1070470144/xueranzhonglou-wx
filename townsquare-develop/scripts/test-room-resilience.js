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
const logPath = path.join(logDir, `room-resilience-${stamp}.log`);

function writeLog(level, message, data) {
  const line = JSON.stringify({ at: new Date().toISOString(), level, message, data });
  fs.appendFileSync(logPath, `${line}\n`);
  console.log(`[${level}] ${message}${data === undefined ? "" : ` ${JSON.stringify(data)}`}`);
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
    this.closed = false;
  }

  async connect(channel = "lobby") {
    const url = `${WS_URL}/${channel}/${this.playerId}`;
    writeLog("INFO", `${this.label} connecting`, { url });
    this.ws = new WebSocket(url, { headers: { Origin: ORIGIN } });
    this.ws.on("message", data => this.handleMessage(data));
    this.ws.on("close", (code, reason) => {
      this.closed = true;
      writeLog("INFO", `${this.label} closed`, { code, reason: reason && reason.toString() });
    });
    this.ws.on("error", error => writeLog("ERROR", `${this.label} socket error`, { error: error.message }));
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${this.label} connect timeout`)), REQUEST_TIMEOUT);
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
      writeLog("ERROR", `${this.label} received invalid json`, { raw: data.toString() });
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
    const predicate = typeof commandOrPredicate === "function" ? commandOrPredicate : command => command === commandOrPredicate;
    const existing = this.messages.find(([command, params]) => predicate(command, params));
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${this.label} timed out waiting for message`)), timeout);
      this.waiters.push({ predicate, resolve, timer });
    });
  }

  waitForNext(commandOrPredicate, timeout = REQUEST_TIMEOUT) {
    const predicate = typeof commandOrPredicate === "function" ? commandOrPredicate : command => command === commandOrPredicate;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${this.label} timed out waiting for next message`)), timeout);
      this.waiters.push({ predicate, resolve, timer });
    });
  }

  close() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.close(1000);
  }
}

async function createRoom(host, name, patch = {}) {
  host.send("room:create", { name, visibility: "public", scriptName: "Resilience Script", ...patch });
  const [, payload] = await host.waitFor("room:create:ok");
  assert(payload.room && payload.room.id, "room created", payload.room);
  return payload.room;
}

async function joinRoom(client, roomId, playerName, password = "") {
  client.send("room:join", { roomId, playerName, password });
  return client.waitForNext(command => ["room:join:ok", "room:join:error"].includes(command));
}

async function runPlayerDisconnectScenario() {
  const suffix = Date.now().toString(36);
  const host = new TestClient("disconnect-host", `disconnect-host-${suffix}`);
  const player = new TestClient("disconnect-player", `disconnect-player-${suffix}`);
  await host.connect();
  const room = await createRoom(host, `Disconnect ${suffix}`);
  await player.connect();
  const [joinCommand] = await joinRoom(player, room.id, "Disconnect Player");
  assert(joinCommand === "room:join:ok", "player joins before disconnect");
  player.close();
  const [, players] = await host.waitForNext((command, params) => command === "room:players" && Array.isArray(params) && params.length === 0, REQUEST_TIMEOUT * 2);
  assert(players.length === 0, "player disconnect removes player from host list", players);
  host.close();
  await delay(100);
}

async function runDuplicatePlayerIdScenario() {
  const suffix = Date.now().toString(36);
  const host = new TestClient("duplicate-host", `duplicate-host-${suffix}`);
  const first = new TestClient("duplicate-first", `duplicate-player-${suffix}`);
  const second = new TestClient("duplicate-second", `duplicate-player-${suffix}`);
  await host.connect();
  const room = await createRoom(host, `Duplicate ${suffix}`);
  await first.connect();
  await joinRoom(first, room.id, "First Name");
  await second.connect();
  await joinRoom(second, room.id, "Second Name");
  const [, players] = await host.waitForNext((command, params) => command === "room:players" && params.some(player => player.name === "Second Name"), REQUEST_TIMEOUT * 2);
  assert(players.length === 1 && players[0].name === "Second Name", "duplicate player id replaces player entry once", players);
  first.close();
  second.close();
  host.close();
  await delay(100);
}

async function runPrivateLifecycleScenario() {
  const suffix = Date.now().toString(36);
  const host = new TestClient("privacy-host", `privacy-host-${suffix}`);
  await host.connect();
  const room = await createRoom(host, `Privacy ${suffix}`);
  host.send("room:update", { visibility: "private", password: "one" });
  await host.waitForNext("room:update:ok");
  const oldPassword = new TestClient("privacy-old-password", `privacy-old-${suffix}`);
  await oldPassword.connect();
  let [command, payload] = await joinRoom(oldPassword, room.id, "Old Password", "bad");
  assert(command === "room:join:error" && payload.reason === "invalid_password", "private room rejects wrong password", payload);
  host.send("room:update", { visibility: "private", password: "two" });
  await host.waitForNext("room:update:ok");
  [command, payload] = await joinRoom(oldPassword, room.id, "Old Password", "one");
  assert(command === "room:join:error" && payload.reason === "invalid_password", "changed private password invalidates old password", payload);
  const newPassword = new TestClient("privacy-new-password", `privacy-new-${suffix}`);
  await newPassword.connect();
  [command] = await joinRoom(newPassword, room.id, "New Password", "two");
  assert(command === "room:join:ok", "changed private password accepts new password");
  host.send("room:update", { visibility: "public" });
  await host.waitForNext("room:update:ok");
  const publicJoin = new TestClient("privacy-public", `privacy-public-${suffix}`);
  await publicJoin.connect();
  [command] = await joinRoom(publicJoin, room.id, "Public Join");
  assert(command === "room:join:ok", "public room after privacy toggle accepts no password");
  oldPassword.close();
  newPassword.close();
  publicJoin.close();
  host.close();
  await delay(100);
}

async function runSeatConflictScenario() {
  const suffix = Date.now().toString(36);
  const host = new TestClient("seat-host", `seat-host-${suffix}`);
  const a = new TestClient("seat-a", `seat-a-${suffix}`);
  const b = new TestClient("seat-b", `seat-b-${suffix}`);
  await host.connect();
  const room = await createRoom(host, `Seat ${suffix}`);
  await a.connect();
  await b.connect();
  await joinRoom(a, room.id, "Seat A");
  await joinRoom(b, room.id, "Seat B");
  const baseline = host.messages.length;
  a.send("claim", [0, a.playerId]);
  b.send("claim", [0, b.playerId]);
  let claims = [];
  while (claims.length < 2) {
    claims = host.messages
      .slice(baseline)
      .filter(
        ([command, params]) =>
          command === "claim" && Array.isArray(params) && params[0] === 0,
      );
    if (claims.length < 2) {
      await host.waitForNext(
        (command, params) =>
          command === "claim" && Array.isArray(params) && params[0] === 0,
      );
    }
  }
  const [first, second] = claims;
  assert(first[1][1] !== second[1][1], "simultaneous same-seat claims both reach host for host-side resolution", { first: first[1], second: second[1] });
  a.close();
  b.close();
  host.close();
  await delay(100);
}

async function runLongInputScenario() {
  const suffix = Date.now().toString(36);
  const host = new TestClient("long-host", `long-host-${suffix}`);
  await host.connect();
  const longName = `Long ${suffix} ${"x".repeat(300)}`;
  const room = await createRoom(host, longName);
  assert(room.name.length === longName.length, "long room name is accepted without truncating display name", { length: room.name.length });
  const player = new TestClient("long-player", `long-player-${suffix}`);
  await player.connect();
  const [command] = await joinRoom(player, room.id, "P".repeat(300));
  assert(command === "room:join:ok", "long player name is accepted");
  player.close();
  host.close();
  await delay(100);
}

async function main() {
  writeLog("INFO", "room resilience test started", { wsUrl: WS_URL, origin: ORIGIN, logPath });
  await runPlayerDisconnectScenario();
  await runDuplicatePlayerIdScenario();
  await runPrivateLifecycleScenario();
  await runSeatConflictScenario();
  await runLongInputScenario();
  writeLog("PASS", "room resilience test completed", { logPath });
}

main().catch(error => {
  writeLog("FAIL", "room resilience test failed", { error: error.message, stack: error.stack });
  console.error(`Room resilience log: ${logPath}`);
  process.exit(1);
});
