const fs = require("fs");
const https = require("https");
const WebSocket = require("ws");
const client = require("prom-client");
const rooms = require("./rooms");
const voiceRooms = require("./voiceRooms");

// Create a Registry which registers the metrics
const register = new client.Registry();
// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: "clocktower-online"
});

const PING_INTERVAL = 30000; // 30 seconds
const HOST_RECONNECT_GRACE_MS = Number(process.env.TOWNSQUARE_HOST_RECONNECT_GRACE_MS || 30000);
const defaultAllowedOriginPattern = /^https?:\/\/([^.]+\.github\.io|localhost|127\.0\.0\.1|\[::1\]|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|clocktower\.online|eddbra1nprivatetownsquare\.xyz|([^.]+\.)?xuerantools\.org)(?::\d+)?(?:\/|$)/i;
const allowedOrigins = (process.env.TOWNSQUARE_ALLOWED_ORIGINS || "")
  .split(",")
  .map(origin => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return false;
  const normalizedOrigin = origin.replace(/\/$/, "");
  return (
    defaultAllowedOriginPattern.test(normalizedOrigin) ||
    allowedOrigins.includes(normalizedOrigin)
  );
}

const options = {};

if (process.env.NODE_ENV !== "development") {
  options.cert = fs.readFileSync("cert.pem");
  options.key = fs.readFileSync("key.pem");
}

const server = https.createServer(options);
const developmentPort = Number(process.env.TOWNSQUARE_WS_PORT || 8081);
const wss = new WebSocket.Server({
  ...(process.env.NODE_ENV === "development" ? { port: developmentPort } : { server }),
  verifyClient: info => isAllowedOrigin(info.origin)
});

function noop() {}

function sendJson(ws, command, params) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify([command, params]));
    metrics.messages_outgoing.inc();
  }
}

function broadcastRoomList() {
  closeStaleRooms();
  const payload = rooms.listRooms();
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.isLobby) {
      sendJson(client, "room:list:update", payload);
    }
  });
}

function sendRoomClosed(room) {
  room.players.forEach(({ ws }) =>
    sendJson(ws, "room:closed", { roomId: room.id })
  );
}

function closeStaleRooms() {
  const now = Date.now();
  const closedRooms = rooms.closeRoomsWhere(
    room =>
      (!room.host || room.host.readyState !== WebSocket.OPEN) &&
      room.hostDisconnectedAt &&
      now - room.hostDisconnectedAt >= HOST_RECONNECT_GRACE_MS
  );
  closedRooms.forEach(room => {
    clearTimeout(room.voiceRecallTimer);
    sendRoomClosed(room);
  });
  return closedRooms.length;
}

function sendRoomSnapshot(ws, room) {
  sendJson(ws, "room:state", {
    room: rooms.summarize(room, { includeInviteToken: true }),
    scriptJson: room.scriptJson
  });
  sendRoomPlayerList(room);
  sendVoiceState(room);
}

function reclaimHostConnection(ws, room) {
  room.host = ws;
  room.hostDisconnectedAt = 0;
  moveClientToChannel(ws, room.id);
  ws.playerId = "host";
  ws.isLobby = false;
  registerVoiceParticipant(room, ws);
}

function sendRoomPlayerList(room) {
  const players = Array.from(room.players.entries()).map(([id, player]) => ({
    id,
    name: player.name
  }));
  sendJson(room.host, "room:players", players);
  room.players.forEach(({ ws }) => sendJson(ws, "room:players", players));
}

function registerVoiceParticipant(room, ws) {
  const state = voiceRooms.ensureVoiceState(room);
  const isHost = room.host === ws || ws.playerId === "host";
  const player = isHost ? null : room.players.get(ws.playerId);
  voiceRooms.registerParticipant(state, {
    id: isHost ? "host" : ws.playerId,
    name: isHost ? room.hostName : player && player.name,
    isHost,
    now: Date.now()
  });
  return state;
}

function sendVoiceState(room) {
  const state = voiceRooms.ensureVoiceState(room);
  const payload = voiceRooms.summarize(state);
  sendJson(room.host, "voice:state", payload);
  room.players.forEach(({ ws }) => sendJson(ws, "voice:state", payload));
}

function sendVoiceError(ws, command, err) {
  sendJson(ws, "voice:error", {
    command,
    reason: err && err.message ? err.message : "unknown_error"
  });
}

function findRoomClient(room, participantId) {
  if (participantId === "host") return room.host;
  const player = room.players.get(participantId);
  return player && player.ws;
}

function scheduleVoiceRecall(room, executeAt) {
  clearTimeout(room.voiceRecallTimer);
  room.voiceRecallTimer = setTimeout(() => {
    const activeRoom = rooms.getRoom(room.id);
    if (!activeRoom || !activeRoom.voiceState || !activeRoom.voiceState.recall) return;
    if (activeRoom.voiceState.recall.executeAt !== executeAt) return;
    try {
      voiceRooms.executeRecall(activeRoom.voiceState, {
        byId: "host",
        now: Date.now()
      });
      sendVoiceState(activeRoom);
    } catch (e) {
      console.log("voice recall execute failed", activeRoom.id, e.message);
    }
  }, Math.max(0, executeAt - Date.now()));
}

function sendRoomError(ws, command, err) {
  sendJson(ws, command, {
    reason: err && err.message ? err.message : "unknown_error"
  });
}

function moveClientToChannel(ws, channel) {
  if (ws.channel && channels[ws.channel]) {
    channels[ws.channel] = channels[ws.channel].filter(client => client !== ws);
  }
  ws.channel = channel;
  ws.roomId = channel;
  if (!channels[channel]) channels[channel] = [];
  if (!channels[channel].includes(ws)) channels[channel].push(ws);
}

// calculate latency on heartbeat
function heartbeat() {
  this.latency = Math.round((new Date().getTime() - this.pingStart) / 2);
  this.counter = 0;
  this.isAlive = true;
}

// map of channels currently in use
const channels = {};

// metrics
const metrics = {
  players_concurrent: new client.Gauge({
    name: "players_concurrent",
    help: "Concurrent Players",
    collect() {
      this.set(wss.clients.size);
    }
  }),
  channels_concurrent: new client.Gauge({
    name: "channels_concurrent",
    help: "Concurrent Channels",
    collect() {
      this.set(Object.keys(channels).length);
    }
  }),
  channels_list: new client.Gauge({
    name: "channel_players",
    help: "Players in each channel",
    labelNames: ["name"],
    collect() {
      for (let channel in channels) {
        this.set(
          { name: channel },
          channels[channel].filter(
            ws =>
              ws &&
              (ws.readyState === WebSocket.OPEN ||
                ws.readyState === WebSocket.CONNECTING)
          ).length
        );
      }
    }
  }),
  messages_incoming: new client.Counter({
    name: "messages_incoming",
    help: "Incoming messages"
  }),
  messages_outgoing: new client.Counter({
    name: "messages_outgoing",
    help: "Outgoing messages"
  }),
  connection_terminated_host: new client.Counter({
    name: "connection_terminated_host",
    help: "Terminated connection due to host already present"
  }),
  connection_terminated_spam: new client.Counter({
    name: "connection_terminated_spam",
    help: "Terminated connection due to message spam"
  }),
  connection_terminated_timeout: new client.Counter({
    name: "connection_terminated_timeout",
    help: "Terminated connection due to timeout"
  })
};

// register metrics
for (let metric in metrics) {
  register.registerMetric(metrics[metric]);
}

// a new client connects
wss.on("connection", function connection(ws, req) {
  // url pattern: clocktower.online/<channel>/<playerId|host>
  const url = req.url.toLocaleLowerCase().split("/");
  ws.playerId = url.pop();
  ws.channel = url.pop();
  ws.isLobby = ws.channel === "lobby";
  ws.roomId = ws.isLobby ? "" : ws.channel;
  // check for another host on this channel
  if (
    !ws.isLobby &&
    ws.playerId === "host" &&
    channels[ws.channel] &&
    channels[ws.channel].some(
      client =>
        client !== ws &&
        client.readyState === WebSocket.OPEN &&
        client.playerId === "host"
    )
  ) {
    console.log(ws.channel, "duplicate host");
    ws.close(1000, `The channel "${ws.channel}" already has a host`);
    metrics.connection_terminated_host.inc();
    return;
  }
  ws.isAlive = true;
  ws.pingStart = new Date().getTime();
  ws.counter = 0;
  // add channel to list
  if (!channels[ws.channel]) {
    channels[ws.channel] = [];
  }
  channels[ws.channel].push(ws);
  // start ping pong
  ws.ping(noop);
  ws.on("pong", heartbeat);
  // handle message
  ws.on("message", function incoming(data) {
    metrics.messages_incoming.inc();
    // check rate limit (max 5msg/second)
    ws.counter++;
    if (ws.counter > (5 * PING_INTERVAL) / 1000) {
      console.log(ws.channel, "disconnecting user due to spam");
      ws.close(
        1000,
        "Your app seems to be malfunctioning, please clear your browser cache."
      );
      metrics.connection_terminated_spam.inc();
      return;
    }

    let parsedMessage;
    try {
      parsedMessage = JSON.parse(data);
    } catch (e) {
      console.log("ignoring invalid JSON message", ws.channel, ws.playerId);
      return;
    }
    const command = parsedMessage && parsedMessage[0];
    const params = (parsedMessage && parsedMessage[1]) || {};

    if (command && command.indexOf("room:") === 0) {
      try {
        switch (command) {
          case "room:list":
            ws.isLobby = true;
            closeStaleRooms();
            sendJson(ws, "room:list:update", rooms.listRooms());
            return;
          case "room:state:get": {
            const room = rooms.getRoom(ws.roomId || params.roomId);
            if (!room) throw new Error("room_not_found");
            if (ws.playerId !== "host") throw new Error("host_only");
            if (room.host && room.host !== ws && room.host.readyState === WebSocket.OPEN) {
              throw new Error("host_already_present");
            }
            reclaimHostConnection(ws, room);
            sendRoomSnapshot(ws, room);
            broadcastRoomList();
            return;
          }
          case "room:create": {
            const room = rooms.createRoom({
              host: ws,
              name: params.name,
              hostName: params.hostName,
              note: params.note,
              visibility: params.visibility,
              password: params.password,
              maxPlayers: params.maxPlayers,
              scriptJson: params.scriptJson,
              scriptName: params.scriptName,
              status: params.status,
              voiceUrl: params.voiceUrl
            });
            moveClientToChannel(ws, room.id);
            ws.playerId = "host";
            ws.isLobby = false;
            registerVoiceParticipant(room, ws);
            sendJson(ws, "room:create:ok", {
              room: rooms.summarize(room, { includeInviteToken: true }),
              scriptJson: room.scriptJson
            });
            sendVoiceState(room);
            broadcastRoomList();
            return;
          }
          case "room:join": {
            const room = rooms.verifyJoin({
              roomId: params.roomId,
              playerId: ws.playerId,
              password: params.password,
              inviteToken: params.inviteToken
            });
            rooms.addPlayer(room.id, ws, params.playerName);
            moveClientToChannel(ws, room.id);
            ws.isLobby = false;
            registerVoiceParticipant(room, ws);
            sendJson(ws, "room:join:ok", {
              room: rooms.summarize(room, { includeInviteToken: true }),
              scriptJson: room.scriptJson
            });
            sendRoomPlayerList(room);
            sendVoiceState(room);
            broadcastRoomList();
            return;
          }
          case "room:update": {
            const room = rooms.getRoom(ws.roomId);
            if (!room || room.host !== ws) throw new Error("host_only");
            rooms.updateRoom(room.id, params);
            registerVoiceParticipant(room, ws);
            sendJson(ws, "room:update:ok", {
              room: rooms.summarize(room, { includeInviteToken: true }),
              scriptJson: room.scriptJson
            });
            room.players.forEach(({ ws: playerWs }) => {
              sendJson(playerWs, "room:update", {
                room: rooms.summarize(room),
                scriptJson: room.scriptJson
              });
            });
            broadcastRoomList();
            return;
          }
          case "room:kick": {
            const room = rooms.getRoom(ws.roomId);
            if (!room || room.host !== ws) throw new Error("host_only");
            const player = rooms.kickPlayer(room.id, params.playerId);
            if (room.voiceState) voiceRooms.unregisterParticipant(room.voiceState, params.playerId);
            if (player && player.ws) {
              sendJson(player.ws, "room:kicked", { roomId: room.id });
              player.ws.close(1000, "kicked");
            }
            sendRoomPlayerList(room);
            sendVoiceState(room);
            broadcastRoomList();
            return;
          }
        }
      } catch (e) {
        sendRoomError(ws, `${command}:error`, e);
        return;
      }
    }

    if (command && command.indexOf("voice:") === 0) {
      const room = rooms.getRoom(ws.roomId);
      if (!room) {
        sendVoiceError(ws, command, new Error("room_not_found"));
        return;
      }
      try {
        const state = registerVoiceParticipant(room, ws);
        switch (command) {
          case "voice:state:get":
            sendVoiceState(room);
            return;
          case "voice:invite:create":
            voiceRooms.createInvite(state, {
              fromId: ws.playerId,
              invitedIds: params.invitedIds || [],
              now: Date.now()
            });
            sendVoiceState(room);
            return;
          case "voice:invite:respond":
            const responder = state.participants.get(ws.playerId);
            const acceptInvite = !!params.accept;
            const rejectedInvite = voiceRooms.respondInvite(state, {
              participantId: ws.playerId,
              inviteId: params.inviteId,
              accept: acceptInvite,
              now: Date.now()
            });
            if (!acceptInvite) {
              sendJson(findRoomClient(room, rejectedInvite.fromId), "voice:invite:rejected", {
                inviteId: rejectedInvite.id,
                rejectedById: ws.playerId,
                rejectedByName: responder && responder.name
              });
            }
            sendVoiceState(room);
            return;
          case "voice:channel:join":
            voiceRooms.joinChannel(state, {
              participantId: ws.playerId,
              channelId: params.channelId
            });
            sendVoiceState(room);
            return;
          case "voice:channel:leave":
            voiceRooms.leaveChannel(state, { participantId: ws.playerId });
            sendVoiceState(room);
            return;
          case "voice:muteAll:set":
            voiceRooms.setMuteAll(state, { byId: ws.playerId, value: params.value });
            sendVoiceState(room);
            return;
          case "voice:recall:start": {
            const recall = voiceRooms.startRecall(state, {
              byId: ws.playerId,
              now: Date.now(),
              delayMs: params.delayMs
            });
            sendVoiceState(room);
            scheduleVoiceRecall(room, recall.executeAt);
            return;
          }
          case "voice:recall:execute":
            voiceRooms.executeRecall(state, { byId: ws.playerId, now: Date.now() });
            sendVoiceState(room);
            return;
          case "voice:signal": {
            const from = state.participants.get(ws.playerId);
            const target = state.participants.get(params.toId);
            if (!from || !target || from.currentChannelId !== target.currentChannelId) {
              throw new Error("not_channel_member");
            }
            const targetWs = findRoomClient(room, params.toId);
            sendJson(targetWs, "voice:signal", {
              fromId: ws.playerId,
              signal: params.signal
            });
            return;
          }
        }
      } catch (e) {
        sendJson(ws, "voice:error", {
          command,
          reason: e && e.message ? e.message : "unknown_error"
        });
        return;
      }
    }

    const messageType = data
      .toLocaleLowerCase()
      .substr(1)
      .split(",", 1)
      .pop();
    switch (messageType) {
      case '"ping"':
        // ping messages will only be sent host -> all or all -> host
        channels[ws.channel].forEach(function each(client) {
          if (
            client !== ws &&
            client.readyState === WebSocket.OPEN &&
            (ws.playerId === "host" || client.playerId === "host")
          ) {
            client.send(
              data.replace(/latency/, (client.latency || 0) + (ws.latency || 0))
            );
            metrics.messages_outgoing.inc();
          }
        });
        break;
      case '"direct"':
        // handle "direct" messages differently
        console.log(
          new Date(),
          wss.clients.size,
          ws.channel,
          ws.playerId,
          data
        );
        try {
          const dataToPlayer = JSON.parse(data)[1];
          channels[ws.channel].forEach(function each(client) {
            if (
              client !== ws &&
              client.readyState === WebSocket.OPEN &&
              dataToPlayer[client.playerId]
            ) {
              client.send(JSON.stringify(dataToPlayer[client.playerId]));
              metrics.messages_outgoing.inc();
            }
          });
        } catch (e) {
          console.log("error parsing direct message JSON", e);
        }
        break;
      default:
        // all other messages
        console.log(
          new Date(),
          wss.clients.size,
          ws.channel,
          ws.playerId,
          data
        );
        channels[ws.channel].forEach(function each(client) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(data);
            metrics.messages_outgoing.inc();
          }
        });
        break;
    }
  });
  ws.on("close", function closed() {
    if (!ws.roomId) return;
    const room = rooms.getRoom(ws.roomId);
    if (!room) return;
    if (room.host === ws) {
      room.hostDisconnectedAt = Date.now();
      clearTimeout(room.hostReconnectTimer);
      room.hostReconnectTimer = setTimeout(() => {
        const activeRoom = rooms.getRoom(room.id);
        if (!activeRoom || activeRoom.host !== ws) return;
        if (activeRoom.host.readyState === WebSocket.OPEN) return;
        const closedRoom = rooms.closeRoom(activeRoom.id);
        clearTimeout(activeRoom.voiceRecallTimer);
        if (closedRoom) sendRoomClosed(closedRoom);
        broadcastRoomList();
      }, HOST_RECONNECT_GRACE_MS);
      broadcastRoomList();
    } else {
      rooms.removePlayerConnection(room.id, ws.playerId, ws);
      if (room.voiceState) voiceRooms.unregisterParticipant(room.voiceState, ws.playerId);
      sendRoomPlayerList(room);
      sendVoiceState(room);
      broadcastRoomList();
    }
  });
});

// start ping interval timer
const interval = setInterval(function ping() {
  // ping each client
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      metrics.connection_terminated_timeout.inc();
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.pingStart = new Date().getTime();
    ws.ping(noop);
  });
  // clean up empty channels
  for (let channel in channels) {
    if (
      !channels[channel].length ||
      !channels[channel].some(
        ws =>
          ws &&
          (ws.readyState === WebSocket.OPEN ||
            ws.readyState === WebSocket.CONNECTING)
      )
    ) {
      metrics.channels_list.remove({ name: channel });
      delete channels[channel];
    }
  }
  if (closeStaleRooms()) broadcastRoomList();
}, PING_INTERVAL);

// handle server shutdown
wss.on("close", function close() {
  clearInterval(interval);
});

// prod mode with stats API
if (process.env.NODE_ENV !== "development") {
  console.log("server starting");
  server.listen(8080);
  server.on("request", (req, res) => {
    res.setHeader("Content-Type", register.contentType);
    register.metrics().then(out => res.end(out));
  });
}
