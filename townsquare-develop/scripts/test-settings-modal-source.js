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

const aiServicePath = path.join(src, "services/ai.js");
if (!fs.existsSync(aiServicePath)) {
  throw new Error("src/services/ai.js should exist");
}

const aiService = read("services/ai.js");
const store = read("store/index.js");
const app = read("App.vue");
const menu = read("components/Menu.vue");
const i18n = read("i18n/index.js");

assertIncludes(aiService, "export function getUserAiConfig", "AI service");
assertIncludes(aiService, "export function saveUserAiConfig", "AI service");
assertIncludes(aiService, "export function generateRoleIcon", "AI service");
assertIncludes(store, "settings: false", "Vuex modals");
assertIncludes(app, "SettingsModal", "App modal registration");
assertIncludes(menu, "toggleModal('settings')", "settings menu trigger");
assertIncludes(menu, '$t("settings.entry")', "settings menu label");
assertIncludes(i18n, "settings:", "settings i18n");
assertIncludes(i18n, "imageModel", "settings image model i18n");

const zhStart = i18n.indexOf('"zh-CN": {');
const enStart = i18n.indexOf('"en-US": {');
if (zhStart === -1 || enStart === -1) {
  throw new Error("i18n should include zh-CN and en-US locales");
}

const zhMessages = i18n.slice(zhStart, enStart);
const enMessages = i18n.slice(enStart);
assertIncludes(zhMessages, "settings: {", "zh-CN settings i18n");
assertIncludes(zhMessages, 'entry: "设置"', "zh-CN settings entry");
assertIncludes(zhMessages, 'imageModel: "生图模型"', "zh-CN image model label");
assertIncludes(enMessages, "settings: {", "en-US settings i18n");
assertIncludes(enMessages, 'entry: "Settings"', "en-US settings entry");
assertIncludes(enMessages, 'imageModel: "Image model"', "en-US image model label");

console.log("test-settings-modal-source passed");
