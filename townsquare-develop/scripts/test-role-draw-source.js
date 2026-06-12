const assert = require("assert");
const fs = require("fs");
const path = require("path");

const read = (relativePath) =>
  fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");

const storeSource = read("src/store/index.js");
const persistenceSource = read("src/store/persistence.js");
const menuSource = read("src/components/Menu.vue");
const rolesModalSource = read("src/components/modals/RolesModal.vue");
const controlSource = read("src/components/RoomControlDrawer.vue");
const appSource = read("src/App.vue");
const socketSource = read("src/store/socket.js");
const i18nSource = read("src/i18n/index.js");
const invitePath = path.join(
  __dirname,
  "../src/components/RoleDrawInviteConfirm.vue",
);
const inviteSource = fs.existsSync(invitePath)
  ? fs.readFileSync(invitePath, "utf8")
  : "";

[
  'import roleDraw from "./modules/roleDraw";',
  "roleDraw,",
  "roleDrawEnabled",
  "toggleRoleDraw",
].forEach((needle) =>
  assert(storeSource.includes(needle), `store missing ${needle}`),
);

[
  'localStorage.getItem("roleDrawEnabled")',
  "toggleRoleDraw",
  '"roleDrawEnabled"',
  "roleDraw/setOptions",
].forEach((needle) =>
  assert(persistenceSource.includes(needle), `persistence missing ${needle}`),
);

["simulateRoleDraw", "toggleRoleDraw", "grimoire.roleDrawEnabled"].forEach(
  (needle) => assert(menuSource.includes(needle), `menu missing ${needle}`),
);

["roleDraw/setConfiguredPool", "roleDrawEnabled", "selectedRolePool"].forEach(
  (needle) =>
    assert(rolesModalSource.includes(needle), `roles modal missing ${needle}`),
);
assert(
  /if \(this\.grimoire\.roleDrawEnabled\) \{[\s\S]*?roleDraw\/setConfiguredPool[\s\S]*?closeModal[\s\S]*?return;[\s\S]*?\}[\s\S]*?players\/update[\s\S]*?players\/autoFillBluffs/.test(
    rolesModalSource,
  ),
  "roles modal should keep original direct assignment path when role draw is off",
);

[
  "role-draw-control",
  "startRoleDraw",
  "helpCurrentPlayerDraw",
  "autoDrawSeconds",
  "roleDrawRemaining",
  "roleDraw/setOptions",
  "roleDraw/startDraw",
  "roleDraw/drawForCurrent",
].forEach((needle) =>
  assert(controlSource.includes(needle), `control missing ${needle}`),
);
assert(
  /sendCharactersDisabled\(\) \{[\s\S]*?this\.grimoire\.roleDrawEnabled[\s\S]*?!this\.roleDrawOptions\.manualDrawEnabled[\s\S]*?!this\.roleDrawOptions\.autoDrawEnabled[\s\S]*?\}/.test(
    controlSource,
  ),
  "send characters should only be disabled for non-random role draw",
);
const sendCharacterButtons = controlSource.match(
  /<button[\s\S]*?class="button demon"[\s\S]*?:disabled="sendCharactersDisabled"[\s\S]*?@click="distributeRoles"[\s\S]*?\$t\("menu\.sendCharacters"\)[\s\S]*?<\/button>/g,
);
assert(
  sendCharacterButtons && sendCharacterButtons.length === 2,
  "send character buttons should use role draw random-aware disabled state",
);

[
  "<RoleDrawInviteConfirm />",
  'import RoleDrawInviteConfirm from "@/components/RoleDrawInviteConfirm";',
].forEach((needle) =>
  assert(appSource.includes(needle), `app missing ${needle}`),
);

[
  "role-draw-invite-confirm",
  "drawRole",
  "remainingCount",
  "claimedSeat",
].forEach((needle) =>
  assert(inviteSource.includes(needle), `invite missing ${needle}`),
);
assert(
  /canDrawRole\(\) \{[\s\S]*?session\.sessionId[\s\S]*?session\.isSpectator[\s\S]*?roleDraw\.active[\s\S]*?session\.claimedSeat === this\.currentSeatIndex/.test(
    inviteSource,
  ),
  "invite should only show for the claimed player whose turn is active",
);
assert(
  /drawRole\(\) \{[\s\S]*?if \(!this\.canDrawRole\) return;[\s\S]*?roleDraw\/requestDraw/.test(
    inviteSource,
  ),
  "invite button should request a host-authoritative draw",
);

[
  "roleDrawSnapshot",
  "roleDraw/applySnapshot",
  "roleDraw/start",
  "roleDraw/drawCurrent",
  "roleDraw/cancel",
  "session.distributeRoles()",
].forEach((needle) =>
  assert(socketSource.includes(needle), `socket missing ${needle}`),
);
assert(
  /case "roleDraw:draw":[\s\S]*?_handleRoleDrawRequest/.test(socketSource) &&
    /_handleRoleDrawRequest\(\{ playerId, seatIndex \} = \{\}\) \{[\s\S]*?if \(this\._isSpectator\) return;[\s\S]*?seatIndex !== currentSeatIndex[\s\S]*?player\.id !== playerId[\s\S]*?roleDraw\/drawForCurrent/.test(
      socketSource,
    ) &&
    /if \(type === "roleDraw\/drawCurrent" && state\.roleDraw\.completed\) \{[\s\S]*?session\.distributeRoles\(\)/.test(
      socketSource,
    ),
  "socket should validate the active seat and player before drawing",
);
assert(
  /case "roleDraw\/requestDraw":[\s\S]*?session\.requestRoleDraw\(\)/.test(
    socketSource,
  ) &&
    /sendRoleDrawSnapshot\(\)[\s\S]*?roleDrawSnapshot: this\._store\.state\.roleDraw/.test(
      socketSource,
    ),
  "socket should forward player requests and sync role draw snapshots",
);
assert(
  /buildGamestate\(\)[\s\S]*?this\._store\.state\.players\.players\.map/.test(
    socketSource,
  ) &&
    /sendRoleDrawSnapshot\(\)[\s\S]*?gamestate: this\.buildGamestate\(\)/.test(
      socketSource,
    ),
  "role draw snapshot sync should include fresh player seats so players keep claimed seats while drawing",
);
assert(
  /watch:\s*\{[\s\S]*?nonTravelers\(\)[\s\S]*?this\.selectRandomRoles\(\)/.test(
    rolesModalSource,
  ),
  "roles modal should refresh the selected role pool when player count changes between rooms",
);

[
  "roleDraw:",
  "simulateRoleDraw",
  "drawButton",
  "remaining",
  "helpCurrentPlayerDraw",
].forEach((needle) =>
  assert(i18nSource.includes(needle), `i18n missing ${needle}`),
);

console.log("role draw source tests passed");
