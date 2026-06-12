<template>
  <transition name="voice-invite-pop">
    <aside
      v-if="canDrawRole"
      class="role-draw-invite-confirm"
      role="dialog"
      aria-live="polite"
    >
      <div class="role-draw-invite-confirm-header">
        <small>{{ $t("roleDraw.title") }}</small>
        <span>{{ remainingCount }}</span>
      </div>
      <strong>{{ $t("roleDraw.yourTurn") }}</strong>
      <p>
        {{ $t("roleDraw.remaining", { count: remainingCount }) }}
      </p>
      <button type="button" class="button townsfolk" @click="drawRole">
        {{ $t("roleDraw.drawButton") }}
      </button>
    </aside>
  </transition>
</template>

<script>
import { mapState } from "vuex";

export default {
  computed: {
    ...mapState(["session", "roleDraw"]),
    remainingCount() {
      return this.$store.getters["roleDraw/remainingCount"];
    },
    currentSeatIndex() {
      return this.$store.getters["roleDraw/currentSeatIndex"];
    },
    canDrawRole() {
      return (
        this.session.sessionId &&
        this.session.isSpectator &&
        this.roleDraw.active &&
        this.session.claimedSeat === this.currentSeatIndex
      );
    },
  },
  methods: {
    drawRole() {
      if (!this.canDrawRole) return;
      this.$store.commit("roleDraw/requestDraw");
    },
  },
};
</script>

<style scoped lang="scss">
.role-draw-invite-confirm {
  position: fixed;
  left: 0.8em;
  top: 50%;
  z-index: 93;
  width: min(15.6em, calc(100vw - 1.6em));
  padding: 0.56em;
  color: #dcc4a1;
  border: 1px solid #6b4a18;
  border-left: 3px solid #d4af37;
  border-radius: 2px;
  background: radial-gradient(
      circle at 18% 0%,
      rgba(139, 38, 32, 0.28),
      transparent 42%
    ),
    linear-gradient(180deg, rgba(24, 18, 15, 0.96), rgba(9, 7, 6, 0.96));
  box-shadow:
    0 18px 42px rgba(0, 0, 0, 0.62),
    inset 0 1px 0 rgba(255, 236, 190, 0.06);
  font-family: "STKaiti", "KaiTi", "STSong", "SimSun", serif;
  transform: translateY(-50%);
}

.role-draw-invite-confirm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5em;
  margin-bottom: 0.34em;
  padding-bottom: 0.28em;
  border-bottom: 1px solid #3d2e26;
}

.role-draw-invite-confirm-header small {
  color: #d4af37;
  font-size: 0.72em;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.role-draw-invite-confirm-header span {
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

.role-draw-invite-confirm strong {
  display: block;
  color: #fff8e7;
  font-size: 0.84em;
  line-height: 1.3;
}

.role-draw-invite-confirm p {
  margin: 0.38em 0 0.5em;
  color: #b8a082;
  font-size: 0.72em;
}

.role-draw-invite-confirm .button {
  width: 100%;
  min-height: 1.86em;
  margin: 0;
  font-size: 0.74em;
}

.voice-invite-pop-enter-active,
.voice-invite-pop-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.voice-invite-pop-enter,
.voice-invite-pop-leave-to {
  opacity: 0;
  transform: translate(-0.45em, -50%);
}

@media (max-width: 640px) {
  .role-draw-invite-confirm {
    left: 0.5em;
    width: min(14.8em, calc(100vw - 1em));
    padding: 0.48em;
  }
}
</style>
