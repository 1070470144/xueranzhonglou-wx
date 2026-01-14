 'use strict'

const db = uniCloud.database()
const createResponse = (code = 0, message = 'ok', data = null) => ({ code, message, data })

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
        // process manifest (sequentially to keep resource usage predictable)
        const results = { success: 0, fail: 0 }
        for (const fileEntry of manifest) {
          try {
            // basic validation: must have fileName and content (string or object)
            const fileName = fileEntry.fileName || fileEntry.name || 'unknown'
            let content = fileEntry.content
            if (typeof content !== 'string') {
              // try to stringify objects
              try { content = JSON.stringify(content) } catch (e) { content = String(content) }
            }
            // attempt to call scriptManager to create script
            const createRes = await uniCloud.callFunction({
              name: 'scriptManager',
              data: {
                action: 'create',
                title: (fileEntry.extractedMeta && fileEntry.extractedMeta.title) || fileName,
                content: content || '',
                author: (fileEntry.extractedMeta && fileEntry.extractedMeta.author) || 'import',
                status: (fileEntry.extractedMeta && fileEntry.extractedMeta.status) || 'active',
                description: (fileEntry.extractedMeta && fileEntry.extractedMeta.description) || undefined,
                tags: (fileEntry.extractedMeta && fileEntry.extractedMeta.tags) || [],
                images: (fileEntry.extractedMeta && fileEntry.extractedMeta.images) || []
              }
            })
            const createResult = (createRes && createRes.result) ? createRes.result : createRes
            if (createResult && createResult.code === 0) {
              results.success++
            } else {
              // record failure
              results.fail++
              await db.collection('bulkUploadErrors').add({
                jobId,
                fileName,
                error: (createResult && (createResult.errMsg || createResult.message)) || 'create failed',
                createdAt: new Date()
              })
            }
          } catch (pfErr) {
            results.fail++
            await db.collection('bulkUploadErrors').add({
              jobId,
              fileName: fileEntry && (fileEntry.fileName || fileEntry.name) || 'unknown',
              error: pfErr.message || String(pfErr),
              createdAt: new Date()
            })
          } finally {
            // update counters periodically
            await db.collection('bulkUploadJobs').doc(jobId).update({
              successCount: db.command.inc(results.success),
              failCount: db.command.inc(results.fail),
              updatedAt: new Date()
            }).catch(() => {}) // ignore transient errors updating counts
          }
        }
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
    
    if (action === 'getJobErrors') {
      const jobId = event.jobId
      if (!jobId) return createResponse(-1, 'jobId required')
      const res = await db.collection('bulkUploadErrors').where({ jobId }).get()
      const errors = (res && res.data) ? res.data.map(e => ({ fileName: e.fileName, error: e.error })) : []
      return createResponse(0, 'ok', { jobId, errors })
    }

    return createResponse(0, 'bulkUpload scaffold')
  } catch (e) {
    console.error('bulkUpload error', e)
    return createResponse(-1, e.message || 'error')
  }
}


