// processor.js - Batch processing logic for bulk upload operations
// Handles file processing, retry logic, and batch size management

const db = uniCloud.database()
const { validateFile } = require('./validators.js')

/**
 * Process a single file entry
 * @param {Object} fileEntry - File entry from manifest
 * @param {string} jobId - Job ID for tracking
 * @returns {Promise<Object>} - { success: boolean, error?: string }
 */
async function processSingleFile(fileEntry, jobId) {
  try {
    const fileName = fileEntry.fileName || fileEntry.name || 'unknown'

    // Validate file content
    const validation = validateFile(fileEntry.content, fileName)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
        fileName
      }
    }

    // Extract metadata for script creation
    const meta = validation.meta

    // Call scriptManager to create the script
    const createRes = await uniCloud.callFunction({
      name: 'scriptManager',
      data: {
        action: 'create',
        title: meta.name,
        content: fileEntry.content,
        author: meta.author,
        status: 'active', // Default to active
        description: meta.description || '',
        tags: fileEntry.tags || [],
        images: fileEntry.images || [],
        sourceJobId: jobId,
        sourceFileName: fileName
      }
    })

    const createResult = createRes && createRes.result ? createRes.result : createRes

    if (createResult && createResult.code === 0) {
      return {
        success: true,
        fileName
      }
    } else {
      return {
        success: false,
        error: createResult && (createResult.errMsg || createResult.message) || 'Script creation failed',
        fileName
      }
    }

  } catch (error) {
    return {
      success: false,
      error: error.message || String(error),
      fileName: fileEntry.fileName || fileEntry.name || 'unknown'
    }
  }
}

/**
 * Process files in batches with concurrency control
 * @param {Array} manifest - Array of file entries
 * @param {string} jobId - Job ID
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} - Processing results
 */
async function processBatch(manifest, jobId, options = {}) {
  const {
    batchSize = 5,        // Process 5 files at a time
    concurrency = 3,       // 3 concurrent operations
    retryAttempts = 2,     // Retry failed operations
    retryDelay = 1000      // 1 second delay between retries
  } = options

  const results = {
    total: manifest.length,
    success: 0,
    fail: 0,
    errors: []
  }

  // Process in batches
  for (let i = 0; i < manifest.length; i += batchSize) {
    const batch = manifest.slice(i, i + batchSize)
    const batchPromises = []

    // Create concurrent promises for this batch
    for (let j = 0; j < Math.min(batch.length, concurrency); j++) {
      const fileEntry = batch[j]
      if (fileEntry) {
        const processPromise = processFileWithRetry(fileEntry, jobId, retryAttempts, retryDelay)
        batchPromises.push(processPromise)
      }
    }

    // Wait for this batch to complete
    const batchResults = await Promise.allSettled(batchPromises)

    // Update results and job status
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        const fileResult = result.value
        if (fileResult.success) {
          results.success++
        } else {
          results.fail++
          results.errors.push({
            fileName: fileResult.fileName,
            error: fileResult.error
          })
        }
      } else {
        // Promise rejected
        results.fail++
        results.errors.push({
          fileName: 'unknown',
          error: result.reason.message || String(result.reason)
        })
      }
    }

    // Update job progress in database
    try {
      await db.collection('bulkUploadJobs').doc(jobId).update({
        successCount: results.success,
        failCount: results.fail,
        updatedAt: new Date()
      })
    } catch (updateError) {
      console.error('Failed to update job progress:', updateError)
      // Continue processing even if progress update fails
    }

    // Small delay between batches to prevent overwhelming the system
    if (i + batchSize < manifest.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return results
}

/**
 * Process a single file with retry logic
 * @param {Object} fileEntry - File entry
 * @param {string} jobId - Job ID
 * @param {number} maxAttempts - Maximum retry attempts
 * @param {number} delay - Delay between retries in ms
 * @returns {Promise<Object>} - Processing result
 */
async function processFileWithRetry(fileEntry, jobId, maxAttempts = 2, delay = 1000) {
  let lastError = null

  for (let attempt = 1; attempt <= maxAttempts + 1; attempt++) {
    try {
      const result = await processSingleFile(fileEntry, jobId)

      // If successful or it's a validation error (don't retry validation errors), return immediately
      if (result.success || (result.error && result.error.includes('validation'))) {
        return result
      }

      // For other errors, store the error but continue to retry
      lastError = result.error

      // If this is the last attempt, return the failure
      if (attempt > maxAttempts) {
        return result
      }

    } catch (error) {
      lastError = error.message || String(error)

      // If this is the last attempt, return failure
      if (attempt > maxAttempts) {
        return {
          success: false,
          error: lastError,
          fileName: fileEntry.fileName || fileEntry.name || 'unknown'
        }
      }
    }

    // Wait before retrying
    if (attempt <= maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  // Should not reach here, but fallback
  return {
    success: false,
    error: lastError || 'Unknown error',
    fileName: fileEntry.fileName || fileEntry.name || 'unknown'
  }
}

/**
 * Clean up job resources (manifests, temporary data)
 * @param {string} jobId - Job ID to clean up
 */
async function cleanupJob(jobId) {
  try {
    // Remove manifest data if it exists
    await db.collection('bulkUploadManifests')
      .where({ jobId })
      .remove()

    // Could add more cleanup logic here
    console.log(`Cleaned up resources for job ${jobId}`)
  } catch (error) {
    console.error(`Failed to cleanup job ${jobId}:`, error)
    // Don't throw - cleanup failures shouldn't affect job completion
  }
}

module.exports = {
  processSingleFile,
  processBatch,
  processFileWithRetry,
  cleanupJob
}