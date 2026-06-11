const assert = require("assert");
const fs = require("fs");
const path = require("path");

const storeSource = fs.readFileSync(path.join(__dirname, "../src/store/modules/voice.js"), "utf8");

[
  "inviteRejection",
  "receiveInviteRejection(state, payload)",
  "dismissInviteRejection(state)",
  "state.inviteRejection = payload || null",
  "state.inviteRejection = null",
  'talkMode: "free"',
  "pushToTalkActive: false",
  "speaking: false",
  "listenVolume: 1",
  "effectiveMicEnabled",
  "setTalkMode(state, value)",
  "setPushToTalkActive(state, value)",
  "setSpeaking(state, value)",
  "syncOwnParticipantSpeaking",
  "setListenVolume(state, value)",
  "sendSpeakingState()"
].forEach(needle => assert(storeSource.includes(needle), `voice store missing ${needle}`));

assert(
  /function syncOwnParticipantSpeaking[\s\S]*?participant\.speaking = speaking/.test(storeSource),
  "voice store should keep the local participant speaking flag in sync for seat icons"
);

assert(
  /setSpeaking\(state, value\)[\s\S]*?syncOwnParticipantSpeaking\(state/.test(storeSource),
  "setSpeaking should update the matching participant as well as local voice.speaking"
);

console.log("voice store source tests passed");
