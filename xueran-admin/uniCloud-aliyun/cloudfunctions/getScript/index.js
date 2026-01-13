'use strict';
const db = uniCloud.database();
const collectionName = 'scripts';

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
      try {
        const item = res.data[0];

        // defensive sanitization: convert RegExp or DB regex-like objects into safe strings
        function sanitizeValue(value) {
          const t = Object.prototype.toString.call(value);
          if (t === '[object RegExp]') {
            try { return value.toString(); } catch (e) { return String(value); }
          }
          if (Array.isArray(value)) {
            return value.map(v => sanitizeValue(v));
          }
          if (value && typeof value === 'object') {
            // common Mongo/DB representations
            if (typeof value.$regex === 'string') {
              const opts = typeof value.$options === 'string' ? value.$options : '';
              return `/${value.$regex}/${opts}`;
            }
            if (value.$regularExpression && typeof value.$regularExpression === 'object') {
              const p = value.$regularExpression.pattern || '';
              const o = value.$regularExpression.options || '';
              return `/${p}/${o}`;
            }
            const out = {};
            Object.keys(value).forEach(k => {
              try { out[k] = sanitizeValue(value[k]); } catch (e) { out[k] = String(value[k]); }
            });
            return out;
          }
          return value;
        }

        const sanitized = sanitizeValue(item);
        sanitized.id = sanitized._id || sanitized.id;
        sanitized.jsonFile = sanitized.jsonFile || null;
        if (Array.isArray(sanitized.images)) {
          sanitized.images = sanitized.images.map(img => {
            if (!img) return null;
            let url = null;
            if (typeof img === 'string') url = img;
            if (typeof img === 'object') {
              url = img.url || img.fileId || img.fileID || img.id || null;
            }
            if (typeof url === 'string') {
              url = url.trim().replace(/[.\s]+$/g, '');
              if (!/^https?:\/\//i.test(url)) {
                url = 'https://' + url.replace(/^\/\//, '');
              }
              return url;
            }
            return null;
          }).filter(Boolean);
        } else {
          sanitized.images = [];
        }
        delete sanitized._id;
        return { code: 0, data: [sanitized] };
      } catch (innerErr) {
        console.error('getScript: sanitize/format error', innerErr, { id, rawData: res && res.data && res.data[0] });
        throw innerErr;
      }
    }

    return { code: 0, data: [] };
  } catch (err) {
    console.error('getScript error', err);
    return { code: -1, errMsg: err.message || err };
  }
};