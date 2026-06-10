const assert = require("assert");
const fs = require("fs");
const path = require("path");

const storeSource = fs.readFileSync(path.join(__dirname, "../src/store/modules/voice.js"), "utf8");

[
  "inviteRejection",
  "receiveInviteRejection(state, payload)",
  "dismissInviteRejection(state)",
  "state.inviteRejection = payload || null",
  "state.inviteRejection = null"
].forEach(needle => assert(storeSource.includes(needle), `voice store missing ${needle}`));

console.log("voice store source tests passed");
