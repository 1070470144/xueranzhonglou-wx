'use strict';

const db = uniCloud.database();

const TABLES = {
  sessions: 'auth-sessions',
  users: 'app-users',
  adminConfig: 'ai-configs',
  userConfig: 'user-ai-configs',
  knowledge: 'ai-knowledge',
  records: 'ai-question-records',
  scripts: 'scripts'
};

function ok(data = {}, message = '操作成功') {
  return { success: true, message, data };
}

function fail(message = '操作失败', data = {}) {
  return { success: false, message, data };
}

function now() {
  return Date.now();
}

function cleanText(value, max = 4000) {
  return String(value || '').trim().slice(0, max);
}

function publicConfig(config) {
  if (!config) return null;
  const maskedKey = config.apiKey ? `${String(config.apiKey).slice(0, 6)}***${String(config.apiKey).slice(-4)}` : '';
  return {
    enabled: !!config.enabled,
    provider: config.provider || 'openai-compatible',
    baseUrl: config.baseUrl || '',
    model: config.model || '',
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
  if (userConfig && userConfig.enabled && userConfig.apiKey && userConfig.baseUrl && userConfig.model) {
    return { source: 'user', config: userConfig };
  }

  const adminConfig = await getAdminConfig();
  if (adminConfig && adminConfig.enabled && adminConfig.apiKey && adminConfig.baseUrl && adminConfig.model) {
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
  let list = [];

  if (keywords.length) {
    const ors = [];
    keywords.slice(0, 6).forEach(keyword => {
      ors.push({ title: { $regex: keyword, $options: 'i' } });
      ors.push({ searchText: { $regex: keyword, $options: 'i' } });
    });
    const res = await db.collection(TABLES.knowledge)
      .where({ status: 'active', $or: ors })
      .limit(6)
      .get();
    list = res.data || [];
  }

  if (!list.length) {
    const res = await db.collection(TABLES.knowledge)
      .where({ status: 'active' })
      .orderBy('updateTime', 'desc')
      .limit(6)
      .get();
    list = res.data || [];
  }

  return list.map(item => ({
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
  }));
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
  const picked = keys
    .map(key => sections.find(section => section.key === key))
    .filter(Boolean)
    .slice(0, 4);
  if (!picked.length) return cleanText(item.content, 1600);
  return cleanText(picked.map(section => `【${section.title}】\n${section.content}`).join('\n\n'), 2400);
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
  ].join('\n'), 6000);
}

function buildPrompt({ question, script, knowledge }) {
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
    timeout: 60000,
    headers: {
      Authorization: `Bearer ${config.apiKey}`
    },
    data: {
      model: config.model,
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
    timeout: 60000,
    headers: {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01'
    },
    data: {
      model: config.model,
      max_tokens: Number(config.maxTokens || 2000),
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
  if (config.provider === 'claude-code-compatible') {
    return callClaudeCodeCompatible(config, prompt);
  }
  return callOpenAiCompatible(config, prompt);
}

module.exports = {
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
    return ok({ config: publicConfig(config) || { enabled: false, provider: 'openai-compatible', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: '' } });
  },

  async saveUserConfig(params = {}) {
    const auth = await verifyToken(params.token);
    if (!auth) return fail('请先登录');
    const input = params.config || {};
    const existed = await getUserConfig(auth.user._id);
    const doc = {
      userId: auth.user._id,
      email: auth.user.email,
      enabled: !!input.enabled,
      provider: cleanText(input.provider || 'openai-compatible', 60),
      baseUrl: cleanText(input.baseUrl || '', 300),
      model: cleanText(input.model || '', 120),
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
    return ok({ config: publicConfig(doc) }, '保存成功');
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
    const knowledge = await searchKnowledge(question, script);
    const prompt = buildPrompt({ question, script, knowledge });
    const aiResult = await callAi(resolved.config, prompt);
    const record = {
      userId: auth.user._id,
      email: auth.user.email,
      question,
      answer: aiResult.answer,
      analysis: aiResult.analysis,
      references: knowledge.map(item => ({ id: item.id, title: item.title, sourceUrl: item.sourceUrl })),
      scriptId: script ? script._id : '',
      scriptTitle: script ? script.title : '',
      scriptJsonSnapshot: script ? script.content : null,
      provider: resolved.config.provider || 'openai-compatible',
      model: resolved.config.model,
      configSource: resolved.source,
      isCorrected: false,
      createTime: now(),
      updateTime: now()
    };
    const addResult = await db.collection(TABLES.records).add(record);
    record._id = addResult.id;
    return ok({
      recordId: addResult.id,
      answer: record.answer,
      analysis: record.analysis,
      references: record.references,
      configSource: resolved.source
    });
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
