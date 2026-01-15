'use strict';

/**
 * getScriptJson 云函数 - 公开接口，供血染钟楼客户端直接使用
 * 返回纯JSON格式的剧本数据，可直接在游戏中导入
 * 支持 download=true 参数：返回带下载头的响应，使浏览器下载为.json文件
 */
exports.main = async (event, context) => {
  // 处理OPTIONS预检请求
  if (event.httpMethod === 'OPTIONS' || (event.headers && event.headers['access-control-request-method'])) {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Vary': 'Origin',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }
  // 统一 CORS 头与响应包装器
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json; charset=utf-8',
    // 指示浏览器以内联方式显示（而非 attachment 下载）
    'Content-Disposition': 'inline; filename="script.json"'
  };

  function respond(payload, statusCode = 200) {
    // 如果是 HTTP 触发（存在 httpMethod），返回带 headers 的 HTTP 响应结构
    if (event && event.httpMethod) {
      return {
        statusCode,
        headers: CORS_HEADERS,
        body: (typeof payload === 'string') ? payload : JSON.stringify(payload)
      };
    }
    // 非 HTTP 调用（内部调用/其他触发器），保持原有返回格式
    return payload;
  }

  // 支持多种触发器传参形式：event.scriptId, event.id, event.query.scriptId, event.params[0]
  let scriptId = null;
  let download = false;
  let link = false;
  try {
    // 检查是否需要下载模式（返回文件下载响应）
    download = (event && (event.download === 'true' || event.download === true)) ||
               (event && event.query && (event.query.download === 'true' || event.query.download === true)) ||
               (event && event.queryStringParameters && (event.queryStringParameters.download === 'true' || event.queryStringParameters.download === true)) ||
               false;

    // 检查是否需要生成浏览器直接访问的data URL链接
    link = (event && (event.link === 'true' || event.link === true)) ||
           (event && event.query && (event.query.link === 'true' || event.query.link === true)) ||
           (event && event.queryStringParameters && (event.queryStringParameters.link === 'true' || event.queryStringParameters.link === true)) ||
           false;

    // common top-level
    scriptId = (event && (event.scriptId || event.id)) || null;
    // common query wrapper used by some HTTP triggers: event.query or event.args.queryStringParameters
    if (!scriptId && event && event.query) {
      scriptId = event.query.scriptId || event.query.id || null;
    }
    // some platforms put queryStringParameters at top-level or under event.args
    if (!scriptId && event && event.queryStringParameters) {
      scriptId = event.queryStringParameters.scriptId || event.queryStringParameters.id || null;
    }
    if (!scriptId && event && event.args && event.args.queryStringParameters) {
      scriptId = event.args.queryStringParameters.scriptId || event.args.queryStringParameters.id || null;
    }
    // older style params array
    if (!scriptId && event && event.params && event.params.length) {
      scriptId = event.params[0] || null;
    }
  } catch (e) {
    scriptId = null;
    download = false;
  }

  if (!scriptId) {
    // 返回错误信息并附带接收到的 event（仅用于调试）
    return respond({
      error: 'Missing scriptId parameter',
      message: '剧本ID不能为空',
      parsedScriptId: scriptId,
      debugEvent: event || null
    }, 400);
  }

  try {
    const db = uniCloud.database();

    // 获取剧本的content字段
    const scriptResult = await db.collection('scripts')
      .doc(scriptId)
      .field({
        content: true,
        status: true
      })
      .get();

    if (!scriptResult.data || scriptResult.data.length === 0) {
      return respond({
        error: 'Script not found',
        message: '剧本不存在'
      }, 404);
    }

    const script = scriptResult.data[0];

    // 检查剧本状态
    if (script.status !== 'active' && script.status !== 'published') {
      return respond({
        error: 'Script not available',
        message: '剧本不可用'
      }, 403);
    }

    // 解析并返回JSON数据
    if (script.content) {
      try {
        let jsonData = null;

        // 辅助：解码常见 HTML 实体
        function decodeHtmlEntities(str) {
          return str.replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'");
        }

        // 如果content是对象，直接使用
        if (typeof script.content === 'object') {
          jsonData = script.content;
        } else if (typeof script.content === 'string') {
          const raw = script.content.trim();
          // 尝试直接解析
          try {
            jsonData = JSON.parse(raw);
          } catch (e1) {
            // 尝试解码 HTML 实体 后重新解析
            try {
              const decoded = decodeHtmlEntities(raw);
              jsonData = JSON.parse(decoded);
            } catch (e2) {
              // 尝试提取第一个 JSON 数组子串（如果 content 中包含其他文本）
              try {
                const firstBracket = raw.indexOf('[');
                const lastBracket = raw.lastIndexOf(']');
                if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
                  const arrStr = raw.substring(firstBracket, lastBracket + 1);
                  jsonData = JSON.parse(arrStr);
                } else {
                  throw e2;
                }
              } catch (e3) {
                  console.error('All parse attempts failed for script.content', { scriptId, e1, e2, e3 });
                return respond({
                  error: 'Parse error',
                  message: '剧本数据解析失败，内容可能不是标准 JSON',
                  detail: { snippet: String(raw).slice(0, 100) }
                }, 400);
              }
            }
          }
        } else {
          return respond({
            error: 'Invalid content format',
            message: '剧本数据格式错误'
          }, 400);
        }

        // 根据download参数决定返回格式
        let resultData = null;
        if (Array.isArray(jsonData)) {
          resultData = jsonData;
        } else if (jsonData && Array.isArray(jsonData.roles)) {
          resultData = jsonData.roles;
        } else if (jsonData && Array.isArray(jsonData.content)) {
          resultData = jsonData.content;
        } else {
          // 不是典型数组格式，仍返回解析后的数据（客户端需能处理）
          resultData = jsonData;
        }

        // 如果是下载模式，尝试设置下载头（但uniCloud URL化可能不支持）
        if (download) {
          // 由于uniCloud URL化可能不支持自定义Content-Disposition
          // 我们简单返回数据，希望前端或浏览器能处理
          // 为了兼容各种浏览器和中间代理：当请求带 download=true 时，
          // 返回一个简单的 HTML 页面并将 JSON 放入 <pre> 中，保证浏览器直接显示。
          if (event && event.httpMethod) {
            function escapeHtml(str) {
              return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
            }
            const pretty = Array.isArray(resultData) || typeof resultData === 'object'
              ? JSON.stringify(resultData, null, 2)
              : String(resultData);
            const html = '<!doctype html><meta charset="utf-8"><title>script.json</title><style>body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;}pre{white-space:pre-wrap;word-break:break-word;}</style><pre>' + escapeHtml(pretty) + '</pre>';
            const htmlHeaders = Object.assign({}, CORS_HEADERS, { 'Content-Type': 'text/html; charset=utf-8' });
            return {
              statusCode: 200,
              headers: htmlHeaders,
              body: html
            };
          }
          return resultData;
        }

        // 如果是链接模式，返回浏览器可直接访问的data URL
        if (link) {
          // 生成浏览器可直接访问的data URL
          const jsonString = JSON.stringify(resultData, null, 2);
          const base64Data = Buffer.from(jsonString, 'utf8').toString('base64');
          const dataUrl = `data:application/json;charset=utf-8;base64,${base64Data}`;

          return respond({
            jsonUrl: dataUrl,
            format: 'pretty'
          }, 200);
        }

        // 直接返回JSON数据（给官方客户端使用）
        return respond(resultData, 200);
        } catch (finalErr) {
          console.error('Final parse error for script.content', finalErr);
          return respond({
            error: 'Parse error',
            message: '剧本数据解析失败（最终）'
          }, 500);
        }
    } else {
      return respond({
        error: 'No content',
        message: '剧本无内容数据'
      }, 404);
    }

  } catch (error) {
    console.error('Get script JSON error:', error);
    return respond({
      error: 'Server error',
      message: '服务器错误'
    }, 500);
  }
};