<template>
  <div
    v-if="session.sessionId"
    class="private-chat-shell"
    :class="{ open: modals.privateChat }"
  >
    <button
      type="button"
      class="chat-toggle"
      :class="{ active: modals.privateChat, unread: totalUnread }"
      @click="toggleModal('privateChat')"
    >
      <font-awesome-icon icon="comments" />
      <span>{{ $t("privateChat.title") }}</span>
      <b v-if="totalUnread">{{ totalUnread }}</b>
    </button>

    <aside class="private-chat-panel">
      <header class="chat-header">
        <div class="chat-title">
          <h3>{{ $t("privateChat.title") }}</h3>
          <small>{{ activeChannelName }}</small>
        </div>
        <button type="button" class="chat-close" @click="close">
          <font-awesome-icon icon="times-circle" />
        </button>
      </header>

      <template>
        <nav v-if="targets.length" class="chat-tabs">
          <button
            v-for="target in targets"
            :key="target.id"
            type="button"
            :class="{ active: target.id === activeTargetId }"
            @click="activeTargetId = target.id"
          >
            <span>{{ target.name }}</span>
            <i v-if="unreadFor(target.id)"></i>
          </button>
        </nav>

        <div v-if="!targets.length" class="empty-state">
          {{ $t("privateChat.noTargets") }}
        </div>
        <div class="chat-body">
          <section v-if="targets.length" ref="messages" class="messages">
            <div v-if="!messages.length" class="empty-state compact">
              <font-awesome-icon icon="feather-alt" />
              <strong>{{ emptyText }}</strong>
              <span>{{ $t("privateChat.emptyHint") }}</span>
            </div>
            <article
              v-for="message in messages"
              :key="message.id"
              class="message"
              :class="message.direction"
            >
              <div class="meta">
                <span>{{
                  message.direction === "out"
                    ? $t("privateChat.me")
                    : message.fromName
                }}</span>
                <time>{{ formatTime(message.createdAt) }}</time>
              </div>
              <p>{{ message.content }}</p>
            </article>
          </section>
        </div>

        <footer>
          <textarea
            v-model="content"
            :disabled="!activeTargetId"
            :placeholder="placeholderText"
            @keyup.ctrl.enter="send"
          ></textarea>
          <button type="button" :disabled="!canSend" @click="send">
            <font-awesome-icon icon="paper-plane" />
            {{ $t("privateChat.send") }}
          </button>
        </footer>
      </template>
    </aside>
  </div>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import { recordRuntimeLog } from "@/utils/runtimeLogger";
import { PUBLIC_CHAT_ID } from "@/store/modules/privateChat";

const nowId = () => `${Date.now()}-${Math.random().toString(36).substr(2)}`;

export default {
  data() {
    return {
      content: "",
    };
  },
  computed: {
    ...mapState(["modals", "session"]),
    ...mapState("players", ["players"]),
    ...mapState("privateChat", ["conversations"]),
    activeTargetId: {
      get() {
        return this.$store.state.privateChat.activeTargetId;
      },
      set(targetId) {
        this.setActiveTarget(targetId);
      },
    },
    totalUnread() {
      return this.$store.getters["privateChat/totalUnread"];
    },
    targets() {
      if (!this.session.sessionId) return [];
      const targets = [
        {
          id: PUBLIC_CHAT_ID,
          name: this.$t("privateChat.publicChannel"),
        },
      ];
      if (this.session.isSpectator) {
        targets.push({ id: "host", name: this.$t("privateChat.host") });
      }
      this.players.forEach((player, index) => {
        if (!player.id || player.id === this.session.playerId) return;
        targets.push({
          id: player.id,
          name:
            player.name ||
            this.$t("privateChat.playerName", { index: index + 1 }),
        });
      });
      return targets;
    },
    activeTarget() {
      return (
        this.targets.find((target) => target.id === this.activeTargetId) || null
      );
    },
    activeChannelName() {
      return this.activeTarget
        ? this.activeTarget.name
        : this.$t("privateChat.chooseTarget");
    },
    isPublicTarget() {
      return this.activeTargetId === PUBLIC_CHAT_ID;
    },
    emptyText() {
      return this.isPublicTarget
        ? this.$t("privateChat.publicEmpty")
        : this.$t("privateChat.empty");
    },
    placeholderText() {
      return this.isPublicTarget
        ? this.$t("privateChat.publicPlaceholder")
        : this.$t("privateChat.placeholder");
    },
    messages() {
      const conversation = this.conversations[this.activeTargetId];
      return conversation ? conversation.messages : [];
    },
    canSend() {
      return !!this.activeTargetId && !!this.content.trim();
    },
    ownId() {
      return this.session.isSpectator ? this.session.playerId : "host";
    },
    ownName() {
      if (!this.session.isSpectator) return this.$t("privateChat.host");
      const player = this.players.find(
        ({ id }) => id === this.session.playerId,
      );
      return player && player.name ? player.name : this.$t("privateChat.me");
    },
  },
  watch: {
    "modals.privateChat"(visible) {
      if (visible) {
        recordRuntimeLog("private_chat:open", {
          sessionId: this.session.sessionId,
          targetCount: this.targets.length,
          unread: this.totalUnread,
        });
        this.ensureTarget();
      }
    },
    targets() {
      this.ensureTarget();
    },
    messages() {
      this.$nextTick(this.scrollToBottom);
    },
  },
  methods: {
    ensureTarget() {
      if (!this.modals.privateChat) return;
      if (
        this.activeTargetId &&
        this.targets.some(({ id }) => id === this.activeTargetId)
      ) {
        this.setActiveTarget(this.activeTargetId);
        return;
      }
      this.setActiveTarget(this.targets.length ? this.targets[0].id : "");
    },
    send() {
      if (!this.canSend || !this.activeTarget) return;
      this.$store.commit("privateChat/sendMessage", {
        id: nowId(),
        fromId: this.ownId,
        fromName: this.ownName,
        toId: this.activeTarget.id,
        toName: this.activeTarget.name,
        content: this.content.trim(),
        createdAt: Date.now(),
      });
      recordRuntimeLog("private_chat:send", {
        toId: this.activeTarget.id,
        contentLength: this.content.trim().length,
      });
      this.content = "";
    },
    unreadFor(targetId) {
      const conversation = this.conversations[targetId];
      return conversation ? conversation.unread : 0;
    },
    formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    scrollToBottom() {
      const el = this.$refs.messages;
      if (el) el.scrollTop = el.scrollHeight;
    },
    close() {
      this.toggleModal("privateChat");
    },
    ...mapMutations(["toggleModal"]),
    ...mapMutations("privateChat", ["setActiveTarget"]),
  },
};
</script>

<style scoped lang="scss">
@import "../../vars.scss";

.private-chat-shell {
  position: fixed;
  left: 0;
  bottom: 0;
  z-index: 110;
  min-height: 44px;
  pointer-events: auto;
}

.chat-toggle {
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

  b {
    position: absolute;
    top: 3px;
    right: -7px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    color: #fff;
    background: $demon;
    border-radius: 9px;
    box-shadow: 0 0 6px rgba($demon, 0.85);
    font-size: 11px;
    font-weight: normal;
    line-height: 1;
  }

  &.active {
    color: #fff8e7;
    border-color: #d4af37;
    background: linear-gradient(
        180deg,
        rgba(142, 39, 33, 0.98),
        rgba(31, 16, 12, 0.98)
      ),
      #2a1c09;
  }
}

.private-chat-panel {
  position: fixed;
  left: 42px;
  top: 168px;
  bottom: 0;
  display: flex;
  flex-direction: column;
  width: 360px;
  max-width: calc(100vw - 62px);
  height: auto;
  min-height: 0;
  max-height: none;
  padding: 0;
  overflow: hidden;
  color: #dcc4a1;
  background: radial-gradient(
      circle at 50% 0,
      rgba(92, 26, 22, 0.2),
      transparent 34%
    ),
    linear-gradient(180deg, rgba(20, 14, 11, 0.76), rgba(8, 6, 5, 0.72));
  border: 1px solid rgba(139, 101, 8, 0.52);
  border-radius: 2px;
  box-shadow:
    0 18px 54px rgba(0, 0, 0, 0.58),
    inset 0 1px 0 rgba(255, 236, 190, 0.08);
  backdrop-filter: blur(5px);
  font-family: "STKaiti", "KaiTi", "STSong", "SimSun", serif;
  opacity: 0;
  pointer-events: none;
  transform: translateX(-8px);
  transform-origin: left bottom;
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}

.private-chat-shell.open .private-chat-panel {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 2.7em;
  margin-bottom: 0;
  padding: 0.36em 0.5em 0.34em 0.62em;
  border-bottom: 1px solid rgba(61, 46, 38, 0.82);
  background: linear-gradient(90deg, rgba(92, 26, 22, 0.28), transparent 66%),
    rgba(18, 14, 12, 0.74);

  .chat-title {
    min-width: 0;
  }

  h3 {
    margin: 0 0 0.08em;
    color: #fff8e7;
    font-size: 0.9em;
    letter-spacing: 0.04em;
    line-height: 1.12;
  }
}

.chat-title small {
  display: block;
  max-width: 18em;
  color: #b8a082;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.62em;
  letter-spacing: 0.04em;
  line-height: 1.2;
}

.chat-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.52em;
  height: 1.52em;
  margin: 0;
  padding: 0;
  color: #d9bf8c;
  background: rgba(5, 4, 4, 0.32);
  border: 1px solid rgba(124, 94, 70, 0.58);
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.82em;

  &:hover {
    color: #fff8e7;
    border-color: rgba(212, 175, 55, 0.72);
    background: rgba(92, 26, 22, 0.38);
  }
}

.chat-tabs {
  display: flex;
  gap: 0.26em;
  margin-bottom: 0;
  overflow-x: auto;
  padding: 0.28em 0.38em;
  border-bottom: 1px solid rgba(61, 46, 38, 0.72);
  background: rgba(10, 8, 7, 0.42);

  button {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 60px;
    max-width: 112px;
    height: 1.7em;
    padding: 0 0.58em;
    cursor: pointer;
    color: #b8a082;
    border: 1px solid rgba(124, 94, 70, 0.5);
    border-radius: 999px;
    background: rgba(5, 4, 4, 0.3);
    font-size: 0.68em;
    letter-spacing: 0.04em;

    &.active {
      color: #fff8e7;
      border-color: rgba(212, 175, 55, 0.72);
      background: linear-gradient(
        180deg,
        rgba(139, 38, 32, 0.82),
        rgba(58, 18, 14, 0.82)
      );
      box-shadow: inset 0 1px 0 rgba(255, 236, 190, 0.08);
    }

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    i {
      flex: 0 0 auto;
      width: 7px;
      height: 7px;
      background: $demon;
      border-radius: 50%;
      box-shadow: 0 0 6px rgba($demon, 0.85);
    }
  }
}

.chat-body {
  flex: 1 1 auto;
  min-height: 90px;
  display: flex;
  flex-direction: column;
  background: radial-gradient(
      circle at 50% 14%,
      rgba(212, 175, 55, 0.05),
      transparent 28%
    ),
    rgba(8, 7, 6, 0.34);
}

.messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.58em 0.54em 0.68em;
  background: transparent;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.28em;
  margin: 2.2em 0;
  color: rgba(247, 240, 223, 0.58);
  text-align: center;
  font-size: 86%;

  &.compact {
    margin-top: 1.8em;
  }

  svg {
    margin-bottom: 0.18em;
    color: rgba(212, 175, 55, 0.58);
    font-size: 1.45em;
  }

  strong {
    color: rgba(247, 240, 223, 0.72);
    font-weight: normal;
    letter-spacing: 0.08em;
  }

  span {
    color: rgba(184, 160, 130, 0.72);
    font-size: 0.82em;
  }
}

.message {
  width: 86%;
  margin-bottom: 0.38em;
  padding: 0.4em 0.48em;
  background: rgba(28, 22, 18, 0.62);
  border: 1px solid rgba(124, 94, 70, 0.48);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);

  &.out {
    margin-left: auto;
    background: rgba(92, 26, 22, 0.44);
    border-color: rgba(212, 175, 55, 0.5);
  }

  &.in {
    margin-right: auto;
  }

  p {
    margin: 4px 0 0;
    color: rgba(247, 240, 223, 0.9);
    font-size: 86%;
    line-height: 1.35;
    white-space: pre-wrap;
    word-break: break-word;
  }
}

.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  color: rgba(255, 255, 255, 0.62);
  font-size: 70%;
}

footer {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.36em;
  margin-top: 0;
  padding: 0.46em 0.5em 0.5em;
  border-top: 1px solid rgba(61, 46, 38, 0.78);
  background: linear-gradient(
      180deg,
      rgba(18, 15, 13, 0.86),
      rgba(10, 8, 7, 0.92)
    ),
    rgba(18, 15, 13, 0.86);

  textarea {
    height: 2.6em;
    min-height: 2.6em;
    max-height: 2.6em;
    padding: 0.52em 0.58em;
    resize: none;
    color: #f7f0df;
    background: rgba(5, 4, 4, 0.48);
    border: 1px solid rgba(124, 94, 70, 0.82);
    border-radius: 3px;
    box-shadow: inset 0 1px 6px rgba(0, 0, 0, 0.42);
    font-family: inherit;
    line-height: 1.32;

    &::placeholder {
      color: rgba(184, 160, 130, 0.72);
    }

    &:focus {
      outline: none;
      border-color: rgba(212, 175, 55, 0.78);
      box-shadow:
        0 0 0 1px rgba(212, 175, 55, 0.18),
        inset 0 1px 6px rgba(0, 0, 0, 0.42);
    }
  }

  button {
    min-width: 5.2em;
    height: 2.6em;
    min-height: 2.6em;
    align-self: stretch;
    cursor: pointer;
    border: 1px solid rgba(212, 175, 55, 0.76);
    border-radius: 2px;
    background: linear-gradient(#b8860b, #946b07 48%, #5c4204);
    color: #fff8e7;
    font-family: inherit;
    letter-spacing: 0.04em;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.3em;

    &:disabled {
      cursor: default;
      opacity: 0.45;
    }

    &:not(:disabled):hover {
      color: #fff8e7;
      border-color: #fff8e7;
    }
  }
}

@media (max-width: 520px) {
  .private-chat-shell {
    bottom: 0;
  }

  .chat-toggle {
    width: 40px;
    min-height: 76px;
    padding: 0.42em 0.18em;
    font-size: 11px;
  }

  .private-chat-panel {
    left: 40px;
    top: 128px;
    width: calc(100vw - 52px);
    height: auto;
    min-height: 0;
    max-height: none;
  }
}

@media (max-height: 520px) {
  .private-chat-panel {
    top: 0;
    height: auto;
    min-height: 0;
    max-height: none;
  }

  .chat-header {
    min-height: 44px;
    padding: 0.35em 0.7em;
  }

  .chat-tabs button {
    height: 28px;
  }

  footer {
    padding: 0.45em;

    textarea {
      min-height: 48px;
      max-height: 48px;
    }

    button {
      min-height: 48px;
      height: 48px;
    }
  }
}
</style>
