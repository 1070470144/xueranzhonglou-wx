const assert = require("assert");
const fs = require("fs");
const path = require("path");

const roles = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../src/roles.json"), "utf8"),
);

const travelerIds = [
  "bureaucrat",
  "thief",
  "gunslinger",
  "scapegoat",
  "beggar",
  "apprentice",
  "matron",
  "judge",
  "bishop",
  "voudon",
  "barista",
  "harlot",
  "butcher",
  "bonecollector",
  "deviant",
  "gangster",
  "cacklejack",
  "gnome",
];

const hasChineseText = (value) => /[\u4e00-\u9fff]/.test(value || "");

for (const id of travelerIds) {
  const role = roles.find((item) => item.id === id);

  assert(role, `missing default traveler role: ${id}`);
  assert.strictEqual(role.team, "traveler", `${id} should remain a traveler`);
  assert(hasChineseText(role.name), `${id} name should be localized`);
  assert(hasChineseText(role.ability), `${id} ability should be localized`);
}

console.log("traveler localization source tests passed");
