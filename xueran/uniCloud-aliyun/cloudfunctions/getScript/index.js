'use strict';
const db = uniCloud.database();
const collectionName = 'scripts';

/**
 * getScript cloud function
 * event: { id }
 */
exports.main = async (event, context) => {
  const { id } = event || {};
  if (!id) return { code: -1, errMsg: 'id required' };
  try {
    const coll = db.collection(collectionName);
    const res = await coll.doc(id).field({
      // 现有字段保持兼容
      title: true,
      author: true,
      version: true,
      likes: true,
      images: true,
      thumbnails: true,
      thumbnail: true,
      createdAt: true,
      _id: true,

      // 新增管理端字段支持
      status: true,
      tags: true,
      category: true,
      description: true,
      content: true,
      updateTime: true,
      usageCount: true,
      fileId: true,
      fileUrl: true,
      fileSize: true,
      mimeType: true
    }).get();
    if (res && res.data && res.data.length) {
      const item = res.data[0];

      // 字段验证和标准化处理
      try {
        // ID字段标准化和验证
        item.id = item._id || item.id;
        if (!item.id) {
          return { code: -1, errMsg: 'Script missing id field' };
        }
        delete item._id;

        // 标题字段验证
        if (!item.title || typeof item.title !== 'string' || item.title.trim().length === 0) {
          item.title = '未命名剧本'; // 默认值
        }
        item.title = item.title.trim();

        // 作者字段验证
        if (!item.author || typeof item.author !== 'string' || item.author.trim().length === 0) {
          item.author = '未知作者'; // 默认值
        }
        item.author = item.author.trim();

        // 状态字段验证
        const validStatuses = ['active', 'inactive', 'published', 'draft', 'archived'];
        if (!item.status || !validStatuses.includes(item.status)) {
          item.status = 'active'; // 默认值
        }

        // 标签字段验证
        if (Array.isArray(item.tags)) {
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

        // 内容字段验证
        if (item.content && typeof item.content !== 'string') {
          try {
            item.content = JSON.stringify(item.content);
          } catch (e) {
            console.warn('Invalid content field for script:', item.id);
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

        return { code: 0, data: [item] };
      } catch (validationError) {
        console.error('Field validation failed for script:', item.id, validationError);
        return { code: -1, errMsg: 'Data validation failed' };
      }
    }
    return { code: 0, data: [] };
  } catch (err) {
    console.error('getScript error', err);
    return { code: -1, errMsg: err.message || err };
  }
};


