'use strict';
const db = uniCloud.database();
const collectionName = 'scripts';

async function createScript(event) {
  const { payload = {}, jsonFileId = null, jsonContent = null, imageFileIds = [], thumbnails = [] } = event;
  const now = Date.now();
  const doc = {
    title: payload.title || '',
    author: payload.author || '',
    version: payload.version || '',
    updateTime: payload.updateTime || now,
    description: payload.description || '',
    playerCount: payload.playerCount || '',
    difficulty: payload.difficulty || '',
    usageCount: payload.usageCount || 0,
    tag: payload.tag || '',
    likes: payload.likes || 0,
    jsonFile: jsonFileId ? { fileId: jsonFileId } : null,
    jsonContent: jsonContent || null,
    images: Array.isArray(imageFileIds) ? imageFileIds.map(id => ({ fileId: id })) : [],
    thumbnails: Array.isArray(thumbnails) ? thumbnails.map(id => ({ fileId: id })) : [],
    createdAt: now,
    updatedAt: now
  };
  const coll = db.collection(collectionName);
  const res = await coll.add(doc);
  if (res && res.id) return { code: 0, id: res.id };
  return { code: -1, errMsg: 'insert failed' };
}

async function updateScript(event) {
  const { id, payload = {}, jsonFileId, jsonContent, imageFileIds, thumbnails, removeFileIds = [] } = event;
  if (!id) return { code: -1, errMsg: 'id required' };
  const coll = db.collection(collectionName);
  const updateDoc = {
    ...payload,
    updatedAt: Date.now()
  };
  if (typeof jsonFileId !== 'undefined') updateDoc.jsonFile = jsonFileId ? { fileId: jsonFileId } : null;
  if (typeof jsonContent !== 'undefined') updateDoc.jsonContent = jsonContent ? jsonContent : null;
  if (Array.isArray(imageFileIds)) updateDoc.images = imageFileIds.map(fid => ({ fileId: fid }));
  if (Array.isArray(thumbnails)) updateDoc.thumbnails = thumbnails.map(fid => ({ fileId: fid }));
  const res = await coll.doc(id).update(updateDoc);
  if (Array.isArray(removeFileIds) && removeFileIds.length) {
    try {
      await uniCloud.deleteFile({ fileList: removeFileIds });
    } catch (e) {
      console.warn('delete old files warning', e);
    }
  }
  return { code: 0, updated: res };
}

async function deleteScript(event) {
  const { id } = event || {};
  if (!id) return { code: -1, errMsg: 'id required' };
  const coll = db.collection(collectionName);
  const getRes = await coll.doc(id).get();
  const data = (getRes && getRes.data && getRes.data[0]) ? getRes.data[0] : null;
  const fileList = [];
  if (data) {
    if (data.jsonFile && data.jsonFile.fileId) fileList.push(data.jsonFile.fileId);
    if (Array.isArray(data.images)) data.images.forEach(i => i.fileId && fileList.push(i.fileId));
    if (Array.isArray(data.thumbnails)) data.thumbnails.forEach(t => t.fileId && fileList.push(t.fileId));
  }
  await coll.doc(id).remove();
  if (fileList.length) {
    try {
      await uniCloud.deleteFile({ fileList });
    } catch (e) {
      console.warn('delete files warning', e);
    }
  }
  return { code: 0 };
}

exports.main = async (event, context) => {
  const action = (event && event.action) ? event.action.toLowerCase() : '';
  try {
    if (action === 'create') return await createScript(event);
    if (action === 'update') return await updateScript(event);
    if (action === 'delete') return await deleteScript(event);
    return { code: -1, errMsg: 'unknown action' };
  } catch (err) {
    console.error('adminScript error', err);
    return { code: -1, errMsg: err.message || err };
  }
};


