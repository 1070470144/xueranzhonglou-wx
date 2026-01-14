'use strict'

/**
 * Simple logging helper for cloudfunctions.
 * Writes to console and optionally persists audit logs to DB.
 */
const db = uniCloud.database()

function logInfo(message, meta = {}) {
  try {
    console.log('[INFO]', message, meta)
    // best-effort persist (do not block)
    db.collection('auditLogs').add({
      level: 'info',
      message: String(message),
      meta: meta,
      createdAt: new Date()
    }).catch(() => {})
  } catch (e) {
    console.log('logInfo failed', e)
  }
}

function logError(message, meta = {}) {
  try {
    console.error('[ERROR]', message, meta)
    db.collection('auditLogs').add({
      level: 'error',
      message: String(message),
      meta: meta,
      createdAt: new Date()
    }).catch(() => {})
  } catch (e) {
    console.error('logError failed', e)
  }
}

module.exports = {
  logInfo,
  logError
}


