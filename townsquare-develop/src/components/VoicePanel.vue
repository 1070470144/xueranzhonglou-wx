<template>
  <div v-if="session.sessionId" class="voice-runtime" aria-hidden="true"></div>
</template>

<script>
import { mapState } from "vuex";
import VoicePeerManager from "@/services/voicePeer";

export default {
  data() {
    return {
      manager: null,
      isFlushingSignals: false,
      peerStatus: {}
    };
  },
  computed: {
    ...mapState(["session"]),
    ...mapState("voice", {
      voiceEnabled: state => state.enabled,
      micEnabled: state => state.micEnabled,
      pendingSignals: state => state.pendingSignals,
      signalNonce: state => state.signalNonce
    }),
    ownId() {
      return this.$store.getters["voice/ownId"];
    },
    currentChannel() {
      return this.$store.getters["voice/currentChannel"];
    },
    currentChannelId() {
      return this.currentChannel ? this.currentChannel.id : "main";
    },
    currentMembers() {
      return this.$store.getters["voice/currentMembers"];
    },
    currentMemberSignature() {
      return this.currentMembers.map(member => member.id).join(",");
    },
    canSpeak() {
      return this.$store.getters["voice/canSpeak"];
    }
  },
  watch: {
    voiceEnabled: "syncVoice",
    micEnabled: "syncVoice",
    currentChannelId: "syncVoice",
    currentMemberSignature: "syncVoice",
    signalNonce: "flushSignals",
    canSpeak(value) {
      if (!value && this.micEnabled) this.$store.commit("voice/setMicEnabled", false);
      this.syncVoice();
    },
    "session.sessionId"(sessionId) {
      if (sessionId) {
        this.requestVoiceState();
        return;
      }
      if (this.manager) this.manager.destroy();
    }
  },
  mounted() {
    this.manager = new VoicePeerManager({
      sendSignal: payload => this.sendSignal(payload),
      onStatus: status => {
        this.$set(this.peerStatus, status.peerId, status.state);
      }
    });
    if (this.session.sessionId) this.requestVoiceState();
  },
  beforeDestroy() {
    if (this.manager) this.manager.destroy();
  },
  methods: {
    requestVoiceState() {
      this.$store.commit("voice/requestState");
    },
    sendSignal(payload) {
      this.$store.commit("voice/sendSignal", payload);
    },
    async syncVoice() {
      if (!this.manager) return;
      try {
        await this.manager.sync({
          ownId: this.ownId,
          channelId: this.currentChannelId,
          members: this.currentMembers,
          enabled: this.voiceEnabled,
          micEnabled: this.micEnabled,
          canSpeak: this.canSpeak
        });
      } catch (error) {
        this.$store.commit("voice/setError", error && error.message);
        this.$store.commit("voice/setEnabled", false);
      }
    },
    async flushSignals() {
      if (!this.manager || this.isFlushingSignals) return;
      this.isFlushingSignals = true;
      try {
        while (this.pendingSignals.length) {
          const signal = this.pendingSignals[0];
          try {
            await this.manager.handleSignal(signal);
          } catch (error) {
            this.$store.commit("voice/setError", error && error.message);
          }
          this.$store.commit("voice/shiftSignal");
        }
      } finally {
        this.isFlushingSignals = false;
      }
    }
  }
};
</script>

<style scoped lang="scss">
.voice-runtime {
  display: none;
}
</style>
