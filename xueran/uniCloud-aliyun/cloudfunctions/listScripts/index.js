'use strict';
const db = uniCloud.database();
const collectionName = 'scripts';

/**
 * listScripts cloud function
 * event: { page, pageSize, q, sortBy }
 */
exports.main = async (event, context) => {
  const { page = 1, pageSize = 12, q = '', sortBy = 'createdAt' } = event || {};
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limit = Math.max(1, parseInt(pageSize, 10) || 12);
  const skip = (pageNum - 1) * limit;

  // 调试日志：记录搜索参数
  console.log('=== listScripts Debug Start ===');
  console.log('Event:', JSON.stringify(event, null, 2));
  console.log('Search params:', { page, pageSize, q, sortBy });
  console.log('Processed params:', { pageNum, limit, skip });

  const coll = db.collection(collectionName);
  const where = {};
  let sortByField = sortBy; // 默认排序字段

  if (q && q.trim()) {
    const searchTerm = q.trim();
    console.log('Search term:', searchTerm);
    console.log('Search term length:', searchTerm.length);
    console.log('Search term char codes:', Array.from(searchTerm).map(c => c.charCodeAt(0)));

    // 使用与admin端相同的MongoDB原生查询语法
    where.$or = [
      { title: { $regex: searchTerm, $options: 'i' } }, // 标题匹配
      { author: { $regex: searchTerm, $options: 'i' } }, // 作者匹配
      { description: { $regex: searchTerm, $options: 'i' } } // 描述匹配
    ];

    console.log('Search where condition:', JSON.stringify(where, null, 2));

    // 搜索时使用自定义排序以提高相关度
    sortByField = 'searchRelevance';
  } else {
    console.log('No search term provided');
  }

  try {
    // count total (optional, may be costly)
    const countRes = await coll.where(where).count();
    const total = countRes && countRes.total ? countRes.total : 0;

    console.log('Query count result:', countRes);
    console.log('Total records found:', total);

    // query with projection
    let query = coll.where(where);

    // 如果不是搜索相关度排序，使用普通排序
    if (sortByField !== 'searchRelevance') {
      query = query.orderBy(sortByField, 'desc');
    }

    const res = await query
      .skip(skip)
      .limit(limit)
      .field({
        // 现有字段保持兼容
        title: true,
        author: true,
        version: true,
        likes: true,
        images: true,
        _id: true,
        createdAt: true,

        // 新增管理端字段支持
        status: true,
        tags: true,
        category: true,
        description: true,
        updateTime: true,
        usageCount: true,
        fileSize: true,
        mimeType: true
      })
      .get();

    console.log('Query result:', res);
    console.log('Raw data length:', res && res.data ? res.data.length : 0);

    let data = (res && res.data) ? res.data.map(item => {
      // 字段验证和标准化处理
      try {
        // ID字段标准化和验证
        item.id = item._id || item.id;
        if (!item.id) {
          console.warn('Script missing id field:', item);
          return null; // 跳过无效数据
        }
        delete item._id;

        // 标题字段验证
        if (!item.title || typeof item.title !== 'string' || item.title.trim().length === 0) {
          console.warn('Script missing or invalid title:', item.id);
          item.title = '未命名剧本'; // 默认值
        }
        item.title = item.title.trim();

        // 作者字段验证
        if (!item.author || typeof item.author !== 'string' || item.author.trim().length === 0) {
          console.warn('Script missing or invalid author:', item.id);
          item.author = '未知作者'; // 默认值
        }
        item.author = item.author.trim();

        // 状态字段验证
        const validStatuses = ['active', 'inactive', 'published', 'draft', 'archived'];
        if (!item.status || !validStatuses.includes(item.status)) {
          item.status = 'active'; // 默认值
        }

        // 标签字段验证和转换
        if (Array.isArray(item.tags)) {
          // 过滤无效标签，确保都是字符串且不为空
          item.tags = item.tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0).slice(0, 2);
        } else {
          item.tags = [];
        }

        // 图片字段验证和标准化
        if (Array.isArray(item.thumbnails) && item.thumbnails.length) {
          // thumbnails 优先级最高（管理端标准）
          item.images = item.thumbnails.slice(0, 3);
        } else if (item.thumbnail && typeof item.thumbnail === 'string') {
          item.images = [item.thumbnail];
        } else if (Array.isArray(item.images)) {
          // 处理图片数组，支持字符串和对象格式
          item.images = item.images
            .map(img => {
              if (typeof img === 'string' && img.trim().length > 0) {
                return img;
              } else if (typeof img === 'object' && img !== null) {
                // 支持对象格式：优先使用 url，然后是 fileId
                return img.url || img.fileId || null;
              }
              return null;
            })
            .filter(url => url && typeof url === 'string')
            .slice(0, 3);
        } else {
          item.images = [];
        }

        // 数值字段验证
        item.likes = (typeof item.likes === 'number' && item.likes >= 0) ? item.likes : 0;
        item.usageCount = (typeof item.usageCount === 'number' && item.usageCount >= 0) ? item.usageCount : 0;

        // 字符串字段长度验证
        if (item.description && typeof item.description === 'string') {
          item.description = item.description.trim();
          if (item.description.length > 1000) {
            item.description = item.description.substring(0, 1000) + '...';
          }
        }

        // 时间字段验证
        if (item.createTime && !(item.createTime instanceof Date)) {
          try {
            item.createTime = new Date(item.createTime);
          } catch (e) {
            item.createTime = new Date();
          }
        }
        if (item.updateTime && !(item.updateTime instanceof Date)) {
          try {
            item.updateTime = new Date(item.updateTime);
          } catch (e) {
            item.updateTime = item.createTime || new Date();
          }
        }

        return item;
      } catch (validationError) {
        console.error('Field validation failed for script:', item.id, validationError);
        return null; // 跳过验证失败的数据
      }
    }).filter(item => item !== null) : []; // 过滤掉验证失败的项目

    console.log('Processed data length:', data.length);
    if (data.length > 0) {
      console.log('First few processed items:');
      data.slice(0, 3).forEach((item, index) => {
        console.log(`Item ${index}:`, {
          id: item.id,
          title: item.title,
          author: item.author,
          titleCharCodes: item.title ? Array.from(item.title).map(c => c.charCodeAt(0)) : null,
          authorCharCodes: item.author ? Array.from(item.author).map(c => c.charCodeAt(0)) : null
        });
      });
    }

    // 如果是搜索模式，按相关度排序
    if (q && q.trim() && data.length > 0) {
      const searchTerm = q.trim().toLowerCase();

      data.sort((a, b) => {
        const aTitle = (a.title || '').toLowerCase();
        const bTitle = (b.title || '').toLowerCase();
        const aAuthor = (a.author || '').toLowerCase();
        const bAuthor = (b.author || '').toLowerCase();

        // 计算相关度分数（越高越相关）
        const getRelevanceScore = (item) => {
          const title = (item.title || '').toLowerCase();
          const author = (item.author || '').toLowerCase();

          // 标题完全匹配得分最高
          if (title === searchTerm) return 100;
          // 标题开头匹配
          if (title.startsWith(searchTerm)) return 80;
          // 标题包含匹配
          if (title.includes(searchTerm)) return 60;
          // 作者匹配
          if (author.includes(searchTerm)) return 40;
          // 作者开头匹配
          if (author.startsWith(searchTerm)) return 20;
          return 0;
        };

        const scoreA = getRelevanceScore(a);
        const scoreB = getRelevanceScore(b);

        // 相关度相同的按时间倒序
        if (scoreA === scoreB) {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }

        return scoreB - scoreA; // 相关度高的排前面
      });
    }

    return { code: 0, data, total };
  } catch (err) {
    console.error('listScripts error', err);
    return { code: -1, errMsg: err.message || err };
  }
};


