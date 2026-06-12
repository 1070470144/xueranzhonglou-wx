const assert = require("assert");
const fs = require("fs");
const path = require("path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

const menuSource = read("src/components/Menu.vue");

const sliceBetween = (start, end) => {
  const startIndex = menuSource.indexOf(start);
  const endIndex = menuSource.indexOf(end);
  assert(startIndex >= 0, `missing start marker ${start}`);
  assert(endIndex > startIndex, `missing end marker ${end}`);
  return menuSource.slice(startIndex, endIndex);
};

const grimoireTemplate = sliceBetween(
  '<template v-if="tab === \'grimoire\'">',
  '<template v-if="tab === \'settings\'">',
);
const settingsTemplate = sliceBetween(
  '<template v-if="tab === \'settings\'">',
  '<template v-if="tab === \'session\'">',
);
const sessionTemplate = sliceBetween(
  '<template v-if="tab === \'session\'">',
  '<template v-if="tab === \'help\'">',
);
const helpTemplate = menuSource.slice(
  menuSource.indexOf('<template v-if="tab === \'help\'">'),
);

[
  "menu.voteHistory",
  "menu.referenceSheet",
  "menu.nightOrderSheet",
  "menu.webLogin",
].forEach((needle) => {
  assert(grimoireTemplate.includes(needle), `${needle} should be in grimoire tab`);
  assert(!settingsTemplate.includes(needle), `${needle} should move out of settings tab`);
  assert(!sessionTemplate.includes(needle), `${needle} should move out of session tab`);
  assert(!helpTemplate.includes(needle), `${needle} should move out of help tab`);
});

assert(
  grimoireTemplate.includes('toggleModal("voteHistory")') ||
    grimoireTemplate.includes("toggleModal('voteHistory')"),
  "grimoire tab should open vote history",
);
assert(
  grimoireTemplate.includes('toggleModal("reference")') ||
    grimoireTemplate.includes("toggleModal('reference')"),
  "grimoire tab should open the role reference sheet",
);
assert(
  grimoireTemplate.includes('toggleModal("nightOrder")') ||
    grimoireTemplate.includes("toggleModal('nightOrder')"),
  "grimoire tab should open the night order sheet",
);
assert(
  grimoireTemplate.includes('toggleModal("login")') ||
    grimoireTemplate.includes("toggleModal('login')"),
  "grimoire tab should open web login when logged out",
);
assert(
  grimoireTemplate.includes("logoutWeb"),
  "grimoire tab should expose web logout when logged in",
);

console.log("menu grimoire entry placement source tests passed");
