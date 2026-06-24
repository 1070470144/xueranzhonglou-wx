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

assertIncludes(i18n, "downloadRuntimeLog", "runtime log i18n");

console.log("test-runtime-log-source passed");
