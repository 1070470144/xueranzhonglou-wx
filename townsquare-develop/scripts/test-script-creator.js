"use strict";

const assert = require("assert");
const {
  DEFAULT_ROLE_COUNTS,
  buildScriptJson,
  canExportScript,
  filterRolesForRandomSelection,
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
        smallTokens: [
          "https://example.test/washerwoman-token-a.png",
          "https://example.test/washerwoman-token-b.png",
        ],
        firstNight: 33,
        firstNightReminder: "Pick two players.",
        otherNight: 0,
        otherNightReminder: "",
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
      smallTokens: [
        "https://example.test/washerwoman-token-a.png",
        "https://example.test/washerwoman-token-b.png",
      ],
      tokenImages: [
        "https://example.test/washerwoman-token-a.png",
        "https://example.test/washerwoman-token-b.png",
      ],
      smallToken: "https://example.test/washerwoman-token-a.png",
      tokenImage: "https://example.test/washerwoman-token-a.png",
      firstNight: 33,
      firstNightReminder: "Pick two players.",
      otherNight: 0,
      otherNightReminder: "",
    },
  ],
);

assert.deepStrictEqual(
  buildScriptJson({
    name: "Knowledge Script With Internal Id",
    author: "Author",
    selectedRoles: {
      townsfolk: ["kb_ravenkeeper"],
      outsider: [],
      minion: [],
      demon: [],
      traveler: [],
      fabled: [],
    },
    roleById: {
      kb_ravenkeeper: {
        id: "kb_ravenkeeper",
        officialId: "kb_ravenkeeper",
        displayName: "Ravenkeeper",
        displayAbility: "If you die at night, you are woken to choose a player: you learn their character.",
        team: "townsfolk",
        iconUrl: "https://example.test/ravenkeeper.png",
        content: "Full knowledge base content should stay exportable.",
        sections: [
          {
            title: "Ability",
            content: "If you die at night, you are woken to choose a player.",
          },
        ],
        firstNight: 0,
        firstNightReminder: "",
        otherNight: 42,
        otherNightReminder: "If dead, wake and choose a player.",
      },
    },
  }),
  [
    { id: "_meta", name: "Knowledge Script With Internal Id", author: "Author" },
    {
      id: "kb_ravenkeeper",
      name: "Ravenkeeper",
      image: "https://example.test/ravenkeeper.png",
      ability: "If you die at night, you are woken to choose a player: you learn their character.",
      team: "townsfolk",
      firstNight: 0,
      firstNightReminder: "",
      otherNight: 42,
      otherNightReminder: "If dead, wake and choose a player.",
      content: "Full knowledge base content should stay exportable.",
      sections: [
        {
          title: "Ability",
          content: "If you die at night, you are woken to choose a player.",
        },
      ],
    },
  ],
);

assert.deepStrictEqual(
  buildScriptJson({
    name: "Knowledge Script Matched Official Markers",
    author: "Author",
    selectedRoles: {
      townsfolk: ["kb_undertaker"],
      outsider: [],
      minion: [],
      demon: [],
      traveler: [],
      fabled: [],
    },
    roleById: {
      kb_undertaker: {
        id: "kb_undertaker",
        name: "送葬者",
        ability: "每个夜晚*，你会得知今天白天死于处决的玩家的角色。",
        team: "townsfolk",
        iconUrl:
          "https://clocktower-wiki.gstonegames.com/images/thumb/c/c7/Undertaker.png/400px-Undertaker.png",
      },
    },
  }),
  [
    {
      id: "_meta",
      name: "Knowledge Script Matched Official Markers",
      author: "Author",
    },
    {
      id: "kb_undertaker",
      name: "送葬者",
      image:
        "https://clocktower-wiki.gstonegames.com/images/thumb/c/c7/Undertaker.png/400px-Undertaker.png",
      ability: "每个夜晚*，你会得知今天白天死于处决的玩家的角色。",
      team: "townsfolk",
      firstNight: 0,
      firstNightReminder: "",
      otherNight: 55,
      otherNightReminder:
        "If a player was executed today: Show that player’s character token.",
      reminders: ["已处决"],
      setup: false,
    },
  ],
);

assert.deepStrictEqual(
  buildScriptJson({
    name: "Knowledge Script With Full Tokens",
    author: "Author",
    selectedRoles: {
      townsfolk: ["kb_full_tokens"],
      outsider: [],
      minion: [],
      demon: [],
      traveler: [],
      fabled: [],
    },
    roleById: {
      kb_full_tokens: {
        id: "kb_full_tokens",
        name: "Token Keeper",
        ability: "Keeps every exported token field.",
        team: "townsfolk",
        image: "https://example.test/token-keeper.png",
        firstNight: 18,
        firstNightReminder: "Wake on the first night.",
        otherNight: 7,
        otherNightReminder: "Wake on other nights.",
        reminders: ["Poisoned", "Protected"],
        remindersGlobal: ["Is the Demon"],
        setup: true,
        tokens: [
          "https://example.test/token-a.png",
          { url: "https://example.test/token-b.png" },
        ],
      },
    },
  }),
  [
    { id: "_meta", name: "Knowledge Script With Full Tokens", author: "Author" },
    {
      id: "kb_full_tokens",
      name: "Token Keeper",
      image: "https://example.test/token-keeper.png",
      ability: "Keeps every exported token field.",
      team: "townsfolk",
      smallTokens: [
        "https://example.test/token-a.png",
        "https://example.test/token-b.png",
      ],
      tokenImages: [
        "https://example.test/token-a.png",
        "https://example.test/token-b.png",
      ],
      smallToken: "https://example.test/token-a.png",
      tokenImage: "https://example.test/token-a.png",
      firstNight: 18,
      firstNightReminder: "Wake on the first night.",
      otherNight: 7,
      otherNightReminder: "Wake on other nights.",
      reminders: ["Poisoned", "Protected"],
      remindersGlobal: ["Is the Demon"],
      tokens: [
        "https://example.test/token-a.png",
        { url: "https://example.test/token-b.png" },
      ],
      setup: true,
    },
  ],
);

assert.deepStrictEqual(
  buildScriptJson({
    name: "Knowledge Script With Night Aliases",
    author: "Author",
    selectedRoles: {
      townsfolk: ["alias_night_role"],
      outsider: [],
      minion: [],
      demon: [],
      traveler: [],
      fabled: [],
    },
    roleById: {
      alias_night_role: {
        id: "alias_night_role",
        name: "Alias Night Role",
        ability: "Uses imported night-order aliases.",
        team: "townsfolk",
        image: "https://example.test/alias-night.png",
        first_night: "14",
        first_night_reminder: "Wake from snake-case first night.",
        other_night_order: "9",
        other_night_reminder: "Wake from snake-case other night.",
      },
    },
  }),
  [
    { id: "_meta", name: "Knowledge Script With Night Aliases", author: "Author" },
    {
      id: "alias_night_role",
      name: "Alias Night Role",
      image: "https://example.test/alias-night.png",
      ability: "Uses imported night-order aliases.",
      team: "townsfolk",
      firstNight: 14,
      firstNightReminder: "Wake from snake-case first night.",
      otherNight: 9,
      otherNightReminder: "Wake from snake-case other night.",
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

const mixedCreatorRoles = [
  { id: "official-town", team: "townsfolk", sourceType: "official" },
  { id: "public-custom-town", team: "townsfolk", sourceType: "public_custom" },
  { id: "mine-town", team: "townsfolk", sourceType: "mine" },
  { id: "official-demon", team: "demon", sourceType: "official" },
  { id: "legacy-custom-demon", team: "demon", sourceType: "custom" },
];
assert.deepStrictEqual(
  filterRolesForRandomSelection(mixedCreatorRoles, false).map(
    (role) => role.id,
  ),
  ["official-town", "official-demon"],
);
assert.deepStrictEqual(
  filterRolesForRandomSelection(mixedCreatorRoles, true).map((role) => role.id),
  [
    "official-town",
    "public-custom-town",
    "mine-town",
    "official-demon",
    "legacy-custom-demon",
  ],
);
assert.deepStrictEqual(
  randomRoleSelection(
    mixedCreatorRoles,
    {
      townsfolk: 2,
      outsider: 0,
      minion: 0,
      demon: 2,
      traveler: 0,
      fabled: 0,
    },
    () => 0,
    { includeCustomRoles: false },
  ),
  {
    townsfolk: ["official-town"],
    outsider: [],
    minion: [],
    demon: ["official-demon"],
    traveler: [],
    fabled: [],
  },
);

console.log("script creator tests passed");
