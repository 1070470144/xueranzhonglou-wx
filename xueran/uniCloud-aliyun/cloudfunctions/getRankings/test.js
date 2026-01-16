'use strict';

/**
 * 简单的测试云函数，用于验证云函数调用是否正常
 */
exports.main = async (event, context) => {
  console.log('Test cloud function called with:', event);

  return {
    success: true,
    message: 'Test function works!',
    data: [
      {
        rank: 1,
        scriptId: 'test_001',
        title: '测试剧本1',
        author: '测试作者',
        value: 100
      }
    ],
    totalCount: 1,
    lastUpdated: new Date().toISOString()
  };
};