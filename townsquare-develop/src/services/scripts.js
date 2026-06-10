import { callUniCloudFunction } from "./auth";

function callScriptService(method, params = {}) {
  return callUniCloudFunction("script-service", method, params);
}

export function getScriptList({ page = 1, pageSize = 50 } = {}) {
  return callScriptService("getScriptList", {
    page,
    pageSize,
    status: "published",
  });
}

export function searchScripts({ keyword = "", page = 1, pageSize = 50 } = {}) {
  return callScriptService("searchScripts", {
    keyword,
    page,
    pageSize,
  });
}

export function getScriptDetail(scriptId) {
  return callScriptService("getScriptDetail", { scriptId });
}
