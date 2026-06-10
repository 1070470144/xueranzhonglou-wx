const assert = require("assert");
const rooms = require("../server/rooms");

function makeHost(id = "host") {
  return { playerId: id };
}

function makePlayer(id) {
  return { playerId: id };
}

function resetRoom(room) {
  if (room && room.id) rooms.closeRoom(room.id);
}

let room;

room = rooms.createRoom({
  host: makeHost(),
  name: "My Room",
  hostName: "Storyteller Alice",
  note: "Seat 2 by the window",
  visibility: "private",
  password: "secret",
  maxPlayers: 12,
  scriptJson: '[{"id":"_meta","name":"Trouble Brewing"}]'
});
assert.strictEqual(room.name, "My Room");
assert.strictEqual(room.maxPlayers, 12);
assert.strictEqual(room.note, "Seat 2 by the window");
assert.strictEqual(room.scriptName, "Trouble Brewing");
assert.strictEqual(room.hostName, "Storyteller Alice");
assert.strictEqual(room.status, "waiting");
assert.strictEqual(rooms.listRooms()[0].isPrivate, true);
assert.strictEqual(rooms.listRooms()[0].passwordHash, undefined);
assert.strictEqual(rooms.listRooms()[0].hostName, "Storyteller Alice");
assert.strictEqual(rooms.listRooms()[0].note, "Seat 2 by the window");
assert.strictEqual(rooms.listRooms()[0].status, "waiting");
assert.strictEqual(typeof room.inviteToken, "string");
assert(room.inviteToken.length >= 24, "private rooms should have a strong invite token");

assert.throws(
  () => rooms.verifyJoin({ roomId: room.id, playerId: "p1", password: "bad" }),
  /invalid_password/
);
assert.doesNotThrow(() =>
  rooms.verifyJoin({ roomId: room.id, playerId: "p1", password: "secret" })
);
assert.doesNotThrow(() =>
  rooms.verifyJoin({ roomId: room.id, playerId: "p1-token", inviteToken: room.inviteToken })
);
assert.throws(
  () => rooms.verifyJoin({ roomId: room.id, playerId: "p1-bad-token", inviteToken: "bad-token" }),
  /invalid_invite/
);
rooms.addPlayer(room.id, makePlayer("p1"), "Alice");
assert.strictEqual(rooms.listRooms()[0].playerCount, 1);

const kicked = rooms.kickPlayer(room.id, "p1");
assert.strictEqual(kicked.name, "Alice");
assert.throws(
  () => rooms.verifyJoin({ roomId: room.id, playerId: "p1", password: "secret" }),
  /banned/
);
resetRoom(room);

room = rooms.createRoom({
  host: makeHost("default-count"),
  name: "Default Count Room",
  visibility: "public"
});
assert.strictEqual(room.maxPlayers, 10);
assert.strictEqual(room.note, "");
resetRoom(room);

room = rooms.createRoom({
  host: makeHost("clamped-count"),
  name: "Clamped Count Room",
  visibility: "public",
  maxPlayers: 99
});
assert.strictEqual(room.maxPlayers, 20);
resetRoom(room);

room = rooms.createRoom({
  host: makeHost("minimum-count"),
  name: "Minimum Count Room",
  visibility: "public",
  maxPlayers: 0
});
assert.strictEqual(room.maxPlayers, 1);
resetRoom(room);

room = rooms.createRoom({
  host: makeHost("note-update"),
  name: "Note Update Room",
  visibility: "public"
});
rooms.updateRoom(room.id, { note: "Updated room note" });
assert.strictEqual(room.note, "Updated room note");
rooms.updateRoom(room.id, { note: "x".repeat(120) });
assert.strictEqual(room.note.length, 80);
resetRoom(room);

room = rooms.createRoom({
  host: makeHost("host2"),
  name: "Public Room",
  visibility: "public"
});
rooms.updateRoom(room.id, {
  name: "Renamed",
  visibility: "private",
  password: "newpass",
  scriptJson: '[{"id":"washerwoman"}]',
  status: "playing"
});
assert.strictEqual(room.name, "Renamed");
assert.strictEqual(room.visibility, "private");
assert.strictEqual(room.scriptName, "Custom Script");
assert.strictEqual(room.status, "playing");
assert.throws(
  () => rooms.verifyJoin({ roomId: room.id, playerId: "p2", password: "" }),
  /password_required/
);
resetRoom(room);

room = rooms.createRoom({
  host: makeHost("host3"),
  name: "Full Room",
  visibility: "public",
  scriptName: "Selected Script"
});
assert.strictEqual(room.scriptName, "Selected Script");
assert.strictEqual(room.hostName, "Storyteller");
for (let index = 0; index < room.maxPlayers; index += 1) {
  rooms.addPlayer(room.id, makePlayer(`full-${index}`), `Player ${index}`);
}
assert.throws(
  () => rooms.verifyJoin({ roomId: room.id, playerId: "overflow", password: "" }),
  /room_full/
);
resetRoom(room);

room = rooms.createRoom({
  host: makeHost("host4"),
  name: "No Script Room",
  visibility: "public"
});
assert.strictEqual(room.scriptName, "未选择剧本");
assert.strictEqual(rooms.listRooms()[0].scriptName, "未选择剧本");
rooms.updateRoom(room.id, { status: "invalid" });
assert.strictEqual(room.status, "waiting");
resetRoom(room);

const duplicatePrefixRooms = [];
for (let index = 0; index < 12; index += 1) {
  duplicatePrefixRooms.push(
    rooms.createRoom({
      host: makeHost(`dup-${index}`),
      name: `LOAD duplicate prefix ${index}`,
      visibility: "public"
    })
  );
}
assert.strictEqual(
  new Set(duplicatePrefixRooms.map(({ id }) => id)).size,
  duplicatePrefixRooms.length
);
duplicatePrefixRooms.forEach(resetRoom);

room = rooms.createRoom({
  host: { playerId: "stale-host", readyState: 3 },
  name: "Stale Host Room",
  visibility: "public"
});
const staleRoomId = room.id;
const closedStaleRooms = rooms.closeRoomsWhere(
  candidate => candidate.host && candidate.host.readyState !== 1
);
assert.strictEqual(closedStaleRooms.length, 1);
assert.strictEqual(closedStaleRooms[0].id, staleRoomId);
assert.strictEqual(rooms.getRoom(staleRoomId), undefined);

console.log("room registry tests passed");
