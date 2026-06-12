const assert = require("assert");
const fs = require("fs");
const path = require("path");

const playerSource = fs.readFileSync(
  path.join(__dirname, "../src/components/Player.vue"),
  "utf8",
);

[
  "reminderStatusEffects",
  "hasPoisonReminder",
  "hasDrunkReminder",
  "poisoned-active",
  "drunk-active",
  "drunk-poisoned-active",
].forEach((needle) =>
  assert(playerSource.includes(needle), `Player missing ${needle}`),
);

assert(
  /'poisoned-active':[\s\S]*?this\.statusEffectsEnabled[\s\S]*?this\.hasPoisonReminder[\s\S]*?!this\.hasDrunkReminder/.test(
    playerSource,
  ),
  "Player should apply poisoned-active only for poison-only reminders",
);
assert(
  playerSource.includes("statusEffectsEnabled") &&
    /'poisoned-active':[\s\S]*?this\.statusEffectsEnabled[\s\S]*?this\.hasPoisonReminder/.test(
      playerSource,
    ) &&
    /'drunk-active':[\s\S]*?this\.statusEffectsEnabled[\s\S]*?this\.hasDrunkReminder/.test(
      playerSource,
    ) &&
    /'drunk-poisoned-active':[\s\S]*?this\.statusEffectsEnabled[\s\S]*?this\.hasDrunkReminder[\s\S]*?this\.hasPoisonReminder/.test(
      playerSource,
    ),
  "Player should gate drunk and poisoned classes behind the local status effect setting",
);
assert(
  /'drunk-active':[\s\S]*?this\.statusEffectsEnabled[\s\S]*?this\.hasDrunkReminder[\s\S]*?!this\.hasPoisonReminder/.test(
    playerSource,
  ),
  "Player should apply drunk-active only for drunk-only reminders",
);
assert(
  /'drunk-poisoned-active':[\s\S]*?this\.statusEffectsEnabled[\s\S]*?this\.hasDrunkReminder[\s\S]*?this\.hasPoisonReminder/.test(
    playerSource,
  ),
  "Player should apply a combined class when both statuses exist",
);

[
  "Poisoned",
  "poison",
  "中毒",
  "毒",
  "普卡毒",
  "亡骨魔毒",
  "Drunk",
  "drunk",
  "醉酒",
  "酒鬼",
  "是酒鬼",
].forEach((needle) =>
  assert(playerSource.includes(needle), `status matching missing ${needle}`),
);

[
  "poisoner",
  "pukka",
  "vigormortis",
  "nodashii",
  "lleech",
  "widow",
  "snakecharmer",
].forEach((role) =>
  assert(playerSource.includes(`"${role}"`), `poison role missing ${role}`),
);

[
  "drunk",
  "sailor",
  "innkeeper",
  "courtier",
  "philosopher",
  "puzzlemaster",
  "sweetheart",
].forEach((role) =>
  assert(playerSource.includes(`"${role}"`), `drunk role missing ${role}`),
);

assert(
  /\.player\.poisoned-active \.token[\s\S]*?animation: poisonTokenPulse/.test(
    playerSource,
  ),
  "Poison status should animate the role token",
);
assert(
  /\.player\.drunk-active \.token[\s\S]*?animation:\s*drunkTokenWobble[\s\S]*?drunkTokenBreath/.test(
    playerSource,
  ),
  "Drunk status should wobble and breathe on the role token",
);
assert(
  /\.player\.drunk-poisoned-active \.token[\s\S]*?animation:\s*drunkTokenWobble[\s\S]*?drunkTokenBreath[\s\S]*?poisonTokenPulse/.test(
    playerSource,
  ),
  "Combined status should layer drunk wobble, drunk breath, and poison pulse",
);
assert(
  playerSource.includes("sickWash") &&
    /@keyframes poisonTokenPulse[\s\S]*?rgba\(60,\s*230,\s*88/.test(
      playerSource,
    ),
  "Poison status should use the sick breathing effect",
);
assert(
  /\.player\.night-active \.token[\s\S]*?animation:\s*nightActionPulse/.test(
    playerSource,
  ) &&
    /\.player\.night-active\.(?:poisoned-active|drunk-active|drunk-poisoned-active) \.token[\s\S]*?animation:\s*nightActionPulse/.test(
      playerSource,
    ),
  "Night action yellow glow should have the highest priority over status effects",
);
assert(
  /#townsquare\.public \.circle \.player\.(?:poisoned-active|drunk-active|drunk-poisoned-active)[\s\S]*?animation:\s*none/.test(
    playerSource,
  ),
  "Public grimoire should hide drunk and poisoned token effects",
);

console.log("drunk poisoned effects source tests passed");
