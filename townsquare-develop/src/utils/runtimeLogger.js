/* eslint-disable no-console */

export const RUNTIME_LOG_STORAGE_KEY = "townsquare.runtime.logs";
export const RUNTIME_LOG_MAX_AGE = 24 * 60 * 60 * 1000;
export const RUNTIME_LOG_MAX_ENTRIES = 500;

const installedConsoleMethods = {};
let installed = false;

function nowIso() {
  return new Date().toISOString();
}

function storageAvailable() {
  return typeof window !== "undefined" && window.localStorage;
}

function readStoredLogs() {
  if (!storageAvailable()) return [];
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(RUNTIME_LOG_STORAGE_KEY) || "[]",
    );
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeStoredLogs(logs) {
  if (!storageAvailable()) return;
  try {
    window.localStorage.setItem(
      RUNTIME_LOG_STORAGE_KEY,
      JSON.stringify(logs.slice(-RUNTIME_LOG_MAX_ENTRIES)),
    );
  } catch (error) {
    try {
      window.localStorage.setItem(
        RUNTIME_LOG_STORAGE_KEY,
        JSON.stringify(logs.slice(Math.floor(-RUNTIME_LOG_MAX_ENTRIES / 2))),
      );
    } catch (innerError) {
      // Ignore storage quota failures; console capture should never break UI.
    }
  }
}

function normalizeDetail(value, depth = 0) {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "function") {
    return `[Function ${value.name || "anonymous"}]`;
  }
  if (depth > 2) return "[Object]";
  if (Array.isArray(value)) {
    return value.slice(0, 30).map((item) => normalizeDetail(item, depth + 1));
  }
  if (typeof value === "object") {
    const output = {};
    Object.keys(value)
      .filter((key) => !/password|token|secret|key/i.test(key))
      .slice(0, 30)
      .forEach((key) => {
        output[key] = normalizeDetail(value[key], depth + 1);
      });
    return output;
  }
  return String(value);
}

export function cleanupRuntimeLogs(now = Date.now()) {
  const cutoff = now - RUNTIME_LOG_MAX_AGE;
  const logs = readStoredLogs().filter((entry) => {
    const timestamp = Date.parse(entry && entry.timestamp);
    return Number.isFinite(timestamp) && timestamp >= cutoff;
  });
  writeStoredLogs(logs.slice(-RUNTIME_LOG_MAX_ENTRIES));
  return logs;
}

export function recordRuntimeLog(type, detail = {}, level = "info") {
  const entry = {
    timestamp: nowIso(),
    level,
    type,
    url:
      typeof window !== "undefined" && window.location
        ? window.location.href
        : "",
    detail: normalizeDetail(detail),
  };
  const logs = cleanupRuntimeLogs();
  logs.push(entry);
  writeStoredLogs(logs.slice(-RUNTIME_LOG_MAX_ENTRIES));
  return entry;
}

function captureConsole(method) {
  if (!console || installedConsoleMethods[method]) return;
  const original = console[method];
  if (typeof original !== "function") return;
  installedConsoleMethods[method] = original;
  console[method] = function runtimeLoggerConsoleProxy(...args) {
    try {
      recordRuntimeLog(`console:${method}`, { args }, method);
    } catch (error) {
      // Keep console behavior intact even if logging fails.
    }
    return original.apply(console, args);
  };
}

function browserEnvironment() {
  if (typeof window === "undefined") return {};
  return {
    href: window.location && window.location.href,
    userAgent: navigator && navigator.userAgent,
    language: navigator && navigator.language,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    },
  };
}

export function installRuntimeLogger() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  cleanupRuntimeLogs();
  captureConsole("log");
  captureConsole("warn");
  captureConsole("error");
  window.addEventListener("error", (event) => {
    recordRuntimeLog(
      "window:error",
      {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      },
      "error",
    );
  });
  window.addEventListener("unhandledrejection", (event) => {
    recordRuntimeLog(
      "window:unhandledrejection",
      { reason: event.reason },
      "error",
    );
  });
  recordRuntimeLog("app:logger_installed", browserEnvironment());
}

export function downloadRuntimeLogs(context = {}) {
  const logs = cleanupRuntimeLogs();
  const payload = {
    exportedAt: nowIso(),
    environment: browserEnvironment(),
    context: normalizeDetail(context),
    logs,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `townsquare-runtime-log-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
  return payload;
}
