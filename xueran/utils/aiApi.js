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

export async function getAiAvailability() {
  return normalize(await aiService.getAvailability(withToken()));
}

export async function askAi(params) {
  return normalize(await aiService.ask(withToken(params)));
}

export async function getQuestionHistory(params = {}) {
  return normalize(await aiService.history(withToken(params)));
}

export async function getQuestionRecord(id) {
  return normalize(await aiService.getRecord(withToken({ id })));
}

export async function deleteQuestionRecord(id) {
  return normalize(await aiService.deleteRecord(withToken({ id })));
}

export async function getUserAiConfig() {
  return normalize(await aiService.getUserConfig(withToken()));
}

export async function saveUserAiConfig(config) {
  return normalize(await aiService.saveUserConfig(withToken({ config })));
}

export async function getAiScripts(params = {}) {
  return normalize(await aiService.listScripts(params));
}
