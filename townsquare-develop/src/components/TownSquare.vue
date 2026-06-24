<template>
  <div
    id="townsquare"
    class="square"
    :class="{
      public: grimoire.isPublic,
      spectator: session.isSpectator,
      vote: session.nomination,
    }"
    :style="nightLabelStyle"
  >
    <ul class="circle" :class="['size-' + players.length]">
      <Player
        v-for="(player, index) in players"
        :key="player.id || index"
        :player="player"
        @trigger="handleTrigger(index, $event)"
        :class="{
          from: Math.max(swap, move, nominate) === index,
          swap: swap > -1,
          move: move > -1,
          nominate: nominate > -1,
        }"
      ></Player>
    </ul>

    <div class="town-square-bottom-drawer-stack" v-if="players.length">
      <div
        class="town-square-drawer bluffs-drawer"
        :class="{ open: isBluffsOpen }"
      >
        <button
          type="button"
          class="town-square-drawer-tab"
          @click.stop="toggleBluffs"
        >
          <font-awesome-icon icon="theater-masks" />
          <span>{{ $t("townSquare.demonBluffs") }}</span>
        </button>
        <aside
          class="town-square-drawer-panel bluffs"
          ref="bluffs"
          :class="{ 'vertical-bluff-tabs': isBluffAreaVertical }"
        >
          <header class="town-square-drawer-header">
            <h3>
              {{
                activeBluffTab === "lunatic" && !session.isSpectator
                  ? $t("townSquare.lunaticBluffs")
                  : $t("townSquare.demonBluffs")
              }}
            </h3>
            <button type="button" @click.stop="toggleBluffs">
              <font-awesome-icon icon="times-circle" />
            </button>
          </header>
          <div class="bluff-tabs" v-if="!session.isSpectator">
            <button
              type="button"
              :class="{ active: activeBluffTab === 'demon' }"
              @click.stop="activeBluffTab = 'demon'"
            >
              {{ $t("townSquare.demonBluffs") }}
            </button>
            <button
              type="button"
              :class="{ active: activeBluffTab === 'lunatic' }"
              @click.stop="activeBluffTab = 'lunatic'"
            >
              {{ $t("townSquare.lunaticBluffs") }}
            </button>
          </div>
          <ul>
            <li
              v-for="index in bluffSize"
              :key="index"
              @click="openRoleModal(index * -1)"
            >
              <Token :role="activeBluffs[index - 1]"></Token>
            </li>
          </ul>
          <div
            class="lunatic-bluff-target"
            v-if="!session.isSpectator && activeBluffTab === 'lunatic'"
          >
            <select
              :value="lunaticBluffPlayerIndex"
              @change="setLunaticBluffPlayerIndex(Number($event.target.value))"
            >
              <option :value="-1">{{ $t("townSquare.choosePlayer") }}</option>
              <option
                v-for="(player, index) in players"
                :key="player.id || index"
                :value="index"
              >
                {{ index + 1 }}.
                {{ player.name || $t("townSquare.unnamedPlayer") }}
              </option>
            </select>
          </div>
        </aside>
      </div>
    </div>

    <div class="town-square-drawer-stack">
      <div
        class="town-square-drawer fabled-drawer"
        :class="{ open: isFabledOpen }"
        v-if="fabled.length"
      >
        <button
          type="button"
          class="town-square-drawer-tab"
          @click.stop="toggleFabled"
        >
          <font-awesome-icon icon="trophy" />
          <span>{{ $t("townSquare.fabled") }}</span>
        </button>
        <aside class="town-square-drawer-panel fabled">
          <header class="town-square-drawer-header">
            <h3>{{ $t("townSquare.fabled") }}</h3>
            <button type="button" @click.stop="toggleFabled">
              <font-awesome-icon icon="times-circle" />
            </button>
          </header>
          <ul>
            <li
              v-for="(role, index) in fabled"
              :key="role.id || index"
              @mouseenter="activeFabledIndex = index"
              @mouseleave="activeFabledIndex = -1"
              @focusin="activeFabledIndex = index"
              @focusout="activeFabledIndex = -1"
              @click="removeFabled(index)"
            >
              <div
                class="night-order first"
                v-if="nightOrder.get(role).first && grimoire.isNightOrder"
              >
                <em>{{ nightOrder.get(role).first }}.</em>
                <span v-if="role.firstNightReminder">{{
                  role.firstNightReminder
                }}</span>
              </div>
              <div
                class="night-order other"
                v-if="nightOrder.get(role).other && grimoire.isNightOrder"
              >
                <em>{{ nightOrder.get(role).other }}.</em>
                <span v-if="role.otherNightReminder">{{
                  role.otherNightReminder
                }}</span>
              </div>
              <Token :role="role"></Token>
            </li>
          </ul>
          <div
            class="fabled-hover-ability"
            v-if="
              activeFabledIndex >= 0 &&
              fabled[activeFabledIndex] &&
              fabled[activeFabledIndex].ability
            "
          >
            {{ fabled[activeFabledIndex].ability }}
          </div>
        </aside>
      </div>

      <div
        class="town-square-drawer night-control-drawer"
        :class="{ open: isNightNavigationOpen }"
        v-if="room.isHost"
      >
        <button
          type="button"
          class="town-square-drawer-tab"
          @click.stop="toggleNightNavigation"
        >
          <font-awesome-icon icon="cloud-moon" />
          <span>{{ $t("room.nightNavigation") }}</span>
        </button>
        <aside class="town-square-drawer-panel">
          <header class="town-square-drawer-header">
            <h3>{{ $t("room.nightNavigation") }}</h3>
            <button type="button" @click.stop="toggleNightNavigation">
              <font-awesome-icon icon="times-circle" />
            </button>
          </header>
          <div class="night-navigation">
            <div
              class="night-navigation-mode"
              role="group"
              :aria-label="$t('room.nightNavigation')"
            >
              <button
                type="button"
                class="button"
                :class="{ townsfolk: nightNavigation.mode === 'first' }"
                @click="setNightNavigationMode('first')"
              >
                {{ $t("room.firstNight") }}
              </button>
              <button
                type="button"
                class="button"
                :class="{ townsfolk: nightNavigation.mode === 'other' }"
                @click="setNightNavigationMode('other')"
              >
                {{ $t("room.otherNights") }}
              </button>
            </div>
            <div class="night-navigation-stepper">
              <button
                type="button"
                class="button"
                :disabled="!nightNavigationQueue.length"
                @click="previousNightAction"
              >
                <font-awesome-icon icon="step-backward" />
                {{ $t("room.previousNightAction") }}
              </button>
              <span class="night-navigation-current">
                {{ currentNightNavigationLabel }}
              </span>
              <button
                type="button"
                class="button demon"
                :disabled="!nightNavigationQueue.length"
                @click="nextNightAction"
              >
                <font-awesome-icon icon="step-forward" />
                {{ $t("room.nextNightAction") }}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <ReminderModal :player-index="selectedPlayer"></ReminderModal>
    <RoleModal
      :player-index="selectedPlayer"
      :bluff-type="selectedBluffType"
    ></RoleModal>
  </div>
</template>

<script>
import { mapGetters, mapState } from "vuex";
import Player from "./Player";
import Token from "./Token";
import ReminderModal from "./modals/ReminderModal";
import RoleModal from "./modals/RoleModal";

export default {
  components: {
    Player,
    Token,
    RoleModal,
    ReminderModal,
  },
  computed: {
    ...mapGetters({ nightOrder: "players/nightOrder" }),
    ...mapState(["grimoire", "roles", "room", "session", "modals"]),
    ...mapState("players", [
      "players",
      "bluffs",
      "lunaticBluffs",
      "lunaticBluffPlayerIndex",
      "fabled",
      "nightNavigation",
    ]),
    activeBluffs() {
      return this.activeBluffTab === "lunatic" && !this.session.isSpectator
        ? this.lunaticBluffs
        : this.bluffs;
    },
    nightLabelStyle() {
      return {
        "--first-night-label": `"${this.$t("townSquare.firstNight")}"`,
        "--other-nights-label": `"${this.$t("townSquare.otherNights")}"`,
      };
    },
    nightNavigationQueue() {
      return this.$store.getters["players/nightActionQueue"](
        this.nightNavigation.mode,
      );
    },
    currentNightNavigationEntry() {
      return this.nightNavigationQueue.find(
        (entry) => entry.seatIndex === this.nightNavigation.currentSeatIndex,
      );
    },
    currentNightNavigationLabel() {
      const entry = this.currentNightNavigationEntry;
      if (!entry) return this.$t("room.noNightActions");
      return `${entry.order}. ${entry.role.name || entry.role.id} - ${
        entry.player.name || this.$t("room.unnamedPlayer")
      }`;
    },
  },
  data() {
    return {
      selectedPlayer: 0,
      bluffSize: 3,
      swap: -1,
      move: -1,
      nominate: -1,
      activeBluffTab: "demon",
      selectedBluffType: "demon",
      isBluffAreaVertical: false,
      bluffResizeObserver: null,
      bluffLayoutFrame: null,
      isBluffsOpen: false,
      isFabledOpen: false,
      isNightNavigationOpen: false,
      activeFabledIndex: -1,
    };
  },
  watch: {
    "modals.privateChat"(visible) {
      if (visible) this.closeLeftDrawers();
    },
  },
  mounted() {
    this.$nextTick(this.observeBluffArea);
    window.addEventListener("resize", this.updateBluffTabLayout);
  },
  beforeDestroy() {
    if (this.bluffResizeObserver) this.bluffResizeObserver.disconnect();
    if (this.bluffLayoutFrame && window.cancelAnimationFrame) {
      cancelAnimationFrame(this.bluffLayoutFrame);
    }
    window.removeEventListener("resize", this.updateBluffTabLayout);
  },
  methods: {
    closeLeftDrawers(except = "") {
      if (except !== "bluffs") this.isBluffsOpen = false;
      if (except !== "fabled") {
        this.isFabledOpen = false;
        this.activeFabledIndex = -1;
      }
      if (except !== "nightNavigation") this.isNightNavigationOpen = false;
    },
    closePrivateChat() {
      if (this.modals.privateChat) {
        this.$store.commit("toggleModal", "privateChat");
      }
    },
    toggleBluffs() {
      const shouldOpen = !this.isBluffsOpen;
      this.closeLeftDrawers("bluffs");
      this.isBluffsOpen = shouldOpen;
      if (shouldOpen) this.closePrivateChat();
    },
    toggleFabled() {
      const shouldOpen = !this.isFabledOpen;
      this.closeLeftDrawers("fabled");
      this.isFabledOpen = shouldOpen;
      if (shouldOpen) this.closePrivateChat();
    },
    toggleNightNavigation() {
      if (this.isNightNavigationOpen) {
        this.$store.commit("players/clearNightNavigation");
      }
      const shouldOpen = !this.isNightNavigationOpen;
      this.closeLeftDrawers("nightNavigation");
      this.isNightNavigationOpen = shouldOpen;
      if (shouldOpen) this.closePrivateChat();
    },
    removeFabled(index) {
      if (this.session.isSpectator) return;
      this.$store.commit("players/setFabled", { index });
    },
    handleTrigger(playerIndex, [method, params]) {
      if (typeof this[method] === "function") {
        this[method](playerIndex, params);
      }
    },
    claimSeat(playerIndex) {
      if (!this.session.isSpectator) return;
      if (this.session.playerId === this.players[playerIndex].id) {
        this.$store.commit("session/claimSeat", -1);
      } else {
        this.$store.commit("session/claimSeat", playerIndex);
      }
    },
    openReminderModal(playerIndex) {
      this.selectedPlayer = playerIndex;
      this.$store.commit("toggleModal", "reminder");
    },
    openRoleModal(playerIndex) {
      const player = this.players[playerIndex];
      if (this.session.isSpectator && player && player.role.team === "traveler")
        return;
      this.selectedPlayer = playerIndex;
      this.selectedBluffType = playerIndex < 0 ? this.activeBluffTab : "demon";
      this.$store.commit("toggleModal", "role");
    },
    setLunaticBluffPlayerIndex(index) {
      this.$store.commit("players/setLunaticBluffPlayerIndex", index);
    },
    setNightNavigationMode(mode) {
      this.$store.commit("players/setNightNavigationMode", mode);
    },
    previousNightAction() {
      this.moveNightAction(-1);
    },
    nextNightAction() {
      this.moveNightAction(1);
    },
    moveNightAction(direction) {
      const queue = this.nightNavigationQueue;
      if (!queue.length) {
        this.$store.commit("players/clearNightNavigation");
        return;
      }
      const currentIndex = queue.findIndex(
        (entry) => entry.seatIndex === this.nightNavigation.currentSeatIndex,
      );
      const nextIndex =
        currentIndex < 0
          ? direction > 0
            ? 0
            : queue.length - 1
          : (currentIndex + direction + queue.length) % queue.length;
      this.$store.commit(
        "players/setNightNavigationSeat",
        queue[nextIndex].seatIndex,
      );
    },
    observeBluffArea() {
      this.updateBluffTabLayout();
      if (!window.ResizeObserver || !this.$refs.bluffs) return;
      this.bluffResizeObserver = new ResizeObserver(this.updateBluffTabLayout);
      this.bluffResizeObserver.observe(this.$refs.bluffs);
    },
    updateBluffTabLayout() {
      if (this.bluffLayoutFrame) return;
      const schedule =
        window.requestAnimationFrame || ((callback) => setTimeout(callback, 0));
      this.bluffLayoutFrame = schedule(() => {
        this.bluffLayoutFrame = null;
        const bluffs = this.$refs.bluffs;
        if (!bluffs) return;
        const bounds = bluffs.getBoundingClientRect();
        const isVertical = bounds.height > bounds.width;
        if (this.isBluffAreaVertical !== isVertical) {
          this.isBluffAreaVertical = isVertical;
        }
      });
    },
    removePlayer(playerIndex) {
      if (this.session.isSpectator || this.session.lockedVote) return;
      if (
        confirm(
          this.$t("townSquare.confirmRemovePlayer", {
            name: this.players[playerIndex].name,
          }),
        )
      ) {
        const { nomination } = this.session;
        if (nomination) {
          if (nomination.includes(playerIndex)) {
            // abort vote if removed player is either nominator or nominee
            this.$store.commit("session/nomination");
          } else if (
            nomination[0] > playerIndex ||
            nomination[1] > playerIndex
          ) {
            // update nomination array if removed player has lower index
            this.$store.commit("session/setNomination", [
              nomination[0] > playerIndex ? nomination[0] - 1 : nomination[0],
              nomination[1] > playerIndex ? nomination[1] - 1 : nomination[1],
            ]);
          }
        }
        this.$store.commit("players/remove", playerIndex);
      }
    },
    swapPlayer(from, to) {
      if (this.session.isSpectator || this.session.lockedVote) return;
      if (to === undefined) {
        this.cancel();
        this.swap = from;
      } else {
        if (this.session.nomination) {
          // update nomination if one of the involved players is swapped
          const swapTo = this.players.indexOf(to);
          const updatedNomination = this.session.nomination.map((nom) => {
            if (nom === this.swap) return swapTo;
            if (nom === swapTo) return this.swap;
            return nom;
          });
          if (
            this.session.nomination[0] !== updatedNomination[0] ||
            this.session.nomination[1] !== updatedNomination[1]
          ) {
            this.$store.commit("session/setNomination", updatedNomination);
          }
        }
        this.$store.commit("players/swap", [
          this.swap,
          this.players.indexOf(to),
        ]);
        this.cancel();
      }
    },
    movePlayer(from, to) {
      if (this.session.isSpectator || this.session.lockedVote) return;
      if (to === undefined) {
        this.cancel();
        this.move = from;
      } else {
        if (this.session.nomination) {
          // update nomination if it is affected by the move
          const moveTo = this.players.indexOf(to);
          const updatedNomination = this.session.nomination.map((nom) => {
            if (nom === this.move) return moveTo;
            if (nom > this.move && nom <= moveTo) return nom - 1;
            if (nom < this.move && nom >= moveTo) return nom + 1;
            return nom;
          });
          if (
            this.session.nomination[0] !== updatedNomination[0] ||
            this.session.nomination[1] !== updatedNomination[1]
          ) {
            this.$store.commit("session/setNomination", updatedNomination);
          }
        }
        this.$store.commit("players/move", [
          this.move,
          this.players.indexOf(to),
        ]);
        this.cancel();
      }
    },
    nominatePlayer(from, to) {
      if (this.session.isSpectator || this.session.lockedVote) return;
      if (to === undefined) {
        const prev = this.nominate;
        this.cancel();
        if (from !== prev) {
          this.nominate = from;
        }
      } else {
        const nomination = [this.nominate, this.players.indexOf(to)];
        this.$store.commit("session/nomination", { nomination });
        this.cancel();
      }
    },
    cancel() {
      this.move = -1;
      this.swap = -1;
      this.nominate = -1;
    },
  },
};
</script>

<style lang="scss">
@use "sass:math";
@import "../vars.scss";

#townsquare {
  width: 100%;
  height: 100%;
  padding: 20px;
  display: flex;
  align-items: center;
  align-content: center;
  justify-content: center;
}

.circle {
  padding: 0;
  width: 100%;
  height: 100%;
  list-style: none;
  margin: 0;

  > li {
    position: absolute;
    left: 50%;
    height: 50%;
    transform-origin: 0 100%;
    pointer-events: none;

    &:hover {
      z-index: 25 !important;
    }

    > .player {
      margin-left: -50%;
      width: 100%;
      pointer-events: all;
    }
    > .reminder {
      margin-left: -25%;
      width: 50%;
      pointer-events: all;
    }
  }
}

@media (orientation: portrait) and (max-width: 768px) {
  #townsquare {
    height: 100dvh;
    min-height: 100svh;
    padding: max(52px, env(safe-area-inset-top)) 14px
      max(50px, env(safe-area-inset-bottom));
    align-items: center;
    overflow: hidden;
  }

  .circle {
    width: min(calc(100vw - 22px), calc(100dvh - 112px), 560px);
    height: min(calc(100vw - 22px), calc(100dvh - 112px), 560px);
    max-width: none;
    max-height: none;
    position: relative;
  }
}

@media (orientation: portrait) and (max-width: 420px) {
  #townsquare {
    padding-left: 10px;
    padding-right: 10px;
  }

  .circle {
    width: min(calc(100vw - 16px), calc(100dvh - 104px), 540px);
    height: min(calc(100vw - 16px), calc(100dvh - 104px), 540px);
  }
}

@media (orientation: portrait) and (max-width: 640px) {
  #app.room-control-open #townsquare {
    padding-bottom: calc(
      var(--room-control-mobile-height, min(42vh, 330px)) + 8px
    );
    align-items: flex-start;
  }

  #app.room-control-open .circle {
    width: min(
      calc(100vw - 16px),
      calc(100dvh - var(--room-control-mobile-height, min(42vh, 330px)) - 74px),
      540px
    );
    height: min(
      calc(100vw - 16px),
      calc(100dvh - var(--room-control-mobile-height, min(42vh, 330px)) - 74px),
      540px
    );
  }
}

@mixin on-circle($item-count) {
  $angle: math.div(360, $item-count);
  $rot: 0;

  // rotation and tooltip placement
  @for $i from 1 through $item-count {
    &:nth-child(#{$i}) {
      transform: rotate($rot * 1deg);
      @if $i - 1 <= math.div($item-count, 2) {
        // first half of players
        z-index: $item-count - $i + 1;
        // open menu on the left
        .player > .menu {
          left: auto;
          right: 110%;
          margin-right: 15px;
          &:before {
            border-left-color: black;
            border-right-color: transparent;
            right: auto;
            left: 100%;
          }
        }
        .fold-enter-active,
        .fold-leave-active {
          transform-origin: right center;
        }
        .fold-enter,
        .fold-leave-to {
          transform: perspective(200px) rotateY(-90deg);
        }
        // show ability tooltip on the left
        .ability {
          right: 120%;
          left: auto;
          &:before {
            border-right-color: transparent;
            border-left-color: black;
            right: auto;
            left: 100%;
          }
        }
        .pronouns {
          left: 110%;
          right: auto;
          &:before {
            border-left-color: transparent;
            border-right-color: black;
            left: auto;
            right: 100%;
          }
        }
      } @else {
        // second half of players
        z-index: $i - 1;
      }

      > * {
        transform: rotate($rot * -1deg);
      }

      // animation cascade
      .life,
      .token,
      .shroud,
      .night-order,
      .seat {
        animation-delay: ($i - 1) * 50ms;
        transition-delay: ($i - 1) * 50ms;
      }

      // move reminders closer to the sides of the circle
      $q: math.div($item-count, 4);
      $x: $i - 1;
      @if $x < $q or ($x >= math.div($item-count, 2) and $x < $q * 3) {
        .player {
          margin-bottom: -10% + 20% * (1 - math.div($x % $q, $q));
        }
      } @else {
        .player {
          margin-bottom: -10% + 20% * math.div($x % $q, $q);
        }
      }
    }
    $rot: $rot + $angle;
  }
}

@for $i from 1 through 20 {
  .circle.size-#{$i} > li {
    @include on-circle($item-count: $i);
  }
}

/***** Left drawers *******/
.town-square-drawer-stack {
  position: absolute;
  top: max(0px, env(safe-area-inset-top));
  left: 0;
  display: grid;
  gap: 6px;
  z-index: 70;
  pointer-events: none;
}

.town-square-bottom-drawer-stack {
  position: absolute;
  bottom: max(86px, calc(env(safe-area-inset-bottom) + 86px));
  left: 0;
  display: grid;
  gap: 6px;
  z-index: 72;
  pointer-events: none;
}

#townsquare.public .town-square-bottom-drawer-stack {
  opacity: 0;
  pointer-events: none;
  transform: scale(0.1);
}

.town-square-drawer {
  position: relative;
  min-height: 44px;
  pointer-events: auto;
}

.town-square-drawer-tab {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-rows: 1.05em minmax(0, 1fr);
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  justify-items: center;
  gap: 0.28em;
  width: 42px;
  min-height: 82px;
  margin: 0;
  padding: 0.48em 0.22em;
  color: #dcc4a1;
  border: 2px solid #3d2e26;
  border-left: 0;
  border-radius: 0 5px 5px 0;
  background: linear-gradient(
      180deg,
      rgba(45, 12, 9, 0.96),
      rgba(15, 11, 10, 0.96)
    ),
    #1d1816;
  box-shadow:
    0 12px 28px rgba(0, 0, 0, 0.58),
    inset 0 1px 0 rgba(255, 236, 190, 0.06);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  letter-spacing: 0;
  line-height: 1;

  svg {
    justify-self: center;
    width: 1.05em;
    min-width: 1.05em;
  }

  span {
    justify-self: center;
    max-height: 4.8em;
    overflow: hidden;
    text-align: center;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    white-space: nowrap;
  }
}

.town-square-drawer.open .town-square-drawer-tab {
  color: #fff8e7;
  border-color: #8b6508;
  background: linear-gradient(
      180deg,
      rgba(142, 39, 33, 0.98),
      rgba(31, 16, 12, 0.98)
    ),
    #2a1c09;
}

.town-square-drawer-panel {
  position: absolute;
  top: 0;
  left: 42px;
  width: min(320px, calc(100vw - 62px));
  max-height: min(46vh, 330px);
  color: #dcc4a1;
  border: 1px solid rgba(139, 101, 8, 0.52);
  border-left: 0;
  border-radius: 0 6px 6px 0;
  background: radial-gradient(
      circle at 50% 0,
      rgba(92, 26, 22, 0.2),
      transparent 34%
    ),
    linear-gradient(180deg, rgba(20, 14, 11, 0.76), rgba(8, 6, 5, 0.72));
  box-shadow:
    0 18px 54px rgba(0, 0, 0, 0.58),
    inset 0 1px 0 rgba(255, 236, 190, 0.08);
  backdrop-filter: blur(5px);
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
  transform: translateX(-8px);
  transform-origin: left center;
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}

.town-square-drawer.open .town-square-drawer-panel {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
}

.town-square-bottom-drawer-stack .town-square-drawer-panel {
  top: auto;
  bottom: 0;
  transform-origin: left bottom;
}

.town-square-drawer-header {
  display: flex;
  align-items: center;
  min-height: 2.28em;
  border-bottom: 1px solid rgba(61, 46, 38, 0.82);
  background: linear-gradient(90deg, rgba(92, 26, 22, 0.28), transparent 66%),
    rgba(18, 14, 12, 0.74);
}

.town-square-drawer-header h3 {
  min-width: 0;
  flex: 1;
  margin: 0;
  padding: 0.28em 0.58em 0.26em;
  color: #fff8e7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.82em;
  letter-spacing: 0.04em;
}

.town-square-drawer-header button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.44em;
  height: 1.44em;
  margin: 0 0.42em 0 0;
  padding: 0;
  color: #d9bf8c;
  border: 1px solid rgba(124, 94, 70, 0.58);
  border-radius: 50%;
  background: rgba(5, 4, 4, 0.32);
  cursor: pointer;
  font-size: 0.82em;
}

.town-square-drawer-header button:hover {
  color: #fff8e7;
  border-color: rgba(212, 175, 55, 0.72);
  background: rgba(92, 26, 22, 0.38);
}

.fabled-drawer .town-square-drawer-panel ul {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.34em;
  margin: 0;
  padding: 0.48em;
  overflow-x: auto;
  overflow-y: hidden;
  list-style: none;
  background: radial-gradient(
      circle at 50% 14%,
      rgba(212, 175, 55, 0.05),
      transparent 28%
    ),
    rgba(8, 7, 6, 0.34);
}

.fabled-drawer .town-square-drawer-panel li {
  position: relative;
  width: clamp(77px, 13.4vh, 115px);
  height: clamp(77px, 13.4vh, 115px);
  flex: 0 0 auto;
  cursor: pointer;
  border: 1px solid rgba(124, 94, 70, 0.36);
  border-radius: 4px;
  background: rgba(5, 4, 4, 0.24);
  box-shadow: inset 0 1px 0 rgba(255, 236, 190, 0.05);
}

.fabled-drawer .town-square-drawer-panel {
  width: min(520px, calc(100vw - 62px));
}

.fabled-hover-ability {
  margin: 0.38em 0.48em 0.48em;
  max-height: min(22vh, 150px);
  padding: 0.52em 0.62em;
  color: rgba(247, 240, 223, 0.88);
  border: 1px solid rgba(124, 94, 70, 0.68);
  border-radius: 4px;
  background: rgba(10, 8, 7, 0.92);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.36);
  overflow-y: auto;
  font-size: 0.72em;
  line-height: 1.36;
  text-align: left;
  word-break: break-word;
  pointer-events: none;
}

.fabled-drawer .token .ability {
  display: none;
}

.night-navigation {
  display: grid;
  gap: 0.34em;
  padding: 0.42em 0.48em 0.48em;
  background: radial-gradient(
      circle at 50% 14%,
      rgba(212, 175, 55, 0.05),
      transparent 28%
    ),
    rgba(8, 7, 6, 0.34);
}

.town-square-drawer:not(.fabled-drawer):not(.bluffs-drawer)
  .town-square-drawer-header
  h3 {
  font-size: 0.76em;
}

.night-navigation-mode,
.night-navigation-stepper {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.28em;
}

.night-navigation-stepper {
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.25fr) minmax(0, 0.85fr);
}

.night-navigation .button {
  min-width: 0;
  min-height: 2.05em;
  margin: 0;
  padding: 0 0.46em;
  color: #b8a082;
  border: 1px solid rgba(124, 94, 70, 0.58);
  border-radius: 999px;
  background: rgba(5, 4, 4, 0.3);
  box-shadow: inset 0 1px 0 rgba(255, 236, 190, 0.06);
  font-size: 0.68em;
}

.night-navigation .button.townsfolk {
  color: #fff8e7;
  border-color: rgba(212, 175, 55, 0.72);
  background: linear-gradient(
    180deg,
    rgba(184, 134, 11, 0.82),
    rgba(92, 66, 4, 0.82)
  );
}

.night-navigation .button.demon {
  color: #fff8e7;
  border-color: rgba(141, 40, 34, 0.72);
  background: linear-gradient(
    180deg,
    rgba(139, 38, 32, 0.82),
    rgba(58, 18, 14, 0.82)
  );
}

.night-navigation .button:disabled {
  opacity: 0.48;
}

.night-navigation-current {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 2.05em;
  padding: 0 0.46em;
  color: #fff8e7;
  border: 1px solid rgba(124, 94, 70, 0.62);
  border-radius: 4px;
  background: rgba(5, 4, 4, 0.48);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.66em;
}

.bluffs-drawer .town-square-drawer-panel {
  width: min(460px, calc(100vw - 62px));
  max-height: min(48vh, 380px);
}

.bluffs-drawer .bluffs {
  color: #dcc4a1;
}

.bluffs-drawer .bluff-tabs {
  display: flex;
  gap: 0.26em;
  padding: 0.28em 0.38em;
  border-bottom: 1px solid rgba(61, 46, 38, 0.72);
  background: rgba(10, 8, 7, 0.42);
}

.bluffs-drawer .bluff-tabs button {
  cursor: pointer;
  color: #b8a082;
  background: rgba(5, 4, 4, 0.3);
  border: 1px solid rgba(124, 94, 70, 0.5);
  border-radius: 999px;
  padding: 0.26em 0.58em;
  font: inherit;
  font-size: 0.72em;
  white-space: nowrap;
}

.bluffs-drawer .bluff-tabs button.active {
  color: #fff8e7;
  border-color: rgba(212, 175, 55, 0.72);
  background: linear-gradient(
    180deg,
    rgba(139, 38, 32, 0.82),
    rgba(58, 18, 14, 0.82)
  );
}

.bluffs-drawer ul {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.34em;
  margin: 0;
  padding: 0.48em;
  overflow-x: auto;
  list-style: none;
  background: radial-gradient(
      circle at 50% 14%,
      rgba(212, 175, 55, 0.05),
      transparent 28%
    ),
    rgba(8, 7, 6, 0.34);
}

.bluffs-drawer li {
  position: relative;
  width: clamp(77px, 13.4vh, 115px);
  height: clamp(77px, 13.4vh, 115px);
  flex: 0 0 auto;
  cursor: pointer;
  border: 1px solid rgba(124, 94, 70, 0.36);
  border-radius: 4px;
  background: rgba(5, 4, 4, 0.24);
  box-shadow: inset 0 1px 0 rgba(255, 236, 190, 0.05);
}

.bluffs-drawer .lunatic-bluff-target {
  display: flex;
  padding: 0.38em 0.48em 0.48em;
  border-top: 1px solid rgba(61, 46, 38, 0.78);
  background: linear-gradient(
      180deg,
      rgba(18, 15, 13, 0.86),
      rgba(10, 8, 7, 0.92)
    ),
    rgba(18, 15, 13, 0.86);
}

.bluffs-drawer .lunatic-bluff-target select {
  width: 100%;
  height: 1.82em;
  min-height: 0;
  color: #f7f0df;
  background: rgba(5, 4, 4, 0.62);
  border: 1px solid rgba(124, 94, 70, 0.88);
  border-radius: 2px;
}

.bluffs-drawer .vertical-bluff-tabs {
  .bluff-tabs {
    position: absolute;
    left: 6px;
    top: 44px;
    bottom: 10px;
    width: 30px;
    flex-direction: column;
    gap: 6px;
    border-bottom: 0;
    background: transparent;
    z-index: 3;
  }

  .bluff-tabs button {
    flex: 1;
    min-height: 0;
    padding: 4px 2px;
    font-size: 12px;
    line-height: 1;
    text-align: center;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    white-space: normal;
    overflow: hidden;
  }

  ul,
  .lunatic-bluff-target {
    margin-left: 34px;
  }
}

@media (max-width: 768px) {
  .town-square-drawer-stack {
    top: max(0px, env(safe-area-inset-top));
    gap: 5px;
  }

  .town-square-bottom-drawer-stack {
    bottom: max(78px, calc(env(safe-area-inset-bottom) + 78px));
    gap: 5px;
  }

  .town-square-drawer-tab {
    width: 40px;
    min-height: 76px;
    padding: 0.42em 0.18em;
    font-size: 11px;
  }

  .town-square-drawer-panel {
    left: 40px;
    width: min(284px, calc(100vw - 52px));
    max-height: min(40vh, 280px);
  }

  .bluffs-drawer .town-square-drawer-panel {
    width: min(360px, calc(100vw - 46px));
    max-height: min(44vh, 320px);
  }

  .town-square-drawer-header h3 {
    padding: 0.28em 0.46em;
    font-size: clamp(10px, 2.8vw, 12px);
  }

  .fabled-drawer .town-square-drawer-panel li {
    width: clamp(64px, 20vw, 91px);
    height: clamp(64px, 20vw, 91px);
  }

  .fabled-hover-ability {
    font-size: 0.66em;
  }

  .bluffs-drawer li {
    width: clamp(64px, 20vw, 91px);
    height: clamp(64px, 20vw, 91px);
  }

  .night-navigation {
    gap: 0.24em;
    padding: 0.34em;
  }

  .night-navigation .button {
    font-size: 0.64em;
  }

  .night-navigation-stepper {
    grid-template-columns: minmax(0, 1fr);
  }

  .night-navigation-current {
    min-height: 2.2em;
    font-size: 0.64em;
  }
}

/***** Demon bluffs / Fabled *******/
#townsquare > .bluffs,
#townsquare > .fabled {
  position: absolute;
  &.bluffs {
    bottom: 10px;
  }
  &.fabled {
    top: 10px;
  }
  left: 10px;
  color: #dcc4a1;
  background: rgba(12, 9, 8, 0.72);
  border-radius: 2px;
  border: 2px solid #3d2e26;
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.62),
    inset 0 1px 0 rgba(255, 236, 190, 0.05);
  backdrop-filter: blur(3px);
  filter: none;
  transform-origin: bottom left;
  transform: scale(1);
  opacity: 1;
  transition: all 200ms ease-in-out;
  z-index: 50;

  > svg.fa-times-circle,
  > svg.fa-plus-circle {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 30;
    width: 1.15em;
    height: 1.15em;
    color: #dcc4a1;
    cursor: pointer;
    border-radius: 50%;
    background: rgba(12, 9, 8, 0.84);
    box-shadow: 0 0 0 2px rgba(12, 9, 8, 0.72);
    pointer-events: auto;
    &.fa-plus-circle {
      display: none;
    }
    &:hover {
      color: #fff8e7;
    }
  }
  h3 {
    min-height: 2.1em;
    margin: 0;
    padding: 0.35em 2.2em 0.3em 0.75em;
    display: flex;
    align-items: center;
    align-content: center;
    justify-content: center;
    color: #fff8e7;
    border-bottom: 1px solid #3d2e26;
    background: radial-gradient(
        circle at 50% 0%,
        rgba(92, 26, 22, 0.22),
        transparent 36%
      ),
      rgba(18, 14, 12, 0.9);
    font-size: 1em;
    letter-spacing: 0.08em;
    span {
      flex-grow: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    svg {
      cursor: pointer;
      flex-grow: 0;
      &.fa-times-circle {
        margin-left: 1vh;
      }
      &.fa-plus-circle {
        margin-left: 1vh;
        display: none;
      }
      &:hover path {
        fill: #fff8e7;
        stroke-width: 0;
      }
    }
  }
  &.bluffs > h3 {
    display: none;
  }
  &.fabled > h3 {
    padding-right: 2.4em;
  }
  ul {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: 0.35em 2.65em 0.45em 0.45em;
    li {
      width: 14vh;
      height: 14vh;
      margin: 0 0.5%;
      display: inline-block;
      transition: all 250ms;
    }
  }
  .bluff-tabs {
    display: flex;
    gap: 0;
    padding: 0;
    border-bottom: 1px solid #3d2e26;
    background: rgba(18, 15, 13, 0.86);

    button {
      cursor: pointer;
      color: #b8a082;
      background: transparent;
      border: 0;
      border-right: 1px solid #3d2e26;
      border-radius: 0;
      padding: 0.35em 0.7em;
      font: inherit;
      font-size: 0.86em;
      white-space: nowrap;

      &.active {
        color: #fff8e7;
        background: linear-gradient(#8a2721, #581612 54%, #2d0c09);
      }
    }
  }
  .lunatic-bluff-target {
    display: flex;
    padding: 0.45em 0.55em 0.55em;
    border-top: 1px solid rgba(61, 46, 38, 0.78);
    background: rgba(18, 15, 13, 0.72);

    select {
      width: 100%;
      min-height: 0;
      color: #f7f0df;
      background: rgba(5, 4, 4, 0.62);
      border: 1px solid rgba(124, 94, 70, 0.88);
      border-radius: 2px;
      height: 2em;
    }
  }
  &.vertical-bluff-tabs {
    .bluff-tabs {
      position: absolute;
      left: 6px;
      top: 10px;
      bottom: 10px;
      width: 30px;
      flex-direction: column;
      gap: 6px;
      padding: 0;
      z-index: 3;

      button {
        flex: 1;
        min-height: 0;
        padding: 4px 2px;
        font-size: 12px;
        line-height: 1;
        text-align: center;
        writing-mode: vertical-rl;
        text-orientation: mixed;
        white-space: normal;
        overflow: hidden;
      }
    }

    &:not(.closed) > h3,
    &:not(.closed) > ul,
    &:not(.closed) > .lunatic-bluff-target {
      margin-left: 34px;
    }
  }
  &.closed {
    width: 34px;
    height: 34px;
    min-width: 34px;
    min-height: 34px;

    svg.fa-times-circle {
      display: none;
    }
    svg.fa-plus-circle {
      display: block;
      top: 50%;
      right: auto;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    h3,
    ul {
      margin: 0;
      padding: 0;
    }
    h3 {
      min-height: 0;
      border: 0;
      background: transparent;
    }
    h3 span {
      display: none;
    }
    ul {
      display: none;
    }
    ul li {
      width: 0;
      height: 0;
      .night-order {
        opacity: 0;
      }
      .token {
        border-width: 0;
      }
    }
    .lunatic-bluff-target {
      display: none;
    }
    .bluff-tabs {
      display: none;
    }
  }
}

#townsquare.public > .bluffs {
  opacity: 0;
  transform: scale(0.1);
}

@media (max-width: 768px) {
  #townsquare > .bluffs,
  #townsquare > .fabled {
    left: max(8px, env(safe-area-inset-left));
    max-width: min(54vw, 220px);
    border-width: 2px;
    border-radius: 8px;
    transform-origin: left center;

    h3 {
      min-height: 24px;
      margin: 0;
      padding-right: 22px;
      font-size: clamp(12px, 3.4vw, 16px);
      line-height: 1.2;
      align-items: center;

      svg {
        &.fa-times-circle,
        &.fa-plus-circle {
          margin-left: 6px;
        }
        &.fa-times-circle {
          top: 0.45em;
          right: 0.55em;
        }
      }
    }

    > svg.fa-times-circle,
    > svg.fa-plus-circle {
      top: 7px;
      right: 7px;
      z-index: 30;
      width: 16px;
      height: 16px;
    }

    ul {
      margin: 0;
      padding: 0 34px 5px 5px;
      justify-content: flex-start;

      li {
        width: clamp(44px, 15vw, 64px);
        height: clamp(44px, 15vw, 64px);
        margin: 0 2px;
      }
    }
    .lunatic-bluff-target {
      padding: 0 5px 5px;
      select {
        height: 22px;
        font-size: 12px;
      }
    }
  }

  #townsquare > .bluffs.closed,
  #townsquare > .fabled.closed {
    width: 34px;
    height: 34px;
    min-width: 34px;
    min-height: 34px;
    max-width: 34px;
    border-radius: 2px;
  }

  #townsquare > .bluffs.closed ul,
  #townsquare > .fabled.closed ul {
    display: none;
    padding: 0;
  }

  #townsquare > .bluffs.closed h3,
  #townsquare > .fabled.closed h3 {
    min-height: 0;
    padding: 0;
    border: 0;
    background: transparent;
  }

  #townsquare > .fabled.closed h3 span {
    display: none;
  }

  #townsquare > .fabled {
    top: max(54px, calc(env(safe-area-inset-top) + 48px));
  }

  #townsquare > .bluffs {
    bottom: max(56px, calc(env(safe-area-inset-bottom) + 48px));
  }

  #townsquare > .bluffs > h3 {
    display: none;
  }
}

@media (max-width: 420px) {
  #townsquare > .bluffs,
  #townsquare > .fabled {
    max-width: min(58vw, 200px);

    ul li {
      width: clamp(42px, 14.5vw, 58px);
      height: clamp(42px, 14.5vw, 58px);
    }
  }
}

.fabled ul li .token:before {
  content: " ";
  opacity: 0;
  transition: opacity 250ms;
  background-image: url("../assets/icons/x.png");
  z-index: 2;
}

/**** Night reminders ****/
.night-order {
  position: absolute;
  width: 100%;
  cursor: pointer;
  opacity: 1;
  transition: opacity 200ms;
  display: flex;
  top: 0;
  align-items: center;
  pointer-events: none;

  &:after {
    content: " ";
    display: block;
    padding-top: 100%;
  }

  #townsquare.public & {
    opacity: 0;
    pointer-events: none;
  }

  &:hover ~ .token .ability {
    opacity: 0;
  }

  span {
    display: flex;
    position: absolute;
    padding: 5px 10px 5px 30px;
    width: 350px;
    z-index: 25;
    font-size: 70%;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 10px;
    border: 3px solid black;
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5));
    text-align: left;
    align-items: center;
    opacity: 0;
    transition: opacity 200ms ease-in-out;

    &:before {
      transform: rotate(-90deg);
      transform-origin: center top;
      left: -98px;
      top: 50%;
      font-size: 100%;
      position: absolute;
      font-weight: bold;
      text-align: center;
      width: 200px;
    }

    &:after {
      content: " ";
      border: 10px solid transparent;
      width: 0;
      height: 0;
      position: absolute;
    }
  }

  &.first span {
    right: 120%;
    background: linear-gradient(
      to right,
      $townsfolk 0%,
      rgba(0, 0, 0, 0.5) 20%
    );
    &:before {
      content: var(--first-night-label, "First Night");
    }
    &:after {
      border-left-color: $townsfolk;
      margin-left: 3px;
      left: 100%;
    }
  }

  &.other span {
    left: 120%;
    background: linear-gradient(to right, $demon 0%, rgba(0, 0, 0, 0.5) 20%);
    &:before {
      content: var(--other-nights-label, "Other Nights");
    }
    &:after {
      right: 100%;
      margin-right: 3px;
      border-right-color: $demon;
    }
  }

  em {
    font-style: normal;
    position: absolute;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 3px solid black;
    filter: drop-shadow(0 0 6px rgba(0, 0, 0, 0.5));
    font-weight: bold;
    opacity: 1;
    pointer-events: all;
    transition: opacity 200ms;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 3;
  }

  &.first em {
    left: -7%;
    background: linear-gradient(180deg, rgba(0, 0, 0, 1) 0%, $townsfolk 100%);
  }

  &.other em {
    right: -7%;
    background: linear-gradient(180deg, rgba(0, 0, 0, 1) 0%, $demon 100%);
  }

  em:hover + span {
    opacity: 1;
  }

  // adjustment for fabled
  .fabled &.first {
    span {
      right: auto;
      left: 32px;
      &:after {
        left: auto;
        right: 100%;
        margin-left: 0;
        margin-right: 3px;
        border-left-color: transparent;
        border-right-color: $townsfolk;
      }
    }
  }
}

#townsquare:not(.spectator) .fabled ul li:hover .token:before {
  opacity: 1;
}
</style>
