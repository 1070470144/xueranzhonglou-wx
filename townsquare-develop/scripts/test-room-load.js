const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const WS_URL = process.env.ROOM_LOAD_WS_URL || "ws://localhost:8081";
const ORIGIN = process.env.ROOM_LOAD_ORIGIN || "http://localhost:8080";
const ROOM_COUNT = Number(process.env.ROOM_LOAD_ROOMS || 100);
const PLAYERS_PER_ROOM = Number(process.env.ROOM_LOAD_PLAYERS_PER_ROOM || 2);
const BATCH_SIZE = Number(process.env.ROOM_LOAD_BATCH_SIZE || 10);
const REQUEST_TIMEOUT = Number(process.env.ROOM_LOAD_TIMEOUT || 10000);
const KEEP_OPEN_MS = Number(process.env.ROOM_LOAD_KEEP_OPEN_MS || 250);

const logDir = path.join(__dirname, "../logs/room-tests");
fs.mkdirSync(logDir, { recursive: true });

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace("T", "_")
  .replace("Z", "");
const logPath = path.join(logDir, `room-load-${stamp}.log`);

const stats = {
  roomsRequested: ROOM_COUNT,
  playersPerRoom: PLAYERS_PER_ROOM,
  batchSize: BATCH_SIZE,
  createAttempts: 0,
  createSuccess: 0,
  createFailures: 0,
  joinAttempts: 0,
  joinSuccess: 0,
  joinFailures: 0,
  claimAttempts: 0,
  claimSuccess: 0,
  claimFailures: 0,
  listUpdates: 0,
  maxObservedListSize: 0,
  maxObservedTestRooms: 0,
  closeAttempts: 0,
  closeSuccess: 0,
  closeFailures: 0,
  errors: []
};

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

function recordError(stage, error, data = {}) {
  const entry = { stage, error: error.message || String(error), ...data };
  stats.errors.push(entry);
  writeLog("ERROR", stage, entry);
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

function memorySnapshot() {
  const usage = process.memoryUsage();
  return Object.fromEntries(
    Object.entries(usage).map(([key, value]) => [key, Math.round(value / 1024 / 1024)])
  );
}

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

class LoadClient {
  constructor(label, playerId, testPrefix) {
    this.label = label;
    this.playerId = playerId;
    this.testPrefix = testPrefix;
    this.messages = [];
    this.waiters = [];
    this.ws = null;
  }

  async connect(channel = "lobby") {
    const url = `${WS_URL}/${channel}/${this.playerId}`;
    writeLog("CONNECT", this.label, { url });
    this.ws = new WebSocket(url, { headers: { Origin: ORIGIN } });
    this.ws.on("message", data => this.handleMessage(data));
    this.ws.on("close", (code, reason) => {
      writeLog("CLOSE", this.label, { code, reason: reason && reason.toString() });
    });
    this.ws.on("error", error => {
      recordError("socket error", error, { label: this.label });
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`${this.label} connect timeout`)),
        REQUEST_TIMEOUT
      );
      this.ws.once("open", () => {
        clearTimeout(timer);
        resolve();
      });
      this.ws.once("error", reject);
    });
  }

  handleMessage(data) {
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (error) {
      recordError("invalid json", error, { label: this.label, raw: data.toString() });
      return;
    }
    const [command, params] = parsed;
    if (command === "room:list:update") {
      stats.listUpdates += 1;
      const rooms = Array.isArray(params) ? params : [];
      stats.maxObservedListSize = Math.max(stats.maxObservedListSize, rooms.length);
      stats.maxObservedTestRooms = Math.max(
        stats.maxObservedTestRooms,
        rooms.filter(room => room.name && room.name.startsWith(this.testPrefix)).length
      );
    }
    writeLog("RECV", this.label, { command, params });
    this.messages.push(parsed);
    this.waiters = this.waiters.filter(waiter => {
      if (!waiter.predicate(command, params)) return true;
      clearTimeout(waiter.timer);
      waiter.resolve(parsed);
      return false;
    });
  }

  send(command, params = {}) {
    writeLog("SEND", this.label, { command, params });
    this.ws.send(JSON.stringify([command, params]));
  }

  waitFor(predicate, timeout = REQUEST_TIMEOUT) {
    const existing = this.messages.find(([command, params]) => predicate(command, params));
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`${this.label} timed out waiting for message`)),
        timeout
      );
      this.waiters.push({ predicate, resolve, timer });
    });
  }

  close() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.close(1000);
  }
}

async function createRoom(host, name) {
  stats.createAttempts += 1;
  host.send("room:create", {
    name,
    visibility: "public",
    scriptName: "Room Load Script"
  });
  const [command, payload] = await host.waitFor(cmd =>
    ["room:create:ok", "room:create:error"].includes(cmd)
  );
  if (command === "room:create:error") {
    stats.createFailures += 1;
    throw new Error(`create failed: ${payload && payload.reason}`);
  }
  stats.createSuccess += 1;
  return payload.room;
}

async function joinRoom(client, roomId, playerName) {
  stats.joinAttempts += 1;
  client.send("room:join", { roomId, playerName });
  const [command, payload] = await client.waitFor(cmd =>
    ["room:join:ok", "room:join:error"].includes(cmd)
  );
  if (command === "room:join:error") {
    stats.joinFailures += 1;
    throw new Error(`join failed: ${payload && payload.reason}`);
  }
  stats.joinSuccess += 1;
  return payload.room;
}

async function claimSeat(host, player, seatIndex) {
  stats.claimAttempts += 1;
  player.send("claim", [seatIndex, player.playerId]);
  await host.waitFor(
    (command, params) =>
      command === "claim" &&
      Array.isArray(params) &&
      params[0] === seatIndex &&
      params[1] === player.playerId
  );
  stats.claimSuccess += 1;
}

async function setupRoom(index, suffix, testPrefix) {
  const label = `room-${index + 1}`;
  const host = new LoadClient(`${label}-host`, `load-host-${suffix}-${index}`, testPrefix);
  const players = [];
  try {
    await host.connect("lobby");
    const room = await createRoom(host, `${testPrefix} ${index + 1}`);
    for (let i = 0; i < PLAYERS_PER_ROOM; i += 1) {
      const player = new LoadClient(
        `${label}-player-${i + 1}`,
        `load-player-${suffix}-${index}-${i}`,
        testPrefix
      );
      players.push(player);
      await player.connect("lobby");
      await joinRoom(player, room.id, `Load Player ${index + 1}-${i + 1}`);
      await claimSeat(host, player, i);
    }
    return { room, host, players };
  } catch (error) {
    recordError("setup room", error, { roomIndex: index + 1 });
    host.close();
    players.forEach(player => player.close());
    throw error;
  }
}

async function closeRoom(group) {
  stats.closeAttempts += 1;
  const watcher = new LoadClient(
    `close-watcher-${group.room.id}`,
    `close-watcher-${group.room.id}-${Date.now()}`,
    group.room.name.split(" ").slice(0, -1).join(" ")
  );
  try {
    await watcher.connect("lobby");
    group.host.close();
    await delay(100);
    watcher.send("room:list", {});
    const [, list] = await watcher.waitFor(
      (command, params) =>
        command === "room:list:update" &&
        Array.isArray(params) &&
        !params.some(room => room.id === group.room.id)
    );
    const stillListed = Array.isArray(list) && list.some(room => room.id === group.room.id);
    if (stillListed) throw new Error(`room still listed after host close: ${group.room.id}`);
    group.players.forEach(player => player.close());
    stats.closeSuccess += 1;
  } catch (error) {
    stats.closeFailures += 1;
    recordError("close room", error, { roomId: group.room && group.room.id });
    throw error;
  } finally {
    watcher.close();
  }
}

async function main() {
  const start = Date.now();
  const suffix = Date.now().toString(36);
  const testPrefix = `LOAD ${suffix}`;
  writeLog("INFO", "room load test started", {
    wsUrl: WS_URL,
    origin: ORIGIN,
    roomCount: ROOM_COUNT,
    playersPerRoom: PLAYERS_PER_ROOM,
    batchSize: BATCH_SIZE,
    timeout: REQUEST_TIMEOUT,
    logPath,
    memory: memorySnapshot()
  });

  const roomIndexes = Array.from({ length: ROOM_COUNT }, (_, index) => index);
  const groups = [];
  const createStart = Date.now();
  for (const batch of chunk(roomIndexes, BATCH_SIZE)) {
    const created = await Promise.all(
      batch.map(index => setupRoom(index, suffix, testPrefix))
    );
    groups.push(...created);
    writeLog("INFO", "load batch created", {
      createdRooms: groups.length,
      memory: memorySnapshot()
    });
  }
  const createDuration = Date.now() - createStart;

  assert(groups.length === ROOM_COUNT, "created requested room count", {
    expected: ROOM_COUNT,
    actual: groups.length
  });
  assert(stats.createFailures === 0, "no room creation failures", stats.createFailures);
  assert(stats.joinFailures === 0, "no player join failures", stats.joinFailures);
  assert(stats.claimFailures === 0, "no claim failures", stats.claimFailures);
  assert(
    stats.joinSuccess === ROOM_COUNT * PLAYERS_PER_ROOM,
    "joined requested player count",
    { expected: ROOM_COUNT * PLAYERS_PER_ROOM, actual: stats.joinSuccess }
  );
  assert(
    stats.claimSuccess === ROOM_COUNT * PLAYERS_PER_ROOM,
    "claimed requested player seats",
    { expected: ROOM_COUNT * PLAYERS_PER_ROOM, actual: stats.claimSuccess }
  );
  assert(
    stats.maxObservedTestRooms >= Math.min(ROOM_COUNT, stats.maxObservedTestRooms || ROOM_COUNT),
    "observed room list updates during load",
    { listUpdates: stats.listUpdates, maxObservedTestRooms: stats.maxObservedTestRooms }
  );

  await delay(KEEP_OPEN_MS);

  const closeStart = Date.now();
  for (const batch of chunk(groups, BATCH_SIZE)) {
    await Promise.all(batch.map(group => closeRoom(group)));
    writeLog("INFO", "load batch closed", {
      closedRooms: stats.closeSuccess,
      memory: memorySnapshot()
    });
  }
  const closeDuration = Date.now() - closeStart;

  assert(stats.closeFailures === 0, "no room close failures", stats.closeFailures);
  assert(stats.closeSuccess === ROOM_COUNT, "closed requested room count", {
    expected: ROOM_COUNT,
    actual: stats.closeSuccess
  });

  const totalDuration = Date.now() - start;
  writeLog("PASS", "room load test completed", {
    stats,
    timings: {
      createAndJoinMs: createDuration,
      closeMs: closeDuration,
      totalMs: totalDuration,
      avgRoomSetupMs: Math.round(createDuration / ROOM_COUNT),
      avgRoomCloseMs: Math.round(closeDuration / ROOM_COUNT)
    },
    memory: memorySnapshot(),
    logPath
  });
}

main().catch(error => {
  writeLog("FAIL", "room load test failed", {
    error: error.message,
    stack: error.stack,
    stats,
    memory: memorySnapshot(),
    logPath
  });
  console.error(`Room load log: ${logPath}`);
  process.exit(1);
});
