<template>
  <Modal
    class="script-creator"
    v-if="modals.scriptCreator"
    @close="toggleModal('scriptCreator')"
  >
    <div class="script-workspace">
      <aside class="creator-controls">
        <header class="creator-header">
          <small>{{ $t("menu.tools") }}</small>
          <h3>{{ $t("modals.scriptCreator.title") }}</h3>
        </header>

        <section class="control-group" open>
          <h4 class="control-group-title">
            {{ $t("modals.scriptCreator.sections.meta") }}
          </h4>
          <div class="script-fields">
            <label>
              {{ $t("modals.scriptCreator.fields.name") }}
              <input v-model.trim="scriptName" type="text" />
            </label>
            <label>
              {{ $t("modals.scriptCreator.fields.author") }}
              <input v-model.trim="authorName" type="text" />
            </label>
          </div>
        </section>

        <section class="control-group">
          <h4 class="control-group-title">
            {{ $t("modals.scriptCreator.sections.counts") }}
          </h4>
          <div class="count-grid">
            <label
              v-for="team in teamOrder"
              :key="team"
              class="count-control"
              :class="team"
            >
              <span>{{ teamLabel(team) }}</span>
              <input
                v-model.number="roleCounts[team]"
                type="number"
                min="0"
                step="1"
                @change="sanitizeRoleCounts"
              />
            </label>
          </div>
        </section>

        <section class="control-group role-pool-group">
          <h4 class="control-group-title">
            {{ $t("modals.scriptCreator.sections.roles") }}
          </h4>
          <input
            class="role-search"
            v-model.trim="searchText"
            type="search"
            :placeholder="$t('modals.scriptCreator.searchPlaceholder')"
          />

          <div class="validation" v-if="roleLoadError">
            <font-awesome-icon icon="exclamation-triangle" />
            <span>{{ roleLoadError }}</span>
          </div>

          <div class="validation" v-if="validationErrors.length">
            <font-awesome-icon icon="exclamation-triangle" />
            <span>{{ validationText }}</span>
          </div>

          <div class="role-browser">
            <p v-if="loadingRoles" class="role-state">
              {{ $t("modals.scriptCreator.status.loadingRoles") }}
            </p>
            <p v-else-if="!allRoles.length" class="role-state">
              {{ $t("modals.scriptCreator.status.emptyRoles") }}
            </p>
            <section v-for="team in teamOrder" :key="team" class="role-section">
              <h4 :class="team">
                <span>{{ teamLabel(team) }}</span>
                <span>{{ selectedCount(team) }}/{{ expectedCount(team) }}</span>
              </h4>
              <p
                v-if="!loadingRoles && !filteredGroupedRoles[team].length"
                class="role-state role-state-compact"
              >
                {{ $t("modals.scriptCreator.status.emptyTeamRoles") }}
              </p>
              <label
                v-for="role in filteredGroupedRoles[team]"
                :key="role.id"
                class="role-option"
                :class="{ selected: selectedRoles[team].includes(role.id) }"
              >
                <input
                  type="checkbox"
                  :value="role.id"
                  v-model="selectedRoles[team]"
                />
                <img
                  v-if="role.icon"
                  class="role-icon"
                  :src="role.icon"
                  :alt="role.displayName"
                  @error="markIconFailed(role.id)"
                />
                <span v-else class="role-icon role-icon-empty">
                  {{ role.displayName.slice(0, 1) }}
                </span>
                <span class="role-copy">
                  <strong>{{ role.displayName }}</strong>
                  <small>{{ role.displayAbility }}</small>
                </span>
              </label>
            </section>
          </div>
        </section>

        <section class="control-group creator-actions">
          <button class="button minion" @click="randomizeSelection">
            <font-awesome-icon icon="random" />
            {{ $t("modals.scriptCreator.actions.random") }}
          </button>
          <button
            class="button townsfolk"
            :disabled="!canGenerate"
            @click="copy"
          >
            <font-awesome-icon icon="copy" /> {{ $t("common.copyJson") }}
          </button>
          <button
            class="button demon"
            :disabled="!canGenerate"
            @click="download"
          >
            <font-awesome-icon icon="download" />
            {{ $t("modals.scriptCreator.actions.downloadJson") }}
          </button>
          <p class="status" v-if="status">{{ status }}</p>
        </section>
      </aside>

      <aside class="selected-preview">
        <header class="preview-header">
          <small>{{
            scriptName || $t("modals.scriptCreator.status.untitled")
          }}</small>
          <h3>{{ $t("modals.scriptCreator.selectedTitle") }}</h3>
          <span>{{ totalSelected }}/{{ totalExpected }}</span>
        </header>
        <section
          v-for="team in teamOrder"
          :key="team"
          class="selected-section"
          :class="{ collapsed: isPreviewCollapsed(team) }"
        >
          <button
            type="button"
            class="selected-heading"
            :class="team"
            @click="togglePreviewTeam(team)"
          >
            <font-awesome-icon icon="chevron-down" />
            <span>{{ teamLabel(team) }}</span>
            <span>{{ selectedCount(team) }}/{{ expectedCount(team) }}</span>
          </button>
          <div
            v-if="!isPreviewCollapsed(team) && selectedRoleGroups[team].length"
            class="selected-list"
          >
            <div
              v-for="role in selectedRoleGroups[team]"
              :key="role.id"
              class="selected-role"
            >
              <img
                v-if="role.icon"
                class="role-icon"
                :src="role.icon"
                :alt="role.displayName"
                @error="markIconFailed(role.id)"
              />
              <span v-else class="role-icon role-icon-empty">
                {{ role.displayName.slice(0, 1) }}
              </span>
              <span class="role-copy">
                <strong>{{ role.displayName }}</strong>
                <small>{{ role.displayAbility }}</small>
              </span>
            </div>
          </div>
          <p v-else-if="!isPreviewCollapsed(team)" class="empty-team">
            {{ $t("modals.scriptCreator.emptyTeam") }}
          </p>
        </section>
      </aside>
    </div>
  </Modal>
</template>

<script>
import Modal from "./Modal";
import { getAuthSession } from "@/services/auth";
import { listKnowledgeRoles } from "@/services/knowledgeRoles";
import { mapMutations, mapState } from "vuex";

const {
  DEFAULT_ROLE_COUNTS,
  TEAM_ORDER,
  buildScriptJson,
  canExportScript,
  normalizeRoleCounts,
  randomRoleSelection,
  selectedRolesByTeam,
  validateRoleSelection,
} = require("@/utils/scriptCreator");

function normalizeRoleTeam(value) {
  const text = String(value || "").toLowerCase();
  if (!text) return "";
  if (text.includes("townsfolk") || text.includes("镇民")) return "townsfolk";
  if (text.includes("outsider") || text.includes("外来者")) return "outsider";
  if (text.includes("minion") || text.includes("爪牙")) return "minion";
  if (text.includes("demon") || text.includes("恶魔")) return "demon";
  if (
    text.includes("traveler") ||
    text.includes("traveller") ||
    text.includes("旅行者")
  ) {
    return "traveler";
  }
  if (text.includes("fabled") || text.includes("传奇角色")) return "fabled";
  return TEAM_ORDER.includes(value) ? value : "";
}

export default {
  components: {
    Modal,
  },
  data() {
    return {
      scriptName: "",
      authorName: "",
      roleCounts: normalizeRoleCounts(DEFAULT_ROLE_COUNTS),
      searchText: "",
      selectedRoles: selectedRolesByTeam(),
      status: "",
      knowledgeRoles: [],
      loadingRoles: false,
      roleLoadError: "",
      failedIconIds: [],
      collapsedPreviewTeams: {},
    };
  },
  computed: {
    ...mapState(["modals"]),
    teamOrder() {
      return TEAM_ORDER;
    },
    allRoles() {
      return this.knowledgeRoles.map((role) => ({
        ...role,
        displayName: role.name || role.displayName,
        displayAbility: role.ability || role.displayAbility || "",
        team: normalizeRoleTeam(
          role.team || role.roleType || role.category || role.type,
        ),
        icon: this.failedIconIds.includes(role.id)
          ? ""
          : role.iconUrl || role.image,
      }));
    },
    groupedRoles() {
      return TEAM_ORDER.reduce((groups, team) => {
        groups[team] = this.allRoles
          .filter((role) => role.team === team)
          .sort((a, b) => a.displayName.localeCompare(b.displayName));
        return groups;
      }, {});
    },
    filteredGroupedRoles() {
      const keyword = this.searchText.toLowerCase();
      if (!keyword) return this.groupedRoles;
      return TEAM_ORDER.reduce((groups, team) => {
        groups[team] = this.groupedRoles[team].filter((role) =>
          [
            role.id,
            role.name,
            role.englishName,
            role.displayName,
            role.displayAbility,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(keyword),
        );
        return groups;
      }, {});
    },
    roleById() {
      return this.allRoles.reduce((map, role) => {
        map[role.id] = role;
        return map;
      }, {});
    },
    selectedRoleGroups() {
      return TEAM_ORDER.reduce((groups, team) => {
        groups[team] = this.selectedRoles[team]
          .map((id) => this.roleById[id])
          .filter(Boolean);
        return groups;
      }, {});
    },
    validationErrors() {
      return validateRoleSelection(this.selectedRoles, this.roleCounts);
    },
    validationText() {
      return this.validationErrors
        .map((item) =>
          this.$t("modals.scriptCreator.validation.teamCount", {
            team: this.teamLabel(item.team),
            expected: item.expected,
            actual: item.actual,
          }),
        )
        .join(" / ");
    },
    scriptJson() {
      return buildScriptJson({
        name: this.scriptName,
        author: this.authorName,
        selectedRoles: this.selectedRoles,
        roleById: this.roleById,
      });
    },
    generatedJson() {
      return JSON.stringify(this.scriptJson, null, 2);
    },
    normalizedRoleCounts() {
      return normalizeRoleCounts(this.roleCounts);
    },
    totalExpected() {
      return TEAM_ORDER.reduce(
        (total, team) => total + this.expectedCount(team),
        0,
      );
    },
    totalSelected() {
      return TEAM_ORDER.reduce(
        (total, team) => total + this.selectedCount(team),
        0,
      );
    },
    canGenerate() {
      return (
        !this.loadingRoles &&
        !this.roleLoadError &&
        this.allRoles.length > 0 &&
        this.validationErrors.length === 0
      );
    },
  },
  watch: {
    "modals.scriptCreator"(visible) {
      if (visible) {
        this.status = "";
        this.loadKnowledgeRoles();
      }
    },
    roleCounts: {
      deep: true,
      handler() {
        this.status = "";
      },
    },
    selectedRoles: {
      deep: true,
      handler() {
        this.status = "";
      },
    },
    allRoles() {
      this.pruneMissingRoles();
    },
  },
  methods: {
    teamLabel(team) {
      return this.$t(`modals.scriptCreator.teams.${team}`);
    },
    selectedCount(team) {
      return this.selectedRoles[team].length;
    },
    expectedCount(team) {
      return this.normalizedRoleCounts[team] || 0;
    },
    isPreviewCollapsed(team) {
      return !!this.collapsedPreviewTeams[team];
    },
    togglePreviewTeam(team) {
      this.collapsedPreviewTeams = {
        ...this.collapsedPreviewTeams,
        [team]: !this.collapsedPreviewTeams[team],
      };
    },
    sanitizeRoleCounts() {
      this.roleCounts = normalizeRoleCounts(this.roleCounts);
    },
    async loadKnowledgeRoles() {
      if (this.loadingRoles || this.knowledgeRoles.length) return;
      this.loadingRoles = true;
      this.roleLoadError = "";
      try {
        this.knowledgeRoles = await listKnowledgeRoles();
      } catch (error) {
        this.roleLoadError =
          error.message || this.$t("modals.scriptCreator.status.loadFailed");
      } finally {
        this.loadingRoles = false;
      }
    },
    markIconFailed(roleId) {
      if (!this.failedIconIds.includes(roleId)) {
        this.failedIconIds = this.failedIconIds.concat(roleId);
      }
    },
    pruneMissingRoles() {
      const roleIds = new Set(this.allRoles.map((role) => role.id));
      TEAM_ORDER.forEach((team) => {
        this.selectedRoles[team] = this.selectedRoles[team].filter((id) =>
          roleIds.has(id),
        );
      });
    },
    randomizeSelection() {
      this.sanitizeRoleCounts();
      this.selectedRoles = randomRoleSelection(this.allRoles, this.roleCounts);
      this.status = "";
    },
    ensureCanExport() {
      if (canExportScript(getAuthSession())) return true;
      this.openModalOverlay("login");
      return false;
    },
    async copy() {
      if (!this.canGenerate || !this.ensureCanExport()) return;
      await navigator.clipboard.writeText(this.generatedJson);
      this.status = this.$t("modals.scriptCreator.status.copied");
    },
    download() {
      if (!this.canGenerate || !this.ensureCanExport()) return;
      const blob = new Blob([this.generatedJson], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename = (this.scriptName || "custom-script")
        .trim()
        .replace(/[\\/:*?"<>|]+/g, "-");
      link.href = url;
      link.download = `${filename || "custom-script"}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.status = this.$t("modals.scriptCreator.status.downloaded");
    },
    ...mapMutations(["openModalOverlay", "toggleModal"]),
  },
};
</script>

<style lang="scss" scoped>
@import "../../vars.scss";

.script-creator {
  ::v-deep .modal {
    max-width: min(1240px, calc(100vw - 1.5em));
    color: #dcc4a1;
    border: 2px solid #3d2e26;
    background: radial-gradient(
        circle at 50% 0%,
        rgba(92, 26, 22, 0.26),
        transparent 28%
      ),
      linear-gradient(180deg, rgba(24, 18, 15, 0.96), rgba(9, 7, 6, 0.96)),
      #120f0e;
    box-shadow:
      0 22px 58px rgba(0, 0, 0, 0.72),
      inset 0 1px 0 rgba(255, 236, 190, 0.05);
    font-family: "STKaiti", "KaiTi", "STSong", "SimSun", serif;
    font-size: 0.86em;
  }
}

.script-workspace {
  display: grid;
  grid-template-columns: minmax(520px, 0.58fr) minmax(360px, 0.42fr);
  gap: 0;
  min-height: 0;
  height: min(90vh, 860px);
}

.creator-controls,
.selected-preview {
  min-height: 0;
  overflow: hidden;
}

.creator-controls {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr) auto;
  overflow: hidden;
  border-right: 1px solid rgba(124, 94, 70, 0.5);
  background: rgba(18, 15, 13, 0.42);
}

.creator-header,
.preview-header {
  margin: 0.45em;
  padding: 0.32em 0.52em 0.42em;
  border: 1px solid #3d2e26;
  border-bottom: 3px double #4a3b32;
  background: rgba(18, 15, 13, 0.74);
  box-shadow: inset 0 1px 0 rgba(255, 236, 190, 0.05);

  small {
    display: block;
    color: #b8a082;
    font-size: 0.72em;
    line-height: 1.2;
  }

  h3 {
    margin: 0.1em 0 0;
    color: #d4af37;
    font-size: 1.12em;
    letter-spacing: 0.08em;
    line-height: 1.1;
    overflow: hidden;
    text-align: left;
    text-overflow: ellipsis;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9);
    white-space: nowrap;
  }
}

.control-group {
  margin: 0 0.45em 0.42em;
  padding: 0;
  border: 1px solid #3d2e26;
  border-radius: 2px;
  background: rgba(18, 15, 13, 0.68);
  box-shadow: inset 0 1px 0 rgba(255, 236, 190, 0.04);
  overflow: hidden;
}

.role-pool-group {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.control-group-title {
  min-height: 1.68em;
  margin: 0;
  padding: 0.28em 0.46em;
  color: #d4af37;
  border-bottom: 1px solid #3d2e26;
  background: #120f0e;
  font-size: 0.76em;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.2;
}

.script-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0.38em;
  padding: 0.28em;

  label {
    display: grid;
    gap: 0.14em;
    color: #b8a082;
    font-size: 0.72em;
  }
}

.count-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.28em;
  padding: 0.28em;
}

.count-control {
  display: grid;
  gap: 0.12em;
  color: #b8a082;
  font-size: 0.68em;

  span {
    font-weight: 700;
  }
}

.script-fields input,
.count-control input,
.role-search {
  box-sizing: border-box;
  width: 100%;
  min-height: 1.62em;
  padding: 0.14em 0.4em;
  color: #f7f0df;
  border: 1px solid #3d2e26;
  border-radius: 2px;
  background: rgba(5, 4, 4, 0.62);
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.58);
  font-family: inherit;
  outline: none;

  &:focus {
    border-color: rgba(212, 175, 55, 0.82);
  }
}

.role-search {
  margin: 0.28em;
  width: calc(100% - 0.56em);
}

.role-browser {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 0 0.28em 0.28em;
}

.role-section {
  margin-bottom: 0.55em;

  h4 {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    gap: 0.5em;
    margin: 0;
    padding: 0.34em 0.45em;
    border: 1px solid #3d2e26;
    background: #120f0e;
    box-shadow: inset 0 1px 0 rgba(255, 236, 190, 0.04);
    font-size: 0.82em;
    letter-spacing: 0.04em;
  }
}

.role-option {
  display: grid;
  grid-template-columns: 1.35em 3.1em minmax(0, 1fr);
  gap: 0.48em;
  align-items: center;
  min-height: 4.85em;
  padding: 0.45em 0.35em;
  border-right: 1px solid #261d19;
  border-bottom: 1px solid #261d19;
  border-left: 1px solid #261d19;
  background: rgba(16, 13, 11, 0.68);
  cursor: pointer;

  &:nth-of-type(even) {
    background: rgba(12, 9, 8, 0.68);
  }

  &.selected {
    border-color: rgba(212, 175, 55, 0.42);
    background: rgba(92, 66, 4, 0.24);
    box-shadow: inset 2px 0 0 #d4af37;
  }

  input {
    width: 1em;
    height: 1em;
    margin: 0;
  }
}

.role-icon {
  display: grid;
  place-items: center;
  width: 2.75em;
  height: 2.75em;
  object-fit: contain;
}

.role-icon-empty {
  border: 1px solid #3d2e26;
  background: rgba(5, 4, 4, 0.45);
  color: #c0a88a;
  font-weight: 700;
}

.role-state {
  margin: 0.4em 0 0.8em;
  color: #c0a88a;
}

.role-state-compact {
  margin: 0.45em 0.5em 0.6em;
  color: #8c7b67;
  font-size: 0.84em;
}

.role-copy {
  strong,
  small {
    display: block;
    min-width: 0;
  }

  strong {
    color: #fff8e7;
    line-height: 1.25;
  }

  small {
    margin-top: 0.18em;
    color: #c0a88a;
    line-height: 1.28;
  }
}

.selected-preview {
  display: flex;
  flex-direction: column;
  overflow: auto;
  background: rgba(5, 4, 4, 0.26);
}

.preview-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 0.5em;

  small,
  h3 {
    grid-column: 1;
  }

  span {
    grid-column: 2;
    grid-row: 1 / span 2;
    align-self: center;
    color: #d4af37;
    font-weight: 700;
  }
}

.selected-preview > .selected-section {
  flex: 0 0 auto;
  margin: 0 0.45em 0.42em;
  padding: 0;
  border: 1px solid #3d2e26;
  border-radius: 2px;
  background: rgba(18, 15, 13, 0.68);
  box-shadow: inset 0 1px 0 rgba(255, 236, 190, 0.04);
  overflow: hidden;
}

.selected-section {
  min-height: 0;
}

.selected-heading {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  width: 100%;
  gap: 0.45em;
  min-height: 1.68em;
  margin: 0;
  padding: 0.28em 0.46em;
  border: 0;
  border-bottom: 1px solid #3d2e26;
  background: #120f0e;
  font-family: inherit;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-align: left;
  cursor: pointer;

  svg {
    font-size: 0.74em;
    transition: transform 0.18s ease;
  }
}

.selected-section.collapsed .selected-heading {
  margin-bottom: 0;

  svg {
    transform: rotate(-90deg);
  }
}

.selected-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  padding: 0.28em;
}

.selected-role {
  display: grid;
  grid-template-columns: 2.7em minmax(0, 1fr);
  gap: 0.5em;
  align-items: start;
  min-height: 0;
  padding: 0.42em 0.45em;
  border-bottom: 1px solid #261d19;
  background: rgba(16, 13, 11, 0.68);

  &:nth-child(even) {
    background: rgba(12, 9, 8, 0.68);
  }

  &:last-child {
    border-bottom: 0;
  }

  .role-icon {
    width: 2.3em;
    height: 2.3em;
  }

  .role-copy {
    overflow: hidden;

    strong {
      font-size: 0.95em;
    }

    small {
      display: -webkit-box;
      overflow: hidden;
      font-size: 0.78em;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  }
}

.empty-team {
  margin: 0;
  padding: 0.45em 0.5em 0.6em;
  color: #8c7b67;
  font-size: 0.88em;
  text-align: center;
}

.creator-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.22em;
  margin-bottom: 0.45em;
  padding: 0.28em;

  .status {
    grid-column: 1 / -1;
  }
}

button.button {
  min-width: 0;
  min-height: 1.58em;
  margin: 0;
  padding: 0 0.3em;
  color: #dcc4a1;
  border: 1px solid #3d2e26;
  border-radius: 2px;
  background: #1d1816;
  box-shadow: inset 0 1px 0 rgba(255, 236, 190, 0.04);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: inherit;
  font-size: 0.76em;

  &:hover {
    color: #fff8e7;
    border-color: #6b4a18;
    background: #2a1c09;
  }

  &:disabled {
    color: #7f705f;
    border-color: #2b211d;
    background: #15110f;
    cursor: not-allowed;
    opacity: 0.58;
  }

  &.demon {
    color: #fff8e7;
    border-color: #8b6508;
    background: linear-gradient(#8b6508, #5c4204);
  }
}

.validation,
.status {
  display: flex;
  align-items: flex-start;
  gap: 0.35em;
  margin: 0.28em;
  padding: 0.32em 0.42em;
  border: 1px solid rgba(212, 175, 55, 0.45);
  background: rgba(92, 66, 4, 0.24);
  font-size: 0.76em;
  color: #f2c46d;
  line-height: 1.35;
}

.townsfolk {
  color: $townsfolk;
}

.outsider {
  color: $outsider;
}

.minion {
  color: $minion;
}

.demon {
  color: $demon;
}

.traveler {
  color: $traveler;
}

.fabled {
  color: $fabled;
}

@media (max-width: 880px) {
  .script-workspace {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) minmax(10em, 0.42fr);
    height: min(88vh, 840px);
  }

  .creator-controls {
    border-right: 0;
    border-bottom: 1px solid rgba(124, 94, 70, 0.5);
    overflow: hidden;
  }

  .selected-preview {
    overflow: auto;
  }

  .role-browser {
    max-height: none;
  }

  .creator-actions,
  .selected-list {
    grid-template-columns: 1fr;
  }

  .count-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .script-fields {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .selected-list {
    grid-template-columns: 1fr;
  }
}
</style>
