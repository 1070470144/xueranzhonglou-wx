import { callUniCloudFunction } from "./auth";

export async function listKnowledgeRoles(params = {}) {
  const res = await callUniCloudFunction(
    "ai-admin-service",
    "listKnowledgeRoles",
    {
      pageSize: params.pageSize || 300,
    },
  );
  if (!res || res.success === false) {
    throw new Error((res && res.message) || "Failed to load knowledge roles");
  }
  return (res.data && res.data.list) || [];
}
