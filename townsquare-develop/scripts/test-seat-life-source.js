const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const playerSource = fs.readFileSync(
  path.join(root, "src/components/Player.vue"),
  "utf8",
);
const lifeAssetPath = path.join(root, "src/assets/life1.png");

assert(
  /\.life\s*\{[\s\S]*?background:\s*url\("\.\.\/assets\/life1\.png"\)\s+center\s+center;/.test(
    playerSource,
  ),
  "hidden seat life token should use the local life1.png asset",
);

assert(fs.existsSync(lifeAssetPath), "life1.png should be stored locally");

console.log("seat life source tests passed");
