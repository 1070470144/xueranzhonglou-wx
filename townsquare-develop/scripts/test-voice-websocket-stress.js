const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const WebSocket = require("ws");

const PORT = Number(process.env.VOICE_WS_STRESS_PORT || 18081);
const WS_URL = process.env.VOICE_WS_STRESS_URL || `ws://localhost:${PORT}`;
const ORIGIN = process.env.VOICE_WS_STRESS_ORIGIN || "http://localhost:8080";
const ROOM_COUNT = Number(process.env.VOICE_WS_STRESS_ROOMS || 8);
const PLAYERS_PER_ROOM = Number(process.env.VOICE_WS_STRESS_PLAYERS || 6);
const REQUEST_TIMEOUT = Number(process.env.VOICE_WS_STRESS_TIMEOUT || 8000);

const logDir = path.join(__dirname, "../logs/voice-tests");
fs.mkdirSync(logDir, { recursive: true });

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace("T", "_")
  .replace("Z", "");
const logPath = path.join(logDir, `voice-websocket-stress-${stamp}.log`);

const stats = {
  roomsRequested: ROOM_COUNT,
  playersPerRoom: PLAYERS_PER_ROOM,
  createSuccess: 0,
  joinSuccess: 0,
  invitesCreated: 0,
  inviteAccepts: 0,
  inviteRejects: 0,
  rejectionNotices: 0,
  signalForwards: 0,
  speakingSyncs: 0,
  expectedErrors: 0,
  recalls: 0,
  disconnectChecks: 0,
  errors: []
};

function writeLog(level, message, data) {
  const line = JSON.stringify({ at: new Date().toISOString(), level, message, data });
  fs.appendFileSync(logPath, `${line}\n`);
  console.log(`[${level}] ${message}${data === undefined ? "" : ` ${JSON.stringify(data)}`}`);
}

function recordError(stage, error, data = {}) {
  const entry = { stage, error: error.message || String(error), ...data };
  stats.errors.push(entry);
  writeLog("ERROR", stage, entry);
}

function assert(condition, message, data) {
  if (!condition) {
    writeLog("FAIL", message, data);
    throw new Error(message);
  }
  writeLog("PASS", message, data);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function memorySnapshot() {
  const usage = process.memoryUsage();
  return Object.fromEntries(
    Object.entries(usage).map(([key, value]) => [key, Math.round(value / 1024 / 1024)])
  );
}

function waitForServer(processRef) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tryConnect = () => {
      const probe = new WebSocket(`${WS_URL}/lobby/voice-probe-${Date.now()}`, {
        headers: { Origin: ORIGIN }
      });
      const timer = setTimeout(() => {
        probe.terminate();
        retry();
      }, 250);
      const retry = () => {
        clearTimeout(timer);
        if (Date.now() - started > REQUEST_TIMEOUT) {
          reject(new Error("voice stress server did not start"));
          return;
        }
        setTimeout(tryConnect, 100);
      };
      probe.once("open", () => {
        clearTimeout(timer);
        probe.close(1000);
        resolve();
      });
      probe.once("error", retry);
    };
    processRef.once("exit", code => reject(new Error(`voice stress server exited before ready: ${code}`)));
    tryConnect();
  });
}

function startServer() {
  writeLog("INFO", "starting isolated voice websocket server", { port: PORT });
  const child = spawn(process.execPath, [path.join(__dirname, "../server/index.js")], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      NODE_ENV: "development",
      TOWNSQUARE_WS_PORT: String(PORT)
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", data => writeLog("SERVER", "stdout", { text: data.toString().trim() }));
  child.stderr.on("data", data => writeLog("SERVER", "stderr", { text: data.toString().trim() }));
  child.on("exit", code => writeLog("SERVER", "exit", { code }));
  return child;
}

class VoiceClient {
  constructor(label, playerId) {
    this.label = label;
    this.playerId = playerId;
    this.messages = [];
    this.waiters = [];
    this.errors = [];
    this.ws = null;
  }

  async connect(channel = "lobby") {
    const url = `${WS_URL}/${channel}/${this.playerId}`;
    writeLog("CONNECT", this.label, { url });
    this.ws = new WebSocket(url, { headers: { Origin: ORIGIN } });
    this.ws.on("message", data => this.handleMessage(data));
    this.ws.on("error", error => {
      this.errors.push(error.message);
      recordError("socket error", error, { label: this.label });
    });
    this.ws.on("close", (code, reason) => writeLog("CLOSE", this.label, { code, reason: reason && reason.toString() }));
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${this.label} connect timeout`)), REQUEST_TIMEOUT);
      this.ws.once("open", () => {
        clearTimeout(timer);
        resolve();
      });
      this.ws.once("error", reject);
    });
  }

  handleMessage(data) {
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (error) {
      recordError("invalid json", error, { label: this.label, raw: data.toString() });
      return;
    }
    const [command, params] = parsed;
    writeLog("RECV", this.label, { command, params });
    this.messages.push(parsed);
    this.waiters = this.waiters.filter(waiter => {
      if (!waiter.predicate(command, params)) return true;
      clearTimeout(waiter.timer);
      waiter.resolve(parsed);
      return false;
    });
  }

  send(command, params = {}) {
    writeLog("SEND", this.label, { command, params });
    this.ws.send(JSON.stringify([command, params]));
  }

  waitFor(commandOrPredicate, timeout = REQUEST_TIMEOUT) {
    const predicate = typeof commandOrPredicate === "function" ? commandOrPredicate : command => command === commandOrPredicate;
    const existing = this.messages.find(([command, params]) => predicate(command, params));
    if (existing) return Promise.resolve(existing);
    return this.waitForNext(predicate, timeout);
  }

  waitForNext(commandOrPredicate, timeout = REQUEST_TIMEOUT) {
    const predicate = typeof commandOrPredicate === "function" ? commandOrPredicate : command => command === commandOrPredicate;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${this.label} timed out waiting for message`)), timeout);
      this.waiters.push({ predicate, resolve, timer });
    });
  }

  close() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.close(1000);
  }
}

async function createRoom(host, index, suffix) {
  host.send("room:create", {
    name: `VOICE STRESS ${suffix} ${index}`,
    visibility: "public",
    hostName: `Voice Host ${index}`,
    maxPlayers: PLAYERS_PER_ROOM,
    scriptName: "Voice Stress Script"
  });
  const [, payload] = await host.waitFor("room:create:ok");
  assert(payload.room && payload.room.id, "voice stress room created", { index, room: payload.room });
  stats.createSuccess += 1;
  return payload.room;
}

async function joinRoom(player, roomId, name) {
  player.send("room:join", { roomId, playerName: name });
  const [, payload] = await player.waitFor("room:join:ok");
  assert(payload.room && payload.room.id === roomId, "voice stress player joined", { player: player.label, roomId });
  stats.joinSuccess += 1;
}

function latestVoiceState(client) {
  const states = client.messages.filter(([command]) => command === "voice:state");
  return states.length ? states[states.length - 1][1] : null;
}

function findInviteFor(state, fromId, invitedId) {
  return (state.invitations || []).find(
    invite => invite.fromId === fromId && invite.invitedIds.includes(invitedId)
  );
}

function channelForParticipant(state, participantId) {
  const participant = (state.participants || []).find(item => item.id === participantId);
  return participant && participant.currentChannelId;
}

function speakingForParticipant(state, participantId) {
  const participant = (state.participants || []).find(item => item.id === participantId);
  return participant && participant.speaking === true;
}

async function waitForVoiceState(client, predicate, timeout = REQUEST_TIMEOUT) {
  return client.waitForNext((command, params) => command === "voice:state" && predicate(params), timeout);
}

async function setupRoomGroup(index, suffix) {
  const host = new VoiceClient(`room-${index}-host`, `voice-host-${suffix}-${index}`);
  await host.connect("lobby");
  const room = await createRoom(host, index, suffix);
  const players = [];
  for (let playerIndex = 0; playerIndex < PLAYERS_PER_ROOM; playerIndex += 1) {
    const player = new VoiceClient(
      `room-${index}-player-${playerIndex}`,
      `voice-player-${suffix}-${index}-${playerIndex}`
    );
    await player.connect("lobby");
    await joinRoom(player, room.id, `Voice Player ${index}-${playerIndex}`);
    players.push(player);
  }
  return { room, host, players };
}

async function exerciseRoom(group, index) {
  const [a, b, c] = group.players;
  a.send("voice:invite:create", { invitedIds: [b.playerId, c.playerId, "host"] });
  const [, bStateWithInvite] = await b.waitForNext((command, params) => {
    const invite = command === "voice:state" && findInviteFor(params, a.playerId, b.playerId);
    return !!invite;
  });
  const invite = findInviteFor(bStateWithInvite, a.playerId, b.playerId);
  assert(invite, "player receives private voice invite", { room: group.room.id, invite });
  stats.invitesCreated += 1;

  b.send("voice:invite:respond", { inviteId: invite.id, accept: true });
  stats.inviteAccepts += 1;
  const [, acceptedState] = await a.waitForNext((command, params) => {
    if (command !== "voice:state") return false;
    return channelForParticipant(params, a.playerId) === channelForParticipant(params, b.playerId);
  });
  const privateChannelId = channelForParticipant(acceptedState, a.playerId);
  assert(privateChannelId && privateChannelId !== "main", "accept moves inviter and player into private channel", {
    room: group.room.id,
    privateChannelId
  });

  c.send("voice:invite:respond", { inviteId: invite.id, accept: false });
  stats.inviteRejects += 1;
  const [, rejectionNotice] = await a.waitForNext("voice:invite:rejected");
  assert(rejectionNotice.rejectedById === c.playerId, "invite rejection is sent to inviter", {
    room: group.room.id,
    rejectionNotice
  });
  stats.rejectionNotices += 1;

  group.host.send("voice:invite:respond", { inviteId: invite.id, accept: true });
  stats.inviteAccepts += 1;
  await waitForVoiceState(group.host, params => channelForParticipant(params, "host") === privateChannelId);
  assert(true, "storyteller can accept player private chat invite", { room: group.room.id, privateChannelId });

  a.send("voice:signal", {
    toId: b.playerId,
    signal: { type: "offer", channelId: privateChannelId, description: { type: "offer", sdp: `offer-${index}` } }
  });
  const [, forwardedSignal] = await b.waitForNext("voice:signal");
  assert(forwardedSignal.fromId === a.playerId, "voice signal forwards inside private channel", forwardedSignal);
  stats.signalForwards += 1;

  a.send("voice:speaking:set", { speaking: true });
  const [, speakingState] = await waitForVoiceState(b, params => speakingForParticipant(params, a.playerId) === true);
  assert(speakingForParticipant(speakingState, a.playerId) === true, "voice speaking state turns yellow on other clients", {
    room: group.room.id,
    participantId: a.playerId
  });
  a.send("voice:speaking:set", { speaking: false });
  const [, silentState] = await waitForVoiceState(b, params => {
    const participant = (params.participants || []).find(item => item.id === a.playerId);
    return participant && participant.speaking === false;
  });
  assert(speakingForParticipant(silentState, a.playerId) === false, "voice speaking state turns red on other clients", {
    room: group.room.id,
    participantId: a.playerId
  });
  stats.speakingSyncs += 1;

  a.send("voice:signal", {
    toId: c.playerId,
    signal: { type: "offer", channelId: privateChannelId, description: { type: "offer", sdp: `bad-${index}` } }
  });
  const [, crossChannelError] = await a.waitForNext("voice:error");
  assert(crossChannelError.reason === "not_channel_member", "voice signal rejects non-channel member", crossChannelError);
  stats.expectedErrors += 1;

  group.host.send("voice:muteAll:set", { value: true });
  await waitForVoiceState(b, params => params.muteAll === true);
  group.host.send("voice:muteAll:set", { value: false });
  await waitForVoiceState(b, params => params.muteAll === false);

  group.host.send("voice:recall:start", { delayMs: 0 });
  const [, recallState] = await waitForVoiceState(b, params => !!params.recall);
  assert(recallState.recall, "recall state is broadcast", { room: group.room.id, recall: recallState.recall });
  group.host.send("voice:recall:execute", {});
  const [, recalledState] = await waitForVoiceState(a, params => {
    const allParticipants = params.participants || [];
    return allParticipants.length && allParticipants.every(participant => participant.currentChannelId === "main");
  });
  assert(recalledState.channels.length === 1, "recall clears private voice channels", {
    room: group.room.id,
    channels: recalledState.channels
  });
  stats.recalls += 1;
}

async function runIsolationCheck(groups) {
  if (groups.length < 2) return;
  const first = groups[0];
  const second = groups[1];
  const firstPlayer = first.players[0];
  const secondPlayer = second.players[0];

  firstPlayer.send("voice:signal", {
    toId: secondPlayer.playerId,
    signal: { type: "offer", channelId: "main", description: { type: "offer", sdp: "cross-room" } }
  });
  const [, error] = await firstPlayer.waitForNext("voice:error");
  assert(error.reason === "not_channel_member", "cross-room voice signal is rejected", error);
  stats.expectedErrors += 1;

  secondPlayer.send("voice:state:get", {});
  const [, secondState] = await secondPlayer.waitForNext("voice:state");
  assert(
    !(secondState.participants || []).some(participant => participant.id === firstPlayer.playerId),
    "voice state remains isolated per room",
    { firstRoom: first.room.id, secondRoom: second.room.id, secondState }
  );
}

async function runDisconnectCheck(group) {
  const target = group.players[group.players.length - 1];
  target.close();
  const [, state] = await group.host.waitForNext((command, params) => {
    if (command !== "voice:state") return false;
    return !(params.participants || []).some(participant => participant.id === target.playerId);
  }, REQUEST_TIMEOUT * 2);
  assert(!(state.participants || []).some(participant => participant.id === target.playerId), "disconnect removes voice participant", {
    room: group.room.id,
    target: target.playerId
  });
  stats.disconnectChecks += 1;
}

async function main() {
  const serverProcess = startServer();
  const clients = [];
  try {
    await waitForServer(serverProcess);
    writeLog("INFO", "voice websocket stress started", {
      wsUrl: WS_URL,
      origin: ORIGIN,
      roomCount: ROOM_COUNT,
      playersPerRoom: PLAYERS_PER_ROOM,
      logPath,
      memory: memorySnapshot()
    });
    const suffix = Date.now().toString(36);
    const groups = [];
    for (let index = 0; index < ROOM_COUNT; index += 1) {
      const group = await setupRoomGroup(index, suffix);
      clients.push(group.host, ...group.players);
      groups.push(group);
    }
    for (let index = 0; index < groups.length; index += 1) await exerciseRoom(groups[index], index);
    await runIsolationCheck(groups);
    await runDisconnectCheck(groups[0]);
    assert(stats.createSuccess === ROOM_COUNT, "created requested voice rooms", stats);
    assert(stats.joinSuccess === ROOM_COUNT * PLAYERS_PER_ROOM, "joined requested voice players", stats);
    assert(stats.rejectionNotices === ROOM_COUNT, "all room rejection notices delivered", stats);
    assert(stats.errors.length === 0, "no unexpected socket errors", stats.errors);
    writeLog("PASS", "voice websocket stress completed", { stats, memory: memorySnapshot(), logPath });
    console.log("voice websocket stress tests passed");
  } catch (error) {
    writeLog("FAIL", "voice websocket stress failed", {
      error: error.message,
      stack: error.stack,
      stats,
      memory: memorySnapshot(),
      logPath
    });
    console.error(`Voice websocket stress log: ${logPath}`);
    process.exitCode = 1;
  } finally {
    clients.forEach(client => client.close());
    await delay(250);
    serverProcess.kill();
  }
}

main();
