# Auto Bluffs and Settings Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate demon/lunatic bluffs after role assignment and move grimoire display controls into a dedicated settings tab with a local status effect toggle.

**Architecture:** Add a small players action for bluff generation, keep the role modal as the caller after assignment, store the status-effect toggle in `grimoire`, and persist it through the existing persistence plugin.

**Tech Stack:** Vue 2, Vuex, SCSS, localStorage, existing Node source-check scripts.

---

### Task 1: Red Tests

**Files:**
- Create: `scripts/test-auto-bluffs-settings-source.js`
- Modify: `scripts/test-drunk-poisoned-effects-source.js`

- [ ] Add source assertions for settings tab, persistence, role assignment auto-fill, and status effects toggle.
- [ ] Run `node scripts/test-auto-bluffs-settings-source.js` and confirm it fails because implementation is missing.
- [ ] Run `node scripts/test-drunk-poisoned-effects-source.js` and confirm it fails because `statusEffectsEnabled` is not wired into player classes yet.

### Task 2: Store and Persistence

**Files:**
- Modify: `src/store/index.js`
- Modify: `src/store/persistence.js`

- [ ] Add `grimoire.statusEffectsEnabled: true`.
- [ ] Add `toggleStatusEffects` mutation.
- [ ] Read `localStorage.statusEffects === "0"` as disabled.
- [ ] Persist `toggleStatusEffects` as `"1"` or `"0"`.

### Task 3: Settings Menu

**Files:**
- Modify: `src/components/Menu.vue`
- Modify: `src/i18n/index.js`

- [ ] Add a fourth gear-menu tab with the cog icon and active styling.
- [ ] Move visibility, night order, zoom, background, image opt-in, disable animations, mute, and language entries from grimoire to settings.
- [ ] Add a local status effects toggle entry.
- [ ] Keep session/help/grimoire actions otherwise unchanged.

### Task 4: Auto Bluff Fill

**Files:**
- Modify: `src/store/modules/players.js`
- Modify: `src/components/modals/RolesModal.vue`

- [ ] Add a Vuex action that accepts assigned roles, excludes seated roles from script roles, shuffles candidates, and commits demon/lunatic bluff slots.
- [ ] Prefer two townsfolk and one outsider, falling back to three townsfolk only when no outsider candidate exists.
- [ ] Call the action after role assignment and before closing the modal.
- [ ] Do not modify `lunaticBluffPlayerIndex`.

### Task 5: Status Effect Toggle in Player

**Files:**
- Modify: `src/components/Player.vue`

- [ ] Gate drunk/poisoned classes behind `grimoire.statusEffectsEnabled`.
- [ ] Keep night navigation class independent.
- [ ] Keep public grimoire suppression CSS unchanged.

### Task 6: Verification

- [ ] Run `node scripts/test-auto-bluffs-settings-source.js`.
- [ ] Run `node scripts/test-drunk-poisoned-effects-source.js`.
- [ ] Run `node scripts/test-room-menu-i18n-source.js`.
- [ ] Run `node scripts/test-room-ui-source.js`.
- [ ] Run `npm run lint -- --no-fix`.
- [ ] Inspect the running app in the in-app browser to confirm the gear menu remains desktop-sized and settings items render.
