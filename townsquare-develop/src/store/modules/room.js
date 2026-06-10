const emptyCreateForm = () => ({
  name: "",
  hostName: "",
  note: "",
  maxPlayers: 10,
  visibility: "public",
  password: "",
  scriptJson: "",
  voiceUrl: "",
});

const emptyJoinForm = () => ({
  roomId: "",
  playerName: "",
  password: "",
});

const state = () => ({
  list: [],
  current: null,
  players: [],
  isHost: false,
  isLoading: false,
  error: "",
  createForm: emptyCreateForm(),
  joinForm: emptyJoinForm(),
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
  },
  requestList() {},
  create() {},
  join() {},
  update() {},
  kick() {},
};

export default {
  namespaced: true,
  state,
  mutations,
};
