const assert = require("assert");
const fs = require("fs");
const path = require("path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

const menuSource = read("src/components/Menu.vue");
const storeSource = read("src/store/index.js");
const persistenceSource = read("src/store/persistence.js");
const playersSource = read("src/store/modules/players.js");
const rolesModalSource = read("src/components/modals/RolesModal.vue");
const i18nSource = read("src/i18n/index.js");

assert(menuSource.includes("tab = 'settings'"), "gear menu should expose a settings tab");
assert(menuSource.includes("tab === 'settings'"), "gear menu should render settings content");
assert(menuSource.includes("menu.settings"), "settings tab should have a translated headline");
assert(menuSource.includes("menu.statusEffects"), "settings tab should render the status effects toggle");
assert(menuSource.includes("toggleStatusEffects"), "settings tab should toggle local status effects");

const grimoireTemplate = menuSource.slice(
  menuSource.indexOf('<template v-if="tab === \'grimoire\'">'),
  menuSource.indexOf('<template v-if="tab === \'settings\'">'),
);
const settingsTemplate = menuSource.slice(
  menuSource.indexOf('<template v-if="tab === \'settings\'">'),
  menuSource.indexOf('<template v-if="tab === \'session\'">'),
);

[
  "menu.charactersVisible",
  "menu.charactersHidden",
  "menu.zoom",
  "menu.backgroundImage",
  "menu.showCustomImages",
  "menu.disableAnimations",
  "menu.muteSounds",
  "common.language",
].forEach((needle) => {
  assert(!grimoireTemplate.includes(needle), `${needle} should move out of grimoire tab`);
  assert(settingsTemplate.includes(needle), `${needle} should appear in settings tab`);
});
assert(
  !grimoireTemplate.includes('{{ $t("menu.nightOrder") }}'),
  "menu.nightOrder should move out of grimoire tab",
);
assert(
  settingsTemplate.includes('{{ $t("menu.nightOrder") }}'),
  "menu.nightOrder should appear in settings tab",
);

assert(
  storeSource.includes("statusEffectsEnabled: true") &&
    storeSource.includes("toggleStatusEffects"),
  "store should define a default-enabled status effect setting",
);
assert(
  persistenceSource.includes('localStorage.getItem("statusEffects") === "0"') &&
    persistenceSource.includes('case "toggleStatusEffects"') &&
    persistenceSource.includes('"statusEffects"') &&
    persistenceSource.includes("state.grimoire.statusEffectsEnabled"),
  "status effect setting should persist locally",
);
assert(
  playersSource.includes("autoFillBluffs") &&
    playersSource.includes("setLunaticBluff") &&
    !playersSource.includes('commit("setLunaticBluffPlayerIndex"'),
  "auto bluff fill should populate bluffs without changing the lunatic target",
);
assert(
  /const targetTeams = hasOutsider[\s\S]*\["townsfolk", "townsfolk", "outsider"\][\s\S]*\["townsfolk", "townsfolk", "townsfolk"\]/.test(
    playersSource,
  ),
  "auto bluff fill should prefer two townsfolk and one outsider, falling back to townsfolk",
);
assert(
  /if \(this\.grimoire\.roleDrawEnabled\) \{[\s\S]*?roleDraw\/setConfiguredPool[\s\S]*?closeModal[\s\S]*?return;[\s\S]*?\}[\s\S]*?players\/update[\s\S]*?this\.\$store\.dispatch\("players\/autoFillBluffs"[\s\S]*?this\.\$store\.commit\("closeModal", "roles"\)/.test(
    rolesModalSource,
  ),
  "role assignment should fill bluffs before closing the modal",
);
["settings", "statusEffects", "statusEffectsOn", "statusEffectsOff"].forEach((key) =>
  assert(i18nSource.includes(`${key}:`), `missing i18n key ${key}`),
);

console.log("auto bluffs settings source tests passed");
