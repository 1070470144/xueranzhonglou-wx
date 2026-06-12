const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const loadModule = (relativePath, replacements) => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", relativePath),
    "utf8",
  );
  const sandbox = { module: { exports: {} }, exports: {}, require };
  const runnable = replacements.reduce(
    (nextSource, [pattern, replacement]) =>
      nextSource.replace(pattern, replacement),
    source,
  );
  vm.runInNewContext(runnable, sandbox);
  return sandbox.module.exports;
};

const helpers = loadModule("src/services/roleDraw.js", [
  [
    /export \{ buildDrawQueue, normalizeDrawOptions, drawRoleFromPool \};/,
    "module.exports = { buildDrawQueue, normalizeDrawOptions, drawRoleFromPool };",
  ],
]);
const roleDrawModule = loadModule("src/store/modules/roleDraw.js", [
  [
    /import \{[\s\S]*?\} from "@\/services\/roleDraw";/,
    `const {
  buildDrawQueue,
  drawRoleFromPool,
  normalizeDrawOptions,
} = require("../src/services/roleDraw");`,
  ],
  [
    /export default [\s\S]*$/,
    "module.exports = { state, getters, actions, mutations };",
  ],
]);

const assertJsonEqual = (actual, expected) => {
  assert.strictEqual(JSON.stringify(actual), JSON.stringify(expected));
};

const players = [
  { name: "A", role: {}, id: "a" },
  { name: "B", role: {}, id: "b" },
  { name: "T", role: { team: "traveler" }, id: "t" },
  { name: "C", role: {}, id: "c" },
];

assertJsonEqual(helpers.buildDrawQueue(players, 2, "forward"), [1, 3, 0]);
assertJsonEqual(helpers.buildDrawQueue(players, 2, "reverse"), [1, 0, 3]);
assertJsonEqual(helpers.buildDrawQueue(players, 3, "forward"), [3, 0, 1]);
assertJsonEqual(helpers.buildDrawQueue(players, 3, "reverse"), [1, 0, 3]);
assertJsonEqual(helpers.buildDrawQueue([], 1, "forward"), []);
assertJsonEqual(
  helpers.normalizeDrawOptions({ startSeat: 99, autoDrawSeconds: 2 }, 4),
  {
    startSeat: 4,
    direction: "forward",
    manualDrawEnabled: false,
    autoDrawEnabled: false,
    autoDrawSeconds: 30,
  },
);
assertJsonEqual(
  helpers.normalizeDrawOptions(
    {
      startSeat: "2",
      direction: "reverse",
      manualDrawEnabled: true,
      autoDrawEnabled: true,
      autoDrawSeconds: 999,
    },
    4,
  ),
  {
    startSeat: 2,
    direction: "reverse",
    manualDrawEnabled: true,
    autoDrawEnabled: true,
    autoDrawSeconds: 600,
  },
);
assertJsonEqual(
  helpers.drawRoleFromPool(["washerwoman", "imp", "poisoner"], () => 0.5),
  { roleId: "imp", remainingPool: ["washerwoman", "poisoner"] },
);
assertJsonEqual(helpers.drawRoleFromPool([], () => 0), {
  roleId: "",
  remainingPool: [],
});

const roleDrawState = roleDrawModule.state();
roleDrawModule.mutations.setConfiguredPool(roleDrawState, [
  "washerwoman",
  "imp",
  "poisoner",
]);
assertJsonEqual(roleDrawState.configuredPool, [
  "washerwoman",
  "imp",
  "poisoner",
]);
roleDrawModule.mutations.start(roleDrawState, {
  queue: [3, 0, 1],
  pool: ["washerwoman", "imp", "poisoner"],
  options: {
    startSeat: 2,
    direction: "forward",
    manualDrawEnabled: true,
    autoDrawEnabled: true,
    autoDrawSeconds: 45,
  },
  now: 1000,
});
assert.strictEqual(roleDrawModule.getters.currentSeatIndex(roleDrawState), 3);
assert.strictEqual(roleDrawModule.getters.remainingCount(roleDrawState), 3);
roleDrawModule.mutations.drawCurrent(roleDrawState, {
  roleId: "imp",
  remainingPool: ["washerwoman", "poisoner"],
  now: 2000,
});
assert.strictEqual(roleDrawState.assignments[3], "imp");
assert.strictEqual(roleDrawModule.getters.currentSeatIndex(roleDrawState), 0);
assert.strictEqual(roleDrawState.active, true);
roleDrawModule.mutations.applySnapshot(roleDrawState, {
  configuredPool: ["washerwoman", "imp"],
  active: true,
  completed: false,
  queue: [0, 1],
  pool: ["imp"],
  assignments: { 0: "washerwoman" },
  currentIndex: 1,
  options: { startSeat: 1, direction: "forward" },
  turnStartedAt: 3000,
});
assertJsonEqual(roleDrawState.configuredPool, ["washerwoman", "imp"]);
assert.strictEqual(roleDrawState.assignments[0], "washerwoman");
assert.strictEqual(roleDrawModule.getters.currentSeatIndex(roleDrawState), 1);
roleDrawModule.mutations.cancel(roleDrawState);
assert.strictEqual(roleDrawState.active, false);

const rootState = {
  players: {
    players: [
      { name: "A", role: {}, id: "a" },
      { name: "B", role: {}, id: "b" },
    ],
  },
  roles: new Map([
    ["washerwoman", { id: "washerwoman", team: "townsfolk" }],
    ["imp", { id: "imp", team: "demon" }],
  ]),
};
const actionState = roleDrawModule.state();
roleDrawModule.mutations.setConfiguredPool(actionState, ["washerwoman", "imp"]);
const commits = [];
const commit = (type, payload) => {
  commits.push({ type, payload });
  if (type === "start") roleDrawModule.mutations.start(actionState, payload);
  if (type === "drawCurrent") {
    roleDrawModule.mutations.drawCurrent(actionState, payload);
  }
};
roleDrawModule.actions.startDraw(
  { commit, rootState, state: actionState },
  { startSeat: 2, direction: "reverse" },
);
assertJsonEqual(actionState.queue, [1, 0]);
const playerCommits = [];
const drawCommit = (type, payload) => {
  playerCommits.push({ type, payload });
  if (type === "drawCurrent") {
    roleDrawModule.mutations.drawCurrent(actionState, payload);
  }
};
roleDrawModule.actions.drawForCurrent(
  {
    commit: drawCommit,
    getters: {
      currentSeatIndex: roleDrawModule.getters.currentSeatIndex(actionState),
    },
    rootState,
    state: actionState,
  },
  () => 0,
);
assert.strictEqual(playerCommits[0].type, "players/update");
assert.strictEqual(playerCommits[0].payload.player.name, "B");
assert.strictEqual(playerCommits[0].payload.value.id, "washerwoman");
assert.strictEqual(playerCommits[1].type, "drawCurrent");

console.log("role draw logic tests passed");
