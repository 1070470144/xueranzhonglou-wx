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
        <button
          type="button"
          class="primary"
          :disabled="saving || !canSave"
          @click="submit"
        >
          {{ saving ? "保存中..." : "保存" }}
        </button>
      </footer>
    </aside>
  </div>
</template>

<script>
import { mapState } from "vuex";
import {
  buildGameRecordSnapshot,
  saveGameRecord,
} from "@/services/gameRecords";
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
        { value: "unknown", label: "不记录胜负" },
      ],
    };
  },
  computed: {
    ...mapState(["modals", "edition", "session"]),
    ...mapState("players", ["players"]),
    loggedIn() {
      return !!(
        this.authUser &&
        (this.authUser.id ||
          this.authUser._id ||
          this.authUser.uid ||
          this.authUser.userId ||
          this.authUser.openid)
      );
    },
    canSave() {
      return this.players.length > 0;
    },
    loggedPlayersCount() {
      return this.players.filter(
        (player) =>
          player.userId ||
          (player.user &&
            (player.user._id || player.user.uid || player.user.userId)),
      ).length;
    },
    durationText() {
      const start = Number(this.session.gameStartedAt) || this.now;
      const minutes = Math.max(0, Math.round((this.now - start) / 60000));
      const hours = Math.floor(minutes / 60);
      const rest = minutes % 60;
      if (!hours) return `${rest} 分钟`;
      return `${hours} 小时 ${rest} 分钟`;
    },
  },
  watch: {
    "modals.gameRecord"(open) {
      if (open) this.refresh();
    },
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
          winner: this.winner,
        });
        const result = await saveGameRecord(payload);
        if (!result || !result.success)
          throw new Error((result && result.message) || "保存失败");
        alert("战绩已保存");
        this.$store.commit("session/setGameStartedAt", Date.now());
        this.close();
      } catch (error) {
        alert(error.message || "保存失败，请稍后重试");
      } finally {
        this.saving = false;
      }
    },
  },
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
  padding: 1.2em;
  background: radial-gradient(
      circle at 50% 12%,
      rgba(96, 24, 20, 0.18),
      transparent 32%
    ),
    rgba(9, 7, 6, 0.58);
  backdrop-filter: blur(2px);
}

.record-panel {
  --record-panel: rgba(12, 9, 8, 0.78);
  --record-surface: rgba(18, 15, 13, 0.86);

  width: min(460px, calc(100vw - 28px));
  max-height: calc(100vh - 28px);
  overflow: auto;
  padding: 0;
  border: 2px solid #3d2e26;
  border-radius: 2px;
  background: var(--record-panel);
  color: #dcc4a1;
  box-shadow:
    0 22px 70px rgba(0, 0, 0, 0.62),
    inset 0 1px 0 rgba(255, 236, 190, 0.05);
  backdrop-filter: blur(4px);
  font-family: "STKaiti", "KaiTi", "STSong", "SimSun", serif;

  header,
  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75em;
  }

  header {
    min-height: 3.2em;
    padding: 0.55em 0.78em;
    border-bottom: 1px solid #3d2e26;
    background: radial-gradient(
        circle at 50% 0%,
        rgba(92, 26, 22, 0.22),
        transparent 36%
      ),
      rgba(18, 14, 12, 0.9);
  }

  footer {
    justify-content: flex-end;
    padding: 0.72em 0.78em 0.78em;
    border-top: 1px solid #3d2e26;
    background: rgba(18, 15, 14, 0.92);
  }

  h3 {
    margin: 0;
    color: #fff8e7;
    font-size: 1.28em;
    letter-spacing: 0.1em;
    line-height: 1;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9);
  }

  button {
    cursor: pointer;
    min-height: 2.1em;
    padding: 0.18em 0.78em;
    border: 1px solid #8b6508;
    border-radius: 2px;
    color: #fff8e7;
    background: #2a1c09;
    font-family: inherit;
    font-weight: 700;

    &:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }
  }

  .primary,
  .winner-select button.active {
    border-color: #d4af37;
    background: linear-gradient(#b8860b, #946b07 48%, #5c4204);
  }
}

.summary {
  display: grid;
  margin: 0;
  background: var(--record-surface);

  div {
    display: flex;
    justify-content: space-between;
    gap: 0.75em;
    padding: 0.72em 0.78em;
    border-bottom: 1px solid rgba(61, 46, 38, 0.78);
  }

  span {
    color: #c0a88a;
    font-weight: 700;
  }

  strong {
    color: #f7f0df;
    text-align: right;
  }
}

.winner-select {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5em;
  padding: 0.78em;
  border-bottom: 1px solid #3d2e26;
  background: rgba(18, 15, 13, 0.72);

  > span {
    color: #c0a88a;
    font-weight: 700;
  }
}

.warning {
  margin: 0;
  padding: 0.78em;
  color: #ffb4a8;
  border-bottom: 1px solid #3d2e26;
  background: rgba(18, 15, 13, 0.62);

  &.muted {
    color: rgba(220, 196, 161, 0.82);
  }
}
</style>
