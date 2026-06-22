const fs = require("fs");
const path = require("path");

const sourcePath = path.join(
  __dirname,
  "..",
  "src",
  "services",
  "scriptPoster.js",
);
const source = fs.readFileSync(sourcePath, "utf8");
const transformed = `${source
  .replace(/export const (\w+) =/g, "const $1 =")
  .replace(/export function (\w+)/g, "function $1")}
module.exports = { normalizeScriptPosterData, SCRIPT_POSTER_TEAMS };`;
const moduleRef = { exports: {} };

Function("module", transformed)(moduleRef);

const { normalizeScriptPosterData, SCRIPT_POSTER_TEAMS } = moduleRef.exports;

const sample = [
  {
    id: "_meta",
    name: "Test Script",
    author: "647",
    logo: "https://example.test/logo.png",
  },
  {
    id: "adventurer",
    name: "Adventurer",
    team: "townsfolk",
    image: "https://example.test/adventurer.png",
    ability: "On your first night, learn useful information.",
    firstNight: 18,
  },
  {
    id: "drunk",
    name: "Drunk",
    team: "outsider",
    image_url: "https://example.test/drunk.png",
    ability: "You do not know you are the Drunk.",
  },
  {
    id: "assassin",
    name: "Assassin",
    team: "demon",
    ability: "Once per game at night, choose a player: they die.",
    otherNight: 11,
  },
  {
    id: "bureaucrat",
    name: "Bureaucrat",
    team: "traveler",
    ability: "Each night, choose a player.",
  },
  {
    id: "djinn",
    name: "Djinn",
    team: "fabled",
    ability: "Use the Djinn's special rule.",
  },
];

const data = normalizeScriptPosterData(JSON.stringify(sample));
const modalSource = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "src",
    "components",
    "modals",
    "ImageGeneratorModal.vue",
  ),
  "utf8",
);
const loginModalSource = fs.readFileSync(
  path.join(__dirname, "..", "src", "components", "modals", "LoginModal.vue"),
  "utf8",
);
const editionModalSource = fs.readFileSync(
  path.join(__dirname, "..", "src", "components", "modals", "EditionModal.vue"),
  "utf8",
);
const storeSource = fs.readFileSync(
  path.join(__dirname, "..", "src", "store", "index.js"),
  "utf8",
);
const serverSource = fs.readFileSync(
  path.join(__dirname, "..", "server", "index.js"),
  "utf8",
);
const nginxSource = fs.readFileSync(
  path.join(__dirname, "..", "nginx.conf"),
  "utf8",
);
const dockerfileSource = fs.readFileSync(
  path.join(__dirname, "..", "Dockerfile"),
  "utf8",
);
const composeSource = fs.readFileSync(
  path.join(__dirname, "..", "docker-compose.yml"),
  "utf8",
);
const vueConfigSource = fs.readFileSync(
  path.join(__dirname, "..", "vue.config.js"),
  "utf8",
);
const packageSource = fs.readFileSync(
  path.join(__dirname, "..", "package.json"),
  "utf8",
);
const mainSource = fs.readFileSync(
  path.join(__dirname, "..", "src", "main.js"),
  "utf8",
);
const menuSource = fs.readFileSync(
  path.join(__dirname, "..", "src", "components", "Menu.vue"),
  "utf8",
);
const i18nSource = fs.readFileSync(
  path.join(__dirname, "..", "src", "i18n", "index.js"),
  "utf8",
);

if (data.title !== "Test Script") {
  throw new Error(`Expected title from _meta, got ${data.title}`);
}

if (data.author !== "647") {
  throw new Error(`Expected author from _meta, got ${data.author}`);
}

if (data.roles.length !== 3) {
  throw new Error(
    `Expected _meta to be excluded, got ${data.roles.length} roles`,
  );
}

if (
  data.roles.some((role) =>
    ["traveler", "traveller", "fabled"].includes(role.team),
  )
) {
  throw new Error(
    "Expected travelers and fabled roles to be excluded from poster roles",
  );
}

if (data.roles[0].image !== "https://example.test/adventurer.png") {
  throw new Error("Expected role image URL to be preserved");
}

if (data.groups.outsider[0].image !== "https://example.test/drunk.png") {
  throw new Error("Expected role image_url to be used as the poster image");
}

if (data.groups.townsfolk[0].name !== "Adventurer") {
  throw new Error("Expected townsfolk role to be grouped");
}

if (data.groups.outsider[0].name !== "Drunk") {
  throw new Error("Expected outsider role to be grouped");
}

if (data.groups.demon[0].name !== "Assassin") {
  throw new Error("Expected demon role to be grouped");
}

if (!SCRIPT_POSTER_TEAMS.some((team) => team.key === "minion")) {
  throw new Error("Expected minion team metadata");
}

if (
  SCRIPT_POSTER_TEAMS.some((team) =>
    ["traveler", "traveller", "fabled"].includes(team.key),
  )
) {
  throw new Error(
    "Expected traveler and fabled team areas to be removed from poster",
  );
}

if (!modalSource.includes("imageCache: Object.create(null)")) {
  throw new Error("Expected poster image loader to keep an image cache");
}

if (!modalSource.includes("this.imageCache[cacheKey]")) {
  throw new Error(
    "Expected poster image loader to reuse cached image requests",
  );
}

if (!modalSource.includes("retry image without CORS")) {
  throw new Error(
    "Expected poster image loader to retry blocked remote images",
  );
}

if (!modalSource.includes("retry image without proxy")) {
  throw new Error(
    "Expected poster image loader to fall back when the image proxy fails",
  );
}

if (!modalSource.includes("useProxy: false")) {
  throw new Error("Expected poster image loader to support direct image retry");
}

[
  "posterRenderId: 0",
  "posterRedrawTimer: null",
  "isPosterPreviewRendering: false",
  "const renderId = this.nextPosterRenderId()",
  "this.isPosterPreviewRendering = true",
  "this.isPosterPreviewRendering = false",
  "isCurrentPosterRender(renderId)",
  "if (!this.isCurrentPosterRender(renderId)) return;",
  "const previewCanvas = this.createPosterExportCanvas()",
  "this.copyPosterCanvas(canvas, previewCanvas)",
  "this.clearScheduledPosterRender()",
  "schedulePosterRender(poster)",
  "this.posterRedrawTimer = window.setTimeout(",
  "this.posterRedrawTimer = null",
  "this.renderPoster(poster).catch",
  "clearScheduledPosterRender()",
  "window.clearTimeout(this.posterRedrawTimer)",
  "nextPosterRenderId()",
  "copyPosterCanvas(targetCanvas, sourceCanvas)",
].forEach((snippet) => {
  if (!modalSource.includes(snippet)) {
    throw new Error(
      `Expected poster rendering to ignore stale async draws: ${snippet}`,
    );
  }
});

[
  ':disabled="isPosterPreviewRendering"',
  'class="poster-preview-loading"',
  "top: 50%;",
  "left: 50%;",
  "transform: translate(-50%, -50%);",
  '$t("modals.imageGenerator.status.previewGenerating")',
].forEach((snippet) => {
  if (!modalSource.includes(snippet)) {
    throw new Error(
      `Expected poster preview to show a loading state while rendering: ${snippet}`,
    );
  }
});

[
  "preloadPosterRoleImages(poster, options)",
  "collectPosterImageRoles(poster)",
  "Promise.all(",
  "this.preloadPosterRoleImages(poster, options)",
  "const roleImagePreload =",
  "fastPreview: true",
  "this.refreshPosterImagesAfterPreload(",
  "if (roleImagePreload && !options.fastPreview) await roleImagePreload",
  "if (options.fastPreview && !this.hasCachedRoleImage(role, options))",
  "hasCachedRoleImage(role, options)",
].forEach((snippet) => {
  if (!modalSource.includes(snippet)) {
    throw new Error(
      `Expected poster preview to preload role images without blocking first paint: ${snippet}`,
    );
  }
});

[
  "isBlockedRemoteRoleImageHost",
  "if (this.isBlockedRemoteRoleImageHost(src))",
  "role image skipped because host returns deleted placeholders",
  "isUnavailableRemoteRoleImage",
  "isPostimageHost",
  "isBlueRemovedImagePlaceholder",
  "postimage.org",
  "postimages.org",
  "postimg.cc",
  "Math.abs(naturalWidth - naturalHeight)",
  "if (isSmallSquarePlaceholder) return true;",
  'document.createElement("canvas")',
  "getImageData",
  "bluePixels / sampledPixels > 0.45",
  "role image resolved to unavailable placeholder",
].forEach((snippet) => {
  if (!modalSource.includes(snippet)) {
    throw new Error(
      `Expected poster image loader to reject removed-image placeholders: ${snippet}`,
    );
  }
});

if (
  modalSource.includes("naturalWidth === 103") ||
  modalSource.includes("naturalHeight === 103")
) {
  throw new Error(
    "Expected removed-image placeholder detection to stop relying on one fixed size",
  );
}

[
  "showGlossary: false",
  'v-model="showGlossary"',
  "if (this.showGlossary) this.drawGlossary(ctx);",
  "posterTopText",
  "posterTitleOverride",
  "posterAuthorOverride",
  "getPosterDisplayData",
].forEach((snippet) => {
  if (!modalSource.includes(snippet)) {
    throw new Error(`Expected poster display option: ${snippet}`);
  }
});

[
  "drawPosterContent",
  "exportSafe: true",
  "export-safe poster generated",
  "allowDirect: false",
  "createPosterExportCanvas",
  'document.createElement("canvas")',
  "normalizeImageSource",
  'src.startsWith("//")',
  "if (!allowDirect) throw error;",
].forEach((snippet) => {
  if (!modalSource.includes(snippet)) {
    throw new Error(`Expected export-safe poster retry: ${snippet}`);
  }
});

if (modalSource.includes("compact ? 1 : 2")) {
  throw new Error(
    "Expected poster abilities to render without fixed line caps",
  );
}

if (!modalSource.includes("loadRoleImage")) {
  throw new Error(
    "Expected poster roles to load JSON icons with local fallback",
  );
}

if (
  !modalSource.includes("role.imageUrl") ||
  !modalSource.includes("role.image_url")
) {
  throw new Error("Expected poster image loader to use JSON image fields");
}

if (modalSource.includes("../../assets/icons")) {
  throw new Error("Expected poster image loader to avoid bundled local icons");
}

[
  'import { getAuthSession } from "@/services/auth";',
  "isServerGenerating: false",
  ':disabled="!posterDataUrl || isServerGenerating"',
  "downloadPosterLabel",
  "requirePosterGenerationLogin",
  "const { token, user } = getAuthSession();",
  'this.openModalOverlay("login")',
  "isServerGenerating = true",
  "isServerGenerating = false",
].forEach((snippet) => {
  if (!modalSource.includes(snippet)) {
    throw new Error(
      `Expected authenticated server poster generation: ${snippet}`,
    );
  }
});

['this.closeModal("login")', '...mapMutations(["closeModal"])'].forEach(
  (snippet) => {
    if (!loginModalSource.includes(snippet)) {
      throw new Error(
        `Expected login success overlay to preserve image generator: ${snippet}`,
      );
    }
  },
);

if (loginModalSource.includes('this.toggleModal("login")')) {
  throw new Error(
    "Expected login modal close to avoid toggling and closing other modals",
  );
}

[
  "this.drawPosterWatermark(ctx);",
  "drawPosterWatermark(ctx)",
  'this.$t("modals.imageGenerator.canvas.watermark")',
  'ctx.textAlign = "right"',
  'ctx.fillStyle = "rgba(255, 255, 255, 0.5)"',
  "POSTER_WIDTH - 88,",
  "POSTER_HEIGHT - 18",
].forEach((snippet) => {
  if (!modalSource.includes(snippet)) {
    throw new Error(`Expected poster watermark drawing support: ${snippet}`);
  }
});

const watermarkBlockStart = modalSource.indexOf("    drawPosterWatermark(ctx)");
const watermarkBlockEnd = modalSource.indexOf(
  "drawGlossaryShell(ctx)",
  watermarkBlockStart,
);
const watermarkBlock = modalSource.slice(
  watermarkBlockStart,
  watermarkBlockEnd,
);
['ctx.textAlign = "right"', "POSTER_WIDTH - 88,"].forEach((snippet) => {
  if (!watermarkBlock.includes(snippet)) {
    throw new Error(
      `Expected poster watermark to stay inside right edge: ${snippet}`,
    );
  }
});
["ctx.shadowColor", "ctx.shadowBlur"].forEach((snippet) => {
  if (watermarkBlock.includes(snippet)) {
    throw new Error(
      `Expected poster watermark to avoid shadow edge: ${snippet}`,
    );
  }
});

const posterTitleBlockStart = modalSource.indexOf("    drawPosterTitle(ctx");
const posterTitleBlockEnd = modalSource.indexOf(
  "setFittedTitleFont(ctx",
  posterTitleBlockStart,
);
const posterTitleBlock = modalSource.slice(
  posterTitleBlockStart,
  posterTitleBlockEnd,
);
if (!posterTitleBlock.includes('ctx.textAlign = "left"')) {
  throw new Error("Expected poster title drawing to remain left aligned");
}

if (!i18nSource.includes('watermark: "萌萌出品  Q群 961227547"')) {
  throw new Error("Expected poster watermark text to be translated");
}

if (modalSource.includes("normalizeRoleIconKey")) {
  throw new Error("Expected poster image loader to avoid local icon matching");
}

if (!modalSource.includes("GLOSSARY_TOP")) {
  throw new Error("Expected glossary layout to use a shared top boundary");
}

const nightColumnStart = modalSource.indexOf("async drawNightColumn(");
const nightColumnEnd = modalSource.indexOf(
  "drawVerticalText(",
  nightColumnStart,
);
const nightColumnHeaderBlock = modalSource.slice(
  nightColumnStart,
  nightColumnEnd,
);
if (!nightColumnHeaderBlock.includes("SimSun, serif")) {
  throw new Error("Expected night order title font to match role text font");
}
if (nightColumnHeaderBlock.includes("SimHei")) {
  throw new Error("Expected night order title font to stop using SimHei");
}

const nightColumnFallbackEnd = modalSource.indexOf(
  "drawVerticalText(ctx",
  nightColumnStart,
);
const nightColumnBlock = modalSource.slice(
  nightColumnStart,
  nightColumnFallbackEnd,
);
if (!nightColumnBlock.includes("this.getNightFallbackLabel(role)")) {
  throw new Error(
    "Expected missing night action images to fall back to role name first character",
  );
}
if (nightColumnBlock.includes("String(index + 1)")) {
  throw new Error(
    "Expected missing night action images to stop using order numbers",
  );
}
if (
  !nightColumnBlock.includes(
    "const fallbackCircleSize = config.nightIconSize * 0.68",
  )
) {
  throw new Error(
    "Expected missing night action text circle to be smaller than icon size",
  );
}
if (!nightColumnBlock.includes("fallbackCircleSize / 2")) {
  throw new Error(
    "Expected missing night action text circle radius to use reduced size",
  );
}

const backgroundAssetDir = path.join(
  __dirname,
  "..",
  "src",
  "assets",
  "script-poster-backgrounds",
);
if (!fs.existsSync(backgroundAssetDir)) {
  throw new Error("Expected selectable poster background assets directory");
}
if (
  fs
    .readdirSync(backgroundAssetDir)
    .filter((fileName) => /\.png$/i.test(fileName)).length < 1
) {
  throw new Error("Expected selectable poster background PNG assets");
}

[
  "POSTER_BACKGROUND_OPTIONS",
  "loadPosterBackgroundOptions",
  "require.context(",
  "script-poster-backgrounds",
  "fileName",
  "displayName",
  "posterBackgroundOptions",
  "selectedPosterBackgroundSrc",
  "posterBackgroundId",
  'v-model="posterBackgroundId"',
  "backgroundId: this.posterBackgroundId",
  "payload.backgroundId",
].forEach((snippet) => {
  if (!modalSource.includes(snippet)) {
    throw new Error(`Expected poster background selector support: ${snippet}`);
  }
});

[
  "backgroundContext",
  ".keys()",
  "naturalComparePosterBackgrounds",
  "option.displayName",
  "posterWeddingBackground01",
  'value: "wedding-01"',
].forEach((snippet) => {
  const shouldExist =
    !snippet.startsWith("posterWedding") && !snippet.includes('"wedding-01"');
  const exists = modalSource.includes(snippet);
  if (shouldExist && !exists) {
    throw new Error(`Expected dynamic poster background support: ${snippet}`);
  }
  if (!shouldExist && exists) {
    throw new Error(
      `Expected fixed poster background import to be removed: ${snippet}`,
    );
  }
});

[
  "scriptPosterBase",
  "script-poster-parchment-background",
  'value: "parchment"',
  "modals.imageGenerator.backgrounds.default",
].forEach((snippet) => {
  if (modalSource.includes(snippet)) {
    throw new Error(
      `Expected default parchment background to be removed: ${snippet}`,
    );
  }
});

const headerBlockStart = modalSource.indexOf("    async drawHeader(ctx");
const headerBlockEnd = modalSource.indexOf(
  "drawReferenceHeader(ctx",
  headerBlockStart,
);
const headerBlock = modalSource.slice(headerBlockStart, headerBlockEnd);
[
  "poster.logo",
  "ctx.arc(900",
  "ctx.drawImage(logo",
  "drawIconFallback(ctx, 900",
].forEach((snippet) => {
  if (headerBlock.includes(snippet)) {
    throw new Error(`Expected top-right poster icon to be removed: ${snippet}`);
  }
});

[
  "teamTitleLeft",
  "roleAreaLeft",
  "roleAreaTop",
  "roleNameAbilityGap",
  "abilityTextWidth",
  "abilityLineHeight",
  "headerPanelOffsetX",
  "showHeaderPanel",
  "headerPanelWidth",
  "headerPanelHeight",
  "headerPanelTitleTop",
  "headerPanelContentTop",
  "headerTitleOffsetX",
  "headerTitleOffsetY",
  "titleArtStyle",
  "headerAuthorColor",
  "roleGap",
  "townsfolkRoleGap",
  "outsiderRoleGap",
  "minionRoleGap",
  "demonRoleGap",
  "teamGap",
  "townsfolkTeamGap",
  "outsiderTeamGap",
  "minionTeamGap",
  "demonTeamGap",
  "glossaryBottomOffset",
  "roleIconSize",
  "roleNameColor",
  "roleAbilityColor",
  "roleNameFontSize",
  "roleAbilityFontSize",
  "roleAreaTitleGap",
  "glossaryTextGap",
  "showNightOrder",
  "nightIconSize",
  "nightIconGap",
  "nightTop",
  "nightTopOffset",
  "nightTitleFontSize",
  "nightFirstTitleFontSize",
  "nightOtherTitleFontSize",
  "nightTitleLeftOffset",
].forEach((key) => {
  if (!modalSource.includes(key)) {
    throw new Error(`Expected poster layout control for ${key}`);
  }
});

[
  "teamTitleLeft: 90",
  "roleAreaLeft: 90",
  "roleAreaTop: 160",
  "roleNameAbilityGap: 20",
  "headerPanelOffsetX: 140",
  "showHeaderPanel: false",
  "headerPanelWidth: 380",
  "headerPanelHeight: 121",
  "headerPanelTitleTop: 32",
  "headerPanelContentTop: 72",
  "headerTitleOffsetX: 240",
  "headerTitleOffsetY: -10",
  'titleArtStyle: "classic"',
  'headerAuthorColor: "#17110d"',
  "headerAuthorOffsetX: 130",
  "headerAuthorOffsetY: 7",
  "titleArtStyleOptions",
  "this.drawPosterTitle(",
  "poster.title,",
  "applyTitleArtStyle(",
  "goldEmboss",
  "cinnabarSeal",
  "midnightBlue",
  "darkGold",
  "abilityTextWidth: 300",
  "abilityLineHeight: 18",
  "roleGap: -10",
  "townsfolkRoleGap: -10",
  "outsiderRoleGap: -10",
  "minionRoleGap: -10",
  "demonRoleGap: -10",
  "teamGap: 0",
  "townsfolkTeamGap: 0",
  "outsiderTeamGap: 0",
  "minionTeamGap: 0",
  "demonTeamGap: 0",
  "glossaryBottomOffset: 20",
  "roleIconSize: 105",
  'roleNameColor: "#0c83a6"',
  'roleAbilityColor: "#17110d"',
  'key: "headerAuthorColor"',
  'key: "roleIconSize"',
  'key: "roleNameColor"',
  'key: "roleAbilityColor"',
  "control.type === 'checkbox'",
  "control.type === 'color'",
  'type="color"',
  "max: 800",
  'roleIconSize: read("roleIconSize", 12, 800)',
  "showHeaderPanel: this.posterLayout.showHeaderPanel === true",
  "headerAuthorColor: this.normalizeColor(",
  "roleNameColor: this.normalizeColor(",
  "roleAbilityColor: this.normalizeColor(",
  "roleNameFontSize: 24",
  "roleAbilityFontSize: 15",
  "roleAreaTitleGap: 34",
  "glossaryTextGap: 44",
  "showNightOrder: true",
  "nightIconSize: 75",
  "nightIconGap: 55",
  "nightTop: 532",
  "nightTopOffset: 0",
  "nightTitleFontSize: 26",
  "nightFirstTitleFontSize: 26",
  "nightOtherTitleFontSize: 26",
  "nightTitleLeftOffset: 36",
  "const titleX = config.teamTitleLeft",
  "const leftX = config.roleAreaLeft",
  "const rightX = leftX + 472",
  "const textOffsetX = iconSize + 18",
  "iconSize: config.roleIconSize",
  "nameColor: config.roleNameColor",
  "abilityColor: config.roleAbilityColor",
  "nameFontSize: config.roleNameFontSize",
  "abilityFontSize: config.roleAbilityFontSize",
  "titleGap: config.roleAreaTitleGap",
  "posterTopContent",
  "topContent: this.posterTopContent.trim()",
  "drawHeaderPanel(",
  "if (config.showHeaderPanel) {",
  "drawHeaderContent(",
  "splitHeaderContent(",
  "contentText.split(/\\s+/)",
  "words.slice(0, maxLines).forEach",
  "fitHeaderLine(",
  'key: "headerPanelTitleTop"',
  'key: "headerPanelContentTop"',
  'key: "showNightOrder"',
  'key: "nightTopOffset"',
  'headerPanelOffsetX: read("headerPanelOffsetX", -1000, 1000)',
  'headerPanelTitleTop: read("headerPanelTitleTop", 0, 1000)',
  'headerPanelContentTop: read("headerPanelContentTop", 0, 1000)',
  'headerTitleOffsetX: read("headerTitleOffsetX", -1000, 1000)',
  'headerAuthorOffsetX: read("headerAuthorOffsetX", -1000, 1000)',
  "const contentStartY = panel.y + config.headerPanelContentTop",
  "const y = panel.y + config.headerPanelTitleTop",
  "config.headerPanelOffsetX",
  "config.headerPanelWidth",
  "config.headerPanelHeight",
  "config.headerPanelTitleTop",
  "config.headerPanelContentTop",
  "config.headerTitleOffsetX",
  "config.headerTitleOffsetY",
  'const roleGap = this.readTeamGap(columns.config, team.key, "roleGap")',
  'const teamGap = this.readTeamGap(columns.config, team.key, "teamGap")',
  "readTeamGap(config, teamKey, gapType)",
  "config.glossaryTextGap",
  "showNightOrder: this.posterLayout.showNightOrder !== false",
  "if (config.showNightOrder) {",
  "config.nightIconSize",
  "config.nightIconGap",
  "config.nightTop",
  'read("nightTop", 400, 900) + read("nightTopOffset", -1000, 1000)',
  "config.nightTitleFontSize",
  "config.nightFirstTitleFontSize",
  "config.nightOtherTitleFontSize",
  "config.nightTitleLeftOffset",
  "drawVerticalText(",
  "Array.from(text)",
  "config.nightFirstTitleFontSize",
  "config.nightOtherTitleFontSize",
  "buildProxiedImageUrl",
  '"/api/script-poster-image?url="',
  "ctx.fillStyle = settings.nameColor || team.accent",
  'ctx.fillStyle = settings.abilityColor || "#17110d"',
].forEach((snippet) => {
  if (!modalSource.includes(snippet)) {
    throw new Error(
      `Expected poster layout default or split control: ${snippet}`,
    );
  }
});

[
  'key: "townsfolkRoleGap"',
  'key: "outsiderRoleGap"',
  'key: "minionRoleGap"',
  'key: "demonRoleGap"',
  'key: "townsfolkTeamGap"',
  'key: "outsiderTeamGap"',
  'key: "minionTeamGap"',
  'key: "demonTeamGap"',
].forEach((snippet) => {
  const start = modalSource.indexOf(snippet);
  if (start === -1) {
    throw new Error(`Expected poster gap control block for ${snippet}`);
  }
  const block = modalSource.slice(start, start + 180);
  if (!block.includes("min: -100")) {
    throw new Error(`Expected ${snippet} control to allow -100 spacing`);
  }
});

[
  'roleGap: read("roleGap", -100, 28)',
  'teamGap: read("teamGap", -100, 80)',
  'townsfolkRoleGap: read("townsfolkRoleGap", -100, 28)',
  'outsiderRoleGap: read("outsiderRoleGap", -100, 28)',
  'minionRoleGap: read("minionRoleGap", -100, 28)',
  'demonRoleGap: read("demonRoleGap", -100, 28)',
  'townsfolkTeamGap: read("townsfolkTeamGap", -100, 80)',
  'outsiderTeamGap: read("outsiderTeamGap", -100, 80)',
  'minionTeamGap: read("minionTeamGap", -100, 80)',
  'demonTeamGap: read("demonTeamGap", -100, 80)',
].forEach((snippet) => {
  if (!modalSource.includes(snippet)) {
    throw new Error(`Expected poster gap clamp to allow -100: ${snippet}`);
  }
});

if (!modalSource.includes('@change="redrawPoster"')) {
  throw new Error(
    "Expected layout controls to redraw the poster after changes",
  );
}

if (!modalSource.includes("getPosterGroups")) {
  throw new Error("Expected poster drawing to rebuild role groups when needed");
}

if (modalSource.includes("const roles = poster.groups[team.key]")) {
  throw new Error("Expected role layout to use normalized fallback groups");
}

if (modalSource.includes("ctx.moveTo(x + 150, y + 4)")) {
  throw new Error(
    "Expected team title line to align with the actual title width",
  );
}

if (modalSource.includes("support-count")) {
  throw new Error("Expected support-count text to be removed from the header");
}

[
  "ctx.fillRect(76, 0, POSTER_WIDTH - 152, 150)",
  "ctx.shadowOffsetX = 4",
  "ctx.shadowOffsetY = 4",
  "ctx.createLinearGradient(470, 18, 835, 112)",
  "ctx.createLinearGradient(405, 18, 900, 118)",
  "this.roundRect(ctx, 450, 18, 380, 94",
  "this.drawHeaderShell(ctx)",
  "drawHeaderShell(ctx)",
  'return;\n\n      ctx.fillStyle = "#2a2119"',
].forEach((snippet) => {
  if (modalSource.includes(snippet)) {
    throw new Error(`Expected header ghosting to be removed: ${snippet}`);
  }
});

[
  'ctx.textBaseline = "middle"',
  "const titleCenterY = y + settings.titleFontSize / 2",
  "ctx.moveTo(x + titleWidth + 18, titleCenterY)",
].forEach((snippet) => {
  if (!modalSource.includes(snippet)) {
    throw new Error(
      `Expected team title divider to align to title middle: ${snippet}`,
    );
  }
});

[
  "headerAuthorOffsetX",
  "headerAuthorOffsetY",
  "headerAuthorOffset",
  "headerAuthorColor",
  "ctx.fillStyle = config.headerAuthorColor",
  "作者名字颜色",
  "Author Name Color",
].forEach((snippet) => {
  if (!modalSource.includes(snippet) && !i18nSource.includes(snippet)) {
    throw new Error(`Expected author style control: ${snippet}`);
  }
});

[
  'this.$t("modals.imageGenerator.canvas.author"',
  'this.$t("modals.imageGenerator.canvas.autoLayout")',
  'this.$t("modals.imageGenerator.canvas.fallbackWatermark")',
].forEach((snippet) => {
  if (!modalSource.includes(snippet)) {
    throw new Error(`Expected translated header text: ${snippet}`);
  }
});

["鍓ф湰浣滆€咃細", "鏈煡", "JSON 鑷姩鎺掔増"].forEach((snippet) => {
  if (modalSource.includes(snippet)) {
    throw new Error(`Expected header mojibake to be removed: ${snippet}`);
  }
});

[
  "const layout = this.measureRoleLayout(ctx, poster",
  "this.drawTeamTitle(",
  "await this.drawRole(",
  "drawNightColumn(",
  "config,",
  "columns.config.roleAreaTop",
  "columns.config.roleAreaBottom",
].forEach((snippet) => {
  if (!modalSource.includes(snippet)) {
    throw new Error(`Expected role drawing path to include ${snippet}`);
  }
});

[
  'ctx.fillText("首夜", 36, 380)',
  'ctx.fillText("其他夜", POSTER_WIDTH - 36, 380)',
].forEach((snippet) => {
  if (modalSource.includes(snippet)) {
    throw new Error(
      `Expected duplicate fixed night label to be removed: ${snippet}`,
    );
  }
});

[
  "layoutSections()",
  'sectionLabel("basic")',
  'sectionLabel("roles")',
  'sectionLabel("night")',
  'sectionLabel("glossary")',
  'controlLabel("teamTitleLeft")',
].forEach((snippet) => {
  if (!modalSource.includes(snippet)) {
    throw new Error(`Expected grouped settings UI for ${snippet}`);
  }
});

[
  "poster-controls-scroll",
  ".poster-controls-scroll",
  "overflow-y: auto",
  "height: min(82vh, calc(100vh - 3em))",
  "align-items: stretch",
  "height: 100%",
  "max-height: none",
  "poster-action-primary",
  "poster-action-secondary",
  "position: static",
  "poster-control-messages",
  'aria-live="polite"',
  ".poster-control-messages",
].forEach((snippet) => {
  if (!modalSource.includes(snippet)) {
    throw new Error(
      `Expected stable scrollable controls or polished actions: ${snippet}`,
    );
  }
});

[
  ".poster-control-group {\n  padding: 0;\n  overflow: hidden;",
  ".poster-control-group:not([open])",
].forEach((snippet) => {
  if (modalSource.includes(snippet)) {
    throw new Error("Expected poster control groups to avoid clipping content");
  }
});

const scrollStart = modalSource.indexOf('<div class="poster-controls-scroll">');
const scriptActionsStart = modalSource.indexOf(
  '<div class="poster-command-grid poster-script-actions">',
);
const messagesStart = modalSource.indexOf(
  '<div\n            v-if="error || status"',
);
const actionsStart = modalSource.indexOf(
  '<div class="poster-actions poster-command-grid">',
);
if (
  scrollStart === -1 ||
  scriptActionsStart === -1 ||
  messagesStart === -1 ||
  actionsStart === -1
) {
  throw new Error("Expected control scroll, messages, and actions regions");
}
if (
  !(
    scriptActionsStart < scrollStart &&
    scrollStart < messagesStart &&
    messagesStart < actionsStart
  )
) {
  throw new Error(
    "Expected script picker, scrolling controls, messages, and actions to be separate stable regions",
  );
}
const scrollBlock = modalSource.slice(scrollStart, messagesStart);
if (
  scrollBlock.includes("poster-status success") ||
  scrollBlock.includes("poster-error error") ||
  scrollBlock.includes("script-picker-action")
) {
  throw new Error(
    "Expected status, error messages, and script picker outside poster-controls-scroll",
  );
}

const scriptActionsStyleStart = modalSource.indexOf(".poster-script-actions {");
const scriptActionsStyleBlock = modalSource.slice(
  scriptActionsStyleStart,
  scriptActionsStyleStart + 160,
);
if (!scriptActionsStyleBlock.includes("flex: 0 0 auto")) {
  throw new Error(
    "Expected script picker actions to stay outside the scroll flex area",
  );
}

[
  "poster-control-overview",
  "poster-control-register",
  "poster-command-grid",
  "poster-control-group",
  "poster-control-group-title",
  "poster-field-grid",
  "poster-control-alert",
].forEach((snippet) => {
  if (!modalSource.includes(snippet)) {
    throw new Error(
      `Expected image generator to follow room-control UI pattern: ${snippet}`,
    );
  }
});

[
  "drawHeaderPanelCorners(ctx,",
  "ctx.setLineDash([10, 7])",
  "rgba(255, 246, 205, 0.5)",
  "rgba(91, 58, 24, 0.72)",
].forEach((snippet) => {
  if (!modalSource.includes(snippet)) {
    throw new Error(`Expected polished top content panel border: ${snippet}`);
  }
});

[
  "normalizeCurrentScriptPosterData",
  "chooseScript",
  "currentScriptName",
  "currentScriptRoleCount",
  'this.setEditionPickerTarget("poster")',
  'this.openModalOverlay("edition")',
].forEach((snippet) => {
  if (!modalSource.includes(snippet) && !source.includes(snippet)) {
    throw new Error(
      `Expected poster generator to use selected script: ${snippet}`,
    );
  }
});

[
  'editionPickerTarget: "global"',
  "posterEdition: null",
  "posterRoles: null",
  "setEditionPickerTarget",
  "setPosterScriptRoles",
].forEach((snippet) => {
  if (!storeSource.includes(snippet)) {
    throw new Error(`Expected isolated poster script store state: ${snippet}`);
  }
});

[
  'this.editionPickerTarget === "poster"',
  "this.setPosterScriptRoles",
  'this.setEditionPickerTarget("global")',
].forEach((snippet) => {
  if (!editionModalSource.includes(snippet)) {
    throw new Error(
      `Expected edition modal to isolate poster script selection: ${snippet}`,
    );
  }
});

['v-model="jsonInput"', "<textarea"].forEach((snippet) => {
  if (modalSource.includes(snippet)) {
    throw new Error(`Expected paste JSON input to be removed: ${snippet}`);
  }
});

if (!modalSource.includes("generatePoster()")) {
  throw new Error(
    "Expected image generator to refresh from current script state",
  );
}

[
  "imageGenerator: {",
  'title: "图片生成"',
  'title: "Image Generator"',
  'preview: "生成预览"',
  'preview: "Generate Preview"',
  'previewGenerating: "Generating preview..."',
  "team: {",
].forEach((snippet) => {
  if (!i18nSource.includes(snippet)) {
    throw new Error(`Expected image generator i18n entry: ${snippet}`);
  }
});

[
  '$t("menu.imageGenerator")',
  '$t("modals.imageGenerator.title")',
  '$t("modals.imageGenerator.description")',
  '$t("modals.imageGenerator.currentScript")',
  '$t("modals.imageGenerator.chooseScript")',
  '$t("modals.imageGenerator.actions.preview")',
  '$t("modals.imageGenerator.actions.downloadPng")',
  'this.$t("modals.imageGenerator.canvas.author"',
  'this.$t("modals.imageGenerator.canvas.unknownAuthor")',
  'this.$t("modals.imageGenerator.canvas.autoLayout")',
  'this.$t("modals.imageGenerator.canvas.defaultTopTitle")',
  'this.$t("modals.imageGenerator.canvas.scriptTitle")',
  'this.$t("modals.imageGenerator.canvas.fallbackWatermark")',
  'this.$t("modals.imageGenerator.canvas.firstNight")',
  'this.$t("modals.imageGenerator.canvas.otherNight")',
  'this.$t("modals.imageGenerator.glossary.title")',
  'this.$t("modals.imageGenerator.glossary.description")',
  "getPosterTeamLabel",
].forEach((snippet) => {
  if (!modalSource.includes(snippet) && !menuSource.includes(snippet)) {
    throw new Error(`Expected image generator to use i18n snippet: ${snippet}`);
  }
});

[
  "<h3>图片生成</h3>",
  "<p>选择当前剧本，生成接近参考图的剧本海报。</p>",
  "显示可能 / 中毒 / 醉酒",
  '<font-awesome-icon icon="image" /> 生成预览',
  '<font-awesome-icon icon="download" /> 下载 PNG',
  '`剧本作者：${poster.author || "未知"}`',
  'poster.topContent || "JSON 自动排版";',
  'ctx.fillText("閸撗勬拱"',
  '"首夜",',
  '"其他夜",',
  'ctx.fillText("可能 / 中毒 / 醉酒"',
].forEach((snippet) => {
  if (modalSource.includes(snippet) || menuSource.includes(snippet)) {
    throw new Error(
      `Expected image generator hardcoded UI text to move to i18n: ${snippet}`,
    );
  }
});

[
  "script-poster-image",
  "script-poster-render",
  "proxyScriptPosterImage",
  "renderScriptPosterPng",
  "puppeteer",
  "page.goto(frontendUrl",
  "canvas.screenshot",
  "canvas.style.width = `${canvas.width}px`",
  "readJsonBody",
  "new URL(requestUrl.searchParams.get",
  "Access-Control-Allow-Origin",
  "Accept:",
  "Referer:",
].forEach((snippet) => {
  if (!serverSource.includes(snippet)) {
    throw new Error(`Expected image proxy server support: ${snippet}`);
  }
});

[
  "resetPosterBrowser",
  "isPosterBrowserConnected",
  'browser.on("disconnected"',
  "isRetryablePosterRenderError",
  "Connection closed",
  "renderScriptPosterPngOnce",
  "retrying after browser disconnect",
].forEach((snippet) => {
  if (!serverSource.includes(snippet)) {
    throw new Error(
      `Expected poster render server to recover from disconnected browser: ${snippet}`,
    );
  }
});

if (!nginxSource.includes("location /api/script-poster-image")) {
  throw new Error("Expected nginx to proxy script poster image requests");
}

if (!nginxSource.includes("location /api/script-poster-render")) {
  throw new Error("Expected nginx to proxy script poster render requests");
}

[
  "proxy_read_timeout 180s",
  "proxy_send_timeout 180s",
  "proxy_connect_timeout 30s",
].forEach((snippet) => {
  if (!nginxSource.includes(snippet)) {
    throw new Error(`Expected nginx render proxy timeout: ${snippet}`);
  }
});

[
  "FROM node:20-bookworm-slim AS live",
  "PUPPETEER_SKIP_DOWNLOAD=true",
  "PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium",
  "apt-get install -y --no-install-recommends",
  "chromium",
  "fonts-noto-cjk",
].forEach((snippet) => {
  if (!dockerfileSource.includes(snippet)) {
    throw new Error(
      `Expected production Puppeteer runtime support: ${snippet}`,
    );
  }
});

if (
  !composeSource.includes(
    "TOWNSQUARE_POSTER_FRONTEND_URL: ${TOWNSQUARE_POSTER_FRONTEND_URL:-http://townsquare-web}",
  )
) {
  throw new Error(
    "Expected poster rendering to use the Docker internal frontend URL by default",
  );
}

if (!vueConfigSource.includes("/api/script-poster-image")) {
  throw new Error("Expected dev server to proxy script poster image requests");
}

if (!vueConfigSource.includes("/api/script-poster-render")) {
  throw new Error("Expected dev server to proxy script poster render requests");
}

[
  'const SCRIPT_POSTER_RENDER_API = "/api/script-poster-render"',
  "downloadPosterFromServer",
  "buildPosterRenderPayload",
  "fetch(SCRIPT_POSTER_RENDER_API",
  "response.blob()",
  "URL.createObjectURL",
  "renderScriptPosterPayload",
].forEach((snippet) => {
  if (!modalSource.includes(snippet)) {
    throw new Error(`Expected backend poster PNG download support: ${snippet}`);
  }
});

[
  "allowDirect: true",
  "useProxy: false",
  "allowDirect: options.allowDirect",
  "useProxy: options.useProxy",
].forEach((snippet) => {
  if (!modalSource.includes(snippet)) {
    throw new Error(
      `Expected backend poster render to load role icons directly: ${snippet}`,
    );
  }
});

if (!mainSource.includes("window.__townsquareApp = app")) {
  throw new Error(
    "Expected Vue app instance to be exposed for Puppeteer rendering",
  );
}

if (!packageSource.includes('"puppeteer"')) {
  throw new Error("Expected Puppeteer dependency");
}

console.log("script poster service tests passed");
