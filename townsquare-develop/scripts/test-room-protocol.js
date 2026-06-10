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
const logPath = path.join(logDir, `room-protocol-${stamp}.log`);

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
    this.invalidJsonMessages = [];
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
      this.invalidJsonMessages.push(data.toString());
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

  sendRaw(raw) {
    writeLog("SEND", this.label, { raw });
    this.ws.send(raw);
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
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${this.label} timed out waiting for message`));
      }, timeout);
      this.waiters.push({ predicate, resolve, timer });
    });
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

async function expectRoomError(client, command, reason) {
  const [, payload] = await client.waitForNext(`${command}:error`);
  assert(payload && payload.reason === reason, `${command} rejects with ${reason}`, {
    payload
  });
}

async function createRoom(host, suffix, overrides = {}) {
  host.send("room:create", {
    name: `Protocol ${suffix}`,
    visibility: "public",
    scriptName: "Protocol Script",
    hostName: "Protocol Host",
    ...overrides
  });
  const [, payload] = await host.waitFor("room:create:ok");
  assert(payload.room && payload.room.id, "room created", payload.room);
  assert(payload.room.hostName === "Protocol Host", "room summary includes host name", payload.room);
  assert(payload.room.status === "waiting", "room summary includes waiting status", payload.room);
  return payload.room;
}

async function run() {
  writeLog("INFO", "room protocol test started", { wsUrl: WS_URL, logPath });
  const suffix = Date.now().toString(36);
  const clients = [];

  try {
    const invalidCreate = new TestClient("invalid-create", `protocol-invalid-${suffix}`);
    clients.push(invalidCreate);
    await invalidCreate.connect();
    invalidCreate.send("room:create", { name: "   ", visibility: "public" });
    await expectRoomError(invalidCreate, "room:create", "invalid_room_name");

    invalidCreate.send("room:create", {
      name: `Protocol Private Missing ${suffix}`,
      visibility: "private"
    });
    await expectRoomError(invalidCreate, "room:create", "password_required");

    const host = new TestClient("host", `protocol-host-${suffix}`);
    clients.push(host);
    await host.connect();
    const room = await createRoom(host, suffix, {
      visibility: "private",
      password: "secret"
    });

    const missingPassword = new TestClient("missing-password", `protocol-missing-${suffix}`);
    clients.push(missingPassword);
    await missingPassword.connect();
    missingPassword.send("room:join", {
      roomId: room.id,
      playerName: "Missing Password"
    });
    await expectRoomError(missingPassword, "room:join", "password_required");

    const wrongPassword = new TestClient("wrong-password", `protocol-wrong-${suffix}`);
    clients.push(wrongPassword);
    await wrongPassword.connect();
    wrongPassword.send("room:join", {
      roomId: room.id,
      playerName: "Wrong Password",
      password: "bad"
    });
    await expectRoomError(wrongPassword, "room:join", "invalid_password");

    const emptyName = new TestClient("empty-name", `protocol-empty-${suffix}`);
    clients.push(emptyName);
    await emptyName.connect();
    emptyName.send("room:join", {
      roomId: room.id,
      playerName: "   ",
      password: "secret"
    });
    await expectRoomError(emptyName, "room:join", "invalid_player_name");

    const validPlayer = new TestClient("valid-player", `protocol-valid-${suffix}`);
    clients.push(validPlayer);
    await validPlayer.connect();
    validPlayer.send("room:join", {
      roomId: room.id,
      playerName: "Valid Player",
      password: "secret"
    });
    const [, joinPayload] = await validPlayer.waitFor("room:join:ok");
    assert(joinPayload.room.id === room.id, "valid private join succeeds", joinPayload.room);

    validPlayer.send("claim", [0, validPlayer.playerId]);
    await host.waitFor(
      (command, params) =>
        command === "claim" && Array.isArray(params) && params[1] === validPlayer.playerId
    );
    assert(true, "host receives valid claim");

    const nonHost = new TestClient("non-host", `protocol-nonhost-${suffix}`);
    clients.push(nonHost);
    await nonHost.connect(room.id);
    nonHost.send("room:update", { name: "Non Host Update" });
    await expectRoomError(nonHost, "room:update", "host_only");

    host.send("room:update", { visibility: "private", password: "" });
    await expectRoomError(host, "room:update", "password_required");

    host.send("room:update", { status: "playing" });
    const [, updatePayload] = await host.waitForNext("room:update:ok");
    assert(updatePayload.room.status === "playing", "host can update room status", updatePayload.room);

    host.send("room:join", { roomId: "missing-room", playerName: "Nobody" });
    await expectRoomError(host, "room:join", "room_not_found");

    invalidCreate.sendRaw("not-json");
    await delay(100);
    assert(
      invalidCreate.ws.readyState === WebSocket.OPEN,
      "invalid json does not close client connection"
    );
    const invalidJsonReceivers = clients.filter(
      client => client !== invalidCreate && client.invalidJsonMessages.length > 0
    );
    assert(
      invalidJsonReceivers.length === 0,
      "invalid json is not broadcast to room or lobby clients",
      { receivers: invalidJsonReceivers.map(client => client.label) }
    );

    writeLog("INFO", "room protocol test completed", { logPath });
  } finally {
    clients.forEach(client => client.close());
  }
}

run().catch(error => {
  writeLog("FAIL", "room protocol test failed", {
    error: error.message,
    stack: error.stack
  });
  process.exitCode = 1;
});
