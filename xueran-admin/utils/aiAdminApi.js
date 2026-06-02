const aiAdminService = uniCloud.importObject('ai-admin-service');

function normalize(result) {
  return result || { success: false, message: '服务无响应' };
}

export async function getDefaultConfig() {
  return normalize(await aiAdminService.getDefaultConfig());
}

export async function saveDefaultConfig(config) {
  return normalize(await aiAdminService.saveDefaultConfig(config));
}

export async function listKnowledge(params) {
  return normalize(await aiAdminService.listKnowledge(params));
}

export async function getKnowledgeDetail(id) {
  return normalize(await aiAdminService.getKnowledgeDetail(id));
}

export async function saveKnowledge(item) {
  return normalize(await aiAdminService.saveKnowledge(item));
}

export async function deleteKnowledge(id) {
  return normalize(await aiAdminService.deleteKnowledge(id));
}

export async function batchDeleteKnowledge(ids) {
  return normalize(await aiAdminService.batchDeleteKnowledge(ids));
}

export async function crawlWikiPage(params) {
  return normalize(await aiAdminService.crawlWikiPage(params));
}

export async function crawlRole(params) {
  return normalize(await aiAdminService.crawlRole(params));
}

export async function batchCrawlRoles(params) {
  return normalize(await aiAdminService.batchCrawlRoles(params));
}

export async function crawlFixedRule(params) {
  return normalize(await aiAdminService.crawlFixedRule(params));
}

export async function recrawlKnowledge(id) {
  return normalize(await aiAdminService.recrawlKnowledge(id));
}

export async function crawlWiki(params) {
  return normalize(await aiAdminService.crawlWiki(params));
}

export async function listCrawlJobs(params) {
  return normalize(await aiAdminService.listCrawlJobs(params));
}

export async function listQuestionRecords(params) {
  return normalize(await aiAdminService.listQuestionRecords(params));
}

export async function correctAnswer(params) {
  return normalize(await aiAdminService.correctAnswer(params));
}
