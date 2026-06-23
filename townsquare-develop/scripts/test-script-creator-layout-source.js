const assert = require("assert");
const fs = require("fs");
const path = require("path");

const modalSource = fs.readFileSync(
  path.join(__dirname, "../src/components/modals/ScriptCreatorModal.vue"),
  "utf8",
);

const styleStart = modalSource.indexOf('<style lang="scss" scoped>');
assert(styleStart >= 0, "script creator modal should keep scoped styles");
const styleSource = modalSource.slice(styleStart);

assert(
  /::v-deep\s+\.modal\s*\{[\s\S]*?(^|\n)\s*width:\s*min\(1240px,\s*calc\(100vw - 1\.5em\)\)/m.test(
    styleSource,
  ),
  "script creator modal should set a fixed responsive width so empty role categories do not shrink the panel",
);

assert(
  /::v-deep\s+\.modal > \.slot\s*\{[\s\S]*?overflow:\s*hidden/.test(
    styleSource,
  ),
  "script creator modal slot should hide outer overflow so the inner role browser owns scrolling",
);

assert(
  /\.script-workspace\s*\{[\s\S]*?width:\s*100%/.test(styleSource),
  "script creator workspace should fill the stable modal width",
);

assert(
  /\.role-browser\s*\{[\s\S]*?scrollbar-gutter:\s*stable/.test(styleSource),
  "role browser should reserve scrollbar space so populated and empty categories keep the same inner width",
);

assert(
  modalSource.includes('<aside class="creator-controls">') &&
    modalSource.includes('<section class="role-picker-panel">') &&
    modalSource.includes('<aside class="selected-preview">') &&
    modalSource.indexOf('<aside class="creator-controls">') <
      modalSource.indexOf('<section class="role-picker-panel">') &&
    modalSource.indexOf('<section class="role-picker-panel">') <
      modalSource.indexOf('<aside class="selected-preview">'),
  "script creator should render controls, role picker, and selected preview as three columns",
);

assert(
  /\.script-workspace\s*\{[\s\S]*?grid-template-columns:[\s\S]*?minmax\(240px,\s*280px\)[\s\S]*?minmax\(420px,\s*1fr\)[\s\S]*?minmax\(\s*320px,\s*400px\s*\)/.test(
    styleSource,
  ),
  "script creator desktop layout should use fixed side columns and a flexible center role picker",
);

assert(
  /\.creator-controls\s*\{[\s\S]*?grid-template-rows:[\s\S]*?auto\s+auto\s+auto\s+minmax\(0,\s*1fr\)\s+auto/.test(
    styleSource,
  ),
  "script creator left controls should stay compact and reserve filler space before actions",
);

assert(
  modalSource.includes("collapsedRoleTeams: {}") &&
    modalSource.includes("isRoleSectionCollapsed(team)") &&
    modalSource.includes("toggleRoleSection(team)"),
  "script creator role picker should track and toggle collapsed role sections",
);

assert(
  modalSource.includes("@click=\"removeSelectedRole(team, role.id)\"") &&
    modalSource.includes("removeSelectedRole(team, roleId)"),
  "selected preview roles should expose a remove action wired to selection state",
);

assert(
  /sourceFilter === ROLE_SOURCE_PUBLIC_CUSTOM[\s\S]*?role\.sourceType === ROLE_SOURCE_MINE/.test(
    modalSource,
  ),
  "script creator custom source filter should include my uploaded custom roles",
);

console.log("script creator layout source tests passed");
