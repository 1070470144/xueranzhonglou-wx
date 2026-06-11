<template>
  <div id="controls">
    <span v-if="voiceHintText" class="voice-hint" :title="voiceHintText">
      {{ voiceHintText }}
    </span>
    <span
      class="nomlog-summary"
      v-show="session.voteHistory.length && session.sessionId"
      @click="toggleModal('voteHistory')"
      :title="
        $t('menu.recentNominations', {
          count: session.voteHistory.length,
          label:
            session.voteHistory.length == 1
              ? $t('menu.nominationSingular')
              : $t('menu.nominationPlural'),
        })
      "
    >
      <font-awesome-icon icon="book-dead" />
      {{ session.voteHistory.length }}
    </span>
    <span
      class="session"
      :class="{
        spectator: session.isSpectator,
        reconnecting: session.isReconnecting,
      }"
      v-if="session.sessionId"
      @click="leaveSession"
      :title="
        $t('menu.sessionTitle', {
          count: session.playerCount,
          latency: session.ping
            ? $t('menu.latency', { ping: session.ping })
            : '',
        })
      "
    >
      <font-awesome-icon icon="broadcast-tower" />
      {{ session.playerCount }}
    </span>
    <span
      class="announcement-summary"
      :class="{ unread: hasUnreadAnnouncement }"
      @click="openAnnouncements"
      :title="$t('announcements.title')"
    >
      <font-awesome-icon icon="bell" />
      <span>{{ $t("announcements.title") }}</span>
      <i v-if="hasUnreadAnnouncement" class="announcement-dot"></i>
    </span>
    <span
      v-if="authUser"
      class="auth-summary"
      :title="authUser.nickname || $t('login.loggedIn')"
    >
      <font-awesome-icon icon="user" />
      {{ authUser.nickname || $t("login.loggedIn") }}
    </span>
    <div class="menu" :class="{ open: grimoire.isMenuOpen }">
      <font-awesome-icon icon="cog" @click="toggleMenu" />
      <ul>
        <li class="tabs" :class="tab">
          <font-awesome-icon icon="book-open" @click="tab = 'grimoire'" />
          <font-awesome-icon icon="broadcast-tower" @click="tab = 'session'" />
          <font-awesome-icon icon="question" @click="tab = 'help'" />
        </li>

        <template v-if="tab === 'grimoire'">
          <!-- Grimoire -->
          <li class="headline">{{ $t("menu.grimoire") }}</li>
          <li @click="toggleGrimoire" v-if="players.length">
            <template v-if="!grimoire.isPublic">{{
              $t("menu.charactersVisible")
            }}</template>
            <template v-if="grimoire.isPublic">{{
              $t("menu.charactersHidden")
            }}</template>
            <em>[G]</em>
          </li>
          <li @click="toggleNight" v-if="!session.isSpectator">
            <template v-if="!grimoire.isNight">{{
              $t("menu.switchToNight")
            }}</template>
            <template v-if="grimoire.isNight">{{
              $t("menu.switchToDay")
            }}</template>
            <em>[S]</em>
          </li>
          <li @click="toggleModal('storyLog')" v-if="!session.isSpectator">
            {{ $t("menu.storyLog") }}
            <em><font-awesome-icon icon="clipboard" /></em>
          </li>
          <li
            @click="toggleModal('gameRecord')"
            v-if="!session.isSpectator && players.length"
          >
            保存战绩
            <em><font-awesome-icon icon="trophy" /></em>
          </li>
          <li @click="toggleNightOrder" v-if="players.length">
            {{ $t("menu.nightOrder") }}
            <em>
              <font-awesome-icon
                :icon="[
                  'fas',
                  grimoire.isNightOrder ? 'check-square' : 'square',
                ]"
              />
            </em>
          </li>
          <li v-if="players.length">
            {{ $t("menu.zoom") }}
            <em>
              <font-awesome-icon
                @click="setZoom(grimoire.zoom - 1)"
                icon="search-minus"
              />
              {{ Math.round(100 + grimoire.zoom * 10) }}%
              <font-awesome-icon
                @click="setZoom(grimoire.zoom + 1)"
                icon="search-plus"
              />
            </em>
          </li>
          <li @click="setBackground">
            {{ $t("menu.backgroundImage") }}
            <em><font-awesome-icon icon="image" /></em>
          </li>
          <li v-if="!edition.isOfficial" @click="imageOptIn">
            <small>{{ $t("menu.showCustomImages") }}</small>
            <em
              ><font-awesome-icon
                :icon="[
                  'fas',
                  grimoire.isImageOptIn ? 'check-square' : 'square',
                ]"
            /></em>
          </li>
          <li @click="toggleStatic">
            {{ $t("menu.disableAnimations") }}
            <em
              ><font-awesome-icon
                :icon="['fas', grimoire.isStatic ? 'check-square' : 'square']"
            /></em>
          </li>
          <li @click="toggleModal('playerName')" v-if="session.isSpectator">
            {{ $t("menu.changePlayerName") }}
            <em><font-awesome-icon icon="user-edit" /></em>
          </li>
          <li @click="toggleMuted">
            {{ $t("menu.muteSounds") }}
            <em
              ><font-awesome-icon
                :icon="['fas', grimoire.isMuted ? 'volume-mute' : 'volume-up']"
            /></em>
          </li>
          <li class="language">
            {{ $t("common.language") }}
            <em>
              <button
                v-for="locale in $locales"
                :key="locale.code"
                type="button"
                :class="{ active: $i18n.locale === locale.code }"
                @click.stop="$setLocale(locale.code)"
              >
                {{ locale.label }}
              </button>
            </em>
          </li>
          <li v-if="authUser" @click="logoutWeb">
            {{ authUser.nickname || $t("login.loggedIn") }}
            <em><font-awesome-icon icon="times" /></em>
          </li>
          <li v-else @click="toggleModal('login')">
            {{ $t("menu.webLogin") }}
            <em><font-awesome-icon icon="user" /></em>
          </li>
        </template>

        <template v-if="tab === 'session'">
          <!-- Session -->
          <li class="headline" v-if="session.sessionId">
            {{ session.isSpectator ? $t("menu.playing") : $t("menu.hosting") }}
          </li>
          <li class="headline" v-else>
            {{ $t("menu.liveSession") }}
          </li>
          <template v-if="!session.sessionId">
            <li @click="toggleModal('roomLobby')">
              {{ $t("room.openLobby")
              }}<em><font-awesome-icon icon="users" /></em>
            </li>
          </template>
          <template v-else>
            <li @click="toggleModal('roomControl')">
              {{ $t("room.manage") }}
              <em>{{
                room.current ? room.current.name : session.sessionId
              }}</em>
            </li>
            <li v-if="session.ping">
              {{
                $t("menu.delayTo", {
                  target: session.isSpectator
                    ? $t("menu.hostTarget")
                    : $t("menu.playersTarget"),
                })
              }}
              <em>{{ session.ping }}ms</em>
            </li>
            <li
              v-if="session.voteHistory.length || !session.isSpectator"
              @click="toggleModal('voteHistory')"
            >
              {{ $t("menu.voteHistory") }}<em>[V]</em>
            </li>
            <li @click="leaveSession">
              {{ $t("menu.leaveSession") }}
              <em>{{ session.sessionId }}</em>
            </li>
          </template>
        </template>

        <template v-if="tab === 'help'">
          <!-- Help -->
          <li class="headline">{{ $t("menu.help") }}</li>
          <li @click="toggleModal('reference')">
            {{ $t("menu.referenceSheet") }}
            <em>[R]</em>
          </li>
          <li @click="toggleModal('nightOrder')">
            {{ $t("menu.nightOrderSheet") }}
            <em>[N]</em>
          </li>
          <li @click="toggleModal('gameState')">
            {{ $t("menu.gameStateJson") }}
            <em><font-awesome-icon icon="file-code" /></em>
          </li>
          <li>
            <a href="https://discord.gg/Gd7ybwWbFk" target="_blank">
              {{ $t("menu.joinDiscord") }}
            </a>
            <em>
              <a href="https://discord.gg/Gd7ybwWbFk" target="_blank">
                <font-awesome-icon :icon="['fab', 'discord']" />
              </a>
            </em>
          </li>
          <li>
            <a href="https://github.com/bra1n/townsquare" target="_blank">
              {{ $t("menu.sourceCode") }}
            </a>
            <em>
              <a href="https://github.com/bra1n/townsquare" target="_blank">
                <font-awesome-icon :icon="['fab', 'github']" />
              </a>
            </em>
          </li>
        </template>
      </ul>
    </div>
  </div>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import { clearAuthSession, getAuthSession } from "@/services/auth";
import { getPublicWebAnnouncements } from "@/services/announcements";

const ANNOUNCEMENT_READ_KEY = "townsquare.webAnnouncement.readKey";

export default {
  props: {
    voiceHintText: {
      type: String,
      default: "",
    },
  },
  computed: {
    ...mapState(["grimoire", "session", "edition", "room"]),
    ...mapState("players", ["players"]),
    isRoomSession() {
      return !!this.room.current;
    },
  },
  data() {
    return {
      tab: "grimoire",
      authUser: null,
      announcementLatestKey: "",
      hasUnreadAnnouncement: false,
    };
  },
  mounted() {
    this.refreshAuthSession();
    this.checkAnnouncementUnread();
    window.addEventListener("townsquare-auth-change", this.refreshAuthSession);
  },
  beforeDestroy() {
    window.removeEventListener(
      "townsquare-auth-change",
      this.refreshAuthSession,
    );
  },
  methods: {
    refreshAuthSession() {
      this.authUser = getAuthSession().user;
    },
    async checkAnnouncementUnread() {
      try {
        const res = await getPublicWebAnnouncements({ pageSize: 1 });
        const item =
          res && res.success && res.data && res.data.list && res.data.list[0];
        if (!item) return;
        this.announcementLatestKey = `${item._id}:${
          item.updateTime || item.publishTime || ""
        }`;
        this.hasUnreadAnnouncement =
          localStorage.getItem(ANNOUNCEMENT_READ_KEY) !==
          this.announcementLatestKey;
      } catch (error) {
        this.hasUnreadAnnouncement = false;
      }
    },
    openAnnouncements() {
      if (this.announcementLatestKey) {
        localStorage.setItem(ANNOUNCEMENT_READ_KEY, this.announcementLatestKey);
        this.hasUnreadAnnouncement = false;
      }
      this.toggleModal("announcement");
    },
    logoutWeb() {
      if (!confirm(this.$t("login.confirmLogout"))) return;
      clearAuthSession();
      window.dispatchEvent(new Event("townsquare-auth-change"));
      this.refreshAuthSession();
    },
    setBackground() {
      const background = prompt(this.$t("menu.promptBackground"));
      if (background || background === "") {
        this.$store.commit("setBackground", background);
      }
    },
    hostSession() {
      if (this.session.sessionId) return;
      const sessionId = prompt(
        this.$t("menu.promptHost"),
        Math.round(Math.random() * 10000),
      );
      if (sessionId) {
        this.$store.commit("session/clearVoteHistory");
        this.$store.commit("session/setSpectator", false);
        this.$store.commit("session/setGameStartedAt", Date.now());
        this.$store.commit("session/setSessionId", sessionId);
        this.copySessionUrl();
      }
    },
    copySessionUrl() {
      const url = window.location.href.split("#")[0];
      const link = url + "#" + this.session.sessionId;
      navigator.clipboard.writeText(link);
    },
    imageOptIn() {
      const popup = this.$t("menu.confirmCustomImages");
      if (this.grimoire.isImageOptIn || confirm(popup)) {
        this.toggleImageOptIn();
      }
    },
    joinSession() {
      if (this.session.sessionId) return this.leaveSession();
      let sessionId = prompt(this.$t("menu.promptJoin"));
      if (!sessionId) return;
      if (sessionId.match(/^https?:\/\//i)) {
        sessionId = sessionId.split("#").pop();
      }
      if (sessionId) {
        const playerName = prompt(this.$t("menu.promptJoinPlayerName"));
        if (playerName === null) return;
        this.$store.commit("session/clearVoteHistory");
        this.$store.commit("session/setSpectator", true);
        this.$store.commit("session/setPlayerName", playerName.trim());
        this.$store.commit("session/setGameStartedAt", Date.now());
        this.$store.commit("toggleGrimoire", false);
        this.$store.commit("session/setSessionId", sessionId);
      }
    },
    leaveSession() {
      if (confirm(this.$t("menu.confirmLeave"))) {
        this.$store.commit("session/setSpectator", false);
        this.$store.commit("session/setSessionId", "");
        this.$store.commit("session/setGameStartedAt", Date.now());
      }
    },
    addPlayer() {
      if (this.session.isSpectator) return;
      if (this.players.length >= 20) return;
      const input = prompt(this.$t("menu.promptPlayerCount"), "1");
      if (!input) return;
      const trimmed = input.trim();
      const count = Number(trimmed);
      if (Number.isInteger(count) && count > 0) {
        this.$store.commit("players/addMany", {
          count,
          startIndex: this.players.length,
        });
      } else {
        this.$store.commit("players/add", trimmed);
      }
    },
    toggleNight() {
      this.$store.commit("toggleNight");
      if (this.grimoire.isNight) {
        this.$store.commit("session/setMarkedPlayer", -1);
      }
    },
    ...mapMutations([
      "toggleGrimoire",
      "toggleMenu",
      "toggleImageOptIn",
      "toggleMuted",
      "toggleNightOrder",
      "toggleStatic",
      "setZoom",
      "toggleModal",
    ]),
  },
};
</script>

<style scoped lang="scss">
@import "../vars.scss";

// success animation
@keyframes greenToWhite {
  from {
    color: green;
  }
  to {
    color: white;
  }
}

// Controls
#controls {
  position: absolute;
  right: 3px;
  top: 3px;
  text-align: right;
  padding-right: 50px;
  z-index: 75;

  svg {
    filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.9));
    &.success {
      animation: greenToWhite 1s normal forwards;
      animation-iteration-count: 1;
    }
  }

  > span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.2em;
    box-sizing: border-box;
    cursor: pointer;
    z-index: 5;
    height: 26px;
    min-height: 0;
    line-height: 1;
    vertical-align: top;
    margin-top: 4px;
    margin-left: 5px;
    padding: 0 8px;
    font-size: 16px;
    color: #dcc4a1;
    border: 1px solid #3d2e26;
    border-radius: 2px;
    background: rgba(12, 9, 8, 0.78);
    box-shadow:
      0 6px 18px rgba(0, 0, 0, 0.55),
      inset 0 1px 0 rgba(255, 236, 190, 0.05);
  }

  span.nomlog-summary {
    color: #d4af37;
  }

  span.session {
    color: #dcc4a1;
    &.spectator {
      color: #d4af37;
    }
    &.reconnecting {
      animation: blink 1s infinite;
    }
  }

  span.announcement-summary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    color: #dcc4a1;
    min-width: 3.8em;
    text-align: center;
    white-space: nowrap;
  }

  span.voice-hint {
    max-width: 9.5em;
    cursor: default;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    pointer-events: none;
  }

  .announcement-dot {
    position: absolute;
    top: -2px;
    right: -4px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: $demon;
    box-shadow: 0 0 6px rgba(255, 0, 0, 0.8);
  }

  span.auth-summary {
    max-width: 140px;
    color: #dcc4a1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: top;
  }
}

@keyframes blink {
  50% {
    opacity: 0.5;
    color: gray;
  }
}

.menu {
  width: 220px;
  transform-origin: 200px 22px;
  transition: transform 500ms cubic-bezier(0.68, -0.55, 0.27, 1.55);
  transform: rotate(-90deg);
  position: absolute;
  right: 0;
  top: 0;
  z-index: 10;

  &.open {
    transform: rotate(0deg);
  }

  > svg {
    cursor: pointer;
    color: #dcc4a1;
    background: rgba(12, 9, 8, 0.82);
    border: 2px solid #3d2e26;
    width: 40px;
    height: 50px;
    margin-bottom: -8px;
    border-bottom: 0;
    border-radius: 2px 2px 0 0;
    padding: 5px 5px 15px;
    box-shadow:
      0 8px 22px rgba(0, 0, 0, 0.62),
      inset 0 1px 0 rgba(255, 236, 190, 0.05);

    &:hover {
      color: #fff8e7;
    }
  }

  a {
    color: #f7f0df;
    text-decoration: none;
    &:hover {
      color: #fff8e7;
    }
  }

  ul {
    display: flex;
    list-style-type: none;
    padding: 0;
    margin: 0;
    flex-direction: column;
    overflow: hidden;
    box-shadow:
      0 18px 54px rgba(0, 0, 0, 0.62),
      inset 0 1px 0 rgba(255, 236, 190, 0.05);
    border: 2px solid #3d2e26;
    border-radius: 2px 0 2px 2px;
    background: rgba(12, 9, 8, 0.76);
    backdrop-filter: blur(4px);
    font-family: "STKaiti", "KaiTi", "STSong", "SimSun", serif;

    li {
      padding: 2px 5px;
      color: #dcc4a1;
      text-align: left;
      background: rgba(18, 15, 13, 0.72);
      border-bottom: 1px solid rgba(61, 46, 38, 0.78);
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 30px;

      &.tabs {
        display: flex;
        padding: 0;
        svg {
          flex-grow: 1;
          flex-shrink: 0;
          height: 35px;
          color: #b8a082;
          border-bottom: 1px solid #3d2e26;
          border-right: 1px solid #3d2e26;
          padding: 5px 0;
          cursor: pointer;
          transition: color 250ms;
          &:hover {
            color: #fff8e7;
          }
          &:last-child {
            border-right: 0;
          }
        }
        &.grimoire .fa-book-open,
        &.players .fa-users,
        &.characters .fa-theater-masks,
        &.session .fa-broadcast-tower,
        &.help .fa-question {
          color: #fff8e7;
          background: linear-gradient(#8a2721, #581612 54%, #2d0c09);
        }
      }

      &:not(.headline):not(.tabs):hover {
        cursor: pointer;
        color: #fff8e7;
        background: rgba(32, 27, 25, 0.95);
      }

      em {
        flex-grow: 0;
        font-style: normal;
        margin-left: 10px;
        font-size: 80%;
      }

      &.language {
        button {
          color: white;
          background: rgba(5, 4, 4, 0.46);
          border: 1px solid rgba(124, 94, 70, 0.88);
          cursor: pointer;
          margin-left: 4px;
          padding: 1px 4px;

          &:hover,
          &.active {
            color: #fff8e7;
            border-color: #d4af37;
          }
        }
      }
    }

    .headline {
      font-family: PiratesBay, sans-serif;
      letter-spacing: 1px;
      padding: 0 10px;
      text-align: center;
      justify-content: center;
      background: linear-gradient(
        to right,
        rgba(212, 175, 55, 0.55) 0%,
        rgba(18, 14, 12, 0.92) 20%,
        rgba(18, 14, 12, 0.92) 80%,
        rgba(92, 26, 22, 0.72) 100%
      );
    }
  }
}

@media (max-width: 600px) {
  #controls {
    position: fixed;
    top: 5px;
    right: 5px;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    gap: 0.22em;
    max-width: calc(100vw - 10px);
    padding-right: 0;
    white-space: nowrap;
  }

  #controls > span {
    flex: 0 1 auto;
    max-width: 7em;
    margin-top: 4px;
    margin-left: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  #controls span.announcement-summary {
    min-width: 1.9em;
    max-width: 1.9em;
    padding: 0;
  }

  #controls span.voice-hint {
    max-width: 6em;
    min-width: 0;
    padding: 0 0.32em;
  }

  #controls span.announcement-summary > span {
    display: none;
  }

  .menu {
    position: relative;
    top: 0;
    right: 0;
    flex: 0 0 50px;
    width: 50px;
    transform: none;
    transform-origin: calc(100% - 20px) 22px;

    &.open {
      width: 50px;
    }

    &:not(.open) ul {
      display: none;
    }

    ul {
      position: absolute;
      top: 50px;
      right: 0;
      width: min(220px, calc(100vw - 10px));
      max-height: calc(100vh - 55px);
      overflow-y: auto;
    }
  }
}
</style>
