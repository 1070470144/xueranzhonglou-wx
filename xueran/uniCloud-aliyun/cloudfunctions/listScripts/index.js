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

  const coll = db.collection(collectionName);
  const where = {};
  if (q && q.trim()) {
    const regex = new RegExp(q.trim(), 'i');
    where.$or = [
      { title: regex },
      { author: regex }
    ];
  }

  try {
    // count total (optional, may be costly)
    const countRes = await coll.where(where).count();
    const total = countRes && countRes.total ? countRes.total : 0;

    // query with projection
    const res = await coll.where(where)
      .orderBy(sortBy, 'desc')
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

    const data = (res && res.data) ? res.data.map(item => {
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
          item.images = item.thumbnails.slice(0, 3);
        } else if (item.thumbnail && typeof item.thumbnail === 'string') {
          item.images = [item.thumbnail];
        } else if (Array.isArray(item.images)) {
          item.images = item.images
            .filter(img => typeof img === 'string' && img.trim().length > 0)
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

    return { code: 0, data, total };
  } catch (err) {
    console.error('listScripts error', err);
    return { code: -1, errMsg: err.message || err };
  }
};


