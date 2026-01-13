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
      title: true,
      author: true,
      version: true,
      likes: true,
      images: true,
      thumbnails: true,
      thumbnail: true,
      createdAt: true,
      _id: true
    }).get();
    if (res && res.data && res.data.length) {
      const item = res.data[0];
      item.id = item._id || item.id;
      delete item._id;
      return { code: 0, data: [item] };
    }
    return { code: 0, data: [] };
  } catch (err) {
    console.error('getScript error', err);
    return { code: -1, errMsg: err.message || err };
  }
};


