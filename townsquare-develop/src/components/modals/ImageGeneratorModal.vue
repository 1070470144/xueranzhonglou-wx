<template>
  <Modal
    class="image-generator-modal"
    v-if="modals.imageGenerator"
    @close="toggleModal('imageGenerator')"
  >
    <section class="poster-generator">
      <header class="poster-generator-header">
        <h3>{{ $t("modals.imageGenerator.title") }}</h3>
        <p>{{ $t("modals.imageGenerator.description") }}</p>
      </header>

      <div class="poster-generator-grid">
        <div class="poster-controls">
          <div class="poster-command-grid poster-script-actions">
            <button
              class="button townsfolk script-picker-action"
              type="button"
              @click="chooseScript"
            >
              <font-awesome-icon icon="book" />
              {{ $t("modals.imageGenerator.chooseScript") }}
            </button>
          </div>

          <div class="poster-controls-scroll">
            <section class="poster-control-overview">
              <dl class="poster-control-register">
                <div>
                  <dt>{{ $t("modals.imageGenerator.currentScript") }}</dt>
                  <dd>
                    <strong>{{ currentScriptName }}</strong>
                  </dd>
                </div>
                <div>
                  <dt>
                    {{ $t("modals.imageGenerator.settings.sections.roles") }}
                  </dt>
                  <dd>{{ currentScriptRoleCount }}</dd>
                </div>
              </dl>
            </section>

            <details class="poster-control-group poster-meta-controls" open>
              <summary class="poster-control-group-title">
                {{ $t("modals.imageGenerator.settings.summary") }}
              </summary>
              <div class="poster-field-grid poster-meta-field-grid">
                <label>
                  {{ $t("modals.imageGenerator.fields.topTitle") }}
                  <input
                    v-model="posterTopText"
                    type="text"
                    :placeholder="
                      $t('modals.imageGenerator.fields.topTitlePlaceholder')
                    "
                    @keyup.stop=""
                    @input="redrawPoster"
                  />
                </label>
                <label>
                  {{ $t("modals.imageGenerator.fields.topContent") }}
                  <input
                    v-model="posterTopContent"
                    type="text"
                    :placeholder="
                      $t('modals.imageGenerator.fields.topContentPlaceholder')
                    "
                    @keyup.stop=""
                    @input="redrawPoster"
                  />
                </label>
                <label>
                  {{ $t("modals.imageGenerator.fields.scriptName") }}
                  <input
                    v-model="posterTitleOverride"
                    type="text"
                    :placeholder="
                      $t('modals.imageGenerator.fields.scriptJsonPlaceholder')
                    "
                    @keyup.stop=""
                    @input="redrawPoster"
                  />
                </label>
                <label>
                  {{ $t("modals.imageGenerator.fields.authorName") }}
                  <input
                    v-model="posterAuthorOverride"
                    type="text"
                    :placeholder="
                      $t('modals.imageGenerator.fields.authorJsonPlaceholder')
                    "
                    @keyup.stop=""
                    @input="redrawPoster"
                  />
                </label>
                <label>
                  {{ $t("modals.imageGenerator.fields.posterBackground") }}
                  <select v-model="posterBackgroundId" @change="redrawPoster">
                    <option
                      v-for="option in posterBackgroundOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                </label>
              </div>
            </details>

            <div class="poster-settings-groups">
              <details
                v-for="section in layoutSections"
                :key="section.key"
                class="poster-control-group layout-settings-section"
                open
              >
                <summary class="poster-control-group-title">
                  {{ section.label }}
                </summary>
                <div class="poster-field-grid">
                  <label
                    v-if="section.key === 'glossary'"
                    class="poster-checkbox"
                  >
                    <input
                      v-model="showGlossary"
                      type="checkbox"
                      @change="redrawPoster"
                    />
                    {{ $t("modals.imageGenerator.glossary.toggle") }}
                  </label>
                  <label
                    v-for="control in section.controls"
                    :key="control.key"
                    :class="{ 'poster-checkbox': control.type === 'checkbox' }"
                  >
                    <template v-if="control.type === 'checkbox'">
                      <input
                        v-model="posterLayout[control.key]"
                        type="checkbox"
                        @change="redrawPoster"
                      />
                      {{ control.label }}
                    </template>
                    <template v-else>
                      {{ control.label }}
                      <select
                        v-if="control.type === 'select'"
                        v-model="posterLayout[control.key]"
                        @change="redrawPoster"
                      >
                        <option
                          v-for="option in control.options"
                          :key="option.value"
                          :value="option.value"
                        >
                          {{ option.label }}
                        </option>
                      </select>
                      <input
                        v-else-if="control.type === 'color'"
                        v-model="posterLayout[control.key]"
                        type="color"
                        @input="redrawPoster"
                      />
                      <input
                        v-else
                        v-model.number="posterLayout[control.key]"
                        type="number"
                        :min="control.min"
                        :max="control.max"
                        :step="control.step || 1"
                        @keyup.stop=""
                        @change="redrawPoster"
                      />
                    </template>
                  </label>
                </div>
              </details>
            </div>
          </div>

          <div
            v-if="error || status"
            class="poster-control-messages"
            aria-live="polite"
          >
            <div v-if="error" class="poster-control-alert poster-error error">
              {{ error }}
            </div>
            <div
              v-if="status"
              class="poster-control-alert poster-status success"
            >
              {{ status }}
            </div>
          </div>

          <div class="poster-actions poster-command-grid">
            <button
              class="button townsfolk poster-action-primary"
              type="button"
              :disabled="isPosterPreviewRendering"
              @click="generatePoster"
            >
              <font-awesome-icon icon="image" />
              {{ $t("modals.imageGenerator.actions.preview") }}
            </button>
            <button
              class="button poster-action-secondary"
              type="button"
              :disabled="!posterDataUrl || isServerGenerating"
              @click="downloadPoster"
            >
              <font-awesome-icon icon="download" />
              {{ downloadPosterLabel }}
            </button>
          </div>
        </div>

        <div class="poster-preview">
          <canvas ref="posterCanvas" width="1080" height="1456"></canvas>
          <div
            v-if="isPosterPreviewRendering"
            class="poster-preview-loading"
            aria-live="polite"
          >
            <font-awesome-icon icon="spinner" spin />
            {{ $t("modals.imageGenerator.status.previewGenerating") }}
          </div>
        </div>
      </div>
    </section>
  </Modal>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import Modal from "./Modal";
import {
  SCRIPT_POSTER_TEAMS,
  normalizeCurrentScriptPosterData,
} from "@/services/scriptPoster";
import { getAuthSession } from "@/services/auth";

const POSTER_WIDTH = 1080;
const POSTER_HEIGHT = 1456;
const SCRIPT_POSTER_IMAGE_PROXY = "/api/script-poster-image?url=";
const SCRIPT_POSTER_RENDER_API = "/api/script-poster-render";

function naturalComparePosterBackgrounds(left, right) {
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function getPosterBackgroundDisplayName(fileName) {
  return fileName.replace(/\.[^.]+$/, "");
}

function loadPosterBackgroundOptions() {
  const backgroundContext = require.context(
    "@/assets/script-poster-backgrounds",
    false,
    /\.(png|jpe?g|webp)$/i,
  );
  return backgroundContext
    .keys()
    .sort(naturalComparePosterBackgrounds)
    .map((key) => {
      const fileName = key.replace(/^\.\//, "");
      return {
        value: fileName,
        fileName,
        displayName: getPosterBackgroundDisplayName(fileName),
        src: backgroundContext(key),
      };
    });
}

const POSTER_BACKGROUND_OPTIONS = loadPosterBackgroundOptions();
const DEFAULT_POSTER_BACKGROUND_ID = POSTER_BACKGROUND_OPTIONS[0]?.value || "";
const DEFAULT_POSTER_LAYOUT = {
  teamTitleLeft: 90,
  roleAreaLeft: 90,
  roleAreaTop: 160,
  roleNameAbilityGap: 20,
  headerPanelOffsetX: 140,
  showHeaderPanel: false,
  headerPanelWidth: 380,
  headerPanelHeight: 121,
  headerPanelTitleTop: 32,
  headerPanelContentTop: 72,
  headerTitleOffsetX: 240,
  headerTitleOffsetY: -10,
  titleArtStyle: "classic",
  headerAuthorColor: "#17110d",
  headerAuthorOffsetX: 130,
  headerAuthorOffsetY: 7,
  abilityTextWidth: 300,
  abilityLineHeight: 18,
  roleGap: -10,
  townsfolkRoleGap: -10,
  outsiderRoleGap: -10,
  minionRoleGap: -10,
  demonRoleGap: -10,
  teamGap: 0,
  townsfolkTeamGap: 0,
  outsiderTeamGap: 0,
  minionTeamGap: 0,
  demonTeamGap: 0,
  glossaryBottomOffset: 20,
  roleIconSize: 105,
  roleNameColor: "#0c83a6",
  roleAbilityColor: "#17110d",
  roleNameFontSize: 24,
  roleAbilityFontSize: 15,
  roleAreaTitleGap: 34,
  glossaryTextGap: 44,
  showNightOrder: true,
  nightIconSize: 75,
  nightIconGap: 55,
  nightTop: 532,
  nightTopOffset: 0,
  nightTitleFontSize: 26,
  nightFirstTitleFontSize: 26,
  nightOtherTitleFontSize: 26,
  nightTitleLeftOffset: 36,
};
const TITLE_ART_STYLE_VALUES = [
  "classic",
  "goldEmboss",
  "cinnabarSeal",
  "midnightBlue",
  "darkGold",
];
const GLOSSARY_HEIGHT = 124;
const GLOSSARY_ROLE_GAP = 18;
const ROLE_LAYOUT_ATTEMPTS = [
  {
    titleFontSize: 30,
    nameFontSize: 24,
    abilityFontSize: 15,
    iconSize: 40,
    titleGap: 34,
    teamGap: 10,
  },
  {
    titleFontSize: 28,
    nameFontSize: 22,
    abilityFontSize: 13,
    iconSize: 36,
    titleGap: 31,
    teamGap: 8,
  },
  {
    titleFontSize: 26,
    nameFontSize: 20,
    abilityFontSize: 11,
    iconSize: 32,
    titleGap: 28,
    teamGap: 6,
  },
  {
    titleFontSize: 24,
    nameFontSize: 18,
    abilityFontSize: 10,
    iconSize: 28,
    titleGap: 25,
    teamGap: 4,
  },
];

export default {
  components: { Modal },
  computed: {
    ...mapState(["modals", "edition", "roles", "posterEdition", "posterRoles"]),
    selectedPosterEdition() {
      return this.posterEdition || this.edition;
    },
    selectedPosterRoles() {
      return this.posterRoles || this.roles;
    },
    currentScriptName() {
      return (
        (this.selectedPosterEdition &&
          (this.selectedPosterEdition.name || this.selectedPosterEdition.id)) ||
        this.$t("modals.imageGenerator.unnamedScript")
      );
    },
    currentScriptRoleCount() {
      let count = 0;
      if (
        this.selectedPosterRoles &&
        typeof this.selectedPosterRoles.size === "number"
      ) {
        count = this.selectedPosterRoles.size;
      } else if (Array.isArray(this.selectedPosterRoles)) {
        count = this.selectedPosterRoles.length;
      }
      return this.$t("modals.imageGenerator.roleCount", { count });
    },
    titleArtStyleOptions() {
      return TITLE_ART_STYLE_VALUES.map((value) => ({
        value,
        label: this.$t(`modals.imageGenerator.titleArtStyle.${value}`),
      }));
    },
    posterBackgroundOptions() {
      return POSTER_BACKGROUND_OPTIONS.map((option) => ({
        value: option.value,
        label: option.labelKey ? this.$t(option.labelKey) : option.displayName,
      }));
    },
    downloadPosterLabel() {
      return this.isServerGenerating
        ? this.$t("modals.imageGenerator.actions.downloadPngGenerating")
        : this.$t("modals.imageGenerator.actions.downloadPng");
    },
    selectedPosterBackgroundSrc() {
      const option =
        POSTER_BACKGROUND_OPTIONS.find(
          (background) => background.value === this.posterBackgroundId,
        ) || POSTER_BACKGROUND_OPTIONS[0];
      return option ? option.src : "";
    },
    layoutSections() {
      const sectionLabel = (key) =>
        this.$t(`modals.imageGenerator.settings.sections.${key}`);
      const controlLabel = (key) =>
        this.$t(`modals.imageGenerator.settings.controls.${key}`);

      return [
        {
          key: "basic",
          label: sectionLabel("basic"),
          controls: [
            {
              key: "teamTitleLeft",
              label: controlLabel("teamTitleLeft"),
              min: 20,
              max: 180,
            },
            {
              key: "roleAreaLeft",
              label: controlLabel("roleAreaLeft"),
              min: 80,
              max: 180,
            },
            {
              key: "roleAreaTop",
              label: controlLabel("roleAreaTop"),
              min: 130,
              max: 260,
            },
            {
              key: "roleAreaTitleGap",
              label: controlLabel("roleAreaTitleGap"),
              min: 0,
              max: 120,
            },
            {
              key: "headerPanelOffsetX",
              label: controlLabel("headerPanelOffsetX"),
              min: -1000,
              max: 1000,
            },
            {
              key: "showHeaderPanel",
              label: controlLabel("showHeaderPanel"),
              type: "checkbox",
            },
            {
              key: "headerPanelWidth",
              label: controlLabel("headerPanelWidth"),
              min: 240,
              max: 520,
            },
            {
              key: "headerPanelHeight",
              label: controlLabel("headerPanelHeight"),
              min: 60,
              max: 160,
            },
            {
              key: "headerPanelTitleTop",
              label: controlLabel("headerPanelTitleTop"),
              min: 0,
              max: 1000,
            },
            {
              key: "headerPanelContentTop",
              label: controlLabel("headerPanelContentTop"),
              min: 0,
              max: 1000,
            },
            {
              key: "headerTitleOffsetX",
              label: controlLabel("headerTitleOffsetX"),
              min: -1000,
              max: 1000,
            },
            {
              key: "headerTitleOffsetY",
              label: controlLabel("headerTitleOffsetY"),
              min: -60,
              max: 60,
            },
            {
              key: "titleArtStyle",
              label: controlLabel("titleArtStyle"),
              type: "select",
              options: this.titleArtStyleOptions,
            },
            {
              key: "headerAuthorColor",
              label: controlLabel("headerAuthorColor"),
              type: "color",
            },
            {
              key: "headerAuthorOffsetX",
              label: controlLabel("headerAuthorOffsetX"),
              min: -1000,
              max: 1000,
            },
            {
              key: "headerAuthorOffsetY",
              label: controlLabel("headerAuthorOffsetY"),
              min: -40,
              max: 80,
            },
          ],
        },
        {
          key: "roles",
          label: sectionLabel("roles"),
          controls: [
            {
              key: "roleIconSize",
              label: controlLabel("roleIconSize"),
              min: 12,
              max: 800,
            },
            {
              key: "roleNameColor",
              label: controlLabel("roleNameColor"),
              type: "color",
            },
            {
              key: "roleAbilityColor",
              label: controlLabel("roleAbilityColor"),
              type: "color",
            },
            {
              key: "roleNameFontSize",
              label: controlLabel("roleNameFontSize"),
              min: 12,
              max: 30,
            },
            {
              key: "roleAbilityFontSize",
              label: controlLabel("roleAbilityFontSize"),
              min: 8,
              max: 20,
            },
            {
              key: "roleNameAbilityGap",
              label: controlLabel("roleNameAbilityGap"),
              min: 0,
              max: 30,
            },
            {
              key: "abilityTextWidth",
              label: controlLabel("abilityTextWidth"),
              min: 260,
              max: 420,
            },
            {
              key: "abilityLineHeight",
              label: controlLabel("abilityLineHeight"),
              min: 10,
              max: 28,
            },
            {
              key: "townsfolkRoleGap",
              label: controlLabel("townsfolkRoleGap"),
              min: -100,
              max: 28,
            },
            {
              key: "outsiderRoleGap",
              label: controlLabel("outsiderRoleGap"),
              min: -100,
              max: 28,
            },
            {
              key: "minionRoleGap",
              label: controlLabel("minionRoleGap"),
              min: -100,
              max: 28,
            },
            {
              key: "demonRoleGap",
              label: controlLabel("demonRoleGap"),
              min: -100,
              max: 28,
            },
            {
              key: "townsfolkTeamGap",
              label: controlLabel("townsfolkTeamGap"),
              min: -100,
              max: 80,
            },
            {
              key: "outsiderTeamGap",
              label: controlLabel("outsiderTeamGap"),
              min: -100,
              max: 80,
            },
            {
              key: "minionTeamGap",
              label: controlLabel("minionTeamGap"),
              min: -100,
              max: 80,
            },
            {
              key: "demonTeamGap",
              label: controlLabel("demonTeamGap"),
              min: -100,
              max: 80,
            },
          ],
        },
        {
          key: "night",
          label: sectionLabel("night"),
          controls: [
            {
              key: "showNightOrder",
              label: controlLabel("showNightOrder"),
              type: "checkbox",
            },
            {
              key: "nightIconSize",
              label: controlLabel("nightIconSize"),
              min: 12,
              max: 80,
            },
            {
              key: "nightIconGap",
              label: controlLabel("nightIconGap"),
              min: 10,
              max: 90,
            },
            {
              key: "nightTitleFontSize",
              label: controlLabel("nightTitleFontSize"),
              min: 12,
              max: 48,
            },
            {
              key: "nightFirstTitleFontSize",
              label: controlLabel("nightFirstTitleFontSize"),
              min: 12,
              max: 48,
            },
            {
              key: "nightOtherTitleFontSize",
              label: controlLabel("nightOtherTitleFontSize"),
              min: 12,
              max: 48,
            },
            {
              key: "nightTitleLeftOffset",
              label: controlLabel("nightTitleLeftOffset"),
              min: 0,
              max: 80,
            },
            {
              key: "nightTopOffset",
              label: controlLabel("nightTopOffset"),
              min: -1000,
              max: 1000,
            },
          ],
        },
        {
          key: "glossary",
          label: sectionLabel("glossary"),
          controls: [
            {
              key: "glossaryBottomOffset",
              label: controlLabel("glossaryBottomOffset"),
              min: 0,
              max: 80,
            },
            {
              key: "glossaryTextGap",
              label: controlLabel("glossaryTextGap"),
              min: 20,
              max: 70,
            },
          ],
        },
      ];
    },
  },
  data() {
    return {
      posterDataUrl: "",
      error: "",
      status: "",
      isServerGenerating: false,
      isPosterPreviewRendering: false,
      imageCache: Object.create(null),
      loadedImageCache: Object.create(null),
      posterRenderId: 0,
      posterRedrawTimer: null,
      lastPoster: null,
      showGlossary: false,
      posterTopText: "",
      posterTopContent: "",
      posterTitleOverride: "",
      posterAuthorOverride: "",
      posterBackgroundId: DEFAULT_POSTER_BACKGROUND_ID,
      posterLayout: { ...DEFAULT_POSTER_LAYOUT },
    };
  },
  watch: {
    "modals.imageGenerator"(visible) {
      if (visible) this.$nextTick(() => this.generatePoster());
    },
    edition: {
      deep: true,
      handler() {
        if (this.modals.imageGenerator && !this.posterEdition) {
          this.generatePoster();
        }
      },
    },
    roles: {
      deep: true,
      handler() {
        if (this.modals.imageGenerator && !this.posterRoles) {
          this.generatePoster();
        }
      },
    },
    posterEdition: {
      deep: true,
      handler() {
        if (this.modals.imageGenerator) this.generatePoster();
      },
    },
    posterRoles: {
      deep: true,
      handler() {
        if (this.modals.imageGenerator) this.generatePoster();
      },
    },
    "$i18n.locale"() {
      if (this.modals.imageGenerator) this.redrawPoster();
    },
  },
  mounted() {
    if (this.modals.imageGenerator) this.generatePoster();
    window.renderScriptPosterPayload = this.renderScriptPosterPayload;
  },
  beforeDestroy() {
    this.clearScheduledPosterRender();
    if (window.renderScriptPosterPayload === this.renderScriptPosterPayload) {
      delete window.renderScriptPosterPayload;
    }
  },
  methods: {
    chooseScript() {
      this.setEditionPickerTarget("poster");
      this.openModalOverlay("edition");
    },
    async generatePoster() {
      this.clearScheduledPosterRender();
      this.error = "";
      this.status = "";
      try {
        const poster = normalizeCurrentScriptPosterData({
          edition: this.selectedPosterEdition,
          roles: this.selectedPosterRoles,
        });
        this.lastPoster = poster;
        await this.renderPoster(poster);
      } catch (error) {
        this.error =
          error.message ||
          this.$t("modals.imageGenerator.errors.generateFailed");
      }
    },
    async redrawPoster() {
      if (!this.lastPoster) return;
      this.error = "";
      this.schedulePosterRender(this.lastPoster);
    },
    schedulePosterRender(poster) {
      this.clearScheduledPosterRender();
      this.posterRedrawTimer = window.setTimeout(() => {
        this.posterRedrawTimer = null;
        this.renderPoster(poster).catch((error) => {
          this.error =
            error.message ||
            this.$t("modals.imageGenerator.errors.redrawFailed");
        });
      }, 80);
    },
    clearScheduledPosterRender() {
      if (!this.posterRedrawTimer) return;
      window.clearTimeout(this.posterRedrawTimer);
      this.posterRedrawTimer = null;
    },
    async renderPoster(poster) {
      const renderId = this.nextPosterRenderId();
      this.isPosterPreviewRendering = true;
      try {
        const displayPoster = this.getPosterDisplayData(poster);
        const canvas = this.$refs.posterCanvas;
        const previewCanvas = this.createPosterExportCanvas();
        const previewCtx = previewCanvas.getContext("2d");
        await this.drawPosterContent(previewCtx, displayPoster, {
          exportSafe: false,
          allowDirect: true,
          fastPreview: true,
        });
        if (!this.isCurrentPosterRender(renderId)) return;
        this.copyPosterCanvas(canvas, previewCanvas);
        try {
          this.posterDataUrl = previewCanvas.toDataURL("image/png");
          this.status = this.$t(
            "modals.imageGenerator.status.previewGenerated",
          );
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn("[script-poster] PNG export blocked by remote images", {
            error,
          });
          const exportCanvas = this.createPosterExportCanvas();
          const exportCtx = exportCanvas.getContext("2d");
          await this.drawPosterContent(exportCtx, displayPoster, {
            exportSafe: true,
            allowDirect: false,
          });
          if (!this.isCurrentPosterRender(renderId)) return;
          this.posterDataUrl = exportCanvas.toDataURL("image/png");
          this.status = this.$t(
            "modals.imageGenerator.status.previewGeneratedFallback",
          );
          // eslint-disable-next-line no-console
          console.warn("[script-poster] export-safe poster generated");
        }
        this.refreshPosterImagesAfterPreload(renderId, displayPoster).catch(
          (error) => {
            // eslint-disable-next-line no-console
            console.warn(
              "[script-poster] delayed poster image refresh failed",
              {
                error,
              },
            );
          },
        );
      } finally {
        if (this.isCurrentPosterRender(renderId)) {
          this.isPosterPreviewRendering = false;
        }
      }
    },
    async refreshPosterImagesAfterPreload(renderId, displayPoster) {
      await this.preloadPosterRoleImages(displayPoster, {
        exportSafe: false,
        allowDirect: true,
      });
      if (!this.isCurrentPosterRender(renderId)) return;
      const canvas = this.$refs.posterCanvas;
      if (!canvas) return;
      const previewCanvas = this.createPosterExportCanvas();
      const previewCtx = previewCanvas.getContext("2d");
      await this.drawPosterContent(previewCtx, displayPoster, {
        exportSafe: false,
        allowDirect: true,
        preloadRoleImages: false,
      });
      if (!this.isCurrentPosterRender(renderId)) return;
      this.copyPosterCanvas(canvas, previewCanvas);
      try {
        this.posterDataUrl = previewCanvas.toDataURL("image/png");
      } catch (error) {
        const exportCanvas = this.createPosterExportCanvas();
        const exportCtx = exportCanvas.getContext("2d");
        await this.drawPosterContent(exportCtx, displayPoster, {
          exportSafe: true,
          allowDirect: false,
          preloadRoleImages: false,
        });
        if (!this.isCurrentPosterRender(renderId)) return;
        this.posterDataUrl = exportCanvas.toDataURL("image/png");
      }
    },
    nextPosterRenderId() {
      this.posterRenderId += 1;
      return this.posterRenderId;
    },
    isCurrentPosterRender(renderId) {
      return renderId === this.posterRenderId;
    },
    createPosterExportCanvas() {
      const canvas = document.createElement("canvas");
      canvas.width = POSTER_WIDTH;
      canvas.height = POSTER_HEIGHT;
      return canvas;
    },
    copyPosterCanvas(targetCanvas, sourceCanvas) {
      const ctx = targetCanvas.getContext("2d");
      ctx.clearRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);
      ctx.drawImage(sourceCanvas, 0, 0);
    },
    async drawPosterContent(ctx, poster, options = {}) {
      const roleImagePreload =
        options.preloadRoleImages === false
          ? null
          : this.preloadPosterRoleImages(poster, options);
      ctx.clearRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);
      await this.drawBackground(ctx, options);
      if (roleImagePreload && !options.fastPreview) await roleImagePreload;
      await this.drawHeader(ctx, poster, options);
      const config = this.getPosterLayoutConfig();
      if (config.showNightOrder) {
        await this.drawSidebars(ctx, poster, options);
      }
      await this.drawRoles(ctx, poster, options);
      if (this.showGlossary) this.drawGlossary(ctx);
      this.drawPosterWatermark(ctx);
    },
    getPosterDisplayData(poster) {
      return {
        ...poster,
        title: this.posterTitleOverride.trim() || poster.title,
        author: this.posterAuthorOverride.trim() || poster.author,
        topContent: this.posterTopContent.trim(),
        topText:
          this.posterTopText.trim() ||
          this.$t("modals.imageGenerator.canvas.defaultTopTitle"),
      };
    },
    async preloadPosterRoleImages(poster, options) {
      const roles = this.collectPosterImageRoles(poster);
      await Promise.all(
        roles.map((role) =>
          this.loadRoleImage(role, options).catch(() => null),
        ),
      );
    },
    collectPosterImageRoles(poster) {
      const roles = [];
      const seen = new Set();
      const addRole = (role) => {
        if (!role) return;
        const key =
          role.image ||
          role.icon ||
          role.imageUrl ||
          role.image_url ||
          `${role.team || ""}:${role.id || role.name || roles.length}`;
        if (seen.has(key)) return;
        seen.add(key);
        roles.push(role);
      };

      (poster.firstNight || []).forEach(addRole);
      (poster.otherNight || []).forEach(addRole);
      Object.values(this.getPosterGroups(poster)).forEach((group) => {
        group.forEach(addRole);
      });

      return roles;
    },
    buildPosterRenderPayload() {
      if (!this.lastPoster) return null;
      return {
        poster: this.getPosterDisplayData(this.lastPoster),
        rawLayout: { ...this.posterLayout },
        showGlossary: this.showGlossary,
        backgroundId: this.posterBackgroundId,
      };
    },
    async renderScriptPosterPayload(payload) {
      if (!payload || !payload.poster) {
        throw new Error(this.$t("modals.imageGenerator.errors.missingPayload"));
      }
      this.lastPoster = payload.poster;
      this.posterLayout = {
        ...DEFAULT_POSTER_LAYOUT,
        ...(payload.rawLayout || {}),
      };
      this.showGlossary = payload.showGlossary === true;
      this.posterTitleOverride = "";
      this.posterAuthorOverride = "";
      this.posterTopText = "";
      this.posterTopContent = "";
      this.posterBackgroundId = this.normalizePosterBackgroundId(
        payload.backgroundId,
      );
      await this.$nextTick();
      const canvas = this.$refs.posterCanvas;
      if (!canvas) {
        throw new Error(this.$t("modals.imageGenerator.errors.canvasNotReady"));
      }
      const ctx = canvas.getContext("2d");
      await this.drawPosterContent(ctx, payload.poster, {
        exportSafe: false,
        allowDirect: true,
        useProxy: false,
      });
      return true;
    },
    async drawEmptyPoster() {
      const canvas = this.$refs.posterCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      await this.drawBackground(ctx);
      ctx.fillStyle = "#3b3028";
      ctx.font = "bold 42px KaiTi, STKaiti, serif";
      ctx.textAlign = "center";
      ctx.fillText(
        this.$t("modals.imageGenerator.canvas.empty"),
        POSTER_WIDTH / 2,
        760,
      );
    },
    async drawBackground(ctx, options = {}) {
      const background = this.selectedPosterBackgroundSrc;
      if (!background) {
        this.drawTemplateBackground(ctx);
        return;
      }
      try {
        const image = await this.loadImage(background, options);
        this.drawImageCover(ctx, image, 0, 0, POSTER_WIDTH, POSTER_HEIGHT);
      } catch (error) {
        this.drawTemplateBackground(ctx);
        this.status = this.$t(
          "modals.imageGenerator.status.backgroundFallback",
        );
      }
    },
    normalizePosterBackgroundId(backgroundId) {
      return POSTER_BACKGROUND_OPTIONS.some(
        (option) => option.value === backgroundId,
      )
        ? backgroundId
        : DEFAULT_POSTER_BACKGROUND_ID;
    },
    drawTemplateBackground(ctx) {
      const paper = ctx.createLinearGradient(0, 0, POSTER_WIDTH, POSTER_HEIGHT);
      paper.addColorStop(0, "#efe5c8");
      paper.addColorStop(0.5, "#e8dcc0");
      paper.addColorStop(1, "#d7c7a7");
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);

      const sidebar = ctx.createLinearGradient(0, 0, 0, POSTER_HEIGHT);
      sidebar.addColorStop(0, "#0c1520");
      sidebar.addColorStop(0.5, "#182637");
      sidebar.addColorStop(1, "#0b121b");
      ctx.fillStyle = sidebar;
      ctx.fillRect(0, 0, 76, POSTER_HEIGHT);
      ctx.fillRect(POSTER_WIDTH - 76, 0, 76, POSTER_HEIGHT);

      ctx.fillStyle = "rgba(255, 248, 221, 0.68)";
      ctx.fillRect(76, 0, POSTER_WIDTH - 152, POSTER_HEIGHT);

      ctx.strokeStyle = "rgba(84, 68, 51, 0.36)";
      ctx.lineWidth = 2;
      ctx.strokeRect(82, 38, POSTER_WIDTH - 164, POSTER_HEIGHT - 86);

      ctx.globalAlpha = 0.11;
      ctx.strokeStyle = "#8b7357";
      for (let i = 0; i < 160; i += 1) {
        const x = 92 + ((i * 73) % 890);
        const y = 88 + ((i * 137) % 1330);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 52, y + 18);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.translate(POSTER_WIDTH / 2, POSTER_HEIGHT / 2 + 15);
      ctx.rotate(-0.35);
      ctx.fillStyle = "#6b5a47";
      ctx.font = "bold 145px STKaiti, KaiTi, serif";
      ctx.textAlign = "center";
      ctx.fillText(
        this.$t("modals.imageGenerator.canvas.fallbackWatermark"),
        0,
        0,
      );
      ctx.restore();

      this.drawLeafCluster(ctx, 48, 28, 1);
      this.drawLeafCluster(ctx, POSTER_WIDTH - 48, 30, -1);
      this.drawLeafCluster(ctx, 52, POSTER_HEIGHT - 120, 1);
      this.drawLeafCluster(ctx, POSTER_WIDTH - 52, POSTER_HEIGHT - 120, -1);
    },
    async drawHeader(ctx, poster) {
      this.drawReferenceHeader(ctx, poster);
    },
    drawReferenceHeader(ctx, poster) {
      const config = this.getPosterLayoutConfig();
      ctx.save();

      ctx.strokeStyle = "rgba(74, 55, 39, 0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(82, 150);
      ctx.lineTo(998, 150);
      ctx.stroke();

      ctx.shadowColor = "rgba(26, 22, 20, 0.32)";
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#111b29";
      ctx.textAlign = "left";
      this.drawPosterTitle(
        ctx,
        poster.title,
        84 + config.headerTitleOffsetX,
        102 + config.headerTitleOffsetY,
        420,
        114,
        config,
      );
      ctx.shadowColor = "transparent";
      ctx.fillStyle = config.headerAuthorColor;
      ctx.font = "bold 22px SimSun, serif";
      ctx.fillText(
        this.$t("modals.imageGenerator.canvas.author", {
          author:
            poster.author ||
            this.$t("modals.imageGenerator.canvas.unknownAuthor"),
        }),
        286 + config.headerAuthorOffsetX,
        132 + config.headerAuthorOffsetY,
      );

      if (config.showHeaderPanel) {
        const configuredPanel = this.drawHeaderPanel(ctx, config);
        this.drawTopPanelTitle(ctx, poster, config, configuredPanel);
        this.drawHeaderContent(ctx, poster, config, configuredPanel);
      }

      ctx.restore();
    },
    drawHeaderPanel(ctx, config) {
      const width = config.headerPanelWidth;
      const height = config.headerPanelHeight;
      const x = 410 + config.headerPanelOffsetX;
      const y = 18;
      ctx.save();
      ctx.shadowColor = "transparent";
      const panel = ctx.createLinearGradient(
        x + 20,
        y,
        x + width - 15,
        y + height,
      );
      panel.addColorStop(0, "rgba(204, 171, 122, 0.75)");
      panel.addColorStop(0.5, "rgba(245, 227, 185, 0.92)");
      panel.addColorStop(1, "rgba(190, 153, 103, 0.72)");
      ctx.fillStyle = panel;
      this.roundRect(ctx, x, y, width, height, 8, true, false);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(91, 58, 24, 0.72)";
      this.roundRect(
        ctx,
        x + 0.5,
        y + 0.5,
        width - 1,
        height - 1,
        8,
        false,
        true,
      );
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255, 246, 205, 0.5)";
      this.roundRect(
        ctx,
        x + 5,
        y + 5,
        width - 10,
        height - 10,
        5,
        false,
        true,
      );
      ctx.setLineDash([10, 7]);
      ctx.strokeStyle = "rgba(91, 58, 24, 0.35)";
      this.roundRect(
        ctx,
        x + 11,
        y + 11,
        width - 22,
        height - 22,
        3,
        false,
        true,
      );
      ctx.setLineDash([]);
      this.drawHeaderPanelCorners(ctx, x, y, width, height);
      ctx.restore();
      return {
        x,
        y,
        width,
        height,
        centerX: x + width / 2,
      };
    },
    drawHeaderPanelCorners(ctx, x, y, width, height) {
      const corner = Math.min(34, Math.max(20, height * 0.32));
      ctx.save();
      ctx.shadowColor = "transparent";
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(91, 58, 24, 0.72)";
      [
        [x + 11, y + 11, 1, 1],
        [x + width - 11, y + 11, -1, 1],
        [x + 11, y + height - 11, 1, -1],
        [x + width - 11, y + height - 11, -1, -1],
      ].forEach(([cx, cy, sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy + sy * corner);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + sx * corner, cy);
        ctx.stroke();
      });
      ctx.restore();
    },
    drawHeaderContent(ctx, poster, config, panel) {
      const contentText =
        poster.topContent || this.$t("modals.imageGenerator.canvas.autoLayout");
      const words = this.splitHeaderContent(contentText);
      const lineHeight = Math.max(
        16,
        Math.min(22, config.headerPanelHeight / 5),
      );
      const contentStartY = panel.y + config.headerPanelContentTop;
      const maxLines = Math.max(
        1,
        Math.floor((panel.y + panel.height - contentStartY) / lineHeight) + 1,
      );

      ctx.save();
      ctx.shadowColor = "transparent";
      ctx.fillStyle = "#2a2119";
      ctx.textAlign = "center";
      ctx.font = "18px SimSun, serif";

      words.slice(0, maxLines).forEach((line, index) => {
        const fittedLine = this.fitHeaderLine(ctx, line, panel.width - 38);
        ctx.fillText(
          fittedLine,
          panel.centerX,
          contentStartY + index * lineHeight,
        );
      });
      ctx.restore();
    },
    drawTopPanelTitle(ctx, poster, config, panel) {
      const title =
        poster.topText ||
        this.$t("modals.imageGenerator.canvas.defaultTopTitle");
      const x = panel.centerX;
      const y = panel.y + config.headerPanelTitleTop;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 34px STKaiti, KaiTi, serif";
      ctx.fillStyle = "#2a2119";
      ctx.fillText(title, x, y);
      ctx.restore();
    },
    drawPosterTitle(ctx, title, x, y, maxWidth, startSize, config) {
      const style = config.titleArtStyle || "classic";
      const displayTitle =
        title || this.$t("modals.imageGenerator.canvas.scriptTitle");
      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      this.setFittedTitleFont(ctx, displayTitle, maxWidth, startSize);
      this.applyTitleArtStyle(ctx, style, displayTitle, x, y);
      ctx.restore();
    },
    setFittedTitleFont(ctx, text, maxWidth, startSize) {
      let size = startSize;
      do {
        ctx.font = `900 ${size}px STKaiti, KaiTi, serif`;
        size -= 2;
      } while (ctx.measureText(text).width > maxWidth && size > 38);
    },
    applyTitleArtStyle(ctx, style, title, x, y) {
      const renderPlain = () => {
        ctx.fillStyle = "#2a2119";
        ctx.fillText(title, x, y);
      };
      const renderOutlined = (fill, stroke, shadow, shadowBlur, lineWidth) => {
        ctx.save();
        ctx.shadowColor = shadow;
        ctx.shadowBlur = shadowBlur;
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = stroke;
        ctx.fillStyle = fill;
        ctx.strokeText(title, x, y);
        ctx.fillText(title, x, y);
        ctx.restore();
      };

      switch (style) {
        case "goldEmboss":
          renderOutlined("#f5e3a1", "#8a6421", "rgba(70, 48, 10, 0.45)", 6, 4);
          break;
        case "cinnabarSeal":
          renderOutlined("#8c2014", "#f3c8a6", "rgba(95, 24, 18, 0.4)", 5, 3);
          break;
        case "midnightBlue":
          renderOutlined("#1e355f", "#d9e6ff", "rgba(11, 24, 49, 0.45)", 6, 3);
          break;
        case "darkGold":
          renderOutlined("#d5b15f", "#3b2710", "rgba(30, 20, 7, 0.6)", 8, 4);
          break;
        default:
          renderPlain();
      }
    },
    splitHeaderContent(contentText) {
      // prettier-ignore
      return contentText.split(/\s+/).map((word) => word.trim()).filter(Boolean);
    },
    fitHeaderLine(ctx, line, maxWidth) {
      if (ctx.measureText(line).width <= maxWidth) return line;
      let text = line;
      while (
        text.length > 1 &&
        ctx.measureText(`${text}...`).width > maxWidth
      ) {
        text = text.slice(0, -1);
      }
      return text.length < line.length ? `${text}...` : line;
    },
    async drawSidebars(ctx, poster, options = {}) {
      const config = this.getPosterLayoutConfig();
      this.drawSidebarShell(ctx);
      await this.drawNightColumn(
        ctx,
        config.nightTitleLeftOffset,
        this.$t("modals.imageGenerator.canvas.firstNight"),
        poster.firstNight,
        "#88d6ff",
        options,
        config.nightFirstTitleFontSize,
      );
      await this.drawNightColumn(
        ctx,
        POSTER_WIDTH - config.nightTitleLeftOffset,
        this.$t("modals.imageGenerator.canvas.otherNight"),
        poster.otherNight,
        "#e7d2ff",
        options,
        config.nightOtherTitleFontSize,
      );
    },
    drawSidebarShell(ctx) {
      ctx.save();
      const sidebar = ctx.createLinearGradient(0, 0, 0, POSTER_HEIGHT);
      sidebar.addColorStop(0, "#08101a");
      sidebar.addColorStop(0.48, "#162232");
      sidebar.addColorStop(1, "#070e16");
      ctx.fillStyle = sidebar;
      ctx.fillRect(0, 0, 76, POSTER_HEIGHT);
      ctx.fillRect(POSTER_WIDTH - 76, 0, 76, POSTER_HEIGHT);
      ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
      ctx.fillRect(70, 0, 6, POSTER_HEIGHT);
      ctx.fillRect(POSTER_WIDTH - 76, 0, 6, POSTER_HEIGHT);
      ctx.restore();
    },
    async drawNightColumn(
      ctx,
      x,
      title,
      roles,
      color,
      options = {},
      titleFontSize = null,
    ) {
      const config = this.getPosterLayoutConfig();
      ctx.fillStyle = color;
      ctx.font = `bold ${
        titleFontSize || config.nightTitleFontSize
      }px SimSun, serif`;
      ctx.textAlign = "center";
      this.drawVerticalText(
        ctx,
        title,
        x,
        config.nightTop - 86,
        titleFontSize || config.nightTitleFontSize,
      );
      for (const [index, role] of roles.slice(0, 25).entries()) {
        const y = config.nightTop + index * config.nightIconGap;
        let image = null;
        if (options.fastPreview && !this.hasCachedRoleImage(role, options)) {
          image = null;
        } else {
          image = await this.loadRoleImage(role, options);
        }
        if (image) {
          ctx.drawImage(
            image,
            x - config.nightIconSize / 2,
            y - config.nightIconSize / 2,
            config.nightIconSize,
            config.nightIconSize,
          );
          continue;
        }
        const fallbackCircleSize = config.nightIconSize * 0.68;
        ctx.beginPath();
        ctx.arc(x, y, fallbackCircleSize / 2, 0, Math.PI * 2);
        ctx.fill();
        const fallbackLabel = this.getNightFallbackLabel(role);
        ctx.fillStyle = "#102033";
        ctx.font = `bold ${Math.max(
          14,
          Math.min(28, fallbackCircleSize * 0.46),
        )}px SimSun, serif`;
        ctx.textBaseline = "middle";
        ctx.fillText(fallbackLabel, x, y);
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = color;
      }
    },
    getNightFallbackLabel(role) {
      const name = String((role && (role.name || role.id)) || "").trim();
      return Array.from(name)[0] || "?";
    },
    drawVerticalText(ctx, text, x, y, fontSize) {
      Array.from(text).forEach((letter, index) => {
        ctx.fillText(letter, x, y + index * (fontSize + 2));
      });
    },
    normalizeColor(value, fallback) {
      const color = String(value || "").trim();
      if (/^#[0-9a-f]{6}$/i.test(color)) return color;
      return fallback;
    },
    getPosterLayoutConfig() {
      const read = (key, min, max) => {
        const value = Number(this.posterLayout[key]);
        const fallback = DEFAULT_POSTER_LAYOUT[key];
        if (!Number.isFinite(value)) return fallback;
        return Math.min(max, Math.max(min, value));
      };
      const glossaryBottomOffset = read("glossaryBottomOffset", 0, 80);
      const glossaryTop = this.showGlossary
        ? POSTER_HEIGHT - GLOSSARY_HEIGHT - glossaryBottomOffset
        : POSTER_HEIGHT - glossaryBottomOffset;

      return {
        teamTitleLeft: read("teamTitleLeft", 20, 180),
        roleAreaLeft: read("roleAreaLeft", 80, 180),
        roleAreaTop: read("roleAreaTop", 130, 260),
        roleAreaTitleGap: read("roleAreaTitleGap", 0, 120),
        headerPanelOffsetX: read("headerPanelOffsetX", -1000, 1000),
        showHeaderPanel: this.posterLayout.showHeaderPanel === true,
        headerPanelWidth: read("headerPanelWidth", 240, 520),
        headerPanelHeight: read("headerPanelHeight", 60, 160),
        headerPanelTitleTop: read("headerPanelTitleTop", 0, 1000),
        headerPanelContentTop: read("headerPanelContentTop", 0, 1000),
        headerTitleOffsetX: read("headerTitleOffsetX", -1000, 1000),
        headerTitleOffsetY: read("headerTitleOffsetY", -60, 60),
        titleArtStyle:
          this.posterLayout.titleArtStyle ||
          DEFAULT_POSTER_LAYOUT.titleArtStyle,
        headerAuthorColor: this.normalizeColor(
          this.posterLayout.headerAuthorColor,
          DEFAULT_POSTER_LAYOUT.headerAuthorColor,
        ),
        headerAuthorOffsetX: read("headerAuthorOffsetX", -1000, 1000),
        headerAuthorOffsetY: read("headerAuthorOffsetY", -40, 80),
        roleNameAbilityGap: read("roleNameAbilityGap", 0, 30),
        roleIconSize: read("roleIconSize", 12, 800),
        roleNameColor: this.normalizeColor(
          this.posterLayout.roleNameColor,
          DEFAULT_POSTER_LAYOUT.roleNameColor,
        ),
        roleAbilityColor: this.normalizeColor(
          this.posterLayout.roleAbilityColor,
          DEFAULT_POSTER_LAYOUT.roleAbilityColor,
        ),
        roleNameFontSize: read("roleNameFontSize", 12, 30),
        roleAbilityFontSize: read("roleAbilityFontSize", 8, 20),
        abilityTextWidth: read("abilityTextWidth", 260, 420),
        abilityLineHeight: read("abilityLineHeight", 10, 28),
        roleGap: read("roleGap", -100, 28),
        teamGap: read("teamGap", -100, 80),
        townsfolkRoleGap: read("townsfolkRoleGap", -100, 28),
        outsiderRoleGap: read("outsiderRoleGap", -100, 28),
        minionRoleGap: read("minionRoleGap", -100, 28),
        demonRoleGap: read("demonRoleGap", -100, 28),
        townsfolkTeamGap: read("townsfolkTeamGap", -100, 80),
        outsiderTeamGap: read("outsiderTeamGap", -100, 80),
        minionTeamGap: read("minionTeamGap", -100, 80),
        demonTeamGap: read("demonTeamGap", -100, 80),
        glossaryBottomOffset,
        glossaryTextGap: read("glossaryTextGap", 28, 70),
        showNightOrder: this.posterLayout.showNightOrder !== false,
        nightIconSize: read("nightIconSize", 12, 80),
        nightIconGap: read("nightIconGap", 10, 90),
        nightTop:
          read("nightTop", 400, 900) + read("nightTopOffset", -1000, 1000),
        nightTitleFontSize: read("nightTitleFontSize", 12, 48),
        nightFirstTitleFontSize: read("nightFirstTitleFontSize", 12, 48),
        nightOtherTitleFontSize: read("nightOtherTitleFontSize", 12, 48),
        nightTitleLeftOffset: read("nightTitleLeftOffset", 0, 80),
        glossaryTop,
        roleAreaBottom: glossaryTop - GLOSSARY_ROLE_GAP,
      };
    },
    getRoleLayoutAttempts(config) {
      return ROLE_LAYOUT_ATTEMPTS.map((settings) => ({
        ...settings,
        roleNameAbilityGap: config.roleNameAbilityGap,
        iconSize: config.roleIconSize,
        nameColor: config.roleNameColor,
        abilityColor: config.roleAbilityColor,
        nameFontSize: config.roleNameFontSize,
        abilityFontSize: config.roleAbilityFontSize,
        titleGap: config.roleAreaTitleGap,
        abilityTextWidth: config.abilityTextWidth,
        abilityLineHeight: config.abilityLineHeight,
      }));
    },
    readTeamGap(config, teamKey, gapType) {
      const value = Number(
        config[`${teamKey}${gapType === "roleGap" ? "RoleGap" : "TeamGap"}`],
      );
      if (Number.isFinite(value)) return value;
      return Number(config[gapType]);
    },
    getPosterGroups(poster) {
      const groups = SCRIPT_POSTER_TEAMS.reduce((acc, team) => {
        acc[team.key] = [];
        return acc;
      }, {});

      if (poster.groups) {
        SCRIPT_POSTER_TEAMS.forEach((team) => {
          if (Array.isArray(poster.groups[team.key])) {
            groups[team.key] = poster.groups[team.key];
          }
        });
      }

      if (!Object.values(groups).some((roles) => roles.length)) {
        (poster.roles || []).forEach((role) => {
          const team = groups[role.team] ? role.team : "townsfolk";
          groups[team].push(role);
        });
      }

      return groups;
    },
    async drawRoles(ctx, poster, options = {}) {
      const config = this.getPosterLayoutConfig();
      const columnWidth = config.abilityTextWidth + config.roleIconSize + 18;
      const titleX = config.teamTitleLeft;
      const leftX = config.roleAreaLeft;
      const rightX = leftX + 472;
      const groups = this.getPosterGroups(poster);
      const layout = this.measureRoleLayout(ctx, poster, {
        leftX,
        rightX,
        columnWidth,
        config,
        groups,
      });
      if (!layout || !layout.items.length) return;

      for (const item of layout.items) {
        if (item.type === "team") {
          this.drawTeamTitle(
            ctx,
            titleX,
            item.y,
            860,
            item.team,
            layout.settings,
          );
        } else if (item.type === "row") {
          await this.drawRole(
            ctx,
            leftX,
            item.y,
            columnWidth,
            item.left.role,
            item.team,
            {
              layout: item.left,
              settings: layout.settings,
              exportSafe: options.exportSafe,
              allowDirect: options.allowDirect,
              useProxy: options.useProxy,
            },
          );
          if (item.right) {
            await this.drawRole(
              ctx,
              rightX,
              item.y,
              columnWidth,
              item.right.role,
              item.team,
              {
                layout: item.right,
                settings: layout.settings,
                exportSafe: options.exportSafe,
                allowDirect: options.allowDirect,
                useProxy: options.useProxy,
              },
            );
          }
        }
      }
    },
    measureRoleLayout(ctx, poster, columns) {
      let fallbackLayout = null;

      for (const settings of this.getRoleLayoutAttempts(columns.config)) {
        const layout = this.buildRoleLayout(ctx, poster, columns, settings);
        fallbackLayout = layout;
        if (layout.bottom <= columns.config.roleAreaBottom) return layout;
      }

      return fallbackLayout;
    },
    buildRoleLayout(ctx, poster, columns, settings) {
      const items = [];
      let y = columns.config.roleAreaTop;

      for (const team of SCRIPT_POSTER_TEAMS) {
        const roles = columns.groups[team.key] || [];
        if (!roles.length) continue;
        const roleGap = this.readTeamGap(columns.config, team.key, "roleGap");
        const teamGap = this.readTeamGap(columns.config, team.key, "teamGap");

        items.push({ type: "team", y, team });
        y += settings.titleGap;

        for (let index = 0; index < roles.length; index += 2) {
          const left = this.measureRole(
            ctx,
            roles[index],
            columns.columnWidth,
            settings,
          );
          const right = roles[index + 1]
            ? this.measureRole(
                ctx,
                roles[index + 1],
                columns.columnWidth,
                settings,
              )
            : null;
          const rowHeight =
            Math.max(left.height, right ? right.height : 0, settings.iconSize) +
            roleGap;

          items.push({
            type: "row",
            y,
            height: rowHeight,
            team,
            left,
            right,
          });
          y += rowHeight;
        }

        y += teamGap;
      }

      return {
        items,
        settings,
        bottom: y,
      };
    },
    measureRole(ctx, role, width, settings) {
      ctx.font = `bold ${settings.abilityFontSize}px SimSun, serif`;
      const abilityLines = this.wrapText(
        ctx,
        role.ability,
        settings.abilityTextWidth,
      );
      const textHeight =
        settings.nameFontSize +
        settings.roleNameAbilityGap +
        abilityLines.length * settings.abilityLineHeight;

      return {
        role,
        abilityLines,
        height: Math.max(settings.iconSize, textHeight),
      };
    },
    drawTeamTitle(ctx, x, y, width, team, settings = ROLE_LAYOUT_ATTEMPTS[0]) {
      ctx.save();
      ctx.strokeStyle = "rgba(69, 53, 40, 0.72)";
      ctx.lineWidth = 2;
      ctx.font = `bold ${settings.titleFontSize}px STKaiti, KaiTi, serif`;
      ctx.textBaseline = "middle";
      const title = this.getPosterTeamLabel(team);
      const titleWidth = ctx.measureText(title).width;
      const titleCenterY = y + settings.titleFontSize / 2;
      ctx.beginPath();
      ctx.moveTo(x + titleWidth + 18, titleCenterY);
      ctx.lineTo(x + width, titleCenterY);
      ctx.stroke();
      ctx.fillStyle = team.accent;
      ctx.textAlign = "left";
      ctx.fillText(title, x, titleCenterY);
      ctx.restore();
    },
    getPosterTeamLabel(team) {
      const key = `modals.imageGenerator.team.${team.key}`;
      const label = this.$t(key);
      return label === key ? team.label : label;
    },
    async drawRole(ctx, x, y, width, role, team, options = {}) {
      const settings = options.settings || ROLE_LAYOUT_ATTEMPTS[0];
      const layout =
        options.layout || this.measureRole(ctx, role, width, settings);
      const iconSize = settings.iconSize;
      const textOffsetX = iconSize + 18;
      const iconY = y + Math.max(0, (layout.height - iconSize) / 2);
      let icon = null;
      if (options.fastPreview && !this.hasCachedRoleImage(role, options)) {
        icon = null;
      } else {
        icon = await this.loadRoleImage(role, options);
      }

      if (icon) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, iconY, iconSize, iconSize);
        ctx.clip();
        ctx.drawImage(icon, x, iconY, iconSize, iconSize);
        ctx.restore();
      } else {
        this.drawIconFallback(
          ctx,
          x + iconSize / 2,
          iconY + iconSize / 2,
          team.accent,
        );
      }

      ctx.fillStyle = settings.nameColor || team.accent;
      ctx.font = `bold ${settings.nameFontSize}px STKaiti, KaiTi, serif`;
      ctx.textAlign = "left";
      ctx.fillText(role.name, x + textOffsetX, y + settings.nameFontSize);
      ctx.fillStyle = settings.abilityColor || "#17110d";
      ctx.font = `bold ${settings.abilityFontSize}px SimSun, serif`;
      layout.abilityLines.forEach((line, index) => {
        ctx.fillText(
          line,
          x + textOffsetX,
          y +
            settings.nameFontSize +
            settings.roleNameAbilityGap +
            index * settings.abilityLineHeight,
        );
      });
    },
    drawGlossary(ctx) {
      const config = this.getPosterLayoutConfig();
      const GLOSSARY_TOP = config.glossaryTop;
      this.drawGlossaryShell(ctx);
      ctx.fillStyle = "#7b2a22";
      ctx.font = "bold 24px STKaiti, KaiTi, serif";
      ctx.textAlign = "left";
      ctx.fillText(
        this.$t("modals.imageGenerator.glossary.title"),
        245,
        GLOSSARY_TOP + 34,
      );
      ctx.fillStyle = "#211813";
      ctx.font = "15px SimSun, serif";
      this.wrapText(
        ctx,
        this.$t("modals.imageGenerator.glossary.description"),
        580,
        2,
      ).forEach((line, index) => {
        ctx.fillText(
          line,
          246,
          GLOSSARY_TOP + 34 + config.glossaryTextGap + index * 15,
        );
      });
    },
    drawPosterWatermark(ctx) {
      ctx.save();
      ctx.font = "bold 22px STKaiti, KaiTi, SimSun, serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fillText(
        this.$t("modals.imageGenerator.canvas.watermark"),
        POSTER_WIDTH - 88,
        POSTER_HEIGHT - 18,
      );
      ctx.restore();
    },
    drawGlossaryShell(ctx) {
      const GLOSSARY_TOP = this.getPosterLayoutConfig().glossaryTop;
      ctx.fillStyle = "rgba(194, 181, 160, 0.86)";
      this.roundRect(
        ctx,
        212,
        GLOSSARY_TOP,
        656,
        GLOSSARY_HEIGHT,
        12,
        true,
        true,
      );
      ctx.strokeStyle = "rgba(100, 81, 67, 0.7)";
      ctx.lineWidth = 2;
      this.roundRect(
        ctx,
        212,
        GLOSSARY_TOP,
        656,
        GLOSSARY_HEIGHT,
        12,
        false,
        true,
      );
    },
    drawIconFallback(ctx, cx, cy, color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy + 12);
      ctx.lineTo(cx + 12, cy - 12);
      ctx.stroke();
    },
    drawLeafCluster(ctx, x, y, direction) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(direction, 1);
      ctx.strokeStyle = "#2f3b24";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(42, 26, 58, 68, 70, 118);
      ctx.stroke();

      const leaves = [
        [16, 22, -0.65, 28],
        [36, 46, 0.52, 34],
        [45, 80, -0.38, 31],
      ];
      leaves.forEach(([leafX, leafY, rotate, size]) => {
        ctx.save();
        ctx.translate(leafX, leafY);
        ctx.rotate(rotate);
        ctx.fillStyle = "#9aa54d";
        ctx.strokeStyle = "#344126";
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.42, size, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
    },
    fillFittedText(ctx, text, x, y, maxWidth, startSize) {
      let size = startSize;
      do {
        ctx.font = `900 ${size}px STKaiti, KaiTi, serif`;
        size -= 2;
      } while (ctx.measureText(text).width > maxWidth && size > 38);
      ctx.fillText(text, x, y);
    },
    wrapText(ctx, text, maxWidth, maxLines) {
      const chars = String(text || "").split("");
      const lines = [];
      let line = "";
      chars.forEach((char) => {
        const next = line + char;
        if (ctx.measureText(next).width > maxWidth && line) {
          lines.push(line);
          line = char;
        } else {
          line = next;
        }
      });
      if (line) lines.push(line);
      if (!maxLines || lines.length <= maxLines) return lines;
      const clipped = lines.slice(0, maxLines);
      clipped[clipped.length - 1] = `${clipped[clipped.length - 1].slice(
        0,
        -1,
      )}...`;
      return clipped;
    },
    async loadRoleImage(role, options = {}) {
      const sources = this.getRoleImageSources(role);

      for (const src of sources) {
        if (this.isBlockedRemoteRoleImageHost(src)) {
          // eslint-disable-next-line no-console
          console.warn(
            "[script-poster] role image skipped because host returns deleted placeholders",
            {
              role: role.name || role.id,
              src,
            },
          );
          continue;
        }

        try {
          const image = await this.loadImage(src, options);
          if (this.isUnavailableRemoteRoleImage(src, image)) {
            // eslint-disable-next-line no-console
            console.warn(
              "[script-poster] role image resolved to unavailable placeholder",
              {
                role: role.name || role.id,
                src,
              },
            );
            continue;
          }
          return image;
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn("[script-poster] role image failed", {
            role: role.name || role.id,
            src,
            error,
          });
        }
      }

      if (sources.length) {
        // eslint-disable-next-line no-console
        console.warn("[script-poster] no role image could be loaded", {
          role: role.name || role.id,
          sources,
        });
      }

      return null;
    },
    getRoleImageSources(role) {
      return [
        role && role.image,
        role && role.icon,
        role && role.imageUrl,
        role && role.image_url,
      ].filter(Boolean);
    },
    hasCachedRoleImage(role, options) {
      return this.getRoleImageSources(role).some((src) =>
        this.getRoleImageCacheKeys(src, options).some(
          (cacheKey) => this.loadedImageCache[cacheKey],
        ),
      );
    },
    getRoleImageCacheKeys(src, options = {}) {
      return [
        options,
        { ...options, useProxy: false },
        { ...options, crossOrigin: false, useProxy: false },
      ].map((variant) => this.getImageCacheKey(src, variant));
    },
    isBlockedRemoteRoleImageHost(src) {
      return this.isPostimageHost(src);
    },
    isUnavailableRemoteRoleImage(src, image) {
      if (!src || !image) return false;
      if (!this.isPostimageHost(src)) return false;

      const naturalWidth = image.naturalWidth || image.width;
      const naturalHeight = image.naturalHeight || image.height;
      if (!naturalWidth || !naturalHeight) return false;
      const isSmallSquarePlaceholder =
        naturalWidth <= 260 &&
        naturalHeight <= 260 &&
        Math.abs(naturalWidth - naturalHeight) <= 8;
      if (isSmallSquarePlaceholder) return true;

      if (this.isBlueRemovedImagePlaceholder(image)) return true;

      return false;
    },
    isPostimageHost(src) {
      let hostname = "";
      try {
        hostname = new URL(
          this.normalizeImageSource(src),
        ).hostname.toLowerCase();
      } catch (error) {
        return false;
      }

      return ["postimage.org", "postimages.org", "postimg.cc"].some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
      );
    },
    isBlueRemovedImagePlaceholder(image) {
      const sampleSize = 12;
      let imageData = null;

      try {
        const canvas = document.createElement("canvas");
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, sampleSize, sampleSize);
        imageData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
      } catch (error) {
        return false;
      }

      let bluePixels = 0;
      let sampledPixels = 0;
      for (let index = 0; index < imageData.length; index += 4) {
        const red = imageData[index];
        const green = imageData[index + 1];
        const blue = imageData[index + 2];
        const alpha = imageData[index + 3];
        if (alpha < 220) continue;
        sampledPixels += 1;
        if (blue > 160 && green > 80 && red < 120 && blue - red > 70) {
          bluePixels += 1;
        }
      }

      return sampledPixels > 0 && bluePixels / sampledPixels > 0.45;
    },
    normalizeImageSource(src) {
      if (src.startsWith("//")) return `${window.location.protocol}${src}`;
      return src;
    },
    buildProxiedImageUrl(src) {
      if (!src || /^data:/i.test(src) || /^blob:/i.test(src)) return src;
      const normalizedSrc = this.normalizeImageSource(src);
      if (!/^https?:\/\//i.test(normalizedSrc)) return normalizedSrc;
      return `${SCRIPT_POSTER_IMAGE_PROXY}${encodeURIComponent(normalizedSrc)}`;
    },
    getImageCacheKey(src, options = {}) {
      const normalizedSrc = this.normalizeImageSource(src);
      const useProxy = options.useProxy !== false;
      const effectiveSrc = useProxy
        ? this.buildProxiedImageUrl(normalizedSrc)
        : normalizedSrc;
      return `${
        options.crossOrigin === false ? "plain" : "cors"
      }:${effectiveSrc}`;
    },
    loadImage(src, options = {}) {
      const normalizedSrc = this.normalizeImageSource(src);
      const useProxy = options.useProxy !== false;
      const allowDirect =
        options.allowDirect !== false && options.exportSafe !== true;
      const effectiveSrc = useProxy
        ? this.buildProxiedImageUrl(normalizedSrc)
        : normalizedSrc;
      const cacheKey = this.getImageCacheKey(normalizedSrc, options);
      if (this.imageCache[cacheKey]) return this.imageCache[cacheKey];

      this.imageCache[cacheKey] = new Promise((resolve, reject) => {
        const image = new Image();
        if (options.crossOrigin !== false) image.crossOrigin = "anonymous";
        image.onload = () => {
          this.loadedImageCache[cacheKey] = image;
          resolve(image);
        };
        image.onerror = (error) => {
          delete this.imageCache[cacheKey];
          delete this.loadedImageCache[cacheKey];
          reject(error);
        };
        image.src = effectiveSrc;
      });
      return this.imageCache[cacheKey].catch((error) => {
        if (useProxy && effectiveSrc !== normalizedSrc) {
          if (!allowDirect) throw error;
          // eslint-disable-next-line no-console
          console.warn("[script-poster] retry image without proxy", {
            src,
            error,
          });
          return this.loadImage(normalizedSrc, { ...options, useProxy: false });
        }

        if (options.crossOrigin === false) {
          throw error;
        }

        if (!allowDirect) throw error;

        // eslint-disable-next-line no-console
        console.warn("[script-poster] retry image without CORS", {
          src: normalizedSrc,
          error,
        });
        return this.loadImage(normalizedSrc, {
          ...options,
          crossOrigin: false,
          useProxy: false,
        });
      });
    },
    drawImageCover(ctx, image, x, y, width, height) {
      const sourceRatio = image.width / image.height;
      const targetRatio = width / height;
      let sourceWidth = image.width;
      let sourceHeight = image.height;
      let sourceX = 0;
      let sourceY = 0;

      if (sourceRatio > targetRatio) {
        sourceWidth = image.height * targetRatio;
        sourceX = (image.width - sourceWidth) / 2;
      } else {
        sourceHeight = image.width / targetRatio;
        sourceY = (image.height - sourceHeight) / 2;
      }

      ctx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        x,
        y,
        width,
        height,
      );
    },
    roundRect(ctx, x, y, width, height, radius, fill, stroke) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius,
        y + height,
      );
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      if (fill) ctx.fill();
      if (stroke) ctx.stroke();
    },
    async downloadPoster() {
      if (!this.posterDataUrl || this.isServerGenerating) return;
      if (!this.requirePosterGenerationLogin()) return;
      this.error = "";
      try {
        await this.downloadPosterFromServer();
        return;
      } catch (error) {
        this.error =
          error.message ||
          this.$t("modals.imageGenerator.errors.backendFailedFallback");
        // eslint-disable-next-line no-console
        console.warn("[script-poster] backend PNG render failed", error);
      }
      const link = document.createElement("a");
      link.href = this.posterDataUrl;
      link.download = "script-poster.png";
      link.click();
    },
    requirePosterGenerationLogin() {
      const { token, user } = getAuthSession();
      if (token && user) return true;
      this.status = "";
      this.error = this.$t("modals.imageGenerator.errors.loginRequired");
      this.openModalOverlay("login");
      return false;
    },
    async downloadPosterFromServer() {
      const payload = this.buildPosterRenderPayload();
      if (!payload) {
        throw new Error(
          this.$t("modals.imageGenerator.errors.previewRequired"),
        );
      }
      this.isServerGenerating = true;
      try {
        this.status = this.$t("modals.imageGenerator.status.serverGenerating");
        const response = await fetch(SCRIPT_POSTER_RENDER_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        try {
          const link = document.createElement("a");
          link.href = objectUrl;
          link.download = "script-poster.png";
          link.click();
          this.status = this.$t("modals.imageGenerator.status.serverGenerated");
        } finally {
          setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        }
      } finally {
        this.isServerGenerating = false;
      }
    },
    ...mapMutations([
      "toggleModal",
      "openModalOverlay",
      "setEditionPickerTarget",
    ]),
  },
};
</script>

<style scoped lang="scss">
.poster-generator {
  display: flex;
  flex-direction: column;
  width: min(1180px, calc(92vw - 2em));
  height: min(82vh, calc(100vh - 3em));
  max-width: 100%;
  max-height: none;
  overflow: hidden;
  box-sizing: border-box;
  color: #dcc4a1;
}

.poster-generator,
.poster-generator * {
  box-sizing: border-box;
}

::v-deep .modal {
  max-width: min(92vw, calc(100vw - 3em));
}

::v-deep .modal > .slot {
  overflow: hidden;
}

.poster-generator-header {
  padding-right: 82px;
  margin-bottom: 0.62em;
  padding-bottom: 0.62em;
  border-bottom: 1px solid #3d2e26;

  h3 {
    margin-bottom: 0.16em;
    color: #fff8e7;
    letter-spacing: 0.04em;
  }

  p {
    margin: 0;
    color: #c8b28f;
    font-size: 0.88rem;
    line-height: 1.35;
  }
}

.poster-generator-grid {
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: minmax(280px, 400px) minmax(0, 1fr);
  gap: 18px;
  align-items: stretch;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.poster-controls {
  display: flex;
  flex-direction: column;
  gap: 0.42em;
  height: 100%;
  min-width: 0;
  min-height: 0;
  max-height: none;
  overflow: hidden;
  font-size: 14px;
}

.poster-controls-scroll {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.42em;
  min-height: 0;
  min-width: 0;
  max-height: none;
  overflow-x: hidden;
  overflow-y: auto;
  padding-bottom: 0.46em;
  padding-right: 0.34em;
}

.poster-controls label {
  display: flex;
  flex-direction: column;
  gap: 0.22em;
  min-width: 0;
  max-width: 100%;
  color: #dcc4a1;
  line-height: 1.2;
  overflow-wrap: anywhere;
  font-size: 0.76em;
}

.poster-control-overview,
.poster-control-group {
  margin: 0;
  border: 1px solid #3d2e26;
  border-radius: 2px;
  background: rgba(18, 15, 13, 0.68);
  box-shadow: inset 0 1px 0 rgba(255, 236, 190, 0.04);
}

.poster-control-overview {
  padding: 0;
}

.poster-control-register {
  margin: 0;
}

.poster-control-register div {
  display: grid;
  grid-template-columns: 6.6em minmax(0, 1fr);
  min-height: 1.86em;
  border-bottom: 1px solid #261d19;
}

.poster-control-register div:last-child {
  border-bottom: 0;
}

.poster-control-register dt,
.poster-control-register dd {
  display: flex;
  align-items: center;
  min-width: 0;
  margin: 0;
  padding: 0 0.48em;
  overflow: hidden;
  text-overflow: ellipsis;
}

.poster-control-register dt {
  color: #9e8a70;
  font-size: 0.76em;
}

.poster-control-register dd {
  color: #dcc4a1;
  white-space: nowrap;
}

.poster-control-register strong {
  min-width: 0;
  color: #fff8e7;
  overflow: hidden;
  text-overflow: ellipsis;
}

.poster-command-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.22em;
}

.poster-script-actions {
  flex: 0 0 auto;
  grid-template-columns: minmax(0, 1fr);
  padding-bottom: 0.42em;
  border-bottom: 1px solid rgba(61, 46, 38, 0.72);
  background: rgba(18, 15, 13, 0.78);
}

.poster-script-actions,
.poster-settings-groups {
  display: grid;
  gap: 0.42em;
  min-height: 0;
}

.poster-script-actions .button,
.poster-actions .button,
.poster-control-group .button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.42em;
  min-width: 0;
  min-height: 1.9em;
  margin: 0;
  padding: 0 0.48em;
  max-width: 100%;
  color: #dcc4a1;
  border: 1px solid #3d2e26;
  border-radius: 2px;
  background: #1d1816;
  box-shadow: inset 0 1px 0 rgba(255, 236, 190, 0.04);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.76em;
}

.poster-script-actions .button:hover,
.poster-actions .button:hover,
.poster-control-group .button:hover {
  color: #fff8e7;
  border-color: #6b4a18;
  background: #2a1c09;
}

.poster-script-actions .button:disabled,
.poster-actions .button:disabled,
.poster-control-group .button:disabled {
  color: #7f705f;
  border-color: #2b211d;
  background: #15110f;
  cursor: default;
  opacity: 0.58;
}

.poster-script-actions .button svg,
.poster-actions .button svg {
  flex: 0 0 auto;
  font-size: 0.9em;
}

.script-picker-action {
  width: 100%;
}

.poster-control-group {
  padding: 0;
  overflow: visible;
}

.poster-control-group-title {
  min-height: 1.68em;
  padding: 0.28em 0.46em;
  color: #d4af37;
  border-bottom: 1px solid #3d2e26;
  background: #120f0e;
  cursor: pointer;
  font-weight: bold;
  letter-spacing: 0.08em;
}

.poster-control-group[open] .poster-control-group-title {
  border-bottom-color: #4a3b32;
}

.poster-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.34em;
  padding: 0.34em;
}

.poster-meta-field-grid {
  grid-template-columns: minmax(0, 1fr);
}

.poster-controls input,
.poster-controls select {
  width: 100%;
  min-width: 0;
  min-height: 2em;
  padding: 0 0.46em;
  color: #fff8e7;
  border: 1px solid #3d2e26;
  border-radius: 2px;
  background: #120f0e;
  font-size: 0.96em;
  line-height: 1.2;
}

.poster-controls input::placeholder {
  color: #7f705f;
}

.poster-controls input[type="color"] {
  padding: 2px;
  cursor: pointer;
}

.poster-controls input:focus,
.poster-controls select:focus {
  border-color: #8b6508;
  outline: 1px solid rgba(212, 175, 55, 0.35);
  outline-offset: 0;
}

.poster-checkbox {
  grid-column: 1 / -1;
  flex-direction: row;
  align-items: center;
  min-height: 2em;
  color: #dcc4a1;
  font-size: 0.78em;
}

.poster-checkbox input {
  flex: 0 0 auto;
  align-self: center;
  width: auto;
  min-height: auto;
  margin: 0;
}

.poster-actions {
  position: static;
  flex: 0 0 auto;
  bottom: 0;
  z-index: 1;
  padding-top: 0.42em;
  background: rgba(18, 15, 13, 0.78);
}

.poster-control-messages {
  display: grid;
  flex: 0 0 auto;
  gap: 0.3em;
  max-height: 5.6em;
  min-height: 0;
  overflow-y: auto;
  padding: 0.4em 0.34em 0;
  border-top: 1px solid rgba(61, 46, 38, 0.72);
  background: rgba(18, 15, 13, 0.78);
}

.poster-action-primary {
  color: #fff8e7 !important;
  border-color: #8b6508 !important;
  background: linear-gradient(#8b6508, #5c4204) !important;
}

.poster-action-secondary {
  color: #dcc4a1 !important;
  background: #1d1816 !important;
}

.poster-control-alert {
  min-height: 1.9em;
  padding: 0.38em 0.5em;
  color: #fff8e7;
  border: 1px solid rgba(212, 175, 55, 0.45);
  border-radius: 2px;
  background: rgba(92, 66, 4, 0.24);
  font-size: 0.76em;
  line-height: 1.35;
}

.poster-control-alert.error {
  color: #ffb6a9;
  border-color: rgba(185, 31, 25, 0.55);
  background: rgba(92, 26, 22, 0.3);
}

.poster-control-alert.success {
  color: #d8eeb7;
}

.poster-preview {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  max-height: none;
  padding: 10px;
  border: 1px solid #3d2e26;
  border-radius: 2px;
  background: rgba(18, 15, 13, 0.68);
  box-shadow: inset 0 1px 0 rgba(255, 236, 190, 0.04);
}

.poster-preview canvas {
  width: min(100%, 540px);
  max-width: 100%;
  height: auto;
  display: block;
  box-shadow: 0 16px 42px rgba(0, 0, 0, 0.55);
}

.poster-preview canvas[aria-hidden="true"] {
  display: none;
}

.poster-preview-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: calc(100% - 32px);
  padding: 9px 14px;
  border: 1px solid rgba(226, 189, 128, 0.42);
  border-radius: 4px;
  color: #f9edcf;
  background: rgba(25, 20, 16, 0.78);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.32);
  font-size: 13px;
  line-height: 1.25;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

@media (max-width: 860px) {
  .poster-generator-grid {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) minmax(160px, 42vh);
  }

  .poster-generator {
    width: min(100%, 88vw);
    height: min(88vh, calc(100vh - 2em));
  }

  .poster-command-grid,
  .poster-field-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
