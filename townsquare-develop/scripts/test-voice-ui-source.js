const assert = require("assert");
const fs = require("fs");
const path = require("path");

const componentPath = path.join(__dirname, "../src/components/VoicePanel.vue");
const inviteConfirmPath = path.join(__dirname, "../src/components/VoiceInviteConfirm.vue");
const drawerPath = path.join(__dirname, "../src/components/RoomControlDrawer.vue");
const i18nPath = path.join(__dirname, "../src/i18n/index.js");
const mainPath = path.join(__dirname, "../src/main.js");
const appPath = path.join(__dirname, "../src/App.vue");

assert(fs.existsSync(componentPath), "VoicePanel component should exist");
assert(fs.existsSync(inviteConfirmPath), "VoiceInviteConfirm component should exist");

const source = fs.readFileSync(componentPath, "utf8");
const inviteConfirmSource = fs.readFileSync(inviteConfirmPath, "utf8");
const drawerSource = fs.readFileSync(drawerPath, "utf8");
const i18nSource = fs.readFileSync(i18nPath, "utf8");
const mainSource = fs.readFileSync(mainPath, "utf8");
const appSource = fs.readFileSync(appPath, "utf8");

[
  "VoicePeerManager",
  "requestVoiceState",
  "syncVoice",
  "flushSignals",
  "sendSignal"
].forEach(needle => assert(source.includes(needle), `VoicePanel missing ${needle}`));

assert(!source.includes("voice-toggle"), "VoicePanel should not render the left-bottom voice chat button");
assert(!source.includes("voice-panel-shell"), "VoicePanel should not render a floating voice chat panel");

assert(
  source.includes("voice-runtime"),
  "VoicePanel should remain mounted as an invisible WebRTC runtime"
);

assert(appSource.includes("<VoiceInviteConfirm />"), "App should mount the voice invite confirm overlay");
assert(appSource.includes("VoiceInviteConfirm"), "App should register the voice invite confirm component");

[
  "voice-invite-confirm",
  "activeInvite",
  "pendingInvites",
  "inviteRejection",
  "inviteSenderName",
  "inviteRejectionText",
  "respondVoiceInvite",
  "dismissInviteRejection",
  "voice.inviteFrom",
  "voice.rejectedBy",
  "voice.accept",
  "voice.reject",
  "voice.dismiss",
  "voice/setEnabled",
  "true",
  "voice/respondInvite",
  "voice/dismissInviteRejection"
].forEach(needle => assert(inviteConfirmSource.includes(needle), `VoiceInviteConfirm missing ${needle}`));

assert(
  /voice-invite-confirm[\s\S]*?position:\s*fixed[\s\S]*?left:/.test(inviteConfirmSource),
  "VoiceInviteConfirm should be positioned on the left side of the main UI"
);

assert(
  /canCreateVoiceInvite\(\)[\s\S]*?!this\.recallActive[\s\S]*?this\.selectedInviteIds\.length > 0/.test(drawerSource),
  "room control should let players start a private voice invite before manually joining voice"
);

assert(
  /createVoiceInvite\(\)[\s\S]*?voice\/setEnabled", true[\s\S]*?voice\/createInvite/.test(drawerSource),
  "creating a private voice invite from room control should automatically enter voice"
);

assert(
  /targetOptions\(\)[\s\S]*?id:\s*"host"[\s\S]*?privateChat\.host[\s\S]*?this\.room\.players/.test(drawerSource),
  "room control voice targets should include the storyteller for player invitations"
);

[
  "voice.entry",
  "voice.connect",
  "voice.disconnect",
  "voice.storytellerControls",
  "voice.channels",
  "voice.invite",
  "voice.accept",
  "voice.reject",
  "voice.createPrivate",
  "voice.muteAll",
  "voice.recallAll",
  "pendingInvites",
  "targetOptions",
  "selectedInviteIds",
  "toggleVoice",
  "toggleMic",
  "createVoiceInvite",
  "respondVoiceInvite",
  "voiceChannelName",
  "voiceChannelMembers",
  "joinVoiceChannel",
  "setVoiceMuteAll",
  "startVoiceRecall"
].forEach(needle => assert(drawerSource.includes(needle), `RoomControlDrawer missing ${needle}`));

[
  "voice:",
  "title:",
  "channels:",
  "invite:",
  "entry:",
  "rejectedBy:",
  "dismiss:",
  "muteAll:",
  "recallAll:"
].forEach(needle => assert(i18nSource.includes(needle), `i18n missing ${needle}`));

assert(mainSource.includes('"VolumeUp"'), "main icons should keep volume icon available");
assert(mainSource.includes('"VolumeMute"'), "main icons should keep mute icon available");

console.log("voice UI source tests passed");
