const fs = require("fs");
const path = require("path");
const voiceRooms = require("../server/voiceRooms");

const ROOM_COUNT = Number(process.env.VOICE_STATE_STRESS_ROOMS || 24);
const PLAYERS_PER_ROOM = Number(process.env.VOICE_STATE_STRESS_PLAYERS || 12);
const ROUNDS_PER_ROOM = Number(process.env.VOICE_STATE_STRESS_ROUNDS || 18);

const logDir = path.join(__dirname, "../logs/voice-tests");
fs.mkdirSync(logDir, { recursive: true });

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace("T", "_")
  .replace("Z", "");
const logPath = path.join(logDir, `voice-rooms-stress-${stamp}.log`);

const stats = {
  rooms: ROOM_COUNT,
  playersPerRoom: PLAYERS_PER_ROOM,
  roundsPerRoom: ROUNDS_PER_ROOM,
  invitesCreated: 0,
  accepts: 0,
  rejects: 0,
  disconnects: 0,
  recalls: 0,
  invariantChecks: 0,
  errors: []
};

function writeLog(level, message, data) {
  const line = JSON.stringify({ at: new Date().toISOString(), level, message, data });
  fs.appendFileSync(logPath, `${line}\n`);
  console.log(`[${level}] ${message}${data === undefined ? "" : ` ${JSON.stringify(data)}`}`);
}

function fail(message, data) {
  stats.errors.push({ message, data });
  writeLog("FAIL", message, data);
  throw new Error(message);
}

function assert(condition, message, data) {
  if (!condition) fail(message, data);
}

function memberIds(snapshot, channelId) {
  const channel = snapshot.channels.find(item => item.id === channelId);
  return channel ? channel.memberIds.slice().sort() : [];
}

function participantIds(state) {
  return Array.from(state.participants.keys()).filter(id => id !== "host");
}

function assertVoiceInvariants(state, label) {
  stats.invariantChecks += 1;
  assert(state.channels.has("main"), "main channel should exist", { label });

  const memberships = new Map();
  state.channels.forEach(channel => {
    if (channel.type === "private") {
      const hasPendingInvite = Array.from(state.invitations.values()).some(
        invite => invite.channelId === channel.id && invite.status === "pending"
      );
      assert(channel.memberIds.size >= 2 || hasPendingInvite, "private channels should not be stranded", {
        label,
        channelId: channel.id,
        memberIds: Array.from(channel.memberIds),
        hasPendingInvite
      });
    }
    channel.memberIds.forEach(memberId => {
      const participant = state.participants.get(memberId);
      assert(!!participant, "channel member should be registered", { label, memberId, channelId: channel.id });
      assert(participant.currentChannelId === channel.id, "participant current channel should match membership", {
        label,
        memberId,
        participantChannelId: participant.currentChannelId,
        channelId: channel.id
      });
      memberships.set(memberId, (memberships.get(memberId) || 0) + 1);
    });
  });

  state.participants.forEach((participant, participantId) => {
    assert(state.channels.has(participant.currentChannelId), "participant channel should exist", {
      label,
      participantId,
      currentChannelId: participant.currentChannelId
    });
    assert(memberships.get(participantId) === 1, "participant should belong to exactly one channel", {
      label,
      participantId,
      membershipCount: memberships.get(participantId) || 0
    });
  });

  state.invitations.forEach(invite => {
    if (invite.status !== "pending") return;
    assert(invite.invitedIds.size > 0, "pending invitations should have active invited recipients", {
      label,
      inviteId: invite.id,
      fromId: invite.fromId,
      channelId: invite.channelId
    });
    assert(state.participants.has(invite.fromId), "pending invitation sender should still be registered", {
      label,
      inviteId: invite.id,
      fromId: invite.fromId
    });
    invite.invitedIds.forEach(invitedId => {
      assert(state.participants.has(invitedId), "pending invited participant should still be registered", {
        label,
        inviteId: invite.id,
        invitedId
      });
    });
  });
}

function createStressState(roomIndex) {
  const state = voiceRooms.createVoiceState({ hostName: `Storyteller ${roomIndex}`, now: 1000 + roomIndex });
  voiceRooms.registerParticipant(state, {
    id: "host",
    name: `Storyteller ${roomIndex}`,
    isHost: true,
    now: 1000 + roomIndex
  });
  for (let index = 0; index < PLAYERS_PER_ROOM; index += 1) {
    voiceRooms.registerParticipant(state, {
      id: `r${roomIndex}-p${index}`,
      name: `Room ${roomIndex} Player ${index}`,
      now: 1100 + index
    });
  }
  return state;
}

function runDisconnectEdgeCase() {
  const state = voiceRooms.createVoiceState({ hostName: "Edge Storyteller", now: 2000 });
  voiceRooms.registerParticipant(state, { id: "host", name: "Edge Storyteller", isHost: true, now: 2000 });
  voiceRooms.registerParticipant(state, { id: "edge-a", name: "Edge A", now: 2001 });
  voiceRooms.registerParticipant(state, { id: "edge-b", name: "Edge B", now: 2002 });
  const invite = voiceRooms.createInvite(state, { fromId: "edge-a", invitedIds: ["edge-b"], now: 2010 });
  writeLog("INFO", "disconnect edge invite created", invite);
  voiceRooms.unregisterParticipant(state, "edge-b");
  stats.disconnects += 1;
  assertVoiceInvariants(state, "disconnect-edge");
}

function runRoomStress(roomIndex) {
  const state = createStressState(roomIndex);
  assertVoiceInvariants(state, `room-${roomIndex}-initial`);

  for (let round = 0; round < ROUNDS_PER_ROOM; round += 1) {
    const ids = participantIds(state);
    if (ids.length < 3) break;
    const fromId = ids[round % ids.length];
    const invitedIds = [ids[(round + 1) % ids.length], ids[(round + 2) % ids.length], "host"];
    const invite = voiceRooms.createInvite(state, { fromId, invitedIds, now: 3000 + roomIndex * 100 + round });
    stats.invitesCreated += 1;

    if (round % 5 === 0) {
      voiceRooms.unregisterParticipant(state, invitedIds[0]);
      stats.disconnects += 1;
    } else {
      voiceRooms.respondInvite(state, {
        participantId: invitedIds[0],
        inviteId: invite.id,
        accept: round % 2 === 0,
        now: 4000 + round
      });
      if (round % 2 === 0) stats.accepts += 1;
      else stats.rejects += 1;
    }

    const snapshotBeforeMoreResponses = voiceRooms.summarize(state);
    const stillPending = snapshotBeforeMoreResponses.invitations.find(item => item.id === invite.id);
    if (stillPending) {
      stillPending.invitedIds
        .filter(id => state.participants.has(id))
        .forEach((participantId, index) => {
          voiceRooms.respondInvite(state, {
            participantId,
            inviteId: invite.id,
            accept: index % 2 === 0,
            now: 5000 + round + index
          });
          if (index % 2 === 0) stats.accepts += 1;
          else stats.rejects += 1;
        });
    }

    if (round % 7 === 6) {
      voiceRooms.startRecall(state, { byId: "host", now: 6000 + round, delayMs: 0 });
      voiceRooms.executeRecall(state, { byId: "host", now: 6000 + round });
      stats.recalls += 1;
      const snapshot = voiceRooms.summarize(state);
      assert(snapshot.channels.length === 1, "recall should remove private channels", {
        roomIndex,
        round,
        channels: snapshot.channels
      });
      assert(memberIds(snapshot, "main").length === state.participants.size, "recall should move everyone to main", {
        roomIndex,
        round,
        mainMembers: memberIds(snapshot, "main"),
        participantCount: state.participants.size
      });
    }

    assertVoiceInvariants(state, `room-${roomIndex}-round-${round}`);
  }
}

function run() {
  writeLog("INFO", "voice room state stress started", {
    roomCount: ROOM_COUNT,
    playersPerRoom: PLAYERS_PER_ROOM,
    roundsPerRoom: ROUNDS_PER_ROOM,
    logPath
  });
  runDisconnectEdgeCase();
  for (let roomIndex = 0; roomIndex < ROOM_COUNT; roomIndex += 1) runRoomStress(roomIndex);
  writeLog("PASS", "voice room state stress completed", { stats, logPath });
  console.log("voice room state stress tests passed");
}

try {
  run();
} catch (error) {
  writeLog("FAIL", "voice room state stress failed", { error: error.message, stack: error.stack, stats, logPath });
  console.error(`Voice state stress log: ${logPath}`);
  process.exit(1);
}
