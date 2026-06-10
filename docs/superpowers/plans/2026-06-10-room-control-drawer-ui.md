# Room Control Drawer UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the room control drawer as a dark register-board management panel inspired by the room list lobby.

**Architecture:** Keep the existing `RoomControlDrawer.vue` component and behavior. Make small template class additions for styling hooks, then replace scoped SCSS with register-board styles that remain isolated to this component.

**Tech Stack:** Vue single-file component, Vuex state, scoped SCSS, existing Font Awesome icons and button classes.

---

### Task 1: Add Styling Hooks

**Files:**
- Modify: `townsquare-develop/src/components/RoomControlDrawer.vue`

- [ ] **Step 1: Add semantic classes to existing template elements**

Update the header inner div, overview `dl`, action sections, details summaries, player rows, and status row with classes such as `room-control-title`, `room-control-register`, `room-control-command-grid`, `room-control-group-title`, `room-control-player-row`, and `room-control-status-row`.

- [ ] **Step 2: Preserve all existing behavior**

Confirm no method names, Vuex commits, conditional rendering, click handlers, or translation keys are changed.

### Task 2: Restyle Drawer

**Files:**
- Modify: `townsquare-develop/src/components/RoomControlDrawer.vue`

- [ ] **Step 1: Replace drawer visual styling**

Use warm dark register-board colors, squared borders, gold accents, compact table rows, and two-column command grids.

- [ ] **Step 2: Add responsive styling**

For `max-width: 640px`, keep the drawer at `min(430px, 96vw)`, reduce padding, and collapse command grids to one column.

### Task 3: Verify Scope

**Files:**
- Inspect: `townsquare-develop/src/components/RoomControlDrawer.vue`
- Inspect: `townsquare-develop/src/components/modals/RoomLobbyModal.vue`

- [ ] **Step 1: Check git diff**

Run: `git diff -- townsquare-develop/src/components/RoomControlDrawer.vue townsquare-develop/src/components/modals/RoomLobbyModal.vue`

Expected: implementation changes only appear in `RoomControlDrawer.vue`; `RoomLobbyModal.vue` remains untouched by this task.

- [ ] **Step 2: Check syntax-sensitive source patterns**

Run: `rg -n "room-control-title|room-control-command-grid|room-control-register|room-control-player-row" townsquare-develop/src/components/RoomControlDrawer.vue`

Expected: all styling hooks appear in the component.
