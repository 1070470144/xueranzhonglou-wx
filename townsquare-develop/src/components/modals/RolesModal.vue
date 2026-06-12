<template>
  <Modal class="roles" v-if="modals.roles && nonTravelers >= 5" @close="close">
    <div class="roles-picker-topline">
      <span>{{ selectedRoles }} / {{ nonTravelers }}</span>
      <strong>{{
        $t("modals.selectCharacters", { count: nonTravelers })
      }}</strong>
      <span>{{ $t("modals.shuffleCharacters") }}</span>
    </div>

    <div class="roles-picker-board">
      <section
        class="role-team-row"
        v-for="(teamRoles, team) in roleSelection"
        :key="team"
      >
        <div class="role-register-bar" :class="[team]">
          <span>{{ teamLabel(team) }}</span>
          <strong>
            {{ teamRoles.reduce((a, { selected }) => a + selected, 0) }} /
            {{ game[nonTravelers - 5][team] }}
          </strong>
        </div>
        <ul class="tokens">
          <li
            v-for="role in teamRoles"
            :class="[role.team, role.selected ? 'selected' : '']"
            :key="role.id"
            @click="role.selected = role.selected ? 0 : 1"
          >
            <Token :role="role" />
            <font-awesome-icon icon="exclamation-triangle" v-if="role.setup" />
            <div class="buttons" v-if="allowMultiple">
              <font-awesome-icon
                icon="minus-circle"
                @click.stop="role.selected--"
              />
              <span>{{ role.selected > 1 ? "x" + role.selected : "" }}</span>
              <font-awesome-icon
                icon="plus-circle"
                @click.stop="role.selected++"
              />
            </div>
          </li>
        </ul>
      </section>
    </div>
    <div class="warning" v-if="hasSelectedSetupRoles">
      <font-awesome-icon icon="exclamation-triangle" />
      <span>
        {{ $t("modals.setupWarning") }}
      </span>
    </div>
    <div class="roles-action-bar">
      <label class="multiple" :class="{ checked: allowMultiple }">
        <font-awesome-icon :icon="allowMultiple ? 'check-square' : 'square'" />
        <input type="checkbox" name="allow-multiple" v-model="allowMultiple" />
        {{ $t("modals.allowDuplicate") }}
      </label>
      <div class="button-group">
        <div
          class="button primary-role-action"
          @click="assignRoles"
          :class="{
            disabled: selectedRoles > nonTravelers || !selectedRoles,
          }"
        >
          <font-awesome-icon icon="people-arrows" />
          分配 {{ selectedRoles }}
        </div>
        <div class="button" @click="selectRandomRoles">
          <font-awesome-icon icon="random" />
          随机
        </div>
      </div>
    </div>
  </Modal>
</template>

<script>
import Modal from "./Modal";
import gameJSON from "./../../game";
import Token from "./../Token";
import { mapGetters, mapMutations, mapState } from "vuex";

const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default {
  components: {
    Token,
    Modal,
  },
  data: function () {
    return {
      roleSelection: {},
      game: gameJSON,
      allowMultiple: false,
    };
  },
  computed: {
    selectedRoles: function () {
      return Object.values(this.roleSelection)
        .map((roles) => roles.reduce((a, { selected }) => a + selected, 0))
        .reduce((a, b) => a + b, 0);
    },
    hasSelectedSetupRoles: function () {
      return Object.values(this.roleSelection).some((roles) =>
        roles.some((role) => role.selected && role.setup),
      );
    },
    selectedRolePool() {
      return Object.values(this.roleSelection)
        .map((roles) =>
          roles.reduce((selected, role) => {
            if (!role.selected) return selected;
            return selected.concat(Array(role.selected).fill(role.id));
          }, []),
        )
        .reduce((a, b) => [...a, ...b], []);
    },
    ...mapState(["roles", "modals", "grimoire"]),
    ...mapState("players", ["players"]),
    ...mapGetters({ nonTravelers: "players/nonTravelers" }),
  },
  methods: {
    selectRandomRoles() {
      this.roleSelection = {};
      this.roles.forEach((role) => {
        if (!this.roleSelection[role.team]) {
          this.$set(this.roleSelection, role.team, []);
        }
        this.roleSelection[role.team].push({ ...role, selected: 0 });
      });
      delete this.roleSelection["traveler"];
      const playerCount = Math.max(5, this.nonTravelers);
      const composition = this.game[playerCount - 5];
      Object.keys(composition).forEach((team) => {
        for (let x = 0; x < composition[team]; x++) {
          if (this.roleSelection[team]) {
            const available = this.roleSelection[team].filter(
              (role) => !role.selected,
            );
            if (available.length) {
              randomElement(available).selected = 1;
            }
          }
        }
      });
    },
    assignRoles() {
      if (this.selectedRoles <= this.nonTravelers && this.selectedRoles) {
        if (this.grimoire.roleDrawEnabled) {
          this.$store.commit(
            "roleDraw/setConfiguredPool",
            this.selectedRolePool,
          );
          this.$store.commit("closeModal", "roles");
          return;
        }
        // generate list of selected roles and randomize it
        const roles = Object.values(this.roleSelection)
          .map((roles) =>
            roles
              // duplicate roles selected more than once and filter unselected
              .reduce((a, r) => [...a, ...Array(r.selected).fill(r)], []),
          )
          // flatten into a single array
          .reduce((a, b) => [...a, ...b], [])
          .map((a) => [Math.random(), a])
          .sort((a, b) => a[0] - b[0])
          .map((a) => a[1]);
        this.players.forEach((player) => {
          if (player.role.team !== "traveler" && roles.length) {
            const value = roles.pop();
            this.$store.commit("players/update", {
              player,
              property: "role",
              value,
            });
          }
        });
        this.$store.dispatch("players/autoFillBluffs");
        this.$store.commit("closeModal", "roles");
      }
    },
    close() {
      this.closeModal("roles");
    },
    teamLabel(team) {
      const labels = {
        townsfolk: "镇民",
        outsider: "外来者",
        minion: "爪牙",
        demon: "恶魔",
      };
      return labels[team] || team;
    },
    ...mapMutations(["closeModal"]),
  },
  mounted: function () {
    if (!Object.keys(this.roleSelection).length) {
      this.selectRandomRoles();
    }
  },
  watch: {
    roles() {
      this.selectRandomRoles();
    },
  },
};
</script>

<style lang="scss" scoped>
@import "../../vars.scss";

.roles {
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
    height: 560px;
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

.roles-picker-topline {
  display: grid;
  grid-template-columns: minmax(5.5em, 0.85fr) minmax(0, 2.6fr) minmax(
      5.5em,
      0.85fr
    );
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

.roles-picker-topline strong {
  min-width: 0;
  color: #d4af37;
  font-size: 1.08em;
  line-height: 1;
  letter-spacing: 0.06em;
  text-align: center;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.roles-picker-topline span {
  padding-bottom: 0.06em;
  font-size: 0.78em;
  font-weight: 700;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.roles-picker-topline span:last-child {
  text-align: right;
}

.roles-picker-board {
  position: relative;
  display: grid;
  grid-template-rows: 1.45fr 0.85fr 0.85fr 0.85fr;
  min-height: 0;
  overflow: visible !important;
  border: 2px solid #3d2e26;
  border-radius: 2px;
  background: rgba(18, 14, 12, 0.78);
  box-shadow:
    0 0 20px rgba(0, 0, 0, 0.78),
    inset 0 1px 0 rgba(255, 236, 190, 0.05);
  backdrop-filter: blur(5px);
}

.role-team-row {
  display: grid;
  grid-template-columns: 6.4em minmax(0, 1fr);
  min-height: 0;
  overflow: visible;
  border-bottom: 1px solid #261d19;
  background: #151211;
}

.role-team-row:nth-child(even) {
  background: #110e0d;
}

.role-team-row:last-child {
  border-bottom: 0;
}

.role-register-bar {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 0.22em;
  min-width: 0;
  padding: 0.38em 0.4em;
  color: #c0a88a;
  border-right: 1px solid #3d2e26;
  background: #120f0e;
  text-align: center;
}

.role-register-bar span {
  max-width: 100%;
  overflow: hidden;
  color: #dcc4a1;
  font-size: 0.78em;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-register-bar strong {
  min-width: 4.3em;
  padding: 0.16em 0.32em;
  color: #fff8e7;
  border: 1px solid #3d2e26;
  border-radius: 2px;
  background: rgba(5, 4, 4, 0.62);
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.58);
  font-size: 0.86em;
}

.role-register-bar.townsfolk strong {
  color: $townsfolk;
}
.role-register-bar.outsider strong {
  color: $outsider;
}
.role-register-bar.minion strong {
  color: $minion;
}
.role-register-bar.demon strong {
  color: $demon;
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
  min-width: 0;
  min-height: 0;
  height: 100%;
  margin: 0;
  padding: 0.34em 0.42em;
  overflow: visible !important;
  border: 0;
  background: transparent;
  --role-token-size: clamp(2.3em, 3.35vw, 3.05em);
  --role-token-gap-x: clamp(0.2em, 0.48vw, 0.34em);
  --role-token-gap-y: clamp(0.16em, 0.42vw, 0.28em);
  li {
    position: relative;
    z-index: 1;
    min-width: 0;
    border-radius: 50%;
    width: var(--role-token-size);
    height: var(--role-token-size);
    margin: 0;
    aspect-ratio: 1;
    opacity: 0.48;
    transition:
      opacity 180ms,
      transform 180ms,
      filter 180ms;
    &.selected {
      opacity: 1;
      filter: saturate(1.12);
      .buttons {
        display: flex;
      }
      .fa-exclamation-triangle {
        display: block;
      }
    }
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
      z-index: 40;
    }

    ::v-deep .ability {
      z-index: 80;
    }
    .fa-exclamation-triangle {
      position: absolute;
      color: red;
      filter: drop-shadow(0 0 3px black) drop-shadow(0 0 3px black);
      top: 5px;
      right: -5px;
      font-size: 150%;
      display: none;
    }
    .buttons {
      display: none;
      position: absolute;
      top: 95%;
      text-align: center;
      width: 100%;
      z-index: 30;
      font-weight: bold;
      filter: drop-shadow(0 0 5px rgba(0, 0, 0, 1));
      span {
        flex-grow: 1;
      }
      svg {
        opacity: 0.25;
        cursor: pointer;
        &:hover {
          opacity: 1;
          color: red;
        }
      }
    }
  }
  .count {
    display: none;
  }
}

.roles-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6em;
  min-height: 2.55em;
  padding: 0.38em 0.55em;
  color: #dcc4a1;
  border: 1px solid #3d2e26;
  border-radius: 2px;
  background: rgba(18, 14, 12, 0.62);
  box-shadow:
    0 4px 14px rgba(0, 0, 0, 0.62),
    inset 0 1px 0 rgba(255, 236, 190, 0.04);
}

.roles .modal {
  .multiple {
    display: inline-flex;
    align-items: center;
    min-height: 1.95em;
    margin: 0;
    color: #b8a082;
    font-size: 0.78em;
    font-weight: 700;
    letter-spacing: 0.06em;
    cursor: pointer;
    &.checked,
    &:hover {
      color: #d4af37;
    }
    &.checked {
      margin-top: 0;
    }
    svg {
      margin-right: 5px;
    }
    input {
      display: none;
    }
  }

  .warning {
    color: $demon;
    position: absolute;
    bottom: 4.05em;
    right: 1.1em;
    z-index: 10;
    svg {
      font-size: 150%;
      vertical-align: middle;
    }
    span {
      display: none;
      text-align: center;
      position: absolute;
      right: -20px;
      bottom: 30px;
      width: 420px;
      background: rgba(18, 15, 13, 0.94);
      padding: 5px;
      border-radius: 2px;
      border: 1px solid #3d2e26;
    }
    &:hover span {
      display: block;
    }
  }
}

.button-group {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: nowrap;
  gap: 0.35em;
  justify-content: flex-end;
  margin: 0;
}

.button-group .button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 9.2em;
  min-width: 9.2em;
  max-width: 9.2em;
  min-height: 2.05em;
  margin: 0;
  padding: 0.18em 0.36em;
  color: #fff8e7;
  border: 1px solid #8b6508;
  border-radius: 2px;
  background: #2a1c09;
  box-shadow: inset 0 1px 0 rgba(255, 236, 190, 0.06);
  font-size: 0.66em;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.button-group .primary-role-action {
  border-color: #d4af37;
  background: linear-gradient(#b8860b, #946b07 48%, #5c4204);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.8),
    inset 0 1px 1px rgba(255, 255, 255, 0.2);
}

.button-group .button.disabled {
  color: #7f705f;
  border-color: #2b211d;
  background: #15110f;
  cursor: default;
  opacity: 0.58;
}

@media (max-width: 640px) {
  .roles {
    ::v-deep .modal {
      width: calc(100vw - 1em);
      max-width: calc(100vw - 1em);
      height: min(560px, calc(100vh - 1em));
      max-height: calc(100vh - 1em);
    }

    ::v-deep .modal > .slot {
      grid-template-rows: auto minmax(0, 1fr) auto;
      gap: 0.38em;
      padding: 0 0.42em 0.42em;
    }
  }

  .roles-picker-topline {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.15em;
    min-height: 3.25em;
    padding: 0.42em 3.6em 0.36em;
    text-align: center;
  }

  .roles-picker-topline strong {
    font-size: 0.84em;
    white-space: normal;
  }

  .roles-picker-topline span,
  .roles-picker-topline span:last-child {
    padding: 0;
    text-align: center;
    font-size: 0.68em;
  }

  .roles-picker-board {
    display: block;
    overflow-x: hidden !important;
    overflow-y: auto !important;
  }

  .role-team-row {
    grid-template-columns: 4.9em minmax(0, 1fr);
    min-height: 8.2em;
  }

  .role-register-bar {
    padding: 0.28em 0.3em;
  }

  .role-register-bar span {
    font-size: 0.68em;
  }

  .role-register-bar strong {
    min-width: 3.7em;
    font-size: 0.74em;
  }

  ul.tokens {
    align-content: start;
    padding: 0.36em 0.32em 1em;
    overflow: visible !important;
    --role-token-size: clamp(4.9em, 23.5vw, 6.3em);
    --role-token-gap-x: clamp(0.14em, 1vw, 0.24em);
    --role-token-gap-y: clamp(0.14em, 1vw, 0.26em);
  }

  .roles-action-bar {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.35em;
    padding: 0.34em 0.45em;
  }

  .roles .modal .multiple,
  .button-group {
    justify-content: center;
  }

  .button-group .button {
    flex: 1 1 0;
    width: auto;
    min-width: 0;
    max-width: none;
  }
}

@media (max-height: 600px) and (min-width: 641px) {
  .roles {
    ::v-deep .modal {
      height: calc(100vh - 2em);
    }

    ::v-deep .modal > .slot {
      grid-template-rows: 2.85em minmax(0, 1fr) auto;
      gap: 0.35em;
      padding-bottom: 0.38em;
    }
  }

  .roles-picker-topline {
    min-height: 2.85em;
    padding-bottom: 0.3em;
  }

  .roles-picker-topline strong {
    font-size: 0.98em;
  }

  ul.tokens {
    --role-token-size: clamp(2.05em, 3vw, 2.6em);
    --role-token-gap-x: 0.24em;
    --role-token-gap-y: 0.2em;
  }
}
</style>
