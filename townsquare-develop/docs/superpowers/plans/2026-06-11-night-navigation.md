# Storyteller Night Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a storyteller-only First Night / Other Nights navigation control that highlights the currently acting seated player.

**Architecture:** Add night navigation state and queue derivation to the existing `players` Vuex module so both the room control drawer and player seats read the same source. The drawer moves through the derived queue; `Player.vue` renders the highlight based on the current seat index.

**Tech Stack:** Vue 2, Vuex 3, SCSS, Font Awesome, Node source/logic test scripts.

---

### File Structure

- Modify `src/store/modules/players.js`: add `nightNavigation` state, queue getter, and navigation mutations.
- Modify `src/components/RoomControlDrawer.vue`: add host controls, queue-aware label, previous/next handlers, and compact drawer styling.
- Modify `src/components/Player.vue`: consume navigation state and apply a `night-active` highlight class.
- Modify `src/i18n/index.js`: add Chinese and English labels for the controls and empty state.
- Modify `src/main.js`: add Font Awesome icons needed by previous/next controls if they are not already registered.
- Create `scripts/test-night-navigation.js`: exercise queue sorting and navigation state behavior.
- Create `scripts/test-night-navigation-ui-source.js`: assert the drawer, player, i18n, and icon wiring exists.

### Task 1: Vuex Night Navigation State And Queue

**Files:**
- Modify: `src/store/modules/players.js`
- Create: `scripts/test-night-navigation.js`

- [ ] **Step 1: Write the failing logic test**

Create `scripts/test-night-navigation.js` with a CommonJS-friendly extraction test:

```js
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(
  path.join(__dirname, "../src/store/modules/players.js"),
  "utf8"
);

const sandbox = {
  module: { exports: {} },
  exports: {},
};

vm.runInNewContext(
  source
    .replace(/export default \{[\s\S]*$/, "module.exports = { state, getters, mutations };"),
  sandbox
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
  makePlayer("Alice", { id: "washerwoman", name: "Washerwoman", firstNight: 33, otherNight: 0 }),
  makePlayer("Bob", { id: "poisoner", name: "Poisoner", firstNight: 17, otherNight: 7 }),
  makePlayer("Cora", { id: "imp", name: "Imp", firstNight: 0, otherNight: 24 }),
  makePlayer("Drew", { id: "spy", name: "Spy", firstNight: 17, otherNight: 68 }),
  makePlayer("Empty", {}),
];

const firstQueue = getters.nightActionQueue(playersState)("first");
assert.deepStrictEqual(
  firstQueue.map((entry) => [entry.seatIndex, entry.order, entry.role.id]),
  [
    [1, 17, "poisoner"],
    [3, 17, "spy"],
    [0, 33, "washerwoman"],
  ]
);

const otherQueue = getters.nightActionQueue(playersState)("other");
assert.deepStrictEqual(
  otherQueue.map((entry) => [entry.seatIndex, entry.order, entry.role.id]),
  [
    [1, 7, "poisoner"],
    [2, 24, "imp"],
    [3, 68, "spy"],
  ]
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
```

- [ ] **Step 2: Run the failing test**

Run: `node scripts/test-night-navigation.js`

Expected before implementation: FAIL because `nightNavigation`, `nightActionQueue`, and mutations are missing.

- [ ] **Step 3: Implement the Vuex state, getter, and mutations**

In `src/store/modules/players.js`, add state:

```js
nightNavigation: {
  mode: "first",
  currentSeatIndex: -1,
},
```

Add getter:

```js
nightActionQueue: ({ players }) => (mode) => {
  const orderKey = mode === "other" ? "otherNight" : "firstNight";
  return players
    .map((player, seatIndex) => ({
      seatIndex,
      player,
      role: player.role || {},
      order: Number((player.role || {})[orderKey]) || 0,
      mode: mode === "other" ? "other" : "first",
    }))
    .filter((entry) => entry.order > 0 && entry.role && entry.role.id)
    .sort((a, b) => a.order - b.order || a.seatIndex - b.seatIndex);
},
```

Add mutations:

```js
setNightNavigationMode(state, mode = "first") {
  state.nightNavigation.mode = mode === "other" ? "other" : "first";
  state.nightNavigation.currentSeatIndex = -1;
},
setNightNavigationSeat(state, seatIndex = -1) {
  state.nightNavigation.currentSeatIndex = Number.isInteger(seatIndex)
    ? seatIndex
    : -1;
},
clearNightNavigation(state) {
  state.nightNavigation.currentSeatIndex = -1;
},
```

- [ ] **Step 4: Run the logic test**

Run: `node scripts/test-night-navigation.js`

Expected: `night navigation logic tests passed`

### Task 2: Drawer Controls And UI Wiring

**Files:**
- Modify: `src/components/RoomControlDrawer.vue`
- Modify: `src/components/Player.vue`
- Modify: `src/i18n/index.js`
- Modify: `src/main.js`
- Create: `scripts/test-night-navigation-ui-source.js`

- [ ] **Step 1: Write the failing source test**

Create `scripts/test-night-navigation-ui-source.js`:

```js
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const drawerSource = fs.readFileSync(path.join(__dirname, "../src/components/RoomControlDrawer.vue"), "utf8");
const playerSource = fs.readFileSync(path.join(__dirname, "../src/components/Player.vue"), "utf8");
const i18nSource = fs.readFileSync(path.join(__dirname, "../src/i18n/index.js"), "utf8");
const mainSource = fs.readFileSync(path.join(__dirname, "../src/main.js"), "utf8");

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
].forEach((needle) => assert(drawerSource.includes(needle), `RoomControlDrawer missing ${needle}`));

assert(
  /nightNavigationQueue\(\)[\s\S]*?this\.\$store\.getters\["players\/nightActionQueue"\]/.test(drawerSource),
  "RoomControlDrawer should consume the Vuex night action queue getter"
);

assert(
  /moveNightAction\(direction\)[\s\S]*?currentSeatIndex[\s\S]*?setNightNavigationSeat/.test(drawerSource),
  "RoomControlDrawer should move through the current queue and store the highlighted seat"
);

[
  "night-active",
  "nightNavigation",
  "currentSeatIndex",
].forEach((needle) => assert(playerSource.includes(needle), `Player missing ${needle}`));

assert(
  /night-active['"]?:\s*this\.nightNavigation\.currentSeatIndex === this\.index/.test(playerSource),
  "Player should apply night-active when its seat is selected"
);

[
  "nightNavigation",
  "noNightActions",
  "previousNightAction",
  "nextNightAction",
].forEach((needle) => assert(i18nSource.includes(needle), `i18n missing ${needle}`));

assert(mainSource.includes('"StepBackward"'), "main icons should register StepBackward");
assert(mainSource.includes('"StepForward"'), "main icons should register StepForward");

console.log("night navigation UI source tests passed");
```

- [ ] **Step 2: Run the failing source test**

Run: `node scripts/test-night-navigation-ui-source.js`

Expected before implementation: FAIL because the UI controls and labels are missing.

- [ ] **Step 3: Implement drawer controls**

In `RoomControlDrawer.vue`, add a `night-navigation` block in the host action section, below the four shortcut buttons:

```vue
<div class="night-navigation">
  <div class="night-navigation-mode" role="group" :aria-label="$t('room.nightNavigation')">
    <button
      type="button"
      class="button"
      :class="{ townsfolk: nightNavigation.mode === 'first' }"
      @click="setNightNavigationMode('first')"
    >
      {{ $t("room.firstNight") }}
    </button>
    <button
      type="button"
      class="button"
      :class="{ townsfolk: nightNavigation.mode === 'other' }"
      @click="setNightNavigationMode('other')"
    >
      {{ $t("room.otherNights") }}
    </button>
  </div>
  <div class="night-navigation-stepper">
    <button type="button" class="button" :disabled="!nightNavigationQueue.length" @click="previousNightAction">
      <font-awesome-icon icon="step-backward" />
      {{ $t("room.previousNightAction") }}
    </button>
    <span class="night-navigation-current">{{ currentNightNavigationLabel }}</span>
    <button type="button" class="button demon" :disabled="!nightNavigationQueue.length" @click="nextNightAction">
      <font-awesome-icon icon="step-forward" />
      {{ $t("room.nextNightAction") }}
    </button>
  </div>
</div>
```

Add computed values:

```js
nightNavigationQueue() {
  return this.$store.getters["players/nightActionQueue"](
    this.nightNavigation.mode,
  );
},
currentNightNavigationEntry() {
  return this.nightNavigationQueue.find(
    (entry) => entry.seatIndex === this.nightNavigation.currentSeatIndex,
  );
},
currentNightNavigationLabel() {
  const entry = this.currentNightNavigationEntry;
  if (!entry) return this.$t("room.noNightActions");
  return `${entry.order}. ${entry.role.name || entry.role.id} - ${
    entry.player.name || this.$t("room.unnamedPlayer")
  }`;
},
```

Map state:

```js
...mapState("players", ["players", "nightNavigation"]),
```

Add methods:

```js
setNightNavigationMode(mode) {
  this.$store.commit("players/setNightNavigationMode", mode);
},
previousNightAction() {
  this.moveNightAction(-1);
},
nextNightAction() {
  this.moveNightAction(1);
},
moveNightAction(direction) {
  const queue = this.nightNavigationQueue;
  if (!queue.length) {
    this.$store.commit("players/clearNightNavigation");
    return;
  }
  const currentIndex = queue.findIndex(
    (entry) => entry.seatIndex === this.nightNavigation.currentSeatIndex,
  );
  const nextIndex =
    currentIndex < 0
      ? direction > 0
        ? 0
        : queue.length - 1
      : (currentIndex + direction + queue.length) % queue.length;
  this.$store.commit(
    "players/setNightNavigationSeat",
    queue[nextIndex].seatIndex,
  );
},
```

Add scoped styles:

```scss
.night-navigation {
  grid-column: 1 / -1;
  display: grid;
  gap: 0.22em;
  padding: 0.24em;
  border: 1px solid #3d2e26;
  background: rgba(12, 9, 8, 0.62);
}

.night-navigation-mode,
.night-navigation-stepper {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.22em;
}

.night-navigation-stepper {
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.2fr) minmax(0, 0.9fr);
}

.night-navigation-current {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 1.58em;
  padding: 0 0.32em;
  color: #fff8e7;
  border: 1px solid #3d2e26;
  background: rgba(5, 4, 4, 0.46);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.76em;
}
```

- [ ] **Step 4: Implement seat highlight**

In `Player.vue`, add `nightNavigation` to players state mapping:

```js
...mapState("players", ["players", "nightNavigation"]),
```

Add class in the root `.player` class object:

```js
'night-active': this.nightNavigation.currentSeatIndex === this.index,
```

Add SCSS:

```scss
.player.night-active .token {
  filter: drop-shadow(0 0 8px #d4af37) drop-shadow(0 0 18px #d4af37);
}

.player.night-active:after {
  content: " ";
  position: absolute;
  inset: -6%;
  border: 3px solid #d4af37;
  border-radius: 50%;
  box-shadow: 0 0 18px rgba(212, 175, 55, 0.86);
  pointer-events: none;
  z-index: 4;
  animation: nightActionPulse 1.6s ease-in-out infinite;
}

@keyframes nightActionPulse {
  0%,
  100% {
    opacity: 0.55;
    transform: scale(0.98);
  }
  50% {
    opacity: 1;
    transform: scale(1.04);
  }
}
```

- [ ] **Step 5: Add i18n labels**

In `src/i18n/index.js`, add `room` labels in Chinese and English:

```js
nightNavigation: "夜晚行动",
firstNight: "首夜",
otherNights: "其他夜",
previousNightAction: "上一个",
nextNightAction: "下一个",
noNightActions: "暂无行动",
unnamedPlayer: "未命名玩家",
```

English:

```js
nightNavigation: "Night actions",
firstNight: "First Night",
otherNights: "Other Nights",
previousNightAction: "Previous",
nextNightAction: "Next",
noNightActions: "No actions",
unnamedPlayer: "Unnamed player",
```

- [ ] **Step 6: Add icons**

In `src/main.js`, add:

```js
"StepBackward",
"StepForward",
```

- [ ] **Step 7: Run source test**

Run: `node scripts/test-night-navigation-ui-source.js`

Expected: `night navigation UI source tests passed`

### Task 3: Regression Verification

**Files:**
- Verify only, no planned source edits.

- [ ] **Step 1: Run the focused tests**

Run:

```bash
node scripts/test-night-navigation.js
node scripts/test-night-navigation-ui-source.js
node scripts/test-room-ui-source.js
```

Expected: all scripts print their passing messages.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: lint completes without errors.

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: Vue build completes successfully.

- [ ] **Step 4: Manual check**

Start the app if needed with `npm run serve`, open the room control drawer as host, and verify:

- The host sees First Night / Other Nights, Previous, and Next controls.
- Next highlights the first acting seat in First Night mode.
- Switching to Other Nights clears the highlight.
- Next highlights the first acting seat in Other Nights mode.
- Previous wraps to the last acting seat.
- A spectator does not see the host shortcut controls.
