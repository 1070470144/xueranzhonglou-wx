const assert = require("assert");
const fs = require("fs");
const path = require("path");

const drawerSource = fs.readFileSync(
  path.join(__dirname, "../src/components/RoomControlDrawer.vue"),
  "utf8",
);
const playerSource = fs.readFileSync(
  path.join(__dirname, "../src/components/Player.vue"),
  "utf8",
);
const i18nSource = fs.readFileSync(
  path.join(__dirname, "../src/i18n/index.js"),
  "utf8",
);
const mainSource = fs.readFileSync(
  path.join(__dirname, "../src/main.js"),
  "utf8",
);

[
  "night-navigation",
  "nightNavigationQueue",
  "currentNightNavigationEntry",
  "setNightNavigationMode",
  "nextNightAction",
  "previousNightAction",
  "players/nightActionQueue",
  "room.nightNavigation",
  "room.noNightActions",
].forEach((needle) =>
  assert(drawerSource.includes(needle), `RoomControlDrawer missing ${needle}`),
);

assert(
  /nightNavigationQueue\(\)[\s\S]*?this\.\$store\.getters\["players\/nightActionQueue"\]/.test(
    drawerSource,
  ),
  "RoomControlDrawer should consume the Vuex night action queue getter",
);

assert(
  /moveNightAction\(direction\)[\s\S]*?currentSeatIndex[\s\S]*?setNightNavigationSeat/.test(
    drawerSource,
  ),
  "RoomControlDrawer should move through the current queue and store the highlighted seat",
);

["night-active", "nightNavigation", "currentSeatIndex"].forEach((needle) =>
  assert(playerSource.includes(needle), `Player missing ${needle}`),
);

assert(
  /night-active['"]?:\s*this\.nightNavigation\.currentSeatIndex === this\.index/.test(
    playerSource,
  ),
  "Player should apply night-active when its seat is selected",
);

[
  "nightNavigation",
  "firstNight",
  "otherNights",
  "noNightActions",
  "previousNightAction",
  "nextNightAction",
].forEach((needle) =>
  assert(i18nSource.includes(needle), `i18n missing ${needle}`),
);

const i18nLines = i18nSource.split(/\r?\n/);
const chineseConfirmKickIndex = i18nLines.findIndex((line) =>
  line.includes('confirmKick: "确定要把该玩家踢出房间吗？"'),
);
const englishConfirmKickIndex = i18nLines.findIndex((line) =>
  line.includes('confirmKick: "Kick this player from the room?"'),
);
const roomChineseNightLabels = i18nLines
  .slice(chineseConfirmKickIndex, chineseConfirmKickIndex + 12)
  .join("\n");
const roomEnglishNightLabels = i18nLines
  .slice(englishConfirmKickIndex, englishConfirmKickIndex + 12)
  .join("\n");

assert(
  roomChineseNightLabels.includes('firstNight: "首夜"') &&
    roomChineseNightLabels.includes('otherNights: "其他夜晚"'),
  "Chinese room labels should include firstNight and otherNights",
);
assert(
  roomEnglishNightLabels.includes('firstNight: "First Night"') &&
    roomEnglishNightLabels.includes('otherNights: "Other Nights"'),
  "English room labels should include firstNight and otherNights",
);

assert(
  !playerSource.includes(".player.night-active:after"),
  "Night active highlight should not draw an oval pseudo-element",
);
assert(
  !/\.player\.night-active[\s\S]*?radial-gradient/.test(playerSource),
  "Night active highlight should not use a visible radial-gradient oval",
);
assert(
  /\.player\.night-active \.token[\s\S]*?animation: nightActionPulse/.test(
    playerSource,
  ),
  "Night active glow animation should live on the token glow",
);
assert(
  playerSource.includes("rgba(255, 226, 46") &&
    playerSource.includes("rgba(255, 245, 120"),
  "Night active token glow should use a brighter yellow palette",
);

assert(
  mainSource.includes('"StepBackward"'),
  "main icons should register StepBackward",
);
assert(
  mainSource.includes('"StepForward"'),
  "main icons should register StepForward",
);

console.log("night navigation UI source tests passed");
