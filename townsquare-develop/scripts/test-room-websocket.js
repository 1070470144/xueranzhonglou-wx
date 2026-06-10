const assert = require("assert");
const WebSocket = require("ws");

process.env.NODE_ENV = "development";
require("../server/index");

function connect(path) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:8081/${path}`, {
      headers: { Origin: "http://localhost" }
    });
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
  });
}

function send(ws, command, params = {}) {
  ws.send(JSON.stringify([command, params]));
}

function waitFor(ws, expectedCommand) {
  return new Promise(resolve => {
    const onMessage = data => {
      const [command, params] = JSON.parse(data);
      if (command === expectedCommand) {
        ws.off("message", onMessage);
        resolve(params);
      }
    };
    ws.on("message", onMessage);
  });
}

async function run() {
  const host = await connect("lobby/host-probe");
  const lobby = await connect("lobby/player-probe");

  send(lobby, "room:list");
  assert.deepStrictEqual(await waitFor(lobby, "room:list:update"), []);

  send(host, "room:create", {
    name: "Private Test",
    visibility: "private",
    password: "secret",
    scriptJson: '[{"id":"_meta","name":"Script Name"}]'
  });
  const created = await waitFor(host, "room:create:ok");
  assert.strictEqual(created.room.name, "Private Test");
  assert.strictEqual(created.room.isPrivate, true);
  assert.strictEqual(created.room.scriptName, "Script Name");

  const list = await waitFor(lobby, "room:list:update");
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].id, created.room.id);
  assert.strictEqual(list[0].passwordHash, undefined);

  send(lobby, "room:join", {
    roomId: created.room.id,
    playerName: "Alice",
    password: "bad"
  });
  const wrongPassword = await waitFor(lobby, "room:join:error");
  assert.strictEqual(wrongPassword.reason, "invalid_password");

  send(lobby, "room:join", {
    roomId: created.room.id,
    playerName: "Alice",
    password: "secret"
  });
  const joined = await waitFor(lobby, "room:join:ok");
  assert.strictEqual(joined.room.id, created.room.id);

  const players = await waitFor(host, "room:players");
  assert.strictEqual(players.length, 1);
  assert.strictEqual(players[0].name, "Alice");

  send(host, "player", { index: 0, property: "name", value: "Alice" });
  const relayed = await waitFor(lobby, "player");
  assert.deepStrictEqual(relayed, { index: 0, property: "name", value: "Alice" });

  send(host, "room:kick", { playerId: "player-probe" });
  const kicked = await waitFor(lobby, "room:kicked");
  assert.strictEqual(kicked.roomId, created.room.id);

  const banned = await connect("lobby/player-probe");
  send(banned, "room:join", {
    roomId: created.room.id,
    playerName: "Alice Again",
    password: "secret"
  });
  const bannedError = await waitFor(banned, "room:join:error");
  assert.strictEqual(bannedError.reason, "banned");

  host.close(1000);
  lobby.close(1000);
  banned.close(1000);
  console.log("room websocket tests passed");
  process.exit(0);
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
