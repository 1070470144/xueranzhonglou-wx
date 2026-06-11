# Voice Talk Mode, Speaking Indicator, and Listen Volume Design

## Goal

Improve in-room voice chat so each user can choose between free talk and push-to-talk, see clear local speaking guidance, see who is currently speaking, and control the volume they hear from other participants.

This design builds on the existing room voice system:

- `src/store/modules/voice.js` stores voice connection and microphone state.
- `src/components/VoicePanel.vue` syncs store state into `VoicePeerManager`.
- `src/services/voicePeer.js` owns microphone capture, peer connections, and remote audio elements.
- `src/components/RoomControlDrawer.vue` renders the room voice controls.
- `src/components/Player.vue` renders seated player names.
- The server already handles `voice:*` room state and signaling messages.

## User Experience

### Talk Mode

The voice control section shows a compact mode switch:

- `自由发言`
- `按住说话`

The selected mode is a personal preference. It is stored in the current browser and does not affect other users.

### Free Talk

In free talk mode:

- The existing microphone button remains a click-to-toggle control.
- When the microphone is off, the user cannot be detected as speaking.
- When the microphone is on, the app analyzes the user's real microphone volume.
- Opening the microphone alone does not count as speaking.
- The user is marked as speaking only while actual microphone volume crosses the speaking threshold.

### Push-To-Talk

In push-to-talk mode:

- The microphone is normally off.
- On desktop, holding `F2` temporarily enables the microphone.
- Releasing `F2` disables the microphone.
- On touch devices, the voice control section shows a press-and-hold button.
- Pressing and holding the button temporarily enables the microphone.
- Releasing, canceling, or leaving the button disables the microphone.
- Holding the key or button alone does not count as speaking; real microphone volume still decides the speaking indicator.

### Local Voice Hint

On desktop, a small text hint appears in the top-right area to the left of `公告`.

The hint text is:

- `正在说话` when the current user is actually speaking.
- `按住 F2 说话` when push-to-talk is selected and the current user is not speaking.
- `自由发言` when free talk is selected and the current user is not speaking.
- `说书人正在说话` for other users when the storyteller is speaking.

The hint should stay compact and should not cover existing top-right controls.

### Seat Speaking Indicator

Every seated player can show a small speaker icon at the upper-right corner of their seat name.

Rules:

- If a seated player is currently speaking, that player's own seat name shows a flashing speaker icon.
- If multiple seated players speak at the same time, all of their seat speaker icons flash.
- If the storyteller is speaking, no seat icon is shown for the storyteller. Instead, the top-right hint can show `说书人正在说话`.
- A participant who stops speaking should lose the flashing state shortly after their voice drops below the threshold.

### Listen Volume

The voice control section includes a global listen volume slider.

Rules:

- It controls the volume this browser hears from all remote voice participants.
- It does not change this user's microphone input volume.
- It does not change what other users hear.
- It is stored in the current browser.
- Initial value is `100%`.
- Supported range is `0%` to `100%`.

Per-participant volume is out of scope for this change.

## State Model

### Client Store

The `voice` module should add local-only state:

- `talkMode`: `"free"` or `"pushToTalk"`.
- `pushToTalkActive`: boolean, true only while the user is actively holding the push-to-talk key or button.
- `speaking`: boolean, the local user's detected speaking state.
- `listenVolume`: number from `0` to `1`.

The effective microphone state passed to `VoicePeerManager` is:

- free talk: `micEnabled`
- push-to-talk: `pushToTalkActive`

Both are still gated by voice enabled state and `canSpeak`.

### Persistence

Persist these personal settings in `localStorage`:

- `voiceTalkMode`
- `voiceListenVolume`

Do not persist `pushToTalkActive` or `speaking`.

### Server Voice State

Each voice participant should include:

- `speaking`: boolean

The server should clear `speaking` when:

- the participant disconnects
- the participant leaves voice state
- the participant is removed from the room
- the room voice state is cleared
- mute-all or can-speak rules make that participant unable to speak

## WebSocket Protocol

Add a client-to-server command:

```text
voice:speaking:set
```

Payload:

```json
{ "speaking": true }
```

The server validates that the sender is a registered voice participant, normalizes the value to boolean, stores it on that participant, and broadcasts the updated `voice:state`.

The existing `voice:state` payload should include each participant's `speaking` field.

## Speaking Detection

`VoicePeerManager` should analyze the local microphone stream with Web Audio API.

Recommended behavior:

- Use an `AudioContext`, `MediaStreamAudioSourceNode`, and `AnalyserNode`.
- Compute a lightweight RMS-like volume level on a short interval.
- Speaking starts only after volume stays above the start threshold briefly.
- Speaking stops only after volume stays below the stop threshold briefly.
- Emit speaking changes only when the boolean state changes.
- Throttle updates by state transition, not by every volume sample.

Suggested initial timings:

- Start speaking after about 150 ms above threshold.
- Stop speaking after about 500 ms below threshold.

The exact threshold can be tuned during implementation, but the implementation should avoid rapid flicker.

## UI Placement

### Room Control Drawer

Add controls under the `语音私聊` section:

- mode switch: `自由发言 | 按住说话`
- current microphone or push-to-talk control
- listen volume slider

The controls should stay usable on mobile. The push-to-talk button needs pointer/touch cancel handling so the microphone cannot get stuck on if the pointer leaves the button or the page loses focus.

### Top-Right Hint

Add a compact voice hint near the existing top-right status/menu area, to the left of `公告`.

It should be hidden when voice is not relevant, for example when the user is not in a room or voice state is unavailable.

### Player Seat

Add a speaker icon inside `Player.vue` near the upper-right of the `.name` element.

The icon should:

- render only when that seat's player id matches a speaking voice participant
- flash while speaking
- not resize the name box
- not obscure the player name text

## Error Handling

- If microphone permission is denied, keep the existing voice error behavior.
- If Web Audio setup fails, voice chat should still work; only speaking detection is disabled.
- If the browser loses focus or the document becomes hidden, push-to-talk should release automatically.
- If `F2` repeats while held, repeated keydown events should not toggle the microphone incorrectly.
- If the user switches from push-to-talk to free talk while holding `F2`, release push-to-talk state before applying free talk behavior.
- If the user switches from free talk to push-to-talk, turn off normal mic toggle and require the key or hold button.

## Testing Plan

Source-level tests should assert:

- voice store includes talk mode, listen volume, and speaking state
- persistence reads and writes `voiceTalkMode` and `voiceListenVolume`
- socket wiring includes `voice:speaking:set`
- voice state participants include `speaking`
- room control renders the mode switch, push-to-talk control, and listen volume slider
- player seat renders a speaking icon tied to voice participant state
- top-right voice hint renders the expected text keys

Behavioral tests should cover:

- push-to-talk keydown enables effective mic
- push-to-talk keyup disables effective mic
- listen volume updates existing and future remote audio elements
- speaking detection emits transitions without spamming repeated unchanged state
- server clears speaking on disconnect or participant removal

Manual/browser checks should cover:

- desktop `F2` hold and release
- touch press-and-hold release/cancel
- speaker icon flashing on the correct player's seat
- storyteller speaking hint
- listen volume changing remote audio playback volume

## Out Of Scope

- Per-participant listen volume
- Server-side audio mixing
- Recording voice
- Visual audio waveform meters
- Changing role/game rules based on voice state
