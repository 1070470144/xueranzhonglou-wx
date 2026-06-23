const assert = require("assert");
const fs = require("fs");
const path = require("path");

const playerSource = fs.readFileSync(
  path.join(__dirname, "../src/components/Player.vue"),
  "utf8",
);

assert(
  !/\.circle\s+li:hover\s+\.reminder\.add/.test(playerSource),
  "Reminder add token should not rely on li:hover because circle seats disable pointer events on li",
);

assert(
  playerSource.includes(".player:hover ~ .reminder.add") &&
    playerSource.includes(".reminder.add:hover"),
  "Reminder add token should become visible when hovering the seat token or the reminder token itself",
);

console.log("reminder hover source tests passed");
