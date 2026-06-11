const assert = require("assert");
const fs = require("fs");
const path = require("path");

const componentPath = path.join(__dirname, "../src/components/VoicePanel.vue");
const inviteConfirmPath = path.join(__dirname, "../src/components/VoiceInviteConfirm.vue");
const drawerPath = path.join(__dirname, "../src/components/RoomControlDrawer.vue");
const playerPath = path.join(__dirname, "../src/components/Player.vue");
const menuPath = path.join(__dirname, "../src/components/Menu.vue");
const i18nPath = path.join(__dirname, "../src/i18n/index.js");
const mainPath = path.join(__dirname, "../src/main.js");
const appPath = path.join(__dirname, "../src/App.vue");

assert(fs.existsSync(componentPath), "VoicePanel component should exist");
assert(fs.existsSync(inviteConfirmPath), "VoiceInviteConfirm component should exist");

const source = fs.readFileSync(componentPath, "utf8");
const inviteConfirmSource = fs.readFileSync(inviteConfirmPath, "utf8");
const drawerSource = fs.readFileSync(drawerPath, "utf8");
const playerSource = fs.readFileSync(playerPath, "utf8");
const menuSource = fs.readFileSync(menuPath, "utf8");
const i18nSource = fs.readFileSync(i18nPath, "utf8");
const mainSource = fs.readFileSync(mainPath, "utf8");
const appSource = fs.readFileSync(appPath, "utf8");

[
  "VoicePeerManager",
  "requestVoiceState",
  "syncVoice",
  "flushSignals",
  "sendSignal",
  "effectiveMicEnabled",
  "listenVolume",
  "onSpeakingChange",
  "voice/sendSpeakingState"
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
  "voice.talkMode",
  "voice.freeTalk",
  "voice.pushToTalk",
  "voice.holdToTalk",
  "voice.listenVolume",
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
  "voice.speaking",
  "voice.pushToTalkHint",
  "voice.storytellerSpeaking",
].forEach(needle => assert(appSource.includes(needle), `App missing ${needle}`));

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

[
  "voice-mode-toggle",
  "voice-hold-button",
  "voice-volume-control",
  "setPushToTalkActive",
  "setListenVolume",
].forEach(needle => assert(drawerSource.includes(needle), `RoomControlDrawer missing ${needle}`));

[
  "voice-hint",
  "voiceHintText",
  "keydown",
  "keyup",
  "F2",
].forEach(needle => assert(appSource.includes(needle), `App missing ${needle}`));

assert(
  appSource.includes('<Menu ref="menu" :voice-hint-text="voiceHintText"></Menu>'),
  "App should pass voice hint text into the top-right controls menu"
);

assert(
  !appSource.includes('<span v-if="voiceHintText" class="voice-hint"'),
  "voice hint should not be absolutely positioned at the App root"
);

assert(
  !/keyup\(\{\s*key[\s\S]*preventDefault/.test(appSource),
  "App keyup should keep the native KeyboardEvent object so preventDefault keeps its browser binding"
);

assert(
  !/\.voice-hint\s*\{[\s\S]*?position:\s*absolute/.test(appSource),
  "voice hint should not use app-level absolute positioning"
);

assert(
  /props:\s*\{[\s\S]*?voiceHintText/.test(menuSource),
  "Menu should accept the voice hint text"
);

assert(
  /<div id="controls">\s*<span v-if="voiceHintText" class="voice-hint"/.test(menuSource),
  "voice hint should be the leftmost item in the top-right controls group"
);

assert(
  /#controls[\s\S]*?voice-hint/.test(menuSource),
  "voice hint should be styled inside the top-right controls group"
);

assert(
  /#controls\s+span\.voice-hint[\s\S]*?max-width:\s*6em/.test(menuSource),
  "mobile voice hint should use the same compact controls-row treatment as announcement"
);

const voiceHintStyleMatch = menuSource.match(/span\.voice-hint\s*\{([\s\S]*?)\n\s*\}/);
assert(voiceHintStyleMatch, "Menu should style the voice hint");
assert(
  !/(font-size|line-height|border-color|background):/.test(voiceHintStyleMatch[1]),
  "voice hint should inherit announcement/control button height and visual style"
);

const controlButtonStyleMatch = menuSource.match(/#controls\s*\{[\s\S]*?> span\s*\{([\s\S]*?)\n\s*\}/);
assert(controlButtonStyleMatch, "top-right controls should define shared button styles");
assert(
  /height:\s*26px/.test(controlButtonStyleMatch[1]) &&
    /min-height:\s*0/.test(controlButtonStyleMatch[1]) &&
    /line-height:\s*1/.test(controlButtonStyleMatch[1]) &&
    /font-size:\s*16px/.test(controlButtonStyleMatch[1]) &&
    /vertical-align:\s*top/.test(controlButtonStyleMatch[1]),
  "top-right control buttons should use a fixed pixel height and top alignment so text-only voice hints match announcement height"
);

assert(
  /syncSpeakingIntent\(\)[\s\S]*?effectiveMicEnabled[\s\S]*?voice\/sendSpeakingState/.test(source),
  "VoicePanel should publish speaking intent from the current talk state instead of waiting for detected audio"
);

[
  "seat-speaking-icon",
  "seat-voice-icon",
  "seat-voice-inactive",
  "showVoiceStatusIcon",
  "isVoiceSpeaking",
  "participant.speaking",
  "this.session.playerId",
  "this.voice.speaking",
  "volume-up"
].forEach(needle => assert(playerSource.includes(needle), `Player missing ${needle}`));

assert(
  /isVoiceSpeaking:[\s\S]*?this\.player\.id === this\.session\.playerId[\s\S]*?this\.voice\.speaking/.test(playerSource),
  "current player's seat speaker should light immediately from local speaking intent"
);

assert(
  /v-if="showVoiceStatusIcon"[\s\S]*?:class="\{[\s\S]*?'seat-speaking-icon': isVoiceSpeaking[\s\S]*?'seat-voice-inactive': !isVoiceSpeaking/.test(playerSource),
  "player seats should show yellow speaker while speaking and red speaker while not speaking"
);

assert(mainSource.includes('"VolumeUp"'), "main icons should keep volume icon available");
assert(mainSource.includes('"VolumeMute"'), "main icons should keep mute icon available");

console.log("voice UI source tests passed");
