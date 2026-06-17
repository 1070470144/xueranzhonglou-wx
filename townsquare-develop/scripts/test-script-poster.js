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

[
  "teamTitleLeft",
  "roleAreaLeft",
  "roleAreaTop",
  "roleNameAbilityGap",
  "abilityTextWidth",
  "abilityLineHeight",
  "headerPanelOffsetX",
  "headerPanelWidth",
  "headerPanelHeight",
  "headerTitleOffsetX",
  "headerTitleOffsetY",
  "titleArtStyle",
  "roleGap",
  "teamGap",
  "glossaryBottomOffset",
  "roleIconSize",
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
  "headerPanelWidth: 380",
  "headerPanelHeight: 94",
  "headerTitleOffsetX: 0",
  "headerTitleOffsetY: 0",
  'titleArtStyle: "classic"',
  "titleArtStyleOptions",
  "this.drawPosterTitle(ctx, poster.title",
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
  'key: "roleIconSize"',
  "max: 800",
  'roleIconSize: read("roleIconSize", 12, 800)',
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
  "nameFontSize: config.roleNameFontSize",
  "abilityFontSize: config.roleAbilityFontSize",
  "titleGap: config.roleAreaTitleGap",
  "posterTopContent",
  "topContent: this.posterTopContent.trim()",
  "drawHeaderPanel(",
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
[
  "闂佸憡鎸嗛崟顒佸婵炶揪绲剧划蹇涘焵椤掆偓閹锋垹妲?,
  "poster.title || \"闂佸憡鎸嗛崟顒佸闂佸搫绉村ú顓€傜徊?",
  "poster.topContent || \"JSON 闂佺厧顨庢禍婊勬叏閳哄懎绠抽柟鐑樻煥椤ｇ唱"",
  "ctx.fillText(\"闂佸憡鎸嗛崟顒佸\", 0, 0)",
].forEach((snippet) => {
  if (!modalSource.includes(snippet)) {
    throw new Error(`Expected readable Chinese header text: ${snippet}`);
  }
});

[
  "闂傚倷绀侀幉锟犲箰閸℃稑绀嬫い鎺嶇椤忔澘鈹戦悙鑸靛涧缂佹彃澧介崚鎺曠疀濞戞鍔?,
  "闂傚倷绀侀幖顐︽偋濠婂嫮顩查柣鎰劋閸?,
  "婵犵數鍎戠徊钘壝归崒鐐茬獥婵炴埈娼块埀顑跨窔楠炲鈹戦崟銊ヤ壕闁圭儤顨呯粻娑欍亜閺嶃劎鐭屾い?,
  "濠电姷鏁搁崕鎴犲緤閽樺褰掑磼閻愯尙鐛ュ┑鐐村焾濞煎潡鍩€?,
  "闂傚倸鍊风粈渚€骞夐敓鐘冲仭闁靛鏅涚壕?,
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
  'ctx.fillText("濠碘槅鍋撶徊楣冩偋閺団挋?, 36, 380)',
  'ctx.fillText("闂備胶顭堢换鎴濓耿閸︻厼鍨濇い鎺嶇缁?, POSTER_WIDTH - 36, 380)',
].forEach((snippet) => {
  if (modalSource.includes(snippet)) {
    throw new Error(`Expected duplicate fixed night label to be removed: ${snippet}`);
  }
});

[
  "layoutSections",
  "闂佽崵濮崇粈浣规櫠娴犲鍋柛鈩冪☉缁€鍡涙煕閳╁啰鎳嗘い?,
  "闂備胶纭堕弲鐐测枍閿濆鈧線宕ㄩ閿敵闂佹枼鏅涢崯鈺冩?,
  "闂佽崵鍠愰悷锔炬暜閻斿摜鐝跺┑鐘叉搐缁€宀勬煕濠靛棗顏柛?,
  "濠电姰鍨奸崺鏍垝瀹ュ應鏋嶉柛鏇ㄥ厵娴滄粓鏌涘┑鍡楊伀缁?,
  "闂佸湱鍘ч悺銊ッ洪悢鐓庣？閻庨潧鎲＄€氭岸鎮楀☉娅虫垿锝?,
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
  "闂佽崵濮村ú銈夊床閺屻儱鍌ㄦ繛鎴炶壘閸ㄦ繃淇婇姘变虎闁搞劑浜堕弻娑㈠箻濡も偓鐎氼參骞?JSON",
].forEach((snippet) => {
  if (modalSource.includes(snippet)) {
    throw new Error(`Expected paste JSON input to be removed: ${snippet}`);
  }
});

if (!modalSource.includes("generatePoster()")) {
  throw new Error("Expected image generator to refresh from current script state");
}

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
