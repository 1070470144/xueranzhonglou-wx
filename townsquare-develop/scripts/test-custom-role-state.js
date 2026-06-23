const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const storeSourcePath = path.join(__dirname, "../src/store/index.js");
const gameStateSourcePath = path.join(
  __dirname,
  "../src/components/modals/GameStateModal.vue",
);
let storeSource = fs.readFileSync(storeSourcePath, "utf8");
const gameStateSource = fs.readFileSync(gameStateSourcePath, "utf8");

storeSource = storeSource.replace(/^import .+;\r?\n/gm, "");
storeSource = storeSource.replace("export default ", "");

const sandbox = {
  console,
  require: (request) => require(path.join(path.dirname(storeSourcePath), request)),
  Vue: { use() {} },
  Vuex: {
    Store: function Store(options) {
      sandbox.storeOptions = options;
      return options;
    },
  },
  persistence: {},
  socket: {},
  storyLogPlugin: {},
  players: {},
  session: {},
  storyLog: {},
  privateChat: {},
  room: {},
  voice: {},
  roleDraw: {},
  editionJSON: [{ id: "tb", roles: [], isOfficial: true }],
  rolesJSON: [
    {
      id: "undertaker",
      name: "Undertaker",
      team: "townsfolk",
      firstNight: 0,
      firstNightReminder: "",
      otherNight: 55,
      otherNightReminder:
        "If a player was executed today: Show that player’s character token.",
      reminders: ["Executed"],
      setup: false,
      ability: "Each night*, you learn which character died by execution today.",
    },
  ],
  fabledJSON: [],
  jinxesJSON: [],
};

vm.createContext(sandbox);
vm.runInContext(
  `${storeSource}
globalThis.__customRole = customRole;
globalThis.__buildCustomRoleState = buildCustomRoleState;
`,
  sandbox,
);

const customRole = sandbox.__customRole;
const buildCustomRoleState = sandbox.__buildCustomRoleState;
const stripCustomRoles = sandbox.storeOptions.getters.customRolesStripped;
const fullCustomRoles = sandbox.storeOptions.getters.customRolesFull;
const assertJsonEqual = (actual, expected) => {
  assert.strictEqual(JSON.stringify(actual), JSON.stringify(expected));
};

assert(customRole, "custom role template should be available in store source");
assert(buildCustomRoleState, "custom role state builder should be available");
assert(fullCustomRoles, "custom role full exporter should be available");

const fullCustomRole = {
  id: "customalpha",
  name: "自制角色",
  image: "https://example.com/role.png",
  ability: "能力描述",
  edition: "custom",
  firstNight: 18,
  firstNightReminder: "首夜行动提示",
  otherNight: 7,
  otherNightReminder: "其他夜行动提示",
  reminders: ["标记"],
  remindersGlobal: ["全局标记"],
  setup: true,
  team: "townsfolk",
  smallTokens: [{ id: "mark-a", name: "标记A", image: "https://example.com/a.png" }],
  tokenImages: [{ id: "mark-b", name: "标记B", image: "https://example.com/b.png" }],
  smallToken: "https://example.com/single-small.png",
  tokenImage: "https://example.com/single-token.png",
  tokenUrl: "https://example.com/token-url.png",
  tokens: [
    { id: "plus-token", name: "加号小token", image: "https://example.com/plus.png" },
  ],
};

const { roleMap } = buildCustomRoleState([fullCustomRole]);
const strippedRoles = stripCustomRoles({ roles: roleMap });
const { roleMap: restoredRoleMap } = buildCustomRoleState(strippedRoles);
const restoredRole = restoredRoleMap.get(fullCustomRole.id);

assert(restoredRole, "custom role should survive stripped room JSON roundtrip");
assert.strictEqual(restoredRole.firstNight, fullCustomRole.firstNight);
assert.strictEqual(restoredRole.firstNightReminder, fullCustomRole.firstNightReminder);
assert.strictEqual(restoredRole.otherNight, fullCustomRole.otherNight);
assert.strictEqual(restoredRole.otherNightReminder, fullCustomRole.otherNightReminder);
assert.deepStrictEqual(restoredRole.reminders, fullCustomRole.reminders);
assert.deepStrictEqual(restoredRole.remindersGlobal, fullCustomRole.remindersGlobal);
assert.strictEqual(restoredRole.setup, fullCustomRole.setup);
assert.deepStrictEqual(restoredRole.smallTokens, fullCustomRole.smallTokens);
assert.deepStrictEqual(restoredRole.tokenImages, fullCustomRole.tokenImages);
assert.strictEqual(restoredRole.smallToken, fullCustomRole.smallToken);
assert.strictEqual(restoredRole.tokenImage, fullCustomRole.tokenImage);
assert.strictEqual(restoredRole.tokenUrl, fullCustomRole.tokenUrl);
assert.deepStrictEqual(restoredRole.tokens, fullCustomRole.tokens);

const exportedFullRoles = fullCustomRoles({ roles: roleMap });
assert.strictEqual(exportedFullRoles.length, 1);
assert.strictEqual(exportedFullRoles[0].id, fullCustomRole.id);
assert.strictEqual(exportedFullRoles[0].firstNight, fullCustomRole.firstNight);
assert.strictEqual(
  exportedFullRoles[0].firstNightReminder,
  fullCustomRole.firstNightReminder,
);
assert.strictEqual(exportedFullRoles[0].otherNight, fullCustomRole.otherNight);
assert.strictEqual(
  exportedFullRoles[0].otherNightReminder,
  fullCustomRole.otherNightReminder,
);
assertJsonEqual(exportedFullRoles[0].smallTokens, fullCustomRole.smallTokens);
assertJsonEqual(exportedFullRoles[0].tokenImages, fullCustomRole.tokenImages);
assertJsonEqual(exportedFullRoles[0].tokens, fullCustomRole.tokens);
assert(
  !Object.keys(exportedFullRoles[0]).some((key) => /^\d+$/.test(key)),
  "full exported custom roles should use readable field names instead of compressed numeric keys",
);

const { roleMap: pastedOfficialImageRoleMap } = buildCustomRoleState([
  {
    id: "kb_undertaker",
    name: "送葬者",
    image:
      "https://clocktower-wiki.gstonegames.com/images/thumb/c/c7/Undertaker.png/400px-Undertaker.png",
    ability: "每个夜晚*，你会得知今天白天死于处决的玩家的角色。",
    team: "townsfolk",
  },
]);
const pastedUndertaker = pastedOfficialImageRoleMap.get("kbundertaker");
assert(pastedUndertaker, "pasted knowledge role should be kept");
assert.strictEqual(pastedUndertaker.firstNight, 0);
assert.strictEqual(pastedUndertaker.firstNightReminder, "");
assert.strictEqual(pastedUndertaker.otherNight, 55);
assert.strictEqual(
  pastedUndertaker.otherNightReminder,
  "If a player was executed today: Show that player’s character token.",
);
assertJsonEqual(pastedUndertaker.reminders, ["已处决"]);
assert.strictEqual(pastedUndertaker.setup, false);

assert(
  gameStateSource.includes("this.$store.getters.customRolesFull"),
  "game state JSON should export full custom roles so assigned JSON keeps night order and token fields",
);
assert(
  !/roles:\s*this\.edition\.isOfficial[\s\S]*?\?\s*\"\"[\s\S]*?:\s*this\.\$store\.getters\.customRolesStripped/.test(
    gameStateSource,
  ),
  "game state JSON should not use compressed custom roles",
);

console.log("custom role state tests passed");
