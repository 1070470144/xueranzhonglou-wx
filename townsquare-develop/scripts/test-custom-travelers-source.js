const assert = require("assert");
const fs = require("fs");
const path = require("path");

const storeSource = fs.readFileSync(
  path.join(__dirname, "../src/store/index.js"),
  "utf8",
);

assert(
  !storeSource.includes("const scriptHasTravelers = processedRoles.some("),
  "custom scripts should not hide default travelers when their JSON has no traveler roles",
);

assert(
  /state\.otherTravelers = new Map\([\s\S]*r\.team === "traveler"[\s\S]*!processedRoles\.some\(\(i\) => i\.id === r\.id\)[\s\S]*\.map\(\(role\) => \[role\.id, role\]\),[\s\S]*\);/.test(
    storeSource,
  ),
  "custom scripts should keep default travelers available, excluding traveler roles already in the script",
);

console.log("custom traveler source tests passed");
