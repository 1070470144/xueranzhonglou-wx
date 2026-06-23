const assert = require("assert");
const fs = require("fs");
const path = require("path");

const translationsSource = fs.readFileSync(
  path.join(__dirname, "../src/utils/reminderTranslations.js"),
  "utf8",
);
const playerSource = fs.readFileSync(
  path.join(__dirname, "../src/components/Player.vue"),
  "utf8",
);

[
  "Protected",
  "保护",
  "Drunk",
  "醉酒",
  "No ability",
  "无能力",
  "Evil wakes",
  "邪恶唤醒",
  "Poisoned",
  "中毒",
  "Dead",
  "死亡",
  "Executed",
  "已处决",
].forEach((needle) =>
  assert(
    translationsSource.includes(needle),
    `translation map missing ${needle}`,
  ),
);

assert(
  playerSource.includes("translateOfficialReminder"),
  "Player should import reminder translation for already placed tokens",
);
assert(
  playerSource.includes("displayReminderName(reminder)"),
  "Player template should render translated reminder names",
);
assert(
  !playerSource.includes('<span class="text">{{ reminder.name }}</span>'),
  "Player should not render raw English official reminder names",
);

console.log("reminder translation source tests passed");
