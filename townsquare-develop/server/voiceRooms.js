const MAIN_CHANNEL_ID = "main";
const RECALL_DELAY_MS = 3000;

function createVoiceState({ hostName = "Storyteller", now = Date.now() } = {}) {
  return {
    participants: new Map(),
    channels: new Map([
      [
        MAIN_CHANNEL_ID,
        {
          id: MAIN_CHANNEL_ID,
          type: "main",
          name: "Main Channel",
          createdBy: "host",
          memberIds: new Set(),
          invitedIds: new Set(),
          createdAt: now
        }
      ]
    ]),
    invitations: new Map(),
    muteAll: false,
    recall: null,
    hostName,
    nextChannelSeq: 1,
    nextInviteSeq: 1
  };
}

function ensureVoiceState(room) {
  if (!room.voiceState) {
    room.voiceState = createVoiceState({
      hostName: room.hostName,
      now: Date.now()
    });
  }
  return room.voiceState;
}

function requireParticipant(state, participantId) {
  const participant = state.participants.get(participantId);
  if (!participant) throw new Error("participant_not_found");
  return participant;
}

function requireChannel(state, channelId) {
  const channel = state.channels.get(channelId);
  if (!channel) throw new Error("channel_not_found");
  return channel;
}

function requireHost(state, participantId) {
  const participant = requireParticipant(state, participantId);
  if (!participant.isHost) throw new Error("host_only");
  return participant;
}

function normalizeName(value, fallback) {
  return String(value || "")
    .trim()
    .substr(0, 30) || fallback;
}

function moveParticipantToChannel(state, participantId, channelId) {
  const participant = requireParticipant(state, participantId);
  const nextChannel = requireChannel(state, channelId);
  state.channels.forEach(channel => channel.memberIds.delete(participantId));
  nextChannel.memberIds.add(participantId);
  participant.currentChannelId = channelId;
  closeEmptyPrivateChannels(state);
  return participant;
}

function closeEmptyPrivateChannels(state) {
  Array.from(state.channels.values()).forEach(channel => {
    if (channel.type !== "private" || channel.memberIds.size) return;
    state.channels.delete(channel.id);
    state.invitations.forEach(invite => {
      if (invite.channelId === channel.id && invite.status === "pending") {
        invite.status = "expired";
      }
    });
  });
}

function finalizeInvitation(invite) {
  if (!invite || invite.status !== "pending") return;
  if (!invite.invitedIds.size) {
    invite.status = "expired";
    return;
  }
  if (invite.acceptedIds.size + invite.rejectedIds.size >= invite.invitedIds.size) {
    invite.status = "closed";
  }
}

function registerParticipant(state, { id, name, isHost = false, now = Date.now() }) {
  const participantId = String(id || "");
  if (!participantId) throw new Error("invalid_participant");
  const existing = state.participants.get(participantId);
  const participant = {
    id: participantId,
    name: normalizeName(name, isHost ? state.hostName : "Player"),
    isHost: !!isHost,
    currentChannelId: existing ? existing.currentChannelId : MAIN_CHANNEL_ID,
    joinedAt: existing ? existing.joinedAt : now,
    updatedAt: now
  };
  state.participants.set(participantId, participant);
  if (!state.channels.has(participant.currentChannelId)) {
    participant.currentChannelId = MAIN_CHANNEL_ID;
  }
  state.channels.forEach(channel => channel.memberIds.delete(participantId));
  state.channels.get(participant.currentChannelId).memberIds.add(participantId);
  return participant;
}

function unregisterParticipant(state, participantId) {
  state.participants.delete(participantId);
  state.channels.forEach(channel => channel.memberIds.delete(participantId));
  state.channels.forEach(channel => channel.invitedIds.delete(participantId));
  state.invitations.forEach(invite => {
    invite.invitedIds.delete(participantId);
    invite.acceptedIds.delete(participantId);
    invite.rejectedIds.delete(participantId);
    if (invite.fromId === participantId && invite.status === "pending") {
      invite.status = "expired";
    }
    finalizeInvitation(invite);
  });
  closeEmptyPrivateChannels(state);
}

function createInvite(state, { fromId, invitedIds = [], now = Date.now() }) {
  if (state.recall) throw new Error("recall_in_progress");
  const from = requireParticipant(state, fromId);
  const uniqueInvitedIds = Array.from(new Set(invitedIds.map(String))).filter(
    id => id && id !== from.id && state.participants.has(id)
  );
  if (!uniqueInvitedIds.length) throw new Error("invalid_invite_targets");

  const channelId = `private-${state.nextChannelSeq++}`;
  const inviteId = `invite-${state.nextInviteSeq++}`;
  state.channels.set(channelId, {
    id: channelId,
    type: "private",
    name: from.isHost ? `${from.name} invited` : `${from.name}'s private chat`,
    createdBy: from.id,
    memberIds: new Set(),
    invitedIds: new Set(uniqueInvitedIds),
    createdAt: now
  });
  state.invitations.set(inviteId, {
    id: inviteId,
    channelId,
    fromId: from.id,
    invitedIds: new Set(uniqueInvitedIds),
    acceptedIds: new Set(),
    rejectedIds: new Set(),
    status: "pending",
    createdAt: now
  });
  moveParticipantToChannel(state, from.id, channelId);
  return summarizeInvite(state.invitations.get(inviteId));
}

function respondInvite(state, { participantId, inviteId, accept, now = Date.now() }) {
  if (state.recall) throw new Error("recall_in_progress");
  const participant = requireParticipant(state, participantId);
  const invite = state.invitations.get(inviteId);
  if (!invite || invite.status !== "pending") throw new Error("invite_not_found");
  if (!invite.invitedIds.has(participant.id)) throw new Error("not_invited");

  if (accept) {
    invite.acceptedIds.add(participant.id);
    invite.rejectedIds.delete(participant.id);
    moveParticipantToChannel(state, participant.id, invite.channelId);
  } else {
    invite.rejectedIds.add(participant.id);
    invite.acceptedIds.delete(participant.id);
  }
  participant.updatedAt = now;
  finalizeInvitation(invite);
  return summarizeInvite(invite);
}

function joinChannel(state, { participantId, channelId }) {
  const participant = requireParticipant(state, participantId);
  const channel = requireChannel(state, channelId);
  if (channel.type === "private" && !participant.isHost && !channel.memberIds.has(participant.id)) {
    throw new Error("not_channel_member");
  }
  return moveParticipantToChannel(state, participant.id, channel.id);
}

function leaveChannel(state, { participantId }) {
  return moveParticipantToChannel(state, participantId, MAIN_CHANNEL_ID);
}

function setMuteAll(state, { byId, value }) {
  requireHost(state, byId);
  state.muteAll = !!value;
  return state.muteAll;
}

function canSpeak(state, participantId) {
  const participant = requireParticipant(state, participantId);
  return participant.isHost || !state.muteAll;
}

function startRecall(state, { byId, now = Date.now(), delayMs = RECALL_DELAY_MS }) {
  requireHost(state, byId);
  state.recall = {
    startedAt: now,
    executeAt: now + Math.max(0, Number(delayMs) || 0)
  };
  return state.recall;
}

function executeRecall(state, { byId, now = Date.now() }) {
  requireHost(state, byId);
  if (state.recall && now < state.recall.executeAt) throw new Error("recall_not_ready");
  state.participants.forEach(participant => {
    state.channels.forEach(channel => channel.memberIds.delete(participant.id));
    participant.currentChannelId = MAIN_CHANNEL_ID;
    state.channels.get(MAIN_CHANNEL_ID).memberIds.add(participant.id);
  });
  Array.from(state.channels.keys()).forEach(channelId => {
    if (channelId !== MAIN_CHANNEL_ID) state.channels.delete(channelId);
  });
  state.invitations.clear();
  state.recall = null;
}

function summarizeInvite(invite) {
  return {
    id: invite.id,
    channelId: invite.channelId,
    fromId: invite.fromId,
    invitedIds: Array.from(invite.invitedIds),
    acceptedIds: Array.from(invite.acceptedIds),
    rejectedIds: Array.from(invite.rejectedIds),
    status: invite.status,
    createdAt: invite.createdAt
  };
}

function summarizeChannel(channel) {
  return {
    id: channel.id,
    type: channel.type,
    name: channel.name,
    createdBy: channel.createdBy,
    memberIds: Array.from(channel.memberIds),
    invitedIds: Array.from(channel.invitedIds),
    storytellerPresent: channel.memberIds.has("host"),
    createdAt: channel.createdAt
  };
}

function summarizeParticipant(participant) {
  return {
    id: participant.id,
    name: participant.name,
    isHost: participant.isHost,
    currentChannelId: participant.currentChannelId
  };
}

function summarize(state) {
  return {
    muteAll: state.muteAll,
    recall: state.recall ? { ...state.recall } : null,
    channels: Array.from(state.channels.values())
      .map(summarizeChannel)
      .sort((a, b) => (a.id === MAIN_CHANNEL_ID ? -1 : b.id === MAIN_CHANNEL_ID ? 1 : a.createdAt - b.createdAt)),
    participants: Array.from(state.participants.values())
      .map(summarizeParticipant)
      .sort((a, b) => (a.id === "host" ? -1 : b.id === "host" ? 1 : a.name.localeCompare(b.name))),
    invitations: Array.from(state.invitations.values())
      .filter(invite => invite.status === "pending")
      .map(summarizeInvite)
  };
}

module.exports = {
  MAIN_CHANNEL_ID,
  RECALL_DELAY_MS,
  createVoiceState,
  ensureVoiceState,
  registerParticipant,
  unregisterParticipant,
  createInvite,
  respondInvite,
  joinChannel,
  leaveChannel,
  setMuteAll,
  canSpeak,
  startRecall,
  executeRecall,
  summarize
};
