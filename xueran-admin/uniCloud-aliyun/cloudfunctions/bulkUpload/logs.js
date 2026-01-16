// logs.js - Audit logging for bulk upload operations
// Records job operations, file processing results, and system events

const db = uniCloud.database()

/**
 * Log levels for different types of events
 */
const LOG_LEVELS = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  DEBUG: 'debug'
}

/**
 * Log a job-related event
 * @param {string} jobId - Job ID
 * @param {string} level - Log level (info, warn, error, debug)
 * @param {string} message - Log message
 * @param {Object} extra - Additional data to log
 */
async function logJobEvent(jobId, level, message, extra = {}) {
  try {
    const logEntry = {
      jobId,
      level,
      message,
      timestamp: new Date(),
      ...extra
    }

    await db.collection('bulkUploadLogs').add(logEntry)
  } catch (error) {
    console.error('Failed to log job event:', error)
    // Don't throw - logging failures shouldn't affect main operations
  }
}

/**
 * Log job creation
 * @param {string} jobId - Job ID
 * @param {string} userId - User who created the job
 * @param {number} totalFiles - Total files in the job
 * @param {boolean} processNow - Whether processing immediately
 */
async function logJobCreated(jobId, userId, totalFiles, processNow) {
  await logJobEvent(jobId, LOG_LEVELS.INFO, 'Job created', {
    userId,
    totalFiles,
    processNow,
    event: 'job_created'
  })
}

/**
 * Log job status change
 * @param {string} jobId - Job ID
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 */
async function logJobStatusChange(jobId, oldStatus, newStatus) {
  await logJobEvent(jobId, LOG_LEVELS.INFO, `Job status changed: ${oldStatus} → ${newStatus}`, {
    oldStatus,
    newStatus,
    event: 'status_change'
  })
}

/**
 * Log file processing result
 * @param {string} jobId - Job ID
 * @param {string} fileName - File name
 * @param {boolean} success - Whether processing succeeded
 * @param {string} error - Error message if failed
 * @param {number} processingTime - Time taken to process (ms)
 * @param {Object} metadata - Extracted metadata for accuracy tracking
 */
async function logFileProcessed(jobId, fileName, success, error = null, processingTime = 0, metadata = null) {
  const level = success ? LOG_LEVELS.INFO : LOG_LEVELS.ERROR
  const message = success ? `File processed successfully: ${fileName}` : `File processing failed: ${fileName}`

  const extra = {
    fileName,
    success,
    error,
    processingTime,
    event: 'file_processed'
  }

  // Add metadata extraction details for accuracy tracking
  if (metadata) {
    extra.metadata = {
      hasTitle: !!(metadata.title && metadata.title.trim()),
      hasAuthor: !!(metadata.author && metadata.author.trim()),
      hasDescription: !!(metadata.description && metadata.description.trim()),
      tagsCount: metadata.tags ? metadata.tags.length : 0,
      hasTags: !!(metadata.tags && metadata.tags.length > 0),
      status: metadata.status || 'unknown',
      extractionMethod: metadata.extractionMethod || 'unknown'
    }
  }

  await logJobEvent(jobId, level, message, extra)
}

/**
 * Log batch processing completion
 * @param {string} jobId - Job ID
 * @param {number} batchIndex - Batch index (0-based)
 * @param {number} batchSize - Size of the batch
 * @param {number} successCount - Successful files in batch
 * @param {number} failCount - Failed files in batch
 * @param {number} processingTime - Time taken for batch (ms)
 */
async function logBatchCompleted(jobId, batchIndex, batchSize, successCount, failCount, processingTime) {
  await logJobEvent(jobId, LOG_LEVELS.INFO, `Batch ${batchIndex + 1} completed`, {
    batchIndex,
    batchSize,
    successCount,
    failCount,
    processingTime,
    event: 'batch_completed'
  })
}

/**
 * Log metadata extraction statistics
 * @param {string} jobId - Job ID
 * @param {Object} stats - Extraction statistics
 */
async function logMetadataExtractionStats(jobId, stats) {
  const {
    totalFiles,
    titleExtractionRate,
    authorExtractionRate,
    descriptionExtractionRate,
    tagsExtractionRate,
    defaultTagsApplied,
    defaultStatusApplied
  } = stats

  await logJobEvent(jobId, LOG_LEVELS.INFO, `Metadata extraction completed: Title ${titleExtractionRate}%, Author ${authorExtractionRate}%, Description ${descriptionExtractionRate}%, Tags ${tagsExtractionRate}%`, {
    totalFiles,
    titleExtractionRate,
    authorExtractionRate,
    descriptionExtractionRate,
    tagsExtractionRate,
    defaultTagsApplied,
    defaultStatusApplied,
    event: 'metadata_extraction_stats'
  })
}

/**
 * Log job completion
 * @param {string} jobId - Job ID
 * @param {number} totalFiles - Total files processed
 * @param {number} successCount - Total successful files
 * @param {number} failCount - Total failed files
 * @param {number} totalTime - Total processing time (ms)
 */
async function logJobCompleted(jobId, totalFiles, successCount, failCount, totalTime) {
  const successRate = totalFiles > 0 ? (successCount / totalFiles * 100).toFixed(1) : 0

  await logJobEvent(jobId, LOG_LEVELS.INFO, `Job completed: ${successCount}/${totalFiles} files successful (${successRate}%)`, {
    totalFiles,
    successCount,
    failCount,
    totalTime,
    successRate: parseFloat(successRate),
    event: 'job_completed'
  })
}

/**
 * Log system error
 * @param {string} jobId - Job ID (optional)
 * @param {string} operation - Operation that failed
 * @param {Error} error - Error object
 */
async function logSystemError(jobId = null, operation, error) {
  await logJobEvent(jobId, LOG_LEVELS.ERROR, `System error in ${operation}: ${error.message}`, {
    operation,
    error: error.message,
    stack: error.stack,
    event: 'system_error'
  })
}

/**
 * Get logs for a specific job
 * @param {string} jobId - Job ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Array of log entries
 */
async function getJobLogs(jobId, options = {}) {
  const {
    level = null,
    limit = 100,
    startTime = null,
    endTime = null
  } = options

  try {
    let query = db.collection('bulkUploadLogs').where({ jobId })

    if (level) {
      query = query.where({ level })
    }

    if (startTime) {
      query = query.where({
        timestamp: db.command.gte(startTime)
      })
    }

    if (endTime) {
      query = query.where({
        timestamp: db.command.lte(endTime)
      })
    }

    const result = await query
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get()

    return result.data || []
  } catch (error) {
    console.error('Failed to get job logs:', error)
    return []
  }
}

/**
 * Clean up old logs (utility function)
 * @param {number} daysOld - Remove logs older than this many days
 */
async function cleanupOldLogs(daysOld = 30) {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const result = await db.collection('bulkUploadLogs')
      .where({
        timestamp: db.command.lt(cutoffDate)
      })
      .remove()

    console.log(`Cleaned up ${result.deleted || 0} old log entries`)
  } catch (error) {
    console.error('Failed to cleanup old logs:', error)
  }
}

module.exports = {
  LOG_LEVELS,
  logJobEvent,
  logJobCreated,
  logJobStatusChange,
  logFileProcessed,
  logBatchCompleted,
  logJobCompleted,
  logMetadataExtractionStats,
  logSystemError,
  getJobLogs,
  cleanupOldLogs
}