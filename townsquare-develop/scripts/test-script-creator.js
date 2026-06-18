"use strict";

const assert = require("assert");
const {
  DEFAULT_ROLE_COUNTS,
  buildScriptJson,
  canExportScript,
  normalizeRoleCounts,
  randomRoleSelection,
  validateRoleSelection,
} = require("../src/utils/scriptCreator");
const roles = require("../src/roles.json");

assert.deepStrictEqual(DEFAULT_ROLE_COUNTS, {
  townsfolk: 13,
  outsider: 4,
  minion: 4,
  demon: 4,
  traveler: 0,
  fabled: 0,
});

assert.strictEqual(canExportScript(null), false);
assert.strictEqual(canExportScript({ user: null }), false);
assert.strictEqual(canExportScript({ user: { id: "u1" } }), true);

assert.deepStrictEqual(normalizeRoleCounts({ townsfolk: 2.8, demon: -1 }), {
  townsfolk: 2,
  outsider: 0,
  minion: 0,
  demon: 0,
  traveler: 0,
  fabled: 0,
});

const sixRoleCounts = {
  townsfolk: 3,
  outsider: 1,
  minion: 1,
  demon: 1,
  traveler: 0,
  fabled: 0,
};

assert.deepStrictEqual(
  validateRoleSelection(
    {
      townsfolk: ["washerwoman", "chef", "empath"],
      outsider: ["recluse"],
      minion: ["poisoner"],
      demon: ["imp"],
      traveler: [],
      fabled: [],
    },
    sixRoleCounts,
  ),
  [],
);

assert.deepStrictEqual(
  validateRoleSelection(
    {
      townsfolk: ["washerwoman"],
      outsider: ["recluse"],
      minion: ["poisoner"],
      demon: ["imp"],
      traveler: [],
      fabled: [],
    },
    sixRoleCounts,
  ),
  [{ team: "townsfolk", expected: 3, actual: 1 }],
);

assert.deepStrictEqual(
  buildScriptJson({
    name: "Test Script",
    author: "Author",
    selectedRoles: {
      townsfolk: ["washerwoman", "chef", "empath"],
      outsider: ["recluse"],
      minion: ["poisoner"],
      demon: ["imp"],
      traveler: [],
      fabled: [],
    },
  }),
  [
    { id: "_meta", name: "Test Script", author: "Author" },
    "washerwoman",
    "chef",
    "empath",
    "recluse",
    "poisoner",
    "imp",
  ],
);

assert.deepStrictEqual(
  buildScriptJson({
    name: "Knowledge Script",
    author: "Author",
    selectedRoles: {
      townsfolk: ["kb_washerwoman"],
      outsider: [],
      minion: [],
      demon: [],
      traveler: [],
      fabled: [],
    },
    roleById: {
      kb_washerwoman: {
        id: "kb_washerwoman",
        name: "洗衣妇",
        ability: "你会得知两个玩家，其中一名是特定镇民。",
        team: "townsfolk",
        iconUrl: "https://example.test/washerwoman.png",
      },
    },
  }),
  [
    { id: "_meta", name: "Knowledge Script", author: "Author" },
    {
      id: "kb_washerwoman",
      name: "洗衣妇",
      image: "https://example.test/washerwoman.png",
      ability: "你会得知两个玩家，其中一名是特定镇民。",
      team: "townsfolk",
    },
  ],
);

const randomSix = randomRoleSelection(roles, sixRoleCounts, () => 0);
assert.deepStrictEqual(validateRoleSelection(randomSix, sixRoleCounts), []);
assert.strictEqual(randomSix.townsfolk.length, 3);
assert.strictEqual(randomSix.outsider.length, 1);
assert.strictEqual(randomSix.minion.length, 1);
assert.strictEqual(randomSix.demon.length, 1);
assert.strictEqual(randomSix.traveler.length, 0);
assert.strictEqual(randomSix.fabled.length, 0);

const customCounts = {
  townsfolk: 2,
  outsider: 2,
  minion: 2,
  demon: 1,
  traveler: 0,
  fabled: 0,
};
const randomCustom = randomRoleSelection(roles, customCounts, () => 0.5);
assert.deepStrictEqual(validateRoleSelection(randomCustom, customCounts), []);
assert.strictEqual(randomCustom.townsfolk.length, 2);
assert.strictEqual(randomCustom.outsider.length, 2);
assert.strictEqual(randomCustom.minion.length, 2);
assert.strictEqual(randomCustom.demon.length, 1);

console.log("script creator tests passed");
