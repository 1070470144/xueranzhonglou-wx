<template>
  <div>
    <Modal class="my-upload-modal" v-if="modals.myUploads" @close="close">
      <div class="my-upload-shell">
        <header class="my-upload-header">
          <div>
            <small>{{ $t("myScripts.myUploadsHint") }}</small>
            <h3>{{ $t("myScripts.myUploadsTitle") }}</h3>
          </div>
        </header>

        <div class="search-row">
          <font-awesome-icon icon="search" />
          <input
            v-model="searchText"
            type="search"
            :placeholder="$t('myScripts.searchMinePlaceholder')"
            @input="queueSearch"
          />
          <button
            type="button"
            class="refresh-button"
            :disabled="loading"
            @click="refresh"
          >
            <font-awesome-icon icon="sync-alt" :spin="loading" />
          </button>
        </div>

        <section class="upload-list" @scroll="handleScroll">
          <div v-if="loading && !uploads.length" class="state-line">
            <font-awesome-icon icon="spinner" spin />
            {{ $t("myScripts.loading") }}
          </div>
          <div v-else-if="error && !uploads.length" class="state-line error">
            {{ error }}
          </div>
          <article
            v-else
            v-for="script in uploads"
            :key="script.id || script._id"
            class="upload-card"
          >
            <span class="script-cover" :style="scriptCoverStyle(script)">
              <font-awesome-icon
                v-if="!getScriptImage(script)"
                icon="theater-masks"
              />
            </span>
            <div class="upload-content">
              <div class="upload-title-row">
                <strong>{{ script.title || script.name }}</strong>
                <span class="status-tag" :class="statusClass(script)">
                  {{ statusText(script) }}
                </span>
              </div>
              <span>{{ script.author || $t("myScripts.unknownAuthor") }}</span>
              <p
                v-if="isRejected(script) && script.reviewReason"
                class="reject-reason"
              >
                {{ script.reviewReason }}
              </p>
              <p v-else-if="script.description">{{ script.description }}</p>
              <div class="card-actions">
                <button
                  type="button"
                  class="button compact"
                  @click="openDetail(script)"
                >
                  {{ $t("myScripts.view") }}
                </button>
                <button
                  type="button"
                  class="button compact danger"
                  @click="removeUpload(script)"
                >
                  <font-awesome-icon icon="trash-alt" />
                  {{ $t("common.remove") }}
                </button>
              </div>
            </div>
          </article>

          <button
            v-if="!loading && hasMore && uploads.length"
            type="button"
            class="state-line load-more-button"
            @click="loadNext"
          >
            {{ $t("myScripts.loadMore") }}
          </button>
          <div v-if="loading && uploads.length" class="state-line">
            <font-awesome-icon icon="spinner" spin />
            {{ $t("myScripts.loading") }}
          </div>
          <div v-if="!loading && !error && !uploads.length" class="state-line">
            {{ $t("myScripts.noUploads") }}
          </div>
          <div v-if="error && uploads.length" class="state-line error">
            {{ error }}
          </div>
        </section>
      </div>
    </Modal>

    <Modal
      class="my-upload-detail-submodal"
      v-if="detailScript"
      @close="closeDetail"
    >
      <section class="my-upload-section detail-panel">
        <div class="section-title">
          <span>{{ detailScript.title || detailScript.name }}</span>
        </div>
        <div class="section-subtitle">
          {{ $t("myScripts.scriptImages") }}
        </div>
        <div v-if="getScriptImages(detailScript).length" class="detail-gallery">
          <div
            v-for="(image, index) in getScriptImages(detailScript)"
            :key="image"
            class="detail-image-item"
          >
            <button
              type="button"
              class="detail-image-button"
              :title="$t('myScripts.openImage')"
              @click="openImagePreview(image, index)"
            >
              <img
                :src="image"
                :alt="detailScript.title || detailScript.name"
              />
            </button>
            <button
              type="button"
              class="image-download-button"
              @click.stop="downloadScriptImage(image, index)"
            >
              <font-awesome-icon icon="download" />
              <span>{{ $t("myScripts.downloadImage") }}</span>
            </button>
          </div>
        </div>
        <div v-else class="state-line compact">
          {{ $t("myScripts.noImages") }}
        </div>
        <div class="detail-layout">
          <div class="detail-copy">
            <strong>{{
              detailScript.author || $t("myScripts.unknownAuthor")
            }}</strong>
            <span class="status-tag" :class="statusClass(detailScript)">
              {{ statusText(detailScript) }}
            </span>
            <p
              v-if="isRejected(detailScript) && detailScript.reviewReason"
              class="reject-reason"
            >
              {{ detailScript.reviewReason }}
            </p>
            <p>
              {{ detailScript.description || $t("myScripts.noDescription") }}
            </p>
          </div>
        </div>
        <section class="character-section">
          <div class="section-subtitle">
            {{ $t("myScripts.scriptCharacters") }}
          </div>
          <div
            v-if="hasScriptCharacters(detailScript)"
            class="character-groups"
          >
            <div
              v-for="group in characterGroupList(detailScript)"
              :key="group.key"
              class="character-group"
            >
              <button
                type="button"
                class="character-group-title"
                :class="{ open: isCharacterGroupOpen(group.key) }"
                :aria-expanded="isCharacterGroupOpen(group.key)"
                @click="toggleCharacterGroup(group.key)"
              >
                <span>{{ group.label }} ({{ group.characters.length }})</span>
                <font-awesome-icon
                  class="group-toggle-icon"
                  icon="chevron-down"
                />
              </button>
              <div
                v-if="isCharacterGroupOpen(group.key)"
                class="character-list"
              >
                <article
                  v-for="character in group.characters"
                  :key="`${group.key}-${character.id || character.name}`"
                  class="character-card"
                >
                  <span class="character-icon">
                    <img
                      v-if="character.icon"
                      :src="character.icon"
                      :alt="character.name"
                    />
                    <span v-else>{{ firstCharacter(character.name) }}</span>
                  </span>
                  <span class="character-copy">
                    <strong>{{ character.name }}</strong>
                    <small v-if="character.skills.length">
                      {{ character.skills.join("。") }}
                    </small>
                  </span>
                </article>
              </div>
            </div>
          </div>
          <div v-else class="state-line compact">
            {{ $t("myScripts.noCharacters") }}
          </div>
        </section>
      </section>
    </Modal>

    <Modal
      class="my-upload-image-preview-submodal"
      v-if="previewImage"
      @close="closeImagePreview"
    >
      <section class="image-preview-panel">
        <img
          :src="previewImage"
          :alt="detailScript && (detailScript.title || detailScript.name)"
        />
        <button
          type="button"
          class="button image-preview-download"
          @click="downloadScriptImage(previewImage, previewImageIndex)"
        >
          <font-awesome-icon icon="download" />
          <span>{{ $t("myScripts.downloadImage") }}</span>
        </button>
      </section>
    </Modal>
  </div>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import Modal from "./Modal";
import {
  deleteMyUploadedScript,
  getMyUploadedScriptDetail,
  getMyUploadedScripts,
} from "@/services/scripts";
import { getAuthSession } from "@/services/auth";
import rolesJSON from "@/roles.json";

const ROLE_BY_ID = new Map(rolesJSON.map((role) => [role.id, role]));
const CHARACTER_GROUPS = [
  ["townsfolk", "teamTownsfolk"],
  ["outsiders", "teamOutsider"],
  ["minions", "teamMinion"],
  ["demons", "teamDemon"],
  ["travelers", "teamTraveler"],
  ["fabled", "teamFabled"],
  ["other", "teamOther"],
];

export default {
  components: { Modal },
  data() {
    return {
      uploads: [],
      page: 1,
      pageSize: 10,
      total: 0,
      hasMore: true,
      searchText: "",
      searchTimer: null,
      loading: false,
      error: "",
      detailScript: null,
      previewImage: "",
      previewImageIndex: 0,
      detailLoadToken: 0,
      openCharacterGroups: {},
    };
  },
  computed: mapState(["modals"]),
  watch: {
    "modals.myUploads"(visible) {
      if (visible) this.refresh();
    },
  },
  beforeDestroy() {
    window.removeEventListener("townsquare-auth-change", this.handleAuthChange);
    if (this.searchTimer) clearTimeout(this.searchTimer);
  },
  mounted() {
    window.addEventListener("townsquare-auth-change", this.handleAuthChange);
  },
  methods: {
    close() {
      this.closeDetail();
      this.closeModal("myUploads");
    },
    requireLogin() {
      if (getAuthSession().token) return true;
      this.openModalOverlay("login");
      return false;
    },
    handleAuthChange() {
      if (this.modals.myUploads) this.refresh();
    },
    queueSearch() {
      if (this.searchTimer) clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(this.refresh, 300);
    },
    async refresh() {
      if (!this.modals.myUploads || this.loading || !this.requireLogin())
        return;
      this.page = 1;
      this.total = 0;
      this.hasMore = true;
      this.uploads = [];
      await this.loadUploads();
    },
    async loadUploads() {
      if (this.loading) return;
      this.loading = true;
      this.error = "";
      try {
        const res = await getMyUploadedScripts({
          page: this.page,
          pageSize: this.pageSize,
          q: this.searchText.trim(),
        });
        if (!res || !res.success || !res.data) {
          throw new Error(
            (res && res.message) || this.$t("myScripts.loadMineFailed"),
          );
        }
        const list = (res.data.list || []).map((item) => ({
          ...item,
          id: item.id || item._id,
        }));
        this.uploads = this.page === 1 ? list : this.uploads.concat(list);
        this.total = Number(res.data.total) || this.uploads.length;
        this.hasMore = this.uploads.length < this.total && list.length > 0;
      } catch (error) {
        this.error = this.resolveError(
          error,
          this.$t("myScripts.loadMineFailed"),
        );
      } finally {
        this.loading = false;
      }
    },
    loadNext() {
      if (this.loading || !this.hasMore) return;
      this.page += 1;
      this.loadUploads();
    },
    handleScroll(event) {
      const el = event.currentTarget;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
        this.loadNext();
      }
    },
    async openDetail(script) {
      const id = script && (script.id || script._id);
      if (!id) return;
      const loadToken = ++this.detailLoadToken;
      this.openCharacterGroups = {};
      this.closeImagePreview();
      this.detailScript = script;
      try {
        const res = await getMyUploadedScriptDetail(id);
        const detail = res && res.success && res.data && res.data.script;
        if (
          detail &&
          loadToken === this.detailLoadToken &&
          this.detailScript &&
          (this.detailScript.id || this.detailScript._id) === id
        ) {
          this.detailScript = { ...script, ...detail, id };
        }
      } catch (error) {
        if (loadToken !== this.detailLoadToken) return;
        this.error = this.resolveError(
          error,
          this.$t("myScripts.loadDetailFailed"),
        );
      }
    },
    async removeUpload(script) {
      const id = script && (script.id || script._id);
      if (!id) return;
      if (!confirm(this.$t("myScripts.confirmDelete"))) return;
      const before = this.uploads.slice();
      this.uploads = this.uploads.filter(
        (item) => (item.id || item._id) !== id,
      );
      try {
        const res = await deleteMyUploadedScript(id);
        if (!res || !res.success) {
          throw new Error(
            (res && res.message) || this.$t("myScripts.deleteFailed"),
          );
        }
        if (
          this.detailScript &&
          (this.detailScript.id || this.detailScript._id) === id
        ) {
          this.closeDetail();
        }
      } catch (error) {
        this.uploads = before;
        this.error = this.resolveError(
          error,
          this.$t("myScripts.deleteFailed"),
        );
      }
    },
    getScriptImage(script) {
      return this.getScriptImages(script)[0] || "";
    },
    getScriptImages(script) {
      const images = [];
      const addImage = (image) => {
        if (!image) return;
        if (typeof image === "string") {
          images.push(image);
          return;
        }
        if (typeof image !== "object") return;
        const url =
          image.url ||
          image.fileId ||
          image.fileID ||
          image.path ||
          image.src ||
          image.thumbnail ||
          image.tempFilePath;
        if (url) images.push(url);
      };
      [
        script && script.thumbnails,
        script && script.thumbnail,
        script && script.images,
        script && script.coverImages,
        script && script.covers,
      ].forEach((value) => {
        if (Array.isArray(value)) value.forEach(addImage);
        else addImage(value);
      });
      return Array.from(new Set(images.filter(Boolean)));
    },
    openImagePreview(image, index = 0) {
      this.previewImage = image || "";
      this.previewImageIndex = index;
    },
    closeImagePreview() {
      this.previewImage = "";
      this.previewImageIndex = 0;
    },
    imageDownloadName(image, index = 0) {
      const title =
        (this.detailScript &&
          (this.detailScript.title || this.detailScript.name)) ||
        "script";
      const safeTitle = String(title)
        .replace(/[\\/:*?"<>|]+/g, "-")
        .trim();
      const cleanImage = String(image || "")
        .split("?")[0]
        .split("#")[0];
      const extMatch = cleanImage.match(/\.(png|jpe?g|webp|gif|bmp)$/i);
      const ext = extMatch ? extMatch[1].toLowerCase() : "png";
      return `${safeTitle || "script"}-${index + 1}.${ext}`;
    },
    async downloadScriptImage(image, index = 0) {
      if (!image) return;
      const filename = this.imageDownloadName(image, index);
      try {
        const response = await fetch(image, { mode: "cors" });
        if (!response.ok) throw new Error("image download failed");
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 500);
      } catch (error) {
        const link = document.createElement("a");
        link.href = image;
        link.target = "_blank";
        link.rel = "noopener";
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    },
    scriptCoverStyle(script) {
      const image = this.getScriptImage(script);
      return image ? { backgroundImage: `url(${image})` } : {};
    },
    statusText(item) {
      const status = item.reviewStatus || item.status;
      if (
        status === "approved" ||
        item.status === "published" ||
        item.status === "active"
      ) {
        return this.$t("myScripts.statusApproved");
      }
      if (status === "rejected" || item.status === "rejected") {
        return this.$t("myScripts.statusRejected");
      }
      return this.$t("myScripts.statusPending");
    },
    statusClass(item) {
      const status = item.reviewStatus || item.status;
      if (
        status === "approved" ||
        item.status === "published" ||
        item.status === "active"
      ) {
        return "approved";
      }
      if (status === "rejected" || item.status === "rejected")
        return "rejected";
      return "pending";
    },
    isRejected(item) {
      return this.statusClass(item) === "rejected";
    },
    getScriptCharacterSource(script) {
      if (!script) return [];
      const candidates = [
        script.content,
        script.characters,
        script.roles,
        script.players,
        script.jsonData,
        script.data,
        script,
      ];
      for (const candidate of candidates) {
        const parsed = this.parseMaybeJson(candidate);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === "object") {
          const nested =
            parsed.content ||
            parsed.characters ||
            parsed.roles ||
            parsed.players;
          const nestedParsed = this.parseMaybeJson(nested);
          if (Array.isArray(nestedParsed)) return nestedParsed;
        }
      }
      return [];
    },
    parseMaybeJson(value) {
      if (typeof value !== "string") return value;
      const text = value.trim().replace(/^\uFEFF/, "");
      if (!text || !/^[{[]/.test(text)) return value;
      try {
        return JSON.parse(text);
      } catch (error) {
        return value;
      }
    },
    extractSkills(character) {
      if (Array.isArray(character.skills) && character.skills.length) {
        return character.skills.filter(Boolean).map(String);
      }
      if (Array.isArray(character.abilities) && character.abilities.length) {
        return character.abilities.filter(Boolean).map(String);
      }
      if (character.skill) return [String(character.skill)];
      if (character.ability) {
        const ability = String(character.ability);
        const parts = ability
          .split(/[。！？!?；;\n]/)
          .map((item) => item.trim())
          .filter(Boolean);
        return parts.length ? parts : [ability];
      }
      return [];
    },
    normalizeCategory(category) {
      const normalized = String(category || "")
        .toLowerCase()
        .trim();
      const categoryMap = {
        townsfolk: "townsfolk",
        town: "townsfolk",
        villager: "townsfolk",
        镇民: "townsfolk",
        outsider: "outsiders",
        outsiders: "outsiders",
        外来者: "outsiders",
        minion: "minions",
        minions: "minions",
        爪牙: "minions",
        demon: "demons",
        demons: "demons",
        恶魔: "demons",
        traveler: "travelers",
        travelers: "travelers",
        traveller: "travelers",
        travellers: "travelers",
        旅行者: "travelers",
        fabled: "fabled",
        fable: "fabled",
        legendary: "fabled",
        传奇角色: "fabled",
        other: "other",
        unknown: "other",
        其他: "other",
      };
      return categoryMap[normalized] || "other";
    },
    normalizeCharacter(character, index) {
      if (
        character &&
        typeof character === "object" &&
        character.id === "_meta"
      ) {
        return null;
      }
      const id =
        typeof character === "string"
          ? character
          : String((character && character.id) || "").trim();
      const role = id ? ROLE_BY_ID.get(id) : null;
      if (typeof character === "string") {
        return {
          id,
          name: (role && role.name) || character,
          icon: (role && (role.icon || role.image || role.avatar)) || "",
          skills: role ? this.extractSkills(role) : [],
          category: this.normalizeCategory(role && role.team),
        };
      }
      if (!character || typeof character !== "object") return null;
      const name =
        character.name ||
        character.title ||
        character.role ||
        (role && role.name) ||
        id ||
        `${this.$t("myScripts.teamOther")} ${index + 1}`;
      return {
        id: id || name,
        name,
        icon:
          character.icon ||
          character.image ||
          character.avatar ||
          (role && (role.icon || role.image || role.avatar)) ||
          "",
        skills: this.extractSkills({ ...(role || {}), ...character }),
        category: this.normalizeCategory(
          character.team ||
            character.category ||
            character.type ||
            character.roleType ||
            (role && role.team),
        ),
      };
    },
    characterGroups(script) {
      const grouped = CHARACTER_GROUPS.reduce((acc, [key]) => {
        acc[key] = [];
        return acc;
      }, {});
      this.getScriptCharacterSource(script).forEach((character, index) => {
        const normalized = this.normalizeCharacter(character, index);
        if (!normalized) return;
        const key = grouped[normalized.category]
          ? normalized.category
          : "other";
        grouped[key].push(normalized);
      });
      return grouped;
    },
    characterGroupList(script) {
      const groups = this.characterGroups(script);
      return CHARACTER_GROUPS.map(([key, labelKey]) => ({
        key,
        label: this.$t(`myScripts.${labelKey}`),
        characters: groups[key] || [],
      })).filter((group) => group.characters.length);
    },
    hasScriptCharacters(script) {
      return this.characterGroupList(script).length > 0;
    },
    isCharacterGroupOpen(key) {
      return this.openCharacterGroups[key] === true;
    },
    toggleCharacterGroup(key) {
      this.$set(this.openCharacterGroups, key, !this.isCharacterGroupOpen(key));
    },
    closeDetail() {
      this.detailLoadToken += 1;
      this.detailScript = null;
      this.previewImage = "";
      this.openCharacterGroups = {};
    },
    firstCharacter(name) {
      return (
        String(name || "?")
          .trim()
          .slice(0, 1) || "?"
      );
    },
    resolveError(error, fallback) {
      const message = String((error && error.message) || error || "");
      if (/uniCloud web config is not configured/.test(message)) {
        return this.$t("login.missingUniCloudConfig");
      }
      if (/failed to fetch|network|timeout/i.test(message)) {
        return this.$t("login.networkError");
      }
      return message.replace(/^\[script-service\]:\s*/, "") || fallback;
    },
    ...mapMutations(["closeModal", "openModalOverlay"]),
  },
};
</script>

<style scoped lang="scss">
@import "../../vars.scss";

.my-upload-modal,
.my-upload-detail-submodal,
.my-upload-image-preview-submodal {
  ::v-deep .modal > .top-right-buttons > .top-right-button:first-child {
    display: none;
  }
}

.my-upload-modal {
  ::v-deep .modal {
    width: min(960px, calc(100vw - 2em));
    max-width: min(960px, calc(100vw - 2em));
    height: min(84vh, 680px);
    max-height: min(84vh, 680px);
    color: #dcc4a1;
    border: 2px solid #3d2e26;
    background: radial-gradient(
        circle at 50% 0%,
        rgba(92, 26, 22, 0.22),
        transparent 28%
      ),
      linear-gradient(180deg, rgba(24, 18, 15, 0.96), rgba(9, 7, 6, 0.96)),
      #120f0e;
    font-family: "STKaiti", "KaiTi", "STSong", "SimSun", serif;
  }

  ::v-deep .modal > .slot {
    display: flex;
    min-height: 0;
    overflow: hidden;
  }
}

.my-upload-detail-submodal {
  ::v-deep .modal {
    width: min(760px, calc(100vw - 2em));
    max-width: min(760px, calc(100vw - 2em));
    height: auto;
    max-height: min(86vh, 720px);
  }

  ::v-deep .modal > .top-right-buttons {
    top: 0.85em;
    right: 1.1em;
  }

  ::v-deep .modal > .slot {
    display: block;
    padding: 1.75em 1em 1em;
    overflow: auto;
  }
}

.my-upload-shell {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 0.52em;
  width: 100%;
  min-height: 0;
}

.my-upload-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  align-items: center;
  gap: 0.5em;
  padding: 0.45em 0.55em;
  border: 1px solid #3d2e26;
  border-bottom: 3px double #4a3b32;
  background: rgba(18, 15, 13, 0.78);
}

.section-title {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  gap: 0.5em;
  color: #fff8e7;
  font-weight: 700;
}

.my-upload-header small {
  color: #b8a082;
}

h3 {
  margin: 0.08em 0 0;
  color: #d4af37;
  font-size: 1.12em;
  text-align: left;
  letter-spacing: 0.08em;
}

.button,
.refresh-button {
  min-height: 1.9em;
  margin: 0;
  padding: 0 0.5em;
  color: #dcc4a1;
  border: 1px solid #3d2e26;
  border-radius: 2px;
  background: #1d1816;
  cursor: pointer;
  font-family: inherit;
}

.button:hover,
.refresh-button:hover {
  color: #fff8e7;
  border-color: #6b4a18;
  background: #2a1c09;
}

.button.demon {
  color: #fff8e7;
  border-color: #8b6508;
  background: linear-gradient(#8b6508, #5c4204);
}

.button.danger {
  color: #f1c0b6;
  border-color: #5c241f;
}

.compact {
  min-height: 1.55em;
  font-size: 0.78em;
}

.my-upload-section,
.search-row,
.upload-list {
  border: 1px solid #3d2e26;
  background: rgba(18, 15, 13, 0.62);
}

.detail-panel {
  padding: 0.5em;
}

.detail-layout {
  padding-top: 0.55em;
}

.detail-copy {
  min-width: 0;
}

.detail-copy p {
  margin: 0.35em 0;
  color: #c0a88a;
  line-height: 1.35;
}

.detail-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(6.5em, 1fr));
  gap: 0.45em;
  padding-top: 0.5em;
}

.detail-image-item {
  display: grid;
  gap: 0.28em;
  min-width: 0;
}

.detail-image-button {
  display: block;
  width: 100%;
  padding: 0;
  color: inherit;
  border: 0;
  background: transparent;
  cursor: zoom-in;
  font: inherit;
}

.detail-image-button img {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border: 1px solid #3d2e26;
  background: rgba(5, 4, 4, 0.62);
}

.image-download-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 0.28em 0.45em;
  color: #fff2c4;
  border: 1px solid rgba(170, 123, 36, 0.62);
  background: rgba(43, 30, 19, 0.72);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.72em;
  gap: 0.32em;
}

.image-download-button:hover,
.image-preview-download:hover {
  color: #ffffff;
  border-color: rgba(226, 183, 77, 0.9);
  background: rgba(83, 58, 27, 0.82);
}

.my-upload-image-preview-submodal {
  ::v-deep .modal {
    width: min(92vw, 980px);
    max-width: min(92vw, 980px);
    height: auto;
    max-height: 92vh;
    color: #dcc4a1;
    border: 2px solid #3d2e26;
    background: radial-gradient(
        circle at 50% 0%,
        rgba(83, 58, 27, 0.46),
        transparent 34%
      ),
      rgba(12, 9, 8, 0.97);
  }

  ::v-deep .modal > .slot {
    width: 100%;
    max-height: calc(92vh - 3.2em);
    overflow: auto;
  }
}

.image-preview-panel {
  display: grid;
  justify-items: center;
  gap: 0.75em;
  padding: 0.6em;
}

.image-preview-panel img {
  display: block;
  max-width: 100%;
  max-height: 72vh;
  object-fit: contain;
  border: 1px solid #3d2e26;
  background: rgba(5, 4, 4, 0.62);
}

.image-preview-download {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35em;
  min-width: 8em;
}

.section-subtitle {
  margin: 0.65em 0 0.35em;
  color: #fff8e7;
  font-size: 0.86em;
  font-weight: 700;
}

.character-section {
  margin-top: 0.2em;
}

.character-groups {
  display: grid;
  gap: 0.55em;
}

.character-group {
  border: 1px solid #3d2e26;
  background: rgba(8, 7, 6, 0.38);
}

.character-group-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 2.2em;
  padding: 0.35em 0.5em;
  color: #d4af37;
  border: 0;
  border-bottom: 1px solid #3d2e26;
  background: rgba(92, 66, 4, 0.16);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.78em;
  text-align: left;
}

.character-group-title:hover {
  color: #fff8e7;
  background: rgba(92, 66, 4, 0.26);
}

.group-toggle-icon {
  flex: 0 0 auto;
  margin-left: 0.6em;
  transition: transform 0.16s ease;
}

.character-group-title.open .group-toggle-icon {
  transform: rotate(180deg);
}

.character-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(14em, 1fr));
  gap: 0.4em;
  padding: 0.45em;
}

.character-card {
  display: grid;
  grid-template-columns: 2.6em minmax(0, 1fr);
  gap: 0.4em;
  min-width: 0;
  padding: 0.35em;
  border: 1px solid rgba(61, 46, 38, 0.8);
  background: rgba(16, 13, 11, 0.64);
}

.character-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.35em;
  height: 2.35em;
  overflow: hidden;
  color: #fff8e7;
  border: 1px solid #3d2e26;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba($townsfolk, 0.48),
    rgba($demon, 0.5)
  );
  font-weight: 700;
}

.character-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.character-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.15em;
}

.character-copy strong {
  color: #fff8e7;
  font-size: 0.82em;
}

.character-copy small {
  color: #b8a082;
  font-size: 0.72em;
  line-height: 1.28;
}

.search-row {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr) max-content;
  align-items: center;
  gap: 0.42em;
  min-height: 2.35em;
  padding: 0.34em 0.5em;
}

.search-row input {
  min-width: 0;
  color: #fff8e7;
  border: 0;
  outline: 0;
  background: transparent;
  font: inherit;
}

.refresh-button {
  width: 2em;
}

.upload-list {
  display: grid;
  gap: 0.45em;
  align-content: start;
  min-height: 0;
  padding: 0.5em;
  overflow-y: auto;
}

.upload-card {
  display: grid;
  grid-template-columns: 4.1em minmax(0, 1fr);
  gap: 0.5em;
  padding: 0.42em;
  border: 1px solid #3d2e26;
  background: rgba(16, 13, 11, 0.72);
}

.script-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.35em;
  height: 3.35em;
  color: rgba(255, 248, 231, 0.75);
  border: 1px solid #3d2e26;
  background: linear-gradient(
    145deg,
    rgba($townsfolk, 0.7),
    rgba($demon, 0.62)
  );
  background-position: center;
  background-size: cover;
}

.script-cover.large {
  width: 6.6em;
  height: 6.6em;
}

.upload-content {
  min-width: 0;
}

.upload-title-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  gap: 0.5em;
  align-items: center;
}

.upload-title-row strong,
.upload-content span,
.upload-content p {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.upload-title-row strong {
  color: #fff8e7;
  white-space: nowrap;
}

.upload-content span,
.upload-content p {
  color: #b8a082;
  font-size: 0.76em;
}

.upload-content p {
  display: -webkit-box;
  margin: 0.25em 0;
  line-height: 1.25;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.reject-reason {
  color: #e8b2a6 !important;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  min-height: 1.45em;
  padding: 0 0.45em;
  border: 1px solid #3d2e26;
  color: #d4af37;
  background: rgba(92, 66, 4, 0.24);
  font-size: 0.7em;
  white-space: nowrap;
}

.status-tag.approved {
  color: #d8e7ba;
  background: rgba(53, 88, 48, 0.22);
}

.status-tag.rejected {
  color: #f1c0b6;
  background: rgba(92, 26, 22, 0.3);
}

.card-actions {
  display: flex;
  gap: 0.35em;
  margin-top: 0.35em;
}

.state-line {
  padding: 1em 0.5em;
  color: #c0a88a;
  text-align: center;
}

.state-line.compact {
  padding: 0.5em;
  border: 1px dashed #3d2e26;
  background: rgba(5, 4, 4, 0.24);
}

.load-more-button {
  width: 100%;
}

.error {
  color: $demon;
}

@media (max-width: 640px) {
  .character-list,
  .upload-card {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
