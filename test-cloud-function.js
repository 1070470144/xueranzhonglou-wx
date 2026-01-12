// 测试云函数
const service = require('./xueran/uniCloud-aliyun/cloudfunctions/script-service/');

async function test() {
  try {
    const result = await service.main({
      method: 'getScriptList',
      params: [{ page: 1, pageSize: 5 }]
    });
    console.log('Test result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

test();
