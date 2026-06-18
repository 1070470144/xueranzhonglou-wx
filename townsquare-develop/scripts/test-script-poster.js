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
const serverSource = fs.readFileSync(
  path.join(__dirname, "..", "server", "index.js"),
  "utf8",
);
const nginxSource = fs.readFileSync(
  path.join(__dirname, "..", "nginx.conf"),
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
  "showGlossary: true",
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

if (
  modalSource.includes("require.context(") ||
  modalSource.includes("../../assets/icons")
) {
  throw new Error("Expected poster image loader to avoid bundled local icons");
}

if (modalSource.includes("normalizeRoleIconKey")) {
  throw new Error("Expected poster image loader to avoid local icon matching");
}

if (!modalSource.includes("GLOSSARY_TOP")) {
  throw new Error("Expected glossary layout to use a shared top boundary");
}

const nightColumnStart = modalSource.indexOf("async drawNightColumn(");
const nightColumnEnd = modalSource.indexOf("drawVerticalText(", nightColumnStart);
const nightColumnHeaderBlock = modalSource.slice(nightColumnStart, nightColumnEnd);
if (!nightColumnHeaderBlock.includes("SimSun, serif")) {
  throw new Error("Expected night order title font to match role text font");
}
if (nightColumnHeaderBlock.includes("SimHei")) {
  throw new Error("Expected night order title font to stop using SimHei");
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
  'wedding: "背景图片 {index}"',
  'wedding: "Background Image {index}"',
].forEach((snippet) => {
  if (!i18nSource.includes(snippet)) {
    throw new Error(`Expected renamed poster background label: ${snippet}`);
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
  "headerTitleOffsetX",
  "headerTitleOffsetY",
  "titleArtStyle",
  "roleGap",
  "teamGap",
  "glossaryBottomOffset",
  "roleIconSize",
  "roleNameColor",
  "roleAbilityColor",
  "roleNameFontSize",
  "roleAbilityFontSize",
  "roleAreaTitleGap",
  "glossaryTextGap",
  "nightIconSize",
  "nightIconGap",
  "nightTop",
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
  "roleAreaLeft: 112",
  "roleAreaTop: 200",
  "roleNameAbilityGap: 20",
  "headerPanelOffsetX: 40",
  "showHeaderPanel: true",
  "headerPanelWidth: 380",
  "headerPanelHeight: 94",
  "headerTitleOffsetX: 0",
  "headerTitleOffsetY: 0",
  'titleArtStyle: "classic"',
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
  "teamGap: 30",
  "glossaryBottomOffset: 20",
  "roleIconSize: 40",
  'roleNameColor: "#0c83a6"',
  'roleAbilityColor: "#17110d"',
  'key: "roleIconSize"',
  'key: "roleNameColor"',
  'key: "roleAbilityColor"',
  "control.type === 'checkbox'",
  "control.type === 'color'",
  'type="color"',
  "max: 800",
  'roleIconSize: read("roleIconSize", 12, 800)',
  "showHeaderPanel: this.posterLayout.showHeaderPanel !== false",
  "roleNameColor: this.normalizeColor(",
  "roleAbilityColor: this.normalizeColor(",
  "roleNameFontSize: 24",
  "roleAbilityFontSize: 15",
  "roleAreaTitleGap: 34",
  "glossaryTextGap: 44",
  "nightIconSize: 30",
  "nightIconGap: 36",
  "nightTop: 532",
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
  "config.headerPanelOffsetX",
  "config.headerPanelWidth",
  "config.headerPanelHeight",
  "config.headerTitleOffsetX",
  "config.headerTitleOffsetY",
  "teamGap: config.teamGap",
  "config.glossaryTextGap",
  "config.nightIconSize",
  "config.nightIconGap",
  "config.nightTop",
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
  throw new Error("Expected team title line to align with the actual title width");
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
  "return;\n\n      ctx.fillStyle = \"#2a2119\"",
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
    throw new Error(`Expected team title divider to align to title middle: ${snippet}`);
  }
});

[
  "headerAuthorOffsetX",
  "headerAuthorOffsetY",
  "headerAuthorOffset",
].forEach((snippet) => {
  if (!modalSource.includes(snippet)) {
    throw new Error(`Expected author offset control: ${snippet}`);
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

[
  "鍓ф湰浣滆€咃細",
  "鏈煡",
  "JSON 鑷姩鎺掔増",
].forEach((snippet) => {
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
    throw new Error(`Expected duplicate fixed night label to be removed: ${snippet}`);
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
  "poster-action-primary",
  "poster-action-secondary",
  "position: sticky",
].forEach((snippet) => {
  if (!modalSource.includes(snippet)) {
    throw new Error(`Expected scrollable controls or polished actions: ${snippet}`);
  }
});

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
    throw new Error(`Expected image generator to follow room-control UI pattern: ${snippet}`);
  }
});

[
  "normalizeCurrentScriptPosterData",
  "chooseScript",
  "currentScriptName",
  "currentScriptRoleCount",
  'this.toggleModal("edition")',
].forEach((snippet) => {
  if (!modalSource.includes(snippet) && !source.includes(snippet)) {
    throw new Error(`Expected poster generator to use selected script: ${snippet}`);
  }
});

[
  'v-model="jsonInput"',
  "<textarea",
].forEach((snippet) => {
  if (modalSource.includes(snippet)) {
    throw new Error(`Expected paste JSON input to be removed: ${snippet}`);
  }
});

if (!modalSource.includes("generatePoster()")) {
  throw new Error("Expected image generator to refresh from current script state");
}

[
  'imageGenerator: {',
  'title: "图片生成"',
  'title: "Image Generator"',
  'preview: "生成预览"',
  'preview: "Generate Preview"',
  'team: {',
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
  "`剧本作者：${poster.author || \"未知\"}`",
  'poster.topContent || "JSON 自动排版";',
  'ctx.fillText("閸撗勬拱"',
  '"首夜",',
  '"其他夜",',
  'ctx.fillText("可能 / 中毒 / 醉酒"',
].forEach((snippet) => {
  if (modalSource.includes(snippet) || menuSource.includes(snippet)) {
    throw new Error(`Expected image generator hardcoded UI text to move to i18n: ${snippet}`);
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
  '"Accept"',
  '"Referer"',
].forEach((snippet) => {
  if (!serverSource.includes(snippet)) {
    throw new Error(`Expected image proxy server support: ${snippet}`);
  }
});

if (!nginxSource.includes("location /api/script-poster-image")) {
  throw new Error("Expected nginx to proxy script poster image requests");
}

if (!nginxSource.includes("location /api/script-poster-render")) {
  throw new Error("Expected nginx to proxy script poster render requests");
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
    throw new Error(`Expected backend poster render to load role icons directly: ${snippet}`);
  }
});

if (!mainSource.includes("window.__townsquareApp = app")) {
  throw new Error("Expected Vue app instance to be exposed for Puppeteer rendering");
}

if (!packageSource.includes('"puppeteer"')) {
  throw new Error("Expected Puppeteer dependency");
}

console.log("script poster service tests passed");
