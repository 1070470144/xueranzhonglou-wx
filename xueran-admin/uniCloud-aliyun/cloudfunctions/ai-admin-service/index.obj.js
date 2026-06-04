'use strict';

const db = uniCloud.database();

const TABLES = {
  config: 'ai-configs',
  knowledge: 'ai-knowledge',
  records: 'ai-question-records',
  corrections: 'ai-answer-corrections',
  crawlJobs: 'ai-crawl-jobs',
  announcements: 'announcements',
  webAnnouncements: 'web-announcements'
};

const WIKI_HOME = 'https://clocktower-wiki.gstonegames.com/';
const WIKI_PAGE = 'https://clocktower-wiki.gstonegames.com/index.php';
const WIKI_START_URL = `${WIKI_PAGE}?title=%E9%A6%96%E9%A1%B5`;
const FIXED_RULE_PAGES = {
  rules_summary: { title: '规则概要', type: 'rule', category: '基础规则' },
  important_details: { title: '重要细节', type: 'rule', category: '基础规则' },
  terms: { title: '术语汇总', type: 'term', category: '术语' },
  jinxes: { title: '相克规则', type: 'rule', category: '相克规则' },
  storyteller_advice: { title: '给说书人的建议', type: 'rule', category: '说书人' },
  ability_visit_storyteller: { title: '拜访说书人', type: 'rule', category: '角色能力类别' },
  ability_protection: { title: '保护', type: 'rule', category: '角色能力类别' },
  ability_expose_role: { title: '暴露角色', type: 'rule', category: '角色能力类别' },
  ability_continuous_detection: { title: '持续检测型能力', type: 'rule', category: '角色能力类别' },
  ability_execution: { title: '处决', type: 'rule', category: '角色能力类别' },
  ability_extra_death: { title: '额外死亡', type: 'rule', category: '角色能力类别' },
  ability_madness: { title: '疯狂', type: 'rule', category: '角色能力类别' },
  ability_resurrection: { title: '复活', type: 'rule', category: '角色能力类别' },
  ability_change_target: { title: '更换选择目标', type: 'rule', category: '角色能力类别' },
  ability_public_trigger: { title: '公开触发能力', type: 'rule', category: '角色能力类别' },
  ability_gain_ability: { title: '获得能力', type: 'rule', category: '角色能力类别' },
  ability_info: { title: '获取信息', type: 'rule', category: '角色能力类别' },
  ability_interaction_interference: { title: '互动干扰', type: 'rule', category: '角色能力类别' },
  ability_retrospective: { title: '回溯型能力', type: 'rule', category: '角色能力类别' },
  ability_entry: { title: '进场能力', type: 'rule', category: '角色能力类别' },
  ability_role_change: { title: '角色变化', type: 'rule', category: '角色能力类别' },
  ability_neighboring: { title: '邻近', type: 'rule', category: '角色能力类别' },
  ability_immune_death: { title: '免死', type: 'rule', category: '角色能力类别' },
  ability_effect_interference: { title: '能力效果干扰', type: 'rule', category: '角色能力类别' },
  ability_cognition_override: { title: '认知覆盖', type: 'rule', category: '角色能力类别' },
  ability_setup_adjustment: { title: '设置调整', type: 'rule', category: '角色能力类别' },
  ability_dead_ability_retained: { title: '死后能力保留', type: 'rule', category: '角色能力类别' },
  ability_death_trigger: { title: '死亡触发能力', type: 'rule', category: '角色能力类别' },
  ability_special_win_loss: { title: '特殊胜利失败条件', type: 'rule', category: '角色能力类别' },
  ability_nomination: { title: '提名', type: 'rule', category: '角色能力类别' },
  ability_vote: { title: '投票', type: 'rule', category: '角色能力类别' },
  ability_limited_use: { title: '限次能力', type: 'rule', category: '角色能力类别' },
  ability_influence: { title: '影响', type: 'rule', category: '角色能力类别' },
  ability_alignment_change: { title: '阵营转变', type: 'rule', category: '角色能力类别' },
  ability_poisoned: { title: '中毒', type: 'rule', category: '角色能力类别' },
  ability_drunk: { title: '醉酒', type: 'rule', category: '角色能力类别' }
};

function ok(data = {}, message = '操作成功') {
  return { success: true, message, data };
}

function fail(message = '操作失败') {
  return { success: false, message };
}

function now() {
  return Date.now();
}

function cleanText(value, max = 100000) {
  return String(value || '').trim().slice(0, max);
}

function isEnabled(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function normalizeAnnouncementStatus(status) {
  return ['draft', 'published', 'offline'].includes(status) ? status : 'draft';
}

function normalizeAnnouncementType(type) {
  return ['notice', 'update', 'maintenance', 'important'].includes(type) ? type : 'notice';
}

function normalizeTime(value) {
  if (value === null || value === undefined || value === '') return null;
  const time = Number(value);
  return Number.isFinite(time) && time > 0 ? time : null;
}

function normalizePriority(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function buildCorrectionKeywords(record, correctedAnswer) {
  const text = [record.question, record.scriptTitle, correctedAnswer].filter(Boolean).join(' ');
  const words = text.toLowerCase().match(/[a-z0-9]+|[\u4e00-\u9fa5]{2,}/g) || [];
  const pieces = [];
  words.forEach(word => {
    pieces.push(word);
    if (/^[\u4e00-\u9fa5]+$/.test(word) && word.length > 3) {
      for (let index = 0; index <= word.length - 2; index += 1) pieces.push(word.slice(index, index + 2));
    }
  });
  return Array.from(new Set(pieces.filter(item => item.length >= 2))).slice(0, 30);
}

function positiveInt(value, defaultValue, maxValue) {
  const raw = value && typeof value === 'object' ? (value.current || value.value) : value;
  const number = Number(raw);
  const integer = Number.isInteger(number) && number > 0 ? number : defaultValue;
  return maxValue ? Math.min(maxValue, integer) : integer;
}

function publicConfig(config) {
  if (!config) {
    return {
      enabled: false,
      provider: 'openai-compatible',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      apiKey: '',
      temperature: 0.2
    };
  }
  return {
    enabled: isEnabled(config.enabled),
    provider: config.provider || 'openai-compatible',
    baseUrl: config.baseUrl || '',
    model: config.model || '',
    apiKey: config.apiKey ? `${String(config.apiKey).slice(0, 6)}***${String(config.apiKey).slice(-4)}` : '',
    temperature: config.temperature === undefined ? 0.2 : config.temperature
  };
}

function stripHtml(html) {
  return cleanText(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function buildUrl(base, params) {
  const query = Object.keys(params || {})
    .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  return query ? `${base}?${query}` : base;
}

function wikiUrlByTitle(title) {
  return buildUrl(WIKI_PAGE, { title: cleanText(title, 120) });
}

function normalizeKnowledgeType(type) {
  const value = cleanText(type || '', 40);
  return ['role', 'rule', 'script', 'term', 'manual', 'correction', 'other'].includes(value) ? value : 'other';
}

async function requestHtml(url) {
  const response = await uniCloud.httpclient.request(url, {
    method: 'GET',
    dataType: 'text',
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Referer': WIKI_HOME,
      'Upgrade-Insecure-Requests': '1'
    }
  });
  const html = response.data || '';
  if (!html) throw new Error('wiki page empty response');
  if (response.status >= 400 || /<title>\s*403 Forbidden\s*<\/title>/i.test(html)) {
    throw new Error(`wiki page forbidden: ${url}`);
  }
  return html;
}

function normalizeWikiPageUrl(href) {
  try {
    const url = new URL(href, WIKI_HOME);
    if (url.origin !== new URL(WIKI_HOME).origin || url.pathname !== '/index.php') return '';
    const title = url.searchParams.get('title');
    if (!title || title.includes(':')) return '';
    if (url.searchParams.get('action') || url.searchParams.get('oldid')) return '';
    return buildUrl(WIKI_PAGE, { title });
  } catch (error) {
    return '';
  }
}

function extractWikiPageLinks(html, maxPages) {
  const links = [];
  const re = /href=["']([^"'#]+)["']/gi;
  let match;
  while ((match = re.exec(String(html || '')))) {
    const url = normalizeWikiPageUrl(match[1]);
    if (url && !links.includes(url)) links.push(url);
    if (links.length >= maxPages) break;
  }
  return links;
}

function extractArticleHtml(html) {
  const text = String(html || '');
  const start = text.indexOf('<div class="mw-parser-output">');
  if (start < 0) return text;
  const end = text.indexOf('<div class="printfooter">', start);
  return end > start ? text.slice(start, end) : text.slice(start);
}

function normalizeSectionKey(title) {
  const map = {
    '背景故事': 'background',
    '角色能力': 'ability',
    '角色简介': 'intro',
    '范例': 'examples',
    '运作方式': 'how_to_run',
    '提示标记': 'reminders',
    '规则细节': 'rules',
    '提示与技巧': 'tips',
    '伪装成国王': 'bluffing',
    '角色信息': 'role_info'
  };
  return map[title] || title;
}

function extractHeadlineTitle(h2) {
  const match = String(h2 || '').match(/<span[^>]*class=["']mw-headline["'][^>]*>([\s\S]*?)<\/span>/i);
  return stripHtml(match && match[1]);
}

function extractSectionsFromArticle(articleHtml) {
  const source = String(articleHtml || '');
  const h2Re = /<h2[\s\S]*?<\/h2>/gi;
  const heads = [];
  let match;
  while ((match = h2Re.exec(source))) {
    const title = extractHeadlineTitle(match[0]);
    if (title) heads.push({ title, index: match.index, end: h2Re.lastIndex });
  }
  return heads.map((head, index) => {
    const next = heads[index + 1];
    const html = source.slice(head.end, next ? next.index : source.length);
    return {
      key: normalizeSectionKey(head.title),
      title: head.title,
      content: stripHtml(html)
    };
  }).filter(section => section.content);
}

function sectionContent(sections, key) {
  const section = (sections || []).find(item => item.key === key || item.title === key);
  return section ? section.content : '';
}

async function getWikiPage(url) {
  const html = await requestHtml(url);
  return parseWikiPage(url, html);
}

function parseWikiPage(url, html) {
  const articleHtml = extractArticleHtml(html);
  const sections = extractSectionsFromArticle(articleHtml);
  const roleInfo = extractRoleInfoFromHtml(html, sections);
  const content = stripHtml(articleHtml);
  return {
    title: extractTitle(html, url),
    content,
    searchText: buildSearchText({ title: extractTitle(html, url), content, sections, roleInfo }),
    sections,
    ...roleInfo,
    sourceUrl: url
  };
}

function extractRoleInfoFromHtml(html, sections = []) {
  const text = String(html || '');
  const infoStart = text.indexOf('id="角色信息"');
  const infoHtml = infoStart >= 0 ? text.slice(infoStart, infoStart + 3000) : sectionContent(sections, 'role_info');
  const match = infoHtml.match(/角色类型[\s\S]*?<a[^>]*>(镇民|外来者|爪牙|恶魔|旅行者|传奇角色|实验性角色)<\/a>/);
  const plainText = stripHtml(infoHtml);
  const plainRoleType = plainText.match(/角色类型\s*[：:]\s*(镇民|外来者|爪牙|恶魔|旅行者|传奇角色|实验性角色)/);
  const englishName = plainText.match(/英文名\s*[：:]\s*([^\s]+)/);
  const scriptsText = (plainText.match(/所属剧本\s*[：:]\s*([\s\S]*?)\s*角色类型/) || [])[1] || '';
  const abilityText = (plainText.match(/角色能力类型\s*[：:]\s*([\s\S]*)/) || [])[1] || '';
  return {
    englishName: englishName ? cleanText(englishName[1], 80) : '',
    scripts: splitMetaList(scriptsText),
    roleType: match ? match[1] : (plainRoleType ? plainRoleType[1] : ''),
    abilityTypes: splitMetaList(abilityText)
  };
}

function splitMetaList(value) {
  return cleanText(value, 500)
    .split(/[、,，/]/)
    .map(item => cleanText(item.replace(/卡牌版/g, '卡牌版'), 80))
    .filter(Boolean)
    .slice(0, 20);
}

function buildSearchText({ title, content, sections, roleInfo }) {
  const important = [
    title,
    roleInfo && roleInfo.englishName,
    roleInfo && roleInfo.roleType,
    roleInfo && (roleInfo.scripts || []).join(' '),
    roleInfo && (roleInfo.abilityTypes || []).join(' '),
    sectionContent(sections, 'ability'),
    sectionContent(sections, 'intro'),
    sectionContent(sections, 'rules'),
    sectionContent(sections, 'how_to_run'),
    content
  ].filter(Boolean).join('\n');
  return cleanText(important, 100000);
}

function extractTitle(html, url) {
  const titleMatch = String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    return stripHtml(titleMatch[1]).replace(/[-|].*$/, '').trim() || url;
  }
  return decodeURIComponent(String(url || '').split('/').filter(Boolean).pop() || '百科知识');
}

function extractLinks(html) {
  const links = [];
  const re = /href=["']([^"'#]+)["']/gi;
  let match;
  while ((match = re.exec(String(html || '')))) {
    const href = match[1];
    if (!href || href.startsWith('javascript:') || href.startsWith('mailto:')) continue;
    try {
      const url = new URL(href, WIKI_HOME).toString();
      if (url.startsWith(WIKI_HOME)) links.push(url);
    } catch (error) {}
  }
  return Array.from(new Set(links));
}

async function upsertKnowledge(item) {
  const sourceUrl = cleanText(item.sourceUrl || '', 500);
  const query = sourceUrl ? { sourceUrl } : { title: item.title, sourceType: item.sourceType || 'manual' };
  const existed = await db.collection(TABLES.knowledge).where(query).limit(1).get();
  const doc = {
    title: cleanText(item.title, 200),
    content: cleanText(item.content, 100000),
    searchText: cleanText(item.searchText || item.content, 100000),
    sections: Array.isArray(item.sections) ? item.sections.map(section => ({
      key: cleanText(section.key || '', 60),
      title: cleanText(section.title || '', 80),
      content: cleanText(section.content || '', 40000)
    })).filter(section => section.title && section.content).slice(0, 30) : [],
    type: normalizeKnowledgeType(item.type),
    category: cleanText(item.category || 'wiki', 100),
    roleType: cleanText(item.roleType || '', 80),
    englishName: cleanText(item.englishName || '', 80),
    script: cleanText(item.script || '', 120),
    scripts: Array.isArray(item.scripts) ? item.scripts.map(script => cleanText(script, 80)).filter(Boolean).slice(0, 20) : [],
    abilityTypes: Array.isArray(item.abilityTypes) ? item.abilityTypes.map(type => cleanText(type, 80)).filter(Boolean).slice(0, 20) : [],
    tags: Array.isArray(item.tags) ? item.tags.map(tag => cleanText(tag, 40)).filter(Boolean).slice(0, 20) : [],
    sourceUrl,
    sourceType: cleanText(item.sourceType || 'wiki', 60),
    status: item.status || 'active',
    lastCrawlTime: item.sourceType === 'wiki' ? now() : item.lastCrawlTime,
    updateTime: now()
  };
  doc.searchText = buildSearchText({ title: doc.title, content: doc.content, sections: doc.sections, roleInfo: doc });
  if (existed.data && existed.data[0]) {
    await db.collection(TABLES.knowledge).doc(existed.data[0]._id).update(doc);
    return existed.data[0]._id;
  }
  doc.createTime = now();
  const res = await db.collection(TABLES.knowledge).add(doc);
  return res.id;
}

async function crawlWikiPageInternal(params = {}) {
  const url = cleanText(params.url || '', 500);
  if (!url) return fail('missing url');
  const item = await getWikiPage(url);
  if (!item.title || item.content.length <= 80) return fail('page content is empty or too short');
  const title = cleanText(params.title || item.title, 200);
  const id = await upsertKnowledge({
    ...item,
    title,
    type: params.type || 'other',
    category: params.category || 'wiki',
    roleType: params.roleType || '',
    script: params.script || '',
    tags: params.tags || [],
    sourceType: 'wiki'
  });
  return ok({ id, item }, `saved: ${item.title}`);
}

async function crawlRoleInternal(params = {}) {
  const roleName = cleanText(params.roleName || params.title || '', 120);
  if (!roleName) return fail('missing role name');
  const url = wikiUrlByTitle(roleName);
  const item = await getWikiPage(url);
  if (!item.title || item.content.length <= 80) return fail('role page content is empty or too short');
  const id = await upsertKnowledge({
    ...item,
    title: roleName,
    type: 'role',
    category: params.category || 'role',
    roleType: params.roleType || item.roleType || '',
    script: params.script || '',
    tags: ['role'].concat(params.tags || []),
    sourceType: 'wiki'
  });
  return ok({ id, item: { ...item, title: roleName } }, `saved role: ${roleName}`);
}

module.exports = {
  async listAnnouncements(params = {}) {
    const page = positiveInt(params.page, 1);
    const pageSize = positiveInt(params.pageSize, 20, 100);
    const keyword = cleanText(params.keyword || '', 100);
    const query = {};
    if (params.status) query.status = params.status;
    if (params.type) query.type = params.type;
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { summary: { $regex: keyword, $options: 'i' } },
        { content: { $regex: keyword, $options: 'i' } }
      ];
    }
    const skip = (page - 1) * pageSize;
    const res = await db.collection(TABLES.announcements).where(query).orderBy('updateTime', 'desc').skip(skip).limit(pageSize).get();
    const count = await db.collection(TABLES.announcements).where(query).count();
    return ok({ list: res.data || [], total: count.total || 0, page, pageSize });
  },

  async getAnnouncement(id) {
    if (!id) return fail('missing announcement id');
    const res = await db.collection(TABLES.announcements).doc(id).get();
    const item = res.data && res.data[0];
    if (!item) return fail('announcement not found');
    return ok({ item });
  },

  async saveAnnouncement(item = {}) {
    const doc = {
      title: cleanText(item.title, 120),
      summary: cleanText(item.summary, 300),
      content: cleanText(item.content, 20000),
      type: normalizeAnnouncementType(item.type),
      status: normalizeAnnouncementStatus(item.status),
      pinned: item.pinned === true || item.pinned === 'true' || item.pinned === 1 || item.pinned === '1',
      priority: normalizePriority(item.priority),
      startTime: normalizeTime(item.startTime),
      endTime: normalizeTime(item.endTime),
      updateTime: now()
    };
    if (!doc.title) return fail('title is required');
    if (!doc.summary) doc.summary = cleanText(doc.content, 120);
    if (!doc.content) return fail('content is required');
    if (doc.status === 'published' && !item.publishTime) doc.publishTime = now();
    else if (item.publishTime) doc.publishTime = normalizeTime(item.publishTime);
    if (doc.startTime && doc.endTime && doc.startTime > doc.endTime) return fail('start time cannot be later than end time');

    if (item._id) {
      await db.collection(TABLES.announcements).doc(item._id).update(doc);
      return ok({ id: item._id }, 'saved');
    }
    doc.createTime = now();
    if (!doc.publishTime && doc.status === 'published') doc.publishTime = doc.createTime;
    const res = await db.collection(TABLES.announcements).add(doc);
    return ok({ id: res.id }, 'created');
  },

  async deleteAnnouncement(id) {
    if (!id) return fail('missing announcement id');
    await db.collection(TABLES.announcements).doc(id).remove();
    return ok({}, 'deleted');
  },

  async updateAnnouncementStatus(params = {}) {
    if (!params.id) return fail('missing announcement id');
    const status = normalizeAnnouncementStatus(params.status);
    const existed = await db.collection(TABLES.announcements).doc(params.id).get();
    const item = existed.data && existed.data[0];
    if (!item) return fail('announcement not found');
    if (status === 'published') {
      if (!cleanText(item.title, 120)) return fail('title is required');
      if (!cleanText(item.content, 20000)) return fail('content is required');
      const startTime = normalizeTime(item.startTime);
      const endTime = normalizeTime(item.endTime);
      if (startTime && endTime && startTime > endTime) return fail('start time cannot be later than end time');
    }
    const doc = { status, updateTime: now() };
    if (status === 'published') doc.publishTime = item.publishTime || now();
    await db.collection(TABLES.announcements).doc(params.id).update(doc);
    return ok({}, 'saved');
  },

  async listWebAnnouncements(params = {}) {
    const page = positiveInt(params.page, 1);
    const pageSize = positiveInt(params.pageSize, 20, 100);
    const keyword = cleanText(params.keyword || '', 100);
    const query = {};
    if (params.status) query.status = params.status;
    if (params.type) query.type = params.type;
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { summary: { $regex: keyword, $options: 'i' } },
        { content: { $regex: keyword, $options: 'i' } },
        { version: { $regex: keyword, $options: 'i' } }
      ];
    }
    const skip = (page - 1) * pageSize;
    const res = await db.collection(TABLES.webAnnouncements).where(query).orderBy('updateTime', 'desc').skip(skip).limit(pageSize).get();
    const count = await db.collection(TABLES.webAnnouncements).where(query).count();
    return ok({ list: res.data || [], total: count.total || 0, page, pageSize });
  },

  async getWebAnnouncement(id) {
    if (!id) return fail('missing web announcement id');
    const res = await db.collection(TABLES.webAnnouncements).doc(id).get();
    const item = res.data && res.data[0];
    if (!item) return fail('web announcement not found');
    return ok({ item });
  },

  async saveWebAnnouncement(item = {}) {
    const doc = {
      title: cleanText(item.title, 120),
      summary: cleanText(item.summary, 300),
      content: cleanText(item.content, 20000),
      type: normalizeAnnouncementType(item.type),
      status: normalizeAnnouncementStatus(item.status),
      version: cleanText(item.version, 40),
      pinned: item.pinned === true || item.pinned === 'true' || item.pinned === 1 || item.pinned === '1',
      priority: normalizePriority(item.priority),
      startTime: normalizeTime(item.startTime),
      endTime: normalizeTime(item.endTime),
      updateTime: now()
    };
    if (!doc.title) return fail('title is required');
    if (!doc.summary) doc.summary = cleanText(doc.content, 120);
    if (!doc.content) return fail('content is required');
    if (doc.status === 'published' && !item.publishTime) doc.publishTime = now();
    else if (item.publishTime) doc.publishTime = normalizeTime(item.publishTime);
    if (doc.startTime && doc.endTime && doc.startTime > doc.endTime) return fail('start time cannot be later than end time');

    if (item._id) {
      await db.collection(TABLES.webAnnouncements).doc(item._id).update(doc);
      return ok({ id: item._id }, 'saved');
    }
    doc.createTime = now();
    if (!doc.publishTime && doc.status === 'published') doc.publishTime = doc.createTime;
    const res = await db.collection(TABLES.webAnnouncements).add(doc);
    return ok({ id: res.id }, 'created');
  },

  async deleteWebAnnouncement(id) {
    if (!id) return fail('missing web announcement id');
    await db.collection(TABLES.webAnnouncements).doc(id).remove();
    return ok({}, 'deleted');
  },

  async updateWebAnnouncementStatus(params = {}) {
    if (!params.id) return fail('missing web announcement id');
    const status = normalizeAnnouncementStatus(params.status);
    const existed = await db.collection(TABLES.webAnnouncements).doc(params.id).get();
    const item = existed.data && existed.data[0];
    if (!item) return fail('web announcement not found');
    if (status === 'published') {
      if (!cleanText(item.title, 120)) return fail('title is required');
      if (!cleanText(item.content, 20000)) return fail('content is required');
      const startTime = normalizeTime(item.startTime);
      const endTime = normalizeTime(item.endTime);
      if (startTime && endTime && startTime > endTime) return fail('start time cannot be later than end time');
    }
    const doc = { status, updateTime: now() };
    if (status === 'published') doc.publishTime = item.publishTime || now();
    await db.collection(TABLES.webAnnouncements).doc(params.id).update(doc);
    return ok({}, 'saved');
  },

  async getPublicWebAnnouncements(params = {}) {
    const pageSize = positiveInt(params.pageSize, 10, 50);
    const currentTime = now();
    const res = await db.collection(TABLES.webAnnouncements)
      .where({ status: 'published' })
      .orderBy('pinned', 'desc')
      .orderBy('priority', 'desc')
      .orderBy('publishTime', 'desc')
      .limit(50)
      .get();
    const list = (res.data || [])
      .filter(item => {
        const startTime = normalizeTime(item.startTime);
        const endTime = normalizeTime(item.endTime);
        return (!startTime || startTime <= currentTime) && (!endTime || endTime >= currentTime);
      })
      .slice(0, pageSize)
      .map(item => ({
        _id: item._id,
        title: item.title || '',
        summary: item.summary || '',
        content: item.content || '',
        type: item.type || 'notice',
        version: item.version || '',
        pinned: !!item.pinned,
        priority: item.priority || 0,
        publishTime: item.publishTime || item.updateTime || item.createTime || null,
        updateTime: item.updateTime || null,
        startTime: item.startTime || null,
        endTime: item.endTime || null
      }));
    return ok({ list });
  },

  async getDefaultConfig() {
    const res = await db.collection(TABLES.config).where({ scope: 'default' }).limit(1).get();
    return ok({ config: publicConfig(res.data && res.data[0]) });
  },

  async saveDefaultConfig(config = {}) {
    const existed = await db.collection(TABLES.config).where({ scope: 'default' }).limit(1).get();
    const existedConfig = existed.data && existed.data[0];
    const doc = {
      scope: 'default',
      enabled: isEnabled(config.enabled),
      provider: cleanText(config.provider || 'openai-compatible', 60),
      baseUrl: cleanText(config.baseUrl || '', 300),
      model: cleanText(config.model || '', 120),
      temperature: Number(config.temperature === undefined ? 0.2 : config.temperature),
      updateTime: now()
    };
    if (config.apiKey && !String(config.apiKey).includes('***')) {
      doc.apiKey = cleanText(config.apiKey, 500);
    } else if (existedConfig && existedConfig.apiKey) {
      doc.apiKey = existedConfig.apiKey;
    }
    if (doc.enabled && (!doc.baseUrl || !doc.model || !doc.apiKey)) {
      return fail('开启默认 AI 时，请填写 Base URL、模型和 API Key');
    }
    if (existedConfig) {
      await db.collection(TABLES.config).doc(existedConfig._id).update(doc);
    } else {
      doc.createTime = now();
      await db.collection(TABLES.config).add(doc);
    }
    return ok({ config: publicConfig(doc) }, '保存成功');
  },

  async listKnowledge(params = {}) {
    const page = positiveInt(params.page, 1);
    const pageSize = positiveInt(params.pageSize, 20, 100);
    const keyword = cleanText(params.keyword || '', 100);
    const query = {};
    if (params.status) query.status = params.status;
    if (params.type) query.type = params.type;
    if (params.category) query.category = params.category;
    if (keyword) query.title = { $regex: keyword, $options: 'i' };
    const skip = (page - 1) * pageSize;
    const field = {
      _id: true,
      title: true,
      type: true,
      category: true,
      roleType: true,
      script: true,
      sourceUrl: true,
      sourceType: true,
      status: true,
      lastCrawlTime: true,
      createTime: true,
      updateTime: true
    };
    const res = await db.collection(TABLES.knowledge).where(query).field(field).orderBy('updateTime', 'desc').skip(skip).limit(pageSize).get();
    const count = await db.collection(TABLES.knowledge).where(query).count();
    return ok({ list: res.data || [], total: count.total || 0, page, pageSize });
  },

  async getKnowledgeDetail(id) {
    if (!id) return fail('missing knowledge id');
    const res = await db.collection(TABLES.knowledge).doc(id).get();
    return ok({ item: res.data && res.data[0] });
  },

  async saveKnowledge(item = {}) {
    const doc = {
      title: cleanText(item.title, 200),
      content: cleanText(item.content, 100000),
      searchText: cleanText(item.searchText || item.content, 100000),
      sections: Array.isArray(item.sections) ? item.sections.map(section => ({
        key: cleanText(section.key || '', 60),
        title: cleanText(section.title || '', 80),
        content: cleanText(section.content || '', 40000)
      })).filter(section => section.title && section.content).slice(0, 30) : [],
      type: normalizeKnowledgeType(item.type || 'manual'),
      category: cleanText(item.category || 'manual', 100),
      roleType: cleanText(item.roleType || '', 80),
      englishName: cleanText(item.englishName || '', 80),
      script: cleanText(item.script || '', 120),
      scripts: Array.isArray(item.scripts) ? item.scripts.map(script => cleanText(script, 80)).filter(Boolean).slice(0, 20) : [],
      abilityTypes: Array.isArray(item.abilityTypes) ? item.abilityTypes.map(type => cleanText(type, 80)).filter(Boolean).slice(0, 20) : [],
      tags: Array.isArray(item.tags) ? item.tags.map(tag => cleanText(tag, 40)).filter(Boolean).slice(0, 20) : [],
      sourceUrl: cleanText(item.sourceUrl || '', 500),
      sourceType: cleanText(item.sourceType || 'manual', 60),
      status: item.status || 'active',
      updateTime: now()
    };
    doc.searchText = buildSearchText({ title: doc.title, content: doc.content, sections: doc.sections, roleInfo: doc });
    if (!doc.title || !doc.content) return fail('title and content are required');
    if (item._id) {
      await db.collection(TABLES.knowledge).doc(item._id).update(doc);
      return ok({ id: item._id }, 'saved');
    }
    doc.createTime = now();
    const res = await db.collection(TABLES.knowledge).add(doc);
    return ok({ id: res.id }, 'created');
  },

  async deleteKnowledge(id) {
    if (!id) return fail('missing knowledge id');
    await db.collection(TABLES.knowledge).doc(id).remove();
    return ok({}, 'deleted');
  },

  async batchDeleteKnowledge(ids = []) {
    const list = Array.isArray(ids) ? ids.filter(Boolean) : [];
    if (!list.length) return fail('missing ids');
    for (const id of list) {
      await db.collection(TABLES.knowledge).doc(id).remove();
    }
    return ok({ deletedCount: list.length }, `deleted ${list.length}`);
  },

  async crawlWikiPage(params = {}) {
    return crawlWikiPageInternal(params);
  },

  async crawlRole(params = {}) {
    return crawlRoleInternal(params);
  },

  async batchCrawlRoles(params = {}) {
    const names = Array.isArray(params.roleNames)
      ? params.roleNames
      : String(params.roleNames || '').split(/[\n,?]/);
    const roleNames = names.map(name => cleanText(name, 120)).filter(Boolean).slice(0, 300);
    if (!roleNames.length) return fail('missing role names');
    const results = [];
    let successCount = 0;
    let failedCount = 0;
    for (const roleName of roleNames) {
      try {
        const res = await crawlRoleInternal({
          roleName,
          category: params.category,
          roleType: params.roleType,
          script: params.script
        });
        if (res.success) successCount += 1;
        else failedCount += 1;
        results.push({ roleName, success: res.success, message: res.message });
      } catch (error) {
        failedCount += 1;
        results.push({ roleName, success: false, message: error.message || String(error) });
      }
    }
    return ok({ successCount, failedCount, results }, `roles saved ${successCount}, failed ${failedCount}`);
  },

  async crawlFixedRule(params = {}) {
    const key = cleanText(params.key || '', 80);
    const rule = FIXED_RULE_PAGES[key];
    if (!rule) return fail('unknown rule key');
    try {
      const res = await crawlWikiPageInternal({
        url: wikiUrlByTitle(rule.title),
        title: rule.title,
        type: rule.type,
        category: rule.category,
        tags: ['fixed-rule', key]
      });
      return res.success ? ok(res.data, `saved rule: ${rule.title}`) : res;
    } catch (error) {
      const message = error.message || String(error);
      const reason = message.includes('wiki page forbidden') ? '页面不存在或不可抓取' : message;
      return fail(`crawl rule failed: ${rule.title}，${reason}`);
    }
  },

  async recrawlKnowledge(id) {
    if (!id) return fail('missing knowledge id');
    const res = await db.collection(TABLES.knowledge).doc(id).get();
    const item = res.data && res.data[0];
    if (!item || !item.sourceUrl) return fail('missing source url');
    return crawlWikiPageInternal({
      url: item.sourceUrl,
      type: item.type || 'other',
      category: item.category || 'wiki',
      roleType: item.roleType || '',
      script: item.script || '',
      tags: item.tags || []
    });
  },

  async listQuestionRecords(params = {}) {
    const page = positiveInt(params.page, 1);
    const pageSize = positiveInt(params.pageSize, 20, 100);
    const keyword = cleanText(params.keyword || '', 100);
    const userKeyword = cleanText(params.userKeyword || '', 100);
    const query = {};
    const conditions = [];

    if (keyword) {
      conditions.push({ $or: [
        { email: { $regex: keyword, $options: 'i' } },
        { question: { $regex: keyword, $options: 'i' } },
        { answer: { $regex: keyword, $options: 'i' } }
      ] });
    }

    if (userKeyword) {
      conditions.push({ $or: [
        { email: { $regex: userKeyword, $options: 'i' } },
        { userId: { $regex: userKeyword, $options: 'i' } },
        { user_id: { $regex: userKeyword, $options: 'i' } },
        { uid: { $regex: userKeyword, $options: 'i' } },
        { nickname: { $regex: userKeyword, $options: 'i' } },
        { userNickname: { $regex: userKeyword, $options: 'i' } }
      ] });
    }

    if (conditions.length === 1) {
      Object.assign(query, conditions[0]);
    } else if (conditions.length > 1) {
      query.$and = conditions;
    }
    const skip = (page - 1) * pageSize;
    const res = await db.collection(TABLES.records).where(query).orderBy('createTime', 'desc').skip(skip).limit(pageSize).get();
    const count = await db.collection(TABLES.records).where(query).count();
    return ok({ list: res.data || [], total: count.total || 0, page, pageSize });
  },

  async getQuestionRecord(id) {
    if (!id) return fail('缺少记录 ID');
    const res = await db.collection(TABLES.records).doc(id).get();
    const record = res.data && res.data[0];
    if (!record) return fail('记录不存在');
    return ok(record);
  },

  async correctAnswer(params = {}) {
    const recordId = params.recordId;
    const correctedAnswer = cleanText(params.correctedAnswer, 10000);
    if (!recordId || !correctedAnswer) return fail('缺少记录 ID 或修正答案');
    const recordRes = await db.collection(TABLES.records).doc(recordId).get();
    const record = recordRes.data && recordRes.data[0];
    if (!record) return fail('记录不存在');
    await db.collection(TABLES.records).doc(recordId).update({
      correctedAnswer,
      isCorrected: true,
      updateTime: now()
    });
    const correctionDoc = {
      recordId,
      sourceRecordId: recordId,
      question: cleanText(record.question, 1000),
      originalAnswer: record.answer || '',
      correctedAnswer,
      analysis: cleanText(record.analysis, 1000),
      userId: record.userId || record.user_id || record.uid || '',
      email: record.email || '',
      scriptId: record.scriptId || '',
      scriptTitle: record.scriptTitle || '',
      scope: record.scriptId || record.scriptTitle ? 'script' : 'global',
      keywords: buildCorrectionKeywords(record, correctedAnswer),
      priority: 100,
      enabled: true,
      createTime: now(),
      updateTime: now()
    };
    const existedCorrection = await db.collection(TABLES.corrections).where({ recordId }).limit(1).get();
    if (existedCorrection.data && existedCorrection.data[0]) {
      await db.collection(TABLES.corrections).doc(existedCorrection.data[0]._id).update(correctionDoc);
    } else {
      await db.collection(TABLES.corrections).add(correctionDoc);
    }
    await upsertKnowledge({
      title: `问答修正：${cleanText(record.question, 80)}`,
      content: [
        `问题：${record.question || ''}`,
        record.scriptTitle ? `板子：${record.scriptTitle}` : '板子：通用',
        `正确答案：${correctedAnswer}`
      ].join('\n'),
      category: 'AI 回答修正',
      sourceType: 'correction',
      sourceUrl: `ai-correction:${recordId}`
    });
    return ok({}, '修正成功');
  },

  async listCorrections(params = {}) {
    const page = positiveInt(params.page, 1);
    const pageSize = positiveInt(params.pageSize, 20, 100);
    const keyword = cleanText(params.keyword || '', 100);
    const query = {};
    if (params.enabled === true || params.enabled === false) query.enabled = params.enabled;
    if (keyword) {
      query.$or = [
        { question: { $regex: keyword, $options: 'i' } },
        { correctedAnswer: { $regex: keyword, $options: 'i' } },
        { scriptTitle: { $regex: keyword, $options: 'i' } },
        { email: { $regex: keyword, $options: 'i' } }
      ];
    }
    const skip = (page - 1) * pageSize;
    const res = await db.collection(TABLES.corrections).where(query).orderBy('updateTime', 'desc').skip(skip).limit(pageSize).get();
    const count = await db.collection(TABLES.corrections).where(query).count();
    return ok({ list: res.data || [], total: count.total || 0, page, pageSize });
  },

  async getCorrection(id) {
    if (!id) return fail('missing correction id');
    const res = await db.collection(TABLES.corrections).doc(id).get();
    const item = res.data && res.data[0];
    if (!item) return fail('correction not found');
    return ok({ item });
  },

  async saveCorrection(item = {}) {
    const id = item._id;
    const doc = {
      question: cleanText(item.question, 1000),
      correctedAnswer: cleanText(item.correctedAnswer, 10000),
      scriptId: cleanText(item.scriptId || '', 100),
      scriptTitle: cleanText(item.scriptTitle || '', 200),
      scope: item.scriptId || item.scriptTitle ? 'script' : 'global',
      keywords: Array.isArray(item.keywords) ? item.keywords.map(keyword => cleanText(keyword, 80)).filter(Boolean).slice(0, 30) : [],
      priority: Number(item.priority || 100),
      enabled: item.enabled !== false,
      updateTime: now()
    };
    if (!doc.question || !doc.correctedAnswer) return fail('question and corrected answer are required');
    if (!doc.keywords.length) doc.keywords = buildCorrectionKeywords({ question: doc.question, scriptTitle: doc.scriptTitle }, doc.correctedAnswer);
    if (id) {
      await db.collection(TABLES.corrections).doc(id).update(doc);
      return ok({ id }, 'saved');
    }
    doc.recordId = cleanText(item.recordId || '', 100);
    doc.sourceRecordId = cleanText(item.sourceRecordId || item.recordId || '', 100);
    doc.originalAnswer = cleanText(item.originalAnswer || '', 10000);
    doc.analysis = cleanText(item.analysis || '', 1000);
    doc.userId = cleanText(item.userId || '', 100);
    doc.email = cleanText(item.email || '', 200);
    doc.createTime = now();
    const res = await db.collection(TABLES.corrections).add(doc);
    return ok({ id: res.id }, 'created');
  },

  async toggleCorrection(params = {}) {
    if (!params.id) return fail('missing correction id');
    await db.collection(TABLES.corrections).doc(params.id).update({
      enabled: params.enabled !== false,
      updateTime: now()
    });
    return ok({}, 'saved');
  },

  async deleteCorrection(id) {
    if (!id) return fail('missing correction id');
    await db.collection(TABLES.corrections).doc(id).remove();
    return ok({}, 'deleted');
  },

  async listCrawlJobs(params = {}) {
    const page = positiveInt(params.page, 1);
    const pageSize = positiveInt(params.pageSize, 10, 50);
    const skip = (page - 1) * pageSize;
    const res = await db.collection(TABLES.crawlJobs).orderBy('createTime', 'desc').skip(skip).limit(pageSize).get();
    const count = await db.collection(TABLES.crawlJobs).count();
    return ok({ list: res.data || [], total: count.total || 0, page, pageSize });
  },

  async crawlWiki(params = {}) {
    const maxPages = Math.min(120, Math.max(1, Number(params.maxPages || 30)));
    const job = {
      status: 'running',
      sourceUrl: WIKI_START_URL,
      maxPages,
      crawledCount: 0,
      savedCount: 0,
      logs: [],
      createTime: now(),
      updateTime: now()
    };
    const jobRes = await db.collection(TABLES.crawlJobs).add(job);
    const jobId = jobRes.id;

    const visited = new Set();
    const queue = [WIKI_START_URL];
    let crawledCount = 0;
    let savedCount = 0;
    const logs = [];

    try {
      while (queue.length && crawledCount < maxPages) {
        const url = queue.shift();
        if (!url || visited.has(url)) continue;
        visited.add(url);

        const html = await requestHtml(url);
        const item = parseWikiPage(url, html);
        crawledCount += 1;

        extractWikiPageLinks(html, maxPages * 2).forEach(link => {
          if (!visited.has(link) && !queue.includes(link) && queue.length < maxPages * 3) {
            queue.push(link);
          }
        });

        if (item.content.length > 80) {
          await upsertKnowledge({
            title: item.title,
            content: item.content,
            sourceUrl: item.sourceUrl,
            category: 'wiki',
            sourceType: 'wiki'
          });
          savedCount += 1;
          logs.push(`saved: ${item.title}`);
        } else {
          logs.push(`skip short: ${url}`);
        }

        if (crawledCount % 10 === 0) {
          await db.collection(TABLES.crawlJobs).doc(jobId).update({
            crawledCount,
            savedCount,
            logs: logs.slice(-50),
            updateTime: now()
          });
        }
      }

      await db.collection(TABLES.crawlJobs).doc(jobId).update({
        status: 'success',
        crawledCount,
        savedCount,
        logs: logs.slice(-50),
        finishTime: now(),
        updateTime: now()
      });
      return ok({ jobId, crawledCount, savedCount }, `crawl finished, saved ${savedCount}`);
    } catch (error) {
      await db.collection(TABLES.crawlJobs).doc(jobId).update({
        status: 'failed',
        crawledCount,
        savedCount,
        logs: logs.concat(error.message || String(error)).slice(-50),
        finishTime: now(),
        updateTime: now()
      });
      return fail(`crawl failed: ${error.message || error}`);
    }
  },

  async crawlStatus(jobId) {
    if (!jobId) return fail('缺少任务 ID');
    const res = await db.collection(TABLES.crawlJobs).doc(jobId).get();
    return ok({ job: res.data && res.data[0] });
  }
};
