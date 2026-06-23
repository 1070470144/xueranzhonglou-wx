const assert = require("assert");
const fs = require("fs");
const path = require("path");

const drawerSource = fs.readFileSync(
  path.join(__dirname, "../src/components/RoomControlDrawer.vue"),
  "utf8",
);
const townSquareSource = fs.readFileSync(
  path.join(__dirname, "../src/components/TownSquare.vue"),
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
  "night-control-drawer",
  "town-square-drawer",
  "isNightNavigationOpen",
  "nightNavigationQueue",
  "currentNightNavigationEntry",
  "setNightNavigationMode",
  "nextNightAction",
  "previousNightAction",
  "players/nightActionQueue",
  "room.nightNavigation",
  "room.noNightActions",
].forEach((needle) =>
  assert(townSquareSource.includes(needle), `TownSquare missing ${needle}`),
);

assert(
  /nightNavigationQueue\(\)[\s\S]*?this\.\$store\.getters\["players\/nightActionQueue"\]/.test(
    townSquareSource,
  ),
  "TownSquare should consume the Vuex night action queue getter",
);

assert(
  /moveNightAction\(direction\)[\s\S]*?currentSeatIndex[\s\S]*?setNightNavigationSeat/.test(
    townSquareSource,
  ),
  "TownSquare should move through the current queue and store the highlighted seat",
);

assert(
  !drawerSource.includes("night-navigation"),
  "RoomControlDrawer should not render night navigation after it moves to the left drawer",
);

assert(
  /toggleNightNavigation\(\)[\s\S]*?isFabledOpen\s*=\s*false/.test(
    townSquareSource,
  ),
  "Opening the night drawer should close the fabled drawer",
);

assert(
  /toggleNightNavigation\(\)\s*\{[\s\S]*?if\s*\(this\.isNightNavigationOpen\)[\s\S]*?players\/clearNightNavigation[\s\S]*?\n    \},\n    removeFabled/.test(
    townSquareSource,
  ),
  "Closing the night drawer should clear the highlighted night-action seat",
);

assert(
  /toggleFabled\(\)[\s\S]*?isNightNavigationOpen\s*=\s*false/.test(
    townSquareSource,
  ),
  "Opening the fabled drawer should close the night drawer",
);

assert(
  /\.town-square-drawer-stack\s*\{[\s\S]*?top:\s*max\(0px,\s*env\(safe-area-inset-top\)\)/.test(
    townSquareSource,
  ),
  "Left drawer stack should sit at the top-left safe area",
);
assert(
  /\.town-square-drawer-tab\s*\{[\s\S]*?width:\s*36px[\s\S]*?min-height:\s*74px/.test(
    townSquareSource,
  ),
  "Left drawer buttons should be compact on desktop",
);
assert(
  /@media \(max-width: 768px\)[\s\S]*?\.town-square-drawer-tab\s*\{[\s\S]*?width:\s*34px[\s\S]*?min-height:\s*68px/.test(
    townSquareSource,
  ),
  "Left drawer buttons should be compact on mobile",
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
const nightActiveTokenRule = playerSource.match(
  /\.player\.night-active \.token\s*\{[\s\S]*?\}/,
);
assert(
  nightActiveTokenRule,
  "Night active token glow should have a dedicated token rule",
);
assert(
  !nightActiveTokenRule[0].includes("radial-gradient"),
  "Night active highlight should not use a visible radial-gradient oval",
);
assert(
  nightActiveTokenRule[0].includes("animation: nightActionPulse"),
  "Night active glow animation should live on the token glow",
);
assert(
  /\.player\.night-active\.(?:poisoned-active|drunk-active|drunk-poisoned-active) \.token\s*\{[\s\S]*?animation:\s*nightActionPulse/.test(
    playerSource,
  ),
  "Night active glow should override drunk and poisoned token effects",
);
assert(
  /\.player\.night-active\.poisoned-active \.token:before[\s\S]*?content:\s*none/.test(
    playerSource,
  ) &&
    /\.player\.night-active\.drunk-active \.token:after[\s\S]*?content:\s*none/.test(
      playerSource,
    ),
  "Night active glow should hide status pseudo-elements",
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

assert(
  /\.night-order[\s\S]*?em\s*\{[\s\S]*?width:\s*32px;[\s\S]*?height:\s*32px;/.test(
    townSquareSource,
  ),
  "Seat night-order number markers should be smaller than the old 40px badges",
);

console.log("night navigation UI source tests passed");
