<template>
  <transition name="room-control-slide">
    <aside v-if="modals.roomControl && room.current" class="room-control-drawer">
      <header class="room-control-header">
        <div class="room-control-title">
          <small>{{ room.isHost ? $t("room.roomControl") : $t("room.roomInfo") }}</small>
          <h3>{{ room.current.name }}</h3>
        </div>
        <button type="button" class="button icon-button" @click="close">
          <font-awesome-icon icon="times-circle" />
        </button>
      </header>

      <section class="room-control-summary">
        <span class="room-control-pill" :class="room.current.status || 'waiting'">
          {{ statusText(room.current.status) }}
        </span>
        <span>{{ room.current.playerCount }}/{{ room.current.maxPlayers }}</span>
        <span>{{ room.current.isPrivate ? $t("room.private") : $t("room.public") }}</span>
      </section>

      <section class="room-control-overview">
        <dl class="room-control-register">
          <div>
            <dt>{{ $t("room.hostName") }}</dt>
            <dd>{{ room.current.hostName || $t("room.defaultHostName") }}</dd>
          </div>
          <div>
            <dt>{{ $t("room.script") }}</dt>
            <dd>{{ room.current.scriptName || $t("room.noScript") }}</dd>
          </div>
          <div>
            <dt>{{ $t("room.note") }}</dt>
            <dd>{{ room.current.note || "-" }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="room.isHost" class="room-control-actions room-control-command-grid">
        <button type="button" class="button" @click="copySessionUrl">
          <font-awesome-icon icon="copy" /> {{ $t("menu.copyPlayerLink") }}
        </button>
        <button type="button" class="button" @click="chooseScript">
          <font-awesome-icon icon="theater-masks" /> {{ $t("menu.selectScript") }}
        </button>
        <button type="button" class="button" @click="assignRoles">
          <font-awesome-icon icon="random" /> {{ $t("menu.chooseAssign") }}
        </button>
        <button type="button" class="button demon" @click="distributeRoles">
          <font-awesome-icon icon="theater-masks" /> {{ $t("menu.sendCharacters") }}
        </button>
      </section>

      <section v-else class="room-control-actions room-control-command-grid guest-actions">
        <button type="button" class="button" @click="copySessionUrl">
          <font-awesome-icon icon="copy" /> {{ $t("menu.copyPlayerLink") }}
        </button>
        <button type="button" class="button" @click="toggleModal('playerName')">
          <font-awesome-icon icon="user-edit" /> {{ $t("menu.changePlayerName") }}
        </button>
      </section>

      <details v-if="!room.isHost" class="room-control-group" open>
        <summary class="room-control-group-title">{{ $t("room.currentPlayers") }}</summary>
        <ul class="room-control-player-list readonly-player-list">
          <li v-for="player in room.players" :key="player.id" class="room-control-player-row">
            <span>{{ player.name }}</span>
          </li>
          <li v-if="!room.players.length" class="room-control-player-row empty-player-row">
            <span>{{ $t("room.noCurrentPlayers") }}</span>
          </li>
        </ul>
      </details>

      <details class="room-control-group voice-control-group" open>
        <summary class="room-control-group-title">{{ $t("voice.entry") }}</summary>
        <div v-if="recallActive" class="room-control-voice-alert">
          {{ $t("voice.recallNotice") }}
        </div>
        <div v-if="voice.error" class="room-control-voice-alert error">
          {{ voiceErrorText }}
        </div>

        <div class="room-control-inline-actions two-column">
          <button type="button" class="button demon" @click="toggleVoice">
            <font-awesome-icon :icon="voice.enabled ? 'volume-mute' : 'volume-up'" />
            {{ voice.enabled ? $t("voice.disconnect") : $t("voice.connect") }}
          </button>
          <button
            type="button"
            class="button"
            :class="{ townsfolk: voice.micEnabled && canVoiceSpeak }"
            :disabled="!voice.enabled || !canVoiceSpeak"
            @click="toggleMic"
          >
            <font-awesome-icon :icon="voice.micEnabled && canVoiceSpeak ? 'volume-up' : 'volume-mute'" />
            {{ voice.micEnabled && canVoiceSpeak ? $t("voice.micOn") : $t("voice.micOff") }}
          </button>
        </div>

        <div v-if="pendingInvites.length" class="room-control-voice-list invitations">
          <h4>{{ $t("voice.invitations") }}</h4>
          <ul>
            <li v-for="invite in pendingInvites" :key="invite.id">
              <div>
                <strong>{{ inviteSenderName(invite) }}</strong>
              </div>
              <div class="voice-response-actions">
                <button type="button" class="button townsfolk" @click="respondVoiceInvite(invite.id, true)">
                  {{ $t("voice.accept") }}
                </button>
                <button type="button" class="button" @click="respondVoiceInvite(invite.id, false)">
                  {{ $t("voice.reject") }}
                </button>
              </div>
            </li>
          </ul>
        </div>

        <div class="room-control-voice-list">
          <h4>{{ $t("voice.channels") }}</h4>
          <ul>
            <li v-for="channel in voice.state.channels" :key="channel.id">
              <div>
                <strong>{{ voiceChannelName(channel) }}</strong>
                <span>{{ voiceChannelMembers(channel) }}</span>
              </div>
              <button
                type="button"
                class="button"
                :disabled="ownVoiceChannelId === channel.id || !canJoinVoiceChannel(channel)"
                @click="joinVoiceChannel(channel.id)"
              >
                {{ ownVoiceChannelId === channel.id ? $t("voice.inChannel") : $t("voice.enter") }}
              </button>
            </li>
          </ul>
        </div>

        <div class="room-control-voice-list invite-panel">
          <h4>{{ $t("voice.invite") }}</h4>
          <div v-if="targetOptions.length" class="room-control-voice-targets">
            <label v-for="target in targetOptions" :key="target.id">
              <input
                v-model="selectedInviteIds"
                type="checkbox"
                :value="target.id"
                :disabled="recallActive"
              />
              <span>{{ target.name }}</span>
            </label>
          </div>
          <p v-else class="room-control-voice-empty">{{ $t("voice.noTargets") }}</p>
          <button
            type="button"
            class="button demon full-width"
            :disabled="!canCreateVoiceInvite"
            @click="createVoiceInvite"
          >
            <font-awesome-icon icon="user-friends" /> {{ $t("voice.createPrivate") }}
          </button>
        </div>
      </details>

      <template v-if="room.isHost">
        <details class="room-control-group" open>
          <summary class="room-control-group-title">{{ $t("room.playersGroup") }}</summary>
          <ul class="room-control-player-list">
            <li v-for="player in room.players" :key="player.id" class="room-control-player-row">
              <span>{{ player.name }}</span>
              <button type="button" class="button" @click="kick(player.id)">
                {{ $t("room.kick") }}
              </button>
            </li>
          </ul>
          <div class="room-control-inline-actions two-column">
            <button type="button" class="button" :disabled="!canAddSeat" @click="addSeat">
              <font-awesome-icon icon="plus-circle" /> {{ $t("room.addSeat") }}
            </button>
            <button type="button" class="button" :disabled="!canRemoveSeat" @click="removeSeat">
              <font-awesome-icon icon="minus-circle" /> {{ $t("room.removeSeat") }}
            </button>
            <button type="button" class="button" @click="randomizeSeatings">
              <font-awesome-icon icon="dice" /> {{ $t("menu.randomize") }}
            </button>
            <button type="button" class="button" @click="clearPlayers">
              <font-awesome-icon icon="trash-alt" /> {{ $t("room.clearPlayers") }}
            </button>
          </div>
        </details>

        <details class="room-control-group">
          <summary class="room-control-group-title">{{ $t("room.scriptSettings") }}</summary>
          <div class="room-control-inline-actions">
            <button type="button" class="button" @click="chooseScript">
              <font-awesome-icon icon="theater-masks" /> {{ $t("menu.selectScript") }}
            </button>
            <button type="button" class="button" @click="syncRoomScript">
              <font-awesome-icon icon="sync-alt" /> {{ $t("room.syncScript") }}
            </button>
          </div>
        </details>

        <details class="room-control-group">
          <summary class="room-control-group-title">{{ $t("room.roleSettings") }}</summary>
          <div class="room-control-inline-actions two-column">
            <button type="button" class="button" @click="assignRoles">
              <font-awesome-icon icon="random" /> {{ $t("menu.chooseAssign") }}
            </button>
            <button type="button" class="button" @click="toggleModal('fabled')">
              <font-awesome-icon icon="dragon" /> {{ $t("menu.addFabled") }}
            </button>
            <button type="button" class="button demon" @click="distributeRoles">
              <font-awesome-icon icon="theater-masks" /> {{ $t("menu.sendCharacters") }}
            </button>
            <button type="button" class="button" @click="clearRoles">
              <font-awesome-icon icon="trash-alt" /> {{ $t("room.clearRoles") }}
            </button>
          </div>
        </details>

        <details class="room-control-group voice-control-group" open>
          <summary class="room-control-group-title">{{ $t("voice.storytellerControls") }}</summary>
          <div class="room-control-inline-actions two-column">
            <button type="button" class="button" @click="setVoiceMuteAll(!voice.state.muteAll)">
              <font-awesome-icon :icon="voice.state.muteAll ? 'volume-up' : 'volume-mute'" />
              {{ voice.state.muteAll ? $t("voice.unmuteAll") : $t("voice.muteAll") }}
            </button>
            <button type="button" class="button demon" :disabled="recallActive" @click="startVoiceRecall">
              <font-awesome-icon icon="users" /> {{ $t("voice.recallAll") }}
            </button>
          </div>
        </details>

        <details class="room-control-group">
          <summary class="room-control-group-title">{{ $t("room.roomSettings") }}</summary>
          <div class="room-control-note-editor">
            <label>{{ $t("room.note") }}</label>
            <input :value="room.createForm.note" type="text" maxlength="80" @input="updateRoomNote($event.target.value)" />
            <button type="button" class="button" @click="saveRoomNote">
              {{ $t("room.save") }}
            </button>
          </div>
          <div class="status-row room-control-status-row">
            <button type="button" class="button" :class="{ townsfolk: room.current.status !== 'playing' }" @click="setRoomStatus('waiting')">
              {{ $t("room.waiting") }}
            </button>
            <button type="button" class="button" :class="{ townsfolk: room.current.status === 'playing' }" @click="setRoomStatus('playing')">
              {{ $t("room.playing") }}
            </button>
          </div>
        </details>
      </template>

      <details class="room-control-group danger-actions">
        <summary class="room-control-group-title">{{ $t("room.dangerActions") }}</summary>
        <div class="room-control-inline-actions">
          <button type="button" class="button demon" @click="leaveSession">
            {{ $t("menu.leaveSession") }}
          </button>
        </div>
      </details>
    </aside>
  </transition>
</template>

<script>
import { mapMutations, mapState } from "vuex";

export default {
  data() {
    return {
      selectedInviteIds: []
    };
  },
  computed: {
    ...mapState(["modals", "room", "session", "voice"]),
    ...mapState("players", ["players"]),
    canEditSeats() {
      return !this.session.isSpectator && !this.session.lockedVote;
    },
    canAddSeat() {
      const roomLimit = this.room.current && this.room.current.maxPlayers;
      return this.canEditSeats && this.players.length < (roomLimit || 20);
    },
    canRemoveSeat() {
      return this.canEditSeats && this.players.length > 0;
    },
    ownVoiceId() {
      return this.$store.getters["voice/ownId"];
    },
    ownVoiceChannelId() {
      const participant = this.voice.state.participants.find(({ id }) => id === this.ownVoiceId);
      return participant ? participant.currentChannelId : "main";
    },
    canVoiceSpeak() {
      return this.$store.getters["voice/canSpeak"];
    },
    pendingInvites() {
      return this.$store.getters["voice/pendingInvites"];
    },
    recallActive() {
      return !!this.voice.state.recall;
    },
    targetOptions() {
      const targets = [];
      if (this.ownVoiceId !== "host") {
        targets.push({ id: "host", name: this.$t("privateChat.host") });
      }
      return targets.concat(this.room.players
        .filter(player => player.id && player.id !== this.ownVoiceId)
        .map(player => ({ id: player.id, name: player.name || player.id })));
    },
    canCreateVoiceInvite() {
      return !this.recallActive && this.selectedInviteIds.length > 0;
    },
    voiceErrorText() {
      return this.$t(`voice.errors.${this.voice.error}`) || this.voice.error;
    }
  },
  methods: {
    close() {
      this.toggleModal("roomControl");
    },
    statusText(status) {
      return this.$t(status === "playing" ? "room.playing" : "room.waiting");
    },
    copySessionUrl() {
      const url = window.location.href.split("#")[0];
      navigator.clipboard.writeText(`${url}#${this.session.sessionId}`);
    },
    chooseScript() {
      this.openModalOverlay("edition");
    },
    assignRoles() {
      this.openModalOverlay("roles");
    },
    distributeRoles() {
      if (this.session.isSpectator) return;
      if (!confirm(this.$t("menu.confirmDistribute"))) return;
      this.$store.commit("session/distributeRoles", true);
      setTimeout(() => {
        this.$store.commit("session/distributeRoles", false);
        if (this.room.current && this.room.current.status !== "playing") {
          if (confirm(this.$t("room.confirmSetPlaying"))) {
            this.setRoomStatus("playing");
          }
        }
      }, 2000);
    },
    syncRoomScript() {
      this.$store.commit("room/update", this.room.createForm);
    },
    setRoomStatus(status) {
      this.$store.commit("room/update", { status });
    },
    updateRoomNote(note) {
      this.$store.commit("room/updateCreateForm", { note });
    },
    saveRoomNote() {
      this.$store.commit("room/update", { note: this.room.createForm.note });
    },
    addSeat() {
      if (!this.canAddSeat) return;
      this.$store.commit("players/add", "玩家");
    },
    removeSeat() {
      if (!this.canRemoveSeat) return;
      const playerIndex = this.players.length - 1;
      const { nomination } = this.session;
      if (nomination && nomination.includes(playerIndex)) {
        this.$store.commit("session/nomination");
      }
      this.$store.commit("players/remove", playerIndex);
    },
    kick(playerId) {
      if (confirm(this.$t("room.confirmKick"))) {
        this.$store.commit("room/kick", playerId);
      }
    },
    randomizeSeatings() {
      if (confirm(this.$t("menu.confirmRandomize"))) {
        this.$store.dispatch("players/randomize");
      }
    },
    clearPlayers() {
      if (!confirm(this.$t("menu.confirmClearPlayers"))) return;
      if (this.session.nomination) this.$store.commit("session/nomination");
      this.$store.commit("players/clear");
    },
    clearRoles() {
      if (confirm(this.$t("menu.confirmClearRoles"))) {
        this.$store.dispatch("players/clearRoles");
      }
    },
    toggleVoice() {
      const nextValue = !this.voice.enabled;
      this.$store.commit("voice/setEnabled", nextValue);
      if (nextValue) this.$store.commit("voice/requestState");
    },
    toggleMic() {
      if (!this.canVoiceSpeak) return;
      this.$store.commit("voice/setMicEnabled", !this.voice.micEnabled);
    },
    createVoiceInvite() {
      if (!this.canCreateVoiceInvite) return;
      this.$store.commit("voice/setEnabled", true);
      this.$store.commit("voice/createInvite", { invitedIds: this.selectedInviteIds });
      this.selectedInviteIds = [];
    },
    respondVoiceInvite(inviteId, accept) {
      if (accept) this.$store.commit("voice/setEnabled", true);
      this.$store.commit("voice/respondInvite", { inviteId, accept });
    },
    canJoinVoiceChannel(channel) {
      if (!channel) return false;
      if (channel.id === "main") return true;
      return !this.session.isSpectator || channel.memberIds.includes(this.ownVoiceId);
    },
    voiceChannelName(channel) {
      if (!channel || channel.id === "main") return this.$t("voice.mainChannel");
      const names = channel.memberIds
        .filter(id => id !== "host")
        .map(id => this.voiceParticipantName(id));
      return names.length ? names.join(" / ") : this.$t("voice.privateChannel");
    },
    voiceChannelMembers(channel) {
      if (!channel || !channel.memberIds.length) return this.$t("voice.emptyChannel");
      return channel.memberIds.map(id => this.voiceParticipantName(id)).join(" / ");
    },
    voiceParticipantName(id) {
      const participant = this.voice.state.participants.find(item => item.id === id);
      if (participant && participant.name) return participant.name;
      if (id === "host") return this.$t("privateChat.host");
      return id;
    },
    inviteSenderName(invite) {
      return this.$t("voice.inviteFrom", { name: this.voiceParticipantName(invite.fromId) });
    },
    joinVoiceChannel(channelId) {
      this.$store.commit(channelId === "main" ? "voice/leaveChannel" : "voice/joinChannel", channelId);
    },
    setVoiceMuteAll(value) {
      this.$store.commit("voice/setMuteAll", value);
    },
    startVoiceRecall() {
      this.$store.commit("voice/startRecall");
    },
    leaveSession() {
      if (!confirm(this.$t("menu.confirmLeave"))) return;
      this.$store.commit("session/setSpectator", false);
      this.$store.commit("session/setSessionId", "");
      this.$store.commit("session/setGameStartedAt", Date.now());
      this.toggleModal("roomControl");
    },
    ...mapMutations(["openModalOverlay", "toggleModal"])
  }
};
</script>

<style scoped lang="scss">
.room-control-drawer {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 90;
  width: min(410px, 94vw);
  height: 100vh;
  padding: 0.55em;
  color: #dcc4a1;
  border-left: 2px solid #3d2e26;
  background:
    radial-gradient(circle at 50% 0%, rgba(92, 26, 22, 0.26), transparent 28%),
    linear-gradient(180deg, rgba(24, 18, 15, 0.96), rgba(9, 7, 6, 0.96)),
    #120f0e;
  box-shadow: -20px 0 48px rgba(0, 0, 0, 0.72), inset 1px 0 0 rgba(255, 236, 190, 0.05);
  font-family: "STKaiti", "KaiTi", "STSong", "SimSun", serif;
  font-size: 0.86em;
  overflow-y: auto;
}

.room-control-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  align-items: start;
  gap: 0.32em;
  min-height: 3.08em;
  padding: 0.32em 0.35em 0.42em 0.52em;
  border: 1px solid #3d2e26;
  border-bottom: 3px double #4a3b32;
  background: rgba(18, 15, 13, 0.74);
  box-shadow: inset 0 1px 0 rgba(255, 236, 190, 0.05);
}

.room-control-title {
  min-width: 0;
  padding-top: 0.1em;
}

.room-control-header small,
.room-control-register dt {
  color: #b8a082;
}

.room-control-header h3 {
  margin: 0.1em 0 0;
  color: #d4af37;
  font-size: 1.12em;
  letter-spacing: 0.08em;
  text-align: left;
  line-height: 1.1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9);
}

.icon-button {
  justify-self: end;
  align-self: start;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5em;
  min-width: 1.5em;
  height: 1.5em;
  padding: 0;
  color: #dcc4a1;
  border: 0;
  border-radius: 50%;
  background: transparent;
  box-shadow: none;
  font-size: 1.05em;
  line-height: 1;
}

.icon-button:hover {
  color: #fff8e7;
  background: transparent;
}

.room-control-summary,
.room-control-actions,
.status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45em;
}

.room-control-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  margin: 0.4em 0;
  border: 1px solid #3d2e26;
  background: rgba(18, 15, 13, 0.72);
}

.room-control-summary > span,
.room-control-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 1.78em;
  padding: 0 0.3em;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #c0a88a;
  font-size: 0.76em;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-control-summary > span + span {
  border-left: 1px solid #3d2e26;
}

.room-control-pill.waiting {
  color: #d4af37;
  background: rgba(92, 66, 4, 0.32);
}

.room-control-pill.playing {
  color: #e8d3b9;
  background: rgba(139, 38, 32, 0.22);
}

.room-control-overview,
.room-control-group {
  margin: 0 0 0.42em;
  border: 1px solid #3d2e26;
  border-radius: 2px;
  background: rgba(18, 15, 13, 0.68);
  box-shadow: inset 0 1px 0 rgba(255, 236, 190, 0.04);
}

.room-control-overview {
  padding: 0;
}

.room-control-register {
  margin: 0;
}

.room-control-register div {
  display: grid;
  grid-template-columns: 6em minmax(0, 1fr);
  gap: 0;
  min-height: 1.86em;
  border-bottom: 1px solid #261d19;
}

.room-control-register div:last-child {
  border-bottom: 0;
}

.room-control-register dt,
.room-control-register dd {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 0 0.48em;
}

dd {
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-control-actions {
  margin-bottom: 0.42em;
}

.room-control-command-grid,
.room-control-inline-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.22em;
}

.room-control-command-grid.guest-actions,
.room-control-inline-actions:not(.two-column) {
  grid-template-columns: minmax(0, 1fr);
}

.room-control-actions .button,
.room-control-group .button,
.room-control-status-row .button {
  min-width: 0;
  min-height: 1.58em;
  margin: 0;
  padding: 0 0.3em;
  color: #dcc4a1;
  border: 1px solid #3d2e26;
  border-radius: 2px;
  background: #1d1816;
  box-shadow: inset 0 1px 0 rgba(255, 236, 190, 0.04);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.76em;
}

.room-control-actions .button:hover,
.room-control-group .button:hover {
  color: #fff8e7;
  border-color: #6b4a18;
  background: #2a1c09;
}

.room-control-actions .button:disabled,
.room-control-group .button:disabled {
  color: #7f705f;
  border-color: #2b211d;
  background: #15110f;
  cursor: default;
  opacity: 0.58;
}

.room-control-actions .button.demon,
.room-control-group .button.demon {
  color: #fff8e7;
  border-color: #8b6508;
  background: linear-gradient(#8b6508, #5c4204);
}

summary {
  cursor: pointer;
  color: #d4af37;
  font-weight: bold;
}

.room-control-group {
  padding: 0;
  overflow: hidden;
}

.room-control-group-title {
  min-height: 1.68em;
  padding: 0.28em 0.46em;
  border-bottom: 1px solid #3d2e26;
  background: #120f0e;
  letter-spacing: 0.08em;
}

.room-control-group[open] .room-control-group-title {
  border-bottom-color: #4a3b32;
}

.room-control-player-list,
.room-control-inline-actions,
.room-control-note-editor,
.room-control-status-row,
.room-control-voice-list {
  margin: 0;
  padding: 0.28em;
}

.room-control-voice-alert {
  margin: 0.28em;
  padding: 0.32em 0.42em;
  color: #fff8e7;
  border: 1px solid rgba(212, 175, 55, 0.45);
  background: rgba(92, 66, 4, 0.24);
  font-size: 0.76em;
}

.room-control-voice-alert.error {
  border-color: rgba(185, 31, 25, 0.55);
  background: rgba(92, 26, 22, 0.3);
}

.room-control-voice-list.invitations ul,
.room-control-voice-list ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.room-control-voice-list li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  align-items: center;
  gap: 0.34em;
  min-height: 1.9em;
  padding: 0.2em 0.28em;
  border-bottom: 1px solid #261d19;
  background: rgba(16, 13, 11, 0.68);
}

.room-control-voice-list li:last-child {
  border-bottom: 0;
}

.room-control-voice-list strong,
.room-control-voice-list span {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-control-voice-list strong {
  color: #fff8e7;
  font-size: 0.78em;
}

.room-control-voice-list span {
  color: #b8a082;
  font-size: 0.68em;
}

.voice-response-actions {
  display: flex;
  gap: 0.3em;
}

.room-control-voice-targets {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.28em;
  padding: 0.28em;
}

.room-control-voice-targets label {
  display: flex;
  align-items: center;
  gap: 0.32em;
  min-width: 0;
  min-height: 1.8em;
  padding: 0 0.42em;
  color: #dcc4a1;
  border: 1px solid #3d2e26;
  background: rgba(5, 4, 4, 0.45);
  font-size: 0.76em;
}

.room-control-voice-targets span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-control-voice-empty {
  margin: 0;
  padding: 0.45em 0.28em;
  color: #8f7d66;
  text-align: center;
  font-size: 0.76em;
}

.full-width {
  width: calc(100% - 0.56em);
  margin: 0.28em;
}

.room-control-voice-list {
  border-top: 1px solid #261d19;
}

.room-control-voice-list h4 {
  margin: 0 0 0.28em;
  color: #b8a082;
  text-align: left;
  font-family: inherit;
  font-size: 0.76em;
  font-weight: 700;
  letter-spacing: 0;
}

.room-control-note-editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  gap: 0.28em;
  border-bottom: 1px solid #261d19;
}

.room-control-note-editor label {
  grid-column: 1 / -1;
  color: #b8a082;
  font-size: 0.76em;
  font-weight: 700;
}

.room-control-note-editor input {
  min-width: 0;
  min-height: 1.8em;
  padding: 0 0.42em;
  color: #f7f0df;
  border: 1px solid #3d2e26;
  border-radius: 2px;
  background: rgba(5, 4, 4, 0.62);
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.58);
  font-family: inherit;
}

.room-control-note-editor input:focus {
  outline: none;
  border-color: rgba(212, 175, 55, 0.82);
}

.room-control-player-list {
  list-style: none;
}

.room-control-player-list li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  align-items: center;
  gap: 0.34em;
  min-height: 1.82em;
  padding: 0 0.36em;
  border-bottom: 1px solid #261d19;
  background: rgba(16, 13, 11, 0.68);
}

.room-control-player-list li:nth-child(even) {
  background: rgba(12, 9, 8, 0.68);
}

.room-control-player-list li:last-child {
  border-bottom: 0;
}

.room-control-player-row span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-control-player-row .button {
  min-height: 1.48em;
  padding: 0 0.36em;
  color: #ffd94a;
  border-color: #8b6508;
  background: #2a1c09;
  font-size: 0.72em;
}

.readonly-player-list li {
  grid-template-columns: minmax(0, 1fr);
}

.empty-player-row span {
  color: #8f7d66;
}

.room-control-status-row {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.room-control-status-row .button.townsfolk {
  color: #fff8e7;
  border-color: #d4af37;
  background: linear-gradient(#b8860b, #946b07 48%, #5c4204);
}

.danger-actions {
  border-color: #5c241f;
}

.danger-actions .room-control-group-title {
  color: #e8b2a6;
  border-bottom-color: #5c241f;
  background: rgba(54, 13, 10, 0.78);
}

.room-control-slide-enter-active,
.room-control-slide-leave-active {
  transition: transform 180ms ease, opacity 180ms ease;
}

.room-control-slide-enter,
.room-control-slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

@media (max-width: 640px) {
  .room-control-drawer {
    width: min(400px, 96vw);
    padding: 0.42em;
  }

  .room-control-header {
    min-height: 2.9em;
    padding: 0.28em 0.32em 0.38em 0.46em;
  }

  .room-control-header h3 {
    font-size: 1.02em;
  }

  .room-control-summary {
    grid-template-columns: 1fr;
  }

  .room-control-summary > span + span {
    border-left: 0;
    border-top: 1px solid #3d2e26;
  }

  .room-control-register div {
    grid-template-columns: 5.2em minmax(0, 1fr);
  }

  .room-control-command-grid,
  .room-control-inline-actions.two-column,
  .room-control-status-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
