import { t } from "../i18n";
import { getAuthUserSnapshot } from "../services/auth";
import { buildBluffMessages, hydrateBluffs } from "../services/bluffs";

function parseRoomShareHash(hash) {
  const raw = String(hash || "").replace(/^#/, "");
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const roomId = params.get("room");
  if (!roomId) return { roomId: raw, inviteToken: "" };
  return {
    roomId,
    inviteToken: params.get("invite") || "",
  };
}

class LiveSession {
  constructor(store) {
    this._wss =
      process.env.VUE_APP_TOWNSQUARE_WS_URL ||
      "wss://live.clocktower.online:8080/";
    // this._wss = "ws://localhost:8081/"; // uncomment if using local server with NODE_ENV=development
    this._socket = null;
    this._isSpectator = true;
    this._gamestate = [];
    this._store = store;
    this._pingInterval = 30 * 1000; // 30 seconds between pings
    this._pingTimer = null;
    this._reconnectTimer = null;
    this._roomRequestTimer = null;
    this._isJoiningRoom = false;
    this._isRoomSession = false;
    this._isApplyingRoomSnapshot = false;
    this._players = {}; // map of players connected to a session
    this._playerAuthSnapshots = {}; // map of player IDs to web login snapshots
    this._pings = {}; // map of player IDs to ping
    // reconnect to previous session
    if (this._store.state.session.sessionId) {
      this.connect(this._store.state.session.sessionId);
    }
  }

  /**
   * Open a new session for the passed channel.
   * @param channel
   * @private
   */
  _open(channel) {
    this.disconnect();
    this._socket = new WebSocket(
      this._wss +
        channel +
        "/" +
        (this._isSpectator ? this._store.state.session.playerId : "host"),
    );
    this._socket.addEventListener("message", this._handleMessage.bind(this));
    this._socket.onopen = this._onOpen.bind(this);
    this._socket.onclose = (err) => {
      this._socket = null;
      clearInterval(this._pingTimer);
      this._pingTimer = null;
      if (err.code !== 1000) {
        // connection interrupted, reconnect after 3 seconds
        this._store.commit("session/setReconnecting", true);
        this._reconnectTimer = setTimeout(
          () => this.connect(channel),
          3 * 1000,
        );
      } else {
        if (this._isRoomSession) {
          this._store.commit("voice/clear");
          this._store.commit("room/clearRoom");
        }
        this._isRoomSession = false;
        this._store.commit("session/setSessionId", "");
        if (err.reason) alert(err.reason);
      }
    };
  }

  /**
   * Send a message through the socket.
   * @param command
   * @param params
   * @private
   */
  _send(command, params) {
    if (this._socket && this._socket.readyState === 1) {
      this._socket.send(JSON.stringify([command, params]));
    }
  }

  _sendWhenOpen(command, params) {
    if (!this._socket) return;
    if (this._socket.readyState === 1) {
      this._send(command, params);
      return;
    }
    this._socket.addEventListener(
      "open",
      () => {
        this._send(command, params);
      },
      { once: true },
    );
  }

  /**
   * Send a message directly to a single playerId, if provided.
   * Otherwise broadcast it.
   * @param playerId player ID or "host", optional
   * @param command
   * @param params
   * @private
   */
  _sendDirect(playerId, command, params) {
    if (playerId) {
      this._send("direct", { [playerId]: [command, params] });
    } else {
      this._send(command, params);
    }
  }

  /**
   * Open event handler for socket.
   * @private
   */
  _onOpen() {
    if (this._isSpectator) {
      this._sendDirect(
        "host",
        "getGamestate",
        this._store.state.session.playerId,
      );
    } else if (this._store.state.room.current) {
      this._send("room:state:get", {});
    } else {
      this._send("room:state:get", {});
    }
    if (this._isRoomSession || this._store.state.room.current) {
      this.requestVoiceState();
    }
    this._ping();
    this.syncAuthPlayer();
  }

  /**
   * Send a ping message with player ID and ST flag.
   * @private
   */
  _ping() {
    this._handlePing();
    this._send("ping", [
      this._isSpectator
        ? this._store.state.session.playerId
        : Object.keys(this._players).length,
      "latency",
    ]);
    clearTimeout(this._pingTimer);
    this._pingTimer = setTimeout(this._ping.bind(this), this._pingInterval);
  }

  /**
   * Handle an incoming socket message.
   * @param data
   * @private
   */
  _handleMessage({ data }) {
    let command, params;
    try {
      [command, params] = JSON.parse(data);
    } catch (err) {
      console.log("unsupported socket message", data);
    }
    switch (command) {
      case "room:list:update":
        this._store.commit("room/setList", params);
        break;
      case "room:create:ok":
        this._clearRoomRequestTimeout();
        this._applyRoomJoined(params, false);
        break;
      case "room:join:ok":
        this._clearRoomRequestTimeout();
        this._applyRoomJoined(params, true);
        break;
      case "room:state":
        this._applyRoomJoined(params, false);
        break;
      case "room:create:error":
      case "room:join:error":
      case "room:update:error":
      case "room:kick:error":
        this._clearRoomRequestTimeout();
        this._store.commit("room/setError", params && params.reason);
        this._store.commit("room/setLoading", false);
        break;
      case "room:update":
      case "room:update:ok":
        this._store.commit("room/setCurrent", params && params.room);
        this._store.commit("room/setLoading", false);
        this.ensureRoomSeats(params && params.room);
        if (params && params.scriptJson) {
          this._isApplyingRoomSnapshot = true;
          try {
            this._loadRoomScript(params.scriptJson);
          } finally {
            this._isApplyingRoomSnapshot = false;
          }
        }
        break;
      case "room:players":
        this._syncRoomPlayers(params);
        this._store.commit("room/setPlayers", params);
        break;
      case "room:kicked":
        alert(t("room.errors.kicked"));
        this._store.commit("voice/clear");
        this._store.commit("room/clearRoom");
        this._store.commit("session/setSessionId", "");
        break;
      case "room:closed":
        alert(t("room.errors.closed"));
        this._store.commit("voice/clear");
        this._store.commit("room/clearRoom");
        this._store.commit("session/setSessionId", "");
        break;
      case "voice:state":
        this._store.commit("voice/setState", params);
        break;
      case "voice:error":
        this._store.commit("voice/setError", params && params.reason);
        break;
      case "voice:invite:rejected":
        this._store.commit("voice/receiveInviteRejection", params);
        break;
      case "voice:signal":
        this._store.commit("voice/receiveSignal", params);
        break;
      case "getGamestate":
        this.sendGamestate(params);
        break;
      case "edition":
        this._updateEdition(params);
        break;
      case "fabled":
        this._updateFabled(params);
        break;
      case "lunaticBluffs":
        this._updateLunaticBluffs(params);
        break;
      case "gs":
        this._updateGamestate(params);
        break;
      case "player":
        this._updatePlayer(params);
        break;
      case "claim":
        this._updateSeat(params);
        break;
      case "ping":
        this._handlePing(params);
        break;
      case "nomination":
        if (!this._isSpectator) return;
        if (!params) {
          // create vote history record
          this._store.commit(
            "session/addHistory",
            this._store.state.players.players,
          );
        }
        this._store.commit("session/nomination", { nomination: params });
        break;
      case "swap":
        if (!this._isSpectator) return;
        this._store.commit("players/swap", params);
        break;
      case "move":
        if (!this._isSpectator) return;
        this._store.commit("players/move", params);
        break;
      case "remove":
        if (!this._isSpectator) return;
        this._store.commit("players/remove", params);
        break;
      case "marked":
        if (!this._isSpectator) return;
        this._store.commit("session/setMarkedPlayer", params);
        break;
      case "isNight":
        if (!this._isSpectator) return;
        this._store.commit("toggleNight", params);
        break;
      case "isVoteHistoryAllowed":
        if (!this._isSpectator) return;
        this._store.commit("session/setVoteHistoryAllowed", params);
        this._store.commit("session/clearVoteHistory");
        break;
      case "votingSpeed":
        if (!this._isSpectator) return;
        this._store.commit("session/setVotingSpeed", params);
        break;
      case "clearVoteHistory":
        if (!this._isSpectator) return;
        this._store.commit("session/clearVoteHistory");
        break;
      case "isVoteInProgress":
        if (!this._isSpectator) return;
        this._store.commit("session/setVoteInProgress", params);
        break;
      case "vote":
        this._handleVote(params);
        break;
      case "lock":
        this._handleLock(params);
        break;
      case "bye":
        this._handleBye(params);
        break;
      case "pronouns":
        this._updatePlayerPronouns(params);
        break;
      case "privateChat":
        this._store.commit("privateChat/receiveMessage", {
          ...params,
          isOpen: this._store.state.modals.privateChat,
        });
        break;
      case "authPlayer":
        this._updatePlayerAuth(params);
        break;
      case "playerName":
        this._updatePlayerName(params);
        break;
    }
  }

  /**
   * Connect to a new live session, either as host or spectator.
   * Set a unique playerId if there isn't one yet.
   * @param channel
   */
  connect(channel) {
    if (!this._store.state.session.playerId) {
      this._store.commit(
        "session/setPlayerId",
        Math.random().toString(36).substr(2),
      );
    }
    this._pings = {};
    this._playerAuthSnapshots = {};
    this._store.commit("session/setPlayerCount", 0);
    this._store.commit("session/setPing", 0);
    this._isSpectator = this._store.state.session.isSpectator;
    this._open(channel);
  }

  isConnectedTo(channel) {
    return (
      this._socket &&
      this._socket.readyState === 1 &&
      this._store.state.session.sessionId === channel
    );
  }

  isLobbyConnected() {
    return (
      this._socket &&
      this._socket.readyState === 1 &&
      this._store.state.session.sessionId === "" &&
      !this._store.state.room.current
    );
  }

  syncAuthPlayer() {
    if (!this._isSpectator || !this._socket || this._socket.readyState !== 1)
      return;
    const auth = getAuthUserSnapshot();
    this._sendDirect("host", "authPlayer", {
      playerId: this._store.state.session.playerId,
      auth,
    });
  }

  /**
   * Close the current session, if any.
   */
  disconnect() {
    this._pings = {};
    this._playerAuthSnapshots = {};
    this._store.commit("session/setPlayerCount", 0);
    this._store.commit("session/setPing", 0);
    this._store.commit("session/setReconnecting", false);
    this._store.commit("voice/clear");
    clearTimeout(this._reconnectTimer);
    if (this._socket) {
      if (this._isSpectator) {
        this._sendDirect("host", "bye", this._store.state.session.playerId);
      }
      this._socket.close(1000);
      this._socket = null;
    }
  }

  /**
   * Publish the current gamestate.
   * Optional param to reduce traffic. (send only player data)
   * @param playerId
   * @param isLightweight
   */
  sendGamestate(playerId = "", isLightweight = false) {
    if (this._isSpectator) return;
    this._gamestate = this._store.state.players.players.map((player) => ({
      name: player.name,
      id: player.id,
      isDead: player.isDead,
      isVoteless: player.isVoteless,
      pronouns: player.pronouns,
      ...(player.role && player.role.team === "traveler"
        ? { roleId: player.role.id }
        : {}),
    }));
    if (isLightweight) {
      this._sendDirect(playerId, "gs", {
        gamestate: this._gamestate,
        isLightweight,
      });
    } else {
      const { session, grimoire } = this._store.state;
      const { fabled } = this._store.state.players;
      this.sendEdition(playerId);
      this._sendDirect(playerId, "gs", {
        gamestate: this._gamestate,
        isNight: grimoire.isNight,
        isVoteHistoryAllowed: session.isVoteHistoryAllowed,
        nomination: session.nomination,
        votingSpeed: session.votingSpeed,
        lockedVote: session.lockedVote,
        isVoteInProgress: session.isVoteInProgress,
        markedPlayer: session.markedPlayer,
        fabled: fabled.map((f) => (f.isCustom ? f : { id: f.id })),
        ...(session.nomination ? { votes: session.votes } : {}),
      });
    }
  }

  /**
   * Update the gamestate based on incoming data.
   * @param data
   * @private
   */
  _updateGamestate(data) {
    if (!this._isSpectator) return;
    const {
      gamestate,
      isLightweight,
      isNight,
      isVoteHistoryAllowed,
      nomination,
      votingSpeed,
      votes,
      lockedVote,
      isVoteInProgress,
      markedPlayer,
      fabled,
    } = data;
    const players = this._store.state.players.players;
    // adjust number of players
    if (players.length < gamestate.length) {
      for (let x = players.length; x < gamestate.length; x++) {
        this._store.commit("players/add", gamestate[x].name);
      }
    } else if (players.length > gamestate.length) {
      for (let x = players.length; x > gamestate.length; x--) {
        this._store.commit("players/remove", x - 1);
      }
    }
    // update status for each player
    gamestate.forEach((state, x) => {
      const player = players[x];
      const { roleId } = state;
      // update relevant properties
      ["name", "id", "isDead", "isVoteless", "pronouns"].forEach((property) => {
        const value = state[property];
        if (player[property] !== value) {
          this._store.commit("players/update", { player, property, value });
        }
      });
      // roles are special, because of travelers
      if (roleId && player.role.id !== roleId) {
        const role =
          this._store.state.roles.get(roleId) ||
          this._store.getters.rolesJSONbyId.get(roleId);
        if (role) {
          this._store.commit("players/update", {
            player,
            property: "role",
            value: role,
          });
        }
      } else if (!roleId && player.role.team === "traveler") {
        this._store.commit("players/update", {
          player,
          property: "role",
          value: {},
        });
      }
    });
    if (!isLightweight) {
      this._store.commit("toggleNight", !!isNight);
      this._store.commit("session/setVoteHistoryAllowed", isVoteHistoryAllowed);
      this._store.commit("session/nomination", {
        nomination,
        votes,
        votingSpeed,
        lockedVote,
        isVoteInProgress,
      });
      this._store.commit("session/setMarkedPlayer", markedPlayer);
      this._store.commit("players/setFabled", {
        fabled: fabled.map((f) => this._store.state.fabled.get(f.id) || f),
      });
    }
  }

  /**
   * Publish an edition update. ST only
   * @param playerId
   */
  sendEdition(playerId = "") {
    if (this._isSpectator) return;
    const { edition } = this._store.state;
    let roles;
    if (!edition.isOfficial) {
      roles = this._store.getters.customRolesStripped;
    }
    this._sendDirect(playerId, "edition", {
      edition: edition.isOfficial ? { id: edition.id } : edition,
      ...(roles ? { roles } : {}),
    });
  }

  /**
   * Update edition and roles for custom editions.
   * @param edition
   * @param roles
   * @private
   */
  _updateEdition({ edition, roles }) {
    if (!this._isSpectator) return;
    this._store.commit("setEdition", edition);
    if (roles) {
      this._store.commit("setCustomRoles", roles);
      if (this._store.state.roles.size !== roles.length) {
        const missing = [];
        roles.forEach(({ id }) => {
          if (!this._store.state.roles.get(id)) {
            missing.push(id);
          }
        });
        alert(t("session.missingCustomRoles", { roles: missing.join(", ") }));
        this.disconnect();
        this._store.commit("toggleModal", "edition");
      }
    }
  }

  /**
   * Publish a fabled update. ST only
   */
  sendFabled() {
    if (this._isSpectator) return;
    const { fabled } = this._store.state.players;
    this._send(
      "fabled",
      fabled.map((f) => (f.isCustom ? f : { id: f.id })),
    );
  }

  /**
   * Update fabled roles.
   * @param fabled
   * @private
   */
  _updateFabled(fabled) {
    if (!this._isSpectator) return;
    this._store.commit("players/setFabled", {
      fabled: fabled.map((f) => this._store.state.fabled.get(f.id) || f),
    });
  }

  sendBluffs() {
    if (this._isSpectator) return;
    const { players, bluffs, lunaticBluffs, lunaticBluffPlayerIndex } =
      this._store.state.players;
    const message = buildBluffMessages(
      players,
      bluffs,
      lunaticBluffs,
      lunaticBluffPlayerIndex,
    );
    if (Object.keys(message).length) {
      this._send("direct", message);
    }
  }

  _updateLunaticBluffs(bluffs = []) {
    if (!this._isSpectator) return;
    this._store.commit(
      "players/receiveLunaticBluffs",
      hydrateBluffs(bluffs, this._store.state.roles),
    );
  }

  /**
   * Publish a player update.
   * @param player
   * @param property
   * @param value
   */
  sendPlayer({ player, property, value }) {
    if (this._isSpectator || property === "reminders") return;
    const index = this._store.state.players.players.indexOf(player);
    if (property === "role") {
      if (value.team && value.team === "traveler") {
        // update local gamestate to remember this player as a traveler
        this._gamestate[index].roleId = value.id;
        this._send("player", {
          index,
          property,
          value: value.id,
        });
      } else if (this._gamestate[index].roleId) {
        // player was previously a traveler
        delete this._gamestate[index].roleId;
        this._send("player", { index, property, value: "" });
      }
    } else {
      this._send("player", { index, property, value });
    }
  }

  /**
   * Update a player based on incoming data. Player only.
   * @param index
   * @param property
   * @param value
   * @private
   */
  _updatePlayer({ index, property, value }) {
    if (!this._isSpectator) return;
    const player = this._store.state.players.players[index];
    if (!player) return;
    // special case where a player stops being a traveler
    if (property === "role") {
      if (!value && player.role.team === "traveler") {
        // reset to an unknown role
        this._store.commit("players/update", {
          player,
          property: "role",
          value: {},
        });
      } else {
        // load role, first from session, the global, then fail gracefully
        const role =
          this._store.state.roles.get(value) ||
          this._store.getters.rolesJSONbyId.get(value) ||
          {};
        this._store.commit("players/update", {
          player,
          property: "role",
          value: role,
        });
      }
    } else {
      // just update the player otherwise
      this._store.commit("players/update", { player, property, value });
    }
    if (property === "id" && value === this._store.state.session.playerId) {
      this.sendClaimedPlayerName(index);
    }
  }

  /**
   * Send the seated player's requested display name to the host.
   * @param index
   */
  sendClaimedPlayerName(index) {
    if (!this._isSpectator) return;
    const name = (this._store.state.session.playerName || "").trim();
    if (!name) return;
    this._sendDirect("host", "playerName", {
      playerId: this._store.state.session.playerId,
      index,
      name,
    });
  }

  sendCurrentPlayerName() {
    if (!this._isSpectator) return;
    const index = this._store.state.session.claimedSeat;
    if (index < 0) return;
    this.sendClaimedPlayerName(index);
  }

  /**
   * Apply a claimed player's requested display name on the host.
   * @param playerId
   * @param index
   * @param name
   * @private
   */
  _updatePlayerName({ playerId, index, name } = {}) {
    if (this._isSpectator || !playerId || !name) return;
    const player = this._store.state.players.players[index];
    if (!player || player.id !== playerId) return;
    this._store.commit("players/update", {
      player,
      property: "name",
      value: name.trim().substr(0, 30),
    });
  }

  /**
   * Publish a player pronouns update
   * @param player
   * @param value
   * @param isFromSockets
   */
  sendPlayerPronouns({ player, value, isFromSockets }) {
    //send pronoun only for the seated player or storyteller
    //Do not re-send pronoun data for an update that was recieved from the sockets layer
    if (
      isFromSockets ||
      (this._isSpectator && this._store.state.session.playerId !== player.id)
    )
      return;
    const index = this._store.state.players.players.indexOf(player);
    this._send("pronouns", [index, value]);
  }

  /**
   * Update a pronouns based on incoming data.
   * @param index
   * @param value
   * @private
   */
  _updatePlayerPronouns([index, value]) {
    const player = this._store.state.players.players[index];

    this._store.commit("players/update", {
      player,
      property: "pronouns",
      value,
      isFromSockets: true,
    });
  }

  /**
   * Handle a ping message by another player / storyteller
   * @param playerIdOrCount
   * @param latency
   * @private
   */
  _handlePing([playerIdOrCount = 0, latency] = []) {
    const now = new Date().getTime();
    if (!this._isSpectator) {
      // remove players that haven't sent a ping in twice the timespan
      for (let player in this._players) {
        if (now - this._players[player] > this._pingInterval * 2) {
          delete this._players[player];
          delete this._pings[player];
        }
      }
      // store new player data before clearing claimed seats so a first claim is not immediately removed
      if (playerIdOrCount) {
        this._players[playerIdOrCount] = now;
        const ping = parseInt(latency, 10);
        if (ping && ping > 0 && ping < 30 * 1000) {
          // ping to Players
          this._pings[playerIdOrCount] = ping;
          const pings = Object.values(this._pings);
          this._store.commit(
            "session/setPing",
            Math.round(pings.reduce((a, b) => a + b, 0) / pings.length),
          );
        }
      }
      // remove claimed seats from players that are no longer connected
      this._store.state.players.players.forEach((player) => {
        if (player.id && !this._players[player.id]) {
          const disconnectedPlayerId = player.id;
          this._store.commit("players/update", {
            player,
            property: "id",
            value: "",
          });
          this._store.commit("players/setAuthSnapshot", {
            player,
            playerId: disconnectedPlayerId,
          });
        }
      });
    } else if (latency) {
      // ping to ST
      this._store.commit("session/setPing", parseInt(latency, 10));
    }
    // update player count
    if (!this._isSpectator || playerIdOrCount) {
      this._store.commit(
        "session/setPlayerCount",
        this._isSpectator ? playerIdOrCount : Object.keys(this._players).length,
      );
    }
  }

  _syncRoomPlayers(players = []) {
    if (this._isSpectator || !Array.isArray(players)) return;
    const now = new Date().getTime();
    players.forEach((player) => {
      if (player && player.id) this._players[player.id] = now;
    });
  }

  /**
   * Handle a player leaving the sessions. ST only
   * @param playerId
   * @private
   */
  _handleBye(playerId) {
    if (this._isSpectator) return;
    delete this._players[playerId];
    this._store.commit(
      "session/setPlayerCount",
      Object.keys(this._players).length,
    );
  }

  /**
   * Claim a seat, needs to be confirmed by the Storyteller.
   * Seats already occupied can't be claimed.
   * @param seat either -1 to vacate or the index of the seat claimed
   */
  claimSeat(seat) {
    if (!this._isSpectator) return;
    const players = this._store.state.players.players;
    const seatIsAvailable =
      players.length > seat && (seat < 0 || !players[seat].id);
    if (seatIsAvailable) {
      this._send("claim", [seat, this._store.state.session.playerId]);
      this.syncAuthPlayer();
    }
  }

  _updatePlayerAuth({ playerId, auth } = {}) {
    if (this._isSpectator || !playerId) return;
    if (auth && auth.userId) {
      this._playerAuthSnapshots[playerId] = auth;
    } else {
      delete this._playerAuthSnapshots[playerId];
    }
    this._store.commit("players/setAuthSnapshot", { playerId, auth });
  }

  /**
   * Update a player id associated with that seat.
   * @param index seat index or -1
   * @param value playerId to add / remove
   * @private
   */
  _updateSeat([index, value]) {
    if (this._isSpectator) return;
    const property = "id";
    const players = this._store.state.players.players;
    // remove previous seat
    const oldIndex = players.findIndex(({ id }) => id === value);
    if (oldIndex >= 0 && oldIndex !== index) {
      this._store.commit("players/update", {
        player: players[oldIndex],
        property,
        value: "",
      });
      this._store.commit("players/setAuthSnapshot", {
        player: players[oldIndex],
        playerId: value,
      });
    }
    // add playerId to new seat
    if (index >= 0) {
      const player = players[index];
      if (!player) return;
      this._store.commit("players/update", { player, property, value });
      this._store.commit("players/setAuthSnapshot", {
        playerId: value,
        auth: this._playerAuthSnapshots[value],
      });
    }
    // update player session list as if this was a ping
    this._handlePing([value, 0]);
  }

  /**
   * Distribute player roles to all seated players in a direct message.
   * This will be split server side so that each player only receives their own (sub)message.
   */
  distributeRoles() {
    if (this._isSpectator) return;
    const message = {};
    this._store.state.players.players.forEach((player, index) => {
      if (player.id && player.role) {
        message[player.id] = [
          "player",
          { index, property: "role", value: player.role.id },
        ];
      }
    });
    if (Object.keys(message).length) {
      this._send("direct", message);
    }
    this.sendBluffs();
  }

  /**
   * A player nomination. ST only
   * This also syncs the voting speed to the players.
   * Payload can be an object with {nomination} property or just the nomination itself, or undefined.
   * @param payload [nominator, nominee]|{nomination}
   */
  nomination(payload) {
    if (this._isSpectator) return;
    const nomination = payload ? payload.nomination || payload : payload;
    const players = this._store.state.players.players;
    if (
      !nomination ||
      (players.length > nomination[0] && players.length > nomination[1])
    ) {
      this.setVotingSpeed(this._store.state.session.votingSpeed);
      this._send("nomination", nomination);
    }
  }

  /**
   * Set the isVoteInProgress status. ST only
   */
  setVoteInProgress() {
    if (this._isSpectator) return;
    this._send("isVoteInProgress", this._store.state.session.isVoteInProgress);
  }

  /**
   * Send the isNight status. ST only
   */
  setIsNight() {
    if (this._isSpectator) return;
    this._send("isNight", this._store.state.grimoire.isNight);
  }

  /**
   * Send the isVoteHistoryAllowed state. ST only
   */
  setVoteHistoryAllowed() {
    if (this._isSpectator) return;
    this._send(
      "isVoteHistoryAllowed",
      this._store.state.session.isVoteHistoryAllowed,
    );
  }

  /**
   * Send the voting speed. ST only
   * @param votingSpeed voting speed in seconds, minimum 1
   */
  setVotingSpeed(votingSpeed) {
    if (this._isSpectator) return;
    if (votingSpeed) {
      this._send("votingSpeed", votingSpeed);
    }
  }

  /**
   * Set which player is on the block. ST only
   * @param playerIndex, player id or -1 for empty
   */
  setMarked(playerIndex) {
    if (this._isSpectator) return;
    this._send("marked", playerIndex);
  }

  /**
   * Clear the vote history for everyone. ST only
   */
  clearVoteHistory() {
    if (this._isSpectator) return;
    this._send("clearVoteHistory");
  }

  /**
   * Send a vote. Player or ST
   * @param index Seat of the player
   * @param sync Flag whether to sync this vote with others or not
   */
  vote([index]) {
    const player = this._store.state.players.players[index];
    if (
      this._store.state.session.playerId === player.id ||
      !this._isSpectator
    ) {
      // send vote only if it is your own vote or you are the storyteller
      this._send("vote", [
        index,
        this._store.state.session.votes[index],
        !this._isSpectator,
      ]);
    }
  }

  /**
   * Handle an incoming vote, but only if it is from ST or unlocked.
   * @param index
   * @param vote
   * @param fromST
   */
  _handleVote([index, vote, fromST]) {
    const { session, players } = this._store.state;
    const playerCount = players.players.length;
    const indexAdjusted =
      (index - 1 + playerCount - session.nomination[1]) % playerCount;
    if (fromST || indexAdjusted >= session.lockedVote - 1) {
      this._store.commit("session/vote", [index, vote]);
    }
  }

  /**
   * Lock a vote. ST only
   */
  lockVote() {
    if (this._isSpectator) return;
    const { lockedVote, votes, nomination } = this._store.state.session;
    const { players } = this._store.state.players;
    const index = (nomination[1] + lockedVote - 1) % players.length;
    this._send("lock", [this._store.state.session.lockedVote, votes[index]]);
  }

  /**
   * Update vote lock and the locked vote, if it differs. Player only
   * @param lock
   * @param vote
   * @private
   */
  _handleLock([lock, vote]) {
    if (!this._isSpectator) return;
    this._store.commit("session/lockVote", lock);
    if (lock > 1) {
      const { lockedVote, nomination } = this._store.state.session;
      const { players } = this._store.state.players;
      const index = (nomination[1] + lockedVote - 1) % players.length;
      if (this._store.state.session.votes[index] !== vote) {
        this._store.commit("session/vote", [index, vote]);
      }
    }
  }

  /**
   * Swap two player seats. ST only
   * @param payload
   */
  swapPlayer(payload) {
    if (this._isSpectator) return;
    this._send("swap", payload);
  }

  /**
   * Move a player to another seat. ST only
   * @param payload
   */
  movePlayer(payload) {
    if (this._isSpectator) return;
    this._send("move", payload);
  }

  /**
   * Remove a player. ST only
   * @param payload
   */
  removePlayer(payload) {
    if (this._isSpectator) return;
    this._send("remove", payload);
  }

  requestRoomList() {
    this._ensureLobbySocket();
    this._sendWhenOpen("room:list", {});
  }

  createRoom(payload) {
    this._ensureLobbySocket();
    this._store.commit("room/setLoading", true);
    this._store.commit("room/setError", "");
    this._startRoomRequestTimeout();
    this._sendWhenOpen("room:create", this._withCurrentScript(payload));
  }

  joinRoom(payload) {
    if (!this._store.state.session.playerId) {
      this._store.commit(
        "session/setPlayerId",
        Math.random().toString(36).substr(2),
      );
    }
    this._ensureLobbySocket();
    this._store.commit("room/setLoading", true);
    this._store.commit("room/setError", "");
    this._startRoomRequestTimeout();
    this._sendWhenOpen("room:join", {
      ...payload,
      playerId: this._store.state.session.playerId,
    });
  }

  updateRoom(payload) {
    if (this._isSpectator) return;
    this._store.commit("room/setLoading", true);
    this._store.commit("room/setError", "");
    this._send("room:update", this._withCurrentScript(payload));
  }

  kickRoomPlayer(playerId) {
    if (this._isSpectator) return;
    this._send("room:kick", { playerId });
  }

  requestVoiceState() {
    this._send("voice:state:get", {});
  }

  createVoiceInvite(payload) {
    const invitedIds = payload && payload.invitedIds;
    this._send("voice:invite:create", {
      invitedIds: Array.isArray(invitedIds) ? invitedIds : [],
    });
  }

  respondVoiceInvite(payload) {
    this._send("voice:invite:respond", {
      inviteId: payload && payload.inviteId,
      accept: !!(payload && payload.accept),
    });
  }

  joinVoiceChannel(channelId) {
    this._send("voice:channel:join", { channelId });
  }

  leaveVoiceChannel() {
    this._send("voice:channel:leave", {});
  }

  setVoiceMuteAll(value) {
    if (this._isSpectator) return;
    this._send("voice:muteAll:set", { value: !!value });
  }

  startVoiceRecall() {
    if (this._isSpectator) return;
    this._send("voice:recall:start", { delayMs: 3000 });
  }

  executeVoiceRecall() {
    if (this._isSpectator) return;
    this._send("voice:recall:execute", {});
  }

  setVoiceSpeaking(payload) {
    this._send("voice:speaking:set", {
      speaking: !!(payload && payload.speaking),
    });
  }

  sendVoiceSignal(payload) {
    if (!payload || !payload.toId || !payload.signal) return;
    this._send("voice:signal", payload);
  }

  _ensureLobbySocket() {
    if (this.isLobbyConnected()) return;
    this.disconnect();
    const playerId =
      this._store.state.session.playerId ||
      Math.random().toString(36).substr(2);
    this._store.commit("session/setPlayerId", playerId);
    this._socket = new WebSocket(`${this._wss}lobby/${playerId}`);
    this._socket.addEventListener("message", this._handleMessage.bind(this));
    this._socket.onopen = () => this._send("room:list", {});
    this._socket.onclose = () => {
      this._socket = null;
      clearInterval(this._pingTimer);
      this._pingTimer = null;
    };
  }

  _applyRoomJoined({ room, scriptJson } = {}, isSpectator) {
    if (!room || !room.id) return;
    this._isSpectator = isSpectator;
    this._isJoiningRoom = true;
    this._store.commit("session/claimSeat", -1);
    this._store.commit("session/clearVoteHistory");
    this._store.commit("voice/clear");
    if (isSpectator) this._store.commit("players/clear");
    this._isRoomSession = true;
    this._store.commit("session/setSpectator", isSpectator);
    this._store.commit("session/setGameStartedAt", Date.now());
    this._store.commit("session/setSessionId", room.id);
    this._store.commit("room/setCurrent", room);
    this._store.commit("room/setHost", !isSpectator);
    this._store.commit("room/setLoading", false);
    this._store.commit("toggleGrimoire", false);
    if (!isSpectator) this.ensureRoomSeats(room);
    this._isApplyingRoomSnapshot = true;
    try {
      if (scriptJson) this._loadRoomScript(scriptJson);
    } finally {
      this._isApplyingRoomSnapshot = false;
    }
    if (isSpectator) {
      this._sendDirect(
        "host",
        "getGamestate",
        this._store.state.session.playerId,
      );
      this.syncAuthPlayer();
    }
    this.requestVoiceState();
  }

  ensureRoomSeats(room) {
    if (this._isSpectator || !room) return;
    const maxPlayers = Math.min(
      20,
      Math.max(1, parseInt(room.maxPlayers, 10) || 10),
    );
    this._store.commit("players/setCount", maxPlayers);
  }

  _loadRoomScript(scriptJson) {
    try {
      const script =
        typeof scriptJson === "string" ? JSON.parse(scriptJson) : scriptJson;
      if (!script) return;
      if (Array.isArray(script)) {
        const edition = script.find((item) => item && item.id === "_meta") || {
          id: "custom",
          name: "Custom Script",
        };
        const roles = script.filter((item) => item && item.id !== "_meta");
        this._store.commit("setEdition", edition);
        this._store.commit("setCustomRoles", roles);
        return;
      }
      this._store.commit("setEdition", script);
    } catch (error) {
      console.log("could not load room script", error);
    }
  }

  _startRoomRequestTimeout() {
    this._clearRoomRequestTimeout();
    this._roomRequestTimer = setTimeout(() => {
      this._store.commit("room/setLoading", false);
      this._store.commit("room/setError", "connection_timeout");
    }, 8000);
  }

  _clearRoomRequestTimeout() {
    clearTimeout(this._roomRequestTimer);
    this._roomRequestTimer = null;
  }

  _withCurrentScript(payload = {}) {
    const { edition } = this._store.state;
    const roles = this._store.getters.customRolesStripped || [];
    const scriptJson = JSON.stringify([
      edition && edition.isOfficial
        ? { id: "_meta", name: edition.name, author: edition.author }
        : edition,
      ...roles,
    ]);
    return {
      ...payload,
      scriptName: (edition && (edition.name || edition.id)) || "No Script",
      scriptJson,
    };
  }

  /**
   * Send a private chat message to one connected participant in the same room.
   * @param payload
   */
  sendPrivateChat(payload) {
    const toId = payload && payload.toId;
    if (!toId || !this._socket || this._socket.readyState !== 1) return;
    this._sendDirect(toId, "privateChat", payload);
  }
}

export default (store) => {
  // setup
  const session = new LiveSession(store);
  if (typeof window !== "undefined") {
    window.addEventListener("townsquare-auth-change", () => {
      session.syncAuthPlayer();
    });
  }

  // listen to mutations
  store.subscribe(({ type, payload }, state) => {
    if (session._isApplyingRoomSnapshot) return;
    switch (type) {
      case "session/setSessionId":
        if (session._isJoiningRoom) {
          session._isJoiningRoom = false;
          return;
        }
        session._isRoomSession = false;
        if (state.session.sessionId) {
          if (session.isConnectedTo(state.session.sessionId)) return;
          store.commit("privateChat/clear");
          session.connect(state.session.sessionId);
        } else {
          window.location.hash = "";
          store.commit("privateChat/clear");
          store.commit("voice/clear");
          store.commit("room/clearRoom");
          session.disconnect();
        }
        break;
      case "room/requestList":
        session.requestRoomList();
        break;
      case "room/create":
        session.createRoom(payload);
        break;
      case "room/join":
        session.joinRoom(payload);
        break;
      case "room/update":
        session.updateRoom(payload);
        break;
      case "room/kick":
        session.kickRoomPlayer(payload);
        break;
      case "privateChat/sendMessage":
        session.sendPrivateChat(payload);
        break;
      case "voice/requestState":
        session.requestVoiceState();
        break;
      case "voice/createInvite":
        session.createVoiceInvite(payload);
        break;
      case "voice/respondInvite":
        session.respondVoiceInvite(payload);
        break;
      case "voice/joinChannel":
        session.joinVoiceChannel(payload);
        break;
      case "voice/leaveChannel":
        session.leaveVoiceChannel();
        break;
      case "voice/setMuteAll":
        session.setVoiceMuteAll(payload);
        break;
      case "voice/startRecall":
        session.startVoiceRecall();
        break;
      case "voice/executeRecall":
        session.executeVoiceRecall();
        break;
      case "voice/sendSpeakingState":
        session.setVoiceSpeaking(payload);
        break;
      case "voice/sendSignal":
        session.sendVoiceSignal(payload);
        break;
      case "session/claimSeat":
        session.claimSeat(payload);
        break;
      case "session/distributeRoles":
        if (payload) {
          session.distributeRoles();
        }
        break;
      case "session/nomination":
      case "session/setNomination":
        session.nomination(payload);
        break;
      case "session/setVoteInProgress":
        session.setVoteInProgress(payload);
        break;
      case "session/voteSync":
        session.vote(payload);
        break;
      case "session/lockVote":
        session.lockVote();
        break;
      case "session/setVotingSpeed":
        session.setVotingSpeed(payload);
        break;
      case "session/clearVoteHistory":
        session.clearVoteHistory();
        break;
      case "session/setVoteHistoryAllowed":
        session.setVoteHistoryAllowed();
        break;
      case "toggleNight":
        session.setIsNight();
        break;
      case "setEdition":
        session.sendEdition();
        if (state.room.current && state.room.isHost) {
          session.updateRoom(state.room.createForm);
        }
        break;
      case "players/setFabled":
        session.sendFabled();
        break;
      case "session/setMarkedPlayer":
        session.setMarked(payload);
        break;
      case "session/setPlayerName":
        session.sendCurrentPlayerName();
        break;
      case "players/swap":
        session.swapPlayer(payload);
        break;
      case "players/move":
        session.movePlayer(payload);
        break;
      case "players/remove":
        session.removePlayer(payload);
        break;
      case "players/set":
      case "players/clear":
      case "players/add":
      case "players/addMany":
      case "players/setCount":
        session.sendGamestate("", true);
        break;
      case "players/update":
        if (payload.property === "pronouns") {
          session.sendPlayerPronouns(payload);
        } else {
          session.sendPlayer(payload);
        }
        break;
    }
  });

  // check for session Id in hash
  const sharedRoom = parseRoomShareHash(window.location.hash);
  if (sharedRoom) {
    const playerName =
      (
        store.state.session.playerName ||
        localStorage.getItem("playerName") ||
        "玩家"
      ).trim() || "玩家";
    store.commit("session/setSpectator", true);
    store.commit("session/setPlayerName", playerName);
    store.commit("room/updateJoinForm", {
      roomId: sharedRoom.roomId,
      inviteToken: sharedRoom.inviteToken,
      playerName,
    });
    store.commit("room/join", {
      roomId: sharedRoom.roomId,
      inviteToken: sharedRoom.inviteToken,
      playerName,
    });
    store.commit("toggleGrimoire", false);
  }
};
