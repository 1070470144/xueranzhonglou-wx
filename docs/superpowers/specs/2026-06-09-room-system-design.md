# Townsquare Temporary Room System Design

## Status

Approved for design by the user on 2026-06-09. This document describes the first room-system milestone only. Implementation has not started.

## Goal

Add a temporary room lobby to `townsquare-develop` so storytellers can create discoverable online rooms and players can join them from a room list instead of manually typing a session id.

Rooms are temporary. A room exists only while its storyteller host is connected. When the host leaves, disconnects permanently, or the server restarts, the room disappears and all players are returned to the lobby.

## Non-Goals

- Persistent rooms, room history, or database-backed room records.
- Account-based room ownership.
- Built-in voice chat in the first milestone.
- Replacing the existing game-state websocket sync protocol.
- Changing the existing seat-claiming model: players still join as spectators first and claim seats manually.

## Current Project Context

`townsquare-develop` is a Vue 2 and Vuex application with a Node `ws` websocket server.

The current live-session model uses a channel/session id. The websocket path is effectively:

```text
/<channel>/<playerId|host>
```

The server relays messages between clients in the same channel and prevents duplicate hosts in a channel. It already tracks channels in memory. The new room system should extend this in-memory model instead of introducing a database.

Relevant existing areas:

- `townsquare-develop/server/index.js`: websocket relay and in-memory channel tracking.
- `townsquare-develop/src/store/socket.js`: live-session websocket client and game sync commands.
- `townsquare-develop/src/store/modules/session.js`: session state such as `sessionId`, `isSpectator`, `playerId`, and player count.
- `townsquare-develop/src/components/Menu.vue`: current live-session entry points.

## Room Model

Each room is stored in server memory and is keyed by a room id compatible with the existing channel/session id concept.

Room fields:

- `id`: sanitized room/channel id used by websocket clients.
- `name`: user-facing room name.
- `visibility`: `public` or `private`.
- `passwordHash` or equivalent server-only password verifier for private rooms.
- `maxPlayers`: fixed at `20` for the first milestone.
- `host`: current storyteller websocket connection.
- `players`: connected non-host clients, keyed by player id.
- `bannedPlayerIds`: player ids kicked from this room until the room closes.
- `scriptName`: visible script label shown in the room list.
- `scriptJson`: current room script JSON, controlled by the host.
- `voiceMode`: reserved for later voice integration. First milestone supports no built-in voice.
- `voiceUrl`: optional external voice link reserved for later or lightweight external-voice use.
- `createdAt` and `updatedAt`: useful for sorting and cleanup.

Script name resolution:

1. If the uploaded script JSON has `_meta.name`, use that value.
2. Otherwise display `Custom Script` through localization.
3. If no room script has been set yet, display a neutral empty/default value such as `No Script` through localization.

## User Flows

### Create Room

The storyteller opens the room lobby and creates a room with:

- Room name.
- Public or private visibility.
- Password, required only for private rooms.
- Optional script JSON during creation or later editing.

The room max player limit is fixed at 20. The host joins the room as storyteller. The room appears in the room list immediately.

### Room List

The room list shows both public and private rooms.

Each row shows:

- Room name.
- Current players / 20.
- Public or private status.
- Script name.
- Private indicator when password is required.

Private rooms are discoverable in the list, but joining requires the correct password.

### Join Room

A player selects a room and enters a display name before joining. For private rooms, the player also enters the password.

After successful validation, the player enters as a spectator first. They do not automatically occupy a seat. Existing seat claiming remains the way a player takes a seat.

### Manage Room

Only the host can manage room settings.

The host can modify:

- Room name.
- Public/private visibility.
- Private room password.
- Script JSON.

When visibility or password changes, existing connected players stay in the room. New join attempts use the updated rule.

When script JSON changes successfully, the script is synced to connected players and the room list script name updates.

### Kick Player

The host can kick a connected player.

Kicked behavior:

- The player is disconnected from the room.
- The player receives a kicked message.
- The player's id is added to `bannedPlayerIds`.
- The player cannot immediately rejoin the same room while the host keeps the room open.
- The ban disappears when the room disappears.

### Host Leaves

When the host leaves or the room is closed:

- The room is removed from the room list.
- Connected players receive a room-closed message.
- Connected players return to the lobby or disconnected state.
- The room's temporary ban list is discarded.

## Server Design

Extend the websocket server with a room registry alongside the existing channel relay.

The server remains the authority for:

- Creating rooms.
- Listing rooms.
- Joining room validation.
- Password verification.
- Player count and max-player enforcement.
- Kick/ban enforcement.
- Host-only room updates.
- Room cleanup when the host disconnects.

The server should avoid sending private password material to clients. If password verification needs hashing, use a simple server-side hash or verifier. The room list must only expose whether a room is private, not the password.

Existing game-state messages should continue to use the current channel relay model after a client has joined a room. The room layer should gate access and publish metadata, while the existing sync layer continues handling player updates, votes, nominations, role distribution, private chat, and other game events.

## Websocket Message Design

The exact command names can follow the existing `[command, params]` message shape.

Candidate lobby/room commands:

- `room:list`: request current rooms.
- `room:list:update`: server push when the visible room list changes.
- `room:create`: host creates a room.
- `room:create:ok` / `room:create:error`: create result.
- `room:join`: player requests join with room id, player name, and optional password.
- `room:join:ok` / `room:join:error`: join result.
- `room:update`: host updates name, visibility, password, script JSON, or reserved voice fields.
- `room:update:ok` / `room:update:error`: update result.
- `room:kick`: host kicks a player id.
- `room:kicked`: player notification.
- `room:closed`: host left or room closed.

Validation errors should use stable reason codes so the frontend can show localized messages. Suggested codes:

- `room_not_found`
- `room_full`
- `password_required`
- `invalid_password`
- `banned`
- `duplicate_host`
- `host_only`
- `invalid_room_name`
- `invalid_player_name`
- `invalid_script_json`

## Frontend Design

Add a room lobby experience that enhances the current live-session menu.

Frontend pieces:

- Room lobby view/modal listing available rooms.
- Create room form for storytellers.
- Join room form requiring player name and, for private rooms, password.
- Room management panel for hosts.
- Player management list for hosts with kick action.
- Room metadata display for connected players.

Vuex state should track room metadata separately from existing game session state where practical. The existing `session.sessionId`, `session.isSpectator`, `session.playerId`, player count, and reconnect state remain part of the live game state.

Recommended new state shape:

- `room.current`: current room metadata.
- `room.list`: visible room summaries.
- `room.joinName`: pending or saved player display name.
- `room.isHost`: whether the local client owns the room.
- `room.error`: latest room/lobby error.

The existing `PlayerNameModal` flow can be reused or adapted, but joining from the lobby should collect the player's name before connecting.

## Error Handling

- Room full: reject join and keep the player in the lobby.
- Private room without password: ask for password.
- Wrong password: reject join and preserve entered player name.
- Kicked/banned: show kicked or banned message and prevent immediate reconnect to the same room.
- Host leaves: show room closed message and return players to the lobby.
- Invalid script JSON: keep the current script unchanged and show validation feedback to the host.
- Server restart: rooms disappear; clients should treat reconnect failure as room closed and return to the lobby.

## Testing Plan

Manual or automated tests should cover:

- Create public room and verify it appears in the room list.
- Create private room and verify it appears with private status but no password leak.
- Join public room with a player name.
- Join private room with correct and incorrect passwords.
- Reject join when room reaches 20 players.
- Verify players enter as spectators and must claim seats manually.
- Host updates room name and list updates.
- Host switches public/private and new join attempts use updated rules.
- Host changes private password and old password no longer works.
- Host updates script JSON and script name updates in the room list.
- Invalid script JSON does not replace the current script.
- Host kicks a player, and the player cannot immediately rejoin.
- Host leaves and the room disappears.
- Existing seat claiming, voting, role distribution, and game-state sync still work inside a room.

## Voice Extension Reservation

Built-in voice is explicitly out of scope for this first milestone.

The room model reserves `voiceMode` and `voiceUrl` so future work can add:

- External voice links such as Tencent Meeting, QQ channel, KOOK, Discord, or similar.
- P2P WebRTC MVP for small rooms.
- SFU-backed voice through LiveKit, Tencent TRTC, Jitsi, or another provider.

Recommended future path:

1. First support external voice links.
2. If built-in voice is still desired, evaluate Tencent TRTC and LiveKit Cloud before self-hosting.
3. Treat P2P WebRTC as an MVP only, with a recommended soft limit around 12-13 active speakers and warnings at higher room sizes.

## Implementation Planning Decisions

- Room lobby traffic should use the same websocket server process as game traffic, but with explicit room/lobby commands. This keeps deployment simple for the first milestone.
- Room list updates should be pushed to lobby clients whenever room metadata changes. The client can also request `room:list` on lobby open and reconnect.
- Kicked bans should use the persistent `playerId` generated by the existing client session model. The host-facing kick UI should display the player's chosen nickname, but enforcement should not rely on nickname alone.
- UI placement should be a dedicated lobby modal reachable from the existing live-session menu. When no session is active, the menu should emphasize opening the lobby over manual session entry.
- Localization keys and Chinese copy should be added during implementation, following the existing `src/i18n/index.js` structure.
