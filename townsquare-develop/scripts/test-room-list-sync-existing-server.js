const assert = require("assert");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const logDir = path.join(__dirname, "../logs/room-tests");
fs.mkdirSync(logDir, { recursive: true });
const logPath = path.join(
  logDir,
  `room-list-sync-${new Date().toISOString().replace(/[:.]/g, "-")}.log`
);

function log(message, details) {
  const line = details
    ? `${new Date().toISOString()} ${message} ${JSON.stringify(details)}`
    : `${new Date().toISOString()} ${message}`;
  fs.appendFileSync(logPath, `${line}\n`);
  console.log(line);
}

function connect(playerId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:8081/lobby/${playerId}`, {
      headers: { Origin: "http://localhost:8080" }
    });
    ws.once("open", () => {
      log("open", { playerId });
      resolve(ws);
    });
    ws.once("error", reject);
    ws.on("message", data => {
      try {
        const [command, params] = JSON.parse(data);
        log("message", { playerId, command, params });
      } catch (error) {
        log("message:invalid", { playerId, data: String(data) });
      }
    });
  });
}

function send(ws, playerId, command, params = {}) {
  log("send", { playerId, command, params });
  ws.send(JSON.stringify([command, params]));
}

function waitFor(ws, expectedCommand, predicate = () => true, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off("message", onMessage);
      reject(new Error(`timed out waiting for ${expectedCommand}`));
    }, timeout);
    const onMessage = data => {
      const [command, params] = JSON.parse(data);
      if (command === expectedCommand && predicate(params)) {
        clearTimeout(timer);
        ws.off("message", onMessage);
        resolve(params);
      }
    };
    ws.on("message", onMessage);
  });
}

async function run() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const hostId = `sync-host-${suffix}`;
  const lobbyId = `sync-lobby-${suffix}`;
  const roomName = `Sync Probe ${suffix}`;

  const host = await connect(hostId);
  const lobby = await connect(lobbyId);

  send(lobby, lobbyId, "room:list");
  await waitFor(lobby, "room:list:update");

  send(host, hostId, "room:create", {
    name: roomName,
    visibility: "public",
    password: "",
    scriptJson: '[{"id":"_meta","name":"Sync Script"}]'
  });

  const created = await waitFor(host, "room:create:ok");
  assert.strictEqual(created.room.name, roomName);

  const list = await waitFor(
    lobby,
    "room:list:update",
    rooms => Array.isArray(rooms) && rooms.some(room => room.id === created.room.id)
  );

  assert(list.some(room => room.id === created.room.id));
  log("assert:room-visible-in-second-client", {
    roomId: created.room.id,
    roomCount: list.length
  });

  host.close(1000);
  lobby.close(1000);
  log("done", { logPath });
}

run().catch(error => {
  log("error", { message: error.message, stack: error.stack });
  process.exit(1);
});
