'use strict';
const db = uniCloud.database();
const collectionName = 'scripts';

/**
 * getScript cloud function (admin copy)
 * event: { id }
 */
exports.main = async (event, context) => {
  const { id } = event || {};
  if (!id) return { code: -1, errMsg: 'id required' };
  try {
    const coll = db.collection(collectionName);
    const res = await coll.doc(id).field({
      title: true,
      author: true,
      version: true,
      likes: true,
      images: true,
      thumbnails: true,
      thumbnail: true,
      jsonFile: true,
      updateTime: true,
      createdAt: true,
      _id: true
    }).get();
    if (res && res.data && res.data.length) {
      const item = res.data[0];
      item.id = item._id || item.id;
      // ensure jsonFile field exists for older records
      item.jsonFile = item.jsonFile || null;
      // normalize images: keep as array of strings or empty array
      if (Array.isArray(item.images)) {
        item.images = item.images.map(img => (typeof img === 'object' && img.url) ? img.url : (typeof img === 'string' ? img : null)).filter(Boolean);
      } else {
        item.images = [];
      }
      delete item._id;
      return { code: 0, data: [item] };
    }
    return { code: 0, data: [] };
  } catch (err) {
    console.error('getScript error', err);
    return { code: -1, errMsg: err.message || err };
  }
};

