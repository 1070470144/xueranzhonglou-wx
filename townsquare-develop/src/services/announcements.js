import { callUniCloudFunction } from "./auth";

export function getPublicWebAnnouncements(params = {}) {
  return callUniCloudFunction("ai-admin-service", "getPublicWebAnnouncements", {
    pageSize: params.pageSize || 10
  });
}
