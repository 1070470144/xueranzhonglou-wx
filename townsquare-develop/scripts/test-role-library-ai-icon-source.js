const fs = require("fs");
const path = require("path");

const src = path.resolve(__dirname, "../src");

function read(relativePath) {
  return fs.readFileSync(path.join(src, relativePath), "utf8");
}

function assertIncludes(source, text, label) {
  if (!source.includes(text)) {
    throw new Error(`${label} should include ${text}`);
  }
}

const roleLibrary = read("components/modals/RoleLibraryModal.vue");
const tokenGenerator = read("components/modals/RoleTokenGeneratorModal.vue");
const menu = read("components/Menu.vue");
const app = read("App.vue");
const store = read("store/index.js");
const scriptsService = read("services/scripts.js");
const i18n = read("i18n/index.js");

if (roleLibrary.includes("generateRoleIcon")) {
  throw new Error("RoleLibraryModal should not contain AI token generation");
}
if (roleLibrary.includes("createIconKeywords")) {
  throw new Error("RoleLibraryModal should not contain AI token keyword input");
}
if (tokenGenerator.includes("generateRoleIcon")) {
  throw new Error(
    "RoleTokenGeneratorModal should not call AI image generation",
  );
}
if (tokenGenerator.includes("@/services/ai")) {
  throw new Error("RoleTokenGeneratorModal should not import AI services");
}
assertIncludes(
  tokenGenerator,
  "updateMyUploadedRoleIcon",
  "RoleTokenGeneratorModal",
);
assertIncludes(tokenGenerator, "getMyUploadedRoles", "RoleTokenGeneratorModal");
assertIncludes(
  tokenGenerator,
  "clearAuthSession",
  "RoleTokenGeneratorModal stale login cleanup",
);
assertIncludes(
  tokenGenerator,
  "handleAuthExpired",
  "RoleTokenGeneratorModal expired login handler",
);
assertIncludes(
  tokenGenerator,
  "roleTokenGenerator.networkError",
  "RoleTokenGeneratorModal network error copy",
);
if (tokenGenerator.includes("login.networkError")) {
  throw new Error(
    "RoleTokenGeneratorModal should not show QR-code login network copy for role requests",
  );
}
assertIncludes(
  tokenGenerator,
  'type="file"',
  "token generator local file upload input",
);
assertIncludes(
  tokenGenerator,
  'accept="image/*,.svg"',
  "token generator should accept image and SVG files",
);
assertIncludes(
  tokenGenerator,
  "handlePasteImage",
  "token generator paste image support",
);
assertIncludes(
  tokenGenerator,
  "processIcon",
  "token generator local processing action",
);
assertIncludes(
  tokenGenerator,
  "renderProcessedIconDataUrl",
  "token generator local canvas processor",
);
assertIncludes(
  tokenGenerator,
  "thresholdImageData",
  "token generator black white threshold processing",
);
assertIncludes(
  tokenGenerator,
  "removeBackgroundEnabled: false",
  "token generator should match Ravenswood background removal default",
);
assertIncludes(
  tokenGenerator,
  "borderEnabled: true",
  "token generator should match Ravenswood border default",
);
assertIncludes(
  tokenGenerator,
  "smoothBlend: true",
  "token generator should expose Ravenswood smooth blend option",
);
assertIncludes(
  tokenGenerator,
  "horizontalPadding: 0",
  "token generator should expose Ravenswood traveller horizontal adjustment",
);
assertIncludes(
  tokenGenerator,
  "Math.round(maxSide * 0.016)",
  "token generator should auto-set border size from selected image dimensions",
);
assertIncludes(
  tokenGenerator,
  "newWhiteTexture",
  "token generator should load Ravenswood white texture",
);
assertIncludes(
  tokenGenerator,
  "newGoodTexture",
  "token generator should load Ravenswood good texture",
);
assertIncludes(
  tokenGenerator,
  "newEvilTexture",
  "token generator should load Ravenswood evil texture",
);
assertIncludes(
  tokenGenerator,
  "loadTextureImageData",
  "token generator should decode texture PNGs on canvas",
);
assertIncludes(
  tokenGenerator,
  "applyRoleTokenTextures",
  "token generator should blend white and team textures into visible pixels",
);
assertIncludes(
  tokenGenerator,
  "isMostlyBlackWhiteImageData",
  "token generator auto mode should detect black-white sources",
);
assertIncludes(
  tokenGenerator,
  "addDropShadowImageData",
  "token generator should render shadow into the final PNG",
);
assertIncludes(
  tokenGenerator,
  "addHorizontalPaddingImageData",
  "token generator should support traveller horizontal adjustment",
);
assertIncludes(
  tokenGenerator,
  "padIconToRavenswoodSquare",
  "token generator should use Ravenswood script-tool padding algorithm",
);
assertIncludes(
  tokenGenerator,
  "smoothBlend",
  "token generator should blend textures according to smooth blend option",
);
if (tokenGenerator.includes("buildAlphaMaskImageData")) {
  throw new Error(
    "RoleTokenGeneratorModal should not convert icons into a pure alpha mask",
  );
}
if (tokenGenerator.includes("preview-symbol")) {
  throw new Error(
    "RoleTokenGeneratorModal preview should render the final textured PNG, not a CSS mask",
  );
}
if (tokenGenerator.includes("maskImage")) {
  throw new Error(
    "RoleTokenGeneratorModal should not recolor processed icons with CSS maskImage",
  );
}
assertIncludes(
  tokenGenerator,
  'v-if="processedIcon"',
  "token generator preview should display processed PNG directly",
);
assertIncludes(
  tokenGenerator,
  "cropImageData",
  "token generator crop to content processing",
);
assertIncludes(
  tokenGenerator,
  "addBorderImageData",
  "token generator border processing",
);
assertIncludes(
  tokenGenerator,
  "canvas.width = imageData.width;",
  "token generator border should match Ravenswood same-canvas behavior",
);
assertIncludes(
  tokenGenerator,
  "paddingEnabled",
  "token generator padding option",
);
assertIncludes(
  tokenGenerator,
  "invertEnabled",
  "token generator invert option",
);
assertIncludes(
  tokenGenerator,
  "dropShadowEnabled",
  "token generator drop shadow option",
);
assertIncludes(
  tokenGenerator,
  "rgba(0, 0, 0, 0.2)",
  "token generator drop shadow should match Ravenswood opacity",
);
assertIncludes(
  tokenGenerator,
  'v-model="selectedRoleId"',
  "token generator target role selector",
);
assertIncludes(
  tokenGenerator,
  'v-model.number="adjustments.scale"',
  "token generator scale adjustment",
);
assertIncludes(
  tokenGenerator,
  'v-model.number="adjustments.rotation"',
  "token generator rotation adjustment",
);
assertIncludes(
  tokenGenerator,
  'v-model="options.selectedColor"',
  "token generator Ravenswood texture selector",
);
assertIncludes(
  tokenGenerator,
  "roleTokenGenerator.colorGood",
  "token generator should use Ravenswood texture names",
);
assertIncludes(
  i18n,
  "旅行者（邪恶）",
  "Ravenswood evil traveller texture Chinese label",
);
assertIncludes(
  tokenGenerator,
  "renderAdjustedIconDataUrl",
  "token generator should render adjusted icon before saving",
);
assertIncludes(
  tokenGenerator,
  "downloadGeneratedIcon",
  "token generator should download the adjusted icon locally",
);
assertIncludes(
  tokenGenerator,
  "role-token-icon.png",
  "token generator local download should use a PNG filename",
);
assertIncludes(
  tokenGenerator,
  "preview-actions",
  "token generator save and download actions should be grouped below preview controls",
);
assertIncludes(
  tokenGenerator,
  "adjustment-title",
  "token generator adjustments should sit in a separate panel below the preview",
);
assertIncludes(
  tokenGenerator,
  "saveGeneratedIcon",
  "token generator save action",
);
assertIncludes(
  menu,
  "toggleModal('roleTokenGenerator')",
  "my menu token generator entry",
);
assertIncludes(app, "<RoleTokenGeneratorModal />", "App modal registration");
assertIncludes(store, "roleTokenGenerator: false", "Vuex modal state");
assertIncludes(
  scriptsService,
  "updateMyUploadedRoleIcon",
  "scripts service update icon API",
);
assertIncludes(i18n, "roleTokenGenerator", "role token generator i18n");
assertIncludes(i18n, "tokenGenerator", "menu token generator i18n");
assertIncludes(i18n, "善良", "role token good texture Chinese label");
assertIncludes(i18n, "邪恶", "role token evil texture Chinese label");
assertIncludes(i18n, "旅行者", "role token traveller texture Chinese label");
assertIncludes(i18n, "传说角色", "role token fabled texture Chinese label");
assertIncludes(i18n, "神奇角色", "role token loric texture Chinese label");
assertIncludes(
  i18n,
  "旅行者（善良）",
  "role token good traveller texture Chinese label",
);
assertIncludes(
  i18n,
  "旅行者（邪恶）",
  "role token evil traveller texture Chinese label",
);
assertIncludes(
  tokenGenerator,
  "https://www.google.com/search?q=+vector&udm=2&tbs=itp:lineart,ic:trans",
  "token generator should link to free transparent line-art image search",
);
assertIncludes(
  tokenGenerator,
  "https://www.remove.bg/",
  "token generator should link to remove.bg background remover",
);
assertIncludes(
  tokenGenerator,
  "overflow: hidden;",
  "token generator modal should keep the workspace in one viewport",
);
assertIncludes(
  tokenGenerator,
  "overflow-y: auto;",
  "token generator form column should scroll independently when needed",
);
assertIncludes(
  tokenGenerator,
  "overflow-x: hidden;",
  "token generator form column should not show a horizontal scrollbar",
);
assertIncludes(
  tokenGenerator,
  "position: sticky;",
  "token generator preview should stay visible while editing options",
);
assertIncludes(
  tokenGenerator,
  "width: min(1080px, calc(100vw - 2em));",
  "token generator modal should be wide enough for controls without horizontal scrolling",
);
if (tokenGenerator.includes("refresh-button")) {
  throw new Error("RoleTokenGeneratorModal should not show a header refresh button");
}

console.log("test-role-library-ai-icon-source passed");
