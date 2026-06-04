<template>
  <div v-if="modals.gameRecord" class="record-backdrop" @click="close">
    <aside class="record-panel" @click.stop="">
      <header>
        <h3>保存战绩</h3>
        <button type="button" @click="close">
          <font-awesome-icon icon="times" />
        </button>
      </header>

      <section class="summary">
        <div>
          <span>剧本</span>
          <strong>{{ edition.name || "自定义剧本" }}</strong>
        </div>
        <div>
          <span>玩家</span>
          <strong>{{ players.length }} 人</strong>
        </div>
        <div>
          <span>时长</span>
          <strong>{{ durationText }}</strong>
        </div>
      </section>

      <section class="winner-select">
        <span>胜利阵营</span>
        <button
          v-for="choice in winnerChoices"
          :key="choice.value"
          type="button"
          :class="{ active: winner === choice.value }"
          @click="winner = choice.value"
        >
          {{ choice.label }}
        </button>
      </section>

      <p v-if="!loggedIn" class="warning muted">
        本局可以保存，未登录说书人不会进入说书人个人统计；已登录玩家仍会计入玩家战绩。
      </p>
      <p v-else-if="!loggedPlayersCount" class="warning muted">
        当前玩家没有绑定网页登录账号，本局会记录为说书人战绩，暂不会进入玩家个人战绩。
      </p>

      <footer>
        <button type="button" @click="close">取消</button>
        <button type="button" class="primary" :disabled="saving || !canSave" @click="submit">
          {{ saving ? "保存中..." : "保存" }}
        </button>
      </footer>
    </aside>
  </div>
</template>

<script>
import { mapState } from "vuex";
import { buildGameRecordSnapshot, saveGameRecord } from "@/services/gameRecords";
import { getAuthSession } from "@/services/auth";

export default {
  data() {
    return {
      winner: "good",
      saving: false,
      authUser: null,
      now: Date.now(),
      timer: null,
      winnerChoices: [
        { value: "good", label: "善良胜利" },
        { value: "evil", label: "邪恶胜利" },
        { value: "unknown", label: "不记录胜负" }
      ]
    };
  },
  computed: {
    ...mapState(["modals", "edition", "session"]),
    ...mapState("players", ["players"]),
    loggedIn() {
      return !!(this.authUser && (this.authUser.id || this.authUser._id || this.authUser.uid || this.authUser.userId || this.authUser.openid));
    },
    canSave() {
      return this.players.length > 0;
    },
    loggedPlayersCount() {
      return this.players.filter(player => player.userId || (player.user && (player.user._id || player.user.uid || player.user.userId))).length;
    },
    durationText() {
      const start = Number(this.session.gameStartedAt) || this.now;
      const minutes = Math.max(0, Math.round((this.now - start) / 60000));
      const hours = Math.floor(minutes / 60);
      const rest = minutes % 60;
      if (!hours) return `${rest} 分钟`;
      return `${hours} 小时 ${rest} 分钟`;
    }
  },
  watch: {
    "modals.gameRecord"(open) {
      if (open) this.refresh();
    }
  },
  beforeDestroy() {
    if (this.timer) clearInterval(this.timer);
  },
  methods: {
    refresh() {
      this.authUser = getAuthSession().user;
      this.now = Date.now();
      if (this.timer) clearInterval(this.timer);
      this.timer = setInterval(() => {
        this.now = Date.now();
      }, 30000);
    },
    close() {
      this.$store.commit("toggleModal", "gameRecord");
    },
    async submit() {
      if (!this.canSave || this.saving) return;
      this.saving = true;
      try {
        const payload = buildGameRecordSnapshot({
          players: this.players,
          edition: this.edition,
          session: this.session,
          winner: this.winner
        });
        const result = await saveGameRecord(payload);
        if (!result || !result.success) throw new Error((result && result.message) || "保存失败");
        alert("战绩已保存");
        this.$store.commit("session/setGameStartedAt", Date.now());
        this.close();
      } catch (error) {
        alert(error.message || "保存失败，请稍后重试");
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style scoped lang="scss">
@import "../../vars.scss";

.record-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 110;
  background: rgba(0, 0, 0, 0.55);
}

.record-panel {
  width: min(460px, calc(100vw - 28px));
  max-height: calc(100vh - 28px);
  overflow: auto;
  padding: 18px;
  border: 3px solid black;
  border-radius: 8px;
  background: rgba(18, 18, 18, 0.96);
  color: white;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.7);

  header,
  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  h3 {
    font-size: 30px;
  }

  button {
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: 4px;
    padding: 7px 12px;
    color: white;
    background: rgba(255, 255, 255, 0.08);

    &:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }
  }

  .primary,
  .winner-select button.active {
    border-color: $townsfolk;
    background: $townsfolk;
  }
}

.summary {
  display: grid;
  gap: 10px;
  margin: 18px 0;

  div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.16);
  }

  span {
    color: rgba(255, 255, 255, 0.72);
  }
}

.winner-select {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-bottom: 16px;

  > span {
    color: rgba(255, 255, 255, 0.72);
  }
}

.warning {
  margin: 0 0 16px;
  color: #ffb4a8;

  &.muted {
    color: rgba(255, 255, 255, 0.7);
  }
}
</style>
