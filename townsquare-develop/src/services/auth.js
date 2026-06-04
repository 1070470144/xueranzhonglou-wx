import "./uniWebAdapter";
import uniCloud from "@dcloudio/uni-cloud";

const TOKEN_KEY = "townsquare.auth.token";
const USER_KEY = "townsquare.auth.user";

let uniCloudInstance = null;

function getUniCloudConfig() {
  return {
    provider: process.env.VUE_APP_UNICLOUD_PROVIDER || "aliyun",
    spaceId: process.env.VUE_APP_UNICLOUD_SPACE_ID || "",
    clientSecret: process.env.VUE_APP_UNICLOUD_CLIENT_SECRET || "",
    endpoint: process.env.VUE_APP_UNICLOUD_ENDPOINT || "https://api.next.bspapp.com"
  };
}

function getUniCloudInstance() {
  if (uniCloudInstance) return uniCloudInstance;
  const uniCloudClient = uniCloud || window.uniCloud;
  if (!uniCloudClient || !uniCloudClient.init) {
    throw new Error("uniCloud Web SDK is not loaded");
  }

  const config = getUniCloudConfig();
  if (!config.spaceId || !config.clientSecret) {
    throw new Error("uniCloud web config is not configured");
  }

  uniCloudInstance = uniCloudClient.init(config);
  return uniCloudInstance;
}

export async function callUniCloudFunction(name, method, params = {}) {
  const res = await getUniCloudInstance().callFunction({
    name,
    data: {
      method,
      params: [params]
    }
  });
  return res && res.result ? res.result : res;
}

async function callAuth(method, params = {}) {
  return callUniCloudFunction("auth-service", method, params);
}

export function getAuthSession() {
  const token = localStorage.getItem(TOKEN_KEY) || "";
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch (error) {
    user = null;
  }
  return { token, user };
}

export function setAuthSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token || "");
  localStorage.setItem(USER_KEY, JSON.stringify(user || null));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function createWebLoginTicket() {
  return callAuth("createWebLoginTicket", {
    client: {
      platform: "web",
      userAgent: navigator.userAgent || ""
    }
  });
}

export function pollWebLoginTicket(ticket) {
  return callAuth("pollWebLoginTicket", { ticket });
}
