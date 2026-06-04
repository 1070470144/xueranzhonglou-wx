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
        <button type="button" @click="startNewGame">
          <font-awesome-icon icon="plus-circle" /> {{ $t("storyLog.newGame") }}
        </button>
        <label class="phase-select">
          <span>{{ $t("storyLog.adjustPhase") }}</span>
          <select :value="currentPhaseKey" @change="adjustCurrentPhase">
            <option v-for="choice in phaseChoices" :key="choice.key" :value="choice.key">
              {{ choice.label }}
            </option>
          </select>
        </label>
        <button type="button" @click="clearLogs">
          <font-awesome-icon icon="trash-alt" /> {{ $t("storyLog.clearCurrent") }}
        </button>
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
              <option v-for="choice in phaseChoices" :key="choice.key" :value="choice.key">
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
      activePhaseKey: ""
    };
  },
  computed: {
    ...mapState(["modals"]),
    ...mapGetters("storyLog", ["currentGame", "currentLogs"]),
    currentPhaseKey() {
      return this.phaseKey(this.currentGame || { phaseType: "setup", phaseNumber: 0 });
    },
    groupedLogs() {
      const groups = [];
      this.currentLogs.forEach(log => {
        const key = this.phaseKey(log);
        let group = groups.find(item => item.key === key);
        if (!group) {
          group = {
            key,
            label: this.phaseLabel(log),
            logs: []
          };
          groups.push(group);
        }
        group.logs.push(log);
      });
      return groups;
    },
    phaseTabs() {
      const tabs = this.groupedLogs.map(group => ({
        key: group.key,
        label: group.label
      }));
      if (!tabs.some(tab => tab.key === this.currentPhaseKey)) {
        tabs.push({
          key: this.currentPhaseKey,
          label: this.phaseLabel(this.currentGame)
        });
      }
      return tabs;
    },
    phaseChoices() {
      const choices = this.phaseTabs.map(tab => ({
        key: tab.key,
        label: tab.label,
        ...this.parsePhaseKey(tab.key)
      }));
      const next = this.nextPhaseChoice;
      if (next && !choices.some(choice => choice.key === next.key)) {
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
          phaseNumber: 1
        };
      }
      if (this.currentGame.phaseType === "night") {
        const phaseNumber = this.currentGame.dayNumber + 1;
        return {
          key: `day-${phaseNumber}`,
          label: this.$t("storyLog.dayNumber", { count: phaseNumber }),
          phaseType: "day",
          phaseNumber
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
        phaseNumber
      };
    },
    activeLogs() {
      const group = this.groupedLogs.find(item => item.key === this.activePhaseKey);
      return group ? group.logs : [];
    }
  },
  watch: {
    "modals.storyLog"(isOpen) {
      if (isOpen) this.activePhaseKey = this.currentPhaseKey;
    },
    currentPhaseKey(key) {
      this.activePhaseKey = key;
    }
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
      const phaseNumber = phaseType === "setup" ? 0 : (item && item.phaseNumber) || 1;
      return `${phaseType}-${phaseNumber}`;
    },
    parsePhaseKey(key) {
      const [phaseType, phaseNumber] = String(key || "setup-0").split("-");
      return {
        phaseType,
        phaseNumber: Math.max(0, parseInt(phaseNumber, 10) || 0)
      };
    },
    findPhaseChoice(key) {
      return this.phaseChoices.find(choice => choice.key === key) || null;
    },
    sourceLabel(source) {
      return source === "auto" ? this.$t("storyLog.auto") : this.$t("storyLog.manual");
    },
    formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
    },
    addManual() {
      const content = this.manualContent.trim();
      if (!content) return;
      this.$store.commit("storyLog/addEntry", {
        source: "manual",
        type: this.manualType,
        title: this.$t(`storyLog.${this.manualType}`),
        content
      });
      this.manualContent = "";
    },
    supplement(log) {
      const content = prompt(this.$t("storyLog.supplementPrompt"));
      if (content) {
        this.$store.commit("storyLog/appendEntryContent", {
          id: log.id,
          content
        });
      }
    },
    edit(log) {
      const content = prompt(this.$t("storyLog.editPrompt"), log.content || "");
      if (content !== null) {
        this.$store.commit("storyLog/updateEntry", {
          id: log.id,
          content
        });
      }
    },
    movePhase(log, event) {
      const choice = this.findPhaseChoice(event.target.value);
      if (!choice) return;
      this.$store.commit("storyLog/moveEntryPhase", {
        id: log.id,
        phaseType: choice.phaseType,
        phaseNumber: choice.phaseNumber
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
        phaseNumber: choice.phaseNumber
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
    ...mapMutations(["toggleModal"])
  }
};
</script>

<style scoped lang="scss">
@import "../../vars.scss";

.story-log-backdrop {
  position: fixed;
  inset: 0;
  z-index: 110;
  background: rgba(0, 0, 0, 0.25);
}

.story-log-panel {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  width: 430px;
  max-width: 92vw;
  height: 100%;
  padding: 12px;
  color: white;
  background: rgba(0, 0, 0, 0.92);
  box-shadow: -4px 0 20px #000;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;

  button {
    color: white;
    background: transparent;
    border: 0;
    cursor: pointer;
    font-size: 110%;
  }
}

.current-phase {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  padding: 6px 8px;
  background: rgba($townsfolk, 0.18);
  border: 1px solid rgba($townsfolk, 0.45);
  border-radius: 6px;
  font-size: 82%;

  span {
    color: rgba(255, 255, 255, 0.72);
  }

  strong {
    color: white;
    white-space: nowrap;
  }
}

.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 80%;
}

.phase-select,
.entry-phase-select {
  display: flex;
  align-items: center;
  gap: 4px;

  span {
    color: rgba(255, 255, 255, 0.72);
    white-space: nowrap;
  }

  select {
    max-width: 100px;
    min-height: 25px;
  }
}

.phase-select {
  flex: 1;
  justify-content: center;
}

.phase-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  overflow-x: auto;
  padding-bottom: 4px;

  button {
    flex: 0 0 auto;
    min-width: 70px;
    border-color: rgba(255, 255, 255, 0.2);

    &.active {
      color: white;
      background: rgba($townsfolk, 0.45);
      border-color: $townsfolk;
    }
  }
}

button,
select,
textarea {
  color: white;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.25);
}

option {
  color: #111;
  background: white;
}

button {
  cursor: pointer;
  padding: 4px 6px;

  &:hover {
    color: red;
    border-color: red;
  }
}

.log-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

.empty {
  margin-top: 30px;
  color: rgba(255, 255, 255, 0.65);
  text-align: center;
}

.log-entry {
  margin-bottom: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 6px;

  strong {
    display: block;
    line-height: 1.25;
  }

  p {
    margin: 6px 0 0;
    color: rgba(255, 255, 255, 0.82);
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
  margin-top: 8px;

  textarea {
    min-height: 62px;
    resize: vertical;
  }
}
</style>
