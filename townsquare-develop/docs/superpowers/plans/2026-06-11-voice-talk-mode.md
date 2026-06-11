# Voice Talk Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add free-talk / push-to-talk voice modes, real speaking indicators, storyteller voice hint, and a global listen-volume slider.

**Architecture:** Keep personal controls in the `voice` Vuex module and local persistence, keep real-time speaking state in `server/voiceRooms.js`, and let `VoicePeerManager` own microphone analysis plus remote playback volume. UI reads the same voice state snapshot everywhere so reconnect and refresh restore server data consistently.

**Tech Stack:** Vue 2, Vuex 3, WebSocket room commands, WebRTC `RTCPeerConnection`, browser Web Audio API, Node assertion test scripts.

---

## File Structure

- Modify `scripts/test-voice-store-source.js`: source assertions for local talk mode, push-to-talk, speaking, and listen volume state.
- Modify `scripts/test-voice-source.js`: WebSocket command wiring assertions for `voice:speaking:set`.
- Modify `scripts/test-voice-rooms.js`: behavior tests for participant `speaking` summary and clearing.
- Modify `scripts/test-voice-peer-manager.js`: behavior tests for listen volume, speaking transitions, and cleanup.
- Modify `scripts/test-voice-ui-source.js`: source assertions for drawer controls, top-right hint, player icon, and i18n keys.
- Modify `src/store/modules/voice.js`: local voice preferences, effective mic getter, speaking state, and no-op command mutation.
- Modify `src/store/persistence.js`: load and save `voiceTalkMode` and `voiceListenVolume`.
- Modify `src/store/socket.js`: send `voice:speaking:set` to server.
- Modify `server/voiceRooms.js`: add participant `speaking`, `setSpeaking`, and clear rules.
- Modify `server/index.js`: route `voice:speaking:set` and broadcast updated voice state.
- Modify `src/services/voicePeer.js`: apply global listen volume and emit real audio speaking transitions.
- Modify `src/components/VoicePanel.vue`: pass effective mic and listen volume into the manager; forward speaking transitions to store/server.
- Modify `src/components/RoomControlDrawer.vue`: add talk mode segmented control, hold-to-talk button, and listen-volume slider.
- Modify `src/components/Player.vue`: show flashing speaker icon for speaking seated players.
- Modify `src/App.vue`: render compact top-right voice hint and install F2 / blur / visibility push-to-talk handlers.
- Modify `src/i18n/index.js`: add Chinese and English labels for new voice controls and hints.

---

### Task 1: Store, Persistence, and Socket Contract

**Files:**
- Modify: `scripts/test-voice-store-source.js`
- Modify: `scripts/test-voice-source.js`
- Modify: `src/store/modules/voice.js`
- Modify: `src/store/persistence.js`
- Modify: `src/store/socket.js`

- [ ] **Step 1: Write failing store and socket source tests**

Add these required strings to `scripts/test-voice-store-source.js`:

```js
[
  "talkMode: \"free\"",
  "pushToTalkActive: false",
  "speaking: false",
  "listenVolume: 1",
  "effectiveMicEnabled",
  "setTalkMode(state, value)",
  "setPushToTalkActive(state, value)",
  "setSpeaking(state, value)",
  "setListenVolume(state, value)",
  "sendSpeakingState()"
].forEach(needle => assert(storeSource.includes(needle), `voice store missing ${needle}`));
```

Add these required strings to `scripts/test-voice-source.js`:

```js
[
  'case "voice:speaking:set"',
  "setVoiceSpeaking(payload)",
  'case "voice/sendSpeakingState"',
  'command: "voice:speaking:set"'
].forEach(needle => assert(socketSource.includes(needle), `voice speaking socket missing ${needle}`));
```

- [ ] **Step 2: Run tests and verify red**

Run:

```bash
node scripts/test-voice-store-source.js
node scripts/test-voice-source.js
```

Expected: both fail because the new store fields and WebSocket command are missing.

- [ ] **Step 3: Implement Vuex voice state**

In `src/store/modules/voice.js`, add state fields:

```js
talkMode: "free",
pushToTalkActive: false,
speaking: false,
listenVolume: 1,
```

Add getter:

```js
effectiveMicEnabled(state) {
  return state.talkMode === "pushToTalk"
    ? state.pushToTalkActive
    : state.micEnabled;
},
```

Add mutations:

```js
setTalkMode(state, value) {
  state.talkMode = value === "pushToTalk" ? "pushToTalk" : "free";
  state.pushToTalkActive = false;
  if (state.talkMode === "pushToTalk") state.micEnabled = false;
},
setPushToTalkActive(state, value) {
  state.pushToTalkActive = state.talkMode === "pushToTalk" && !!value;
},
setSpeaking(state, value) {
  state.speaking = !!value;
},
setListenVolume(state, value) {
  const number = Number(value);
  state.listenVolume = Number.isFinite(number)
    ? Math.min(1, Math.max(0, number))
    : 1;
},
sendSpeakingState() {},
```

Update `setEnabled` and `clear` so disabling voice clears `pushToTalkActive` and `speaking`.

- [ ] **Step 4: Implement persistence**

In `src/store/persistence.js`, load `voiceTalkMode` and `voiceListenVolume` from local storage during existing preference hydration. Persist the same keys when `voice.talkMode` or `voice.listenVolume` changes.

Use these exact keys:

```js
voiceTalkMode
voiceListenVolume
```

- [ ] **Step 5: Implement socket command**

In `src/store/socket.js`, add action helper:

```js
setVoiceSpeaking(payload) {
  send({
    command: "voice:speaking:set",
    speaking: !!(payload && payload.speaking),
  });
}
```

Add mutation command case:

```js
case "voice/sendSpeakingState":
  setVoiceSpeaking(payload);
  break;
```

- [ ] **Step 6: Run tests and verify green**

Run:

```bash
node scripts/test-voice-store-source.js
node scripts/test-voice-source.js
```

Expected: both pass.

---

### Task 2: Server Speaking State

**Files:**
- Modify: `scripts/test-voice-rooms.js`
- Modify: `server/voiceRooms.js`
- Modify: `server/index.js`

- [ ] **Step 1: Write failing server behavior tests**

Add cases to `scripts/test-voice-rooms.js`:

```js
{
  const state = createThreePersonVoiceState();
  voiceRooms.setSpeaking(state, { participantId: "p1", speaking: true });
  const snapshot = voiceRooms.summarize(state);
  assert.strictEqual(snapshot.participants.find(item => item.id === "p1").speaking, true);
  assert.strictEqual(snapshot.participants.find(item => item.id === "p2").speaking, false);
}

{
  const state = createThreePersonVoiceState();
  voiceRooms.setSpeaking(state, { participantId: "p1", speaking: true });
  voiceRooms.unregisterParticipant(state, "p1");
  const snapshot = voiceRooms.summarize(state);
  assert.strictEqual(snapshot.participants.some(item => item.id === "p1"), false);
}

{
  const state = createThreePersonVoiceState();
  voiceRooms.setSpeaking(state, { participantId: "p1", speaking: true });
  voiceRooms.setMuteAll(state, { byId: "host", value: true });
  const snapshot = voiceRooms.summarize(state);
  assert.strictEqual(snapshot.participants.find(item => item.id === "p1").speaking, false);
}
```

- [ ] **Step 2: Run test and verify red**

Run:

```bash
node scripts/test-voice-rooms.js
```

Expected: fail with `voiceRooms.setSpeaking is not a function`.

- [ ] **Step 3: Implement server state**

In `server/voiceRooms.js`, initialize each participant with:

```js
speaking: false,
```

Include it in participant summaries:

```js
speaking: participant.speaking === true,
```

Add export:

```js
function setSpeaking(state, { participantId, speaking }) {
  const participant = state.participants.get(participantId);
  if (!participant) throw new Error("participant_not_found");
  participant.speaking = speaking === true && canSpeak(state, participantId);
}
```

When mute-all changes or participants are removed, ensure non-speaking participants stay false and muted non-host players are set to `false`.

- [ ] **Step 4: Implement WebSocket route**

In `server/index.js`, add:

```js
case "voice:speaking:set":
  voiceRooms.setSpeaking(voiceState, {
    participantId: voiceParticipantId(ws),
    speaking: message.speaking === true,
  });
  sendVoiceState(room);
  break;
```

- [ ] **Step 5: Run tests and verify green**

Run:

```bash
node scripts/test-voice-rooms.js
node scripts/test-voice-source.js
```

Expected: both pass.

---

### Task 3: Peer Manager Audio Volume and Speaking Detection

**Files:**
- Modify: `scripts/test-voice-peer-manager.js`
- Modify: `src/services/voicePeer.js`

- [ ] **Step 1: Write failing peer manager tests**

Add tests to `scripts/test-voice-peer-manager.js` for:

```js
async function testListenVolumeAppliesToExistingAndFutureAudio() {
  const { VoicePeerManager, createdAudioElements } = loadVoicePeerManager();
  const manager = new VoicePeerManager({ sendSignal: () => {} });
  manager.setListenVolume(0.35);
  await manager.sync({ ownId: "p1", channelId: "main", members: [{ id: "p1" }, { id: "p2" }], enabled: true, micEnabled: true, canSpeak: true });
  manager.peers.get("p2").pc.ontrack({ streams: [{ id: "remote" }] });
  assert.strictEqual(createdAudioElements[0].volume, 0.35);
  manager.setListenVolume(0.8);
  assert.strictEqual(createdAudioElements[0].volume, 0.8);
}
```

Add a fake `AudioContext` sandbox and a test that calls the manager's sampling method with high and low analyser values, then asserts `onSpeakingChange(true)` and `onSpeakingChange(false)` are emitted only on transitions.

- [ ] **Step 2: Run test and verify red**

Run:

```bash
node scripts/test-voice-peer-manager.js
```

Expected: fail because `setListenVolume` and speaking analysis do not exist.

- [ ] **Step 3: Implement listen volume**

In `src/services/voicePeer.js`, add constructor field:

```js
this.listenVolume = 1;
```

Add method:

```js
setListenVolume(value) {
  const number = Number(value);
  this.listenVolume = Number.isFinite(number)
    ? Math.min(1, Math.max(0, number))
    : 1;
  this.peers.forEach((peer) => {
    if (peer.audio) peer.audio.volume = this.listenVolume;
  });
}
```

When creating audio elements in `attachRemoteStream`, set:

```js
peer.audio.volume = this.listenVolume;
```

- [ ] **Step 4: Implement speaking detection**

Extend constructor:

```js
this.onSpeakingChange = onSpeakingChange || (() => {});
this.audioContext = null;
this.analyser = null;
this.analyserBuffer = null;
this.speaking = false;
this.speakingAboveSince = 0;
this.speakingBelowSince = 0;
this.speakingTimer = null;
```

After local stream creation, call `startSpeakingDetection()`. In `applyMicrophoneState`, if the effective microphone is off, call `setSpeaking(false)`.

Use an analyser loop with start delay around `150` ms and stop delay around `500` ms. Catch Web Audio setup errors and leave voice working.

- [ ] **Step 5: Run test and verify green**

Run:

```bash
node scripts/test-voice-peer-manager.js
```

Expected: pass.

---

### Task 4: Runtime Wiring

**Files:**
- Modify: `src/components/VoicePanel.vue`
- Modify: `src/store/modules/voice.js`

- [ ] **Step 1: Write failing source assertions**

In `scripts/test-voice-ui-source.js`, assert `VoicePanel.vue` includes:

```js
"effectiveMicEnabled",
"listenVolume",
"onSpeakingChange",
"voice/sendSpeakingState"
```

- [ ] **Step 2: Run test and verify red**

Run:

```bash
node scripts/test-voice-ui-source.js
```

Expected: fail because runtime wiring is missing.

- [ ] **Step 3: Implement runtime sync**

In `VoicePanel.vue`, map `talkMode`, `listenVolume`, and `speaking`. Use:

```js
effectiveMicEnabled() {
  return this.$store.getters["voice/effectiveMicEnabled"];
}
```

Pass `micEnabled: this.effectiveMicEnabled` into `manager.sync()`. Watch `listenVolume` and call `manager.setListenVolume(value)`.

Create manager with:

```js
onSpeakingChange: (speaking) => {
  this.$store.commit("voice/setSpeaking", speaking);
  this.$store.commit("voice/sendSpeakingState", { speaking });
},
```

- [ ] **Step 4: Run test and verify green**

Run:

```bash
node scripts/test-voice-ui-source.js
```

Expected: pass.

---

### Task 5: Drawer Controls, F2 Handling, and Hint

**Files:**
- Modify: `scripts/test-voice-ui-source.js`
- Modify: `src/components/RoomControlDrawer.vue`
- Modify: `src/App.vue`
- Modify: `src/i18n/index.js`

- [ ] **Step 1: Write failing UI source assertions**

In `scripts/test-voice-ui-source.js`, assert:

```js
[
  "voice.talkMode",
  "voice.freeTalk",
  "voice.pushToTalk",
  "voice.holdToTalk",
  "voice.listenVolume",
  "setPushToTalkActive",
  "voice-hint",
  "voiceHintText",
  "keydown",
  "keyup",
  "F2"
].forEach(needle => assert(drawerSource.includes(needle) || appSource.includes(needle) || i18nSource.includes(needle), `voice UI missing ${needle}`));
```

- [ ] **Step 2: Run test and verify red**

Run:

```bash
node scripts/test-voice-ui-source.js
```

Expected: fail because new labels and controls are missing.

- [ ] **Step 3: Implement drawer controls**

Under the existing voice section in `RoomControlDrawer.vue`, add:

```html
<div class="voice-mode-toggle">
  <button type="button" :class="{ active: talkMode === 'free' }" @click="setTalkMode('free')">{{ $t("voice.freeTalk") }}</button>
  <button type="button" :class="{ active: talkMode === 'pushToTalk' }" @click="setTalkMode('pushToTalk')">{{ $t("voice.pushToTalk") }}</button>
</div>
<button
  v-if="talkMode === 'pushToTalk'"
  type="button"
  class="voice-hold-button"
  @pointerdown.prevent="setPushToTalkActive(true)"
  @pointerup.prevent="setPushToTalkActive(false)"
  @pointercancel.prevent="setPushToTalkActive(false)"
  @pointerleave.prevent="setPushToTalkActive(false)"
>
  {{ $t("voice.holdToTalk") }}
</button>
<label class="voice-volume-control">
  <span>{{ $t("voice.listenVolume") }}</span>
  <input type="range" min="0" max="100" :value="Math.round(listenVolume * 100)" @input="setListenVolume($event.target.value / 100)" />
</label>
```

- [ ] **Step 4: Implement F2 and hint**

In `App.vue`, install `keydown`, `keyup`, `blur`, and `visibilitychange` listeners. On non-repeated `F2`, commit `voice/setPushToTalkActive` true while pressed and false on release/blur/hidden. Add computed `voiceHintText` that returns current user speaking, storyteller speaking, push-to-talk hint, or free-talk hint.

- [ ] **Step 5: Add i18n keys**

Add:

```js
freeTalk: "自由发言",
pushToTalk: "按住说话",
holdToTalk: "按住说话",
listenVolume: "收听音量",
speaking: "正在说话",
pushToTalkHint: "按住 F2 说话",
storytellerSpeaking: "说书人正在说话",
```

Add equivalent English keys.

- [ ] **Step 6: Run test and verify green**

Run:

```bash
node scripts/test-voice-ui-source.js
```

Expected: pass.

---

### Task 6: Seat Speaking Indicator

**Files:**
- Modify: `scripts/test-voice-ui-source.js`
- Modify: `src/components/Player.vue`
- Modify: `src/i18n/index.js`

- [ ] **Step 1: Write failing player source assertions**

In `scripts/test-voice-ui-source.js`, read `Player.vue` and assert:

```js
[
  "seat-speaking-icon",
  "isVoiceSpeaking",
  "participant.speaking",
  "faVolumeUp"
].forEach(needle => assert(playerSource.includes(needle), `Player missing ${needle}`));
```

- [ ] **Step 2: Run test and verify red**

Run:

```bash
node scripts/test-voice-ui-source.js
```

Expected: fail because the seat icon is missing.

- [ ] **Step 3: Implement player indicator**

In `Player.vue`, compute `isVoiceSpeaking` by matching the seated player's id against `this.$store.state.voice.state.participants`. Render a small `font-awesome-icon` using the existing volume icon next to the name only when `isVoiceSpeaking` is true.

Add scoped CSS:

```scss
.seat-speaking-icon {
  position: absolute;
  right: 0.2rem;
  top: -0.35rem;
  animation: voice-speaking-pulse 0.8s ease-in-out infinite;
  pointer-events: none;
}
```

- [ ] **Step 4: Run test and verify green**

Run:

```bash
node scripts/test-voice-ui-source.js
```

Expected: pass.

---

### Task 7: Full Verification

**Files:**
- No new files.

- [ ] **Step 1: Run focused test scripts**

Run:

```bash
node scripts/test-voice-store-source.js
node scripts/test-voice-source.js
node scripts/test-voice-rooms.js
node scripts/test-voice-peer-manager.js
node scripts/test-voice-ui-source.js
```

Expected: all pass.

- [ ] **Step 2: Run build**

Run:

```bash
npm run build
```

Expected: Vue CLI build completes successfully.

- [ ] **Step 3: Browser smoke check**

Start the local app, open the room page, and verify:

- Free-talk and push-to-talk switch render in voice controls.
- Holding `F2` sets push-to-talk active and releasing clears it.
- Press-and-hold button clears on release/cancel.
- Listen-volume slider remains 0-100 and does not move layout.
- Speaking icon appears beside the correct seated player when `participant.speaking` is true.
- Top-right hint changes between `自由发言`, `按住 F2 说话`, `正在说话`, and `说书人正在说话`.

---

## Self-Review

- Spec coverage: covered talk mode, push-to-talk desktop/mobile, persistence, speaking detection, server broadcast state, storyteller hint, seat indicators, listen volume, and verification.
- Placeholder scan: no `TBD`, `TODO`, or vague “implement later” steps remain.
- Type consistency: store fields use `talkMode`, `pushToTalkActive`, `speaking`, `listenVolume`; server command uses `voice:speaking:set`; manager callback uses `onSpeakingChange`.
