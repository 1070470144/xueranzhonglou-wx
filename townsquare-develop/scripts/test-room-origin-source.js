const assert = require("assert");
const fs = require("fs");
const path = require("path");

const serverSource = fs.readFileSync(
  path.join(__dirname, "../server/index.js"),
  "utf8"
);

[
  "localhost",
  "127\\.0\\.0\\.1",
  "\\[::1\\]",
  "192\\.168",
  "10(?:\\.\\d{1,3}){3}",
  "172\\.(?:1[6-9]|2\\d|3[0-1])"
].forEach(needle =>
  assert(
    serverSource.includes(needle),
    `allowed origin pattern should include ${needle}`
  )
);

console.log("room origin source tests passed");
