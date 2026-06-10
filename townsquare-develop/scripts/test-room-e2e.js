const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const WS_URL = process.env.ROOM_TEST_WS_URL || "ws://localhost:8081";
const ORIGIN = process.env.ROOM_TEST_ORIGIN || "http://localhost:8080";
const PLAYER_COUNT = Number(process.env.ROOM_TEST_PLAYERS || 12);
const MAX_PLAYERS = 20;
const REQUEST_TIMEOUT = Number(process.env.ROOM_TEST_TIMEOUT || 5000);

const logDir = path.join(__dirname, "../logs/room-tests");
fs.mkdirSync(logDir, { recursive: true });

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace("T", "_")
  .replace("Z", "");
const logPath = path.join(logDir, `room-e2e-${stamp}.log`);

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

async function createPublicRoom(host, name) {
  host.send("room:create", {
    name,
    visibility: "public",
    maxPlayers: MAX_PLAYERS,
    scriptName: "Room E2E Script"
  });
  const [, payload] = await host.waitFor("room:create:ok");
  assert(payload.room && payload.room.id, "public room created", payload.room);
  return payload.room;
}

async function joinRoom(client, roomId, playerName, password = "") {
  client.send("room:join", { roomId, playerName, password });
  const [, payload] = await client.waitFor(command =>
    ["room:join:ok", "room:join:error"].includes(command)
  );
  return payload;
}

async function waitForRoomList(client, roomId, shouldExist, matches = () => true) {
  const predicate = (command, params) =>
    command === "room:list:update" &&
    !!findRoom(params, roomId) === shouldExist &&
    (!shouldExist || matches(findRoom(params, roomId)));
  if (shouldExist) {
    const existing = [...client.messages].reverse().find(([command, params]) =>
      predicate(command, params)
    );
    if (existing) return findRoom(existing[1], roomId);
  }
  const [, list] = await client.waitForNext(
    (command, params) =>
      predicate(command, params),
    REQUEST_TIMEOUT * 2
  );
  return findRoom(list, roomId);
}

async function runPublicRoomScenario() {
  const suffix = Date.now().toString(36);
  const host = new TestClient("host", `host-${suffix}`);
  const players = [];
  await host.connect("lobby");
  const room = await createPublicRoom(host, `E2E Public ${suffix}`);

  for (let i = 0; i < PLAYER_COUNT; i += 1) {
    const player = new TestClient(`player-${i + 1}`, `player-${suffix}-${i + 1}`);
    players.push(player);
    await player.connect("lobby");
    const payload = await joinRoom(player, room.id, `Player ${i + 1}`);
    assert(payload.room && payload.room.id === room.id, "player joined room", {
      player: player.playerId,
      roomId: payload.room && payload.room.id
    });
  }

  for (let i = 0; i < players.length; i += 1) {
    const player = players[i];
    player.send("claim", [i, player.playerId]);
    const [, claimPayload] = await host.waitFor(
      (command, params) =>
        command === "claim" &&
        Array.isArray(params) &&
        params[0] === i &&
        params[1] === player.playerId
    );
    assert(
      claimPayload[1] === player.playerId,
      "host received claim with correct player id",
      { seat: i, playerId: player.playerId }
    );
  }

  const overflowPlayers = [];
  for (let i = players.length; i < MAX_PLAYERS; i += 1) {
    const player = new TestClient(`fill-${i + 1}`, `fill-${suffix}-${i + 1}`);
    overflowPlayers.push(player);
    await player.connect("lobby");
    const payload = await joinRoom(player, room.id, `Fill ${i + 1}`);
    assert(payload.room && payload.room.id === room.id, "room accepts up to max", {
      player: player.playerId
    });
  }

  const extra = new TestClient("overflow-player", `overflow-${suffix}`);
  await extra.connect("lobby");
  extra.send("room:join", { roomId: room.id, playerName: "Overflow" });
  const [overflowCommand, overflowPayload] = await extra.waitFor(command =>
    ["room:join:ok", "room:join:error"].includes(command)
  );
  assert(
    overflowCommand === "room:join:error" && overflowPayload.reason === "room_full",
    "21st player is rejected",
    overflowPayload
  );

  host.send("room:kick", { playerId: players[0].playerId });
  await players[0].waitFor("room:kicked");
  assert(true, "kicked player receives room:kicked", {
    playerId: players[0].playerId
  });

  const rejoin = new TestClient("kicked-rejoin", players[0].playerId);
  await rejoin.connect("lobby");
  rejoin.send("room:join", { roomId: room.id, playerName: "Rejoin" });
  const [rejoinCommand, rejoinPayload] = await rejoin.waitFor(command =>
    ["room:join:ok", "room:join:error"].includes(command)
  );
  assert(
    rejoinCommand === "room:join:error" && rejoinPayload.reason === "banned",
    "kicked player cannot immediately rejoin",
    rejoinPayload
  );

  [...players, ...overflowPlayers, extra, rejoin].forEach(client => client.close());
  host.close();
  await delay(250);
}

async function runPrivateRoomScenario() {
  const suffix = Date.now().toString(36);
  const host = new TestClient("private-host", `private-host-${suffix}`);
  await host.connect("lobby");
  host.send("room:create", {
    name: `E2E Private ${suffix}`,
    visibility: "private",
    password: "secret",
    scriptName: "Room E2E Script"
  });
  const [, createPayload] = await host.waitFor("room:create:ok");
  const room = createPayload.room;
  assert(room.isPrivate, "private room is listed as private", room);

  const wrong = new TestClient("private-wrong-password", `wrong-${suffix}`);
  await wrong.connect("lobby");
  wrong.send("room:join", {
    roomId: room.id,
    playerName: "Wrong Password",
    password: "bad"
  });
  const [wrongCommand, wrongPayload] = await wrong.waitFor(command =>
    ["room:join:ok", "room:join:error"].includes(command)
  );
  assert(
    wrongCommand === "room:join:error" && wrongPayload.reason === "invalid_password",
    "private room rejects wrong password",
    wrongPayload
  );

  const right = new TestClient("private-correct-password", `right-${suffix}`);
  await right.connect("lobby");
  const rightPayload = await joinRoom(right, room.id, "Correct Password", "secret");
  assert(
    rightPayload.room && rightPayload.room.id === room.id,
    "private room accepts correct password",
    rightPayload.room
  );

  wrong.close();
  right.close();
  host.close();
  await delay(250);
}

async function runRoomListAndHostCloseScenario() {
  const suffix = Date.now().toString(36);
  const watcher = new TestClient("list-watcher", `watcher-${suffix}`);
  const host = new TestClient("closing-host", `closing-host-${suffix}`);
  await watcher.connect("lobby");
  await host.connect("lobby");
  watcher.send("room:list", {});
  await watcher.waitFor("room:list:update");
  const room = await createPublicRoom(host, `E2E Closing ${suffix}`);
  const listedRoom = await waitForRoomList(watcher, room.id, true);
  assert(
    listedRoom && listedRoom.name === room.name,
    "new room appears in room list",
    listedRoom
  );

  host.close();
  await delay(100);
  watcher.send("room:list", {});
  const removedRoom = await waitForRoomList(watcher, room.id, false);
  assert(!removedRoom, "host close removes room from list", { roomId: room.id });
  watcher.close();
  await delay(250);
}

async function runRoomUpdateScenario() {
  const suffix = Date.now().toString(36);
  const watcher = new TestClient("update-watcher", `update-watcher-${suffix}`);
  const host = new TestClient("update-host", `update-host-${suffix}`);
  await watcher.connect("lobby");
  await host.connect("lobby");
  const room = await createPublicRoom(host, `E2E Update ${suffix}`);
  await waitForRoomList(watcher, room.id, true);

  host.send("room:update", {
    name: `E2E Updated ${suffix}`,
    visibility: "private",
    password: "changed",
    scriptName: "Updated Script Name"
  });
  const [, updatePayload] = await host.waitFor("room:update:ok");
  assert(
    updatePayload.room &&
      updatePayload.room.name === `E2E Updated ${suffix}` &&
      updatePayload.room.isPrivate &&
      updatePayload.room.scriptName === "Updated Script Name",
    "host updates name visibility and script name",
    updatePayload.room
  );

  const listedRoom = await waitForRoomList(
    watcher,
    room.id,
    true,
    listed => listed.isPrivate && listed.scriptName === "Updated Script Name"
  );
  assert(
    listedRoom && listedRoom.isPrivate && listedRoom.scriptName === "Updated Script Name",
    "updated room metadata appears in list",
    listedRoom
  );

  const wrong = new TestClient("update-wrong-password", `update-wrong-${suffix}`);
  await wrong.connect("lobby");
  wrong.send("room:join", {
    roomId: room.id,
    playerName: "Wrong After Update",
    password: "bad"
  });
  const [wrongCommand, wrongPayload] = await wrong.waitFor(command =>
    ["room:join:ok", "room:join:error"].includes(command)
  );
  assert(
    wrongCommand === "room:join:error" && wrongPayload.reason === "invalid_password",
    "updated private room rejects old or wrong password",
    wrongPayload
  );

  const right = new TestClient("update-correct-password", `update-right-${suffix}`);
  await right.connect("lobby");
  const rightPayload = await joinRoom(right, room.id, "Right After Update", "changed");
  assert(
    rightPayload.room && rightPayload.room.id === room.id,
    "updated private room accepts new password",
    rightPayload.room
  );

  wrong.close();
  right.close();
  host.close();
  watcher.close();
  await delay(250);
}

async function runConcurrentJoinScenario() {
  const suffix = Date.now().toString(36);
  const host = new TestClient("concurrent-host", `concurrent-host-${suffix}`);
  await host.connect("lobby");
  const room = await createPublicRoom(host, `E2E Concurrent ${suffix}`);
  const clients = Array.from({ length: 15 }, (_, index) =>
    new TestClient(`concurrent-${index + 1}`, `concurrent-${suffix}-${index + 1}`)
  );
  await Promise.all(clients.map(client => client.connect("lobby")));
  const results = await Promise.all(
    clients.map((client, index) => joinRoom(client, room.id, `Concurrent ${index + 1}`))
  );
  assert(
    results.every(payload => payload.room && payload.room.id === room.id),
    "15 concurrent players can join",
    results.map(payload => payload.room && payload.room.playerCount)
  );
  const [, playerList] = await host.waitFor(
    (command, params) => command === "room:players" && params.length === 15,
    REQUEST_TIMEOUT * 2
  );
  assert(playerList.length === 15, "host receives 15-player room list", {
    count: playerList.length
  });
  clients.forEach(client => client.close());
  host.close();
  await delay(250);
}

async function main() {
  writeLog("INFO", "room e2e started", {
    wsUrl: WS_URL,
    origin: ORIGIN,
    playerCount: PLAYER_COUNT,
    logPath
  });
  await runPublicRoomScenario();
  await runPrivateRoomScenario();
  await runRoomListAndHostCloseScenario();
  await runRoomUpdateScenario();
  await runConcurrentJoinScenario();
  writeLog("PASS", "room e2e completed", { logPath });
}

main().catch(error => {
  writeLog("FAIL", "room e2e failed", {
    error: error.message,
    stack: error.stack
  });
  console.error(`Room E2E log: ${logPath}`);
  process.exit(1);
});
