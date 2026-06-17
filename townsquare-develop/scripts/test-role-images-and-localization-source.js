const assert = require("assert");
const fs = require("fs");
const path = require("path");

const roles = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../src/roles.json"), "utf8"),
);
const fabled = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../src/fabled.json"), "utf8"),
);

const hasChineseText = (value) => /[\u4e00-\u9fff]/.test(value || "");
const hasOfficialImage = (role) =>
  typeof role.image === "string" &&
  (role.image.startsWith(
    "https://oss.gstonegames.com/data_file/clocktower/role_icon/",
  ) ||
    role.image.startsWith("https://botc.app/assets/"));

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

const expectedTravelerNames = {
  bonecollector: "集骨者",
  cacklejack: "笑匠",
  gnome: "侏儒",
};

for (const id of travelerIds) {
  const role = roles.find((item) => item.id === id);

  assert(role, `missing default traveler role: ${id}`);
  assert.strictEqual(role.team, "traveler", `${id} should remain a traveler`);
  if (expectedTravelerNames[id]) {
    assert.strictEqual(
      role.name,
      expectedTravelerNames[id],
      `${id} should use the expected localized name`,
    );
  }
  assert(hasChineseText(role.name), `${id} name should be localized`);
  assert(hasChineseText(role.ability), `${id} ability should be localized`);
  assert(hasOfficialImage(role), `${id} should use an official image url`);
}

for (const role of fabled) {
  assert(hasChineseText(role.name), `${role.id} name should be localized`);
  assert(hasChineseText(role.ability), `${role.id} ability should be localized`);
  assert(hasOfficialImage(role), `${role.id} should use an official image url`);
}

console.log("role image and localization source tests passed");
