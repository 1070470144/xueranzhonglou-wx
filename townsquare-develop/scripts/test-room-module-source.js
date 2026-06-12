const assert = require("assert");
const fs = require("fs");
const path = require("path");

const modulePath = path.join(__dirname, "../src/store/modules/room.js");
const storePath = path.join(__dirname, "../src/store/index.js");
const persistencePath = path.join(__dirname, "../src/store/persistence.js");
const storyLogPath = path.join(__dirname, "../src/store/storyLogPlugin.js");

const roomSource = fs.readFileSync(modulePath, "utf8");
const storeSource = fs.readFileSync(storePath, "utf8");
const persistenceSource = fs.readFileSync(persistencePath, "utf8");
const storyLogSource = fs.readFileSync(storyLogPath, "utf8");

[
  "list",
  "current",
  "players",
  "isHost",
  "isLoading",
  "error",
  "createForm",
  "joinForm",
  "maxPlayers"
].forEach(name => assert(roomSource.includes(name), `room state should include ${name}`));

assert(roomSource.includes("note: \"\""), "create room form should initialize an empty note");

assert(
  roomSource.includes("maxPlayers: 10"),
  "create room form should default to a normal player count instead of the maximum 20"
);

[
  "setList",
  "setCurrent",
  "setPlayers",
  "setHost",
  "setLoading",
  "setError",
  "updateCreateForm",
  "resetCreateForm",
  "updateJoinForm",
  "resetJoinForm",
  "clearRoom",
  "requestList",
  "create",
  "join",
  "update",
  "kick"
].forEach(name => assert(roomSource.includes(name), `room mutations should include ${name}`));

const playersSource = fs.readFileSync(
  path.join(__dirname, "../src/store/modules/players.js"),
  "utf8"
);

assert(playersSource.includes("setCount(state"), "players module should expose a setCount mutation for room player limits");
assert(
  /setCount\(state,[\s\S]*?targetCount[\s\S]*?state\.players\.splice\(targetCount\)/.test(playersSource) &&
    /setCount\(state,[\s\S]*?for \(let index = state\.players\.length; index < targetCount; index\+\+\)[\s\S]*?state\.players\.push/.test(playersSource),
  "players setCount should overwrite the total scene seats by trimming or filling to the requested count"
);
assert(
  persistenceSource.includes('case "players/setCount"'),
  "players setCount should persist the replaced scene seat list"
);
assert(
  /case "players\/set":[\s\S]*?case "players\/setCount":[\s\S]*?handlePlayersSet\(\s*store,\s*beforePlayers,\s*clonePlayers\(state\.players\.players\)/.test(storyLogSource),
  "players setCount should be recorded as a whole player-list change"
);

assert(storeSource.includes('import room from "./modules/room";'));
assert(storeSource.includes("roomLobby"));
assert(storeSource.includes("roomControl"));
assert(/modules:\s*{[\s\S]*room[\s\S]*}/.test(storeSource));

console.log("room module source tests passed");
