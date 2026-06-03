'use strict';

const db = uniCloud.database();

const TABLES = {
  sessions: 'auth-sessions',
  users: 'app-users',
  questions: 'exam-questions',
  favorites: 'exam-question-favorites',
  records: 'exam-records'
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

function cleanText(value, max = 1000) {
  return String(value || '').trim().slice(0, max);
}

function toLevel(value) {
  const level = Number(value);
  return level === 2 ? 2 : 1;
}

function toQuestionType(value) {
  return value === 'judge' ? 'judge' : 'choice';
}

async function verifyToken(token) {
  if (!token) return null;
  const sessionResult = await db.collection(TABLES.sessions).where({ token }).limit(1).get();
  const session = sessionResult.data && sessionResult.data[0];
  if (!session || (session.expireTime && session.expireTime <= now())) return null;
  const userResult = await db.collection(TABLES.users).doc(session.userId).get();
  const user = userResult.data && userResult.data[0];
  if (!user || user.status === 'disabled') return null;
  return { session, user };
}

function normalizeImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .map(image => {
      if (typeof image === 'string') return image;
      if (image && typeof image === 'object') return image.url || image.fileID || image.fileId || '';
      return '';
    })
    .filter(Boolean)
    .slice(0, 3);
}

function normalizeOptions(type, options) {
  if (type === 'judge') {
    return [
      { key: 'true', text: '正确' },
      { key: 'false', text: '错误' }
    ];
  }
  const list = Array.isArray(options) ? options : [];
  const normalized = list
    .map((item, index) => ({
      key: cleanText(item && item.key ? item.key : String.fromCharCode(65 + index), 4).toUpperCase(),
      text: cleanText(item && item.text, 300)
    }))
    .filter(item => item.key && item.text)
    .slice(0, 8);
  return normalized.length ? normalized : [
    { key: 'A', text: '' },
    { key: 'B', text: '' },
    { key: 'C', text: '' },
    { key: 'D', text: '' }
  ];
}

function normalizeAnswer(type, answer) {
  const text = cleanText(answer, 40);
  if (type === 'judge') {
    return ['true', '正确', '对', 'yes', '1'].includes(text) ? 'true' : 'false';
  }
  return text.toUpperCase();
}

function buildQuestionDoc(params = {}, userId) {
  const type = toQuestionType(params.type);
  const title = cleanText(params.title, 1000);
  const rawAnswer = params.answer === false ? 'false' : cleanText(params.answer, 40);
  const answer = normalizeAnswer(type, rawAnswer);
  const options = normalizeOptions(type, params.options);
  if (!title) return { error: '请输入题干' };
  if (!rawAnswer) return { error: '请输入答案' };
  if (type === 'choice' && !options.some(item => item.key === answer)) return { error: '选择题答案必须匹配选项' };
  return {
    doc: {
      userId,
      level: toLevel(params.level),
      type,
      title,
      images: normalizeImages(params.images),
      options,
      answer,
      explanation: cleanText(params.explanation, 1000),
      status: 'active',
      updateTime: now()
    }
  };
}

function publicQuestion(question, favoriteIds = new Set(), includeAnswer = false) {
  const item = {
    id: question._id,
    level: question.level || 1,
    type: question.type || 'choice',
    title: question.title || '',
    images: normalizeImages(question.images),
    options: Array.isArray(question.options) ? question.options : [],
    explanation: question.explanation || '',
    isFavorite: favoriteIds.has(question._id),
    createTime: question.createTime || 0,
    updateTime: question.updateTime || 0
  };
  if (includeAnswer) item.answer = question.answer || '';
  return item;
}

async function getOwnedQuestion(id, userId) {
  const questionId = cleanText(id, 80);
  if (!questionId) return null;
  const res = await db.collection(TABLES.questions).doc(questionId).get();
  const question = res.data && res.data[0];
  if (!question || question.userId !== userId) return null;
  return question;
}

async function getFavoriteIdSet(userId, questionIds) {
  if (!questionIds.length) return new Set();
  const res = await db.collection(TABLES.favorites)
    .where({ userId, questionId: db.command.in(questionIds) })
    .get();
  return new Set((res.data || []).map(item => item.questionId));
}

function shuffle(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

module.exports = {
  async getQuestions(params = {}) {
    const auth = await verifyToken(params.token);
    if (!auth) return fail('请先登录');
    const page = Math.max(1, Number(params.page || 1));
    const pageSize = Math.min(50, Math.max(1, Number(params.pageSize || 10)));
    const keyword = cleanText(params.keyword, 80);
    const query = { userId: auth.user._id };
    if (params.level) query.level = toLevel(params.level);
    if (params.type) query.type = toQuestionType(params.type);
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { explanation: { $regex: keyword, $options: 'i' } }
      ];
    }
    const res = await db.collection(TABLES.questions)
      .where(query)
      .orderBy('updateTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();
    const count = await db.collection(TABLES.questions).where(query).count();
    const ids = (res.data || []).map(item => item._id);
    const favorites = await getFavoriteIdSet(auth.user._id, ids);
    return ok({
      list: (res.data || []).map(item => publicQuestion(item, favorites, true)),
      total: count.total || 0,
      page,
      pageSize
    });
  },

  async getQuestion(params = {}) {
    const auth = await verifyToken(params.token);
    if (!auth) return fail('请先登录');
    const question = await getOwnedQuestion(params.id, auth.user._id);
    if (!question) return fail('题目不存在');
    return ok({ item: publicQuestion(question, new Set(), true) });
  },

  async saveQuestion(params = {}) {
    const auth = await verifyToken(params.token);
    if (!auth) return fail('请先登录');
    const built = buildQuestionDoc(params, auth.user._id);
    if (built.error) return fail(built.error);
    const doc = built.doc;

    const id = cleanText(params.id, 80);
    if (id) {
      const existed = await getOwnedQuestion(id, auth.user._id);
      if (!existed) return fail('题目不存在');
      await db.collection(TABLES.questions).doc(existed._id).update(doc);
      return ok({ id: existed._id }, '保存成功');
    }

    doc.createTime = now();
    const result = await db.collection(TABLES.questions).add(doc);
    return ok({ id: result.id }, '新增成功');
  },

  async importQuestions(params = {}) {
    const auth = await verifyToken(params.token);
    if (!auth) return fail('请先登录');
    const questions = Array.isArray(params.questions) ? params.questions.slice(0, 200) : [];
    if (!questions.length) return fail('请提供题目 JSON 数组');
    const failed = [];
    let imported = 0;
    for (let i = 0; i < questions.length; i++) {
      const built = buildQuestionDoc(questions[i], auth.user._id);
      if (built.error) {
        failed.push({ index: i + 1, message: built.error });
        continue;
      }
      built.doc.createTime = now();
      await db.collection(TABLES.questions).add(built.doc);
      imported += 1;
    }
    return ok({ imported, failed }, failed.length ? '部分导入成功' : '导入成功');
  },

  async deleteQuestion(params = {}) {
    const auth = await verifyToken(params.token);
    if (!auth) return fail('请先登录');
    const existed = await getOwnedQuestion(params.id, auth.user._id);
    if (!existed) return fail('题目不存在');
    await db.collection(TABLES.questions).doc(existed._id).remove();
    const favRes = await db.collection(TABLES.favorites)
      .where({ userId: auth.user._id, questionId: existed._id })
      .get();
    for (const fav of favRes.data || []) {
      await db.collection(TABLES.favorites).doc(fav._id).remove();
    }
    return ok({}, '删除成功');
  },

  async deleteQuestions(params = {}) {
    const auth = await verifyToken(params.token);
    if (!auth) return fail('请先登录');
    const ids = Array.isArray(params.ids)
      ? params.ids.map(id => cleanText(id, 80)).filter(Boolean).slice(0, 100)
      : [];
    if (!ids.length) return fail('请选择要删除的题目');

    const res = await db.collection(TABLES.questions)
      .where({ userId: auth.user._id, _id: db.command.in(ids) })
      .get();
    const ownedIds = (res.data || []).map(item => item._id);
    for (const id of ownedIds) {
      await db.collection(TABLES.questions).doc(id).remove();
    }

    if (ownedIds.length) {
      const favRes = await db.collection(TABLES.favorites)
        .where({ userId: auth.user._id, questionId: db.command.in(ownedIds) })
        .get();
      for (const fav of favRes.data || []) {
        await db.collection(TABLES.favorites).doc(fav._id).remove();
      }
    }

    return ok({ deleted: ownedIds.length }, '删除成功');
  },

  async toggleFavorite(params = {}) {
    const auth = await verifyToken(params.token);
    if (!auth) return fail('请先登录');
    const question = await getOwnedQuestion(params.id, auth.user._id);
    if (!question) return fail('题目不存在');
    const res = await db.collection(TABLES.favorites)
      .where({ userId: auth.user._id, questionId: question._id })
      .limit(1)
      .get();
    const existed = res.data && res.data[0];
    if (existed) {
      await db.collection(TABLES.favorites).doc(existed._id).remove();
      return ok({ isFavorite: false }, '已取消收藏');
    }
    await db.collection(TABLES.favorites).add({ userId: auth.user._id, questionId: question._id, createTime: now() });
    return ok({ isFavorite: true }, '已收藏');
  },

  async getPracticeQuestions(params = {}) {
    const auth = await verifyToken(params.token);
    if (!auth) return fail('请先登录');
    const limit = Math.min(100, Math.max(1, Number(params.limit || 20)));
    const favoriteOnly = !!params.favoriteOnly;
    let questionIds = [];
    if (favoriteOnly) {
      const favRes = await db.collection(TABLES.favorites).where({ userId: auth.user._id }).limit(500).get();
      questionIds = (favRes.data || []).map(item => item.questionId).filter(Boolean);
      if (!questionIds.length) return ok({ list: [] });
    }
    const query = { userId: auth.user._id, status: 'active' };
    if (!favoriteOnly) query.level = toLevel(params.level);
    if (favoriteOnly) query._id = db.command.in(questionIds);
    const res = await db.collection(TABLES.questions).where(query).limit(500).get();
    const rows = shuffle(res.data || []).slice(0, limit);
    const favorites = await getFavoriteIdSet(auth.user._id, rows.map(item => item._id));
    return ok({ list: rows.map(item => publicQuestion(item, favorites, false)) });
  },

  async checkPracticeAnswer(params = {}) {
    const auth = await verifyToken(params.token);
    if (!auth) return fail('请先登录');
    const question = await getOwnedQuestion(params.questionId || params.id, auth.user._id);
    if (!question || question.status !== 'active') return fail('题目不存在');
    const userAnswer = normalizeAnswer(question.type, params.answer);
    const isCorrect = userAnswer === question.answer;
    return ok({
      isCorrect,
      userAnswer,
      correctAnswer: question.answer,
      explanation: question.explanation || ''
    });
  },

  async createExam(params = {}) {
    const auth = await verifyToken(params.token);
    if (!auth) return fail('请先登录');
    const level = toLevel(params.level);
    const questionCount = Math.min(100, Math.max(1, Number(params.questionCount || 10)));
    const scorePerQuestion = Math.min(100, Math.max(1, Number(params.scorePerQuestion || 10)));
    const res = await db.collection(TABLES.questions)
      .where({ userId: auth.user._id, level, status: 'active' })
      .limit(500)
      .get();
    const rows = shuffle(res.data || []).slice(0, questionCount);
    if (!rows.length) return fail('当前星级还没有题目');
    const favorites = await getFavoriteIdSet(auth.user._id, rows.map(item => item._id));
    return ok({
      level,
      questionCount: rows.length,
      scorePerQuestion,
      totalScore: rows.length * scorePerQuestion,
      durationSeconds: 3600,
      startedAt: now(),
      questions: rows.map(item => publicQuestion(item, favorites, false))
    });
  },

  async submitExam(params = {}) {
    const auth = await verifyToken(params.token);
    if (!auth) return fail('请先登录');
    const level = toLevel(params.level);
    const scorePerQuestion = Math.min(100, Math.max(1, Number(params.scorePerQuestion || 10)));
    const answers = Array.isArray(params.answers) ? params.answers : [];
    const ids = answers.map(item => cleanText(item.questionId, 80)).filter(Boolean);
    if (!ids.length) return fail('没有可提交的答案');
    const res = await db.collection(TABLES.questions)
      .where({ userId: auth.user._id, _id: db.command.in(ids) })
      .get();
    const questionMap = {};
    (res.data || []).forEach(item => { questionMap[item._id] = item; });
    let correctCount = 0;
    const answerDetails = answers.map(item => {
      const question = questionMap[item.questionId];
      const userAnswer = normalizeAnswer(question ? question.type : 'choice', item.answer);
      const correctAnswer = question ? question.answer : '';
      const isCorrect = !!question && userAnswer === correctAnswer;
      if (isCorrect) correctCount += 1;
      return {
        questionId: item.questionId,
        title: question ? question.title : '',
        type: question ? question.type : 'choice',
        level: question ? question.level : level,
        images: question ? normalizeImages(question.images) : [],
        options: question && Array.isArray(question.options) ? question.options : [],
        explanation: question ? question.explanation || '' : '',
        userAnswer,
        correctAnswer,
        isCorrect,
        score: isCorrect ? scorePerQuestion : 0
      };
    });
    const score = correctCount * scorePerQuestion;
    const record = {
      userId: auth.user._id,
      level,
      questionCount: answerDetails.length,
      scorePerQuestion,
      totalScore: answerDetails.length * scorePerQuestion,
      score,
      correctCount,
      wrongCount: answerDetails.length - correctCount,
      durationSeconds: Math.max(0, Math.min(3600, Number(params.durationSeconds || 0))),
      answers: answerDetails,
      createTime: now()
    };
    const addResult = await db.collection(TABLES.records).add(record);
    return ok({ id: addResult.id, record }, '交卷成功');
  },

  async getRecords(params = {}) {
    const auth = await verifyToken(params.token);
    if (!auth) return fail('请先登录');
    const page = Math.max(1, Number(params.page || 1));
    const pageSize = Math.min(50, Math.max(1, Number(params.pageSize || 10)));
    const keyword = cleanText(params.keyword, 80);
    const query = { userId: auth.user._id };
    if (params.level) query.level = toLevel(params.level);
    if (keyword) {
      query.$or = [
        { score: Number(keyword) || -1 },
        { correctCount: Number(keyword) || -1 }
      ];
    }
    const res = await db.collection(TABLES.records)
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();
    const count = await db.collection(TABLES.records).where(query).count();
    return ok({ list: res.data || [], total: count.total || 0, page, pageSize });
  },

  async getRecord(params = {}) {
    const auth = await verifyToken(params.token);
    if (!auth) return fail('请先登录');
    const id = cleanText(params.id, 80);
    const res = await db.collection(TABLES.records).doc(id).get();
    const record = res.data && res.data[0];
    if (!record || record.userId !== auth.user._id) return fail('记录不存在');
    return ok({ record });
  },

  async deleteRecord(params = {}) {
    const auth = await verifyToken(params.token);
    if (!auth) return fail('请先登录');
    const id = cleanText(params.id, 80);
    const res = await db.collection(TABLES.records).doc(id).get();
    const record = res.data && res.data[0];
    if (!record || record.userId !== auth.user._id) return fail('记录不存在');
    await db.collection(TABLES.records).doc(record._id).remove();
    return ok({}, '删除成功');
  }
};
