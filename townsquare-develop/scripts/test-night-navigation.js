const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(
  path.join(__dirname, "../src/store/modules/players.js"),
  "utf8",
);

const sandbox = {
  module: { exports: {} },
  exports: {},
};

vm.runInNewContext(
  source.replace(
    /export default \{[\s\S]*$/,
    "module.exports = { state, getters, mutations };",
  ),
  sandbox,
);

const { state, getters, mutations } = sandbox.module.exports;

const makePlayer = (name, role) => ({
  name,
  id: "",
  role,
  reminders: [],
  isVoteless: false,
  isDead: false,
});

const playersState = state();
playersState.players = [
  makePlayer("Alice", {
    id: "washerwoman",
    name: "Washerwoman",
    firstNight: 33,
    otherNight: 0,
  }),
  makePlayer("Bob", {
    id: "poisoner",
    name: "Poisoner",
    firstNight: 17,
    otherNight: 7,
  }),
  makePlayer("Cora", {
    id: "imp",
    name: "Imp",
    firstNight: 0,
    otherNight: 24,
  }),
  makePlayer("Drew", {
    id: "spy",
    name: "Spy",
    firstNight: 17,
    otherNight: 68,
  }),
  makePlayer("Empty", {}),
];

const firstQueue = getters.nightActionQueue(playersState)("first");
assert.deepStrictEqual(
  firstQueue.map((entry) => [entry.seatIndex, entry.order, entry.role.id]),
  [
    [1, 17, "poisoner"],
    [3, 17, "spy"],
    [0, 33, "washerwoman"],
  ],
);

const otherQueue = getters.nightActionQueue(playersState)("other");
assert.deepStrictEqual(
  otherQueue.map((entry) => [entry.seatIndex, entry.order, entry.role.id]),
  [
    [1, 7, "poisoner"],
    [2, 24, "imp"],
    [3, 68, "spy"],
  ],
);

mutations.setNightNavigationMode(playersState, "other");
assert.strictEqual(playersState.nightNavigation.mode, "other");
assert.strictEqual(playersState.nightNavigation.currentSeatIndex, -1);

mutations.setNightNavigationSeat(playersState, 2);
assert.strictEqual(playersState.nightNavigation.currentSeatIndex, 2);

mutations.setNightNavigationMode(playersState, "first");
assert.strictEqual(playersState.nightNavigation.mode, "first");
assert.strictEqual(playersState.nightNavigation.currentSeatIndex, -1);

mutations.clearNightNavigation(playersState);
assert.strictEqual(playersState.nightNavigation.currentSeatIndex, -1);

console.log("night navigation logic tests passed");
