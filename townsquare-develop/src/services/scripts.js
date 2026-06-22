import {
  callUniCloudFunction,
  callUniCloudRawFunction,
  getAuthSession,
} from "./auth";

function callScriptService(method, params = {}) {
  return callUniCloudFunction("script-service", method, params);
}

function withToken(params = {}) {
  return {
    ...params,
    token: getAuthSession().token,
  };
}

function normalizeListScriptsResult(res, page, pageSize) {
  if (res && res.success) return res;
  if (res && res.code === 0) {
    return {
      success: true,
      data: {
        list: Array.isArray(res.data) ? res.data : [],
        total: Number(res.total) || 0,
        page,
        pageSize,
      },
    };
  }
  return res;
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

export async function getPublicScriptList({
  page = 1,
  pageSize = 12,
  q = "",
  sortBy = "createTime",
} = {}) {
  const res = await callUniCloudRawFunction("listScripts", {
    page,
    pageSize,
    q,
    sortBy,
    status: "public",
    token: getAuthSession().token,
  });
  return normalizeListScriptsResult(res, page, pageSize);
}

export function likeScript(scriptId, action = "like") {
  return callScriptService("likeScript", withToken({ scriptId, action }));
}

export function favoriteScript(scriptId, action = "favorite") {
  return callScriptService("favoriteScript", withToken({ scriptId, action }));
}

export function uploadUserScript({ jsonData, images = [], scriptType } = {}) {
  return callScriptService(
    "userUploadScript",
    withToken({ jsonData, images, scriptType }),
  );
}

export function getMyUploadedScripts({ page = 1, pageSize = 10, q = "" } = {}) {
  return callScriptService(
    "getMyUploadedScripts",
    withToken({ page, pageSize, q }),
  );
}

export function getMyUploadedScriptDetail(scriptId) {
  return callScriptService(
    "getMyUploadedScriptDetail",
    withToken({ scriptId }),
  );
}

export function deleteMyUploadedScript(scriptId) {
  return callScriptService("deleteMyUploadedScript", withToken({ scriptId }));
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("File is required"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

export async function uploadScriptCoverImage(file) {
  const dataUrl = await readFileAsDataURL(file);
  const res = await callScriptService(
    "uploadUserScriptImage",
    withToken({
      fileName: (file && file.name) || "cover.jpg",
      contentType: (file && file.type) || "",
      size: (file && file.size) || 0,
      dataUrl,
    }),
  );
  if (!res || !res.success) {
    throw new Error((res && res.message) || "uploadFile:fail");
  }
  const data = res.data || {};
  return data.url || data.fileID || data.fileId || "";
}
