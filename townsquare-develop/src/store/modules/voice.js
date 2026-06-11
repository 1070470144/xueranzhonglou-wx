const emptyVoiceState = () => ({
  muteAll: false,
  recall: null,
  channels: [],
  participants: [],
  invitations: [],
});

const ownId = (rootState) =>
  rootState.session.isSpectator ? rootState.session.playerId : "host";

function normalizeSpeakingPayload(value) {
  if (value && typeof value === "object") {
    return {
      speaking: !!value.speaking,
      participantId: value.participantId || "",
    };
  }
  return { speaking: !!value, participantId: "" };
}

function syncOwnParticipantSpeaking(state, value) {
  const { speaking, participantId } = normalizeSpeakingPayload(value);
  if (!participantId) return;
  const participant = state.state.participants.find(
    (participant) => participant.id === participantId,
  );
  if (participant) participant.speaking = speaking;
}

const state = () => ({
  enabled: false,
  micEnabled: false,
  talkMode: "free",
  pushToTalkActive: false,
  speaking: false,
  listenVolume: 1,
  error: "",
  state: emptyVoiceState(),
  inviteRejection: null,
  pendingSignals: [],
  signalNonce: 0,
});

const getters = {
  ownId: (state, getters, rootState) => ownId(rootState),
  ownParticipant(state, getters, rootState) {
    const id = ownId(rootState);
    return (
      state.state.participants.find((participant) => participant.id === id) ||
      null
    );
  },
  currentChannel(state, getters) {
    const participant = getters.ownParticipant;
    const channelId = participant ? participant.currentChannelId : "main";
    return (
      state.state.channels.find((channel) => channel.id === channelId) || null
    );
  },
  canSpeak(state, getters, rootState) {
    return !state.state.muteAll || !rootState.session.isSpectator;
  },
  effectiveMicEnabled(state) {
    return state.talkMode === "pushToTalk"
      ? state.pushToTalkActive
      : state.micEnabled;
  },
  pendingInvites(state, getters, rootState) {
    const id = ownId(rootState);
    return state.state.invitations.filter((invite) =>
      invite.invitedIds.includes(id),
    );
  },
  currentMembers(state, getters) {
    const channel = getters.currentChannel;
    if (!channel) return [];
    return channel.memberIds
      .map((id) =>
        state.state.participants.find((participant) => participant.id === id),
      )
      .filter(Boolean);
  },
};

const mutations = {
  setEnabled(state, value) {
    state.enabled = !!value;
    if (!state.enabled) {
      state.micEnabled = false;
      state.pushToTalkActive = false;
      state.speaking = false;
    }
  },
  setMicEnabled(state, value) {
    state.micEnabled = !!value;
  },
  setTalkMode(state, value) {
    state.talkMode = value === "pushToTalk" ? "pushToTalk" : "free";
    state.pushToTalkActive = false;
    state.speaking = false;
    if (state.talkMode === "pushToTalk") state.micEnabled = false;
  },
  setPushToTalkActive(state, value) {
    state.pushToTalkActive = state.talkMode === "pushToTalk" && !!value;
  },
  setSpeaking(state, value) {
    const { speaking } = normalizeSpeakingPayload(value);
    state.speaking = speaking;
    syncOwnParticipantSpeaking(state, value);
  },
  setListenVolume(state, value) {
    const number = Number(value);
    state.listenVolume = Number.isFinite(number)
      ? Math.min(1, Math.max(0, number))
      : 1;
  },
  setState(state, payload) {
    state.state = payload || emptyVoiceState();
    state.error = "";
  },
  setError(state, value) {
    state.error = value || "";
  },
  receiveInviteRejection(state, payload) {
    state.inviteRejection = payload || null;
  },
  dismissInviteRejection(state) {
    state.inviteRejection = null;
  },
  receiveSignal(state, payload) {
    state.pendingSignals.push(payload);
    state.signalNonce += 1;
  },
  shiftSignal(state) {
    state.pendingSignals.shift();
  },
  clear(state) {
    state.enabled = false;
    state.micEnabled = false;
    state.pushToTalkActive = false;
    state.speaking = false;
    state.error = "";
    state.state = emptyVoiceState();
    state.inviteRejection = null;
    state.pendingSignals = [];
    state.signalNonce = 0;
  },
  requestState() {},
  createInvite() {},
  respondInvite() {},
  joinChannel() {},
  leaveChannel() {},
  setMuteAll() {},
  startRecall() {},
  executeRecall() {},
  sendSpeakingState() {},
  sendSignal() {},
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
};
