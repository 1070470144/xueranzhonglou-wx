const fs = require("fs");
const https = require("https");
const WebSocket = require("ws");
const client = require("prom-client");
const rooms = require("./rooms");

// Create a Registry which registers the metrics
const register = new client.Registry();
// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: "clocktower-online"
});

const PING_INTERVAL = 30000; // 30 seconds
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
const wss = new WebSocket.Server({
  ...(process.env.NODE_ENV === "development" ? { port: 8081 } : { server }),
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

function sendRoomPlayerList(room) {
  const players = Array.from(room.players.entries()).map(([id, player]) => ({
    id,
    name: player.name
  }));
  sendJson(room.host, "room:players", players);
  room.players.forEach(({ ws }) => sendJson(ws, "room:players", players));
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
            sendJson(ws, "room:list:update", rooms.listRooms());
            return;
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
            sendJson(ws, "room:create:ok", {
              room: rooms.summarize(room),
              scriptJson: room.scriptJson
            });
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
            moveClientToChannel(ws, room.id);
            ws.isLobby = false;
            sendJson(ws, "room:join:ok", {
              room: rooms.summarize(room),
              scriptJson: room.scriptJson
            });
            sendRoomPlayerList(room);
            broadcastRoomList();
            return;
          }
          case "room:update": {
            const room = rooms.getRoom(ws.roomId);
            if (!room || room.host !== ws) throw new Error("host_only");
            rooms.updateRoom(room.id, params);
            sendJson(ws, "room:update:ok", {
              room: rooms.summarize(room),
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
        sendRoomError(ws, `${command}:error`, e);
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
      const closedRoom = rooms.closeRoom(room.id);
      if (closedRoom) sendRoomClosed(closedRoom);
      broadcastRoomList();
    } else {
      rooms.removePlayerConnection(room.id, ws.playerId, ws);
      sendRoomPlayerList(room);
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
