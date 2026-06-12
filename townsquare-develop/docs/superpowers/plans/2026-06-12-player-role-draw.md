# Player Role Draw Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a simulated player role draw flow where the storyteller configures a role pool and players draw from it in a controlled seat order.

**Architecture:** Add a focused role draw helper and Vuex module for queue/pool state, then connect it to settings, role selection, storyteller controls, player invite UI, and socket sync. The host stays authoritative for timeout/default draws and distributes private roles after the draw finishes.

**Tech Stack:** Vue 2, Vuex 3, existing WebSocket store plugin, Node source tests.

---

## File Structure

- Create `src/services/roleDraw.js`: pure helpers for queue building, option normalization, and consuming a random role from the pool.
- Create `src/store/modules/roleDraw.js`: Vuex state/mutations/getters/actions for draw configuration and active turns.
- Create `src/components/RoleDrawInviteConfirm.vue`: left-side player invite panel, modeled after the voice invite panel.
- Create `scripts/test-role-draw-logic.js`: real behavior tests for the helper and module.
- Create `scripts/test-role-draw-source.js`: source-level integration checks for UI, persistence, socket sync, and i18n wiring.
- Modify `src/store/index.js`: register module and add global settings.
- Modify `src/store/persistence.js`: persist the feature toggle and draw options.
- Modify `src/components/Menu.vue`: add the settings switch.
- Modify `src/components/modals/RolesModal.vue`: when feature is enabled, save the selected non-traveler role pool instead of assigning roles immediately.
- Modify `src/components/RoomControlDrawer.vue`: add storyteller setup/progress/default draw controls and timeout host timer.
- Modify `src/App.vue`: render the player draw invite panel.
- Modify `src/store/socket.js`: sync draw state and trigger private role distribution after completion.
- Modify `src/i18n/index.js`: add Chinese and English UI strings.

### Task 1: Role Draw Core Logic

**Files:**
- Create: `src/services/roleDraw.js`
- Create: `scripts/test-role-draw-logic.js`
- Create: `src/store/modules/roleDraw.js`

- [ ] **Step 1: Write the failing helper and module tests**

Create `scripts/test-role-draw-logic.js` with assertions for:

```js
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const loadModule = (relativePath, exportReplacement) => {
  const source = fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
  const sandbox = { module: { exports: {} }, exports: {}, require };
  vm.runInNewContext(source.replace(/export default [\s\S]*$/, exportReplacement), sandbox);
  return sandbox.module.exports;
};

const roleDrawHelpers = loadModule(
  "src/services/roleDraw.js",
  "module.exports = { buildDrawQueue, normalizeDrawOptions, drawRoleFromPool };",
);
const roleDrawModule = loadModule(
  "src/store/modules/roleDraw.js",
  "module.exports = { state, getters, actions, mutations };",
);

const players = [
  { name: "A", role: {}, id: "a" },
  { name: "B", role: {}, id: "b" },
  { name: "T", role: { team: "traveler" }, id: "t" },
  { name: "C", role: {}, id: "c" },
];

assert.deepStrictEqual(roleDrawHelpers.buildDrawQueue(players, 2, "forward"), [3, 0, 1]);
assert.deepStrictEqual(roleDrawHelpers.buildDrawQueue(players, 2, "reverse"), [1, 0, 3]);
assert.deepStrictEqual(roleDrawHelpers.normalizeDrawOptions({ startSeat: 99, autoDrawSeconds: 2 }, 4), {
  startSeat: 4,
  direction: "forward",
  manualDrawEnabled: false,
  autoDrawEnabled: false,
  autoDrawSeconds: 30,
});
assert.deepStrictEqual(
  roleDrawHelpers.drawRoleFromPool(["washerwoman", "imp", "poisoner"], () => 0.5),
  { roleId: "imp", remainingPool: ["washerwoman", "poisoner"] },
);

const state = roleDrawModule.state();
roleDrawModule.mutations.setConfiguredPool(state, ["washerwoman", "imp", "poisoner"]);
assert.deepStrictEqual(state.configuredPool, ["washerwoman", "imp", "poisoner"]);
roleDrawModule.mutations.start(state, {
  queue: [3, 0, 1],
  pool: ["washerwoman", "imp", "poisoner"],
  options: { startSeat: 2, direction: "forward", manualDrawEnabled: true, autoDrawEnabled: true, autoDrawSeconds: 45 },
  now: 1000,
});
assert.strictEqual(roleDrawModule.getters.currentSeatIndex(state), 3);
assert.strictEqual(roleDrawModule.getters.remainingCount(state), 3);
roleDrawModule.mutations.drawCurrent(state, { roleId: "imp", remainingPool: ["washerwoman", "poisoner"], now: 2000 });
assert.strictEqual(state.assignments[3], "imp");
assert.strictEqual(roleDrawModule.getters.currentSeatIndex(state), 0);
roleDrawModule.mutations.cancel(state);
assert.strictEqual(state.active, false);

console.log("role draw logic tests passed");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node scripts/test-role-draw-logic.js`
Expected: FAIL because `src/services/roleDraw.js` and `src/store/modules/roleDraw.js` do not exist.

- [ ] **Step 3: Implement helper and Vuex module**

Implement pure helper functions and a module with `configuredPool`, `active`, `queue`, `pool`, `assignments`, `currentIndex`, and options.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node scripts/test-role-draw-logic.js`
Expected: PASS with `role draw logic tests passed`.

### Task 2: Settings And Role Pool Capture

**Files:**
- Create: `scripts/test-role-draw-source.js`
- Modify: `src/store/index.js`
- Modify: `src/store/persistence.js`
- Modify: `src/components/Menu.vue`
- Modify: `src/components/modals/RolesModal.vue`
- Modify: `src/i18n/index.js`

- [ ] **Step 1: Write failing source integration checks**

`scripts/test-role-draw-source.js` checks that the store registers `roleDraw`, settings include `roleDrawEnabled`, persistence saves the setting/options, menu renders `simulateRoleDraw`, roles modal commits `roleDraw/setConfiguredPool`, and i18n includes `roleDraw`.

- [ ] **Step 2: Run source test to verify it fails**

Run: `node scripts/test-role-draw-source.js`
Expected: FAIL on missing strings.

- [ ] **Step 3: Wire setting and role pool capture**

Add `grimoire.roleDrawEnabled`, persist it, render a toggle in the settings tab, and alter `RolesModal.assignRoles()` so enabled draw mode commits the selected non-traveler role IDs to `roleDraw/setConfiguredPool` without changing player roles.

- [ ] **Step 4: Run source test to verify it passes**

Run: `node scripts/test-role-draw-source.js`
Expected: PASS for setting and role pool checks.

### Task 3: Storyteller Controls And Player Invite

**Files:**
- Create: `src/components/RoleDrawInviteConfirm.vue`
- Modify: `src/components/RoomControlDrawer.vue`
- Modify: `src/App.vue`
- Modify: `scripts/test-role-draw-source.js`
- Modify: `src/i18n/index.js`

- [ ] **Step 1: Extend failing source checks**

Add assertions for `RoleDrawInviteConfirm`, `startRoleDraw`, `helpCurrentPlayerDraw`, `autoDrawSeconds`, `roleDrawRemaining`, `<RoleDrawInviteConfirm />`, and the left-side panel class.

- [ ] **Step 2: Run source test to verify it fails**

Run: `node scripts/test-role-draw-source.js`
Expected: FAIL because controls and component do not exist.

- [ ] **Step 3: Implement controls and invite**

Add start seat, direction, manual default draw, auto timeout controls, progress text, manual host draw button, and the player draw invite action. Use the role draw module actions and host timer to default draw when the current turn expires.

- [ ] **Step 4: Run source and logic tests**

Run:
`node scripts/test-role-draw-source.js`
`node scripts/test-role-draw-logic.js`
Expected: both PASS.

### Task 4: Socket Sync And Completion Distribution

**Files:**
- Modify: `src/store/socket.js`
- Modify: `scripts/test-role-draw-source.js`

- [ ] **Step 1: Extend failing source checks**

Add assertions that socket sync handles `roleDraw/start`, `roleDraw/drawForCurrent`, `roleDraw/cancel`, and calls `session.distributeRoles()` when the draw completes.

- [ ] **Step 2: Run source test to verify it fails**

Run: `node scripts/test-role-draw-source.js`
Expected: FAIL because socket wiring is missing.

- [ ] **Step 3: Implement socket sync**

Include role draw state in gamestate snapshots and add mutation subscriptions for start/draw/cancel/config updates. Ensure host completion privately distributes final roles via the existing session path.

- [ ] **Step 4: Run focused verification**

Run:
`node scripts/test-role-draw-source.js`
`node scripts/test-role-draw-logic.js`
`npm run lint -- --no-fix`
Expected: source and logic tests PASS; lint either PASS or report unrelated pre-existing warnings/errors that must be summarized.

## Self-Review

- Spec coverage: The plan covers setting toggle, storyteller pool configuration, start seat and direction, current-player-only draw, remaining count, host default draw, auto timeout, left-side invite, socket sync, and private distribution after completion.
- Placeholder scan: No task uses TODO/TBD or vague "handle edge cases" wording.
- Type consistency: Helper names, module names, options, and component names are consistent across tasks.

## Execution Note

Do not run git commands for this plan. The user explicitly requested no git operations.
