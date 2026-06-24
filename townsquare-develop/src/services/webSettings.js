import { callUniCloudFunction } from "./auth";

export function getPublicWebSettings() {
  return callUniCloudFunction("ai-admin-service", "getPublicWebSettings");
}
