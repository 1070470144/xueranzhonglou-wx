<template>
  <div
    id="app"
    @keyup="keyup"
    tabindex="-1"
    :class="{
      night: grimoire.isNight,
      static: grimoire.isStatic
    }"
    :style="{
      backgroundImage: grimoire.background
        ? `url('${grimoire.background}')`
        : ''
    }"
  >
    <video
      id="background"
      v-if="grimoire.background && grimoire.background.match(/\.(mp4|webm)$/i)"
      :src="grimoire.background"
      autoplay
      loop
    ></video>
    <div class="backdrop"></div>
    <transition name="blur">
      <Intro v-if="!players.length"></Intro>
      <TownInfo v-if="players.length && !session.nomination"></TownInfo>
      <Vote v-if="session.nomination"></Vote>
    </transition>
    <TownSquare></TownSquare>
    <Menu ref="menu"></Menu>
    <EditionModal />
    <FabledModal />
    <RolesModal />
    <ReferenceModal />
    <NightOrderModal />
    <VoteHistoryModal />
    <GameStateModal />
    <GameRecordModal />
    <AnnouncementModal />
    <LoginModal />
    <PlayerNameModal />
    <StoryLogModal />
    <PrivateChatModal />
    <RoomLobbyModal />
    <RoomControlDrawer />
    <Gradients />
    <span id="version">v{{ version }}</span>
  </div>
</template>

<script>
import { mapState } from "vuex";
import { version } from "../package.json";
import TownSquare from "./components/TownSquare";
import TownInfo from "./components/TownInfo";
import Menu from "./components/Menu";
import RolesModal from "./components/modals/RolesModal";
import EditionModal from "./components/modals/EditionModal";
import Intro from "./components/Intro";
import ReferenceModal from "./components/modals/ReferenceModal";
import Vote from "./components/Vote";
import Gradients from "./components/Gradients";
import NightOrderModal from "./components/modals/NightOrderModal";
import FabledModal from "@/components/modals/FabledModal";
import VoteHistoryModal from "@/components/modals/VoteHistoryModal";
import GameStateModal from "@/components/modals/GameStateModal";
import GameRecordModal from "@/components/modals/GameRecordModal";
import AnnouncementModal from "@/components/modals/AnnouncementModal";
import LoginModal from "@/components/modals/LoginModal";
import PlayerNameModal from "@/components/modals/PlayerNameModal";
import StoryLogModal from "@/components/modals/StoryLogModal";
import PrivateChatModal from "@/components/modals/PrivateChatModal";
import RoomLobbyModal from "@/components/modals/RoomLobbyModal";
import RoomControlDrawer from "@/components/RoomControlDrawer";

export default {
  components: {
    AnnouncementModal,
    RoomControlDrawer,
    RoomLobbyModal,
    PrivateChatModal,
    StoryLogModal,
    PlayerNameModal,
    LoginModal,
    GameStateModal,
    GameRecordModal,
    VoteHistoryModal,
    FabledModal,
    NightOrderModal,
    Vote,
    ReferenceModal,
    Intro,
    TownInfo,
    TownSquare,
    Menu,
    EditionModal,
    RolesModal,
    Gradients
  },
  computed: {
    ...mapState(["grimoire", "session", "modals"]),
    ...mapState("players", ["players"]),
    locale() {
      return this.$i18n.locale;
    }
  },
  watch: {
    locale: "updatePageTitle",
    "grimoire.isPublic": "updatePageTitle"
  },
  data() {
    return {
      version
    };
  },
  mounted() {
    this.updatePageTitle();
  },
  methods: {
    updatePageTitle() {
      document.title = this.$t(
        this.grimoire.isPublic ? "app.titlePublic" : "app.titleGrimoire"
      );
    },
    keyup({ key, ctrlKey, metaKey }) {
      if (ctrlKey || metaKey) return;
      const normalizedKey = key.toLocaleLowerCase();
      if (this.hasOpenModal()) {
        if (normalizedKey === "escape") this.$store.commit("toggleModal");
        return;
      }
      switch (normalizedKey) {
        case "g":
          this.$store.commit("toggleGrimoire");
          break;
        case "a":
          this.$refs.menu.addPlayer();
          break;
        case "h":
          this.$refs.menu.hostSession();
          break;
        case "j":
          this.$refs.menu.joinSession();
          break;
        case "r":
          this.$store.commit("toggleModal", "reference");
          break;
        case "n":
          this.$store.commit("toggleModal", "nightOrder");
          break;
        case "e":
          if (this.session.isSpectator) return;
          this.$store.commit("toggleModal", "edition");
          break;
        case "c":
          if (this.session.isSpectator) return;
          this.$store.commit("toggleModal", "roles");
          break;
        case "v":
          if (this.session.voteHistory.length || !this.session.isSpectator) {
            this.$store.commit("toggleModal", "voteHistory");
          }
          break;
        case "s":
          if (this.session.isSpectator) return;
          this.$refs.menu.toggleNight();
          break;
        case "escape":
          this.$store.commit("toggleModal");
      }
    },
    hasOpenModal() {
      return Object.keys(this.modals).some(name => this.modals[name]);
    }
  }
};
</script>

<style lang="scss">
@import "vars";

@font-face {
  font-family: "Papyrus";
  src: url("assets/fonts/papyrus.eot"); /* IE9*/
  src: url("assets/fonts/papyrus.eot?#iefix") format("embedded-opentype"),
    /* IE6-IE8 */ url("assets/fonts/papyrus.woff2") format("woff2"),
    /* chrome firefox */ url("assets/fonts/papyrus.woff") format("woff"),
    /* chrome firefox */ url("assets/fonts/papyrus.ttf") format("truetype"),
    /* chrome firefox opera Safari, Android, iOS 4.2+*/
      url("assets/fonts/papyrus.svg#PapyrusW01") format("svg"); /* iOS 4.1- */
}

@font-face {
  font-family: PiratesBay;
  src: url("assets/fonts/piratesbay.ttf");
  font-display: swap;
}

html,
body {
  font-size: 1.2em;
  line-height: 1.4;
  background: url("assets/background.jpg") center center;
  background-size: cover;
  color: white;
  height: 100%;
  font-family: "Roboto Condensed", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  padding: 0;
  margin: 0;
  overflow: hidden;
}

@import "media";

* {
  box-sizing: border-box;
  position: relative;
}

a {
  color: $townsfolk;
  &:hover {
    color: $demon;
  }
}

h1,
h2,
h3,
h4,
h5 {
  margin: 0;
  text-align: center;
  font-family: PiratesBay, sans-serif;
  letter-spacing: 1px;
  font-weight: normal;
}

ul {
  list-style-type: none;
  margin: 0;
  padding: 0;
}

#app {
  height: 100%;
  background-position: center center;
  background-size: cover;
  display: flex;
  align-items: center;
  align-content: center;
  justify-content: center;

  // disable all animations
  &.static *,
  &.static *:after,
  &.static *:before {
    transition: none !important;
    animation: none !important;
  }
}

#version {
  position: absolute;
  text-align: right;
  right: 10px;
  bottom: 10px;
  font-size: 60%;
  opacity: 0.5;
}

.blur-enter-active,
.blur-leave-active {
  transition: all 250ms;
  filter: blur(0);
}
.blur-enter,
.blur-leave-to {
  opacity: 0;
  filter: blur(20px);
}

// Buttons
.button-group {
  display: flex;
  align-items: center;
  justify-content: center;
  align-content: center;
  gap: 0.35em;
  .button {
    margin: 0;
  }
}
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.1em;
  padding: 0.18em 0.78em;
  border: 1px solid #8b6508;
  border-radius: 2px;
  box-shadow: inset 0 1px 0 rgba(255, 236, 190, 0.06), 0 2px 8px rgba(0, 0, 0, 0.55);
  background: #2a1c09;
  color: #fff8e7;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
  line-height: 1.2;
  margin: 5px auto;
  cursor: pointer;
  transition: all 200ms;
  white-space: nowrap;
  &:hover {
    color: #ffffff;
    border-color: #d4af37;
    background: #3a260b;
  }
  &.disabled {
    color: #7f705f;
    cursor: default;
    opacity: 0.58;
  }
  &.townsfolk {
    border-color: #5f789f;
    background: linear-gradient(#20375e, #172845 54%, #0b1525);
    box-shadow: inset 0 1px 0 rgba(210, 228, 255, 0.16), 0 2px 8px rgba(0, 0, 0, 0.55);
    &:hover:not(.disabled) {
      color: #ffffff;
      border-color: #94b4e4;
    }
  }
  &.demon {
    border-color: #d4af37;
    background: linear-gradient(#b8860b, #946b07 48%, #5c4204);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.2);
  }
}

/* video background */
video#background {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Night phase backdrop */
#app > .backdrop {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: 0;
  pointer-events: none;
  background: black;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 1) 0%,
    rgba(1, 22, 46, 1) 50%,
    rgba(0, 39, 70, 1) 100%
  );
  opacity: 0;
  transition: opacity 1s ease-in-out;
  &:after {
    content: " ";
    display: block;
    width: 100%;
    padding-right: 2000px;
    height: 100%;
    background: url("assets/clouds.png") repeat;
    background-size: 2000px auto;
    animation: move-background 120s linear infinite;
    opacity: 0.3;
  }
}

@keyframes move-background {
  from {
    transform: translate3d(-2000px, 0px, 0px);
  }
  to {
    transform: translate3d(0px, 0px, 0px);
  }
}

#app.night > .backdrop {
  opacity: 0.5;
}
</style>
