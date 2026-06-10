const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const WS_URL = process.env.ROOM_TEST_WS_URL || "ws://localhost:8081";
const ORIGIN = process.env.ROOM_TEST_ORIGIN || "http://localhost:8080";
const REQUEST_TIMEOUT = Number(process.env.ROOM_TEST_TIMEOUT || 5000);
const MAX_PLAYERS = 20;

const logDir = path.join(__dirname, "../logs/room-tests");
fs.mkdirSync(logDir, { recursive: true });

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace("T", "_")
  .replace("Z", "");
const logPath = path.join(logDir, `room-priority-${stamp}.log`);

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

async function createRoom(host, params = {}) {
  host.send("room:create", {
    name: params.name,
    visibility: params.visibility || "public",
    password: params.password || "",
    scriptName: params.scriptName || "Priority Script",
    scriptJson: params.scriptJson || ""
  });
  const [, payload] = await host.waitFor("room:create:ok");
  assert(payload.room && payload.room.id, "room created", payload.room);
  return payload.room;
}

async function joinRoom(client, roomId, playerName, password = "") {
  client.send("room:join", { roomId, playerName, password });
  return client.waitForNext(command =>
    ["room:join:ok", "room:join:error"].includes(command)
  );
}

async function waitForRoomList(client, roomId, shouldExist, matches = () => true) {
  const predicate = (command, params) =>
    command === "room:list:update" &&
    !!findRoom(params, roomId) === shouldExist &&
    (!shouldExist || matches(findRoom(params, roomId)));
  const existing = [...client.messages].reverse().find(([command, params]) =>
    predicate(command, params)
  );
  if (existing) return findRoom(existing[1], roomId);
  const [, list] = await client.waitForNext(predicate, REQUEST_TIMEOUT * 2);
  return findRoom(list, roomId);
}

async function runHostCloseWithPlayersScenario() {
  const suffix = Date.now().toString(36);
  const watcher = new TestClient("close-watcher", `close-watcher-${suffix}`);
  const host = new TestClient("close-host", `close-host-${suffix}`);
  const players = [1, 2, 3].map(index =>
    new TestClient(`close-player-${index}`, `close-player-${suffix}-${index}`)
  );

  await watcher.connect();
  await host.connect();
  watcher.send("room:list", {});
  await watcher.waitFor("room:list:update");
  const room = await createRoom(host, { name: `Priority Close ${suffix}` });
  await waitForRoomList(watcher, room.id, true);

  for (const [index, player] of players.entries()) {
    await player.connect();
    const [command, payload] = await joinRoom(player, room.id, `Close Player ${index + 1}`);
    assert(command === "room:join:ok", "player joins before host leaves", payload.room);
  }

  host.close();
  for (const player of players) {
    const [, payload] = await player.waitFor("room:closed");
    assert(payload.roomId === room.id, "player receives room:closed when host leaves", payload);
  }
  await waitForRoomList(watcher, room.id, false);
  assert(true, "host close removes occupied room from list", { roomId: room.id });

  const rejoin = new TestClient("close-rejoin", `close-rejoin-${suffix}`);
  await rejoin.connect();
  const [rejoinCommand, rejoinPayload] = await joinRoom(rejoin, room.id, "After Close");
  assert(
    rejoinCommand === "room:join:error" && rejoinPayload.reason === "room_not_found",
    "players cannot rejoin closed room",
    rejoinPayload
  );

  [...players, watcher, rejoin].forEach(client => client.close());
  await delay(200);
}

async function runMaxPlayerBoundaryScenario() {
  const suffix = Date.now().toString(36);
  const host = new TestClient("max-host", `max-host-${suffix}`);
  const players = Array.from({ length: MAX_PLAYERS }, (_, index) =>
    new TestClient(`max-player-${index + 1}`, `max-player-${suffix}-${index + 1}`)
  );

  await host.connect();
  const room = await createRoom(host, { name: `Priority Max ${suffix}`, maxPlayers: MAX_PLAYERS });
  for (const [index, player] of players.entries()) {
    await player.connect();
    const [command, payload] = await joinRoom(player, room.id, `Max Player ${index + 1}`);
    assert(command === "room:join:ok", `${index + 1} player can join until max`, {
      playerCount: payload.room.playerCount
    });
  }

  const overflow = new TestClient("max-overflow", `max-overflow-${suffix}`);
  await overflow.connect();
  let [command, payload] = await joinRoom(overflow, room.id, "Overflow");
  assert(
    command === "room:join:error" && payload.reason === "room_full",
    "21st player is rejected when room is full",
    payload
  );

  host.send("room:kick", { playerId: players[0].playerId });
  const [, kickedPayload] = await players[0].waitFor("room:kicked");
  assert(kickedPayload.roomId === room.id, "kicked player receives room:kicked", kickedPayload);

  const replacement = new TestClient("max-replacement", `max-replacement-${suffix}`);
  await replacement.connect();
  [command, payload] = await joinRoom(replacement, room.id, "Replacement");
  assert(
    command === "room:join:ok" && payload.room.playerCount === MAX_PLAYERS,
    "new player can join after a seat is freed",
    payload.room
  );

  const kickedRejoin = new TestClient("max-kicked-rejoin", players[0].playerId);
  await kickedRejoin.connect();
  [command, payload] = await joinRoom(kickedRejoin, room.id, "Kicked Rejoin");
  assert(
    command === "room:join:error" && payload.reason === "banned",
    "kicked player still cannot immediately rejoin after seat opens",
    payload
  );

  [...players, overflow, replacement, kickedRejoin].forEach(client => client.close());
  host.close();
  await delay(200);
}

async function runRoomUpdatePlayerSyncScenario() {
  const suffix = Date.now().toString(36);
  const watcher = new TestClient("sync-watcher", `sync-watcher-${suffix}`);
  const host = new TestClient("sync-host", `sync-host-${suffix}`);
  const player = new TestClient("sync-player", `sync-player-${suffix}`);

  await watcher.connect();
  await host.connect();
  await player.connect();
  watcher.send("room:list", {});
  await watcher.waitFor("room:list:update");
  const room = await createRoom(host, { name: `Priority Sync ${suffix}` });
  const [joinCommand] = await joinRoom(player, room.id, "Sync Player");
  assert(joinCommand === "room:join:ok", "player joins before room update");

  const scriptJson = JSON.stringify([{ id: "_meta", name: `Priority Script ${suffix}` }]);
  host.send("room:update", {
    name: `Priority Updated ${suffix}`,
    visibility: "private",
    password: "sync-pass",
    scriptJson
  });
  const [, hostPayload] = await host.waitFor("room:update:ok");
  assert(
    hostPayload.room.name === `Priority Updated ${suffix}` &&
      hostPayload.room.isPrivate &&
      hostPayload.room.scriptName === `Priority Script ${suffix}` &&
      hostPayload.scriptJson === scriptJson,
    "host receives updated room metadata and script json",
    hostPayload
  );

  const [, playerPayload] = await player.waitFor("room:update");
  assert(
    playerPayload.room.name === `Priority Updated ${suffix}` &&
      playerPayload.room.isPrivate &&
      playerPayload.room.scriptName === `Priority Script ${suffix}` &&
      playerPayload.scriptJson === scriptJson,
    "joined player receives room update without rejoining",
    playerPayload
  );

  const listedRoom = await waitForRoomList(
    watcher,
    room.id,
    true,
    listed =>
      listed.name === `Priority Updated ${suffix}` &&
      listed.isPrivate &&
      listed.scriptName === `Priority Script ${suffix}`
  );
  assert(listedRoom, "watcher sees updated room metadata in list", listedRoom);

  [watcher, player].forEach(client => client.close());
  host.close();
  await delay(200);
}

async function main() {
  writeLog("INFO", "room priority tests started", {
    wsUrl: WS_URL,
    origin: ORIGIN,
    logPath
  });
  await runHostCloseWithPlayersScenario();
  await runMaxPlayerBoundaryScenario();
  await runRoomUpdatePlayerSyncScenario();
  writeLog("PASS", "room priority tests completed", { logPath });
}

main().catch(error => {
  writeLog("FAIL", "room priority tests failed", {
    error: error.message,
    stack: error.stack
  });
  console.error(`Room priority test log: ${logPath}`);
  process.exit(1);
});
