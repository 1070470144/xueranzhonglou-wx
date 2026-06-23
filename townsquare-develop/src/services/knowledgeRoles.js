import { callUniCloudFunction } from "./auth";

export async function listKnowledgeRoles(params = {}) {
  const res = await callUniCloudFunction(
    "ai-admin-service",
    "listKnowledgeRoles",
    {
      page: params.page || 1,
      pageSize: params.pageSize || 300,
      keyword: params.keyword || params.q || "",
    },
  );
  if (!res || res.success === false) {
    throw new Error((res && res.message) || "Failed to load knowledge roles");
  }
  return (res.data && res.data.list) || [];
}

export async function listKnowledgeRolesPage(params = {}) {
  const page = params.page || 1;
  const pageSize = params.pageSize || 50;
  const res = await callUniCloudFunction(
    "ai-admin-service",
    "listKnowledgeRoles",
    {
      page,
      pageSize,
      keyword: params.keyword || params.q || "",
    },
  );
  if (!res || res.success === false) {
    throw new Error((res && res.message) || "Failed to load knowledge roles");
  }
  const data = res.data || {};
  return {
    success: true,
    data: {
      list: data.list || [],
      page: data.page || page,
      pageSize: data.pageSize || pageSize,
      total: Number(data.total) || 0,
    },
  };
}
