const NEWPLAYER = {
  name: "",
  id: "",
  role: {},
  reminders: [],
  isVoteless: false,
  isDead: false,
  pronouns: "",
  userId: "",
  nickname: "",
  user: null,
  authUser: null
};

const MAX_PLAYERS = 20;
const DEFAULT_PLAYER_LABEL = "\u73a9\u5bb6";

const normalizePlayerCount = count => {
  const parsed = Number.parseInt(count, 10);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(MAX_PLAYERS, parsed)) : 0;
};

const state = () => ({
  players: [],
  fabled: [],
  bluffs: [],
  lunaticBluffs: [],
  lunaticBluffPlayerIndex: -1
});

const getters = {
  alive({ players }) {
    return players.filter(player => !player.isDead).length;
  },
  nonTravelers({ players }) {
    const nonTravelers = players.filter(
      player => player.role.team !== "traveler"
    );
    return Math.min(nonTravelers.length, 15);
  },
  // calculate a Map of player => night order
  nightOrder({ players, fabled }) {
    const firstNight = [0];
    const otherNight = [0];
    players.forEach(({ role }) => {
      if (role.firstNight && !firstNight.includes(role.firstNight)) {
        firstNight.push(role.firstNight);
      }
      if (role.otherNight && !otherNight.includes(role.otherNight)) {
        otherNight.push(role.otherNight);
      }
    });
    fabled.forEach(role => {
      if (role.firstNight && !firstNight.includes(role.firstNight)) {
        firstNight.push(role.firstNight);
      }
      if (role.otherNight && !otherNight.includes(role.otherNight)) {
        otherNight.push(role.otherNight);
      }
    });
    firstNight.sort((a, b) => a - b);
    otherNight.sort((a, b) => a - b);
    const nightOrder = new Map();
    players.forEach(player => {
      const first = Math.max(firstNight.indexOf(player.role.firstNight), 0);
      const other = Math.max(otherNight.indexOf(player.role.otherNight), 0);
      nightOrder.set(player, { first, other });
    });
    fabled.forEach(role => {
      const first = Math.max(firstNight.indexOf(role.firstNight), 0);
      const other = Math.max(otherNight.indexOf(role.otherNight), 0);
      nightOrder.set(role, { first, other });
    });
    return nightOrder;
  }
};

const actions = {
  randomize({ state, commit }) {
    const players = state.players
      .map(a => [Math.random(), a])
      .sort((a, b) => a[0] - b[0])
      .map(a => a[1]);
    commit("set", players);
  },
  clearRoles({ state, commit, rootState }) {
    let players;
    if (rootState.session.isSpectator) {
      players = state.players.map(player => {
        if (player.role.team !== "traveler") {
          player.role = {};
        }
        player.reminders = [];
        return player;
      });
    } else {
      players = state.players.map(({ name, id, pronouns, userId, nickname, user, authUser }) => ({
        ...NEWPLAYER,
        name,
        id,
        pronouns,
        userId,
        nickname,
        user,
        authUser
      }));
      commit("setFabled", { fabled: [] });
    }
    commit("set", players);
    commit("setBluff");
  }
};

const mutations = {
  clear(state) {
    state.players = [];
    state.bluffs = [];
    state.lunaticBluffs = [];
    state.lunaticBluffPlayerIndex = -1;
    state.fabled = [];
  },
  set(state, players = []) {
    state.players = players;
  },
  /**
  The update mutation also has a property for isFromSockets
  this property can be addded to payload object for any mutations
  then can be used to prevent infinite loops when a property is
  able to be set from multiple different session on websockets.
  An example of this is in the sendPlayerPronouns and _updatePlayerPronouns
  in socket.js.
   */
  update(state, { player, property, value }) {
    const index = state.players.indexOf(player);
    if (index >= 0) {
      state.players[index][property] = value;
    }
  },
  setAuthSnapshot(state, { player, playerId, auth } = {}) {
    player = player || state.players.find(item => item.id === playerId);
    if (!player) return;
    player.userId = auth && auth.userId ? auth.userId : "";
    player.nickname = auth && auth.nickname ? auth.nickname : "";
  },
  add(state, name) {
    state.players.push({
      ...NEWPLAYER,
      name
    });
  },
  setCount(state, count) {
    const targetCount = normalizePlayerCount(count);
    if (state.players.length > targetCount) {
      state.players.splice(targetCount);
    }
    for (let index = state.players.length; index < targetCount; index++) {
      state.players.push({
        ...NEWPLAYER,
        name: `${DEFAULT_PLAYER_LABEL} ${index + 1}`
      });
    }
  },
  addMany(state, { count, startIndex = state.players.length } = {}) {
    const amount = Math.max(0, Math.min(MAX_PLAYERS - state.players.length, count || 0));
    for (let index = 0; index < amount; index++) {
      state.players.push({
        ...NEWPLAYER,
        name: `玩家 ${startIndex + index + 1}`
      });
    }
  },
  remove(state, index) {
    state.players.splice(index, 1);
  },
  swap(state, [from, to]) {
    [state.players[from], state.players[to]] = [
      state.players[to],
      state.players[from]
    ];
    // hack: "modify" the array so that Vue notices something changed
    state.players.splice(0, 0);
  },
  move(state, [from, to]) {
    state.players.splice(to, 0, state.players.splice(from, 1)[0]);
  },
  setBluff(state, { index, role } = {}) {
    if (index !== undefined) {
      state.bluffs.splice(index, 1, role);
    } else {
      state.bluffs = [];
    }
  },
  setLunaticBluff(state, { index, role } = {}) {
    if (index !== undefined) {
      state.lunaticBluffs.splice(index, 1, role);
    } else {
      state.lunaticBluffs = [];
    }
  },
  receiveLunaticBluffs(state, bluffs = []) {
    state.bluffs = bluffs;
  },
  setLunaticBluffPlayerIndex(state, index = -1) {
    state.lunaticBluffPlayerIndex = index;
  },
  setFabled(state, { index, fabled } = {}) {
    if (index !== undefined) {
      state.fabled.splice(index, 1);
    } else if (fabled) {
      if (!Array.isArray(fabled)) {
        state.fabled.push(fabled);
      } else {
        state.fabled = fabled;
      }
    }
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
