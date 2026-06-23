import { callUniCloudFunction, getAuthSession } from "./auth";

function callAiService(method, params = {}) {
  return callUniCloudFunction("ai-service", method, {
    ...params,
    token: getAuthSession().token,
  });
}

export function getUserAiConfig() {
  return callAiService("getUserConfig");
}

export function saveUserAiConfig(config) {
  return callAiService("saveUserConfig", { config });
}

export function generateRoleIcon(role) {
  return callAiService("generateRoleIcon", { role });
}
