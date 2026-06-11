const assert = require("assert");
const fs = require("fs");
const path = require("path");

const serverSource = fs.readFileSync(path.join(__dirname, "../server/index.js"), "utf8");
const socketSource = fs.readFileSync(path.join(__dirname, "../src/store/socket.js"), "utf8");
const storeSource = fs.readFileSync(path.join(__dirname, "../src/store/index.js"), "utf8");
const appSource = fs.readFileSync(path.join(__dirname, "../src/App.vue"), "utf8");
const stressStatePath = path.join(__dirname, "test-voice-rooms-stress.js");
const stressSocketPath = path.join(__dirname, "test-voice-websocket-stress.js");

assert(fs.existsSync(stressStatePath), "voice room state stress test should exist");
assert(fs.existsSync(stressSocketPath), "voice websocket stress test should exist");

[
  'const voiceRooms = require("./voiceRooms")',
  "TOWNSQUARE_WS_PORT",
  "sendVoiceState(room)",
  "registerVoiceParticipant(room, ws)",
  'command.indexOf("voice:") === 0',
  'case "voice:state:get"',
  'case "voice:invite:create"',
  'case "voice:invite:respond"',
  'case "voice:channel:join"',
  'case "voice:channel:leave"',
  'case "voice:muteAll:set"',
  'case "voice:recall:start"',
  'case "voice:recall:execute"',
  'case "voice:speaking:set"',
  'case "voice:signal"',
  'sendJson(targetWs, "voice:signal"',
  'sendJson(findRoomClient(room, rejectedInvite.fromId), "voice:invite:rejected"',
  'sendJson(ws, "voice:error"'
].forEach(needle => assert(serverSource.includes(needle), `server missing ${needle}`));

[
  'case "voice:state"',
  'case "voice:error"',
  'case "voice:invite:rejected"',
  'case "voice:signal"',
  'voice/setState',
  'voice/setError',
  'voice/receiveInviteRejection',
  'voice/receiveSignal',
  "requestVoiceState()",
  "createVoiceInvite(payload)",
  "respondVoiceInvite(payload)",
  "joinVoiceChannel(channelId)",
  "leaveVoiceChannel()",
  "setVoiceMuteAll(value)",
  "startVoiceRecall()",
  "executeVoiceRecall()",
  "setVoiceSpeaking(payload)",
  "sendVoiceSignal(payload)",
  'case "voice/requestState"',
  'case "voice/createInvite"',
  'case "voice/respondInvite"',
  'case "voice/joinChannel"',
  'case "voice/leaveChannel"',
  'case "voice/setMuteAll"',
  'case "voice/startRecall"',
  'case "voice/executeRecall"',
  'case "voice/sendSpeakingState"',
  'case "voice/sendSignal"'
].forEach(needle => assert(socketSource.includes(needle), `socket missing ${needle}`));

[
  '_send("voice:speaking:set"',
  "speaking: !!(payload && payload.speaking)"
].forEach(needle => assert(socketSource.includes(needle), `voice speaking socket missing ${needle}`));

assert(storeSource.includes('import voice from "./modules/voice"'), "store should import voice module");
assert(storeSource.includes("voice"), "store should register voice module");
assert(appSource.includes("VoicePanel"), "app should render voice panel");

console.log("voice source wiring tests passed");
