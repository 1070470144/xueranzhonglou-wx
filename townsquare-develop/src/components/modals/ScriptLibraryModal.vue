<template>
  <div>
    <Modal class="my-script-modal" v-if="modals.scriptLibrary" @close="close">
      <div class="my-script-shell">
        <header class="my-script-header">
          <div>
            <small>{{ $t("myScripts.libraryHint") }}</small>
            <h3>{{ $t("myScripts.libraryTitle") }}</h3>
          </div>
          <button type="button" class="button demon" @click="openUploadPanel">
            <font-awesome-icon icon="file-upload" />
            {{ $t("myScripts.upload") }}
          </button>
        </header>

        <Modal
          class="script-upload-submodal"
          v-if="showUpload"
          @close="closeUploadPanel"
        >
          <section class="my-script-section upload-panel">
            <div class="section-title">
              <span>{{ $t("myScripts.uploadTitle") }}</span>
            </div>

            <div class="cover-list">
              <div
                v-for="(image, index) in selectedImages"
                :key="image.preview"
                class="cover-item"
              >
                <img :src="image.preview" :alt="image.file.name" />
                <button type="button" @click="removeImage(index)">
                  <font-awesome-icon icon="times" />
                </button>
              </div>
              <button
                v-if="selectedImages.length < 3"
                type="button"
                class="cover-picker"
                @click="$refs.coverInput.click()"
              >
                <font-awesome-icon icon="image" />
                {{ $t("myScripts.addImage") }}
              </button>
            </div>
            <input
              ref="coverInput"
              class="hidden-input"
              type="file"
              accept="image/*"
              multiple
              @change="handleCoverFiles"
            />

            <div class="upload-grid">
              <label>
                <span>{{ $t("myScripts.scriptType") }}</span>
                <select v-model="scriptType">
                  <option value="推理">{{ $t("myScripts.reasoning") }}</option>
                  <option value="娱乐">{{ $t("myScripts.fun") }}</option>
                </select>
              </label>
              <label>
                <span>{{ $t("myScripts.jsonFile") }}</span>
                <button
                  type="button"
                  class="button"
                  @click="$refs.jsonInput.click()"
                >
                  <font-awesome-icon icon="file-code" />
                  {{ jsonFileName || $t("myScripts.chooseJson") }}
                </button>
                <input
                  ref="jsonInput"
                  class="hidden-input"
                  type="file"
                  accept=".json,application/json"
                  @change="handleJsonFile"
                />
              </label>
            </div>

            <div v-if="uploadError" class="state-line error">
              {{ uploadError }}
            </div>
            <div v-if="uploadSuccess" class="state-line success">
              {{ uploadSuccess }}
            </div>
            <div class="button-row">
              <button
                type="button"
                class="button demon"
                :disabled="submitting"
                @click="submitUpload"
              >
                <font-awesome-icon
                  :icon="submitting ? 'spinner' : 'file-upload'"
                  :spin="submitting"
                />
                {{
                  submitting
                    ? $t("myScripts.submitting")
                    : $t("myScripts.submit")
                }}
              </button>
            </div>
          </section>
        </Modal>

        <div class="search-row">
          <font-awesome-icon icon="search" />
          <input
            v-model="searchText"
            type="search"
            :placeholder="$t('myScripts.searchPlaceholder')"
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

        <section class="script-list" @scroll="handleScroll">
          <div v-if="loading && !scripts.length" class="state-line">
            <font-awesome-icon icon="spinner" spin />
            {{ $t("myScripts.loading") }}
          </div>
          <div v-else-if="error && !scripts.length" class="state-line error">
            {{ error }}
          </div>
          <button
            v-else
            v-for="script in scripts"
            :key="script.id || script._id"
            type="button"
            class="script-card"
            @click="openDetail(script)"
          >
            <span class="script-cover" :style="scriptCoverStyle(script)">
              <font-awesome-icon
                v-if="!getScriptImage(script)"
                icon="theater-masks"
              />
            </span>
            <span class="script-content">
              <span class="script-title">{{
                script.title || script.name
              }}</span>
              <span class="script-author">
                {{ script.author || $t("myScripts.unknownAuthor") }}
              </span>
              <span v-if="script.description" class="script-description">
                {{ script.description }}
              </span>
              <span class="script-meta">{{ getScriptMeta(script) }}</span>
            </span>
          </button>
          <button
            v-if="!loading && hasMore && scripts.length"
            type="button"
            class="state-line load-more-button"
            @click="loadNext"
          >
            {{ $t("myScripts.loadMore") }}
          </button>
          <div v-if="loading && scripts.length" class="state-line">
            <font-awesome-icon icon="spinner" spin />
            {{ $t("myScripts.loading") }}
          </div>
          <div v-if="!loading && !error && !scripts.length" class="state-line">
            {{ $t("myScripts.empty") }}
          </div>
          <div v-if="error && scripts.length" class="state-line error">
            {{ error }}
          </div>
        </section>
      </div>
    </Modal>

    <Modal
      class="script-detail-submodal"
      v-if="detailScript"
      @close="closeDetail"
    >
      <section class="my-script-section detail-panel">
        <div class="section-title">
          <span>{{ detailScript.title || detailScript.name }}</span>
        </div>
        <div class="section-subtitle">
          {{ $t("myScripts.scriptImages") }}
        </div>
        <div v-if="getScriptImages(detailScript).length" class="detail-gallery">
          <img
            v-for="image in getScriptImages(detailScript)"
            :key="image"
            :src="image"
            :alt="detailScript.title || detailScript.name"
          />
        </div>
        <div v-else class="state-line compact">
          {{ $t("myScripts.noImages") }}
        </div>
        <div class="detail-layout">
          <div class="detail-copy">
            <strong>{{
              detailScript.author || $t("myScripts.unknownAuthor")
            }}</strong>
            <p>
              {{ detailScript.description || $t("myScripts.noDescription") }}
            </p>
            <small>{{ getScriptMeta(detailScript) }}</small>
            <div class="detail-actions">
              <button
                type="button"
                class="mini-action"
                @click="toggleLike(detailScript)"
              >
                {{
                  detailScript.isLiked
                    ? $t("myScripts.liked")
                    : $t("myScripts.like")
                }}
              </button>
              <button
                type="button"
                class="mini-action"
                @click="toggleFavorite(detailScript)"
              >
                {{
                  detailScript.isFavorited
                    ? $t("myScripts.favorited")
                    : $t("myScripts.favorite")
                }}
              </button>
            </div>
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
  </div>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import Modal from "./Modal";
import {
  favoriteScript,
  getPublicScriptList,
  getScriptDetail,
  likeScript,
  uploadScriptCoverImage,
  uploadUserScript,
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
      scripts: [],
      page: 1,
      pageSize: 12,
      total: 0,
      hasMore: true,
      searchText: "",
      searchTimer: null,
      loading: false,
      error: "",
      showUpload: false,
      selectedImages: [],
      jsonFileText: "",
      jsonFileName: "",
      scriptType: "推理",
      submitting: false,
      uploadError: "",
      uploadSuccess: "",
      detailScript: null,
      openCharacterGroups: {},
    };
  },
  computed: mapState(["modals"]),
  watch: {
    "modals.scriptLibrary"(visible) {
      if (visible) this.refresh();
      else this.cleanupPreviews();
    },
  },
  beforeDestroy() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.cleanupPreviews();
  },
  methods: {
    close() {
      this.showUpload = false;
      this.closeDetail();
      this.closeModal("scriptLibrary");
    },
    isLoggedIn() {
      return !!getAuthSession().token;
    },
    requireLogin() {
      if (this.isLoggedIn()) return true;
      this.openModalOverlay("login");
      return false;
    },
    queueSearch() {
      if (this.searchTimer) clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(this.refresh, 300);
    },
    async refresh() {
      if (!this.modals.scriptLibrary || this.loading) return;
      this.page = 1;
      this.total = 0;
      this.hasMore = true;
      this.scripts = [];
      await this.loadScripts();
    },
    async loadScripts() {
      if (this.loading) return;
      this.loading = true;
      this.error = "";
      try {
        const res = await getPublicScriptList({
          page: this.page,
          pageSize: this.pageSize,
          q: this.searchText.trim(),
        });
        if (!res || !res.success || !res.data) {
          throw new Error(
            (res && res.message) || this.$t("myScripts.loadFailed"),
          );
        }
        const list = (res.data.list || []).map((item) => ({
          ...item,
          id: item.id || item._id,
        }));
        this.scripts = this.page === 1 ? list : this.scripts.concat(list);
        this.total = Number(res.data.total) || this.scripts.length;
        this.hasMore = this.scripts.length < this.total && list.length > 0;
      } catch (error) {
        this.error = this.resolveError(error, this.$t("myScripts.loadFailed"));
      } finally {
        this.loading = false;
      }
    },
    loadNext() {
      if (this.loading || !this.hasMore) return;
      this.page += 1;
      this.loadScripts();
    },
    handleScroll(event) {
      const el = event.currentTarget;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
        this.loadNext();
      }
    },
    openUploadPanel() {
      if (!this.requireLogin()) return;
      this.showUpload = true;
      this.uploadError = "";
      this.uploadSuccess = "";
    },
    closeUploadPanel() {
      this.showUpload = false;
    },
    handleCoverFiles(event) {
      const files = Array.from(event.target.files || []).slice(
        0,
        3 - this.selectedImages.length,
      );
      files.forEach((file) => {
        this.selectedImages.push({
          file,
          preview: URL.createObjectURL(file),
        });
      });
      event.target.value = "";
    },
    removeImage(index) {
      const image = this.selectedImages.splice(index, 1)[0];
      if (image && image.preview) URL.revokeObjectURL(image.preview);
    },
    cleanupPreviews() {
      this.selectedImages.forEach((image) => {
        if (image.preview) URL.revokeObjectURL(image.preview);
      });
      this.selectedImages = [];
    },
    handleJsonFile(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      this.jsonFileName = file.name || "script.json";
      const reader = new FileReader();
      reader.onload = () => {
        this.jsonFileText = String(reader.result || "");
      };
      reader.onerror = () => {
        this.uploadError = this.$t("myScripts.readJsonFailed");
      };
      reader.readAsText(file);
      event.target.value = "";
    },
    parseJsonData() {
      const raw = String(this.jsonFileText || "").replace(/^\uFEFF/, "");
      if (!raw.trim()) throw new Error(this.$t("myScripts.jsonRequired"));
      let data = JSON.parse(raw);
      if (typeof data === "string") {
        const inner = data.trim().replace(/^\uFEFF/, "");
        if (inner[0] === "{" || inner[0] === "[") data = JSON.parse(inner);
      }
      if (Array.isArray(data)) {
        const meta =
          data.find(
            (item) => item && item.id === "_meta" && typeof item === "object",
          ) || {};
        data = {
          title: meta.name || meta.title || this.fileTitle(),
          name: meta.name || meta.title || this.fileTitle(),
          author: meta.author || this.$t("myScripts.unknownAuthor"),
          description: meta.description || "",
          content: data,
          characters: data,
          rawFormat: "clocktower-script-array",
        };
      }
      if (!data || typeof data !== "object") {
        throw new Error(this.$t("myScripts.jsonObjectRequired"));
      }
      if (!data.title && data.name) data.title = String(data.name).trim();
      if (!data.title && this.fileTitle()) data.title = this.fileTitle();
      if (!data.title) throw new Error(this.$t("myScripts.titleRequired"));
      data.tag = this.scriptType;
      data.genre = this.scriptType;
      data.category = this.scriptType;
      return data;
    },
    fileTitle() {
      return String(this.jsonFileName || "")
        .replace(/\.json$/i, "")
        .trim();
    },
    async submitUpload() {
      if (this.submitting || !this.requireLogin()) return;
      this.uploadError = "";
      this.uploadSuccess = "";
      let jsonData;
      try {
        jsonData = this.parseJsonData();
      } catch (error) {
        this.uploadError = this.resolveError(
          error,
          this.$t("myScripts.invalidJson"),
        );
        return;
      }
      this.submitting = true;
      try {
        const images = [];
        for (const image of this.selectedImages) {
          const url = await uploadScriptCoverImage(image.file);
          if (url) images.push(url);
        }
        const res = await uploadUserScript({
          jsonData,
          images,
          scriptType: this.scriptType,
        });
        if (!res || !res.success) {
          throw new Error(
            (res && res.message) || this.$t("myScripts.uploadFailed"),
          );
        }
        this.uploadSuccess = this.$t("myScripts.uploaded");
        this.jsonFileText = "";
        this.jsonFileName = "";
        this.cleanupPreviews();
        this.refresh();
      } catch (error) {
        this.uploadError = this.resolveError(
          error,
          this.$t("myScripts.uploadFailed"),
        );
      } finally {
        this.submitting = false;
      }
    },
    async openDetail(script) {
      const id = script && (script.id || script._id);
      if (!id) return;
      this.openCharacterGroups = {};
      this.detailScript = script;
      try {
        const res = await getScriptDetail(id);
        const detail = res && res.success && res.data && res.data.script;
        if (detail) this.detailScript = { ...script, ...detail, id };
      } catch (error) {
        this.error = this.resolveError(
          error,
          this.$t("myScripts.loadDetailFailed"),
        );
      }
    },
    async toggleLike(script) {
      if (!this.requireLogin()) return;
      const nextLiked = !script.isLiked;
      try {
        const res = await likeScript(
          script.id || script._id,
          nextLiked ? "like" : "unlike",
        );
        if (!res || !res.success) throw new Error(res && res.message);
        script.isLiked = nextLiked;
        if (res.data && typeof res.data.likes === "number") {
          script.likes = res.data.likes;
        }
      } catch (error) {
        this.error = this.resolveError(
          error,
          this.$t("myScripts.actionFailed"),
        );
      }
    },
    async toggleFavorite(script) {
      if (!this.requireLogin()) return;
      const nextFavorited = !script.isFavorited;
      try {
        const res = await favoriteScript(
          script.id || script._id,
          nextFavorited ? "favorite" : "unfavorite",
        );
        if (!res || !res.success) throw new Error(res && res.message);
        script.isFavorited = nextFavorited;
      } catch (error) {
        this.error = this.resolveError(
          error,
          this.$t("myScripts.actionFailed"),
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
    scriptCoverStyle(script) {
      const image = this.getScriptImage(script);
      return image ? { backgroundImage: `url(${image})` } : {};
    },
    getScriptMeta(script) {
      const parts = [];
      if (script.version) parts.push(`v${script.version}`);
      if (script.likes || script.likes === 0) {
        parts.push(this.$t("myScripts.likes", { count: script.likes }));
      }
      if (script.usageCount || script.usageCount === 0) {
        parts.push(this.$t("myScripts.uses", { count: script.usageCount }));
      }
      return parts.join(" / ");
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
      this.detailScript = null;
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

.my-script-modal,
.script-upload-submodal,
.script-detail-submodal {
  ::v-deep .modal > .top-right-buttons > .top-right-button:first-child {
    display: none;
  }
}

.my-script-modal {
  ::v-deep .modal {
    width: min(1040px, calc(100vw - 2em));
    max-width: min(1040px, calc(100vw - 2em));
    height: min(86vh, 720px);
    max-height: min(86vh, 720px);
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

.script-upload-submodal,
.script-detail-submodal {
  ::v-deep .modal {
    width: min(760px, calc(100vw - 2em));
    max-width: min(760px, calc(100vw - 2em));
    height: auto;
    max-height: min(86vh, 720px);
  }

  ::v-deep .modal > .slot {
    display: block;
    overflow: auto;
  }
}

.my-script-shell {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 0.52em;
  width: 100%;
  min-height: 0;
}

.my-script-header {
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

.my-script-header small {
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
.refresh-button,
.mini-action,
.cover-picker {
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
.refresh-button:hover,
.mini-action:hover,
.cover-picker:hover {
  color: #fff8e7;
  border-color: #6b4a18;
  background: #2a1c09;
}

.button.demon {
  color: #fff8e7;
  border-color: #8b6508;
  background: linear-gradient(#8b6508, #5c4204);
}

.button:disabled {
  opacity: 0.55;
  cursor: default;
}

.compact {
  min-height: 1.55em;
  font-size: 0.78em;
}

.my-script-section,
.search-row,
.script-list {
  border: 1px solid #3d2e26;
  background: rgba(18, 15, 13, 0.62);
}

.upload-panel,
.detail-panel {
  padding: 0.5em;
}

.cover-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35em;
  margin: 0.5em 0;
}

.cover-item,
.cover-picker {
  width: 5.5em;
  height: 4.2em;
}

.cover-item {
  border: 1px solid #3d2e26;
  background: #0d0b0a;
}

.cover-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-item button {
  position: absolute;
  right: 0.1em;
  top: 0.1em;
  color: #fff8e7;
  border: 0;
  background: rgba(0, 0, 0, 0.62);
}

.cover-picker {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2em;
}

.hidden-input {
  display: none;
}

.upload-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45em;
}

label {
  display: grid;
  gap: 0.25em;
  min-width: 0;
  color: #b8a082;
  font-size: 0.82em;
}

select,
textarea {
  min-width: 0;
  color: #f7f0df;
  border: 1px solid #3d2e26;
  background: rgba(5, 4, 4, 0.62);
  font-family: inherit;
}

textarea {
  resize: vertical;
  padding: 0.45em;
}

.button-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.45em;
}

.detail-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(6.5em, 1fr));
  gap: 0.45em;
  padding-top: 0.5em;
}

.detail-gallery img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border: 1px solid #3d2e26;
  background: rgba(5, 4, 4, 0.62);
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

.script-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(17em, 1fr));
  gap: 0.45em;
  align-content: start;
  min-height: 0;
  overflow-y: auto;
  padding: 0.5em;
}

.script-card {
  display: grid;
  grid-template-columns: 3.9em minmax(0, 1fr);
  gap: 0.45em;
  min-height: 5.3em;
  padding: 0.42em;
  color: #dcc4a1;
  border: 1px solid #3d2e26;
  background: rgba(16, 13, 11, 0.72);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}

.script-card:hover {
  color: #fff8e7;
  background: #201b19;
}

.script-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.25em;
  height: 3.25em;
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

.script-content {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.script-title {
  color: #fff8e7;
  font-weight: 700;
}

.script-title,
.script-author,
.script-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.script-author,
.script-meta {
  color: #b8a082;
  font-size: 0.72em;
}

.script-description {
  display: -webkit-box;
  margin: 0.22em 0;
  color: #c0a88a;
  font-size: 0.76em;
  line-height: 1.25;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.detail-actions {
  grid-column: 1 / -1;
  display: flex;
  gap: 0.35em;
  margin-top: 0.5em;
}

.mini-action {
  min-height: 1.55em;
  font-size: 0.72em;
}

.state-line {
  grid-column: 1 / -1;
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

.success {
  color: #d4af37;
}

@media (max-width: 640px) {
  .upload-grid,
  .character-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .script-list {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
