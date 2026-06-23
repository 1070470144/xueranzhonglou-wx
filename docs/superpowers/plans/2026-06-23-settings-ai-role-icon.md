# Settings AI Role Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared settings modal and AI-generated custom role icon flow using the existing uniCloud AI config.

**Architecture:** Reuse `ai-service` and the existing `user-ai-configs` / `ai-configs` data model. Townsquare calls small service wrappers, while the backend keeps API keys server-side and returns only masked keys plus generated image URLs.

**Tech Stack:** Vue 2, Vuex, SCSS, uniCloud cloud functions, plain JavaScript source-level tests.

---

### Task 1: Backend AI Config and Role Icon Generation

**Files:**
- Modify: `xueran/uniCloud-aliyun/database/ai-configs.schema.json`
- Modify: `xueran/uniCloud-aliyun/database/user-ai-configs.schema.json`
- Modify: `xueran/uniCloud-aliyun/cloudfunctions/ai-service/index.obj.js`
- Modify: `xueran-admin/uniCloud-aliyun/cloudfunctions/ai-admin-service/index.obj.js`
- Modify: `xueran-admin/pages/admin/ai/config.vue`
- Test: `townsquare-develop/scripts/test-ai-role-icon-source.js`

- [ ] **Step 1: Write source-level failing test**

Create `townsquare-develop/scripts/test-ai-role-icon-source.js` that reads the files above and asserts:
- both schemas contain `imageModel`
- both backend public config functions expose `imageModel`
- both save config paths persist `imageModel`
- `ai-service` exports `generateRoleIcon`
- admin config page contains an image model input

Run: `node scripts/test-ai-role-icon-source.js` from `townsquare-develop/`
Expected: FAIL because the current files do not contain these fields/methods.

- [ ] **Step 2: Implement backend config extension**

Add `imageModel` string fields to both schemas. Add `imageModel` to public config defaults as `gpt-image-2`. Save `imageModel` in personal and default admin config.

- [ ] **Step 3: Implement role icon generation**

Add `generateRoleIcon(params)` to `ai-service`. It must verify auth token, resolve personal config before admin config, require `baseUrl`, `apiKey`, and `imageModel`, build a concise icon prompt from role metadata, call an OpenAI-compatible `/images/generations` endpoint through the configured base URL, and return `{ imageUrl }`. It must not return or log API keys.

- [ ] **Step 4: Verify backend source test passes**

Run: `node scripts/test-ai-role-icon-source.js`
Expected: PASS.

### Task 2: Townsquare AI Service and Settings Modal

**Files:**
- Create: `townsquare-develop/src/services/ai.js`
- Create: `townsquare-develop/src/components/modals/SettingsModal.vue`
- Modify: `townsquare-develop/src/store/index.js`
- Modify: `townsquare-develop/src/App.vue`
- Modify: `townsquare-develop/src/components/Menu.vue`
- Modify: `townsquare-develop/src/i18n/index.js`
- Test: `townsquare-develop/scripts/test-settings-modal-source.js`

- [ ] **Step 1: Write source-level failing test**

Create `townsquare-develop/scripts/test-settings-modal-source.js` that asserts:
- `src/services/ai.js` exports `getUserAiConfig`, `saveUserAiConfig`, and `generateRoleIcon`
- store has a `settings` modal flag
- `App.vue` imports and renders `SettingsModal`
- `Menu.vue` opens `toggleModal("settings")` and displays the settings i18n label instead of nickname in the top-right summary
- i18n contains settings/profile/AI labels

Run: `node scripts/test-settings-modal-source.js`
Expected: FAIL because these files do not exist or are not wired yet.

- [ ] **Step 2: Implement AI service wrapper**

Create `src/services/ai.js` that calls `callUniCloudFunction("ai-service", method, { ...params, token })` and exports the three methods required by the test.

- [ ] **Step 3: Implement settings modal**

Create `SettingsModal.vue` with left nav for profile and AI sections. Profile reads the current auth session and allows local display of avatar/name fields. AI section loads and saves shared user AI config with provider, base URL, API key, chat model, and image model.

- [ ] **Step 4: Wire modal and menu**

Add `settings: false` to Vuex modals, import/render `SettingsModal` in `App.vue`, and change the top-right auth summary to a settings entry that opens the modal.

- [ ] **Step 5: Verify settings test passes**

Run: `node scripts/test-settings-modal-source.js`
Expected: PASS.

### Task 3: AI Icon Button in Custom Role Creation

**Files:**
- Modify: `townsquare-develop/src/components/modals/RoleLibraryModal.vue`
- Modify: `townsquare-develop/src/i18n/index.js`
- Test: `townsquare-develop/scripts/test-role-library-ai-icon-source.js`

- [ ] **Step 1: Write source-level failing test**

Create `townsquare-develop/scripts/test-role-library-ai-icon-source.js` that asserts:
- `RoleLibraryModal.vue` imports `generateRoleIcon`
- create form data has AI icon loading/error/preview state
- template has generate and apply actions
- generated image is assigned to `createForm.image`
- i18n contains AI icon labels and errors

Run: `node scripts/test-role-library-ai-icon-source.js`
Expected: FAIL.

- [ ] **Step 2: Add role icon UI state and methods**

Add `createGeneratingIcon`, `createGeneratedIcon`, and `createIconError`. Add `generateCreateIcon()` to call `generateRoleIcon(this.buildCreateRoleJson())` after validating name/team/ability. Add `applyGeneratedIcon()` to copy the generated URL into `createForm.image`.

- [ ] **Step 3: Add controls to create modal**

Place buttons beside the role image controls: generate AI icon, preview generated icon, apply icon. Disable generation during create/upload/generate work.

- [ ] **Step 4: Verify role library test passes**

Run: `node scripts/test-role-library-ai-icon-source.js`
Expected: PASS.

### Task 4: Full Verification

**Files:**
- All modified files above.

- [ ] **Step 1: Run source tests**

Run from `townsquare-develop/`:

```bash
node scripts/test-ai-role-icon-source.js
node scripts/test-settings-modal-source.js
node scripts/test-role-library-ai-icon-source.js
```

Expected: all PASS.

- [ ] **Step 2: Run lint**

Run from `townsquare-develop/`:

```bash
npm run lint-ci
```

Expected: PASS. If lint cannot run because dependencies are unavailable, report that explicitly.

- [ ] **Step 3: No git operations**

Do not run `git add`, `git commit`, or other git mutation commands. The user explicitly requested no git operations.
