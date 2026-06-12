<template>
  <Modal
    class="role-picker"
    v-if="modals.role && availableRoles.length"
    @close="close"
  >
    <div class="role-picker-topline">
      <span>{{ activeRoles.length }}</span>
      <strong>
        {{
          $t("modals.chooseRoleFor", {
            name: targetName,
          })
        }}
      </strong>
      <span>{{ tabLabel }}</span>
    </div>

    <div class="role-picker-board">
      <div class="role-register-bar">
        <span>{{ tabLabel }}</span>
        <span>{{ targetName }}</span>
      </div>
      <ul class="tokens" v-if="tab === 'editionRoles' || !otherTravelers.size">
        <li
          v-for="role in availableRoles"
          :class="[role.team]"
          :key="role.id"
          @click="setRole(role)"
        >
          <Token :role="role" />
        </li>
      </ul>
      <ul class="tokens" v-if="tab === 'otherTravelers' && otherTravelers.size">
        <li
          v-for="role in otherTravelers.values()"
          :class="[role.team]"
          :key="role.id"
          @click="setRole(role)"
        >
          <Token :role="role" />
        </li>
      </ul>
    </div>
    <div
      class="button-group"
      v-if="playerIndex >= 0 && otherTravelers.size && !session.isSpectator"
    >
      <span
        class="button"
        :class="{ townsfolk: tab === 'editionRoles' }"
        @click="tab = 'editionRoles'"
        >{{ $t("modals.editionRoles") }}</span
      >
      <span
        class="button"
        :class="{ townsfolk: tab === 'otherTravelers' }"
        @click="tab = 'otherTravelers'"
        >{{ $t("modals.otherTravelers") }}</span
      >
    </div>
  </Modal>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import Modal from "./Modal";
import Token from "../Token";

export default {
  components: { Token, Modal },
  props: ["playerIndex", "bluffType"],
  computed: {
    activeRoles() {
      return this.tab === "otherTravelers" && this.otherTravelers.size
        ? Array.from(this.otherTravelers.values())
        : this.availableRoles;
    },
    availableRoles() {
      const availableRoles = [];
      const players = this.$store.state.players.players;
      this.$store.state.roles.forEach((role) => {
        // don't show bluff roles that are already assigned to players
        if (
          this.playerIndex >= 0 ||
          (this.playerIndex < 0 &&
            !players.some((player) => player.role.id === role.id))
        ) {
          availableRoles.push(role);
        }
      });
      availableRoles.push({});
      return availableRoles;
    },
    targetName() {
      return this.playerIndex >= 0 && this.playerIndex < this.players.length
        ? this.players[this.playerIndex].name
        : this.$t("modals.bluffing");
    },
    tabLabel() {
      return this.tab === "otherTravelers"
        ? this.$t("modals.otherTravelers")
        : this.$t("modals.editionRoles");
    },
    ...mapState(["modals", "roles", "session"]),
    ...mapState("players", ["players"]),
    ...mapState(["otherTravelers"]),
  },
  data() {
    return {
      tab: "editionRoles",
    };
  },
  methods: {
    setRole(role) {
      if (this.playerIndex < 0) {
        // assign to bluff slot (index < 0)
        this.$store.commit(
          this.bluffType === "lunatic"
            ? "players/setLunaticBluff"
            : "players/setBluff",
          {
            index: this.playerIndex * -1 - 1,
            role,
          },
        );
      } else {
        if (this.session.isSpectator && role.team === "traveler") return;
        // assign to player
        const player = this.$store.state.players.players[this.playerIndex];
        this.$store.commit("players/update", {
          player,
          property: "role",
          value: role,
        });
      }
      this.tab = "editionRoles";
      this.$store.commit("toggleModal", "role");
    },
    close() {
      this.tab = "editionRoles";
      this.toggleModal("role");
    },
    ...mapMutations(["toggleModal"]),
  },
};
</script>

<style scoped lang="scss">
@import "../../vars.scss";

.role-picker {
  &.modal-backdrop,
  .modal-backdrop {
    z-index: 120;
    background: radial-gradient(
        circle at 50% 12%,
        rgba(96, 24, 20, 0.18),
        transparent 32%
      ),
      rgba(9, 7, 6, 0.56);
  }

  ::v-deep .modal {
    width: 980px;
    max-width: calc(100vw - 3em);
    height: 520px;
    max-height: calc(100vh - 3em);
    padding: 0;
    color: #dcc4a1;
    border: 0;
    border-radius: 0;
    background: radial-gradient(
        circle at 50% 0%,
        rgba(92, 26, 22, 0.22),
        transparent 28%
      ),
      rgba(12, 9, 8, 0.72);
    box-shadow: 0 22px 70px rgba(0, 0, 0, 0.62);
    backdrop-filter: blur(3px);
    font-family: "STKaiti", "KaiTi", "STSong", "SimSun", serif;
    overflow: hidden !important;
  }

  ::v-deep .modal > .top-right-buttons {
    top: 0.62em;
    right: 0.62em;
    z-index: 20;
    display: flex;
    gap: 0.28em;
  }

  ::v-deep .modal > .top-right-buttons > .top-right-button {
    width: 1.15em;
    color: #dcc4a1;
  }

  ::v-deep .modal > .top-right-buttons > .top-right-button:first-child {
    display: none;
  }

  ::v-deep .modal > .slot {
    display: grid;
    grid-template-rows: 3.15em minmax(0, 1fr) auto;
    gap: 0.45em;
    min-height: 0;
    height: 100%;
    padding: 0 0.65em 0.5em;
    overflow: hidden;
  }
}

.role-picker-topline {
  display: grid;
  grid-template-columns: minmax(6em, 1fr) minmax(0, 2fr) minmax(6em, 1fr);
  gap: 0.75em;
  align-items: end;
  min-height: 3.15em;
  margin: 0 -0.65em;
  padding: 0 4.2em 0.38em;
  color: #b8a082;
  border-bottom: 3px double #4a3b32;
  background: radial-gradient(
      circle at 50% 0%,
      rgba(92, 26, 22, 0.26),
      transparent 28%
    ),
    transparent;
}

.role-picker-topline strong {
  min-width: 0;
  color: #d4af37;
  font-size: 1.42em;
  line-height: 1;
  letter-spacing: 0.12em;
  text-align: center;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-picker-topline span {
  padding-bottom: 0.06em;
  font-size: 0.78em;
  font-weight: 700;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.role-picker-topline span:last-child {
  text-align: right;
}

.role-picker-board {
  min-height: 0;
  overflow: hidden !important;
  border: 2px solid #3d2e26;
  border-radius: 2px;
  background: rgba(18, 14, 12, 0.78);
  box-shadow:
    0 0 20px rgba(0, 0, 0, 0.78),
    inset 0 1px 0 rgba(255, 236, 190, 0.05);
  backdrop-filter: blur(5px);
}

.role-register-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  min-height: 2.35em;
  padding: 0 0.75em;
  color: #c0a88a;
  border-bottom: 1px solid #3d2e26;
  background: #120f0e;
  font-size: 0.88em;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.role-register-bar span:last-child {
  color: #dcc4a1;
  text-align: right;
}

ul.tokens {
  position: static;
  display: grid !important;
  grid-template-columns: repeat(
    auto-fit,
    minmax(var(--role-token-size), var(--role-token-size))
  );
  gap: var(--role-token-gap-y) var(--role-token-gap-x);
  align-content: center;
  justify-content: center;
  height: calc(100% - 2.35em);
  min-height: 0;
  margin: 0;
  padding: 0.48em 0.5em;
  overflow: hidden !important;
  background: #151211;
  --role-token-size: clamp(3em, 4.45vw, 4.1em);
  --role-token-gap-x: clamp(0.32em, 0.7vw, 0.54em);
  --role-token-gap-y: clamp(0.3em, 0.75vw, 0.5em);
}

ul.tokens li {
  min-width: 0;
  border-radius: 50%;
  width: var(--role-token-size);
  height: var(--role-token-size);
  margin: 0;
  aspect-ratio: 1;
  transition:
    transform 180ms ease,
    filter 180ms ease;

  &.townsfolk {
    box-shadow:
      0 0 10px $townsfolk,
      0 0 10px #004cff;
  }
  &.outsider {
    box-shadow:
      0 0 10px $outsider,
      0 0 10px $outsider;
  }
  &.minion {
    box-shadow:
      0 0 10px $minion,
      0 0 10px $minion;
  }
  &.demon {
    box-shadow:
      0 0 10px $demon,
      0 0 10px $demon;
  }
  &.traveler {
    box-shadow:
      0 0 10px $traveler,
      0 0 10px $traveler;
  }
  &:hover {
    transform: scale(1.035);
    filter: saturate(1.12);
    z-index: 10;
  }
}

.role-picker .button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35em;
  justify-content: center;
  min-height: 2.55em;
  margin: 0;
  padding: 0.38em 0.55em;
  border: 1px solid #3d2e26;
  border-radius: 2px;
  background: rgba(18, 14, 12, 0.62);
  box-shadow:
    0 4px 14px rgba(0, 0, 0, 0.62),
    inset 0 1px 0 rgba(255, 236, 190, 0.04);
}

.role-picker .button-group .button {
  min-height: 1.95em;
  margin: 0;
  padding: 0.18em 0.62em;
  color: #fff8e7;
  border: 1px solid #8b6508;
  border-radius: 2px;
  background: #2a1c09;
  box-shadow: inset 0 1px 0 rgba(255, 236, 190, 0.06);
  font-size: 0.78em;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.role-picker .button-group .button.townsfolk {
  color: #fff8e7;
  border-color: #d4af37;
  background: linear-gradient(#b8860b, #946b07 48%, #5c4204);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.8),
    inset 0 1px 1px rgba(255, 255, 255, 0.2);
}

#townsquare.spectator ul.tokens li.traveler {
  display: none;
}

@media (max-width: 640px) {
  .role-picker {
    ::v-deep .modal {
      width: calc(100vw - 1em);
      max-width: calc(100vw - 1em);
      height: min(520px, calc(100vh - 1em));
      max-height: calc(100vh - 1em);
    }

    ::v-deep .modal > .slot {
      grid-template-rows: auto minmax(0, 1fr) auto;
      gap: 0.38em;
      padding: 0 0.42em 0.42em;
    }
  }

  .role-picker-topline {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.15em;
    min-height: 3.25em;
    padding: 0.42em 3.6em 0.36em;
    text-align: center;
  }

  .role-picker-topline strong {
    font-size: 0.98em;
    white-space: normal;
  }

  .role-picker-topline span,
  .role-picker-topline span:last-child {
    padding: 0;
    text-align: center;
    font-size: 0.68em;
  }

  .role-register-bar {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.2em;
    min-height: 2.2em;
    padding: 0.34em 0.5em;
  }

  .role-register-bar span,
  .role-register-bar span:last-child {
    text-align: center;
  }

  ul.tokens {
    grid-template-columns: repeat(auto-fit, var(--role-token-size));
    align-content: start;
    justify-content: center;
    height: calc(100% - 2.2em);
    padding: 0.42em 0.36em 2.2em;
    scroll-padding-bottom: 2.2em;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    --role-token-size: clamp(5.3em, 25.2vw, 6.9em);
    --role-token-gap-x: clamp(0.14em, 1vw, 0.24em);
    --role-token-gap-y: clamp(0.14em, 1vw, 0.26em);
  }

  ul.tokens li {
    width: var(--role-token-size);
    height: var(--role-token-size);
  }
}

@media (max-height: 560px) and (min-width: 641px) {
  .role-picker {
    ::v-deep .modal {
      height: calc(100vh - 2em);
    }

    ::v-deep .modal > .slot {
      grid-template-rows: 2.85em minmax(0, 1fr) auto;
      gap: 0.35em;
      padding-bottom: 0.38em;
    }
  }

  .role-picker-topline {
    min-height: 2.85em;
    padding-bottom: 0.3em;
  }

  .role-picker-topline strong {
    font-size: 1.18em;
  }

  ul.tokens {
    --role-token-size: clamp(2.65em, 4vw, 3.25em);
    --role-token-gap-x: 0.34em;
    --role-token-gap-y: 0.3em;
  }
}
</style>
