<template>
  <div>
    <Modal class="role-library-modal" v-if="modals.roleLibrary" @close="close">
      <div class="role-library-shell">
        <header class="role-library-header">
          <div>
            <small>{{ $t("roleLibrary.hint") }}</small>
            <h3>{{ $t("roleLibrary.title") }}</h3>
          </div>
          <button type="button" class="button demon" @click="openCreatePanel">
            <font-awesome-icon icon="plus-circle" />
            {{ $t("roleLibrary.create") }}
          </button>
        </header>

        <div class="search-row">
          <font-awesome-icon icon="search" />
          <input
            v-model="searchText"
            type="search"
            :placeholder="$t('roleLibrary.searchPlaceholder')"
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

        <div class="filter-grid">
          <div class="filter-row">
            <button
              v-for="source in sourceFilters"
              :key="source"
              type="button"
              :class="{ active: sourceFilter === source }"
              @click="switchSource(source)"
            >
              {{ sourceLabel(source) }}
            </button>
          </div>
          <div class="filter-row teams">
            <button
              v-for="team in teamFilters"
              :key="team"
              type="button"
              :class="{ active: teamFilter === team }"
              @click="teamFilter = team"
            >
              {{ teamLabel(team) }}
            </button>
          </div>
        </div>

        <section class="role-list" @scroll="handleScroll">
          <div v-if="loading && !allLoadedRoles.length" class="state-line">
            <font-awesome-icon icon="spinner" spin />
            {{ $t("roleLibrary.loading") }}
          </div>
          <div
            v-else-if="error && !allLoadedRoles.length"
            class="state-line error"
          >
            {{ error }}
          </div>
          <button
            v-for="role in visibleRoles"
            :key="roleKey(role)"
            type="button"
            class="role-card"
            @click="openDetail(role)"
          >
            <span class="role-icon">
              <img
                v-if="role.icon"
                :src="displayImage(role.icon)"
                :alt="role.displayName"
              />
              <span v-else>{{ firstCharacter(role.displayName) }}</span>
            </span>
            <span class="role-content">
              <span class="role-title">
                <strong>{{ role.displayName }}</strong>
                <em>{{ sourceLabel(role.sourceType) }}</em>
              </span>
              <span class="role-meta">
                {{ teamLabel(role.team) }} / {{ role.roleId || role.id }}
              </span>
              <span v-if="role.displayAbility" class="role-ability">
                {{ role.displayAbility }}
              </span>
            </span>
          </button>
          <button
            v-if="!loading && activeHasMore"
            type="button"
            class="state-line load-more-button"
            @click="loadNext"
          >
            {{ $t("roleLibrary.loadMore") }}
          </button>
          <div v-if="loading && allLoadedRoles.length" class="state-line">
            <font-awesome-icon icon="spinner" spin />
            {{ $t("roleLibrary.loading") }}
          </div>
          <div
            v-if="!loading && !error && !visibleRoles.length"
            class="state-line"
          >
            {{ $t("roleLibrary.empty") }}
          </div>
          <div v-if="error && allLoadedRoles.length" class="state-line error">
            {{ error }}
          </div>
        </section>
      </div>
    </Modal>

    <Modal
      class="role-create-submodal"
      v-if="showCreate"
      @close="closeCreatePanel"
    >
      <section class="role-panel">
        <div class="section-title">
          <span>{{ $t("roleLibrary.createTitle") }}</span>
        </div>
        <div class="create-form">
          <section class="create-section create-basic-section">
            <h4 class="create-section-title">基础信息</h4>
            <div class="create-field-grid">
              <label class="form-field">
                <span>{{ $t("roleLibrary.roleId") }}</span>
                <input v-model="createForm.id" type="text" readonly />
              </label>
              <label class="form-field">
                <span>{{ $t("roleLibrary.roleName") }}</span>
                <input v-model.trim="createForm.name" type="text" />
              </label>
              <label class="form-field">
                <span>{{ $t("roleLibrary.roleTeam") }}</span>
                <select v-model="createForm.team">
                  <option
                    v-for="team in createTeamOptions"
                    :key="team"
                    :value="team"
                  >
                    {{ teamLabel(team) }}
                  </option>
                </select>
              </label>
              <label class="form-field wide">
                <span>{{ $t("roleLibrary.roleAbility") }}</span>
                <textarea v-model.trim="createForm.ability" rows="4"></textarea>
              </label>
            </div>
          </section>

          <section class="create-section create-night-section">
            <h4 class="create-section-title">夜晚信息</h4>
            <div class="create-field-grid">
              <label class="form-field">
                <span>{{ $t("roleLibrary.firstNight") }}</span>
                <input
                  v-model.number="createForm.firstNight"
                  type="number"
                  min="0"
                  step="1"
                />
              </label>
              <label class="form-field">
                <span>{{ $t("roleLibrary.otherNight") }}</span>
                <input
                  v-model.number="createForm.otherNight"
                  type="number"
                  min="0"
                  step="1"
                />
              </label>
              <label class="form-field wide">
                <span>{{ $t("roleLibrary.firstNightReminder") }}</span>
                <textarea
                  v-model.trim="createForm.firstNightReminder"
                  rows="3"
                ></textarea>
              </label>
              <label class="form-field wide">
                <span>{{ $t("roleLibrary.otherNightReminder") }}</span>
                <textarea
                  v-model.trim="createForm.otherNightReminder"
                  rows="3"
                ></textarea>
              </label>
            </div>
          </section>

          <section class="create-section create-media-section">
            <h4 class="create-section-title">
              {{ $t("roleLibrary.roleImage") }}
            </h4>
            <div class="form-field upload-field">
              <div class="form-control-row image-control-row">
                <input v-model.trim="createForm.image" type="url" />
                <label class="upload-button">
                  <font-awesome-icon
                    :icon="createUploadingImage ? 'spinner' : 'image'"
                    :spin="createUploadingImage"
                  />
                  <span>{{ $t("roleLibrary.uploadImage") }}</span>
                  <input
                    type="file"
                    accept="image/*"
                    :disabled="createUploadingImage || creating"
                    @change="handleCreateImageUpload"
                  />
                </label>
              </div>
              <img
                v-if="createForm.image"
                class="create-preview-image"
                :src="displayImage(createForm.image)"
                :alt="createForm.name || createForm.id"
              />
            </div>
          </section>

          <section class="create-section create-token-section">
            <h4 class="create-section-title">
              {{ $t("roleLibrary.roleToken") }}
            </h4>
            <div class="token-grid-header">
              <span>文本</span>
              <span>图片</span>
              <span></span>
            </div>
            <div
              v-for="(token, index) in createForm.smallTokens"
              :key="index"
              class="form-control-row token-row"
            >
              <input
                v-model.trim="createForm.smallTokens[index].name"
                type="text"
                :placeholder="$t('roleLibrary.tokenTextPlaceholder')"
              />
              <input
                v-model.trim="createForm.smallTokens[index].image"
                type="url"
                :placeholder="$t('roleLibrary.tokenImagePlaceholder')"
              />
              <button
                type="button"
                class="remove-token-button"
                :title="$t('common.remove')"
                :disabled="createForm.smallTokens.length <= 1"
                @click="removeCreateToken(index)"
              >
                <font-awesome-icon icon="times" />
              </button>
            </div>
            <div class="token-action-row">
              <button
                type="button"
                class="upload-button"
                @click="addCreateToken"
              >
                <font-awesome-icon icon="plus-circle" />
                <span>{{ $t("roleLibrary.addToken") }}</span>
              </button>
              <label class="upload-button">
                <font-awesome-icon
                  :icon="createUploadingToken ? 'spinner' : 'image'"
                  :spin="createUploadingToken"
                />
                <span>{{ $t("roleLibrary.uploadToken") }}</span>
                <input
                  type="file"
                  accept="image/*"
                  :disabled="createUploadingToken || creating"
                  @change="handleCreateTokenUpload"
                />
              </label>
            </div>
            <div class="create-token-preview-list">
              <img
                v-for="token in compactCreateTokens()"
                :key="token.image"
                class="create-preview-image token"
                :src="displayImage(token.image)"
                :alt="token.name || createForm.name || createForm.id"
              />
            </div>
          </section>
        </div>
        <div v-if="createError" class="state-line error compact">
          {{ createError }}
        </div>
        <div class="button-row">
          <button
            type="button"
            class="button demon"
            :disabled="creating || createUploadingImage || createUploadingToken"
            @click="submitCreate"
          >
            <font-awesome-icon
              :icon="creating ? 'spinner' : 'plus-circle'"
              :spin="creating"
            />
            {{
              creating
                ? $t("roleLibrary.creating")
                : $t("roleLibrary.submitCreate")
            }}
          </button>
        </div>
      </section>
    </Modal>

    <Modal class="role-detail-submodal" v-if="detailRole" @close="closeDetail">
      <section class="role-panel">
        <div class="section-title">
          <span>{{ detailRole.displayName }}</span>
        </div>
        <div class="detail-layout">
          <div class="detail-copy">
            <strong>{{ teamLabel(detailRole.team) }}</strong>
            <p>
              {{ detailRole.displayAbility || $t("roleLibrary.noAbility") }}
            </p>
          </div>
        </div>
        <div
          v-if="
            roleMainImages(detailRole).length ||
            roleSmallTokens(detailRole).length
          "
          class="detail-media"
        >
          <section
            v-if="roleMainImages(detailRole).length"
            class="detail-image-section"
          >
            <h4 class="section-subtitle">{{ $t("roleLibrary.roleImage") }}</h4>
            <div class="detail-image-gallery">
              <div
                v-for="(image, index) in roleMainImages(detailRole)"
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
                    :src="displayImage(image)"
                    :alt="detailRole.displayName"
                  />
                </button>
                <button
                  type="button"
                  class="image-download-button"
                  @click.stop="downloadRoleImage(image, index)"
                >
                  <font-awesome-icon icon="download" />
                  <span>{{ $t("myScripts.downloadImage") }}</span>
                </button>
              </div>
            </div>
          </section>
          <section
            v-if="roleSmallTokens(detailRole).length"
            class="detail-token-section"
          >
            <h4 class="section-subtitle">{{ $t("roleLibrary.roleToken") }}</h4>
            <div class="detail-token-gallery">
              <div
                v-for="(token, index) in roleSmallTokens(detailRole)"
                :key="token.image"
                class="detail-token-item"
              >
                <button
                  type="button"
                  class="detail-token-button"
                  :title="$t('myScripts.openImage')"
                  @click="openImagePreview(token.image, index)"
                >
                  <img
                    :src="displayImage(token.image)"
                    :alt="token.name || detailRole.displayName"
                  />
                </button>
                <strong class="detail-token-name">
                  {{ token.name || detailRole.displayName }}
                </strong>
                <button
                  type="button"
                  class="image-download-button"
                  @click.stop="downloadRoleImage(token.image, index)"
                >
                  <font-awesome-icon icon="download" />
                  <span>{{ $t("myScripts.downloadImage") }}</span>
                </button>
              </div>
            </div>
          </section>
        </div>
        <div v-else class="state-line compact">
          {{ $t("myScripts.noImages") }}
        </div>
      </section>
    </Modal>

    <Modal
      class="role-image-preview-submodal"
      v-if="previewImage"
      @close="closeImagePreview"
    >
      <section class="image-preview-panel">
        <img
          :src="displayImage(previewImage)"
          :alt="detailRole && detailRole.displayName"
        />
        <button
          type="button"
          class="button image-preview-download"
          @click="downloadRoleImage(previewImage, previewImageIndex)"
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
import { listKnowledgeRolesPage } from "@/services/knowledgeRoles";
import {
  createUserRole,
  getMyUploadedRoles,
  uploadScriptCoverImage,
} from "@/services/scripts";
import { getAuthSession } from "@/services/auth";
import { recordRuntimeLog } from "@/utils/runtimeLogger";
import { displayExternalImageUrl } from "@/utils/externalImage";
import {
  ROLE_SOURCE_ALL,
  ROLE_SOURCE_CUSTOM,
  ROLE_SOURCE_OFFICIAL,
  ROLE_TEAM_ORDER,
  normalizeRoleImageArray,
  normalizeRoleForLibrary,
  normalizeRoleTokenArray,
  roleImageList,
  roleMatchesKeyword,
} from "@/utils/roleLibrary";
import { hasMorePagedResults } from "@/utils/rolePagination";

export default {
  components: { Modal },
  data() {
    return {
      sourceFilter: ROLE_SOURCE_ALL,
      teamFilter: "all",
      searchText: "",
      searchTimer: null,
      loading: false,
      error: "",
      officialRoles: [],
      officialPage: 1,
      officialPageSize: 50,
      officialTotal: 0,
      officialHasMore: true,
      customRoles: [],
      customPage: 1,
      customPageSize: 50,
      customTotal: 0,
      customHasMore: true,
      showCreate: false,
      pendingCreate: false,
      createForm: {
        id: "",
        name: "",
        team: "townsfolk",
        ability: "",
        image: "",
        smallTokens: [this.emptyCreateToken()],
        firstNight: 0,
        firstNightReminder: "",
        otherNight: 0,
        otherNightReminder: "",
      },
      createError: "",
      creating: false,
      createUploadingImage: false,
      createUploadingToken: false,
      detailRole: null,
      previewImage: "",
      previewImageIndex: 0,
    };
  },
  computed: {
    ...mapState(["modals"]),
    sourceFilters() {
      return [ROLE_SOURCE_ALL, ROLE_SOURCE_OFFICIAL, ROLE_SOURCE_CUSTOM];
    },
    teamFilters() {
      return ["all"].concat(ROLE_TEAM_ORDER);
    },
    createTeamOptions() {
      return ROLE_TEAM_ORDER;
    },
    allLoadedRoles() {
      if (this.sourceFilter === ROLE_SOURCE_OFFICIAL) return this.officialRoles;
      if (this.sourceFilter === ROLE_SOURCE_CUSTOM) return this.customRoles;
      return this.officialRoles.concat(this.customRoles);
    },
    visibleRoles() {
      return this.allLoadedRoles.filter((role) => {
        const teamMatches =
          this.teamFilter === "all" || role.team === this.teamFilter;
        return teamMatches && roleMatchesKeyword(role, this.searchText);
      });
    },
    activeHasMore() {
      if (this.sourceFilter === ROLE_SOURCE_OFFICIAL)
        return this.officialHasMore;
      if (this.sourceFilter === ROLE_SOURCE_CUSTOM) {
        return this.isLoggedIn() && this.customHasMore;
      }
      return this.officialHasMore || (this.isLoggedIn() && this.customHasMore);
    },
  },
  watch: {
    "modals.roleLibrary"(visible) {
      if (visible) {
        recordRuntimeLog("role_library:open", {
          loggedIn: this.isLoggedIn(),
        });
        this.refresh();
      }
    },
  },
  mounted() {
    window.addEventListener("townsquare-auth-change", this.handleAuthChange);
  },
  beforeDestroy() {
    window.removeEventListener("townsquare-auth-change", this.handleAuthChange);
    if (this.searchTimer) clearTimeout(this.searchTimer);
  },
  methods: {
    close() {
      this.closeCreatePanel();
      this.closeDetail();
      this.closeModal("roleLibrary");
    },
    isLoggedIn() {
      return !!getAuthSession().token;
    },
    handleAuthChange() {
      if (this.pendingCreate && this.isLoggedIn()) {
        this.pendingCreate = false;
        this.resetCreateForm();
        this.showCreate = true;
      }
      if (this.modals.roleLibrary) this.refresh();
    },
    openCreatePanel() {
      if (!this.isLoggedIn()) {
        this.pendingCreate = true;
        this.openModalOverlay("login");
        return;
      }
      this.createError = "";
      this.resetCreateForm();
      this.showCreate = true;
    },
    closeCreatePanel() {
      this.showCreate = false;
      this.pendingCreate = false;
      this.createError = "";
      this.resetCreateForm();
    },
    switchSource(source) {
      if (this.sourceFilter === source) return;
      this.sourceFilter = source;
      this.closeDetail();
      this.refresh();
    },
    queueSearch() {
      recordRuntimeLog("role_library:search", {
        queryLength: this.searchText.trim().length,
        source: this.sourceFilter,
        team: this.teamFilter,
      });
      if (this.searchTimer) clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(this.refresh, 300);
    },
    async refresh() {
      if (!this.modals.roleLibrary || this.loading) return;
      this.error = "";
      this.officialRoles = [];
      this.officialPage = 1;
      this.officialTotal = 0;
      this.officialHasMore = true;
      this.customRoles = [];
      this.customPage = 1;
      this.customTotal = 0;
      this.customHasMore = true;
      await this.loadCurrentSources();
    },
    async loadCurrentSources() {
      if (this.loading) return;
      this.loading = true;
      try {
        const jobs = [];
        if (this.sourceFilter !== ROLE_SOURCE_CUSTOM) {
          jobs.push(this.loadOfficialRoles());
        }
        if (this.sourceFilter !== ROLE_SOURCE_OFFICIAL && this.isLoggedIn()) {
          jobs.push(this.loadCustomRoles());
        }
        await Promise.all(jobs);
      } catch (error) {
        this.error = this.resolveError(
          error,
          this.$t("roleLibrary.loadFailed"),
        );
        recordRuntimeLog("role_library:error", {
          stage: "load",
          message: this.error,
          source: this.sourceFilter,
        });
      } finally {
        this.loading = false;
      }
    },
    async loadOfficialRoles() {
      if (!this.officialHasMore) return;
      const res = await listKnowledgeRolesPage({
        page: this.officialPage,
        pageSize: this.officialPageSize,
        keyword: this.searchText.trim(),
      });
      if (!res || !res.success || !res.data) {
        throw new Error(
          (res && res.message) || this.$t("roleLibrary.loadFailed"),
        );
      }
      const list = (res.data.list || []).map((role) =>
        normalizeRoleForLibrary(role, ROLE_SOURCE_OFFICIAL),
      );
      this.officialRoles =
        this.officialPage === 1 ? list : this.officialRoles.concat(list);
      this.officialTotal = Number(res.data.total) || this.officialRoles.length;
      this.officialHasMore = hasMorePagedResults({
        loadedCount: this.officialRoles.length,
        receivedCount: list.length,
        pageSize: res.data.pageSize || this.officialPageSize,
        total: res.data.total,
      });
    },
    async loadCustomRoles() {
      if (!this.customHasMore) return;
      const res = await getMyUploadedRoles({
        page: this.customPage,
        pageSize: this.customPageSize,
        q: this.searchText.trim(),
      });
      if (!res || !res.success || !res.data) {
        throw new Error(
          (res && res.message) || this.$t("roleLibrary.loadFailed"),
        );
      }
      const list = (res.data.list || []).map((role) =>
        normalizeRoleForLibrary(role, ROLE_SOURCE_CUSTOM),
      );
      this.customRoles =
        this.customPage === 1 ? list : this.customRoles.concat(list);
      this.customTotal = Number(res.data.total) || this.customRoles.length;
      this.customHasMore = hasMorePagedResults({
        loadedCount: this.customRoles.length,
        receivedCount: list.length,
        pageSize: res.data.pageSize || this.customPageSize,
        total: res.data.total,
      });
    },
    async loadNext() {
      if (this.loading || !this.activeHasMore) return;
      this.loading = true;
      try {
        if (this.sourceFilter !== ROLE_SOURCE_CUSTOM && this.officialHasMore) {
          this.officialPage += 1;
          await this.loadOfficialRoles();
        } else if (
          this.sourceFilter !== ROLE_SOURCE_OFFICIAL &&
          this.customHasMore &&
          this.isLoggedIn()
        ) {
          this.customPage += 1;
          await this.loadCustomRoles();
        }
      } catch (error) {
        this.error = this.resolveError(
          error,
          this.$t("roleLibrary.loadFailed"),
        );
        recordRuntimeLog("role_library:error", {
          stage: "load_more",
          message: this.error,
          source: this.sourceFilter,
        });
      } finally {
        this.loading = false;
      }
    },
    handleScroll(event) {
      const el = event.currentTarget;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
        this.loadNext();
      }
    },
    generateCreateRoleId() {
      const time = Date.now().toString(36);
      const rand = Math.random().toString(36).slice(2, 7);
      return `custom-${time}-${rand}`;
    },
    resetCreateForm() {
      this.createForm = {
        id: this.generateCreateRoleId(),
        name: "",
        team: "townsfolk",
        ability: "",
        image: "",
        smallTokens: [this.emptyCreateToken()],
        firstNight: 0,
        firstNightReminder: "",
        otherNight: 0,
        otherNightReminder: "",
      };
      this.createUploadingImage = false;
      this.createUploadingToken = false;
    },
    emptyCreateToken() {
      return { name: "", image: "" };
    },
    normalizeCreateToken(token) {
      if (!token) return null;
      if (typeof token === "string") {
        const image = token.trim();
        return image ? { name: "", image } : null;
      }
      if (typeof token !== "object") return null;
      const name = String(
        token.name || token.label || token.text || token.title || "",
      ).trim();
      const image = String(
        token.image ||
          token.url ||
          token.fileId ||
          token.fileID ||
          token.path ||
          token.src ||
          token.thumbnail ||
          token.tempFilePath ||
          "",
      ).trim();
      return image ? { name, image } : null;
    },
    buildCreateRoleJson() {
      const tokenImages = this.compactCreateTokens();
      const firstTokenImage = (tokenImages[0] && tokenImages[0].image) || "";
      const role = {
        id: String(this.createForm.id || "").trim(),
        name: String(this.createForm.name || "").trim(),
        team: String(this.createForm.team || "").trim(),
        ability: String(this.createForm.ability || "").trim(),
        image: String(this.createForm.image || "").trim(),
        iconUrl: String(this.createForm.image || "").trim(),
        smallTokens: tokenImages,
        tokenImages,
        smallToken: firstTokenImage,
        tokenImage: firstTokenImage,
        tokenUrl: firstTokenImage,
        firstNight: Math.max(
          0,
          Number.parseInt(this.createForm.firstNight, 10) || 0,
        ),
        firstNightReminder: String(
          this.createForm.firstNightReminder || "",
        ).trim(),
        otherNight: Math.max(
          0,
          Number.parseInt(this.createForm.otherNight, 10) || 0,
        ),
        otherNightReminder: String(
          this.createForm.otherNightReminder || "",
        ).trim(),
      };
      if (!role.name) throw new Error(this.$t("roleLibrary.nameRequired"));
      if (!role.team) throw new Error(this.$t("roleLibrary.teamRequired"));
      return role;
    },
    async handleCreateImageUpload(event) {
      await this.handleCreateUpload(event, "image");
    },
    async handleCreateTokenUpload(event) {
      await this.handleCreateUpload(event, "smallTokens");
    },
    async handleCreateUpload(event, field) {
      const input = event && event.target;
      const file = input && input.files && input.files[0];
      if (!file) return;
      const flag =
        field === "smallTokens"
          ? "createUploadingToken"
          : "createUploadingImage";
      this.createError = "";
      this[flag] = true;
      try {
        const url = await uploadScriptCoverImage(file);
        if (field === "smallTokens") {
          const tokens = this.compactCreateTokens().concat({
            name: "",
            image: url,
          });
          this.$set(this.createForm, "smallTokens", tokens);
        } else {
          this.$set(this.createForm, field, url);
        }
      } catch (error) {
        this.createError = this.resolveError(
          error,
          this.$t("roleLibrary.uploadImageFailed"),
        );
        recordRuntimeLog("role_library:error", {
          stage: field === "smallTokens" ? "upload_token" : "upload_image",
          message: this.createError,
        });
      } finally {
        this[flag] = false;
        if (input) input.value = "";
      }
    },
    addCreateToken() {
      this.createForm.smallTokens = this.createForm.smallTokens.concat(
        this.emptyCreateToken(),
      );
    },
    removeCreateToken(index) {
      if (this.createForm.smallTokens.length <= 1) return;
      const tokens = this.createForm.smallTokens.slice();
      tokens.splice(index, 1);
      this.createForm.smallTokens = tokens.length
        ? tokens
        : [this.emptyCreateToken()];
    },
    compactCreateTokens() {
      const seen = new Set();
      return (this.createForm.smallTokens || []).reduce((tokens, token) => {
        const normalized = this.normalizeCreateToken(token);
        if (!normalized || seen.has(normalized.image)) return tokens;
        seen.add(normalized.image);
        tokens.push(normalized);
        return tokens;
      }, []);
    },
    async submitCreate() {
      if (
        this.creating ||
        this.createUploadingImage ||
        this.createUploadingToken
      )
        return;
      if (!this.isLoggedIn()) {
        this.pendingCreate = true;
        this.openModalOverlay("login");
        return;
      }
      this.createError = "";
      let roleJson;
      try {
        roleJson = this.buildCreateRoleJson();
      } catch (error) {
        this.createError = this.resolveError(
          error,
          this.$t("roleLibrary.createFailed"),
        );
        recordRuntimeLog("role_library:error", {
          stage: "validate_create",
          message: this.createError,
        });
        return;
      }
      this.creating = true;
      try {
        const res = await createUserRole(roleJson);
        if (!res || !res.success || !res.data) {
          throw new Error(
            (res && res.message) || this.$t("roleLibrary.createFailed"),
          );
        }
        const role = normalizeRoleForLibrary(res.data.role, ROLE_SOURCE_CUSTOM);
        this.customRoles = [role].concat(this.customRoles);
        this.customTotal += 1;
        this.sourceFilter = ROLE_SOURCE_CUSTOM;
        this.closeCreatePanel();
        this.openDetail(role);
        recordRuntimeLog("role_library:create", {
          roleId: role && (role.docId || role.id || role.roleId),
          team: role && role.team,
          hasImage: !!(role && (role.iconUrl || role.image || role.icon)),
          tokenCount: roleJson.smallTokens.length,
        });
        window.dispatchEvent(new Event("townsquare-user-roles-change"));
      } catch (error) {
        this.createError = this.resolveError(
          error,
          this.$t("roleLibrary.createFailed"),
        );
        recordRuntimeLog("role_library:error", {
          stage: "create",
          message: this.createError,
          team: roleJson && roleJson.team,
        });
      } finally {
        this.creating = false;
      }
    },
    openDetail(role) {
      this.detailRole = role;
      this.closeImagePreview();
    },
    closeDetail() {
      this.detailRole = null;
      this.closeImagePreview();
    },
    roleImages(role) {
      return roleImageList(role);
    },
    displayImage(image) {
      return displayExternalImageUrl(image);
    },
    roleMainImages(role) {
      return normalizeRoleImageArray(
        role && role.iconUrl,
        role && role.image,
        role && role.icon,
        role && role.avatar,
        role && role.images,
        role && role.thumbnails,
      );
    },
    roleSmallTokens(role) {
      return normalizeRoleTokenArray(
        role && role.smallTokens,
        role && role.tokenImages,
        role && role.tokens,
        role && role.smallToken,
        role && role.tokenImage,
        role && role.tokenUrl,
        role && role.token,
      );
    },
    openImagePreview(image, index = 0) {
      this.previewImage = image || "";
      this.previewImageIndex = index;
    },
    closeImagePreview() {
      this.previewImage = "";
      this.previewImageIndex = 0;
    },
    async downloadRoleImage(image, index = 0) {
      if (!image) return;
      const filename = this.roleImageDownloadName(image, index);
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
    roleImageDownloadName(image, index = 0) {
      const title = (this.detailRole && this.detailRole.displayName) || "role";
      const safeTitle = String(title)
        .replace(/[\\/:*?"<>|]+/g, "-")
        .trim();
      const cleanImage = String(image || "")
        .split("?")[0]
        .split("#")[0];
      const extMatch = cleanImage.match(/\.(png|jpe?g|webp|gif|bmp)$/i);
      const ext = extMatch ? extMatch[1].toLowerCase() : "png";
      return `${safeTitle || "role"}-${index + 1}.${ext}`;
    },
    roleKey(role) {
      return `${role.sourceType}:${role.docId || role.id || role.roleId}`;
    },
    sourceLabel(source) {
      return this.$t(`roleLibrary.sources.${source}`);
    },
    teamLabel(team) {
      if (team === "all") return this.$t("roleLibrary.allTeams");
      const labels = {
        townsfolk: "teamTownsfolk",
        outsider: "teamOutsider",
        minion: "teamMinion",
        demon: "teamDemon",
        traveler: "teamTraveler",
        fabled: "teamFabled",
      };
      return this.$t(`myScripts.${labels[team] || "teamOther"}`);
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

.role-library-modal,
.role-create-submodal,
.role-detail-submodal,
.role-image-preview-submodal {
  ::v-deep .modal > .top-right-buttons > .top-right-button:first-child {
    display: none;
  }
}

.role-library-modal {
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

.role-create-submodal,
.role-detail-submodal {
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

.role-library-shell {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
  gap: 0.52em;
  width: 100%;
  min-height: 0;
}

.role-library-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  align-items: center;
  gap: 0.5em;
  padding: 0.45em 0.55em;
  border: 1px solid #3d2e26;
  border-bottom: 3px double #4a3b32;
  background: rgba(18, 15, 13, 0.78);
}

.role-library-header small {
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
.filter-row button {
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
.filter-row button:hover,
.filter-row button.active {
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

.search-row,
.filter-grid,
.role-list,
.role-panel {
  border: 1px solid #3d2e26;
  background: rgba(18, 15, 13, 0.62);
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

.filter-grid {
  display: grid;
  gap: 0.34em;
  padding: 0.38em 0.5em;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3em;
}

.filter-row button {
  min-height: 1.65em;
  font-size: 0.78em;
}

.role-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(17em, 1fr));
  gap: 0.45em;
  align-content: start;
  min-height: 0;
  padding: 0.5em;
  overflow-y: auto;
}

.role-card {
  display: grid;
  grid-template-columns: 3.9em minmax(0, 1fr);
  gap: 0.45em;
  min-height: 5.4em;
  padding: 0.42em;
  color: #dcc4a1;
  border: 1px solid #3d2e26;
  background: rgba(16, 13, 11, 0.72);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}

.role-card:hover {
  color: #fff8e7;
  background: #201b19;
}

.role-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.3em;
  height: 3.3em;
  overflow: hidden;
  color: #fff8e7;
  border: 1px solid #3d2e26;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba($townsfolk, 0.58),
    rgba($demon, 0.56)
  );
  font-size: 0.98em;
  font-weight: 700;
}

.role-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.role-content,
.detail-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.16em;
}

.role-title {
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  gap: 0.35em;
  align-items: center;
}

.role-title strong {
  overflow: hidden;
  color: #fff8e7;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-title em {
  padding: 0 0.38em;
  color: #d4af37;
  border: 1px solid rgba(170, 123, 36, 0.62);
  background: rgba(92, 66, 4, 0.2);
  font-size: 0.68em;
  font-style: normal;
}

.role-meta {
  color: #b8a082;
  font-size: 0.72em;
}

.role-ability {
  display: -webkit-box;
  color: #c0a88a;
  font-size: 0.76em;
  line-height: 1.25;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.role-panel {
  padding: 0.5em;
}

.section-title {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  gap: 0.5em;
  color: #fff8e7;
  font-weight: 700;
}

textarea {
  width: 100%;
  min-width: 0;
  margin-top: 0.5em;
  padding: 0.45em;
  color: #f7f0df;
  border: 1px solid #3d2e26;
  background: rgba(5, 4, 4, 0.62);
  resize: vertical;
  font-family: Consolas, "Courier New", monospace;
}

.create-form {
  display: grid;
  gap: 0.75em;
  padding-top: 0.55em;
}

.create-section {
  display: grid;
  gap: 0.48em;
  min-width: 0;
  padding: 0.48em;
  border: 1px solid #3d2e26;
  background: rgba(5, 4, 4, 0.24);
}

.create-section-title {
  margin: 0;
  color: #fff8e7;
  font-size: 0.8em;
  font-weight: 700;
}

.create-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55em;
}

.form-field {
  display: grid;
  gap: 0.25em;
  min-width: 0;
  color: #dcc4a1;
  font-size: 0.86em;
}

.form-field.wide {
  grid-column: 1 / -1;
}

.form-field > span {
  color: #fff8e7;
  font-weight: 700;
}

.form-field input,
.form-field select,
.form-field textarea,
.token-row input,
.upload-button,
.remove-token-button {
  width: 100%;
  min-width: 0;
  min-height: 1.575em;
  margin: 0;
  padding: 0.1em 0.34em;
  color: #f7f0df;
  border: 1px solid #3d2e26;
  border-radius: 2px;
  outline: 0;
  background: rgba(5, 4, 4, 0.62);
  font: inherit;
}

.form-field input,
.form-field select,
.token-row input,
.upload-button,
.remove-token-button {
  box-sizing: border-box;
  height: 1.575em;
  line-height: 1.2;
}

.form-field input[readonly] {
  color: #b8a082;
  background: rgba(5, 4, 4, 0.38);
}

.form-field textarea {
  min-height: 5.8em;
  resize: vertical;
}

.form-control-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  gap: 0.32em;
  align-items: center;
}

.image-control-row .upload-button {
  width: 7.6em;
}

.token-row,
.token-grid-header {
  display: grid;
  grid-template-columns: minmax(6em, 0.42fr) minmax(0, 1fr) 2.2em;
  gap: 0.32em;
  align-items: center;
}

.token-grid-header {
  color: #b8a082;
  font-size: 0.7em;
  font-weight: 700;
}

.upload-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.42em;
  color: #fff2c4;
  border: 1px solid rgba(170, 123, 36, 0.62);
  background: rgba(43, 30, 19, 0.72);
  cursor: pointer;
  gap: 0.24em;
  white-space: nowrap;
}

.token-action-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.32em;
}

.token-action-row .upload-button {
  width: auto;
}

.remove-token-button {
  padding: 0;
  color: #dcc4a1;
  border: 1px solid #3d2e26;
  background: #1d1816;
  cursor: pointer;
  font: inherit;
  white-space: nowrap;
}

.remove-token-button:disabled {
  opacity: 0.45;
  cursor: default;
}

.upload-button input {
  display: none;
}

.create-token-preview-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.42em;
}

.create-preview-image {
  width: 5.6em;
  height: 5.6em;
  margin-top: 0.42em;
  object-fit: cover;
  border: 1px solid #3d2e26;
  background: rgba(5, 4, 4, 0.62);
}

.create-preview-image.token {
  width: 4.2em;
  height: 4.2em;
  border-radius: 50%;
}

.button-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.45em;
}

.detail-layout {
  padding-top: 0.55em;
}

.detail-copy strong {
  color: #fff8e7;
}

.detail-copy span,
.detail-copy p {
  margin: 0;
  color: #c0a88a;
  line-height: 1.35;
}

.section-subtitle {
  margin: 0.65em 0 0.35em;
  color: #fff8e7;
  font-size: 0.86em;
  font-weight: 700;
}

.detail-media {
  display: grid;
  gap: 0.75em;
  padding-top: 0.65em;
}

.detail-image-section,
.detail-token-section {
  min-width: 0;
}

.detail-image-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(6.5em, 1fr));
  gap: 0.45em;
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

.detail-token-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(5em, 1fr));
  gap: 0.55em;
}

.detail-token-item {
  display: grid;
  min-width: 0;
  justify-items: center;
  gap: 0.32em;
}

.detail-token-button {
  width: 4.35em;
  height: 4.35em;
  padding: 0;
  overflow: hidden;
  color: inherit;
  border: 1px solid #5b4638;
  border-radius: 50%;
  background: rgba(5, 4, 4, 0.62);
  cursor: zoom-in;
  font: inherit;
}

.detail-token-button img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-token-name {
  max-width: 100%;
  overflow-wrap: anywhere;
  color: #fff8e7;
  font-size: 0.78em;
  line-height: 1.2;
  text-align: center;
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

.role-image-preview-submodal {
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

@media (max-width: 640px) {
  .role-library-header,
  .role-card {
    grid-template-columns: minmax(0, 1fr);
  }

  .create-field-grid,
  .form-control-row,
  .token-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .token-grid-header {
    display: none;
  }

  .image-control-row .upload-button,
  .remove-token-button {
    width: 100%;
  }

  .role-list {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
