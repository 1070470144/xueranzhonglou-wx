# Room Reconnect Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make player and storyteller refresh/temporary disconnect recovery reliable without exposing stale rooms or dropping active room identity.

**Architecture:** Keep rooms authoritative on the websocket server, add reconnect grace for transient player sockets, and keep the existing host reclaim flow for storytellers. The client should request room/voice/game state whenever a room socket reopens so refreshes converge without manual action.

**Tech Stack:** Node.js websocket server using `ws`, Vue 2/Vuex client, existing script-based regression tests.

---

### Task 1: Add Reconnect Regression Coverage

**Files:**
- Modify: `townsquare-develop/scripts/test-room-reconnect.js`
- Modify: `townsquare-develop/scripts/test-room-socket-source.js`

- [ ] Add a websocket regression test where a player socket closes unexpectedly, the room keeps the player during grace, the same `playerId` reconnects, and the host still sees one player.
- [ ] Add source assertions that client room reconnect code requests room state, voice state, and host gamestate after reconnect.
- [ ] Run `node scripts/test-room-reconnect.js` and confirm the new player grace case fails before implementation.

### Task 2: Harden Server Room Reconnect Semantics

**Files:**
- Modify: `townsquare-develop/server/rooms.js`
- Modify: `townsquare-develop/server/index.js`

- [ ] Add `playerDisconnectedAt`/`disconnectTimer` metadata to room player records when their websocket closes unexpectedly.
- [ ] Keep disconnected players in `room.players` during grace and clear that metadata when the same `playerId` rejoins.
- [ ] Allow same-player rejoin even when `room.players.size` is at max, while still denying new players at capacity.
- [ ] Cancel stale host reconnect timers when a host successfully reclaims the room.
- [ ] Broadcast fresh `room:players` and `voice:state` after reclaims and reconnect replacements.

### Task 3: Harden Client Reconnect Requests

**Files:**
- Modify: `townsquare-develop/src/store/socket.js`

- [ ] On room socket open as storyteller, request `room:state:get` whenever the socket is recovering an existing room.
- [ ] On room socket open as player, request host gamestate and voice state after reconnect.
- [ ] Preserve existing manual leave behavior so normal close still clears room and voice state.

### Task 4: Verify

**Files:**
- No code changes.

- [ ] Run `node scripts/test-room-registry.js`.
- [ ] Run `node scripts/test-room-reconnect.js`.
- [ ] Run `node scripts/test-room-stale-lobby-visibility.js`.
- [ ] Run `node scripts/test-room-socket-source.js`.
- [ ] Run `node scripts/test-voice-peer-manager.js` to make sure existing voice reconnect work still passes.
