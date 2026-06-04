<template>
  <div v-if="session.sessionId" class="private-chat-shell">
    <button
      type="button"
      class="chat-toggle"
      :class="{ active: modals.privateChat, unread: totalUnread }"
      @click="toggleModal('privateChat')"
    >
      <font-awesome-icon icon="comments" />
      <span v-if="totalUnread">{{ totalUnread }}</span>
    </button>

    <aside v-if="modals.privateChat" class="private-chat-panel">
      <header>
        <h3>{{ $t("privateChat.title") }}</h3>
        <button type="button" @click="close">
          <font-awesome-icon icon="times" />
        </button>
      </header>

      <div v-if="!session.sessionId" class="empty-state">
        {{ $t("privateChat.noRoom") }}
      </div>
      <template v-else>
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
        <section v-else ref="messages" class="messages">
          <div v-if="!messages.length" class="empty-state compact">
            {{ $t("privateChat.empty") }}
          </div>
          <article
            v-for="message in messages"
            :key="message.id"
            class="message"
            :class="message.direction"
          >
            <div class="meta">
              <span>{{ message.direction === "out" ? $t("privateChat.me") : message.fromName }}</span>
              <time>{{ formatTime(message.createdAt) }}</time>
            </div>
            <p>{{ message.content }}</p>
          </article>
        </section>

        <footer>
          <textarea
            v-model="content"
            :disabled="!activeTargetId"
            :placeholder="$t('privateChat.placeholder')"
            @keyup.ctrl.enter="send"
          ></textarea>
          <button type="button" :disabled="!canSend" @click="send">
            <font-awesome-icon icon="paper-plane" /> {{ $t("privateChat.send") }}
          </button>
        </footer>
      </template>
    </aside>
  </div>
</template>

<script>
import { mapMutations, mapState } from "vuex";

const nowId = () => `${Date.now()}-${Math.random().toString(36).substr(2)}`;

export default {
  data() {
    return {
      content: ""
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
      }
    },
    totalUnread() {
      return this.$store.getters["privateChat/totalUnread"];
    },
    targets() {
      if (!this.session.sessionId) return [];
      const targets = [];
      if (this.session.isSpectator) {
        targets.push({ id: "host", name: this.$t("privateChat.host") });
      }
      this.players.forEach((player, index) => {
        if (!player.id || player.id === this.session.playerId) return;
        targets.push({
          id: player.id,
          name: player.name || this.$t("privateChat.playerName", { index: index + 1 })
        });
      });
      return targets;
    },
    activeTarget() {
      return this.targets.find(target => target.id === this.activeTargetId) || null;
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
      const player = this.players.find(({ id }) => id === this.session.playerId);
      return player && player.name ? player.name : this.$t("privateChat.me");
    }
  },
  watch: {
    "modals.privateChat"(visible) {
      if (visible) this.ensureTarget();
    },
    targets() {
      this.ensureTarget();
    },
    messages() {
      this.$nextTick(this.scrollToBottom);
    }
  },
  methods: {
    ensureTarget() {
      if (!this.modals.privateChat) return;
      if (this.activeTargetId && this.targets.some(({ id }) => id === this.activeTargetId)) {
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
        createdAt: Date.now()
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
        minute: "2-digit"
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
    ...mapMutations("privateChat", ["setActiveTarget"])
  }
};
</script>

<style scoped lang="scss">
@import "../../vars.scss";

.private-chat-shell {
  position: fixed;
  right: 14px;
  bottom: 14px;
  z-index: 110;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.chat-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 48px;
  height: 42px;
  padding: 0 12px;
  color: white;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.78);
  border: 2px solid rgba(255, 255, 255, 0.28);
  border-radius: 21px;
  box-shadow: 0 0 14px #000;

  &.active {
    background: rgba($townsfolk, 0.55);
    border-color: $townsfolk;
  }

  &.unread:after {
    content: "";
    position: absolute;
    top: 3px;
    right: 4px;
    width: 8px;
    height: 8px;
    background: $demon;
    border-radius: 50%;
    box-shadow: 0 0 6px rgba($demon, 0.85);
  }

  span {
    min-width: 14px;
    font-size: 72%;
    line-height: 1;
  }
}

.private-chat-panel {
  display: flex;
  flex-direction: column;
  width: 420px;
  max-width: 92vw;
  height: 540px;
  max-height: 78vh;
  padding: 12px;
  color: white;
  background: rgba(0, 0, 0, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  box-shadow: 0 0 20px #000;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;

  button {
    color: white;
    background: transparent;
    border: 0;
    cursor: pointer;
    font-size: 110%;
  }
}

textarea,
button {
  color: white;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.chat-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  overflow-x: auto;
  padding-bottom: 4px;

  button {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 70px;
    max-width: 130px;
    height: 30px;
    padding: 0 9px;
    cursor: pointer;
    border-color: rgba(255, 255, 255, 0.2);

    &.active {
      color: white;
      background: rgba($townsfolk, 0.45);
      border-color: $townsfolk;
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

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 4px 2px 8px;
}

.empty-state {
  margin: 30px 0;
  color: rgba(255, 255, 255, 0.65);
  text-align: center;
  font-size: 86%;

  &.compact {
    margin-top: 18px;
  }
}

.message {
  width: 86%;
  margin-bottom: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 6px;

  &.out {
    margin-left: auto;
    background: rgba($townsfolk, 0.22);
    border-color: rgba($townsfolk, 0.45);
  }

  &.in {
    margin-right: auto;
  }

  p {
    margin: 4px 0 0;
    color: rgba(255, 255, 255, 0.9);
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
  gap: 6px;
  margin-top: 8px;

  textarea {
    min-height: 64px;
    resize: vertical;
  }

  button {
    min-width: 82px;
    cursor: pointer;

    &:disabled {
      cursor: default;
      opacity: 0.45;
    }

    &:not(:disabled):hover {
      color: red;
      border-color: red;
    }
  }
}

@media (max-width: 520px) {
  .private-chat-shell {
    right: max(8px, env(safe-area-inset-right));
    bottom: max(10px, env(safe-area-inset-bottom));
    gap: 8px;
  }

  .chat-toggle {
    min-width: 44px;
    width: 44px;
    height: 44px;
    padding: 0;
    border-radius: 50%;

    span {
      position: absolute;
      top: -5px;
      right: -5px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      color: white;
      background: $demon;
      border-radius: 9px;
      box-shadow: 0 0 6px rgba($demon, 0.85);
    }
  }

  .private-chat-panel {
    width: calc(100vw - 16px);
    height: min(62dvh, 460px);
    max-height: calc(100dvh - 96px);
    padding: 10px;
  }
}
</style>
