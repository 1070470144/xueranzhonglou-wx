 'use strict'

const db = uniCloud.database()
const { logFileProcessed, logMetadataExtractionStats } = require('./logs.js')
const createResponse = (code = 0, message = 'ok', data = null) => ({ code, message, data })

function getErrorType(errorMessage) {
  if (errorMessage.includes('文件名缺失')) return 'invalid_filename'
  if (errorMessage.includes('文件内容为空')) return 'empty_content'
  if (errorMessage.includes('JSON格式错误')) return 'invalid_json'
  if (errorMessage.includes('无法序列化')) return 'serialization_failed'
  if (errorMessage.includes('内容为空')) return 'invalid_content'
  return 'unknown_error'
}

function createExtractionStats(totalFiles = 0) {
  return {
    totalFiles,
    titleExtracted: 0,
    authorExtracted: 0,
    descriptionExtracted: 0,
    tagsExtracted: 0,
    defaultTagsApplied: 0,
    defaultStatusApplied: 0
  }
}

function trackExtractionStats(stats, extractedMeta) {
  if (!extractedMeta) return
  if (extractedMeta.title && extractedMeta.title.trim()) stats.titleExtracted++
  if (extractedMeta.author && extractedMeta.author.trim()) stats.authorExtracted++
  if (extractedMeta.description && extractedMeta.description.trim()) stats.descriptionExtracted++
  const tagValue = extractedMeta.tag || (Array.isArray(extractedMeta.tags) ? extractedMeta.tags[0] : extractedMeta.tags)
  if (tagValue) {
    stats.tagsExtracted++
    if (tagValue === '娱乐') stats.defaultTagsApplied++
  }
  if (extractedMeta.status === 'active') stats.defaultStatusApplied++
}

function buildExtractionSummary(stats) {
  const total = stats.totalFiles || 0
  return {
    totalFiles: total,
    titleExtractionRate: total > 0 ? Math.round((stats.titleExtracted / total) * 100) : 0,
    authorExtractionRate: total > 0 ? Math.round((stats.authorExtracted / total) * 100) : 0,
    descriptionExtractionRate: total > 0 ? Math.round((stats.descriptionExtracted / total) * 100) : 0,
    tagsExtractionRate: total > 0 ? Math.round((stats.tagsExtracted / total) * 100) : 0,
    defaultTagsApplied: stats.defaultTagsApplied,
    defaultStatusApplied: stats.defaultStatusApplied
  }
}

async function processFileEntry(jobId, fileEntry, extractionStats) {
  const fileName = fileEntry.fileName || fileEntry.name || 'unknown'
  try {
    if (!fileName || fileName === 'unknown') throw new Error('文件名缺失或无效')

    let content = fileEntry.content
    if (!content) throw new Error('文件内容为空')

    if (typeof content !== 'string') {
      try {
        content = JSON.stringify(content)
      } catch (e) {
        throw new Error('文件内容无法序列化为JSON')
      }
    }

    let parsedContent
    try {
      parsedContent = JSON.parse(content)
    } catch (jsonErr) {
      throw new Error(`JSON格式错误: ${jsonErr.message}`)
    }

    if (!parsedContent || (Array.isArray(parsedContent) && parsedContent.length === 0)) {
      throw new Error('JSON内容为空或无效')
    }

    const createRes = await uniCloud.callFunction({
      name: 'scriptManager',
      data: {
        action: 'create',
        title: (fileEntry.extractedMeta && fileEntry.extractedMeta.title) || fileName.replace(/\.json$/i, ''),
        content: content || '',
        author: (fileEntry.extractedMeta && fileEntry.extractedMeta.author) || '批量导入',
        status: (fileEntry.extractedMeta && fileEntry.extractedMeta.status) || 'active',
        description: (fileEntry.extractedMeta && fileEntry.extractedMeta.description) || `从 ${fileName} 导入的剧本`,
        tag: (fileEntry.extractedMeta && (fileEntry.extractedMeta.tag || (fileEntry.extractedMeta.tags && fileEntry.extractedMeta.tags[0]))) || '娱乐',
        images: (fileEntry.extractedMeta && fileEntry.extractedMeta.images) || [],
        usageCount: (fileEntry.extractedMeta && fileEntry.extractedMeta.usageCount) || 0,
        likes: (fileEntry.extractedMeta && fileEntry.extractedMeta.likes) || 0
      }
    })
    const createResult = (createRes && createRes.result) ? createRes.result : createRes
    if (createResult && createResult.code === 0) {
      trackExtractionStats(extractionStats, fileEntry.extractedMeta)
      await logFileProcessed(jobId, fileName, true, null, 0, fileEntry.extractedMeta)
      return { success: true, fileName }
    }

    const errorMessage = (createResult && (createResult.errMsg || createResult.message)) || '创建剧本失败'
    await db.collection('bulkUploadErrors').add({
      jobId,
      fileName,
      errorType: 'script_creation_failed',
      error: errorMessage,
      errorCode: createResult ? createResult.code : -1,
      createdAt: new Date(),
      metadata: {
        title: (fileEntry.extractedMeta && fileEntry.extractedMeta.title) || fileName,
        author: (fileEntry.extractedMeta && fileEntry.extractedMeta.author) || '批量导入'
      }
    })
    await logFileProcessed(jobId, fileName, false, errorMessage, 0, fileEntry.extractedMeta)
    return { success: false, fileName, error: errorMessage }
  } catch (pfErr) {
    const errorMessage = pfErr.message || String(pfErr)
    await db.collection('bulkUploadErrors').add({
      jobId,
      fileName,
      errorType: getErrorType(errorMessage),
      error: errorMessage,
      createdAt: new Date()
    })
    return { success: false, fileName, error: errorMessage }
  }
}

async function processManifest(jobId, manifest, options = {}) {
  const stats = createExtractionStats(manifest.length)
  const counts = { success: 0, fail: 0 }
  const startSuccess = Number(options.startSuccess || 0)
  const startFail = Number(options.startFail || 0)

  for (const fileEntry of manifest) {
    const result = await processFileEntry(jobId, fileEntry, stats)
    if (result.success) counts.success++
    else counts.fail++

    await db.collection('bulkUploadJobs').doc(jobId).update({
      successCount: startSuccess + counts.success,
      failCount: startFail + counts.fail,
      updatedAt: new Date()
    }).catch(() => {})
  }

  return { ...counts, stats }
}

exports.main = async (event, context) => {
  // bulkUpload cloud function: supports createJob and getJob actions (scaffold)
  const { action } = event || {}
  try {
    if (action === 'createJob') {
      // Accept either a manifest (array) or totalFiles
      const manifest = Array.isArray(event.manifest) ? event.manifest : null
      const totalFiles = manifest ? manifest.length : (Number(event.totalFiles) || 0)

      if (totalFiles <= 0) {
        return createResponse(-1, 'totalFiles must be > 0 or manifest must be provided')
      }

      // try to determine userId from event or context (best-effort)
      const userId = event.userId || (context && context.user && context.user.uid) || null

      const now = new Date()
      const jobData = {
        userId: userId,
        totalFiles: totalFiles,
        successCount: 0,
        failCount: 0,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
        // Do not store full manifest by default to avoid huge documents.
        // If caller passes small manifest and requests storage, store summary.
        manifestSummary: manifest && manifest.length ? manifest.map(f => ({ fileName: f.fileName })) : undefined
      }

      // persist job record
      const res = await db.collection('bulkUploadJobs').add(jobData)
      const jobId = res.id || (res && res.insertedId) || null

      if (!jobId) {
        return createResponse(-1, 'failed to create job record')
      }

      // If caller requests immediate processing, run a synchronous (blocking) processor.
      if (manifest && manifest.length && event.processNow) {
        // update job status to running
        await db.collection('bulkUploadJobs').doc(jobId).update({ status: 'running', updatedAt: new Date() })
        const results = await processManifest(jobId, manifest)
        await logMetadataExtractionStats(jobId, buildExtractionSummary(results.stats))

        // finalize job
        await db.collection('bulkUploadJobs').doc(jobId).update({
          status: 'completed',
          updatedAt: new Date()
        })
        return createResponse(0, 'job processed', { jobId, totalFiles })
      }

      // Otherwise, if manifest provided but not processNow, persist manifest for later worker processing
      if (manifest && manifest.length) {
        await db.collection('bulkUploadManifests').add({ jobId, manifestSummary: jobData.manifestSummary, createdAt: new Date() })
      }

      return createResponse(0, 'job created', { jobId, totalFiles })
    }

    if (action === 'getJob') {
      const jobId = event.jobId
      if (!jobId) return createResponse(-1, 'jobId required')
      const r = await db.collection('bulkUploadJobs').doc(jobId).get()
      if (!r || !r.data || r.data.length === 0) return createResponse(-1, 'job not found')
      return createResponse(0, 'ok', r.data[0])
    }

    if (action === 'processBatch') {
      const jobId = event.jobId
      const manifest = Array.isArray(event.manifest) ? event.manifest : []
      const batchIndex = Number(event.batchIndex || 0)
      const isLastBatch = event.isLastBatch === true
      if (!jobId) return createResponse(-1, 'jobId required')
      if (!manifest.length) return createResponse(-1, 'manifest required')

      const jobRes = await db.collection('bulkUploadJobs').doc(jobId).get()
      const job = jobRes && jobRes.data && jobRes.data[0]
      if (!job) return createResponse(-1, 'job not found')

      const currentSuccess = Number(job.successCount || 0)
      const currentFail = Number(job.failCount || 0)
      await db.collection('bulkUploadJobs').doc(jobId).update({
        status: 'running',
        currentBatch: batchIndex,
        updatedAt: new Date()
      })

      const results = await processManifest(jobId, manifest, {
        startSuccess: currentSuccess,
        startFail: currentFail
      })

      if (isLastBatch) {
        await logMetadataExtractionStats(jobId, buildExtractionSummary(results.stats))
        await db.collection('bulkUploadJobs').doc(jobId).update({
          status: 'completed',
          updatedAt: new Date()
        })
      }

      return createResponse(0, 'batch processed', {
        jobId,
        batchIndex,
        batchSuccess: results.success,
        batchFail: results.fail,
        successCount: currentSuccess + results.success,
        failCount: currentFail + results.fail,
        status: isLastBatch ? 'completed' : 'running'
      })
    }
    
    if (action === 'getJobErrors') {
      const jobId = event.jobId
      if (!jobId) return createResponse(-1, 'jobId required')
      const res = await db.collection('bulkUploadErrors').where({ jobId }).get()
      const errors = (res && res.data) ? res.data.map(e => ({
        fileName: e.fileName,
        error: e.error,
        errorType: e.errorType || 'unknown_error',
        errorCode: e.errorCode ?? null
      })) : []
      return createResponse(0, 'ok', { jobId, errors })
    }

    return createResponse(0, 'bulkUpload scaffold')
  } catch (e) {
    console.error('bulkUpload error', e)
    return createResponse(-1, e.message || 'error')
  }
}


