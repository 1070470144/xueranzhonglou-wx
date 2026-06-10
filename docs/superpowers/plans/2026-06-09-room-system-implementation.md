# Townsquare Room System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a temporary room lobby for `townsquare-develop` with create/list/join/private-password/kick/script metadata support while preserving the existing live game sync.

**Architecture:** Extend the existing Node `ws` server with an in-memory room registry and room/lobby websocket commands. Add a focused Vuex `room` module and room-oriented client methods in `src/store/socket.js`, then expose the flow through a dedicated `RoomLobbyModal` opened from the existing session menu. Existing channel-based game sync remains the transport for in-room game state after room access is accepted.

**Tech Stack:** Node.js, `ws`, Vue 2, Vuex 3, SCSS, existing i18n system, existing Font Awesome setup, `npm run lint`, `npm run build`.

---

## File Structure

- Create `townsquare-develop/server/rooms.js`: pure in-memory room registry with validation helpers, script-name extraction, room summaries, kick/ban tracking, and host cleanup.
- Modify `townsquare-develop/server/index.js`: wire room registry into websocket connection/message lifecycle and broadcast room-list updates.
- Create `townsquare-develop/src/store/modules/room.js`: Vuex state and mutations for room lobby, current room metadata, join/create/update forms, connected room players, and error state.
- Modify `townsquare-develop/src/store/index.js`: register the `room` module and add `roomLobby` to modal state.
- Modify `townsquare-develop/src/store/socket.js`: add lobby/room client commands, handle room server messages, connect through approved room joins, and clear room state on closure/kick.
- Create `townsquare-develop/src/components/modals/RoomLobbyModal.vue`: room list, create form, join dialog, host management controls, script JSON update, and kick controls.
- Modify `townsquare-develop/src/App.vue`: render `RoomLobbyModal`.
- Modify `townsquare-develop/src/components/Menu.vue`: replace primary manual host/join prompts with the lobby entry while keeping manual host/join methods available as fallback.
- Modify `townsquare-develop/src/i18n/index.js`: add Chinese and English strings for room lobby labels, errors, and confirmations.
- Modify `townsquare-develop/src/main.js`: add any missing Font Awesome icons used by the room lobby, reusing existing icons where possible.
- Optional create `townsquare-develop/scripts/smoke-room-server.js`: small Node smoke script for the room registry or websocket flow if direct automated verification is feasible without adding a test framework.

## Task 1: Server Room Registry

**Files:**
- Create: `townsquare-develop/server/rooms.js`
- Verify: `node -e "const rooms=require('./server/rooms'); const r=rooms.createRoom({host:{playerId:'host'}, name:'Test', visibility:'public'}); console.log(r.summary.name, rooms.listRooms().length); rooms.closeRoom(r.id); console.log(rooms.listRooms().length);"`

- [ ] **Step 1: Create the room registry module**

Create `server/rooms.js` exporting pure functions. Use CommonJS to match `server/index.js`.

```js
const crypto = require("crypto");

const MAX_PLAYERS = 20;
const rooms = new Map();

function sanitizeId(value) {
  return String(value || "")
    .toLocaleLowerCase()
    .replace(/[^0-9a-z]/g, "")
    .substr(0, 10);
}

function createRoomId(name) {
  const base = sanitizeId(name) || "room";
  let id = base;
  while (rooms.has(id)) {
    id = sanitizeId(`${base}${Math.round(Math.random() * 10000)}`);
  }
  return id;
}

function passwordHash(password) {
  if (!password) return "";
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function extractScriptName(scriptJson) {
  if (!scriptJson) return "No Script";
  const script = typeof scriptJson === "string" ? JSON.parse(scriptJson) : scriptJson;
  const meta = Array.isArray(script) ? script.find(item => item && item.id === "_meta") : null;
  return (meta && meta.name) || "Custom Script";
}

function summarize(room) {
  return {
    id: room.id,
    name: room.name,
    visibility: room.visibility,
    isPrivate: room.visibility === "private",
    playerCount: room.players.size,
    maxPlayers: room.maxPlayers,
    scriptName: room.scriptName,
    voiceMode: room.voiceMode,
    hasVoiceUrl: !!room.voiceUrl,
    updatedAt: room.updatedAt
  };
}

function createRoom({ host, name, visibility = "public", password = "", scriptJson = "", voiceUrl = "" }) {
  const cleanName = String(name || "").trim();
  if (!cleanName) throw new Error("invalid_room_name");
  if (visibility === "private" && !String(password || "").trim()) {
    throw new Error("password_required");
  }
  let scriptName = "No Script";
  if (scriptJson) scriptName = extractScriptName(scriptJson);
  const now = Date.now();
  const room = {
    id: createRoomId(cleanName),
    name: cleanName,
    visibility: visibility === "private" ? "private" : "public",
    passwordHash: visibility === "private" ? passwordHash(password) : "",
    maxPlayers: MAX_PLAYERS,
    host,
    players: new Map(),
    bannedPlayerIds: new Set(),
    scriptName,
    scriptJson: scriptJson || "",
    voiceMode: voiceUrl ? "external" : "none",
    voiceUrl: String(voiceUrl || "").trim(),
    createdAt: now,
    updatedAt: now
  };
  rooms.set(room.id, room);
  return room;
}

function listRooms() {
  return Array.from(rooms.values()).map(summarize).sort((a, b) => b.updatedAt - a.updatedAt);
}

function getRoom(id) {
  return rooms.get(sanitizeId(id));
}

function verifyJoin({ roomId, playerId, password }) {
  const room = getRoom(roomId);
  if (!room) throw new Error("room_not_found");
  if (room.bannedPlayerIds.has(playerId)) throw new Error("banned");
  if (room.players.size >= room.maxPlayers) throw new Error("room_full");
  if (room.visibility === "private" && room.passwordHash !== passwordHash(password)) {
    throw new Error(password ? "invalid_password" : "password_required");
  }
  return room;
}

function addPlayer(roomId, ws, playerName) {
  const room = getRoom(roomId);
  if (!room) throw new Error("room_not_found");
  const cleanName = String(playerName || "").trim();
  if (!cleanName) throw new Error("invalid_player_name");
  room.players.set(ws.playerId, { ws, name: cleanName, joinedAt: Date.now() });
  room.updatedAt = Date.now();
  return room;
}

function updateRoom(roomId, patch) {
  const room = getRoom(roomId);
  if (!room) throw new Error("room_not_found");
  if (Object.prototype.hasOwnProperty.call(patch, "name")) {
    const cleanName = String(patch.name || "").trim();
    if (!cleanName) throw new Error("invalid_room_name");
    room.name = cleanName;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "visibility")) {
    room.visibility = patch.visibility === "private" ? "private" : "public";
  }
  if (room.visibility === "private" && Object.prototype.hasOwnProperty.call(patch, "password")) {
    if (!String(patch.password || "").trim()) throw new Error("password_required");
    room.passwordHash = passwordHash(patch.password);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "scriptJson")) {
    room.scriptName = extractScriptName(patch.scriptJson);
    room.scriptJson = patch.scriptJson || "";
  }
  if (Object.prototype.hasOwnProperty.call(patch, "voiceUrl")) {
    room.voiceUrl = String(patch.voiceUrl || "").trim();
    room.voiceMode = room.voiceUrl ? "external" : "none";
  }
  room.updatedAt = Date.now();
  return room;
}

function removePlayer(roomId, playerId) {
  const room = getRoom(roomId);
  if (!room) return null;
  room.players.delete(playerId);
  room.updatedAt = Date.now();
  return room;
}

function kickPlayer(roomId, playerId) {
  const room = getRoom(roomId);
  if (!room) throw new Error("room_not_found");
  room.bannedPlayerIds.add(playerId);
  const player = room.players.get(playerId);
  room.players.delete(playerId);
  room.updatedAt = Date.now();
  return player;
}

function closeRoom(roomId) {
  const room = getRoom(roomId);
  if (!room) return null;
  rooms.delete(room.id);
  return room;
}

module.exports = {
  MAX_PLAYERS,
  createRoom,
  listRooms,
  getRoom,
  verifyJoin,
  addPlayer,
  updateRoom,
  removePlayer,
  kickPlayer,
  closeRoom,
  summarize,
  extractScriptName
};
```

- [ ] **Step 2: Run the registry smoke check**

Run from `townsquare-develop`:

```bash
node -e "const rooms=require('./server/rooms'); const r=rooms.createRoom({host:{playerId:'host'}, name:'Test', visibility:'public'}); console.log(r.summary ? 'bad' : r.name, rooms.listRooms().length); rooms.closeRoom(r.id); console.log(rooms.listRooms().length);"
```

Expected output includes:

```text
Test 1
0
```

- [ ] **Step 3: Verify script name extraction**

Run from `townsquare-develop`:

```bash
node -e "const rooms=require('./server/rooms'); console.log(rooms.extractScriptName('[{"id":"_meta","name":"My Script"}]')); console.log(rooms.extractScriptName('[{"id":"washerwoman"}]'));" 
```

Expected output:

```text
My Script
Custom Script
```

- [ ] **Step 4: Commit this task if commits are allowed**

```bash
git add townsquare-develop/server/rooms.js
git commit -m "feat: add room registry"
```

## Task 2: Server Websocket Room Commands

**Files:**
- Modify: `townsquare-develop/server/index.js`
- Read: `townsquare-develop/server/rooms.js`

- [ ] **Step 1: Import the room registry**

At the top of `server/index.js`, add:

```js
const rooms = require("./rooms");
```

- [ ] **Step 2: Add websocket send helpers below `function noop() {}`**

```js
function sendJson(ws, command, params) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify([command, params]));
    metrics.messages_outgoing.inc();
  }
}

function broadcastRoomList() {
  const payload = rooms.listRooms();
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.isLobby) {
      sendJson(client, "room:list:update", payload);
    }
  });
}

function sendRoomClosed(room) {
  room.players.forEach(({ ws }) => sendJson(ws, "room:closed", { roomId: room.id }));
}

function sendRoomPlayerList(room) {
  const players = Array.from(room.players.entries()).map(([id, player]) => ({
    id,
    name: player.name
  }));
  sendJson(room.host, "room:players", players);
}

function sendRoomError(ws, command, err) {
  sendJson(ws, command, { reason: err && err.message ? err.message : "unknown_error" });
}
```

- [ ] **Step 3: Parse room metadata during connection**

Inside the `wss.on("connection", ...)` handler, after `ws.channel` and `ws.playerId` are set, initialize:

```js
  ws.isLobby = ws.channel === "lobby";
  ws.roomId = ws.isLobby ? "" : ws.channel;
```

Keep the duplicate-host check, but skip it for lobby clients:

```js
  if (
    !ws.isLobby &&
    ws.playerId === "host" &&
    channels[ws.channel] &&
```

- [ ] **Step 4: Add room command handling before the existing relay switch**

Inside `ws.on("message", function incoming(data) { ... })`, parse JSON once before calculating `messageType`:

```js
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(data);
    } catch (e) {
      parsedMessage = null;
    }
    const command = parsedMessage && parsedMessage[0];
    const params = (parsedMessage && parsedMessage[1]) || {};
```

Then add this block before the existing `const messageType = ...` line:

```js
    if (command && command.indexOf("room:") === 0) {
      try {
        switch (command) {
          case "room:list":
            ws.isLobby = true;
            sendJson(ws, "room:list:update", rooms.listRooms());
            return;
          case "room:create": {
            const room = rooms.createRoom({
              host: ws,
              name: params.name,
              visibility: params.visibility,
              password: params.password,
              scriptJson: params.scriptJson,
              voiceUrl: params.voiceUrl
            });
            ws.channel = room.id;
            ws.roomId = room.id;
            ws.playerId = "host";
            ws.isLobby = false;
            sendJson(ws, "room:create:ok", { room: rooms.summarize(room), scriptJson: room.scriptJson });
            broadcastRoomList();
            return;
          }
          case "room:join": {
            const room = rooms.verifyJoin({
              roomId: params.roomId,
              playerId: ws.playerId,
              password: params.password
            });
            rooms.addPlayer(room.id, ws, params.playerName);
            ws.channel = room.id;
            ws.roomId = room.id;
            ws.isLobby = false;
            sendJson(ws, "room:join:ok", { room: rooms.summarize(room), scriptJson: room.scriptJson });
            sendRoomPlayerList(room);
            broadcastRoomList();
            return;
          }
          case "room:update": {
            const room = rooms.getRoom(ws.roomId);
            if (!room || room.host !== ws) throw new Error("host_only");
            rooms.updateRoom(room.id, params);
            sendJson(ws, "room:update:ok", { room: rooms.summarize(room), scriptJson: room.scriptJson });
            room.players.forEach(({ ws: playerWs }) => {
              sendJson(playerWs, "room:update", { room: rooms.summarize(room), scriptJson: room.scriptJson });
            });
            broadcastRoomList();
            return;
          }
          case "room:kick": {
            const room = rooms.getRoom(ws.roomId);
            if (!room || room.host !== ws) throw new Error("host_only");
            const player = rooms.kickPlayer(room.id, params.playerId);
            if (player && player.ws) {
              sendJson(player.ws, "room:kicked", { roomId: room.id });
              player.ws.close(1000, "kicked");
            }
            sendRoomPlayerList(room);
            broadcastRoomList();
            return;
          }
        }
      } catch (e) {
        const errorCommand = `${command}:error`;
        sendRoomError(ws, errorCommand, e);
        return;
      }
    }
```

- [ ] **Step 5: Clean rooms on websocket close**

Add a `ws.on("close", ...)` handler after the existing `ws.on("message", ...)` handler:

```js
  ws.on("close", function closed() {
    if (!ws.roomId) return;
    const room = rooms.getRoom(ws.roomId);
    if (!room) return;
    if (room.host === ws) {
      const closedRoom = rooms.closeRoom(room.id);
      if (closedRoom) sendRoomClosed(closedRoom);
      broadcastRoomList();
    } else {
      rooms.removePlayer(room.id, ws.playerId);
      sendRoomPlayerList(room);
      broadcastRoomList();
    }
  });
```

- [ ] **Step 6: Run lint**

Run from `townsquare-develop`:

```bash
npm run lint
```

Expected: lint completes without errors. If lint reports formatting issues, fix only files touched in this task.

- [ ] **Step 7: Commit this task if commits are allowed**

```bash
git add townsquare-develop/server/index.js townsquare-develop/server/rooms.js
git commit -m "feat: add room websocket commands"
```

## Task 3: Vuex Room Module

**Files:**
- Create: `townsquare-develop/src/store/modules/room.js`
- Modify: `townsquare-develop/src/store/index.js`

- [ ] **Step 1: Create the room Vuex module**

Create `src/store/modules/room.js`:

```js
const emptyCreateForm = () => ({
  name: "",
  visibility: "public",
  password: "",
  scriptJson: "",
  voiceUrl: ""
});

const emptyJoinForm = () => ({
  roomId: "",
  playerName: "",
  password: ""
});

const state = () => ({
  list: [],
  current: null,
  players: [],
  isHost: false,
  isLoading: false,
  error: "",
  createForm: emptyCreateForm(),
  joinForm: emptyJoinForm()
});

const mutations = {
  setList(state, rooms) {
    state.list = Array.isArray(rooms) ? rooms : [];
  },
  setCurrent(state, room) {
    state.current = room || null;
  },
  setPlayers(state, players) {
    state.players = Array.isArray(players) ? players : [];
  },
  setHost(state, value) {
    state.isHost = !!value;
  },
  setLoading(state, value) {
    state.isLoading = !!value;
  },
  setError(state, value) {
    state.error = value || "";
  },
  updateCreateForm(state, patch) {
    state.createForm = { ...state.createForm, ...patch };
  },
  resetCreateForm(state) {
    state.createForm = emptyCreateForm();
  },
  updateJoinForm(state, patch) {
    state.joinForm = { ...state.joinForm, ...patch };
  },
  resetJoinForm(state) {
    state.joinForm = emptyJoinForm();
  },
  clearRoom(state) {
    state.current = null;
    state.players = [];
    state.isHost = false;
    state.isLoading = false;
  }
};

export default {
  namespaced: true,
  state,
  mutations
};
```

- [ ] **Step 2: Register the module**

In `src/store/index.js`, add import:

```js
import room from "./modules/room";
```

Add it to `modules`:

```js
  modules: {
    players,
    session,
    storyLog,
    privateChat,
    room
  },
```

- [ ] **Step 3: Add modal state**

In the `modals` object in `src/store/index.js`, add:

```js
      roomLobby: false,
```

- [ ] **Step 4: Run lint**

Run from `townsquare-develop`:

```bash
npm run lint
```

Expected: lint completes without errors.

- [ ] **Step 5: Commit this task if commits are allowed**

```bash
git add townsquare-develop/src/store/modules/room.js townsquare-develop/src/store/index.js
git commit -m "feat: add room state module"
```

## Task 4: Frontend Socket Room Client

**Files:**
- Modify: `townsquare-develop/src/store/socket.js`

- [ ] **Step 1: Add room command handlers to `_handleMessage`**

Inside the `switch (command)` in `_handleMessage`, add cases before `default` behavior:

```js
      case "room:list:update":
        this._store.commit("room/setList", params);
        break;
      case "room:create:ok":
        this._applyRoomJoined(params, false);
        break;
      case "room:join:ok":
        this._applyRoomJoined(params, true);
        break;
      case "room:create:error":
      case "room:join:error":
      case "room:update:error":
      case "room:kick:error":
        this._store.commit("room/setError", params && params.reason);
        this._store.commit("room/setLoading", false);
        break;
      case "room:update":
      case "room:update:ok":
        this._store.commit("room/setCurrent", params && params.room);
        this._store.commit("room/setLoading", false);
        if (params && params.scriptJson) this._loadRoomScript(params.scriptJson);
        break;
      case "room:players":
        this._store.commit("room/setPlayers", params);
        break;
      case "room:kicked":
        alert(t("room.errors.kicked"));
        this._store.commit("room/clearRoom");
        this._store.commit("session/setSessionId", "");
        break;
      case "room:closed":
        alert(t("room.errors.closed"));
        this._store.commit("room/clearRoom");
        this._store.commit("session/setSessionId", "");
        break;
```

- [ ] **Step 2: Add room helper methods to `LiveSession`**

Add these methods inside the class before `sendPrivateChat(payload)`:

```js
  requestRoomList() {
    this._ensureLobbySocket();
    this._send("room:list", {});
  }

  createRoom(payload) {
    this._ensureLobbySocket();
    this._store.commit("room/setLoading", true);
    this._store.commit("room/setError", "");
    this._send("room:create", payload);
  }

  joinRoom(payload) {
    if (!this._store.state.session.playerId) {
      this._store.commit("session/setPlayerId", Math.random().toString(36).substr(2));
    }
    this._ensureLobbySocket();
    this._store.commit("room/setLoading", true);
    this._store.commit("room/setError", "");
    this._send("room:join", {
      ...payload,
      playerId: this._store.state.session.playerId
    });
  }

  updateRoom(payload) {
    if (this._isSpectator) return;
    this._store.commit("room/setLoading", true);
    this._store.commit("room/setError", "");
    this._send("room:update", payload);
  }

  kickRoomPlayer(playerId) {
    if (this._isSpectator) return;
    this._send("room:kick", { playerId });
  }

  _ensureLobbySocket() {
    if (this._socket && this._socket.readyState === 1) return;
    this.disconnect();
    const playerId = this._store.state.session.playerId || Math.random().toString(36).substr(2);
    this._store.commit("session/setPlayerId", playerId);
    this._socket = new WebSocket(`${this._wss}lobby/${playerId}`);
    this._socket.addEventListener("message", this._handleMessage.bind(this));
    this._socket.onopen = () => this._send("room:list", {});
    this._socket.onclose = () => {
      this._socket = null;
      clearInterval(this._pingTimer);
      this._pingTimer = null;
    };
  }

  _applyRoomJoined({ room, scriptJson } = {}, isSpectator) {
    if (!room || !room.id) return;
    this._isSpectator = isSpectator;
    this._store.commit("session/clearVoteHistory");
    this._store.commit("session/setSpectator", isSpectator);
    this._store.commit("session/setGameStartedAt", Date.now());
    this._store.commit("session/setSessionId", room.id);
    this._store.commit("room/setCurrent", room);
    this._store.commit("room/setHost", !isSpectator);
    this._store.commit("room/setLoading", false);
    this._store.commit("toggleGrimoire", !isSpectator);
    if (scriptJson) this._loadRoomScript(scriptJson);
  }

  _loadRoomScript(scriptJson) {
    try {
      const script = typeof scriptJson === "string" ? JSON.parse(scriptJson) : scriptJson;
      if (script) this._store.dispatch("setEdition", script);
    } catch (error) {
      console.log("could not load room script", error);
    }
  }
```

- [ ] **Step 3: Add store subscription hooks**

In the `store.subscribe` switch, add cases:

```js
      case "room/requestList":
        session.requestRoomList();
        break;
      case "room/create":
        session.createRoom(payload);
        break;
      case "room/join":
        session.joinRoom(payload);
        break;
      case "room/update":
        session.updateRoom(payload);
        break;
      case "room/kick":
        session.kickRoomPlayer(payload);
        break;
```

If Vuex warns because these mutations do not exist, instead add action-style mutations to `room.js` with no state changes:

```js
  requestList() {},
  create() {},
  join() {},
  update() {},
  kick() {}
```

- [ ] **Step 4: Preserve existing manual session behavior**

Review the `session/setSessionId` subscription. Ensure it does not disconnect and reopen a second socket immediately after `_applyRoomJoined` commits `session/setSessionId`. Add a concrete helper that skips reconnect when the current socket is already connected to the committed channel.

Add this method to `LiveSession`:

```js
  isConnectedTo(channel) {
    return (
      this._socket &&
      this._socket.readyState === 1 &&
      this._store.state.session.sessionId === channel
    );
  }
```

Then update the `session/setSessionId` case:

```js
      case "session/setSessionId":
        if (state.session.sessionId) {
          if (session.isConnectedTo(state.session.sessionId)) return;
          store.commit("privateChat/clear");
          session.connect(state.session.sessionId);
        } else {
          window.location.hash = "";
          store.commit("privateChat/clear");
          store.commit("room/clearRoom");
          session.disconnect();
        }
        break;
```

- [ ] **Step 5: Run lint and build**

Run from `townsquare-develop`:

```bash
npm run lint
npm run build
```

Expected: both commands complete without errors.

- [ ] **Step 6: Commit this task if commits are allowed**

```bash
git add townsquare-develop/src/store/socket.js townsquare-develop/src/store/modules/room.js
git commit -m "feat: connect room state to websocket"
```

## Task 5: Room Lobby Modal UI

**Files:**
- Create: `townsquare-develop/src/components/modals/RoomLobbyModal.vue`
- Modify: `townsquare-develop/src/App.vue`
- Modify: `townsquare-develop/src/main.js`

- [ ] **Step 1: Create `RoomLobbyModal.vue`**

Use existing `Modal.vue` pattern. Create a focused UI with list, create form, join form, and host management.

```vue
<template>
  <Modal class="room-lobby" v-if="modals.roomLobby" @close="close">
    <h3>{{ $t("room.title") }}</h3>

    <p v-if="room.error" class="room-error">{{ errorText }}</p>

    <section v-if="!session.sessionId" class="room-section">
      <h4>{{ $t("room.availableRooms") }}</h4>
      <button type="button" class="button" @click="refresh">
        <font-awesome-icon icon="sync-alt" /> {{ $t("room.refresh") }}
      </button>
      <div v-if="!room.list.length" class="room-empty">{{ $t("room.empty") }}</div>
      <ul class="room-list">
        <li v-for="item in room.list" :key="item.id">
          <strong>{{ item.name }}</strong>
          <span>{{ item.playerCount }}/{{ item.maxPlayers }}</span>
          <span>{{ item.isPrivate ? $t("room.private") : $t("room.public") }}</span>
          <span>{{ item.scriptName }}</span>
          <button type="button" class="button" @click="selectRoom(item)">
            {{ $t("room.join") }}
          </button>
        </li>
      </ul>
    </section>

    <section v-if="!session.sessionId" class="room-section">
      <h4>{{ $t("room.create") }}</h4>
      <label>{{ $t("room.name") }}</label>
      <input v-model="createForm.name" type="text" />
      <label>{{ $t("room.visibility") }}</label>
      <select v-model="createForm.visibility">
        <option value="public">{{ $t("room.public") }}</option>
        <option value="private">{{ $t("room.private") }}</option>
      </select>
      <label v-if="createForm.visibility === 'private'">{{ $t("room.password") }}</label>
      <input v-if="createForm.visibility === 'private'" v-model="createForm.password" type="password" />
      <label>{{ $t("room.scriptJson") }}</label>
      <textarea v-model="createForm.scriptJson" rows="5"></textarea>
      <button type="button" class="button demon" @click="createRoom">
        {{ $t("room.createRoom") }}
      </button>
    </section>

    <section v-if="selectedRoom && !session.sessionId" class="room-section">
      <h4>{{ $t("room.joinRoom", { name: selectedRoom.name }) }}</h4>
      <label>{{ $t("room.playerName") }}</label>
      <input v-model="joinForm.playerName" type="text" />
      <label v-if="selectedRoom.isPrivate">{{ $t("room.password") }}</label>
      <input v-if="selectedRoom.isPrivate" v-model="joinForm.password" type="password" />
      <button type="button" class="button demon" @click="joinRoom">
        {{ $t("room.join") }}
      </button>
    </section>

    <section v-if="session.sessionId && room.current" class="room-section">
      <h4>{{ room.current.name }}</h4>
      <p>{{ room.current.playerCount }}/{{ room.current.maxPlayers }} - {{ room.current.scriptName }}</p>
      <template v-if="room.isHost">
        <label>{{ $t("room.name") }}</label>
        <input v-model="createForm.name" type="text" />
        <label>{{ $t("room.visibility") }}</label>
        <select v-model="createForm.visibility">
          <option value="public">{{ $t("room.public") }}</option>
          <option value="private">{{ $t("room.private") }}</option>
        </select>
        <label v-if="createForm.visibility === 'private'">{{ $t("room.password") }}</label>
        <input v-if="createForm.visibility === 'private'" v-model="createForm.password" type="password" />
        <label>{{ $t("room.scriptJson") }}</label>
        <textarea v-model="createForm.scriptJson" rows="5"></textarea>
        <button type="button" class="button demon" @click="updateRoom">
          {{ $t("room.save") }}
        </button>
        <h4>{{ $t("room.connectedPlayers") }}</h4>
        <ul class="room-list">
          <li v-for="player in room.players" :key="player.id">
            <span>{{ player.name }}</span>
            <button type="button" class="button" @click="kick(player.id)">
              {{ $t("room.kick") }}
            </button>
          </li>
        </ul>
      </template>
    </section>
  </Modal>
</template>

<script>
import { mapState } from "vuex";
import Modal from "./Modal";

export default {
  components: { Modal },
  data() {
    return { selectedRoom: null };
  },
  computed: {
    ...mapState(["modals", "session"]),
    ...mapState(["room"]),
    createForm: {
      get() {
        return this.room.createForm;
      },
      set(value) {
        this.$store.commit("room/updateCreateForm", value);
      }
    },
    joinForm: {
      get() {
        return this.room.joinForm;
      },
      set(value) {
        this.$store.commit("room/updateJoinForm", value);
      }
    },
    errorText() {
      return this.$t(`room.errors.${this.room.error}`) || this.room.error;
    }
  },
  watch: {
    "modals.roomLobby"(visible) {
      if (visible) this.refresh();
    }
  },
  methods: {
    close() {
      this.$store.commit("toggleModal", "roomLobby");
    },
    refresh() {
      this.$store.commit("room/requestList");
    },
    selectRoom(room) {
      this.selectedRoom = room;
      this.$store.commit("room/updateJoinForm", { roomId: room.id });
    },
    createRoom() {
      this.$store.commit("room/create", this.room.createForm);
    },
    joinRoom() {
      this.$store.commit("room/join", this.room.joinForm);
    },
    updateRoom() {
      this.$store.commit("room/update", this.room.createForm);
    },
    kick(playerId) {
      if (confirm(this.$t("room.confirmKick"))) {
        this.$store.commit("room/kick", playerId);
      }
    }
  }
};
</script>

<style lang="scss">
.room-lobby {
  .room-section {
    margin: 0 0 1em;
  }
  .room-error {
    color: #ff8a8a;
  }
  .room-empty {
    opacity: 0.8;
    margin: 0.5em 0;
  }
  .room-list {
    list-style: none;
    padding: 0;
    margin: 0.5em 0;
    li {
      display: grid;
      grid-template-columns: 1fr auto auto auto auto;
      gap: 0.5em;
      align-items: center;
      margin: 0.25em 0;
    }
  }
  input,
  select,
  textarea {
    display: block;
    width: 100%;
    margin: 0.25em 0 0.75em;
  }
}
</style>
```

- [ ] **Step 2: Wire modal into `App.vue`**

Add template line near other modals:

```vue
    <RoomLobbyModal />
```

Import:

```js
import RoomLobbyModal from "@/components/modals/RoomLobbyModal";
```

Register in `components`:

```js
    RoomLobbyModal,
```

- [ ] **Step 3: Add icons if needed**

If the modal uses only existing icons, no change. If adding a lock or door icon, add names to `faIcons` in `src/main.js`, for example:

```js
  "Lock",
  "DoorOpen",
```

- [ ] **Step 4: Run lint and build**

Run from `townsquare-develop`:

```bash
npm run lint
npm run build
```

Expected: both commands complete without errors.

- [ ] **Step 5: Commit this task if commits are allowed**

```bash
git add townsquare-develop/src/components/modals/RoomLobbyModal.vue townsquare-develop/src/App.vue townsquare-develop/src/main.js
git commit -m "feat: add room lobby modal"
```

## Task 6: Menu and Localization Integration

**Files:**
- Modify: `townsquare-develop/src/components/Menu.vue`
- Modify: `townsquare-develop/src/i18n/index.js`

- [ ] **Step 1: Add room lobby menu item**

In the `tab === 'session'` block when no session is active, replace the two primary lines with a lobby entry and keep fallback manual controls:

```vue
            <li @click="toggleModal('roomLobby')">
              {{ $t("room.openLobby") }}<em><font-awesome-icon icon="users" /></em>
            </li>
            <li @click="hostSession">{{ $t("menu.host") }}<em>[H]</em></li>
            <li @click="joinSession">{{ $t("menu.join") }}<em>[J]</em></li>
```

When a session is active, add a room info/manage entry before copy link:

```vue
            <li @click="toggleModal('roomLobby')">
              {{ $t("room.manage") }}
              <em>{{ room.current ? room.current.name : session.sessionId }}</em>
            </li>
```

Update computed state mapping:

```js
    ...mapState(["grimoire", "session", "edition", "room"]),
```

- [ ] **Step 2: Add i18n strings**

In `src/i18n/index.js`, add a `room` section for both Chinese and English locale objects. Use existing object style in that file.

English strings:

```js
room: {
  title: "Room Lobby",
  openLobby: "Room Lobby",
  availableRooms: "Available Rooms",
  empty: "No rooms online",
  refresh: "Refresh",
  create: "Create Room",
  createRoom: "Create",
  join: "Join",
  joinRoom: "Join {name}",
  manage: "Room",
  name: "Room name",
  visibility: "Visibility",
  public: "Public",
  private: "Private",
  password: "Password",
  playerName: "Player name",
  scriptJson: "Script JSON",
  save: "Save",
  connectedPlayers: "Connected players",
  kick: "Kick",
  confirmKick: "Kick this player from the room?",
  errors: {
    room_not_found: "Room not found.",
    room_full: "This room is full.",
    password_required: "Password required.",
    invalid_password: "Wrong password.",
    banned: "You were removed from this room and cannot rejoin yet.",
    duplicate_host: "This room already has a host.",
    host_only: "Only the host can do that.",
    invalid_room_name: "Enter a room name.",
    invalid_player_name: "Enter a player name.",
    invalid_script_json: "The script JSON is invalid.",
    kicked: "You were removed from the room.",
    closed: "The host left and the room was closed."
  }
}
```

Chinese strings:

```js
room: {
  title: "房间大厅",
  openLobby: "房间大厅",
  availableRooms: "在线房间",
  empty: "暂无在线房间",
  refresh: "刷新",
  create: "创建房间",
  createRoom: "创建",
  join: "加入",
  joinRoom: "加入 {name}",
  manage: "房间",
  name: "房间名称",
  visibility: "房间类型",
  public: "公开",
  private: "私密",
  password: "房间密码",
  playerName: "玩家名称",
  scriptJson: "剧本 JSON",
  save: "保存",
  connectedPlayers: "在线玩家",
  kick: "踢出",
  confirmKick: "确定要把该玩家踢出房间吗？",
  errors: {
    room_not_found: "房间不存在。",
    room_full: "房间已满。",
    password_required: "请输入房间密码。",
    invalid_password: "房间密码错误。",
    banned: "你已被移出该房间，暂时不能重新加入。",
    duplicate_host: "该房间已经有主持人。",
    host_only: "只有房主可以执行该操作。",
    invalid_room_name: "请输入房间名称。",
    invalid_player_name: "请输入玩家名称。",
    invalid_script_json: "剧本 JSON 格式不正确。",
    kicked: "你已被移出房间。",
    closed: "主持人已离开，房间已关闭。"
  }
}
```

- [ ] **Step 3: Run lint and build**

Run from `townsquare-develop`:

```bash
npm run lint
npm run build
```

Expected: both commands complete without errors.

- [ ] **Step 4: Commit this task if commits are allowed**

```bash
git add townsquare-develop/src/components/Menu.vue townsquare-develop/src/i18n/index.js
git commit -m "feat: add room lobby menu text"
```

## Task 7: End-to-End Verification

**Files:**
- No required code changes unless verification finds a defect.

- [ ] **Step 1: Run full static verification**

Run from `townsquare-develop`:

```bash
npm run lint
npm run build
```

Expected: both commands complete without errors.

- [ ] **Step 2: Start the websocket server locally**

Run from `townsquare-develop/server`:

```bash
$env:NODE_ENV='development'; node index.js
```

Expected: server starts on port `8081` with no crash.

- [ ] **Step 3: Start the frontend with local websocket URL**

Run from `townsquare-develop` in another terminal:

```bash
$env:VUE_APP_TOWNSQUARE_WS_URL='ws://localhost:8081/'; npm run serve
```

Expected: dev server prints a localhost URL.

- [ ] **Step 4: Manual browser verification**

Open two browser windows to the dev server URL.

Verify these scenarios:

- Host creates a public room and it appears in the second window's lobby.
- Host creates a private room and it appears with private status.
- Player joins private room with wrong password and receives an error.
- Player joins private room with correct password and enters as spectator.
- Player can claim a seat using existing controls.
- Host sees player in connected-player list.
- Host kicks player; player is removed and cannot rejoin the same room.
- Host changes room name; lobby list updates.
- Host changes script JSON with `_meta.name`; script name updates.
- Invalid script JSON shows an error and does not replace the current script.
- Host leaves; room disappears and player receives room closed message.

- [ ] **Step 5: Commit verification fixes if any**

If fixes were required:

```bash
git add townsquare-develop
git commit -m "fix: stabilize room lobby flow"
```

## Self-Review Checklist

- Spec coverage: plan covers temporary rooms, public/private list visibility, passwords, max 20 players, player names before joining, spectator-first join, host room edits, script JSON updates, kick/ban behavior, host cleanup, and voice-field reservation.
- Placeholder scan: no `TBD`, `TODO`, or vague implementation-only steps should remain before executing.
- Type consistency: room ids use `room.id`; visibility uses `public`/`private`; server messages use `room:*`; Vuex module name is `room`; current room metadata lives in `room.current`.
- Verification: each implementation task ends with `npm run lint`; frontend/socket integration tasks also run `npm run build`; final task includes local websocket and browser checks.
