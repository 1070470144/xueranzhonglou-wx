# Drunk Poisoned Token Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show drunk and poisoned glow effects on a player's center role token when that seat has matching reminder tokens.

**Architecture:** `Player.vue` derives status flags directly from `player.reminders`, binds status classes on the player root, and styles the existing `.token` with status-specific `drop-shadow` animations. Matching is based on clear reminder text signals, with source role lists kept alongside the text checks to document which reminder families are expected to map to each status.

**Tech Stack:** Vue 2 single-file components, SCSS in `Player.vue`, Node source assertion scripts.

---

### Task 1: Source-Level Status Effect Test

**Files:**
- Create: `scripts/test-drunk-poisoned-effects-source.js`
- Modify: `src/components/Player.vue`

- [ ] **Step 1: Write the failing test**

Create `scripts/test-drunk-poisoned-effects-source.js`:

```js
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const playerSource = fs.readFileSync(
  path.join(__dirname, "../src/components/Player.vue"),
  "utf8",
);

[
  "reminderStatusEffects",
  "hasPoisonReminder",
  "hasDrunkReminder",
  "poisoned-active",
  "drunk-active",
  "drunk-poisoned-active",
].forEach((needle) =>
  assert(playerSource.includes(needle), `Player missing ${needle}`),
);

assert(
  /'poisoned-active':\s*this\.hasPoisonReminder && !this\.hasDrunkReminder/.test(
    playerSource,
  ),
  "Player should apply poisoned-active only for poison-only reminders",
);
assert(
  /'drunk-active':\s*this\.hasDrunkReminder && !this\.hasPoisonReminder/.test(
    playerSource,
  ),
  "Player should apply drunk-active only for drunk-only reminders",
);
assert(
  /'drunk-poisoned-active':\s*this\.hasDrunkReminder && this\.hasPoisonReminder/.test(
    playerSource,
  ),
  "Player should apply a combined class when both statuses exist",
);

[
  "Poisoned",
  "poison",
  "中毒",
  "毒",
  "普卡毒",
  "亡骨魔毒",
  "Drunk",
  "drunk",
  "醉酒",
  "酒鬼",
  "是酒鬼",
].forEach((needle) =>
  assert(playerSource.includes(needle), `status matching missing ${needle}`),
);

[
  "poisoner",
  "pukka",
  "vigormortis",
  "nodashii",
  "lleech",
  "widow",
  "snakecharmer",
].forEach((role) =>
  assert(playerSource.includes(`"${role}"`), `poison role missing ${role}`),
);

[
  "drunk",
  "sailor",
  "innkeeper",
  "courtier",
  "philosopher",
  "puzzlemaster",
  "sweetheart",
].forEach((role) =>
  assert(playerSource.includes(`"${role}"`), `drunk role missing ${role}`),
);

assert(
  /\.player\.poisoned-active \.token[\s\S]*?animation: poisonTokenPulse/.test(
    playerSource,
  ),
  "Poison status should animate the role token",
);
assert(
  /\.player\.drunk-active \.token[\s\S]*?animation: drunkTokenPulse/.test(
    playerSource,
  ),
  "Drunk status should animate the role token",
);
assert(
  /\.player\.drunk-poisoned-active \.token[\s\S]*?animation: drunkPoisonedTokenPulse/.test(
    playerSource,
  ),
  "Combined status should use one combined token animation",
);
assert(
  /#townsquare\.public \.circle \.player\.(?:poisoned-active|drunk-active|drunk-poisoned-active)[\s\S]*?animation:\s*none/.test(
    playerSource,
  ),
  "Public grimoire should hide drunk and poisoned token effects",
);

console.log("drunk poisoned effects source tests passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-drunk-poisoned-effects-source.js`

Expected: FAIL with `Player missing reminderStatusEffects`.

- [ ] **Step 3: Add status classification and class binding**

In `src/components/Player.vue`, add root class bindings:

```js
'poisoned-active': this.hasPoisonReminder && !this.hasDrunkReminder,
'drunk-active': this.hasDrunkReminder && !this.hasPoisonReminder,
'drunk-poisoned-active': this.hasDrunkReminder && this.hasPoisonReminder,
```

Add computed properties:

```js
reminderStatusEffects: function () {
  const poisonRoles = [
    "poisoner",
    "pukka",
    "vigormortis",
    "nodashii",
    "lleech",
    "widow",
    "snakecharmer",
  ];
  const drunkRoles = [
    "drunk",
    "sailor",
    "innkeeper",
    "courtier",
    "philosopher",
    "puzzlemaster",
    "sweetheart",
  ];
  const poisonTextSignals = ["Poisoned", "poison", "中毒", "毒", "普卡毒", "亡骨魔毒"];
  const drunkTextSignals = ["Drunk", "drunk", "醉酒", "酒鬼", "是酒鬼"];
  const effects = { poison: false, drunk: false };

  (this.player.reminders || []).forEach((reminder) => {
    const name = `${reminder.name || ""}`;
    const role = `${reminder.role || ""}`;
    const hasPoisonText = poisonTextSignals.some((signal) => name.includes(signal));
    const hasDrunkText = drunkTextSignals.some((signal) => name.includes(signal));

    if (hasPoisonText && (poisonRoles.includes(role) || !drunkRoles.includes(role))) {
      effects.poison = true;
    }
    if (hasDrunkText && (drunkRoles.includes(role) || !poisonRoles.includes(role))) {
      effects.drunk = true;
    }
  });

  return effects;
},
hasPoisonReminder: function () {
  return this.reminderStatusEffects.poison;
},
hasDrunkReminder: function () {
  return this.reminderStatusEffects.drunk;
},
```

- [ ] **Step 4: Add token animations and public-mode hiding**

In `src/components/Player.vue`, near the existing `nightActionPulse` CSS, add:

```scss
.player.poisoned-active .token {
  animation: poisonTokenPulse 1.8s ease-in-out infinite;
}

.player.drunk-active .token {
  animation: drunkTokenPulse 1.9s ease-in-out infinite;
}

.player.drunk-poisoned-active .token {
  animation: drunkPoisonedTokenPulse 2.2s ease-in-out infinite;
}

@keyframes poisonTokenPulse {
  0%,
  100% {
    filter: drop-shadow(0 0 7px rgba(73, 255, 106, 0.62))
      drop-shadow(0 0 18px rgba(21, 188, 92, 0.42));
  }
  50% {
    filter: drop-shadow(0 0 13px rgba(98, 255, 130, 0.92))
      drop-shadow(0 0 30px rgba(34, 214, 116, 0.7));
  }
}

@keyframes drunkTokenPulse {
  0%,
  100% {
    filter: drop-shadow(0 0 7px rgba(94, 183, 255, 0.62))
      drop-shadow(0 0 18px rgba(123, 92, 255, 0.38));
  }
  50% {
    filter: drop-shadow(0 0 13px rgba(117, 206, 255, 0.9))
      drop-shadow(0 0 30px rgba(145, 112, 255, 0.66));
  }
}

@keyframes drunkPoisonedTokenPulse {
  0%,
  100% {
    filter: drop-shadow(0 0 9px rgba(94, 183, 255, 0.68))
      drop-shadow(0 0 20px rgba(73, 255, 106, 0.46));
  }
  50% {
    filter: drop-shadow(0 0 14px rgba(117, 206, 255, 0.94))
      drop-shadow(0 0 31px rgba(98, 255, 130, 0.72));
  }
}

#townsquare.public .circle .player.poisoned-active .token,
#townsquare.public .circle .player.drunk-active .token,
#townsquare.public .circle .player.drunk-poisoned-active .token {
  animation: none;
  filter: none;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node scripts/test-drunk-poisoned-effects-source.js`

Expected: PASS with `drunk poisoned effects source tests passed`.

- [ ] **Step 6: Run adjacent regression checks**

Run: `node scripts/test-night-navigation-ui-source.js`

Expected: PASS with `night navigation UI source tests passed`.

Run: `npm run lint -- --no-fix`

Expected: PASS or only pre-existing unrelated lint failures. If lint fails in `Player.vue` or the new script, fix those failures and rerun.

### Self-Review

Spec coverage: The plan covers reminder-derived drunk/poison classification, one visual per status, combined status handling, public grimoire hiding, and night navigation coexistence through status animation priority.

Placeholder scan: No `TBD`, `TODO`, or vague test/code steps remain.

Type consistency: The plan uses existing `player.reminders`, `reminder.name`, `reminder.role`, Vue computed properties, root class binding, and existing `.token` CSS selector names.
