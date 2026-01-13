'use strict';
const db = uniCloud.database();
const collectionName = 'scripts';

/**
 * listScripts cloud function (admin copy)
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
    const countRes = await coll.where(where).count();
    const total = countRes && countRes.total ? countRes.total : 0;

    const res = await coll.where(where)
      .orderBy(sortBy, 'desc')
      .skip(skip)
      .limit(limit)
      .field({
        title: true,
        author: true,
        version: true,
        likes: true,
        images: true,
        _id: true,
        createdAt: true
      })
      .get();

    const data = (res && res.data) ? res.data.map(item => {
      item.id = item._id || item.id;
      delete item._id;
      if (Array.isArray(item.thumbnails) && item.thumbnails.length) {
        item.images = item.thumbnails.slice(0, 3);
      } else if (item.thumbnail) {
        item.images = [item.thumbnail];
      } else if (Array.isArray(item.images)) {
        item.images = item.images.slice(0, 3);
      } else {
        item.images = [];
      }
      return item;
    }) : [];

    return { code: 0, data, total };
  } catch (err) {
    console.error('listScripts error', err);
    return { code: -1, errMsg: err.message || err };
  }
};

