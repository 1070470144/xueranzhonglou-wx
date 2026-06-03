import { getAuthToken, requireLogin } from './auth.js';

const examService = uniCloud.importObject('exam-service');

function normalize(result) {
  return result || { success: false, message: '服务无响应' };
}

function withToken(params = {}, redirectUrl = '/pages/profile/profile') {
  const token = getAuthToken();
  if (!token) {
    requireLogin(redirectUrl);
  }
  return { ...params, token };
}

export const getExamQuestions = async params => normalize(await examService.getQuestions(withToken(params, '/pages/exam-config/exam-config')));
export const getExamQuestion = async id => normalize(await examService.getQuestion(withToken({ id }, '/pages/exam-config/exam-config')));
export const saveExamQuestion = async params => normalize(await examService.saveQuestion(withToken(params, '/pages/exam-config/exam-config')));
export const importExamQuestions = async questions => normalize(await examService.importQuestions(withToken({ questions }, '/pages/exam-config/exam-config')));
export const deleteExamQuestion = async id => normalize(await examService.deleteQuestion(withToken({ id }, '/pages/exam-config/exam-config')));
export const deleteExamQuestions = async ids => normalize(await examService.deleteQuestions(withToken({ ids }, '/pages/exam-config/exam-config')));
export const getPracticeQuestions = async params => normalize(await examService.getPracticeQuestions(withToken(params, '/pages/tool-practice/tool-practice')));
export const checkPracticeAnswer = async params => normalize(await examService.checkPracticeAnswer(withToken(params, '/pages/tool-practice/tool-practice')));
export const toggleExamQuestionFavorite = async id => normalize(await examService.toggleFavorite(withToken({ id }, '/pages/tool-practice/tool-practice')));
export const createExam = async params => normalize(await examService.createExam(withToken(params, '/pages/tool-exam/tool-exam')));
export const submitExam = async params => normalize(await examService.submitExam(withToken(params, '/pages/tool-exam/tool-exam')));
export const getExamRecords = async params => normalize(await examService.getRecords(withToken(params, '/pages/exam-records/exam-records')));
export const getExamRecord = async id => normalize(await examService.getRecord(withToken({ id }, '/pages/exam-records/exam-records')));
export const deleteExamRecord = async id => normalize(await examService.deleteRecord(withToken({ id }, '/pages/exam-records/exam-records')));
