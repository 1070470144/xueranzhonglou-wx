<template>
  <div v-if="modals.storyLog" class="story-log-backdrop" @click="close">
    <aside class="story-log-panel" @click.stop="">
      <header>
        <h3>{{ $t("storyLog.title") }}</h3>
        <button type="button" @click="close">
          <font-awesome-icon icon="times" />
        </button>
      </header>

      <div class="current-phase">
        <span>{{ $t("storyLog.currentPhase") }}</span>
        <strong>{{ phaseLabel(currentGame) }}</strong>
      </div>

      <div class="actions">
        <button type="button" class="danger-action" @click="startNewGame">
          <font-awesome-icon icon="plus-circle" /> {{ $t("storyLog.newGame") }}
        </button>
        <button type="button" @click="exportReview">
          <font-awesome-icon icon="download" />
          {{ $t("storyLog.exportReview") }}
        </button>
        <button type="button" @click="copyReviewText">
          <font-awesome-icon icon="clipboard" />
          {{ $t("storyLog.copyReviewText") }}
        </button>
        <label class="phase-select">
          <span>{{ $t("storyLog.adjustPhase") }}</span>
          <select :value="currentPhaseKey" @change="adjustCurrentPhase">
            <option
              v-for="choice in phaseChoices"
              :key="choice.key"
              :value="choice.key"
            >
              {{ choice.label }}
            </option>
          </select>
        </label>
        <button type="button" class="danger-action" @click="clearLogs">
          <font-awesome-icon icon="trash-alt" />
          {{ $t("storyLog.clearCurrent") }}
        </button>
        <span v-if="copyMessage" class="copy-status">{{ copyMessage }}</span>
      </div>

      <nav class="phase-tabs" v-if="phaseTabs.length">
        <button
          v-for="tab in phaseTabs"
          :key="tab.key"
          type="button"
          :class="{ active: tab.key === activePhaseKey }"
          @click="activePhaseKey = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>

      <section class="log-list">
        <div v-if="!activeLogs.length" class="empty">
          {{ $t("storyLog.empty") }}
        </div>
        <article v-for="log in activeLogs" :key="log.id" class="log-entry">
          <div class="entry-head">
            <span class="entry-time">{{ formatTime(log.createdAt) }}</span>
            <span class="entry-source">{{ sourceLabel(log.source) }}</span>
          </div>
          <strong>{{ log.title }}</strong>
          <p v-if="log.content">{{ log.content }}</p>
          <label class="entry-phase-select">
            <span>{{ $t("storyLog.movePhase") }}</span>
            <select :value="phaseKey(log)" @change="movePhase(log, $event)">
              <option
                v-for="choice in phaseChoices"
                :key="choice.key"
                :value="choice.key"
              >
                {{ choice.label }}
              </option>
            </select>
          </label>
          <div class="entry-actions">
            <button type="button" @click="supplement(log)">
              {{ $t("storyLog.supplement") }}
            </button>
            <button type="button" @click="edit(log)">
              {{ $t("common.edit") }}
            </button>
            <button type="button" @click="remove(log)">
              {{ $t("common.remove") }}
            </button>
          </div>
        </article>
      </section>

      <footer>
        <select v-model="manualType">
          <option value="note">{{ $t("storyLog.note") }}</option>
          <option value="info">{{ $t("storyLog.info") }}</option>
          <option value="status">{{ $t("storyLog.status") }}</option>
          <option value="custom">{{ $t("storyLog.custom") }}</option>
        </select>
        <textarea
          v-model="manualContent"
          :placeholder="$t('storyLog.inputPlaceholder')"
          @keyup.ctrl.enter="addManual"
        ></textarea>
        <button type="button" @click="addManual">
          <font-awesome-icon icon="plus-circle" /> {{ $t("common.add") }}
        </button>
      </footer>
    </aside>
  </div>
</template>

<script>
import { mapGetters, mapMutations, mapState } from "vuex";

export default {
  data() {
    return {
      manualType: "note",
      manualContent: "",
      activePhaseKey: "",
      copyMessage: "",
      copyMessageTimer: null,
    };
  },
  computed: {
    ...mapState(["modals", "edition", "session"]),
    ...mapState("players", ["players"]),
    ...mapGetters("storyLog", ["currentGame", "currentLogs"]),
    currentPhaseKey() {
      return this.phaseKey(
        this.currentGame || { phaseType: "setup", phaseNumber: 0 },
      );
    },
    groupedLogs() {
      const groups = [];
      this.currentLogs.forEach((log) => {
        const key = this.phaseKey(log);
        let group = groups.find((item) => item.key === key);
        if (!group) {
          group = {
            key,
            label: this.phaseLabel(log),
            logs: [],
          };
          groups.push(group);
        }
        group.logs.push(log);
      });
      return groups;
    },
    phaseTabs() {
      const tabs = this.groupedLogs.map((group) => ({
        key: group.key,
        label: group.label,
      }));
      if (!tabs.some((tab) => tab.key === this.currentPhaseKey)) {
        tabs.push({
          key: this.currentPhaseKey,
          label: this.phaseLabel(this.currentGame),
        });
      }
      return tabs;
    },
    phaseChoices() {
      const choices = this.phaseTabs.map((tab) => ({
        key: tab.key,
        label: tab.label,
        ...this.parsePhaseKey(tab.key),
      }));
      const next = this.nextPhaseChoice;
      if (next && !choices.some((choice) => choice.key === next.key)) {
        choices.push(next);
      }
      return choices;
    },
    nextPhaseChoice() {
      if (!this.currentGame) return null;
      if (this.currentGame.phaseType === "setup") {
        return {
          key: "night-1",
          label: this.$t("storyLog.firstNight"),
          phaseType: "night",
          phaseNumber: 1,
        };
      }
      if (this.currentGame.phaseType === "night") {
        const phaseNumber = this.currentGame.dayNumber + 1;
        return {
          key: `day-${phaseNumber}`,
          label: this.$t("storyLog.dayNumber", { count: phaseNumber }),
          phaseType: "day",
          phaseNumber,
        };
      }
      const phaseNumber = this.currentGame.nightNumber + 1;
      return {
        key: `night-${phaseNumber}`,
        label:
          phaseNumber === 1
            ? this.$t("storyLog.firstNight")
            : this.$t("storyLog.nightNumber", { count: phaseNumber }),
        phaseType: "night",
        phaseNumber,
      };
    },
    activeLogs() {
      const group = this.groupedLogs.find(
        (item) => item.key === this.activePhaseKey,
      );
      return group ? group.logs : [];
    },
  },
  watch: {
    "modals.storyLog"(isOpen) {
      if (isOpen) this.activePhaseKey = this.currentPhaseKey;
    },
    currentPhaseKey(key) {
      this.activePhaseKey = key;
    },
  },
  created() {
    this.activePhaseKey = this.currentPhaseKey;
  },
  methods: {
    close() {
      this.toggleModal("storyLog");
    },
    phaseLabel(item) {
      if (!item || item.phaseType === "setup") return this.$t("storyLog.setup");
      const count = item.phaseNumber || 1;
      if (item.phaseType === "night" && count === 1) {
        return this.$t("storyLog.firstNight");
      }
      return item.phaseType === "night"
        ? this.$t("storyLog.nightNumber", { count })
        : this.$t("storyLog.dayNumber", { count });
    },
    phaseKey(item) {
      const phaseType = (item && item.phaseType) || "setup";
      const phaseNumber =
        phaseType === "setup" ? 0 : (item && item.phaseNumber) || 1;
      return `${phaseType}-${phaseNumber}`;
    },
    parsePhaseKey(key) {
      const [phaseType, phaseNumber] = String(key || "setup-0").split("-");
      return {
        phaseType,
        phaseNumber: Math.max(0, parseInt(phaseNumber, 10) || 0),
      };
    },
    findPhaseChoice(key) {
      return this.phaseChoices.find((choice) => choice.key === key) || null;
    },
    sourceLabel(source) {
      return source === "auto"
        ? this.$t("storyLog.auto")
        : this.$t("storyLog.manual");
    },
    formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    addManual() {
      const content = this.manualContent.trim();
      if (!content) return;
      this.$store.commit("storyLog/addEntry", {
        source: "manual",
        type: this.manualType,
        title: this.$t(`storyLog.${this.manualType}`),
        content,
      });
      this.manualContent = "";
    },
    supplement(log) {
      const content = prompt(this.$t("storyLog.supplementPrompt"));
      if (content) {
        this.$store.commit("storyLog/appendEntryContent", {
          id: log.id,
          content,
        });
      }
    },
    edit(log) {
      const content = prompt(this.$t("storyLog.editPrompt"), log.content || "");
      if (content !== null) {
        this.$store.commit("storyLog/updateEntry", {
          id: log.id,
          content,
        });
      }
    },
    movePhase(log, event) {
      const choice = this.findPhaseChoice(event.target.value);
      if (!choice) return;
      this.$store.commit("storyLog/moveEntryPhase", {
        id: log.id,
        phaseType: choice.phaseType,
        phaseNumber: choice.phaseNumber,
      });
      this.activePhaseKey = choice.key;
    },
    remove(log) {
      if (confirm(this.$t("storyLog.confirmDelete"))) {
        this.$store.commit("storyLog/deleteEntry", log.id);
      }
    },
    adjustCurrentPhase(event) {
      const choice = this.findPhaseChoice(event.target.value);
      if (!choice) return;
      this.$store.commit("storyLog/setPhase", {
        phaseType: choice.phaseType,
        phaseNumber: choice.phaseNumber,
      });
      this.activePhaseKey = choice.key;
    },
    clearLogs() {
      if (confirm(this.$t("storyLog.confirmClear"))) {
        this.$store.commit("storyLog/clearCurrentLogs");
      }
    },
    startNewGame() {
      if (confirm(this.$t("storyLog.confirmNewGame"))) {
        this.$store.commit("storyLog/startNewGame");
      }
    },
    exportReview() {
      if (!confirm(this.$t("storyLog.confirmExportReview"))) return;
      const markdown = this.buildReviewMarkdown();
      const blob = new Blob([markdown], {
        type: "text/markdown;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = this.reviewFilename();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    async copyReviewText() {
      const text = this.buildReviewText();
      const copied = await this.copyTextToClipboard(text);
      this.showCopyMessage(
        copied
          ? this.$t("storyLog.copyReviewSuccess")
          : this.$t("storyLog.copyReviewFailed"),
      );
    },
    buildReviewText() {
      const lines = [
        this.$t("storyLog.reviewTitle"),
        "",
        `${this.$t("storyLog.exportedAt")}：${this.formatDateTime(Date.now())}`,
        `${this.$t("storyLog.scriptName")}：${
          this.edition.name || this.$t("common.customScript")
        }`,
        `${this.$t("storyLog.roomId")}：${this.session.sessionId || "-"}`,
        `${this.$t("storyLog.playerCount")}：${this.players.length}`,
        `${this.$t("storyLog.currentPhase")}：${this.phaseLabel(
          this.currentGame,
        )}`,
        "",
        `【${this.$t("storyLog.playersAndRoles")}】`,
      ];

      if (this.players.length) {
        this.players.forEach((player, index) => {
          const role = player.role || {};
          lines.push(
            `${index + 1}. ${player.name || "-"} - ${
              role.name || role.id || "-"
            } - ${role.team || "-"}`,
          );
        });
      } else {
        lines.push("-");
      }

      lines.push("", `【${this.$t("storyLog.voteHistory")}】`);
      if (this.session.voteHistory.length) {
        this.session.voteHistory.forEach((vote) => {
          lines.push(
            `- ${this.formatDateTime(vote.timestamp)} ${vote.type || ""}：${
              vote.nominator
            } -> ${vote.nominee}，${this.$t("storyLog.majority")} ${
              vote.majority
            }，${this.$t("storyLog.voters")}：${
              vote.votes.length ? vote.votes.join("、") : "-"
            }`,
          );
        });
      } else {
        lines.push(this.$t("storyLog.noVoteHistory"));
      }

      lines.push("", `【${this.$t("storyLog.title")}】`);
      const groups = this.logsForExport();
      if (!groups.length) {
        lines.push(this.$t("storyLog.empty"));
      } else {
        groups.forEach((group) => {
          lines.push("", `【${group.label}】`);
          group.logs.forEach((log) => {
            const label = `${this.formatDateTime(
              log.createdAt,
            )} [${this.sourceLabel(log.source)}] ${
              log.title || this.$t("storyLog.note")
            }`;
            lines.push(`- ${label}`);
            if (log.content) {
              log.content.split("\n").forEach((line) => {
                lines.push(`  ${line}`);
              });
            }
          });
        });
      }

      return `${lines.join("\n")}\n`;
    },
    async copyTextToClipboard(text) {
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch (error) {
          // Fall through to textarea copy for browsers that block Clipboard API.
        }
      }

      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      let copied = false;
      try {
        copied = document.execCommand("copy");
      } catch (error) {
        copied = false;
      }
      document.body.removeChild(textarea);
      return copied;
    },
    showCopyMessage(message) {
      this.copyMessage = message;
      window.clearTimeout(this.copyMessageTimer);
      this.copyMessageTimer = window.setTimeout(() => {
        this.copyMessage = "";
      }, 2000);
    },
    buildReviewMarkdown() {
      const lines = [
        `# ${this.$t("storyLog.reviewTitle")}`,
        "",
        `- ${this.$t("storyLog.exportedAt")}：${this.formatDateTime(
          Date.now(),
        )}`,
        `- ${this.$t("storyLog.scriptName")}：${
          this.edition.name || this.$t("common.customScript")
        }`,
        `- ${this.$t("storyLog.roomId")}：${this.session.sessionId || "-"}`,
        `- ${this.$t("storyLog.playerCount")}：${this.players.length}`,
        `- ${this.$t("storyLog.currentPhase")}：${this.phaseLabel(
          this.currentGame,
        )}`,
        "",
        `## ${this.$t("storyLog.playersAndRoles")}`,
        "",
        `| ${this.$t("storyLog.seat")} | ${this.$t(
          "storyLog.player",
        )} | ${this.$t("storyLog.role")} | ${this.$t("storyLog.team")} |`,
        "| --- | --- | --- | --- |",
        ...this.players.map((player, index) => {
          const role = player.role || {};
          return `| ${index + 1} | ${this.markdownCell(
            player.name || "-",
          )} | ${this.markdownCell(
            role.name || role.id || "-",
          )} | ${this.markdownCell(role.team || "-")} |`;
        }),
        "",
        `## ${this.$t("storyLog.voteHistory")}`,
        "",
      ];

      if (this.session.voteHistory.length) {
        this.session.voteHistory.forEach((vote) => {
          lines.push(
            `- ${this.formatDateTime(vote.timestamp)} ${vote.type || ""}：${
              vote.nominator
            } -> ${vote.nominee}，${this.$t("storyLog.majority")} ${
              vote.majority
            }，${this.$t("storyLog.voters")}：${
              vote.votes.length ? vote.votes.join("、") : "-"
            }`,
          );
        });
      } else {
        lines.push(`_${this.$t("storyLog.noVoteHistory")}_`);
      }

      lines.push("", `## ${this.$t("storyLog.title")}`, "");
      const groups = this.logsForExport();
      if (!groups.length) {
        lines.push(`_${this.$t("storyLog.empty")}_`);
      } else {
        groups.forEach((group) => {
          lines.push(`### ${group.label}`, "");
          group.logs.forEach((log) => {
            const label = `${this.formatDateTime(
              log.createdAt,
            )} [${this.sourceLabel(log.source)}] ${
              log.title || this.$t("storyLog.note")
            }`;
            lines.push(`- ${label}`);
            if (log.content) {
              log.content.split("\n").forEach((line) => {
                lines.push(`  ${line}`);
              });
            }
          });
          lines.push("");
        });
      }

      return `${lines.join("\n")}\n`;
    },
    logsForExport() {
      const groups = [];
      [...this.currentLogs]
        .sort(
          (a, b) =>
            this.phaseOrder(a) - this.phaseOrder(b) ||
            a.createdAt - b.createdAt,
        )
        .forEach((log) => {
          const key = this.phaseKey(log);
          let group = groups.find((item) => item.key === key);
          if (!group) {
            group = {
              key,
              label: this.phaseLabel(log),
              logs: [],
            };
            groups.push(group);
          }
          group.logs.push(log);
        });
      return groups;
    },
    phaseOrder(item) {
      if (!item || item.phaseType === "setup") return 0;
      const number = item.phaseNumber || 1;
      return item.phaseType === "night" ? number * 2 - 1 : number * 2;
    },
    formatDateTime(timestamp) {
      return new Date(timestamp).toLocaleString([], {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    markdownCell(value) {
      return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
    },
    reviewFilename() {
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const room = this.session.sessionId || "local";
      return `${this.$t("storyLog.reviewTitle")}-${room}-${date}.md`.replace(
        /[\\/:*?"<>|]/g,
        "-",
      );
    },
    ...mapMutations(["toggleModal"]),
  },
};
</script>

<style scoped lang="scss">
@import "../../vars.scss";

.story-log-backdrop {
  position: fixed;
  inset: 0;
  z-index: 110;
  background: radial-gradient(
      circle at 78% 14%,
      rgba(96, 24, 20, 0.16),
      transparent 30%
    ),
    rgba(9, 7, 6, 0.38);
  backdrop-filter: blur(1px);
}

.story-log-panel {
  --story-panel: rgba(12, 9, 8, 0.82);
  --story-surface: rgba(18, 15, 13, 0.86);

  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  width: 430px;
  max-width: 92vw;
  height: 100%;
  padding: 0;
  color: #dcc4a1;
  border-left: 2px solid #3d2e26;
  background: var(--story-panel);
  box-shadow:
    -18px 0 54px rgba(0, 0, 0, 0.62),
    inset 1px 0 0 rgba(255, 236, 190, 0.05);
  backdrop-filter: blur(4px);
  font-family: "STKaiti", "KaiTi", "STSong", "SimSun", serif;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 3.2em;
  margin-bottom: 0;
  padding: 0.55em 0.78em;
  border-bottom: 1px solid #3d2e26;
  background: radial-gradient(
      circle at 50% 0%,
      rgba(92, 26, 22, 0.22),
      transparent 36%
    ),
    rgba(18, 14, 12, 0.9);

  h3 {
    margin: 0;
    color: #fff8e7;
    font-size: 1.15em;
    letter-spacing: 0.12em;
  }

  button {
    color: #dcc4a1;
    background: transparent;
    border: 0;
    cursor: pointer;
    font-size: 110%;

    &:hover {
      color: #fff8e7;
    }
  }
}

.current-phase {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0;
  padding: 0.7em 0.78em;
  background: rgba(18, 15, 13, 0.86);
  border-bottom: 1px solid #3d2e26;
  border-radius: 0;
  font-size: 82%;

  span {
    color: #c0a88a;
  }

  strong {
    color: #fff8e7;
    white-space: nowrap;
  }
}

.actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: center;
  gap: 0.42em;
  margin: 0;
  padding: 0.72em 0.78em;
  border-bottom: 1px solid #3d2e26;
  background: rgba(18, 15, 13, 0.68);
  font-size: 80%;

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-height: 30px;
    white-space: nowrap;
  }

  .danger-action {
    border-color: rgba($demon, 0.75);
    color: #ff4c4c;
  }
}

.phase-select,
.entry-phase-select {
  display: flex;
  align-items: center;
  gap: 4px;

  span {
    color: #c0a88a;
    white-space: nowrap;
  }

  select {
    max-width: 100px;
    min-height: 25px;
  }
}

.phase-select {
  grid-column: 1 / -1;
  justify-content: space-between;
  min-height: 32px;
  padding: 0 6px;
  background: rgba(5, 4, 4, 0.42);
  border: 1px solid #3d2e26;
  border-radius: 2px;

  select {
    max-width: 170px;
  }
}

.copy-status {
  grid-column: 1 / -1;
  color: rgba($townsfolk, 0.95);
  font-size: 90%;
  text-align: right;
}

.phase-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 0;
  overflow-x: auto;
  padding: 0;
  border-bottom: 1px solid #3d2e26;
  background: rgba(18, 15, 13, 0.86);

  button {
    flex: 0 0 auto;
    min-width: 70px;
    border: 0;
    border-right: 1px solid #3d2e26;

    &.active {
      color: #fff8e7;
      background: linear-gradient(#8a2721, #581612 54%, #2d0c09);
    }
  }
}

button,
select,
textarea {
  color: #f7f0df;
  background: rgba(5, 4, 4, 0.62);
  border: 1px solid rgba(124, 94, 70, 0.88);
  border-radius: 2px;
  font-family: inherit;
}

option {
  color: #111;
  background: white;
}

button {
  cursor: pointer;
  padding: 4px 6px;

  &:hover {
    color: #fff8e7;
    border-color: #d4af37;
  }
}

.log-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.72em 0.78em;
  background: rgba(12, 9, 8, 0.52);
}

.empty {
  margin-top: 30px;
  color: rgba(220, 196, 161, 0.72);
  text-align: center;
}

.log-entry {
  margin-bottom: 8px;
  padding: 8px;
  background: var(--story-surface);
  border: 1px solid #3d2e26;
  border-radius: 2px;

  strong {
    display: block;
    line-height: 1.25;
  }

  p {
    margin: 6px 0 0;
    color: rgba(247, 240, 223, 0.78);
    font-size: 84%;
    white-space: pre-wrap;
  }
}

.entry-phase-select {
  justify-content: flex-end;
  margin-top: 6px;
  font-size: 72%;

  select {
    max-width: 120px;
  }
}

.entry-head,
.entry-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 4px;
  color: rgba(255, 255, 255, 0.62);
  font-size: 70%;
}

.entry-actions {
  justify-content: flex-end;
  margin: 8px 0 0;
}

footer {
  display: grid;
  grid-template-columns: 120px 1fr auto;
  gap: 6px;
  margin-top: 0;
  padding: 0.72em 0.78em;
  border-top: 1px solid #3d2e26;
  background: rgba(18, 15, 14, 0.92);

  textarea {
    min-height: 62px;
    resize: vertical;
  }
}
</style>
