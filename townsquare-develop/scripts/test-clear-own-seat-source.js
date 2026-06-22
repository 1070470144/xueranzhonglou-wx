const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const menuSource = read("src/components/Menu.vue");
const i18nSource = read("src/i18n/index.js");
const playersSource = read("src/store/modules/players.js");
const socketSource = read("src/store/socket.js");
const persistenceSource = read("src/store/persistence.js");
const storyLogSource = read("src/store/storyLogPlugin.js");

const grimoireStart = menuSource.indexOf('<template v-if="tab === \'grimoire\'">');
const settingsStart = menuSource.indexOf('<template v-if="tab === \'settings\'">');
assert(grimoireStart >= 0, "grimoire menu tab should exist");
assert(settingsStart > grimoireStart, "settings menu tab should follow grimoire tab");

const grimoireTemplate = menuSource.slice(grimoireStart, settingsStart);

assert(
  grimoireTemplate.includes("menu.clearSeats"),
  "clear seats entry should be in the grimoire menu tab",
);
assert(
  grimoireTemplate.includes("@click=\"clearSeats\""),
  "clear seats entry should call clearSeats",
);
assert(
  !/clearSeats[\s\S]{0,80}v-if=/.test(grimoireTemplate),
  "clear seats entry should not be hidden behind a role/session permission v-if",
);

assert(
  /clearSeats\(\)\s*\{[\s\S]*session\/claimSeat["'],\s*-1/.test(menuSource),
  "clearSeats should vacate the current user's claimed seat",
);
assert(
  /clearSeats\(\)\s*\{[\s\S]*players\/resetSeats/.test(menuSource),
  "clearSeats should reset every seat instead of only clearing the current claim",
);
assert(
  /clearSeats\(\)\s*\{[\s\S]*players\/setBluff/.test(menuSource),
  "clearSeats should clear demon bluff data",
);
assert(
  /clearSeats\(\)\s*\{[\s\S]*players\/setLunaticBluff/.test(menuSource),
  "clearSeats should clear lunatic bluff data",
);
assert(
  /clearSeats\(\)\s*\{[\s\S]*players\/setLunaticBluffPlayerIndex["'],\s*-1/.test(
    menuSource,
  ),
  "clearSeats should clear the lunatic bluff target",
);
assert(
  /clearSeats\(\)\s*\{[\s\S]*players\/setFabled["'],\s*\{\s*fabled:\s*\[\]\s*\}/.test(
    menuSource,
  ),
  "clearSeats should clear fabled setup data",
);
assert(
  /clearSeats\(\)\s*\{[\s\S]*roleDraw\/resetSession/.test(menuSource),
  "clearSeats should reset role draw state",
);
assert(
  /clearSeats\(\)\s*\{[\s\S]*session\/nomination/.test(menuSource),
  "clearSeats should clear active nominations and votes",
);
assert(
  /clearSeats\(\)\s*\{[\s\S]*session\/setMarkedPlayer["'],\s*-1/.test(
    menuSource,
  ),
  "clearSeats should clear marked player state",
);
assert(
  /clearSeats\(\)\s*\{[\s\S]*session\/clearVoteHistory/.test(menuSource),
  "clearSeats should clear vote history for a fresh pre-game state",
);
assert(
  /clearSeats\(\)\s*\{[\s\S]*session\/distributeRoles["'],\s*false/.test(
    menuSource,
  ),
  "clearSeats should mark roles as not distributed",
);
assert(
  !/clearSeats\(\)\s*\{[\s\S]*players\/clear/.test(menuSource),
  "clearSeats should keep the seat count instead of clearing the full player list",
);

assert(
  /resetSeats\(state,\s*count\s*=\s*state\.players\.length\)/.test(
    playersSource,
  ),
  "players module should expose resetSeats with the current seat count as default",
);
assert(
  /resetSeats\(state,[\s\S]*state\.players\s*=\s*Array\.from\(/.test(
    playersSource,
  ),
  "resetSeats should rebuild the player array with fresh empty seat objects",
);
assert(
  /resetSeats\(state,[\s\S]*role:\s*\{\}/.test(playersSource) &&
    /resetSeats\(state,[\s\S]*reminders:\s*\[\]/.test(playersSource) &&
    /resetSeats\(state,[\s\S]*isDead:\s*false/.test(playersSource) &&
    /resetSeats\(state,[\s\S]*isVoteless:\s*false/.test(playersSource) &&
    /resetSeats\(state,[\s\S]*id:\s*""/.test(playersSource),
  "resetSeats should remove role, reminders, seat claims, and status effects",
);
assert(
  /resetSeats\(state,[\s\S]*DEFAULT_PLAYER_LABEL/.test(playersSource),
  "resetSeats should restore default player labels",
);
assert(
  /case "resetSeats":[\s\S]*this\._resetSeats\(params\);/.test(socketSource),
  "socket should receive resetSeats and apply a full local seat reset",
);
assert(
  /resetSeats\(count\)[\s\S]*this\._send\("resetSeats",\s*\{\s*count\s*\}\);/.test(
    socketSource,
  ),
  "host resetSeats should broadcast a dedicated resetSeats command",
);
assert(
  /_resetSeats\(\{\s*count\s*\}\s*=\s*\{\}\)[\s\S]*session\/setClaimedSeatLocal["'],\s*-1/.test(
    socketSource,
  ),
  "receiving resetSeats should vacate local claimed seats",
);
assert(
  /_resetSeats\(\{\s*count\s*\}\s*=\s*\{\}\)[\s\S]*players\/resetSeats/.test(
    socketSource,
  ),
  "receiving resetSeats should reset local player role and reminder data",
);
assert(
  /_resetSeats\(\{\s*count\s*\}\s*=\s*\{\}\)[\s\S]*roleDraw\/resetSession/.test(
    socketSource,
  ),
  "receiving resetSeats should reset local role draw state",
);
assert(
  /case "players\/resetSeats":[\s\S]*session\.resetSeats\(payload\)/.test(
    socketSource,
  ),
  "players/resetSeats should use the dedicated reset broadcast",
);
assert(
  /case "players\/resetSeats":[\s\S]*localStorage\.setItem\(\s*"players"/.test(
    persistenceSource,
  ),
  "players/resetSeats should persist the reset player list",
);
assert(
  /case "players\/resetSeats":[\s\S]*handlePlayersSet/.test(storyLogSource),
  "players/resetSeats should be recorded like other player list resets",
);
assert(
  i18nSource.includes("clearSeats"),
  "clear seats label should be localized",
);

console.log("clear seats source tests passed");
