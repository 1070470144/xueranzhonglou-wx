const STORAGE_KEY = "townsquare.storyLog";

const createId = (prefix) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .substr(2, 6)}`;

const createGame = () => ({
  id: createId("game"),
  startedAt: Date.now(),
  endedAt: null,
  phaseType: "setup",
  phaseNumber: 0,
  nightNumber: 0,
  dayNumber: 0,
  logs: [],
});

const normalizeState = (saved) => {
  if (!saved || !saved.games || !saved.currentGameId) {
    const game = createGame();
    return {
      currentGameId: game.id,
      games: { [game.id]: game },
    };
  }
  if (!saved.games[saved.currentGameId]) {
    const game = createGame();
    saved.currentGameId = game.id;
    saved.games[game.id] = game;
  }
  return saved;
};

const loadState = () => {
  try {
    return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch (error) {
    return normalizeState();
  }
};

const persist = (state) => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      currentGameId: state.currentGameId,
      games: state.games,
    }),
  );
};

const getCurrentGame = (state) => state.games[state.currentGameId];

const mutations = {
  addEntry(state, entry) {
    const game = getCurrentGame(state);
    if (!game) return;
    const log = {
      id: createId("log"),
      source: "manual",
      type: "note",
      title: "",
      content: "",
      playerIds: [],
      roleId: "",
      phaseType: game.phaseType,
      phaseNumber: game.phaseNumber,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...entry,
    };
    game.logs.push(log);
    persist(state);
  },
  updateEntry(state, { id, content }) {
    const game = getCurrentGame(state);
    if (!game) return;
    const log = game.logs.find((item) => item.id === id);
    if (!log) return;
    log.content = content;
    log.updatedAt = Date.now();
    persist(state);
  },
  moveEntryPhase(state, { id, phaseType, phaseNumber }) {
    const game = getCurrentGame(state);
    if (!game) return;
    const log = game.logs.find((item) => item.id === id);
    if (!log) return;
    const number = Math.max(0, parseInt(phaseNumber, 10) || 0);
    log.phaseType = phaseType;
    log.phaseNumber = phaseType === "setup" ? 0 : number;
    log.updatedAt = Date.now();
    persist(state);
  },
  appendEntryContent(state, { id, content }) {
    const game = getCurrentGame(state);
    if (!game) return;
    const log = game.logs.find((item) => item.id === id);
    if (!log || !content) return;
    log.content = log.content ? `${log.content}\n${content}` : content;
    log.updatedAt = Date.now();
    persist(state);
  },
  deleteEntry(state, id) {
    const game = getCurrentGame(state);
    if (!game) return;
    game.logs = game.logs.filter((item) => item.id !== id);
    persist(state);
  },
  clearCurrentLogs(state) {
    const game = getCurrentGame(state);
    if (!game) return;
    game.logs = [];
    game.phaseType = "setup";
    game.phaseNumber = 0;
    game.nightNumber = 0;
    game.dayNumber = 0;
    persist(state);
  },
  startNewGame(state) {
    const current = getCurrentGame(state);
    if (current && !current.endedAt) {
      current.endedAt = Date.now();
    }
    const game = createGame();
    state.currentGameId = game.id;
    state.games = {
      ...state.games,
      [game.id]: game,
    };
    persist(state);
  },
  advancePhase(state, isNight) {
    const game = getCurrentGame(state);
    if (!game) return;
    if (isNight) {
      game.nightNumber += 1;
      game.phaseType = "night";
      game.phaseNumber = game.nightNumber;
    } else {
      game.dayNumber += 1;
      game.phaseType = "day";
      game.phaseNumber = game.dayNumber;
    }
    persist(state);
  },
  setPhase(state, { phaseType, phaseNumber }) {
    const game = getCurrentGame(state);
    if (!game) return;
    const number = Math.max(0, parseInt(phaseNumber, 10) || 0);
    game.phaseType = phaseType;
    game.phaseNumber = phaseType === "setup" ? 0 : number;
    if (phaseType === "night") game.nightNumber = number;
    if (phaseType === "day") game.dayNumber = number;
    persist(state);
  },
};

const getters = {
  currentGame: (state) => getCurrentGame(state),
  currentLogs: (state) => {
    const game = getCurrentGame(state);
    return game ? game.logs : [];
  },
};

export default {
  namespaced: true,
  state: loadState,
  getters,
  mutations,
};
