import { getAuthToken } from './auth.js';
import { installSilentDefaultLoading } from './silentLoading.js';

installSilentDefaultLoading();

const aiService = uniCloud.importObject('ai-service', {
  timeout: 65000,
  customUI: true
});

let silentCloudCount = 0;
let originalShowModal = null;
let originalWxShowModal = null;

function shouldSilentAiModal(options = {}) {
  const text = `${options.title || ''} ${options.content || ''}`;
  return text.includes('[ai-service]') || text.includes('请求云函数超时');
}

function completeSilentModal(options = {}) {
  const result = { confirm: true, cancel: false };
  if (typeof options.success === 'function') options.success(result);
  if (typeof options.complete === 'function') options.complete(result);
}

function beginSilentCloudUI() {
  silentCloudCount += 1;
  if (silentCloudCount > 1 || !uni) return;
  originalShowModal = uni.showModal;
  uni.showModal = function silentAiModal(options = {}) {
    if (shouldSilentAiModal(options)) {
      completeSilentModal(options);
      return;
    }
    return originalShowModal.call(uni, options);
  };
  if (typeof wx !== 'undefined') {
    originalWxShowModal = wx.showModal;
    wx.showModal = function silentWxAiModal(options = {}) {
      if (shouldSilentAiModal(options)) {
        completeSilentModal(options);
        return;
      }
      return originalWxShowModal.call(wx, options);
    };
  }
}

function endSilentCloudUI() {
  silentCloudCount = Math.max(0, silentCloudCount - 1);
  if (silentCloudCount > 0 || !originalShowModal) return;
  uni.showModal = originalShowModal;
  if (typeof wx !== 'undefined' && originalWxShowModal) {
    wx.showModal = originalWxShowModal;
  }
  originalShowModal = null;
  originalWxShowModal = null;
}

async function silentCloudCall(task) {
  beginSilentCloudUI();
  try {
    return await task();
  } finally {
    endSilentCloudUI();
  }
}

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

function errorMessage(error, fallback = '请求失败，请稍后重试') {
  const message = error && (error.message || error.errMsg || error.msg);
  if (!message) return fallback;
  if (String(message).includes('timeout') || String(message).includes('超时')) {
    return 'AI 服务响应超时，请稍后重试或检查模型配置';
  }
  return String(message);
}

function isTimeoutError(error) {
  const message = String(error && (error.message || error.errMsg || error.msg) || '').toLowerCase();
  return message.includes('timeout') || message.includes('timed out') || message.includes('超时');
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
  return normalize(await silentCloudCall(() => aiService.getAvailability(withToken())));
}

export async function askAi(params) {
  try {
    return await withDirty(silentCloudCall(() => aiService.ask(withToken(params))), 'question_records_dirty');
  } catch (error) {
    console.error('askAi failed:', error);
    return { success: false, message: errorMessage(error, 'AI 提问失败，请稍后重试') };
  }
}

export async function generateAiAnswer(recordId) {
  try {
    return await withDirty(
      silentCloudCall(() => aiService.generateAnswer(withToken({ id: recordId }))),
      'question_records_dirty'
    );
  } catch (error) {
    if (isTimeoutError(error)) {
      return { success: true, message: 'AI answer is still generating', data: { recordId, status: 'pending' } };
    }
    console.error('generateAiAnswer failed:', error);
    return { success: false, message: errorMessage(error, 'AI 生成失败，请稍后重试'), data: { recordId } };
  }
}

export async function getQuestionHistory(params = {}) {
  return normalize(await silentCloudCall(() => aiService.history(withToken(params))));
}

export async function getQuestionRecord(id) {
  return normalize(await silentCloudCall(() => aiService.getRecord(withToken({ id }))));
}

export async function deleteQuestionRecord(id) {
  return withDirty(silentCloudCall(() => aiService.deleteRecord(withToken({ id }))), 'question_records_dirty');
}

export async function getUserAiConfig() {
  return normalize(await silentCloudCall(() => aiService.getUserConfig(withToken())));
}

export async function saveUserAiConfig(config) {
  return withDirty(silentCloudCall(() => aiService.saveUserConfig(withToken({ config }))), 'ai_config_dirty');
}

export async function getAiScripts(params = {}) {
  return normalize(await silentCloudCall(() => aiService.listScripts(params)));
}

export async function listAnnouncements(params = {}) {
  return normalize(await silentCloudCall(() => aiService.listAnnouncements(params)));
}

export async function getAnnouncement(id) {
  return normalize(await silentCloudCall(() => aiService.getAnnouncement({ id })));
}
