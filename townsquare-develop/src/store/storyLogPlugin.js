const clonePlayers = (players) =>
  (players || []).map((player) => ({
    id: player.id,
    name: player.name,
    role: player.role
      ? {
          id: player.role.id,
          name: player.role.name,
          team: player.role.team,
        }
      : {},
    isDead: !!player.isDead,
    isVoteless: !!player.isVoteless,
    reminders: [...(player.reminders || [])],
  }));

const playerName = (player) => (player && player.name) || "未命名玩家";
const roleName = (role) => (role && (role.name || role.id)) || "未设置角色";

const getPhaseEntry = (state, entry) => {
  const game =
    state.storyLog && state.storyLog.games[state.storyLog.currentGameId];
  if (!game) return entry;
  return {
    phaseType: game.phaseType,
    phaseNumber: game.phaseNumber,
    ...entry,
  };
};

const addAutoEntry = (store, entry) => {
  if (!store.state.storyLog) return;
  store.commit(
    "storyLog/addEntry",
    getPhaseEntry(store.state, {
      source: "auto",
      ...entry,
    }),
  );
};

const describeReminder = (reminder) => {
  if (!reminder) return "";
  if (typeof reminder === "string") return reminder;
  return reminder.name || reminder.label || reminder.id || "提醒标记";
};

const samePlayerIdentity = (before, after) =>
  before && after && before.id === after.id && before.name === after.name;

const roleId = (player) => (player && player.role && player.role.id) || "";

const remindersText = (player) =>
  (player && player.reminders ? player.reminders : [])
    .map(describeReminder)
    .join("|");

function handlePlayersSet(store, beforePlayers, afterPlayers) {
  if (!Array.isArray(afterPlayers)) return;

  if (beforePlayers.length !== afterPlayers.length) {
    addAutoEntry(store, {
      type: "player",
      title: `更新玩家列表：${afterPlayers.length} 位玩家`,
    });
    return;
  }

  const sameSeats = beforePlayers.every((player, index) =>
    samePlayerIdentity(player, afterPlayers[index]),
  );
  if (!sameSeats) {
    addAutoEntry(store, {
      type: "player",
      title: "重新排序座位",
    });
    return;
  }

  const roleChanged = beforePlayers.some(
    (player, index) => roleId(player) !== roleId(afterPlayers[index]),
  );
  const remindersChanged = beforePlayers.some(
    (player, index) =>
      remindersText(player) !== remindersText(afterPlayers[index]),
  );
  if (!roleChanged && !remindersChanged) return;

  const clearedRoles =
    beforePlayers.some((player) => roleId(player) || remindersText(player)) &&
    afterPlayers.every((player) => !roleId(player) && !remindersText(player));

  addAutoEntry(store, {
    type: "role",
    title: clearedRoles ? "清空角色与提醒" : "重新分配角色或提醒",
  });
}

function handlePlayerUpdate(store, beforePlayers, payload) {
  if (!payload || !payload.player || payload.isFromSockets) return;
  const before = beforePlayers.find(
    (player) => player.id === payload.player.id,
  );
  const after = payload.player;
  if (!before) return;

  if (payload.property === "role") {
    addAutoEntry(store, {
      type: "role",
      title: `${playerName(after)} 设置为 ${roleName(payload.value)}`,
      content: `原角色：${roleName(before.role)}`,
      playerIds: [after.id],
      roleId: payload.value && payload.value.id,
    });
  }

  if (payload.property === "name" && before.name !== payload.value) {
    addAutoEntry(store, {
      type: "player",
      title: `${before.name || "未命名玩家"} 改名为 ${payload.value}`,
      playerIds: [after.id],
    });
  }

  if (payload.property === "isDead" && before.isDead !== payload.value) {
    addAutoEntry(store, {
      type: "status",
      title: `${playerName(after)} ${payload.value ? "死亡" : "复活"}`,
      playerIds: [after.id],
    });
  }

  if (
    payload.property === "isVoteless" &&
    before.isVoteless !== payload.value
  ) {
    addAutoEntry(store, {
      type: "status",
      title: `${playerName(after)} ${
        payload.value ? "失去投票权" : "恢复投票权"
      }`,
      playerIds: [after.id],
    });
  }

  if (payload.property === "reminders") {
    const beforeNames = (before.reminders || []).map(describeReminder);
    const afterNames = (payload.value || []).map(describeReminder);
    const added = afterNames.filter((name) => !beforeNames.includes(name));
    const removed = beforeNames.filter((name) => !afterNames.includes(name));
    if (added.length || removed.length) {
      addAutoEntry(store, {
        type: "reminder",
        title: `${playerName(after)} 提醒标记变更`,
        content: [
          added.length ? `添加：${added.join("、")}` : "",
          removed.length ? `移除：${removed.join("、")}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        playerIds: [after.id],
      });
    }
  }
}

function handleNomination(store, beforeSession, payload) {
  const nomination = payload && (payload.nomination || payload);
  if (!nomination || beforeSession.nomination) return;
  const players = store.state.players.players;
  const nominator = players[nomination[0]];
  const nominee = players[nomination[1]];
  if (!nominator || !nominee) return;
  addAutoEntry(store, {
    type: "nomination",
    title: `${playerName(nominator)} 提名 ${playerName(nominee)}`,
    playerIds: [nominator.id, nominee.id],
  });
}

function handleVoteHistory(store, beforeHistory) {
  const history = store.state.session.voteHistory;
  if (!history || history.length <= beforeHistory.length) return;
  const latest = history[history.length - 1];
  addAutoEntry(store, {
    type: "vote",
    title: `${latest.nominator} 提名 ${latest.nominee}，${latest.votes.length} 票`,
    content: latest.votes.length
      ? `投票玩家：${latest.votes.join("、")}`
      : "无人投票",
  });
}

export default (store) => {
  let previous = {
    players: clonePlayers(store.state.players.players),
    session: {
      nomination: store.state.session.nomination,
      voteHistory: [...store.state.session.voteHistory],
      markedPlayer: store.state.session.markedPlayer,
    },
    isNight: store.state.grimoire.isNight,
  };

  store.subscribe((mutation, state) => {
    const { type, payload } = mutation;
    if (String(type).indexOf("storyLog/") === 0) return;
    if (payload && payload.isFromSockets) return;

    const beforePlayers = previous.players;
    const beforeSession = previous.session;
    const beforeNight = previous.isNight;

    switch (type) {
      case "toggleNight": {
        if (beforeNight === state.grimoire.isNight) break;
        store.commit("storyLog/advancePhase", state.grimoire.isNight);
        const game = state.storyLog.games[state.storyLog.currentGameId];
        addAutoEntry(store, {
          type: "phase",
          title: state.grimoire.isNight
            ? `进入第 ${game.nightNumber} 夜`
            : `进入第 ${game.dayNumber} 天`,
        });
        break;
      }
      case "setEdition":
        addAutoEntry(store, {
          type: "script",
          title: `选择剧本：${
            state.edition.name || payload.name || "自定义剧本"
          }`,
        });
        break;
      case "players/add":
        addAutoEntry(store, {
          type: "player",
          title: `添加玩家：${payload}`,
        });
        break;
      case "players/remove": {
        const player = beforePlayers[payload];
        addAutoEntry(store, {
          type: "player",
          title: `移除玩家：${playerName(player)}`,
          playerIds: player && player.id ? [player.id] : [],
        });
        break;
      }
      case "players/clear":
        addAutoEntry(store, {
          type: "player",
          title: "清空玩家列表",
        });
        store.commit("storyLog/startNewGame");
        break;
      case "players/swap":
        addAutoEntry(store, {
          type: "player",
          title: `交换座位：${playerName(
            beforePlayers[payload[0]],
          )} / ${playerName(beforePlayers[payload[1]])}`,
        });
        break;
      case "players/move":
        addAutoEntry(store, {
          type: "player",
          title: `移动座位：${playerName(beforePlayers[payload[0]])}`,
        });
        break;
      case "players/set":
      case "players/setCount":
      case "players/resetSeats":
        handlePlayersSet(
          store,
          beforePlayers,
          clonePlayers(state.players.players),
        );
        break;
      case "players/update":
        handlePlayerUpdate(store, beforePlayers, payload);
        break;
      case "players/setFabled":
        addAutoEntry(store, {
          type: "fabled",
          title: "传奇角色变更",
        });
        break;
      case "session/nomination":
      case "session/setNomination":
        handleNomination(store, beforeSession, payload);
        break;
      case "session/addHistory":
        handleVoteHistory(store, beforeSession.voteHistory);
        break;
      case "session/setMarkedPlayer": {
        if (beforeSession.markedPlayer === payload) break;
        const player = state.players.players[payload];
        addAutoEntry(store, {
          type: "execution",
          title: player ? `${playerName(player)} 被标记处决` : "清除处决标记",
          playerIds: player && player.id ? [player.id] : [],
        });
        break;
      }
    }

    previous = {
      players: clonePlayers(state.players.players),
      session: {
        nomination: state.session.nomination,
        voteHistory: [...state.session.voteHistory],
        markedPlayer: state.session.markedPlayer,
      },
      isNight: state.grimoire.isNight,
    };
  });
};
