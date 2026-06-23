'use strict';

const db = uniCloud.database();

const TABLES = {
  sessions: 'auth-sessions',
  users: 'app-users',
  adminConfig: 'ai-configs',
  userConfig: 'user-ai-configs',
  knowledge: 'ai-knowledge',
  corrections: 'ai-answer-corrections',
  records: 'ai-question-records',
  scripts: 'scripts',
  announcements: 'announcements'
};

const AI_HTTP_TIMEOUT = 45000;
const AI_HARD_TIMEOUT = 50000;
const AI_IMAGE_HTTP_TIMEOUT = 150000;
const AI_IMAGE_HARD_TIMEOUT = 160000;
const AI_MAX_TOKENS = 1000;
const AI_IMAGE_MAX_SIZE = 6 * 1024 * 1024;

function ok(data = {}, message = '操作成功') {
  return { success: true, message, data };
}

function fail(message = '操作失败', data = {}) {
  return { success: false, message, data };
}

function isTimeoutError(error) {
  const text = String((error && (error.message || error.errMsg)) || error || '').toLowerCase();
  return text.includes('timeout') || text.includes('timed out') || text.includes('etimedout');
}

function aiErrorMessage(error) {
  if (isTimeoutError(error)) return 'AI 回复超时，请稍后重试或换用响应更快的模型';
  return (error && error.message) || 'AI 请求失败，请稍后重试';
}

function now() {
  return Date.now();
}

function withTimeout(promise, timeout, message) {
  let timer;
  const timeoutPromise = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message || 'timeout')), timeout);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

function cleanText(value, max = 4000) {
  return String(value || '').trim().slice(0, max);
}

function isEnabled(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function isActiveAnnouncement(item, time = now()) {
  if (!item || item.status !== 'published') return false;
  if (item.startTime && Number(item.startTime) > time) return false;
  if (item.endTime && Number(item.endTime) < time) return false;
  return true;
}

function publicAnnouncement(item, detail = false) {
  if (!item) return null;
  const doc = {
    _id: item._id,
    title: item.title || '',
    summary: item.summary || '',
    type: item.type || 'notice',
    pinned: !!item.pinned,
    priority: Number(item.priority || 0),
    publishTime: item.publishTime || item.createTime || item.updateTime || 0,
    updateTime: item.updateTime || 0
  };
  if (detail) doc.content = item.content || '';
  return doc;
}

async function getActiveAnnouncements(limit = 20) {
  const finalLimit = Math.min(20, Math.max(1, Number(limit || 20)));
  const res = await db.collection(TABLES.announcements)
    .where({ status: 'published' })
    .orderBy('updateTime', 'desc')
    .limit(50)
    .get();
  return (res.data || [])
    .filter(item => isActiveAnnouncement(item))
    .sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      const priorityDiff = Number(b.priority || 0) - Number(a.priority || 0);
      if (priorityDiff) return priorityDiff;
      return Number(b.publishTime || b.createTime || b.updateTime || 0) - Number(a.publishTime || a.createTime || a.updateTime || 0);
    })
    .slice(0, finalLimit);
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s\r\n\t`~!@#$%^&*()_+\-=\[\]{};:'"\\|,.<>/?，。！？；：“”‘’（）【】《》、]/g, '')
    .trim();
}

function tokenize(value) {
  const words = String(value || '').toLowerCase().match(/[a-z0-9]+|[\u4e00-\u9fa5]{2,}/g) || [];
  const pieces = [];
  words.forEach(word => {
    pieces.push(word);
    if (/^[\u4e00-\u9fa5]+$/.test(word) && word.length > 3) {
      for (let index = 0; index <= word.length - 2; index += 1) pieces.push(word.slice(index, index + 2));
    }
  });
  return Array.from(new Set(pieces.filter(item => item.length >= 2))).slice(0, 40);
}

function scoreCorrection(correction, question, script) {
  const normalizedQuestion = normalizeText(question);
  const normalizedCorrectionQuestion = normalizeText(correction.question || correction.title || '');
  if (normalizedQuestion && normalizedQuestion === normalizedCorrectionQuestion) return 100;
  if (normalizedCorrectionQuestion && normalizedQuestion.includes(normalizedCorrectionQuestion)) return 96;
  if (normalizedQuestion && normalizedCorrectionQuestion.includes(normalizedQuestion)) return 94;

  const queryTokens = tokenize([question, script && script.title].filter(Boolean).join(' '));
  const correctionTokens = tokenize([
    correction.question,
    correction.correctedAnswer,
    correction.scriptTitle,
    Array.isArray(correction.keywords) ? correction.keywords.join(' ') : ''
  ].filter(Boolean).join(' '));
  if (!queryTokens.length || !correctionTokens.length) return 0;
  const correctionSet = new Set(correctionTokens);
  const hit = queryTokens.filter(token => correctionSet.has(token)).length;
  return Math.round((hit / queryTokens.length) * 90);
}

async function searchCorrections(question, script) {
  const res = await db.collection(TABLES.corrections).orderBy('updateTime', 'desc').limit(80).get();
  const scriptId = script && script._id ? String(script._id) : '';
  const scriptTitle = script && script.title ? String(script.title) : '';
  return (res.data || [])
    .filter(item => item && item.enabled !== false)
    .filter(item => {
      if (!item.scriptId && !item.scriptTitle) return true;
      return (scriptId && item.scriptId === scriptId) || (scriptTitle && item.scriptTitle === scriptTitle);
    })
    .map(item => ({ ...item, score: scoreCorrection(item, question, script) }))
    .filter(item => item.score >= 35)
    .sort((a, b) => (b.score - a.score) || ((b.priority || 0) - (a.priority || 0)))
    .slice(0, 3);
}

function correctionPromptPrefix(corrections) {
  if (!corrections || !corrections.length) return '';
  const refs = corrections.map((item, index) => [
    `【管理员修正${index + 1}】${item.question || item.title || ''}`,
    item.scriptTitle ? `适用板子：${item.scriptTitle}` : '适用范围：通用',
    `正确答案：${item.correctedAnswer || ''}`
  ].join('\n')).join('\n\n');
  return [
    '管理员修正知识优先级最高。只要管理员修正与用户问题相关，必须以管理员修正为准；如果百科知识或模型推理与修正冲突，以修正为准。',
    refs,
    ''
  ].filter(Boolean).join('\n');
}

function publicConfig(config) {
  if (!config) return null;
  const maskedKey = config.apiKey ? `${String(config.apiKey).slice(0, 6)}***${String(config.apiKey).slice(-4)}` : '';
  return {
    enabled: isEnabled(config.enabled),
    provider: config.provider || 'openai-compatible',
    baseUrl: config.baseUrl || '',
    model: config.model || '',
    imageModel: config.imageModel || 'gpt-image-2',
    apiKey: maskedKey
  };
}

async function verifyToken(token) {
  if (!token) return null;
  const sessionResult = await db.collection(TABLES.sessions).where({ token }).limit(1).get();
  const session = sessionResult.data && sessionResult.data[0];
  if (!session || session.expireTime <= now()) return null;
  const userResult = await db.collection(TABLES.users).doc(session.userId).get();
  const user = userResult.data && userResult.data[0];
  if (!user || user.status === 'disabled') return null;
  return { session, user };
}

async function getAdminConfig() {
  const res = await db.collection(TABLES.adminConfig).where({ scope: 'default' }).limit(1).get();
  return res.data && res.data[0];
}

async function getUserConfig(userId) {
  if (!userId) return null;
  const res = await db.collection(TABLES.userConfig).where({ userId }).limit(1).get();
  return res.data && res.data[0];
}

async function resolveAiConfig(userId) {
  const userConfig = await getUserConfig(userId);
  if (userConfig && isEnabled(userConfig.enabled) && userConfig.apiKey && userConfig.baseUrl && userConfig.model) {
    return { source: 'user', config: userConfig };
  }

  const adminConfig = await getAdminConfig();
  if (adminConfig && isEnabled(adminConfig.enabled) && adminConfig.apiKey && adminConfig.baseUrl && adminConfig.model) {
    return { source: 'admin', config: adminConfig };
  }

  return null;
}

function buildKeywords(question, script) {
  const text = [question, script && script.title, script && script.author, script && script.description]
    .filter(Boolean)
    .join(' ');
  return Array.from(new Set(text
    .replace(/[\r\n\t]/g, ' ')
    .split(/[\s,，。.!！?？:：;；、()（）《》【】\[\]"'“”]+/)
    .map(item => item.trim())
    .filter(item => item.length >= 2)
    .slice(0, 12)));
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildRoleCandidates(question) {
  const text = cleanText(question, 120);
  if (!text) return [];
  const normalized = text.replace(/[\s,，。.!！?？:：;；、()（）《》【】\[\]"'“”]/g, ' ');
  const candidates = [];

  [
    /(.+?)的(?:能力|技能|效果|作用|信息|玩法|规则|阵营|类型|英文名?)(?:是(?:什么|啥))?$/,
    /(.+?)(?:能力|技能|效果|作用)(?:是(?:什么|啥))?$/,
    /(.+?)(?:是什么|是啥)$/
  ].forEach(pattern => {
    const match = normalized.match(pattern);
    if (match && match[1]) candidates.push(match[1]);
  });

  buildKeywords(question, null).forEach(keyword => candidates.push(keyword));
  return Array.from(new Set(candidates
    .map(item => item.replace(/^(请问|问一下|我想知道|想知道|角色|关于)/, '').trim())
    .filter(item => item.length >= 2 && item.length <= 20)));
}

function normalizeKnowledgeItem(item) {
  return {
    id: item._id,
    title: item.title || '未命名知识',
    type: item.type || '',
    roleType: item.roleType || '',
    englishName: item.englishName || '',
    scripts: Array.isArray(item.scripts) ? item.scripts : [],
    abilityTypes: Array.isArray(item.abilityTypes) ? item.abilityTypes : [],
    sections: Array.isArray(item.sections) ? item.sections : [],
    content: cleanText(item.content, 1600),
    sourceUrl: item.sourceUrl || ''
  };
}

async function getScript(scriptId) {
  if (!scriptId) return null;
  const res = await db.collection(TABLES.scripts).doc(scriptId).get();
  return res.data && res.data[0];
}

async function getOwnedRecord(recordId, userId) {
  const id = cleanText(recordId, 80);
  if (!id) return null;
  const res = await db.collection(TABLES.records).doc(id).get();
  const record = res.data && res.data[0];
  if (!record || record.userId !== userId) return null;
  return record;
}

async function searchKnowledge(question, script) {
  const keywords = buildKeywords(question, script);
  const roleCandidates = buildRoleCandidates(question);
  const byId = new Map();
  let list = [];

  if (roleCandidates.length) {
    const exactOrs = roleCandidates.slice(0, 4).map(keyword => ({
      title: { $regex: `^${escapeRegExp(keyword)}$`, $options: 'i' }
    }));
    const exactRes = await db.collection(TABLES.knowledge)
      .where({ status: 'active', $or: exactOrs })
      .limit(6)
      .get();
    (exactRes.data || []).forEach(item => byId.set(item._id, item));

    const fuzzyOrs = [];
    roleCandidates.slice(0, 4).forEach(keyword => {
      const escaped = escapeRegExp(keyword);
      fuzzyOrs.push({ title: { $regex: escaped, $options: 'i' } });
      fuzzyOrs.push({ searchText: { $regex: escaped, $options: 'i' } });
      fuzzyOrs.push({ content: { $regex: escaped, $options: 'i' } });
    });
    const fuzzyRes = await db.collection(TABLES.knowledge)
      .where({ status: 'active', $or: fuzzyOrs })
      .limit(6)
      .get();
    (fuzzyRes.data || []).forEach(item => byId.set(item._id, item));
  }

  if (keywords.length) {
    const ors = [];
    keywords.slice(0, 6).forEach(keyword => {
      const escaped = escapeRegExp(keyword);
      ors.push({ title: { $regex: escaped, $options: 'i' } });
      ors.push({ searchText: { $regex: escaped, $options: 'i' } });
      ors.push({ content: { $regex: escaped, $options: 'i' } });
    });
    const res = await db.collection(TABLES.knowledge)
      .where({ status: 'active', $or: ors })
      .limit(6)
      .get();
    (res.data || []).forEach(item => byId.set(item._id, item));
  }

  list = Array.from(byId.values()).sort((a, b) => {
    const aTitle = String(a.title || '');
    const bTitle = String(b.title || '');
    const aExact = roleCandidates.some(keyword => aTitle === keyword) ? 1 : 0;
    const bExact = roleCandidates.some(keyword => bTitle === keyword) ? 1 : 0;
    return bExact - aExact;
  }).slice(0, 6);

  if (!list.length) {
    const res = await db.collection(TABLES.knowledge)
      .where({ status: 'active' })
      .orderBy('updateTime', 'desc')
      .limit(6)
      .get();
    list = res.data || [];
  }

  return list.map(normalizeKnowledgeItem);
}

function sectionMatches(section, key, titlePattern) {
  if (!section) return false;
  return section.key === key || titlePattern.test(String(section.title || ''));
}

function pickKnowledgeSections(item, question) {
  const text = String(question || '');
  const sections = Array.isArray(item.sections) ? item.sections : [];
  const wanted = [];
  if (/能力|效果|技能|做什么|是什么/.test(text)) wanted.push('ability', 'intro', 'role_info');
  if (/怎么|如何|操作|唤醒|夜晚|说书|运作/.test(text)) wanted.push('how_to_run', 'reminders', 'rules');
  if (/规则|互动|冲突|相克|醉酒|中毒|死亡|复活/.test(text)) wanted.push('rules', 'how_to_run', 'ability');
  if (/技巧|玩法|建议|怎么玩|现身/.test(text)) wanted.push('tips', 'intro', 'ability');
  if (/伪装| bluff|假跳/.test(text)) wanted.push('bluffing', 'ability', 'role_info');
  if (/类型|英文|剧本|阵营|类别/.test(text)) wanted.push('role_info', 'ability');
  const keys = wanted.length ? Array.from(new Set(wanted)) : ['ability', 'intro', 'rules', 'how_to_run', 'role_info'];
  const titlePatterns = {
    ability: /能力|技能|效果|作用/,
    intro: /简介|介绍|概述/,
    role_info: /角色|信息|类型|阵营|英文|剧本/,
    how_to_run: /运作|操作|说书|夜晚|唤醒/,
    reminders: /提醒|标记|提示/,
    rules: /规则|互动|冲突|相克|判定/,
    tips: /技巧|玩法|建议/,
    bluffing: /伪装|假跳|bluff/i
  };
  const picked = keys
    .map(key => sections.find(section => sectionMatches(section, key, titlePatterns[key] || /$a/)))
    .filter(Boolean)
    .slice(0, 3);
  if (!picked.length) return cleanText(item.content, 900);
  return cleanText(picked.map(section => `【${section.title}】\n${section.content}`).join('\n\n'), 1400);
}

function knowledgeContext(item, question) {
  const meta = [
    item.roleType ? `角色类型：${item.roleType}` : '',
    item.englishName ? `英文名：${item.englishName}` : '',
    item.scripts && item.scripts.length ? `所属剧本：${item.scripts.join('、')}` : '',
    item.abilityTypes && item.abilityTypes.length ? `能力类型：${item.abilityTypes.join('、')}` : ''
  ].filter(Boolean).join('\n');
  const body = pickKnowledgeSections(item, question);
  return [meta, body].filter(Boolean).join('\n');
}

function scriptContext(script) {
  if (!script) return '';
  const content = typeof script.content === 'string' ? script.content : JSON.stringify(script.content || '');
  return cleanText([
    `板子名称：${script.title || ''}`,
    `作者：${script.author || ''}`,
    `描述：${script.description || ''}`,
    `JSON/内容：${content}`
  ].join('\n'), 3200);
}

function buildPrompt({ question, script, knowledge, corrections = [] }) {
  const refs = knowledge.map((item, index) => `【知识${index + 1}】${item.title}\n${knowledgeContext(item, question)}`).join('\n\n');
  const board = script ? `\n\n【指定板子】\n${scriptContext(script)}` : '';
  return [
    '你是血染钟楼问答助手。请优先基于提供的百科知识和板子内容回答。',
    '如果知识库没有直接写明结论，但提供了角色能力、规则、阵营、夜晚行动、信息来源或板子内容，你可以据此做合理推理。推理必须贴合已给材料，不能编造未提供的角色、规则或剧本事实。',
    '回答必须先给结论，再给依据和推断。能确定时，第一句话直接给出确切答案。不能唯一确定时，先列出多个明确候选答案，并为每个候选给出正确可能性百分比；百分比应基于已给材料的相对支持度，合计尽量为 100%。',
    '回答时要区分“明确依据”和“合理推断”：有直接依据就说明依据；没有直接依据但可以推理时，说明推理链路和不确定点；完全没有相关依据时，也要给出“无法判断”的结论，并说明缺少哪些关键信息。',
    '输出必须是 JSON，格式：{"answer":"...","analysis":"..."}。answer 用自然语言按“结论/候选答案、依据、推断、不确定点”的顺序组织；analysis 用一句话概括确定性，不超过 80 个中文字符。',
    '不要输出 Markdown 代码块。',
    `\n【百科知识】\n${refs || '暂无匹配知识'}`,
    board,
    `\n【用户问题】\n${question}`
  ].join('\n');
}

function parseAiContent(content) {
  const raw = cleanText(content, 12000).replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  try {
    const parsed = JSON.parse(raw);
    return {
      answer: cleanText(parsed.answer, 6000),
      analysis: cleanText(parsed.analysis, 300)
    };
  } catch (error) {
    return {
      answer: raw,
      analysis: '基于已检索知识进行概括，需以官方规则为准。'
    };
  }
}

async function callOpenAiCompatible(config, prompt) {
  const baseUrl = String(config.baseUrl || '').replace(/\/+$/, '');
  const url = `${baseUrl}/chat/completions`;
  const response = await uniCloud.httpclient.request(url, {
    method: 'POST',
    dataType: 'json',
    contentType: 'json',
    timeout: AI_HTTP_TIMEOUT,
    headers: {
      Authorization: `Bearer ${config.apiKey}`
    },
    data: {
      model: config.model,
      max_tokens: Math.min(Number(config.maxTokens || AI_MAX_TOKENS), AI_MAX_TOKENS),
      temperature: Number(config.temperature || 0.2),
      messages: [
        { role: 'system', content: '你是严谨、简洁的血染钟楼知识助手。' },
        { role: 'user', content: prompt }
      ]
    }
  });

  if (response.status >= 400) {
    throw new Error(`AI 请求失败：${response.status}`);
  }
  const body = response.data || {};
  const content = body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content;
  if (!content) {
    throw new Error('AI 未返回内容');
  }
  return parseAiContent(content);
}

async function callClaudeCodeCompatible(config, prompt) {
  const baseUrl = String(config.baseUrl || '').replace(/\/+$/, '');
  const url = `${baseUrl}/messages`;
  const response = await uniCloud.httpclient.request(url, {
    method: 'POST',
    dataType: 'json',
    contentType: 'json',
    timeout: AI_HTTP_TIMEOUT,
    headers: {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01'
    },
    data: {
      model: config.model,
      max_tokens: Math.min(Number(config.maxTokens || AI_MAX_TOKENS), AI_MAX_TOKENS),
      temperature: Number(config.temperature || 0.2),
      system: '你是严谨、简洁的血染钟楼知识助手。',
      messages: [
        { role: 'user', content: prompt }
      ]
    }
  });

  if (response.status >= 400) {
    throw new Error(`AI 请求失败：${response.status}`);
  }
  const body = response.data || {};
  const content = Array.isArray(body.content)
    ? body.content.map(item => item && item.text).filter(Boolean).join('\n')
    : '';
  if (!content) {
    throw new Error('AI 未返回内容');
  }
  return parseAiContent(content);
}

async function callAi(config, prompt) {
  const task = config.provider === 'claude-code-compatible'
    ? callClaudeCodeCompatible(config, prompt)
    : callOpenAiCompatible(config, prompt);
  return withTimeout(task, AI_HARD_TIMEOUT, 'AI request timeout');
}

function roleIconPrompt(role) {
  const description = cleanText(
    role.description || role.keywords || role.iconKeywords || role.prompt || role.subject || '',
    220
  );
  const team = cleanText(role.team || role.roleType || role.category || '', 40).toLowerCase();
  const styleByTeam = {
    townsfolk: 'Townsfolk color: cobalt blue ink.',
    outsider: 'Outsider color: muted blue-violet ink.',
    minion: 'Minion color: vivid red ink.',
    demon: 'Demon color: deep crimson ink.',
    traveler: 'Traveler color: bright cyan or teal ink.',
    fabled: 'Fabled color: warm gold or yellow ink.'
  };
  const teamStyle = styleByTeam[team] || styleByTeam.townsfolk;
  return [
    'Create one square transparent background image for a Blood on the Clocktower custom role icon.',
    'Draw only one single centered ink symbol based on the short description below.',
    'The symbol should feel like a hand-painted token mark: rough ink edges, bold silhouette, readable at small seat-token size.',
    teamStyle,
    'Use the team color as the dominant ink color, with subtle darker edge texture if needed.',
    'Do not draw a parchment disk, circular token background, thick outer rim, inner ring, badge, frame, or brown coin.',
    'Do not include any text, letters, Chinese characters, captions, role names, ability text, watermarks, UI mockups, or multiple object collage.',
    'Avoid the bad style: no black background, no square black tile, no glowing app icon, no realistic photo.',
    'Keep the outside area transparent background or as close to transparent as the model supports.',
    `Team style key: ${team || 'townsfolk'}`,
    `Description: ${description}`
  ].filter(Boolean).join('\n');
}

function imageExtensionFromContentType(contentType) {
  if (/png/i.test(contentType)) return '.png';
  if (/webp/i.test(contentType)) return '.webp';
  if (/jpe?g/i.test(contentType)) return '.jpg';
  return '.png';
}

async function uploadGeneratedRoleIcon(userId, base64, contentType = 'image/png') {
  const cleanBase64 = String(base64 || '').replace(/^data:[^;,]+;base64,/i, '').replace(/\s/g, '');
  if (!cleanBase64) throw new Error('AI did not return image data');
  const fileContent = Buffer.from(cleanBase64, 'base64');
  if (!fileContent.length) throw new Error('AI returned invalid image data');
  if (fileContent.length > AI_IMAGE_MAX_SIZE) throw new Error('AI image is too large');
  const safeUserId = String(userId || 'user').replace(/[^\w-]+/g, '-');
  const random = Math.random().toString(36).slice(2);
  const cloudPath = `ai-role-icons/${safeUserId}/${Date.now()}-${random}${imageExtensionFromContentType(contentType)}`;
  const uploadRes = await uniCloud.uploadFile({ cloudPath, fileContent });
  return uploadRes.fileID || uploadRes.fileId || uploadRes.url || '';
}

function looksLikeImageUrl(value) {
  const text = String(value || '').trim();
  return /^https?:\/\//i.test(text) || /^cloud:\/\//i.test(text);
}

function looksLikeImageBase64(value) {
  const text = String(value || '').trim();
  if (/^data:image\/[^;]+;base64,/i.test(text)) return true;
  return text.length > 200 && /^[A-Za-z0-9+/=\s]+$/.test(text);
}

function extractGeneratedImage(payload, depth = 0) {
  if (!payload || depth > 8) return null;
  if (typeof payload === 'string') {
    if (looksLikeImageBase64(payload)) return { base64: payload };
    if (looksLikeImageUrl(payload)) return { url: payload };
    return null;
  }
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const image = extractGeneratedImage(item, depth + 1);
      if (image) return image;
    }
    return null;
  }
  if (typeof payload !== 'object') return null;

  const urlValue =
    payload.url ||
    payload.imageUrl ||
    payload.image_url ||
    payload.fileID ||
    payload.fileId;
  const urlImage = extractGeneratedImage(urlValue, depth + 1);
  if (urlImage) return urlImage;

  const base64Value =
    payload.b64_json ||
    payload.base64 ||
    payload.image_base64 ||
    payload.imageBase64;
  if (base64Value) return { base64: String(base64Value) };

  const nestedKeys = [
    'data',
    'output',
    'result',
    'image',
    'images',
    'content',
    'artifacts',
    'generations'
  ];
  for (const key of nestedKeys) {
    const image = extractGeneratedImage(payload[key], depth + 1);
    if (image) return image;
  }
  return null;
}

function imageResponseShape(body) {
  if (!body || typeof body !== 'object') return typeof body;
  return Object.keys(body).slice(0, 12).join(',') || 'empty object';
}

function imageErrorDetail(body) {
  if (!body) return '';
  if (typeof body === 'string') return cleanText(body, 500);
  if (typeof body !== 'object') return cleanText(String(body), 500);

  const error = body.error && typeof body.error === 'object' ? body.error : {};
  const parts = [
    error.message,
    error.type,
    error.code,
    body.message,
    body.msg,
    body.detail,
    body.details,
    body.code,
    body.type
  ]
    .map((item) => cleanText(item, 220))
    .filter(Boolean);

  if (parts.length) return parts.join(' | ');
  try {
    return cleanText(JSON.stringify(body), 500);
  } catch (error) {
    return imageResponseShape(body);
  }
}

async function callOpenAiImageGeneration(config, role, userId) {
  const baseUrl = String(config.baseUrl || '').replace(/\/+$/, '');
  const url = `${baseUrl}/images/generations`;
  const response = await uniCloud.httpclient.request(url, {
    method: 'POST',
    dataType: 'json',
    contentType: 'json',
    timeout: AI_IMAGE_HTTP_TIMEOUT,
    headers: {
      Authorization: `Bearer ${config.apiKey}`
    },
    data: {
      model: config.imageModel || 'gpt-image-2',
      prompt: roleIconPrompt(role),
      n: 1,
      size: '1024x1024'
    }
  });

  if (response.status >= 400) {
    const detail = imageErrorDetail(response.data);
    console.error('AI image request failed:', {
      status: response.status,
      model: config.imageModel || 'gpt-image-2',
      baseUrl,
      detail
    });
    throw new Error(`AI image request failed: ${response.status}${detail ? ` - ${detail}` : ''}`);
  }
  const body = response.data || {};
  const image = extractGeneratedImage(body);
  if (!image) {
    throw new Error(`AI did not return an image. Response fields: ${imageResponseShape(body)}`);
  }
  if (image.url) return image.url;
  if (image.base64) {
    const urlFromUpload = await uploadGeneratedRoleIcon(userId, image.base64, 'image/png');
    if (urlFromUpload) return urlFromUpload;
  }
  throw new Error('AI did not return a usable image');
}

async function generateRecordAnswer(record, userId) {
  if (!record || !record._id) return fail('record not found');
  if (record.userId !== userId) return fail('record not found');
  if (record.status === 'success') return ok({ record });
  if (record.status === 'running') return ok({ record });

  const resolved = await resolveAiConfig(userId);
  if (!resolved) return fail('AI not configured');

  await db.collection(TABLES.records).doc(record._id).update({
    status: 'running',
    errorMessage: '',
    updateTime: now()
  });

  const script = await getScript(record.scriptId);
  const corrections = await searchCorrections(record.question, script);
  const knowledge = await searchKnowledge(record.question, script);
  const promptQuestion = corrections.length ? `${correctionPromptPrefix(corrections)}\n用户原始问题：${record.question}` : record.question;
  const prompt = buildPrompt({ question: promptQuestion, script, knowledge, corrections });

  try {
    const aiResult = await callAi(resolved.config, prompt);
    const updateDoc = {
      answer: aiResult.answer,
      analysis: aiResult.analysis,
      references: knowledge.map(item => ({ id: item.id, title: item.title, sourceUrl: item.sourceUrl })),
      correctionReferences: corrections.map(item => ({ id: item._id, question: item.question || '', score: item.score })),
      provider: resolved.config.provider || 'openai-compatible',
      model: resolved.config.model,
      configSource: resolved.source,
      status: 'success',
      errorMessage: '',
      usedCorrectionIds: corrections.map(item => item._id),
      correctionMatched: corrections.length > 0,
      updateTime: now()
    };
    await db.collection(TABLES.records).doc(record._id).update(updateDoc);
    return ok({ record: { ...record, ...updateDoc } });
  } catch (error) {
    const message = aiErrorMessage(error);
    await db.collection(TABLES.records).doc(record._id).update({
      status: 'failed',
      errorMessage: message,
      updateTime: now()
    });
    console.error('ai generate failed', error);
    return fail(message, { recordId: record._id, status: 'failed' });
  }
}

module.exports = {
  async listAnnouncements(params = {}) {
    const limit = Math.min(20, Math.max(1, Number(params.limit || 10)));
    const list = await getActiveAnnouncements(limit);
    return ok({ list: list.slice(0, limit).map(item => publicAnnouncement(item)) });
  },

  async getAnnouncement(params = {}) {
    if (!params.id) return fail('missing announcement id');
    const res = await db.collection(TABLES.announcements).doc(params.id).get();
    const item = res.data && res.data[0];
    if (!isActiveAnnouncement(item)) return fail('announcement not found');
    return ok({ item: publicAnnouncement(item, true) });
  },

  async getAvailability(params = {}) {
    const auth = await verifyToken(params.token);
    if (!auth) {
      return ok({ available: false, message: '请先登录' });
    }
    const resolved = await resolveAiConfig(auth.user._id);
    if (!resolved) {
      return ok({ available: false, message: 'AI 未配置，请先配置个人 AI 或等待管理员开启默认 AI' });
    }
    return ok({ available: true, source: resolved.source, message: resolved.source === 'user' ? '使用个人 AI 配置' : '使用管理端默认 AI' });
  },

  async getUserConfig(params = {}) {
    const auth = await verifyToken(params.token);
    if (!auth) return fail('请先登录');
    const config = await getUserConfig(auth.user._id);
    return ok({ config: publicConfig(config) || { enabled: false, provider: 'openai-compatible', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', imageModel: 'gpt-image-2', apiKey: '' } });
  },

  async saveUserConfig(params = {}) {
    const auth = await verifyToken(params.token);
    if (!auth) return fail('请先登录');
    const input = params.config || {};
    const existed = await getUserConfig(auth.user._id);
    const doc = {
      userId: auth.user._id,
      email: auth.user.email,
      enabled: isEnabled(input.enabled),
      provider: cleanText(input.provider || 'openai-compatible', 60),
      baseUrl: cleanText(input.baseUrl || '', 300),
      model: cleanText(input.model || '', 120),
      imageModel: cleanText(input.imageModel || 'gpt-image-2', 120),
      updateTime: now()
    };
    if (input.apiKey && !String(input.apiKey).includes('***')) {
      doc.apiKey = cleanText(input.apiKey, 500);
    } else if (existed && existed.apiKey) {
      doc.apiKey = existed.apiKey;
    } else {
      doc.apiKey = '';
    }
    if (doc.enabled && (!doc.baseUrl || !doc.model || !doc.apiKey)) {
      return fail('启用个人配置时，请填写 Base URL、模型和 API Key');
    }
    if (existed) {
      await db.collection(TABLES.userConfig).doc(existed._id).update(doc);
    } else {
      doc.createTime = now();
      await db.collection(TABLES.userConfig).add(doc);
    }
    const saved = await getUserConfig(auth.user._id);
    if (doc.imageModel && (!saved || saved.imageModel !== doc.imageModel)) {
      return fail('AI 生图模型保存失败，请检查数据库 schema 是否已部署');
    }
    return ok({ config: publicConfig(saved || doc) }, '保存成功');
  },

  async generateRoleIcon(params = {}) {
    const auth = await verifyToken(params.token);
    if (!auth) return fail('Please login first');
    const role = params.role || {};
    const description = cleanText(
      role.description || role.keywords || role.iconKeywords || role.prompt || role.subject || '',
      220
    );
    if (!description) return fail('请输入图标描述');
    role.description = description;
    role.team = cleanText(role.team || role.roleType || role.category || 'townsfolk', 40);

    const resolved = await resolveAiConfig(auth.user._id);
    if (!resolved || !resolved.config) return fail('AI not configured');
    const config = resolved.config;
    const imageModel = cleanText(config.imageModel || 'gpt-image-2', 120);
    if (!config.baseUrl || !config.apiKey) {
      return fail('AI 生图配置不完整，请检查网站地址和 API Key');
    }
    config.imageModel = imageModel;

    try {
      const imageUrl = await withTimeout(
        callOpenAiImageGeneration(config, role, auth.user._id),
        AI_IMAGE_HARD_TIMEOUT,
        'AI image request timeout'
      );
      return ok({
        imageUrl,
        source: resolved.source,
        model: config.imageModel || 'gpt-image-2'
      });
    } catch (error) {
      console.error('generateRoleIcon failed:', error && error.message ? error.message : error);
      return fail(aiErrorMessage(error));
    }
  },

  async listScripts(params = {}) {
    const page = Math.max(1, Number(params.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize || 50)));
    const skip = (page - 1) * pageSize;
    const keyword = cleanText(params.q || params.keyword, 80);
    const where = {};
    if (keyword) {
      where.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { author: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }
    const res = await db.collection(TABLES.scripts)
      .where(where)
      .field({ title: true, author: true, description: true, status: true })
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();
    const list = (res.data || []).filter(item => item.status !== 'inactive' && item.status !== 'disabled');
    const count = await db.collection(TABLES.scripts).where(where).count();
    return ok({ list, total: count.total || 0, page, pageSize });
  },

  async ask(params = {}) {
    const auth = await verifyToken(params.token);
    if (!auth) return fail('请先登录');
    const question = cleanText(params.question, 1000);
    if (!question) return fail('请输入问题');

    const resolved = await resolveAiConfig(auth.user._id);
    if (!resolved) return fail('AI 未配置，请先配置个人 AI 或等待管理员开启默认 AI');

    const script = await getScript(params.scriptId);
    const corrections = await searchCorrections(question, script);
    const directCorrection = corrections.find(item => item.score >= 94);
    if (directCorrection) {
      const record = {
        userId: auth.user._id,
        email: auth.user.email,
        question,
        answer: directCorrection.correctedAnswer,
        analysis: '命中管理员修正知识，已按修正答案直接回答。',
        references: [{ id: directCorrection._id, title: directCorrection.question || '管理员修正', sourceUrl: `ai-correction:${directCorrection.recordId || directCorrection._id}` }],
        correctionReferences: [{ id: directCorrection._id, question: directCorrection.question || '', score: directCorrection.score }],
        scriptId: script ? script._id : '',
        scriptTitle: script ? script.title : '',
        scriptJsonSnapshot: script ? script.content : null,
        provider: 'admin-correction',
        model: 'admin-correction',
        configSource: 'correction',
        status: 'success',
        isCorrected: false,
        usedCorrectionIds: [directCorrection._id],
        correctionMatched: true,
        createTime: now(),
        updateTime: now()
      };
      const addResult = await db.collection(TABLES.records).add(record);
      return ok({
        recordId: addResult.id,
        answer: record.answer,
        analysis: record.analysis,
        references: record.references,
        configSource: record.configSource
      });
    }
    const record = {
      userId: auth.user._id,
      email: auth.user.email,
      question,
      answer: '',
      analysis: '',
      references: [],
      correctionReferences: corrections.map(item => ({ id: item._id, question: item.question || '', score: item.score })),
      scriptId: script ? script._id : '',
      scriptTitle: script ? script.title : '',
      scriptJsonSnapshot: script ? script.content : null,
      provider: resolved.config.provider || 'openai-compatible',
      model: resolved.config.model,
      configSource: resolved.source,
      status: 'pending',
      errorMessage: '',
      isCorrected: false,
      usedCorrectionIds: corrections.map(item => item._id),
      correctionMatched: corrections.length > 0,
      createTime: now(),
      updateTime: now()
    };
    const addResult = await db.collection(TABLES.records).add(record);
    record._id = addResult.id;
    const generated = await generateRecordAnswer(record, auth.user._id);
    if (!generated.success) return generated;
    const generatedRecord = generated.data && generated.data.record ? generated.data.record : record;
    return ok({
      recordId: addResult.id,
      status: generatedRecord.status,
      answer: generatedRecord.answer || '',
      analysis: generatedRecord.analysis || '',
      references: generatedRecord.references || [],
      configSource: generatedRecord.configSource || resolved.source
    });
  },

  async generateAnswer(params = {}) {
    const auth = await verifyToken(params.token);
    if (!auth) return fail('请先登录');
    const record = await getOwnedRecord(params.id || params.recordId, auth.user._id);
    if (!record) return fail('记录不存在');
    if (record.status === 'success') {
      return ok({ record });
    }

    const resolved = await resolveAiConfig(auth.user._id);
    if (!resolved) return fail('AI 未配置，请先配置个人 AI 或等待管理员开启默认 AI');

    await db.collection(TABLES.records).doc(record._id).update({
      status: 'running',
      errorMessage: '',
      updateTime: now()
    });

    const script = await getScript(record.scriptId);
    const corrections = await searchCorrections(record.question, script);
    const knowledge = await searchKnowledge(record.question, script);
    const promptQuestion = corrections.length ? `${correctionPromptPrefix(corrections)}\n用户原始问题：${record.question}` : record.question;
    const prompt = buildPrompt({ question: promptQuestion, script, knowledge, corrections });

    try {
      const aiResult = await callAi(resolved.config, prompt);
      const updateDoc = {
        answer: aiResult.answer,
        analysis: aiResult.analysis,
        references: knowledge.map(item => ({ id: item.id, title: item.title, sourceUrl: item.sourceUrl })),
        correctionReferences: corrections.map(item => ({ id: item._id, question: item.question || '', score: item.score })),
        provider: resolved.config.provider || 'openai-compatible',
        model: resolved.config.model,
        configSource: resolved.source,
        status: 'success',
        errorMessage: '',
        usedCorrectionIds: corrections.map(item => item._id),
        correctionMatched: corrections.length > 0,
        updateTime: now()
      };
      await db.collection(TABLES.records).doc(record._id).update(updateDoc);
      return ok({ record: { ...record, ...updateDoc } });
    } catch (error) {
      const message = aiErrorMessage(error);
      await db.collection(TABLES.records).doc(record._id).update({
        status: 'failed',
        errorMessage: message,
        updateTime: now()
      });
      console.error('ai generate failed', error);
      return fail(message, { recordId: record._id, status: 'failed' });
    }
  },

  async history(params = {}) {
    const auth = await verifyToken(params.token);
    if (!auth) return fail('请先登录');
    const page = Math.max(1, Number(params.page || 1));
    const pageSize = Math.min(50, Math.max(1, Number(params.pageSize || 20)));
    const skip = (page - 1) * pageSize;
    const keyword = cleanText(params.keyword, 80);
    const query = { userId: auth.user._id };
    if (keyword) {
      query.$or = [
        { question: { $regex: keyword, $options: 'i' } },
        { answer: { $regex: keyword, $options: 'i' } },
        { correctedAnswer: { $regex: keyword, $options: 'i' } },
        { scriptTitle: { $regex: keyword, $options: 'i' } }
      ];
    }
    const res = await db.collection(TABLES.records)
      .where(query)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();
    const count = await db.collection(TABLES.records).where(query).count();
    return ok({ list: res.data || [], total: count.total || 0, page, pageSize });
  },

  async getRecord(params = {}) {
    const auth = await verifyToken(params.token);
    if (!auth) return fail('请先登录');
    const record = await getOwnedRecord(params.id, auth.user._id);
    if (!record) return fail('记录不存在');
    return ok({ record });
  },

  async deleteRecord(params = {}) {
    const auth = await verifyToken(params.token);
    if (!auth) return fail('请先登录');
    const existed = await getOwnedRecord(params.id, auth.user._id);
    if (!existed) return fail('记录不存在');
    await db.collection(TABLES.records).doc(existed._id).remove();
    return ok({}, '删除成功');
  }
};
