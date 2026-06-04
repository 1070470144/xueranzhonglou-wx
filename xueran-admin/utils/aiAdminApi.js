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

export async function getQuestionRecord(id) {
  return normalize(await aiAdminService.getQuestionRecord(id));
}

export async function correctAnswer(params) {
  return normalize(await aiAdminService.correctAnswer(params));
}

export async function listCorrections(params) {
  return normalize(await aiAdminService.listCorrections(params));
}

export async function getCorrection(id) {
  return normalize(await aiAdminService.getCorrection(id));
}

export async function saveCorrection(item) {
  return normalize(await aiAdminService.saveCorrection(item));
}

export async function toggleCorrection(params) {
  return normalize(await aiAdminService.toggleCorrection(params));
}

export async function deleteCorrection(id) {
  return normalize(await aiAdminService.deleteCorrection(id));
}

export async function listAnnouncements(params) {
  return normalize(await aiAdminService.listAnnouncements(params));
}

export async function getAnnouncement(id) {
  return normalize(await aiAdminService.getAnnouncement(id));
}

export async function saveAnnouncement(item) {
  return normalize(await aiAdminService.saveAnnouncement(item));
}

export async function deleteAnnouncement(id) {
  return normalize(await aiAdminService.deleteAnnouncement(id));
}

export async function updateAnnouncementStatus(params) {
  return normalize(await aiAdminService.updateAnnouncementStatus(params));
}

export async function listWebAnnouncements(params) {
  return normalize(await aiAdminService.listWebAnnouncements(params));
}

export async function getWebAnnouncement(id) {
  return normalize(await aiAdminService.getWebAnnouncement(id));
}

export async function saveWebAnnouncement(item) {
  return normalize(await aiAdminService.saveWebAnnouncement(item));
}

export async function deleteWebAnnouncement(id) {
  return normalize(await aiAdminService.deleteWebAnnouncement(id));
}

export async function updateWebAnnouncementStatus(params) {
  return normalize(await aiAdminService.updateWebAnnouncementStatus(params));
}
