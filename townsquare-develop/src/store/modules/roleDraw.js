import {
  buildDrawQueue,
  drawRoleFromPool,
  normalizeDrawOptions,
} from "@/services/roleDraw";

const defaultOptions = () => ({
  startSeat: 1,
  direction: "forward",
  manualDrawEnabled: false,
  autoDrawEnabled: false,
  autoDrawSeconds: 30,
});

const state = () => ({
  configuredPool: [],
  active: false,
  completed: false,
  queue: [],
  pool: [],
  assignments: {},
  currentIndex: -1,
  options: defaultOptions(),
  turnStartedAt: 0,
});

const getters = {
  remainingCount(state) {
    return state.pool.length;
  },
  currentSeatIndex(state) {
    if (!state.active || state.currentIndex < 0) return -1;
    return state.queue[state.currentIndex] ?? -1;
  },
  currentAssignment(state, getters) {
    const seatIndex = getters.currentSeatIndex;
    return seatIndex >= 0 ? state.assignments[seatIndex] || "" : "";
  },
  isFinished(state) {
    return (
      state.completed ||
      (!!state.queue.length && state.currentIndex >= state.queue.length)
    );
  },
};

const mutations = {
  setConfiguredPool(state, pool = []) {
    state.configuredPool = Array.isArray(pool) ? pool.filter(Boolean) : [];
  },
  setOptions(state, options = {}) {
    state.options = normalizeDrawOptions(options, options.playerCount || 0);
  },
  start(state, { queue = [], pool = [], options = {}, now = Date.now() } = {}) {
    state.active = queue.length > 0 && pool.length > 0;
    state.completed = false;
    state.queue = queue.slice();
    state.pool = pool.slice();
    state.assignments = {};
    state.currentIndex = state.active ? 0 : -1;
    state.options = {
      ...defaultOptions(),
      ...options,
    };
    state.turnStartedAt = state.active ? now : 0;
  },
  drawCurrent(
    state,
    { roleId = "", remainingPool = [], now = Date.now() } = {},
  ) {
    if (!state.active || state.currentIndex < 0 || !roleId) return;
    const seatIndex = state.queue[state.currentIndex];
    if (seatIndex === undefined) return;
    state.assignments = {
      ...state.assignments,
      [seatIndex]: roleId,
    };
    state.pool = remainingPool.slice();
    state.currentIndex += 1;
    state.completed =
      state.currentIndex >= state.queue.length || !state.pool.length;
    state.active = !state.completed;
    state.turnStartedAt = state.active ? now : 0;
  },
  applySnapshot(state, snapshot = {}) {
    state.configuredPool = Array.isArray(snapshot.configuredPool)
      ? snapshot.configuredPool.slice()
      : [];
    state.active = !!snapshot.active;
    state.completed = !!snapshot.completed;
    state.queue = Array.isArray(snapshot.queue) ? snapshot.queue.slice() : [];
    state.pool = Array.isArray(snapshot.pool) ? snapshot.pool.slice() : [];
    state.assignments = { ...(snapshot.assignments || {}) };
    state.currentIndex = Number.isInteger(snapshot.currentIndex)
      ? snapshot.currentIndex
      : -1;
    state.options = { ...defaultOptions(), ...(snapshot.options || {}) };
    state.turnStartedAt = Number(snapshot.turnStartedAt) || 0;
  },
  cancel(state) {
    state.active = false;
    state.completed = false;
    state.queue = [];
    state.pool = [];
    state.assignments = {};
    state.currentIndex = -1;
    state.turnStartedAt = 0;
  },
  requestDraw() {},
};

const actions = {
  startDraw({ commit, rootState, state }, options = {}) {
    const normalized = normalizeDrawOptions(
      options,
      rootState.players.players.length,
    );
    const queue = buildDrawQueue(
      rootState.players.players,
      normalized.startSeat,
      normalized.direction,
    );
    commit("start", {
      queue,
      pool: state.configuredPool,
      options: normalized,
    });
  },
  drawForCurrent({ commit, getters, rootState, rootGetters, state }, random) {
    const seatIndex = getters.currentSeatIndex;
    if (seatIndex < 0) return;
    const { roleId, remainingPool } = drawRoleFromPool(
      state.pool,
      typeof random === "function" ? random : Math.random,
    );
    const role =
      rootState.roles.get(roleId) || rootGetters.rolesJSONbyId.get(roleId) || {};
    const player = rootState.players.players[seatIndex];
    if (player && role.id) {
      commit(
        "players/update",
        { player, property: "role", value: role },
        { root: true },
      );
    }
    commit("drawCurrent", { roleId, remainingPool });
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
