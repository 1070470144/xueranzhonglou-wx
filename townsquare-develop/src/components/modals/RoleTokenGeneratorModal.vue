<template>
  <Modal
    class="role-token-generator-modal"
    v-if="modals.roleTokenGenerator"
    @close="close"
  >
    <section class="token-generator-panel">
      <header class="panel-header">
        <div>
          <small>{{ $t("roleTokenGenerator.hint") }}</small>
          <h3>{{ $t("roleTokenGenerator.title") }}</h3>
        </div>
      </header>

      <div class="generator-layout">
        <div class="form-column">
          <label class="form-field">
            <span>{{ $t("roleTokenGenerator.targetRole") }}</span>
            <select v-model="selectedRoleId">
              <option value="">
                {{ $t("roleTokenGenerator.targetPlaceholder") }}
              </option>
              <option
                v-for="role in roles"
                :key="role.docId"
                :value="role.docId"
              >
                {{ role.displayName }} / {{ teamLabel(role.team) }}
              </option>
            </select>
          </label>
          <label class="form-field">
            <span>{{ $t("roleTokenGenerator.team") }}</span>
            <select v-model="options.selectedColor">
              <option
                v-for="option in colorOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>

          <div
            class="upload-area"
            :class="{ 'drag-over': isDragOver }"
            tabindex="0"
            @click="openFilePicker"
            @keydown.enter.prevent="openFilePicker"
            @keydown.space.prevent="openFilePicker"
            @dragover.prevent="isDragOver = true"
            @dragleave.prevent="isDragOver = false"
            @drop.prevent="handleDrop"
          >
            <input
              ref="fileInput"
              type="file"
              accept="image/*,.svg"
              class="file-input"
              @change="handleFileInput"
            />
            <div v-if="sourcePreview" class="selected-image">
              <img :src="sourcePreview" :alt="sourceFileName" />
              <span>{{ sourceFileName }}</span>
            </div>
            <div v-else class="upload-copy">
              <strong>{{ $t("roleTokenGenerator.uploadTitle") }}</strong>
              <span>{{ $t("roleTokenGenerator.uploadHint") }}</span>
            </div>
          </div>

          <div
            class="shortcut-links"
            :aria-label="$t('roleTokenGenerator.shortcuts')"
          >
            <a
              href="https://www.google.com/search?q=+vector&udm=2&tbs=itp:lineart,ic:trans"
              target="_blank"
              rel="noopener noreferrer"
            >
              <font-awesome-icon icon="search" />
              <span>{{ $t("roleTokenGenerator.searchVector") }}</span>
            </a>
            <a
              href="https://www.remove.bg/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <font-awesome-icon icon="image" />
              <span>{{ $t("roleTokenGenerator.removeBgLink") }}</span>
            </a>
          </div>

          <section class="options-section">
            <h4>{{ $t("roleTokenGenerator.inputMode") }}</h4>
            <div class="segmented-control">
              <label
                v-for="mode in inputModes"
                :key="mode.value"
                :class="{ selected: options.inputImageMode === mode.value }"
              >
                <input
                  v-model="options.inputImageMode"
                  type="radio"
                  :value="mode.value"
                />
                {{ mode.label }}
              </label>
            </div>
          </section>

          <section class="options-section">
            <h4>{{ $t("roleTokenGenerator.processing") }}</h4>
            <label class="checkbox-field">
              <input
                v-model="options.removeBackgroundEnabled"
                type="checkbox"
              />
              <span>{{ $t("roleTokenGenerator.removeBackground") }}</span>
            </label>
            <label class="checkbox-field">
              <input v-model="options.invertEnabled" type="checkbox" />
              <span>{{ $t("roleTokenGenerator.invert") }}</span>
            </label>
            <label class="checkbox-field">
              <input v-model="options.cropEnabled" type="checkbox" />
              <span>{{ $t("roleTokenGenerator.crop") }}</span>
            </label>
            <label class="checkbox-field">
              <input v-model="options.paddingEnabled" type="checkbox" />
              <span>{{ $t("roleTokenGenerator.padding") }}</span>
            </label>
            <label class="checkbox-field">
              <input v-model="options.dropShadowEnabled" type="checkbox" />
              <span>{{ $t("roleTokenGenerator.dropShadow") }}</span>
            </label>
            <label class="checkbox-field">
              <input v-model="options.smoothBlend" type="checkbox" />
              <span>{{ $t("roleTokenGenerator.smoothBlend") }}</span>
            </label>
            <label class="form-field">
              <span>
                {{ $t("roleTokenGenerator.threshold") }}
                {{ options.contrastThreshold }}%
              </span>
              <input
                v-model.number="options.contrastThreshold"
                type="range"
                min="0"
                max="100"
                step="1"
              />
            </label>
            <label
              v-if="options.selectedColor.includes('traveller')"
              class="form-field"
            >
              <span>{{ $t("roleTokenGenerator.horizontalPadding") }}</span>
              <input
                v-model.number="options.horizontalPadding"
                type="number"
                min="-160"
                max="160"
              />
            </label>
          </section>

          <section class="options-section compact-grid">
            <label class="checkbox-field">
              <input v-model="options.borderEnabled" type="checkbox" />
              <span>{{ $t("roleTokenGenerator.border") }}</span>
            </label>
            <label class="form-field">
              <span>{{ $t("roleTokenGenerator.borderSize") }}</span>
              <input
                v-model.number="options.borderSize"
                type="number"
                min="0"
                max="32"
              />
            </label>
            <label class="checkbox-field">
              <input v-model="options.outputSizeEnabled" type="checkbox" />
              <span>{{ $t("roleTokenGenerator.outputSize") }}</span>
            </label>
            <label class="form-field">
              <span>{{ $t("roleTokenGenerator.sizePixels") }}</span>
              <input
                v-model.number="options.outputSize"
                type="number"
                min="128"
                max="2048"
              />
            </label>
          </section>

          <button
            type="button"
            class="button demon wide-button"
            :disabled="processing || !sourceFile"
            @click="processIcon"
          >
            <font-awesome-icon
              :icon="processing ? 'spinner' : 'magic'"
              :spin="processing"
            />
            <span>
              {{
                processing
                  ? $t("roleTokenGenerator.processingState")
                  : $t("roleTokenGenerator.process")
              }}
            </span>
          </button>
        </div>

        <div class="preview-column">
          <div class="preview-frame">
            <img
              v-if="processedIcon"
              :src="processedIcon"
              :alt="$t('roleTokenGenerator.title')"
              :style="previewImageStyle"
            />
            <span v-else>{{ $t("roleTokenGenerator.previewEmpty") }}</span>
          </div>
          <div v-if="processedIcon" class="adjustment-panel">
            <div class="adjustment-title">
              {{ $t("roleTokenGenerator.adjustments") }}
            </div>
            <label class="form-field">
              <span>{{ $t("roleTokenGenerator.scale") }}</span>
              <input
                v-model.number="adjustments.scale"
                type="range"
                min="50"
                max="160"
                step="1"
              />
            </label>
            <label class="form-field">
              <span>{{ $t("roleTokenGenerator.rotation") }}</span>
              <input
                v-model.number="adjustments.rotation"
                type="range"
                min="-180"
                max="180"
                step="1"
              />
            </label>
          </div>
          <div class="preview-actions">
            <button
              type="button"
              class="button action-button"
              :disabled="saving || !processedIcon"
              @click="downloadGeneratedIcon"
            >
              <font-awesome-icon icon="download" />
              <span>{{ $t("roleTokenGenerator.download") }}</span>
            </button>
            <button
              type="button"
              class="button action-button save-button"
              :disabled="saving || !processedIcon || !selectedRoleId"
              @click="saveGeneratedIcon"
            >
              <font-awesome-icon
                :icon="saving ? 'spinner' : 'save'"
                :spin="saving"
              />
              <span>
                {{
                  saving
                    ? $t("roleTokenGenerator.saving")
                    : $t("roleTokenGenerator.save")
                }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div v-if="loadingRoles" class="state-line compact">
        <font-awesome-icon icon="spinner" spin />
        {{ $t("roleTokenGenerator.loadingRoles") }}
      </div>
      <div v-else-if="!roles.length" class="state-line compact">
        {{ $t("roleTokenGenerator.noRoles") }}
      </div>
      <div v-if="rolesError" class="state-line error compact">
        {{ rolesError }}
      </div>
      <div v-if="generationError" class="state-line error compact">
        {{ generationError }}
      </div>
      <div v-if="saveError" class="state-line error compact">
        {{ saveError }}
      </div>
      <div v-if="saveMessage" class="state-line success compact">
        {{ saveMessage }}
      </div>
    </section>
  </Modal>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import Modal from "./Modal";
import {
  getMyUploadedRoles,
  updateMyUploadedRoleIcon,
  uploadScriptImageDataUrl,
} from "@/services/scripts";
import { clearAuthSession, getAuthSession } from "@/services/auth";
import { ROLE_TEAM_ORDER, normalizeRoleForLibrary } from "@/utils/roleLibrary";
import newWhiteTexture from "@/assets/role-token-textures/new-white.png";
import newGoodTexture from "@/assets/role-token-textures/new-good.png";
import newEvilTexture from "@/assets/role-token-textures/new-evil.png";
import newTravellerTexture from "@/assets/role-token-textures/new-traveller.png";
import newTravellerGoodTexture from "@/assets/role-token-textures/new-travellergood.png";
import newTravellerEvilTexture from "@/assets/role-token-textures/new-travellerevil.png";
import newFabledTexture from "@/assets/role-token-textures/new-fabled.png";
import newLoricTexture from "@/assets/role-token-textures/new-loric.png";

const OUTPUT_SIZE = 800;
const TEXTURE_SOURCES = {
  white: newWhiteTexture,
  blue: newGoodTexture,
  red: newEvilTexture,
  traveller: newTravellerTexture,
  travellergood: newTravellerGoodTexture,
  travellerevil: newTravellerEvilTexture,
  gold: newFabledTexture,
  green: newLoricTexture,
};

export default {
  components: { Modal },
  data() {
    return {
      options: {
        selectedColor: "red",
        inputImageMode: "auto",
        removeBackgroundEnabled: false,
        invertEnabled: false,
        cropEnabled: true,
        paddingEnabled: true,
        borderEnabled: true,
        borderSize: 0,
        dropShadowEnabled: true,
        smoothBlend: true,
        horizontalPadding: 0,
        contrastThreshold: 50,
        outputSizeEnabled: true,
        outputSize: OUTPUT_SIZE,
      },
      adjustments: {
        scale: 100,
        rotation: 0,
      },
      roles: [],
      loadingRoles: false,
      rolesError: "",
      selectedRoleId: "",
      sourceFile: null,
      sourceFileName: "",
      sourcePreview: "",
      isDragOver: false,
      processing: false,
      processedIcon: "",
      generationError: "",
      saving: false,
      saveMessage: "",
      saveError: "",
      reprocessTimer: null,
      textureCache: null,
    };
  },
  computed: {
    ...mapState(["modals"]),
    teamOptions() {
      return ROLE_TEAM_ORDER;
    },
    inputModes() {
      return [
        {
          value: "auto",
          label: this.$t("roleTokenGenerator.modeAuto"),
        },
        {
          value: "black-white",
          label: this.$t("roleTokenGenerator.modeBlackWhite"),
        },
        {
          value: "greyscale",
          label: this.$t("roleTokenGenerator.modeGreyscale"),
        },
      ];
    },
    selectedTextureKey() {
      if (TEXTURE_SOURCES[this.options.selectedColor])
        return this.options.selectedColor;
      return "red";
    },
    colorOptions() {
      return [
        { value: "blue", label: this.$t("roleTokenGenerator.colorGood") },
        { value: "red", label: this.$t("roleTokenGenerator.colorEvil") },
        {
          value: "traveller",
          label: this.$t("roleTokenGenerator.colorTraveller"),
        },
        { value: "gold", label: this.$t("roleTokenGenerator.colorFabled") },
        { value: "green", label: this.$t("roleTokenGenerator.colorLoric") },
        {
          value: "travellergood",
          label: this.$t("roleTokenGenerator.colorTravellerGood"),
        },
        {
          value: "travellerevil",
          label: this.$t("roleTokenGenerator.colorTravellerEvil"),
        },
      ];
    },
    adjustedTransform() {
      const scale = Math.max(0.5, Math.min(1.6, this.adjustments.scale / 100));
      const rotation = Number(this.adjustments.rotation) || 0;
      return `rotate(${rotation}deg) scale(${scale})`;
    },
    previewImageStyle() {
      return {
        transform: this.adjustedTransform,
      };
    },
  },
  watch: {
    "modals.roleTokenGenerator"(visible) {
      if (visible) {
        this.loadRoles();
        document.addEventListener("paste", this.handlePasteImage);
      } else {
        document.removeEventListener("paste", this.handlePasteImage);
      }
    },
    "options.selectedColor"() {
      this.reprocessIconAfterVisualChange();
    },
  },
  beforeDestroy() {
    document.removeEventListener("paste", this.handlePasteImage);
    window.clearTimeout(this.reprocessTimer);
    this.revokeSourcePreview();
  },
  methods: {
    close() {
      this.closeModal("roleTokenGenerator");
    },
    isLoggedIn() {
      return !!getAuthSession().token;
    },
    async loadRoles() {
      if (this.loadingRoles) return;
      if (!this.isLoggedIn()) {
        this.openModalOverlay("login");
        return;
      }
      this.rolesError = "";
      this.loadingRoles = true;
      try {
        const res = await getMyUploadedRoles({ page: 1, pageSize: 50 });
        if (!res || !res.success || !res.data) {
          throw new Error(
            (res && res.message) ||
              this.$t("roleTokenGenerator.loadRolesFailed"),
          );
        }
        this.roles = (res.data.list || []).map((role) =>
          normalizeRoleForLibrary(role, "custom"),
        );
        if (!this.selectedRoleId && this.roles[0]) {
          this.selectedRoleId = this.roles[0].docId;
        }
      } catch (error) {
        this.rolesError = this.resolveError(
          error,
          this.$t("roleTokenGenerator.loadRolesFailed"),
        );
      } finally {
        this.loadingRoles = false;
      }
    },
    openFilePicker() {
      if (this.$refs.fileInput) this.$refs.fileInput.click();
    },
    handleFileInput(event) {
      const file = event.target.files && event.target.files[0];
      if (file) this.setSourceFile(file);
      event.target.value = "";
    },
    handleDrop(event) {
      this.isDragOver = false;
      const file = event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) this.setSourceFile(file);
    },
    handlePasteImage(event) {
      if (!this.modals.roleTokenGenerator || !event.clipboardData) return;
      const item = Array.from(event.clipboardData.items || []).find((entry) =>
        entry.type.startsWith("image/"),
      );
      if (!item) return;
      const file = item.getAsFile();
      if (file) {
        event.preventDefault();
        this.setSourceFile(file);
      }
    },
    setSourceFile(file) {
      if (
        !file ||
        (!file.type.startsWith("image/") && file.type !== "image/svg+xml")
      ) {
        this.generationError = this.$t("roleTokenGenerator.invalidFile");
        return;
      }
      this.revokeSourcePreview();
      this.sourceFile = file;
      this.sourceFileName = file.name || this.$t("roleTokenGenerator.pasted");
      this.sourcePreview = URL.createObjectURL(file);
      this.processedIcon = "";
      this.generationError = "";
      this.saveMessage = "";
      this.saveError = "";
      this.setAutomaticBorderSize(this.sourcePreview);
    },
    revokeSourcePreview() {
      if (this.sourcePreview) URL.revokeObjectURL(this.sourcePreview);
      this.sourcePreview = "";
    },
    async processIcon() {
      if (this.processing || !this.sourceFile) return;
      this.generationError = "";
      this.saveMessage = "";
      this.saveError = "";
      this.processing = true;
      try {
        this.processedIcon = await this.renderProcessedIconDataUrl(
          this.sourceFile,
        );
      } catch (error) {
        this.generationError = this.resolveError(
          error,
          this.$t("roleTokenGenerator.processFailed"),
        );
      } finally {
        this.processing = false;
      }
    },
    reprocessIconAfterVisualChange() {
      if (!this.sourceFile || !this.processedIcon || this.processing) return;
      window.clearTimeout(this.reprocessTimer);
      this.reprocessTimer = window.setTimeout(() => {
        this.processIcon();
      }, 120);
    },
    async renderProcessedIconDataUrl(file) {
      const image = await this.loadImageFromFile(file);
      let imageData = this.drawSourceToImageData(image);
      const outputSize = this.normalizedOutputSize();
      if (this.options.outputSizeEnabled) {
        imageData = this.resizeImageDataToMax(imageData, outputSize, true);
      }
      imageData = this.removeBackground(imageData);
      if (this.options.selectedColor.includes("traveller")) {
        imageData = this.addHorizontalPaddingImageData(
          imageData,
          Number(this.options.horizontalPadding) || 0,
        );
      }
      imageData = this.padIconToSquare(imageData);
      const borderSize = this.normalizedBorderSize();
      imageData = this.toGreyscaleImageData(imageData);
      if (this.shouldThreshold(imageData)) {
        imageData = this.thresholdImageData(imageData);
      }
      if (this.options.invertEnabled)
        imageData = this.invertImageData(imageData);
      if (this.options.borderEnabled && borderSize) {
        imageData = this.addBorderImageData(imageData, borderSize);
      }
      const whiteTexture = await this.loadTextureImageData("white");
      const colorTexture = await this.loadTextureImageData(
        this.selectedTextureKey,
      );
      imageData = this.applyRoleTokenTextures(
        imageData,
        whiteTexture,
        colorTexture,
      );
      if (this.options.cropEnabled) imageData = this.cropImageData(imageData);
      if (this.options.dropShadowEnabled) {
        imageData = this.addDropShadowImageData(imageData);
      }
      if (this.options.paddingEnabled) {
        imageData = this.padIconToRavenswoodSquare(imageData);
      }
      if (this.options.outputSizeEnabled) {
        imageData = this.resizeImageDataToMax(imageData, outputSize, false);
      }
      return this.imageDataToDataUrl(imageData);
    },
    setAutomaticBorderSize(url) {
      const image = new Image();
      image.onload = () => {
        const maxSide = Math.max(image.naturalWidth, image.naturalHeight);
        this.options.borderSize = Math.round(maxSide * 0.016);
      };
      image.src = url;
    },
    loadImageFromFile(file) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        const url = URL.createObjectURL(file);
        image.crossOrigin = "anonymous";
        image.onload = () => {
          URL.revokeObjectURL(url);
          resolve(image);
        };
        image.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error(this.$t("roleTokenGenerator.invalidFile")));
        };
        image.src = url;
      });
    },
    drawSourceToImageData(image) {
      const maxSourceSize = 1200;
      const scale = Math.min(
        1,
        maxSourceSize / Math.max(image.naturalWidth, image.naturalHeight),
      );
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, width, height);
      try {
        context.drawImage(image, 0, 0, width, height);
        return context.getImageData(0, 0, width, height);
      } catch (error) {
        throw new Error(this.$t("roleTokenGenerator.canvasReadFailed"));
      }
    },
    removeBackground(imageData) {
      if (!this.options.removeBackgroundEnabled) return imageData;
      const next = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height,
      );
      const data = next.data;
      for (let index = 0; index < data.length; index += 4) {
        const average = (data[index] + data[index + 1] + data[index + 2]) / 3;
        if (average > 238) data[index + 3] = 0;
      }
      return next;
    },
    toGreyscaleImageData(imageData) {
      const next = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height,
      );
      const data = next.data;
      for (let index = 0; index < data.length; index += 4) {
        const grey = Math.round(
          data[index] * 0.299 +
            data[index + 1] * 0.587 +
            data[index + 2] * 0.114,
        );
        data[index] = grey;
        data[index + 1] = grey;
        data[index + 2] = grey;
      }
      return next;
    },
    shouldThreshold(imageData) {
      if (this.options.inputImageMode === "black-white") return false;
      if (this.options.inputImageMode === "greyscale") return true;
      return !this.isMostlyBlackWhiteImageData(imageData);
    },
    isMostlyBlackWhiteImageData(imageData) {
      let blackWhite = 0;
      let total = 0;
      const data = imageData.data;
      for (let index = 0; index < data.length; index += 4) {
        if (data[index + 3] < 10) continue;
        total += 1;
        const value = data[index];
        if (value <= 30 || value >= 225) blackWhite += 1;
      }
      return total ? blackWhite / total >= 0.85 : true;
    },
    thresholdImageData(imageData) {
      const next = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height,
      );
      const threshold = Math.round(
        (this.options.contrastThreshold / 100) * 255,
      );
      const data = next.data;
      for (let index = 0; index < data.length; index += 4) {
        if (data[index + 3] === 0) continue;
        let value = 128;
        if (data[index] < threshold - 3) value = 0;
        if (data[index] > threshold + 3) value = 255;
        data[index] = value;
        data[index + 1] = value;
        data[index + 2] = value;
      }
      return next;
    },
    invertImageData(imageData) {
      const next = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height,
      );
      const data = next.data;
      for (let index = 0; index < data.length; index += 4) {
        if (data[index + 3] === 0) continue;
        data[index] = 255 - data[index];
        data[index + 1] = 255 - data[index + 1];
        data[index + 2] = 255 - data[index + 2];
      }
      return next;
    },
    cropImageData(imageData) {
      const data = imageData.data;
      let minX = imageData.width;
      let minY = imageData.height;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < imageData.height; y += 1) {
        for (let x = 0; x < imageData.width; x += 1) {
          const alpha = data[(y * imageData.width + x) * 4 + 3];
          if (alpha < 10) continue;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
      if (maxX < minX || maxY < minY) return imageData;
      const width = maxX - minX + 1;
      const height = maxY - minY + 1;
      const next = new ImageData(width, height);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const source = ((minY + y) * imageData.width + minX + x) * 4;
          const target = (y * width + x) * 4;
          next.data[target] = data[source];
          next.data[target + 1] = data[source + 1];
          next.data[target + 2] = data[source + 2];
          next.data[target + 3] = data[source + 3];
        }
      }
      return next;
    },
    addBorderImageData(imageData, borderSize) {
      if (!borderSize) return imageData;
      const source = this.imageDataToCanvas(imageData);
      const whiteSource = document.createElement("canvas");
      whiteSource.width = imageData.width;
      whiteSource.height = imageData.height;
      const whiteContext = whiteSource.getContext("2d");
      whiteContext.drawImage(source, 0, 0);
      whiteContext.globalCompositeOperation = "source-in";
      whiteContext.fillStyle = "#ffffff";
      whiteContext.fillRect(0, 0, imageData.width, imageData.height);
      const canvas = document.createElement("canvas");
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);
      for (let step = 0; step < 48; step += 1) {
        const angle = (step / 48) * Math.PI * 2;
        const x = Math.cos(angle) * borderSize;
        const y = Math.sin(angle) * borderSize;
        context.drawImage(whiteSource, x, y);
      }
      context.drawImage(source, 0, 0);
      return context.getImageData(0, 0, canvas.width, canvas.height);
    },
    addHorizontalPaddingImageData(imageData, amount) {
      if (!amount) return imageData;
      const padding = Math.abs(amount);
      const width = imageData.width + padding;
      const next = new ImageData(width, imageData.height);
      const offsetX = amount < 0 ? padding : 0;
      return this.copyImageDataInto(imageData, next, offsetX, 0);
    },
    padIconToSquare(imageData) {
      const size = Math.max(imageData.width, imageData.height);
      if (imageData.width === size && imageData.height === size) {
        return imageData;
      }
      const next = new ImageData(size, size);
      const offsetX = Math.floor((size - imageData.width) / 2);
      const offsetY = Math.floor((size - imageData.height) / 2);
      return this.copyImageDataInto(imageData, next, offsetX, offsetY);
    },
    padIconToRavenswoodSquare(imageData) {
      const cropped = this.cropImageData(imageData);
      if (!cropped.width || !cropped.height) return new ImageData(400, 400);
      const aspect =
        Math.min(cropped.width, cropped.height) /
        Math.max(cropped.width, cropped.height);
      const paddingRatio = 0.094 + (0.188 - 0.094) * aspect;
      const size = Math.ceil(
        Math.max(cropped.width, cropped.height) / (1 - 2 * paddingRatio),
      );
      const next = new ImageData(size, size);
      const offsetX = Math.floor((size - cropped.width) / 2);
      const offsetY = Math.floor((size - cropped.height) / 2);
      return this.copyImageDataInto(cropped, next, offsetX, offsetY);
    },
    copyImageDataInto(source, target, offsetX, offsetY) {
      for (let y = 0; y < source.height; y += 1) {
        for (let x = 0; x < source.width; x += 1) {
          const sourceIndex = (y * source.width + x) * 4;
          const targetIndex = ((y + offsetY) * target.width + x + offsetX) * 4;
          target.data[targetIndex] = source.data[sourceIndex];
          target.data[targetIndex + 1] = source.data[sourceIndex + 1];
          target.data[targetIndex + 2] = source.data[sourceIndex + 2];
          target.data[targetIndex + 3] = source.data[sourceIndex + 3];
        }
      }
      return target;
    },
    addDropShadowImageData(imageData) {
      const canvas = document.createElement("canvas");
      const averageSide = (imageData.width + imageData.height) / 2;
      const offsetX = Math.floor(averageSide * 0.01);
      const offsetY = Math.floor(averageSide * 0.01);
      const blur = Math.floor(averageSide * 0.02);
      const padding = blur * 2 + Math.max(offsetX, offsetY);
      canvas.width = imageData.width + padding;
      canvas.height = imageData.height + padding;
      const context = canvas.getContext("2d");
      const source = this.imageDataToCanvas(imageData);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.filter = `drop-shadow(${offsetX}px ${offsetY}px ${blur}px rgba(0, 0, 0, 0.2))`;
      context.drawImage(
        source,
        Math.floor((padding - offsetX) / 2),
        Math.floor((padding - offsetY) / 2),
      );
      context.filter = "none";
      return context.getImageData(0, 0, canvas.width, canvas.height);
    },
    async loadTextureImageData(textureKey) {
      if (!this.textureCache) this.textureCache = {};
      const key = TEXTURE_SOURCES[textureKey] ? textureKey : "blue";
      if (this.textureCache[key]) return this.textureCache[key];
      const url = TEXTURE_SOURCES[key];
      const image = await this.loadImageFromUrl(
        url,
        this.$t("roleTokenGenerator.textureLoadFailed", { texture: key, url }),
      );
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      const context = canvas.getContext("2d");
      let imageData;
      try {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      } catch (error) {
        throw new Error(this.$t("roleTokenGenerator.canvasReadFailed"));
      }
      this.textureCache[key] = imageData;
      return imageData;
    },
    loadImageFromUrl(url, errorMessage) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => resolve(image);
        image.onerror = () =>
          reject(
            new Error(
              errorMessage || this.$t("roleTokenGenerator.processFailed"),
            ),
          );
        image.src = url;
      });
    },
    applyRoleTokenTextures(imageData, whiteTexture, colorTexture) {
      const white = this.resizeTextureImageData(
        whiteTexture,
        imageData.width,
        imageData.height,
      );
      const color = this.resizeTextureImageData(
        colorTexture,
        imageData.width,
        imageData.height,
      );
      const next = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height,
      );
      const data = next.data;
      for (let index = 0; index < data.length; index += 4) {
        const alpha = imageData.data[index + 3];
        if (!alpha) {
          data[index + 3] = 0;
          continue;
        }
        const brightness =
          (imageData.data[index] +
            imageData.data[index + 1] +
            imageData.data[index + 2]) /
          3;
        if (this.options.smoothBlend) {
          const amount = brightness / 255;
          data[index] = Math.round(
            color.data[index] * (1 - amount) + white.data[index] * amount,
          );
          data[index + 1] = Math.round(
            color.data[index + 1] * (1 - amount) +
              white.data[index + 1] * amount,
          );
          data[index + 2] = Math.round(
            color.data[index + 2] * (1 - amount) +
              white.data[index + 2] * amount,
          );
        } else {
          const texture = brightness < 128 ? color : white;
          data[index] = texture.data[index];
          data[index + 1] = texture.data[index + 1];
          data[index + 2] = texture.data[index + 2];
        }
        data[index + 3] = alpha;
      }
      return next;
    },
    resizeTextureImageData(texture, width, height) {
      const canvas = document.createElement("canvas");
      const size = Math.max(width, height);
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      context.drawImage(this.imageDataToCanvas(texture), 0, 0, size, size);
      return context.getImageData(0, 0, size, size);
    },
    resizeImageDataToMax(imageData, targetSize, onlyUpscale) {
      const maxSide = Math.max(imageData.width, imageData.height);
      if (!maxSide || (onlyUpscale && maxSide >= targetSize)) return imageData;
      if (!onlyUpscale && maxSide === targetSize) return imageData;
      const scale = targetSize / maxSide;
      const width = Math.max(1, Math.round(imageData.width * scale));
      const height = Math.max(1, Math.round(imageData.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(this.imageDataToCanvas(imageData), 0, 0, width, height);
      return context.getImageData(0, 0, width, height);
    },
    imageDataToDataUrl(imageData) {
      return this.imageDataToCanvas(imageData).toDataURL("image/png");
    },
    normalizedOutputSize() {
      return Math.max(
        128,
        Math.min(2048, Number(this.options.outputSize) || OUTPUT_SIZE),
      );
    },
    normalizedBorderSize() {
      return Math.max(0, Math.min(32, Number(this.options.borderSize) || 0));
    },
    imageDataToCanvas(imageData) {
      const canvas = document.createElement("canvas");
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      canvas.getContext("2d").putImageData(imageData, 0, 0);
      return canvas;
    },
    async saveGeneratedIcon() {
      if (this.saving) return;
      if (!this.selectedRoleId) {
        this.saveError = this.$t("roleTokenGenerator.roleRequired");
        return;
      }
      if (!this.processedIcon) return;
      this.saveError = "";
      this.saveMessage = "";
      this.saving = true;
      try {
        const iconUrl = await this.prepareIconForSave();
        const res = await updateMyUploadedRoleIcon(
          this.selectedRoleId,
          iconUrl,
        );
        if (!res || !res.success || !res.data) {
          throw new Error(
            (res && res.message) || this.$t("roleTokenGenerator.saveFailed"),
          );
        }
        const updated = normalizeRoleForLibrary(res.data.role, "custom");
        this.roles = this.roles.map((role) =>
          role.docId === this.selectedRoleId ? updated : role,
        );
        this.saveMessage = this.$t("roleTokenGenerator.saved");
        window.dispatchEvent(new Event("townsquare-user-roles-change"));
      } catch (error) {
        this.saveError = this.resolveError(
          error,
          this.$t("roleTokenGenerator.saveFailed"),
        );
      } finally {
        this.saving = false;
      }
    },
    async downloadGeneratedIcon() {
      if (!this.processedIcon) return;
      const dataUrl = await this.renderAdjustedIconDataUrl();
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "role-token-icon.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    teamLabel(team) {
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
    async prepareIconForSave() {
      const dataUrl = await this.renderAdjustedIconDataUrl();
      const uploadedUrl = await uploadScriptImageDataUrl({
        dataUrl,
        fileName: "role-token-icon.png",
        contentType: "image/png",
        size: this.estimateDataUrlSize(dataUrl),
      });
      if (!uploadedUrl)
        throw new Error(this.$t("roleTokenGenerator.saveFailed"));
      return uploadedUrl;
    },
    renderAdjustedIconDataUrl() {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          try {
            const size = 512;
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const context = canvas.getContext("2d");
            context.clearRect(0, 0, size, size);
            context.save();
            context.translate(size / 2, size / 2);
            context.rotate(
              ((Number(this.adjustments.rotation) || 0) * Math.PI) / 180,
            );
            const scale = Math.max(
              0.5,
              Math.min(1.6, Number(this.adjustments.scale || 100) / 100),
            );
            context.scale(scale, scale);
            context.drawImage(image, -size / 2, -size / 2, size, size);
            context.restore();
            resolve(canvas.toDataURL("image/png"));
          } catch (error) {
            reject(error);
          }
        };
        image.onerror = () =>
          reject(new Error(this.$t("roleTokenGenerator.saveFailed")));
        image.src = this.processedIcon;
      });
    },
    estimateDataUrlSize(dataUrl) {
      const base64 = String(dataUrl || "").split(",")[1] || "";
      return Math.floor((base64.length * 3) / 4);
    },
    resolveError(error, fallback) {
      const message = String((error && error.message) || error || "");
      if (/please log in first|please login first/i.test(message)) {
        this.handleAuthExpired();
        return this.$t("login.expiredSession");
      }
      if (/uniCloud web config is not configured/.test(message)) {
        return this.$t("login.missingUniCloudConfig");
      }
      if (/failed to fetch|network|timeout/i.test(message)) {
        return this.$t("roleTokenGenerator.networkError");
      }
      return message.replace(/^\[script-service\]:\s*/, "") || fallback;
    },
    handleAuthExpired() {
      clearAuthSession();
      window.dispatchEvent(new Event("townsquare-auth-change"));
      this.openModalOverlay("login");
    },
    ...mapMutations(["closeModal", "openModalOverlay"]),
  },
};
</script>

<style scoped lang="scss">
@import "../../vars.scss";

.role-token-generator-modal {
  ::v-deep .modal > .top-right-buttons > .top-right-button:first-child {
    display: none;
  }

  ::v-deep .modal {
    width: min(1080px, calc(100vw - 2em));
    max-width: min(1080px, calc(100vw - 2em));
    height: min(88vh, 820px);
    max-height: min(88vh, 820px);
    color: #dcc4a1;
    border: 2px solid #3d2e26;
    background: linear-gradient(
        180deg,
        rgba(24, 18, 15, 0.98),
        rgba(9, 7, 6, 0.98)
      ),
      #120f0e;
    font-family: "STKaiti", "KaiTi", "STSong", "SimSun", serif;
  }

  ::v-deep .modal > .slot {
    display: block;
    height: 100%;
    overflow: hidden;
  }
}

.token-generator-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto auto auto auto;
  gap: 0.55em;
  height: 100%;
  min-height: 0;
  padding: 0.55em;
}

.panel-header {
  padding: 0.45em 0.55em;
  border: 1px solid #3d2e26;
  border-bottom: 3px double #4a3b32;
  background: rgba(18, 15, 13, 0.78);
}

.panel-header small {
  color: #b8a082;
}

h3,
h4 {
  margin: 0;
  color: #d4af37;
  letter-spacing: 0.06em;
}

h3 {
  margin-top: 0.08em;
  font-size: 1.12em;
}

h4 {
  font-size: 0.9em;
}

.generator-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(17em, 20em);
  gap: 0.85em;
  min-height: 0;
  overflow: hidden;
}

.form-column,
.preview-column {
  display: grid;
  gap: 0.5em;
  align-content: start;
  min-height: 0;
  padding: 0.55em;
  border: 1px solid #3d2e26;
  background: rgba(18, 15, 13, 0.62);
}

.form-column {
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.8em;
}

.preview-column {
  position: sticky;
  top: 0;
  align-self: start;
  max-height: 100%;
  overflow: hidden;
}

.form-field {
  display: grid;
  gap: 0.25em;
  min-width: 0;
  color: #dcc4a1;
  font-size: 0.86em;
}

.form-field > span {
  color: #fff8e7;
  font-weight: 700;
}

.form-field input,
.form-field select {
  width: 100%;
  min-width: 0;
  padding: 0.42em 0.48em;
  color: #f7f0df;
  border: 1px solid #3d2e26;
  border-radius: 2px;
  outline: 0;
  background: rgba(5, 4, 4, 0.62);
  font: inherit;
}

.upload-area {
  display: grid;
  place-items: center;
  min-height: 8em;
  padding: 0.65em;
  color: #d7c3a7;
  border: 2px dashed #4a3b32;
  background: rgba(5, 4, 4, 0.34);
  cursor: pointer;
  text-align: center;
}

.upload-area:hover,
.upload-area.drag-over {
  border-color: #b68a23;
  background: rgba(68, 47, 16, 0.36);
}

.file-input {
  display: none;
}

.upload-copy,
.selected-image {
  display: grid;
  gap: 0.35em;
  justify-items: center;
}

.upload-copy strong {
  color: #fff8e7;
}

.selected-image img {
  display: block;
  width: 5.2em;
  height: 5.2em;
  object-fit: contain;
  border: 1px solid #3d2e26;
  background: linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.08) 25%,
      transparent 25%
    ),
    linear-gradient(-45deg, rgba(255, 255, 255, 0.08) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.08) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.08) 75%),
    rgba(5, 4, 4, 0.62);
  background-position:
    0 0,
    0 8px,
    8px -8px,
    -8px 0;
  background-size: 16px 16px;
}

.selected-image span {
  max-width: 24em;
  overflow: hidden;
  color: #b8a082;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shortcut-links {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45em;
}

.shortcut-links a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35em;
  min-height: 2.2em;
  padding: 0.35em 0.5em;
  color: #f7f0df;
  border: 1px solid #4a3b32;
  border-radius: 2px;
  background: rgba(5, 4, 4, 0.48);
  font-size: 0.84em;
  text-decoration: none;
}

.shortcut-links a:hover {
  color: #fff8e7;
  border-color: #b68a23;
  background: rgba(68, 47, 16, 0.36);
}

.options-section {
  display: grid;
  gap: 0.4em;
  padding: 0.45em;
  border: 1px dashed #3d2e26;
  background: rgba(5, 4, 4, 0.24);
}

.compact-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.segmented-control {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35em;
}

.segmented-control label,
.checkbox-field {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  color: #dcc4a1;
  font-size: 0.84em;
  gap: 0.32em;
}

.segmented-control label {
  padding: 0.34em 0.5em;
  border: 1px solid #3d2e26;
  background: rgba(5, 4, 4, 0.38);
  cursor: pointer;
}

.segmented-control label.selected {
  color: #fff8e7;
  border-color: #b68a23;
  background: rgba(126, 83, 10, 0.48);
}

.segmented-control input {
  display: none;
}

.checkbox-field input {
  accent-color: #b68a23;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.15em;
  margin: 0;
  padding: 0 0.58em;
  color: #dcc4a1;
  border: 1px solid #3d2e26;
  border-radius: 2px;
  background: #1d1816;
  cursor: pointer;
  font-family: inherit;
  gap: 0.32em;
}

.button:hover {
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

.wide-button,
.action-button {
  width: 100%;
}

.preview-frame {
  display: grid;
  place-items: center;
  width: 100%;
  max-height: min(44vh, 19em);
  aspect-ratio: 1 / 1;
  color: #b8a082;
  border: 1px solid #3d2e26;
  background: linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.07) 25%,
      transparent 25%
    ),
    linear-gradient(-45deg, rgba(255, 255, 255, 0.07) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.07) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.07) 75%),
    rgba(5, 4, 4, 0.62);
  background-position:
    0 0,
    0 8px,
    8px -8px,
    -8px 0;
  background-size: 16px 16px;
  overflow: hidden;
  text-align: center;
  font-size: 0.82em;
}

.preview-frame img {
  display: block;
  width: 82%;
  height: 82%;
  object-fit: contain;
}

.adjustment-panel {
  display: grid;
  gap: 0.55em;
  padding: 0.6em;
  border: 1px solid #3d2e26;
  background: rgba(18, 12, 9, 0.88);
}

.adjustment-title {
  color: #dcc4a1;
  font-size: 0.84em;
  font-weight: 700;
}

.preview-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0.45em;
}

.adjustment-panel input[type="range"],
.options-section input[type="range"] {
  padding: 0;
  accent-color: #b68a23;
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

.error {
  color: $demon;
}

.success {
  color: #8fc28f;
}

@media (max-width: 720px) {
  .role-token-generator-modal {
    ::v-deep .modal {
      height: auto;
      max-height: min(88vh, 820px);
    }

    ::v-deep .modal > .slot {
      overflow: auto;
    }
  }

  .token-generator-panel {
    height: auto;
  }

  .generator-layout,
  .compact-grid {
    grid-template-columns: minmax(0, 1fr);
    overflow: visible;
  }

  .form-column {
    overflow: visible;
    padding-right: 0.55em;
  }

  .preview-column {
    position: static;
    overflow: visible;
  }
}
</style>
