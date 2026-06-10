const emptyVoiceState = () => ({
  muteAll: false,
  recall: null,
  channels: [],
  participants: [],
  invitations: []
});

const ownId = rootState =>
  rootState.session.isSpectator ? rootState.session.playerId : "host";

const state = () => ({
  enabled: false,
  micEnabled: false,
  error: "",
  state: emptyVoiceState(),
  inviteRejection: null,
  pendingSignals: [],
  signalNonce: 0
});

const getters = {
  ownId: (state, getters, rootState) => ownId(rootState),
  ownParticipant(state, getters, rootState) {
    const id = ownId(rootState);
    return state.state.participants.find(participant => participant.id === id) || null;
  },
  currentChannel(state, getters) {
    const participant = getters.ownParticipant;
    const channelId = participant ? participant.currentChannelId : "main";
    return state.state.channels.find(channel => channel.id === channelId) || null;
  },
  canSpeak(state, getters, rootState) {
    return !state.state.muteAll || !rootState.session.isSpectator;
  },
  pendingInvites(state, getters, rootState) {
    const id = ownId(rootState);
    return state.state.invitations.filter(invite => invite.invitedIds.includes(id));
  },
  currentMembers(state, getters) {
    const channel = getters.currentChannel;
    if (!channel) return [];
    return channel.memberIds
      .map(id => state.state.participants.find(participant => participant.id === id))
      .filter(Boolean);
  }
};

const mutations = {
  setEnabled(state, value) {
    state.enabled = !!value;
    if (!state.enabled) state.micEnabled = false;
  },
  setMicEnabled(state, value) {
    state.micEnabled = !!value;
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
  sendSignal() {}
};

export default {
  namespaced: true,
  state,
  getters,
  mutations
};
