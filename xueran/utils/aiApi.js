import { getAuthToken } from './auth.js';

const aiService = uniCloud.importObject('ai-service');

function withToken(params = {}) {
  return {
    ...params,
    token: getAuthToken()
  };
}

function normalize(result) {
  if (!result) {
    return { success: false, message: '服务无响应' };
  }
  return result;
}

function markDirty(key) {
  try {
    uni.setStorageSync(key, Date.now());
  } catch (error) {}
}

async function withDirty(promise, key) {
  const result = normalize(await promise);
  if (result.success) markDirty(key);
  return result;
}

export async function getAiAvailability() {
  return normalize(await aiService.getAvailability(withToken()));
}

export async function askAi(params) {
  return withDirty(aiService.ask(withToken(params)), 'question_records_dirty');
}

export async function getQuestionHistory(params = {}) {
  return normalize(await aiService.history(withToken(params)));
}

export async function getQuestionRecord(id) {
  return normalize(await aiService.getRecord(withToken({ id })));
}

export async function deleteQuestionRecord(id) {
  return withDirty(aiService.deleteRecord(withToken({ id })), 'question_records_dirty');
}

export async function getUserAiConfig() {
  return normalize(await aiService.getUserConfig(withToken()));
}

export async function saveUserAiConfig(config) {
  return withDirty(aiService.saveUserConfig(withToken({ config })), 'ai_config_dirty');
}

export async function getAiScripts(params = {}) {
  return normalize(await aiService.listScripts(params));
}

export async function listAnnouncements(params = {}) {
  return normalize(await aiService.listAnnouncements(params));
}

export async function getAnnouncement(id) {
  return normalize(await aiService.getAnnouncement({ id }));
}
