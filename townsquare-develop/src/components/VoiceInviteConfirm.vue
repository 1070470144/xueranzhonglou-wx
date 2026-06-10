<template>
  <transition name="voice-invite-pop">
    <aside v-if="session.sessionId && (activeInvite || inviteRejection)" class="voice-invite-confirm" role="dialog" aria-live="polite">
      <div class="voice-invite-confirm-header">
        <small>{{ $t("voice.invitations") }}</small>
        <span>{{ activeInvite ? pendingInvites.length : "!" }}</span>
      </div>
      <strong>{{ activeInvite ? inviteSenderName(activeInvite) : inviteRejectionText }}</strong>
      <div v-if="activeInvite" class="voice-invite-confirm-actions">
        <button type="button" class="button townsfolk" @click="respondVoiceInvite(activeInvite.id, true)">
          {{ $t("voice.accept") }}
        </button>
        <button type="button" class="button" @click="respondVoiceInvite(activeInvite.id, false)">
          {{ $t("voice.reject") }}
        </button>
      </div>
      <div v-else class="voice-invite-confirm-actions single-action">
        <button type="button" class="button townsfolk" @click="dismissInviteRejection">
          {{ $t("voice.dismiss") }}
        </button>
      </div>
    </aside>
  </transition>
</template>

<script>
import { mapState } from "vuex";

export default {
  computed: {
    ...mapState(["session", "voice"]),
    pendingInvites() {
      return this.$store.getters["voice/pendingInvites"];
    },
    inviteRejection() {
      return this.voice.inviteRejection;
    },
    activeInvite() {
      return this.pendingInvites[0] || null;
    },
    inviteRejectionText() {
      if (!this.inviteRejection) return "";
      const name = this.inviteRejection.rejectedByName || this.voiceParticipantName(this.inviteRejection.rejectedById);
      return this.$t("voice.rejectedBy", { name });
    }
  },
  methods: {
    respondVoiceInvite(inviteId, accept) {
      if (accept) this.$store.commit("voice/setEnabled", true);
      this.$store.commit("voice/respondInvite", { inviteId, accept });
    },
    dismissInviteRejection() {
      this.$store.commit("voice/dismissInviteRejection");
    },
    voiceParticipantName(id) {
      const participant = this.voice.state.participants.find(item => item.id === id);
      if (participant && participant.name) return participant.name;
      if (id === "host") return this.$t("privateChat.host");
      return id;
    },
    inviteSenderName(invite) {
      return this.$t("voice.inviteFrom", { name: this.voiceParticipantName(invite.fromId) });
    }
  }
};
</script>

<style scoped lang="scss">
.voice-invite-confirm {
  position: fixed;
  left: 0.8em;
  top: 50%;
  z-index: 92;
  width: min(15.6em, calc(100vw - 1.6em));
  padding: 0.56em;
  color: #dcc4a1;
  border: 1px solid #6b4a18;
  border-left: 3px solid #d4af37;
  border-radius: 2px;
  background:
    radial-gradient(circle at 18% 0%, rgba(139, 38, 32, 0.28), transparent 42%),
    linear-gradient(180deg, rgba(24, 18, 15, 0.96), rgba(9, 7, 6, 0.96));
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.62), inset 0 1px 0 rgba(255, 236, 190, 0.06);
  font-family: "STKaiti", "KaiTi", "STSong", "SimSun", serif;
  transform: translateY(-50%);
}

.voice-invite-confirm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5em;
  margin-bottom: 0.34em;
  padding-bottom: 0.28em;
  border-bottom: 1px solid #3d2e26;
}

.voice-invite-confirm-header small {
  color: #d4af37;
  font-size: 0.72em;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.voice-invite-confirm-header span {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 1.45em;
  height: 1.45em;
  color: #fff8e7;
  border: 1px solid #5c4204;
  background: rgba(92, 66, 4, 0.42);
  font-size: 0.62em;
  font-weight: 700;
}

.voice-invite-confirm strong {
  display: block;
  min-width: 0;
  color: #fff8e7;
  font-size: 0.84em;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.voice-invite-confirm-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.32em;
  margin-top: 0.5em;
}

.voice-invite-confirm-actions.single-action {
  grid-template-columns: minmax(0, 1fr);
}

.voice-invite-confirm-actions .button {
  min-width: 0;
  min-height: 1.76em;
  margin: 0;
  padding: 0 0.42em;
  color: #dcc4a1;
  border: 1px solid #3d2e26;
  border-radius: 2px;
  background: #1d1816;
  box-shadow: inset 0 1px 0 rgba(255, 236, 190, 0.04);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.72em;
}

.voice-invite-confirm-actions .button:hover {
  color: #fff8e7;
  border-color: #6b4a18;
  background: #2a1c09;
}

.voice-invite-confirm-actions .button.townsfolk {
  color: #fff8e7;
  border-color: #8b6508;
  background: linear-gradient(#8b6508, #5c4204);
}

.voice-invite-pop-enter-active,
.voice-invite-pop-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.voice-invite-pop-enter,
.voice-invite-pop-leave-to {
  opacity: 0;
  transform: translate(-0.45em, -50%);
}

@media (max-width: 640px) {
  .voice-invite-confirm {
    left: 0.5em;
    width: min(14.8em, calc(100vw - 1em));
    padding: 0.48em;
  }
}
</style>
