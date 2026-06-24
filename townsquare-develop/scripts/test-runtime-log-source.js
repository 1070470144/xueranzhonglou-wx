const assert = require("assert");
const fs = require("fs");
const path = require("path");

const src = path.resolve(__dirname, "../src");

function read(relativePath) {
  return fs.readFileSync(path.join(src, relativePath), "utf8");
}

function assertIncludes(source, text, label) {
  assert(source.includes(text), `${label} should include ${text}`);
}

const loggerPath = path.join(src, "utils/runtimeLogger.js");
assert(fs.existsSync(loggerPath), "runtime logger service should exist");

const logger = read("utils/runtimeLogger.js");
const main = read("main.js");
const menu = read("components/Menu.vue");
const roomLobby = read("components/modals/RoomLobbyModal.vue");
const socket = read("store/socket.js");
const loginModal = read("components/modals/LoginModal.vue");
const scriptLibrary = read("components/modals/ScriptLibraryModal.vue");
const roleLibrary = read("components/modals/RoleLibraryModal.vue");
const roleTokenGenerator = read(
  "components/modals/RoleTokenGeneratorModal.vue",
);
const imageGenerator = read("components/modals/ImageGeneratorModal.vue");
const storyLog = read("components/modals/StoryLogModal.vue");
const voicePanel = read("components/VoicePanel.vue");
const privateChat = read("components/modals/PrivateChatModal.vue");
const i18n = read("i18n/index.js");

[
  "RUNTIME_LOG_STORAGE_KEY",
  "RUNTIME_LOG_MAX_AGE",
  "RUNTIME_LOG_MAX_ENTRIES",
  "installRuntimeLogger",
  "cleanupRuntimeLogs",
  "recordRuntimeLog",
  "downloadRuntimeLogs",
  "window.addEventListener(\"error\"",
  "window.addEventListener(\"unhandledrejection\"",
  "captureConsole(\"warn\")",
  "captureConsole(\"error\")",
  "new Blob",
  "townsquare-runtime-log-",
].forEach((needle) => assertIncludes(logger, needle, "runtime logger"));

assertIncludes(
  logger,
  "timestamp >= cutoff",
  "runtime logger automatic stale log cleanup",
);
assertIncludes(
  logger,
  "logs.slice(-RUNTIME_LOG_MAX_ENTRIES)",
  "runtime logger entry cap cleanup",
);
assertIncludes(
  main,
  'import { installRuntimeLogger } from "./utils/runtimeLogger";',
  "main runtime logger import",
);
assertIncludes(main, "installRuntimeLogger();", "main logger install");

assertIncludes(
  menu,
  'import { downloadRuntimeLogs, recordRuntimeLog } from "@/utils/runtimeLogger";',
  "menu logger imports",
);
assertIncludes(
  menu,
  '@click="downloadRuntimeLog"',
  "my menu runtime log action",
);
assertIncludes(menu, "menu.downloadRuntimeLog", "runtime log menu label");
assertIncludes(menu, "downloadRuntimeLog()", "menu runtime log method");

[
  "recordRuntimeLog(\"room:lobby_open\"",
  "recordRuntimeLog(\"room:refresh\"",
  "recordRuntimeLog(\"room:show_create\"",
  "recordRuntimeLog(\"room:create\"",
  "recordRuntimeLog(\"room:select\"",
  "recordRuntimeLog(\"room:join\"",
  "recordRuntimeLog(\"room:update\"",
  "recordRuntimeLog(\"room:error\"",
].forEach((needle) => assertIncludes(roomLobby, needle, "room lobby logging"));

assertIncludes(
  socket,
  'import { recordRuntimeLog } from "../utils/runtimeLogger";',
  "socket runtime logger import",
);
assertIncludes(
  socket,
  'recordRuntimeLog("room:socket_message"',
  "socket room response logging",
);

[
  "recordRuntimeLog(\"login:open\"",
  "recordRuntimeLog(\"login:refresh\"",
  "recordRuntimeLog(\"login:approved\"",
  "recordRuntimeLog(\"login:error\"",
].forEach((needle) => assertIncludes(loginModal, needle, "login logging"));

[
  "recordRuntimeLog(\"script_library:open\"",
  "recordRuntimeLog(\"script_library:search\"",
  "recordRuntimeLog(\"script_library:upload\"",
  "recordRuntimeLog(\"script_library:error\"",
].forEach((needle) =>
  assertIncludes(scriptLibrary, needle, "script library logging"),
);

[
  "recordRuntimeLog(\"role_library:open\"",
  "recordRuntimeLog(\"role_library:search\"",
  "recordRuntimeLog(\"role_library:create\"",
  "recordRuntimeLog(\"role_library:error\"",
].forEach((needle) =>
  assertIncludes(roleLibrary, needle, "role library logging"),
);

[
  "recordRuntimeLog(\"role_token:generate\"",
  "recordRuntimeLog(\"role_token:save\"",
  "recordRuntimeLog(\"role_token:error\"",
].forEach((needle) =>
  assertIncludes(roleTokenGenerator, needle, "role token generator logging"),
);

[
  "recordRuntimeLog(\"image_generator:generate\"",
  "recordRuntimeLog(\"image_generator:download\"",
  "recordRuntimeLog(\"image_generator:error\"",
].forEach((needle) =>
  assertIncludes(imageGenerator, needle, "image generator logging"),
);

[
  "recordRuntimeLog(\"story_log:open\"",
  "recordRuntimeLog(\"story_log:add\"",
  "recordRuntimeLog(\"story_log:update\"",
  "recordRuntimeLog(\"story_log:delete\"",
  "recordRuntimeLog(\"story_log:export\"",
].forEach((needle) => assertIncludes(storyLog, needle, "story log logging"));

[
  "recordRuntimeLog(\"voice:panel_open\"",
  "recordRuntimeLog(\"voice:signal\"",
  "recordRuntimeLog(\"voice:error\"",
].forEach((needle) => assertIncludes(voicePanel, needle, "voice logging"));

[
  "recordRuntimeLog(\"private_chat:open\"",
  "recordRuntimeLog(\"private_chat:send\"",
].forEach((needle) =>
  assertIncludes(privateChat, needle, "private chat logging"),
);

assertIncludes(i18n, "downloadRuntimeLog", "runtime log i18n");

console.log("test-runtime-log-source passed");
