const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const sourcePath = path.join(__dirname, "../src/utils/roleLibrary.js");
const source = fs.readFileSync(sourcePath, "utf8");
const transformedSource = `${source
  .replace(/export const /g, "const ")
  .replace(/export function /g, "function ")}

module.exports = {
  ROLE_SOURCE_OFFICIAL,
  normalizeRoleForLibrary,
};
`;

const sandbox = {
  module: { exports: {} },
  exports: {},
  require: (request) => require(path.join(path.dirname(sourcePath), request)),
};
vm.runInNewContext(transformedSource, sandbox, { filename: sourcePath });

const { ROLE_SOURCE_OFFICIAL, normalizeRoleForLibrary } = sandbox.module.exports;

const normalized = normalizeRoleForLibrary(
  {
    id: "kb_undertaker",
    name: "送葬者",
    ability: "每个夜晚*，你会得知今天白天死于处决的玩家的角色。",
    team: "townsfolk",
    iconUrl:
      "https://clocktower-wiki.gstonegames.com/images/thumb/c/c7/Undertaker.png/400px-Undertaker.png",
  },
  ROLE_SOURCE_OFFICIAL,
);

assert.strictEqual(normalized.id, "kb_undertaker");
assert.strictEqual(normalized.officialId, "undertaker");
assert.strictEqual(normalized.firstNight, 0);
assert.strictEqual(normalized.firstNightReminder, "");
assert.strictEqual(normalized.otherNight, 55);
assert.strictEqual(
  normalized.otherNightReminder,
  "If a player was executed today: Show that player’s character token.",
);
assert.deepStrictEqual(normalized.reminders, ["已处决"]);
assert.strictEqual(normalized.setup, false);

const normalizedMonk = normalizeRoleForLibrary(
  {
    id: "kb_monk",
    name: "僧侣",
    ability: "每个夜晚*，选择除你以外的一名玩家：他免受恶魔伤害。",
    team: "townsfolk",
    iconUrl:
      "https://clocktower-wiki.gstonegames.com/images/thumb/e/e4/Monk.png/400px-Monk.png",
  },
  ROLE_SOURCE_OFFICIAL,
);

assert.deepStrictEqual(normalizedMonk.reminders, ["保护"]);

const customImageRole = normalizeRoleForLibrary(
  {
    id: "kb_washerwoman",
    name: "Washerwoman",
    team: "townsfolk",
    iconUrl: "https://example.test/washerwoman.png",
  },
  ROLE_SOURCE_OFFICIAL,
);

assert.strictEqual(customImageRole.officialId, "kb_washerwoman");
assert.strictEqual(customImageRole.firstNight, undefined);
assert.strictEqual(customImageRole.otherNight, undefined);
assert.strictEqual(customImageRole.reminders, undefined);

const bloodstarRole = normalizeRoleForLibrary(
  {
    0: "jinhulun",
    1: "学者",
    2: "https://www.bloodstar.xyz/p/smallbear/jinhulun/_jinhulun.png",
    3: "在你的首个夜晚，你会得知哪些邪恶角色在场。",
    5: 16,
    6: "首夜提示",
    7: 0,
    8: "",
    9: ["得知"],
    12: "townsfolk",
  },
  ROLE_SOURCE_OFFICIAL,
);

assert.strictEqual(bloodstarRole.id, "jinhulun");
assert.strictEqual(bloodstarRole.displayName, "学者");
assert.strictEqual(
  bloodstarRole.icon,
  "https://www.bloodstar.xyz/p/smallbear/jinhulun/_jinhulun.png",
);
assert.strictEqual(
  bloodstarRole.image,
  "https://www.bloodstar.xyz/p/smallbear/jinhulun/_jinhulun.png",
);
assert.strictEqual(bloodstarRole.displayAbility, "在你的首个夜晚，你会得知哪些邪恶角色在场。");
assert.strictEqual(bloodstarRole.firstNight, 16);
assert.strictEqual(bloodstarRole.firstNightReminder, "首夜提示");
assert.deepStrictEqual(bloodstarRole.reminders, ["得知"]);
assert.strictEqual(bloodstarRole.team, "townsfolk");

console.log("role library normalize tests passed");
