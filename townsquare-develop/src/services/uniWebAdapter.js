function normalizeHeaders(headers) {
  const normalized = {};
  headers.forEach((value, key) => {
    normalized[key] = value;
  });
  return normalized;
}

function request(options = {}) {
  const method = options.method || "GET";
  const headers = options.header || options.headers || {};

  fetch(options.url, {
    method,
    headers,
    body:
      method.toUpperCase() === "GET"
        ? undefined
        : JSON.stringify(options.data || {}),
  })
    .then(async (response) => {
      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();
      const result = {
        data,
        statusCode: response.status,
        header: normalizeHeaders(response.headers),
        errMsg: response.ok ? "request:ok" : "request:fail",
      };
      if (response.ok && options.success) options.success(result);
      if (!response.ok && options.fail) options.fail(result);
      if (options.complete) options.complete(result);
    })
    .catch((error) => {
      const result = {
        errMsg: error && error.message ? error.message : "request:fail",
      };
      if (options.fail) options.fail(result);
      if (options.complete) options.complete(result);
    });
}

function uploadFile(options = {}) {
  const formData = new FormData();
  const file = options.file || options.filePath;
  const name = options.name || "file";
  const headers = { ...(options.header || options.headers || {}) };

  delete headers["content-type"];
  delete headers["Content-Type"];

  Object.entries(options.formData || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, value);
  });

  if (file instanceof Blob) {
    formData.append(name, file, file.name || options.cloudPath || name);
  } else if (file) {
    formData.append(name, file);
  }

  fetch(options.url, {
    method: "POST",
    headers,
    body: formData,
  })
    .then(async (response) => {
      const data = await response.text();
      const failMessage = [
        "uploadFile:fail",
        `status=${response.status}`,
        data ? `body=${data.slice(0, 300)}` : "",
      ]
        .filter(Boolean)
        .join(" ");
      const result = {
        data,
        statusCode: response.status,
        header: normalizeHeaders(response.headers),
        errMsg: response.ok ? "uploadFile:ok" : failMessage,
      };
      if (response.ok && options.success) options.success(result);
      if (!response.ok && options.fail) options.fail(result);
      if (options.complete) options.complete(result);
    })
    .catch((error) => {
      const result = {
        errMsg:
          error && error.message
            ? `uploadFile:fail ${error.message}`
            : "uploadFile:fail",
      };
      if (options.fail) options.fail(result);
      if (options.complete) options.complete(result);
    });

  return {
    abort() {},
    onProgressUpdate() {},
  };
}

function setStorage({ key, data, success, complete } = {}) {
  localStorage.setItem(key, JSON.stringify(data));
  if (success) success({ errMsg: "setStorage:ok" });
  if (complete) complete({ errMsg: "setStorage:ok" });
}

function parseStorageValue(value) {
  if (value === null || value === undefined) return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
}

if (typeof window !== "undefined") {
  const uniAdapter = window.uni || {};
  window.uni = {
    ...uniAdapter,
    request: uniAdapter.request || request,
    uploadFile: uniAdapter.uploadFile || uploadFile,
    setStorage: uniAdapter.setStorage || setStorage,
    setStorageSync:
      uniAdapter.setStorageSync ||
      function setStorageSync(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
      },
    getStorage:
      uniAdapter.getStorage ||
      function getStorage({ key, success, fail, complete } = {}) {
        const value = localStorage.getItem(key);
        const result = {
          data: parseStorageValue(value),
          errMsg: "getStorage:ok",
        };
        if (value === null && fail) fail({ errMsg: "getStorage:fail" });
        if (value !== null && success) success(result);
        if (complete)
          complete(value === null ? { errMsg: "getStorage:fail" } : result);
      },
    getStorageSync:
      uniAdapter.getStorageSync ||
      function getStorageSync(key) {
        return parseStorageValue(localStorage.getItem(key));
      },
    removeStorageSync:
      uniAdapter.removeStorageSync ||
      function removeStorageSync(key) {
        localStorage.removeItem(key);
      },
    clearStorageSync:
      uniAdapter.clearStorageSync ||
      function clearStorageSync() {
        localStorage.clear();
      },
    getSystemInfoSync:
      uniAdapter.getSystemInfoSync ||
      function getSystemInfoSync() {
        return {
          platform: "web",
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          language: navigator.language,
          userAgent: navigator.userAgent,
        };
      },
  };
}
