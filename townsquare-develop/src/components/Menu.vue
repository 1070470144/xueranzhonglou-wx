<template>
  <div id="controls">
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
              : $t('menu.nominationPlural')
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
        reconnecting: session.isReconnecting
      }"
      v-if="session.sessionId"
      @click="leaveSession"
      :title="
        $t('menu.sessionTitle', {
          count: session.playerCount,
          latency: session.ping
            ? $t('menu.latency', { ping: session.ping })
            : ''
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
          <font-awesome-icon
            icon="users"
            v-if="!session.isSpectator"
            @click="tab = 'players'"
          />
          <font-awesome-icon icon="theater-masks" @click="tab = 'characters'" />
          <font-awesome-icon icon="question" @click="tab = 'help'" />
        </li>

        <template v-if="tab === 'grimoire'">
          <!-- Grimoire -->
          <li class="headline">{{ $t("menu.grimoire") }}</li>
          <li @click="toggleGrimoire" v-if="players.length">
            <template v-if="!grimoire.isPublic">{{ $t("menu.hide") }}</template>
            <template v-if="grimoire.isPublic">{{ $t("menu.show") }}</template>
            <em>[G]</em>
          </li>
          <li @click="toggleNight" v-if="!session.isSpectator">
            <template v-if="!grimoire.isNight">{{ $t("menu.switchToNight") }}</template>
            <template v-if="grimoire.isNight">{{ $t("menu.switchToDay") }}</template>
            <em>[S]</em>
          </li>
          <li @click="toggleModal('storyLog')" v-if="!session.isSpectator">
            {{ $t("menu.storyLog") }}
            <em><font-awesome-icon icon="clipboard" /></em>
          </li>
          <li @click="toggleModal('gameRecord')" v-if="!session.isSpectator && players.length">
            保存战绩
            <em><font-awesome-icon icon="trophy" /></em>
          </li>
          <li @click="toggleNightOrder" v-if="players.length">
            {{ $t("menu.nightOrder") }}
            <em>
              <font-awesome-icon
                :icon="[
                  'fas',
                  grimoire.isNightOrder ? 'check-square' : 'square'
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
            <em><font-awesome-icon icon="image"/></em>
          </li>
          <li v-if="!edition.isOfficial" @click="imageOptIn">
            <small>{{ $t("menu.showCustomImages") }}</small>
            <em
              ><font-awesome-icon
                :icon="[
                  'fas',
                  grimoire.isImageOptIn ? 'check-square' : 'square'
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
            <li @click="hostSession">{{ $t("menu.host") }}<em>[H]</em></li>
            <li @click="joinSession">{{ $t("menu.join") }}<em>[J]</em></li>
          </template>
          <template v-else>
            <li v-if="session.ping">
              {{
                $t("menu.delayTo", {
                  target: session.isSpectator
                    ? $t("menu.hostTarget")
                    : $t("menu.playersTarget")
                })
              }}
              <em>{{ session.ping }}ms</em>
            </li>
            <li @click="copySessionUrl">
              {{ $t("menu.copyPlayerLink") }}
              <em><font-awesome-icon icon="copy"/></em>
            </li>
            <li v-if="!session.isSpectator" @click="distributeRoles">
              {{ $t("menu.sendCharacters") }}
              <em><font-awesome-icon icon="theater-masks"/></em>
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

        <template v-if="tab === 'players' && !session.isSpectator">
          <!-- Users -->
          <li class="headline">{{ $t("menu.players") }}</li>
          <li @click="addPlayer" v-if="players.length < 20">{{ $t("menu.add") }}<em>[A]</em></li>
          <li @click="randomizeSeatings" v-if="players.length > 2">
            {{ $t("menu.randomize") }}
            <em><font-awesome-icon icon="dice"/></em>
          </li>
          <li @click="clearPlayers" v-if="players.length">
            {{ $t("menu.removeAll") }}
            <em><font-awesome-icon icon="trash-alt"/></em>
          </li>
        </template>

        <template v-if="tab === 'characters'">
          <!-- Characters -->
          <li class="headline">{{ $t("menu.characters") }}</li>
          <li v-if="!session.isSpectator" @click="toggleModal('edition')">
            {{ $t("menu.selectScript") }}
            <em>[E]</em>
          </li>
          <li
            @click="toggleModal('roles')"
            v-if="!session.isSpectator && players.length > 4"
          >
            {{ $t("menu.chooseAssign") }}
            <em>[C]</em>
          </li>
          <li v-if="!session.isSpectator" @click="toggleModal('fabled')">
            {{ $t("menu.addFabled") }}
            <em><font-awesome-icon icon="dragon"/></em>
          </li>
          <li @click="clearRoles" v-if="players.length">
            {{ $t("menu.removeAll") }}
            <em><font-awesome-icon icon="trash-alt"/></em>
          </li>
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
            <em><font-awesome-icon icon="file-code"/></em>
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
  computed: {
    ...mapState(["grimoire", "session", "edition"]),
    ...mapState("players", ["players"])
  },
  data() {
    return {
      tab: "grimoire",
      authUser: null,
      announcementLatestKey: "",
      hasUnreadAnnouncement: false
    };
  },
  mounted() {
    this.refreshAuthSession();
    this.checkAnnouncementUnread();
    window.addEventListener("townsquare-auth-change", this.refreshAuthSession);
  },
  beforeDestroy() {
    window.removeEventListener("townsquare-auth-change", this.refreshAuthSession);
  },
  methods: {
    refreshAuthSession() {
      this.authUser = getAuthSession().user;
    },
    async checkAnnouncementUnread() {
      try {
        const res = await getPublicWebAnnouncements({ pageSize: 1 });
        const item = res && res.success && res.data && res.data.list && res.data.list[0];
        if (!item) return;
        this.announcementLatestKey = `${item._id}:${item.updateTime || item.publishTime || ""}`;
        this.hasUnreadAnnouncement = localStorage.getItem(ANNOUNCEMENT_READ_KEY) !== this.announcementLatestKey;
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
        Math.round(Math.random() * 10000)
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
    distributeRoles() {
      if (this.session.isSpectator) return;
      const popup = this.$t("menu.confirmDistribute");
      if (confirm(popup)) {
        this.$store.commit("session/distributeRoles", true);
        setTimeout(
          (() => {
            this.$store.commit("session/distributeRoles", false);
          }).bind(this),
          2000
        );
      }
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
          startIndex: this.players.length
        });
      } else {
        this.$store.commit("players/add", trimmed);
      }
    },
    randomizeSeatings() {
      if (this.session.isSpectator) return;
      if (confirm(this.$t("menu.confirmRandomize"))) {
        this.$store.dispatch("players/randomize");
      }
    },
    clearPlayers() {
      if (this.session.isSpectator) return;
      if (confirm(this.$t("menu.confirmClearPlayers"))) {
        // abort vote if in progress
        if (this.session.nomination) {
          this.$store.commit("session/nomination");
        }
        this.$store.commit("players/clear");
      }
    },
    clearRoles() {
      if (confirm(this.$t("menu.confirmClearRoles"))) {
        this.$store.dispatch("players/clearRoles");
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
      "toggleModal"
    ])
  }
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
    filter: drop-shadow(0 0 5px rgba(0, 0, 0, 1));
    &.success {
      animation: greenToWhite 1s normal forwards;
      animation-iteration-count: 1;
    }
  }

  > span {
    display: inline-block;
    cursor: pointer;
    z-index: 5;
    margin-top: 7px;
    margin-left: 10px;
  }

  span.nomlog-summary {
    color: $townsfolk;
  }

  span.session {
    color: $demon;
    &.spectator {
      color: $townsfolk;
    }
    &.reconnecting {
      animation: blink 1s infinite;
    }
  }

  span.announcement-summary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: white;
    min-width: 54px;
    text-align: center;
    white-space: nowrap;
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
    color: white;
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

  &.open {
    transform: rotate(0deg);
  }

  > svg {
    cursor: pointer;
    background: rgba(0, 0, 0, 0.5);
    border: 3px solid black;
    width: 40px;
    height: 50px;
    margin-bottom: -8px;
    border-bottom: 0;
    border-radius: 10px 10px 0 0;
    padding: 5px 5px 15px;
  }

  a {
    color: white;
    text-decoration: none;
    &:hover {
      color: red;
    }
  }

  ul {
    display: flex;
    list-style-type: none;
    padding: 0;
    margin: 0;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 0 10px black;
    border: 3px solid black;
    border-radius: 10px 0 10px 10px;

    li {
      padding: 2px 5px;
      color: white;
      text-align: left;
      background: rgba(0, 0, 0, 0.7);
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
          border-bottom: 3px solid black;
          border-right: 3px solid black;
          padding: 5px 0;
          cursor: pointer;
          transition: color 250ms;
          &:hover {
            color: red;
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
          background: linear-gradient(
            to bottom,
            $townsfolk 0%,
            rgba(0, 0, 0, 0.5) 100%
          );
        }
      }

      &:not(.headline):not(.tabs):hover {
        cursor: pointer;
        color: red;
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
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.35);
          cursor: pointer;
          margin-left: 4px;
          padding: 1px 4px;

          &:hover,
          &.active {
            color: red;
            border-color: red;
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
        $townsfolk 0%,
        rgba(0, 0, 0, 0.5) 20%,
        rgba(0, 0, 0, 0.5) 80%,
        $demon 100%
      );
    }
  }
}
</style>
