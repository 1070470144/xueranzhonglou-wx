 'use strict'

const db = uniCloud.database()
const { logFileProcessed, logMetadataExtractionStats } = require('./logs.js')
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
        const extractionStats = {
          totalFiles: manifest.length,
          titleExtracted: 0,
          authorExtracted: 0,
          descriptionExtracted: 0,
          tagsExtracted: 0,
          defaultTagsApplied: 0,
          defaultStatusApplied: 0
        }

        for (const fileEntry of manifest) {
          try {
            // Enhanced validation: check fileName, content, and JSON validity
            const fileName = fileEntry.fileName || fileEntry.name || 'unknown'

            // Validate required fields
            if (!fileName || fileName === 'unknown') {
              throw new Error('文件名缺失或无效')
            }

            let content = fileEntry.content
            if (!content) {
              throw new Error('文件内容为空')
            }

            if (typeof content !== 'string') {
              // try to stringify objects
              try {
                content = JSON.stringify(content)
              } catch (e) {
                throw new Error('文件内容无法序列化为JSON')
              }
            }

            // Validate JSON structure
            let parsedContent
            try {
              parsedContent = JSON.parse(content)
            } catch (jsonErr) {
              throw new Error(`JSON格式错误: ${jsonErr.message}`)
            }

            // Validate minimum required fields for script creation
            if (!parsedContent || (Array.isArray(parsedContent) && parsedContent.length === 0)) {
              throw new Error('JSON内容为空或无效')
            }

            // attempt to call scriptManager to create script
            const createRes = await uniCloud.callFunction({
              name: 'scriptManager',
              data: {
                action: 'create',
                title: (fileEntry.extractedMeta && fileEntry.extractedMeta.title) || fileName.replace(/\.json$/i, ''),
                content: content || '',
                author: (fileEntry.extractedMeta && fileEntry.extractedMeta.author) || '批量导入',
                status: (fileEntry.extractedMeta && fileEntry.extractedMeta.status) || 'active',
                description: (fileEntry.extractedMeta && fileEntry.extractedMeta.description) || `从 ${fileName} 导入的剧本`,
                // single tag string (prefer extractedMeta.tag, fallback to first tags entry)
                tag: (fileEntry.extractedMeta && (fileEntry.extractedMeta.tag || (fileEntry.extractedMeta.tags && fileEntry.extractedMeta.tags[0]))) || '娱乐',
                images: (fileEntry.extractedMeta && fileEntry.extractedMeta.images) || [],
                usageCount: (fileEntry.extractedMeta && fileEntry.extractedMeta.usageCount) || 0,
                likes: (fileEntry.extractedMeta && fileEntry.extractedMeta.likes) || 0
              }
            })
            const createResult = (createRes && createRes.result) ? createRes.result : createRes
            if (createResult && createResult.code === 0) {
              results.success++

              // Track extraction statistics
              if (fileEntry.extractedMeta) {
                if (fileEntry.extractedMeta.title && fileEntry.extractedMeta.title.trim()) {
                  extractionStats.titleExtracted++
                }
                if (fileEntry.extractedMeta.author && fileEntry.extractedMeta.author.trim()) {
                  extractionStats.authorExtracted++
                }
                if (fileEntry.extractedMeta.description && fileEntry.extractedMeta.description.trim()) {
                  extractionStats.descriptionExtracted++
                }
                if (fileEntry.extractedMeta.tags && fileEntry.extractedMeta.tags.length > 0) {
                  extractionStats.tagsExtracted++
                  // Check if default "娱乐" tag was applied
                  if (fileEntry.extractedMeta.tags.includes('娱乐')) {
                    extractionStats.defaultTagsApplied++
                  }
                }
                // Check if default status was applied
                if (fileEntry.extractedMeta.status === 'active') {
                  extractionStats.defaultStatusApplied++
                }
              }

              // Log successful processing with metadata
              await logFileProcessed(jobId, fileName, true, null, 0, fileEntry.extractedMeta)
            } else {
              // record detailed failure with categorization
              results.fail++
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

              // Log failed processing
              await logFileProcessed(jobId, fileName, false, errorMessage, 0, fileEntry.extractedMeta)
            }
          } catch (pfErr) {
            results.fail++
            const errorMessage = pfErr.message || String(pfErr)

            // Categorize errors for better reporting
            let errorType = 'unknown_error'
            if (errorMessage.includes('文件名缺失')) {
              errorType = 'invalid_filename'
            } else if (errorMessage.includes('文件内容为空')) {
              errorType = 'empty_content'
            } else if (errorMessage.includes('JSON格式错误')) {
              errorType = 'invalid_json'
            } else if (errorMessage.includes('无法序列化')) {
              errorType = 'serialization_failed'
            } else if (errorMessage.includes('内容为空')) {
              errorType = 'invalid_content'
            }

            await db.collection('bulkUploadErrors').add({
              jobId,
              fileName: fileEntry && (fileEntry.fileName || fileEntry.name) || 'unknown',
              errorType,
              error: errorMessage,
              createdAt: new Date()
            })
          } finally {
            // update counters periodically — write absolute totals (avoid cumulative increments)
            await db.collection('bulkUploadJobs').doc(jobId).update({
              successCount: results.success,
              failCount: results.fail,
              updatedAt: new Date()
            }).catch(() => {}) // ignore transient errors updating counts
          }
        }

        // Log metadata extraction statistics
        const titleExtractionRate = extractionStats.totalFiles > 0 ?
          Math.round((extractionStats.titleExtracted / extractionStats.totalFiles) * 100) : 0
        const authorExtractionRate = extractionStats.totalFiles > 0 ?
          Math.round((extractionStats.authorExtracted / extractionStats.totalFiles) * 100) : 0
        const descriptionExtractionRate = extractionStats.totalFiles > 0 ?
          Math.round((extractionStats.descriptionExtracted / extractionStats.totalFiles) * 100) : 0
        const tagsExtractionRate = extractionStats.totalFiles > 0 ?
          Math.round((extractionStats.tagsExtracted / extractionStats.totalFiles) * 100) : 0

        await logMetadataExtractionStats(jobId, {
          totalFiles: extractionStats.totalFiles,
          titleExtractionRate,
          authorExtractionRate,
          descriptionExtractionRate,
          tagsExtractionRate,
          defaultTagsApplied: extractionStats.defaultTagsApplied,
          defaultStatusApplied: extractionStats.defaultStatusApplied
        })

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


