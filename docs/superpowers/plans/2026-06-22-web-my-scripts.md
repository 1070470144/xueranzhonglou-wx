# Web My Scripts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a web "My" area in the gear menu with login, script library, JSON + cover upload, and my-upload management using the existing mini-program cloud functions.

**Architecture:** Keep backend APIs shared with the mini program. Add thin web service wrappers, two focused Vue modals, and menu/store/App registrations. Style the new UI after `RoomControlDrawer.vue`: dark compact panels, gold dividers, dense grids, and restrained buttons.

**Tech Stack:** Vue 2, Vuex, uniCloud Web SDK, existing modal framework, existing FontAwesome icon set.

---

### Task 1: Web Script Service

**Files:**

- Modify: `townsquare-develop/src/services/auth.js`
- Modify: `townsquare-develop/src/services/scripts.js`

- [x] Add a raw uniCloud call wrapper for `listScripts`.
- [x] Add a browser upload wrapper around `uniCloud.uploadFile`.
- [x] Add authenticated wrappers for like, favorite, user upload, my uploads, detail, and delete.

### Task 2: Menu And Modal Registration

**Files:**

- Modify: `townsquare-develop/src/store/index.js`
- Modify: `townsquare-develop/src/App.vue`
- Modify: `townsquare-develop/src/components/Menu.vue`

- [x] Add modal state for `scriptLibrary` and `myUploads`.
- [x] Mount both new modals in `App.vue`.
- [x] Add a `my` gear tab and move login/logout from `grimoire` into `my`.
- [x] Add buttons for script library and my uploads.

### Task 3: Script Library Modal

**Files:**

- Create: `townsquare-develop/src/components/modals/ScriptLibraryModal.vue`

- [x] Show searchable public scripts from `listScripts`.
- [x] Show details, like, favorite, and load-more controls.
- [x] Add an upload panel with up to three cover images, JSON file picker, JSON paste area, and script type.
- [x] Require login for upload/like/favorite.

### Task 4: My Uploads Modal

**Files:**

- Create: `townsquare-develop/src/components/modals/MyUploadsModal.vue`

- [x] Show current user's uploaded scripts with search and load more.
- [x] Show review status, reject reason, cover, title, author, and description.
- [x] Support detail view and delete with confirmation.

### Task 5: Copy And Verification

**Files:**

- Modify: `townsquare-develop/src/i18n/index.js`

- [x] Add Chinese and English labels for menu entries, upload states, status tags, and errors.
- [x] Run lint/build and fix integration errors.
