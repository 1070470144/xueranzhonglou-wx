// bulkUploadApi.js - Frontend API wrapper for bulk upload operations
// Implements the bulk upload API contract from specs/002-bulk-json-upload/contracts/bulk-upload-api.yaml

import { uniCloudRequest } from '@/utils/request.js'

/**
 * Create a new bulk upload job
 * @param {Object} params
 * @param {Array} params.manifest - Array of file manifests
 * @param {boolean} params.processNow - Whether to process immediately
 * @returns {Promise<{code: number, data: {jobId: string}}>}
 */
export async function createJob(params) {
  try {
    const response = await uniCloudRequest({
      cloudName: 'bulkUpload',
      methodName: 'createJob',
      data: params
    })

    if (response.code === 0) {
      return {
        code: 0,
        data: {
          jobId: response.data.jobId
        }
      }
    } else {
      throw new Error(response.message || 'Create job failed')
    }
  } catch (error) {
    console.error('bulkUploadApi.createJob error:', error)
    return {
      code: -1,
      message: error.message || 'Network error'
    }
  }
}

/**
 * Get bulk upload job status
 * @param {string} jobId - The job ID to query
 * @returns {Promise<{code: number, data: {jobId: string, status: string, successCount: number, failCount: number}}>}
 */
export async function getJob(jobId) {
  try {
    const response = await uniCloudRequest({
      cloudName: 'bulkUpload',
      methodName: 'getJob',
      data: { jobId }
    })

    if (response.code === 0) {
      return {
        code: 0,
        data: response.data
      }
    } else {
      throw new Error(response.message || 'Get job failed')
    }
  } catch (error) {
    console.error('bulkUploadApi.getJob error:', error)
    return {
      code: -1,
      message: error.message || 'Network error'
    }
  }
}

/**
 * Get bulk upload job errors
 * @param {string} jobId - The job ID to query
 * @returns {Promise<{code: number, data: {errors: Array<{fileName: string, error: string}>}}>}
 */
export async function getJobErrors(jobId) {
  try {
    const response = await uniCloudRequest({
      cloudName: 'bulkUpload',
      methodName: 'getJobErrors',
      data: { jobId }
    })

    if (response.code === 0) {
      return {
        code: 0,
        data: response.data
      }
    } else {
      throw new Error(response.message || 'Get job errors failed')
    }
  } catch (error) {
    console.error('bulkUploadApi.getJobErrors error:', error)
    return {
      code: -1,
      message: error.message || 'Network error'
    }
  }
}

/**
 * Security validation for file content
 * @param {string} content - File content
 * @param {string} fileName - File name
 * @returns {boolean} True if content is safe
 */
function validateFileContentSecurity(content, fileName) {
  // Security check: prevent extremely large content that could cause memory issues
  const MAX_CONTENT_SIZE = 50 * 1024 * 1024 // 50MB limit
  if (content.length > MAX_CONTENT_SIZE) {
    console.warn(`File too large: ${fileName} (${content.length} bytes)`)
    return false
  }

  // Security check: prevent JSON with potentially dangerous content
  // Check for script tags or other potentially malicious patterns
  const dangerousPatterns = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\s*\(/gi,
    /Function\s*\(/gi
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(content)) {
      console.warn(`Potentially dangerous content detected in ${fileName}`)
      return false
    }
  }

  return true
}

/**
 * Validate and filter JSON files from file list with security checks
 * @param {Array} files - Array of file objects
 * @returns {Array} Filtered array of valid JSON files with metadata
 */
export function validateAndFilterJsonFiles(files) {
  return files.filter(file => {
    // Check file extension
    if (!file.fileName || !file.fileName.toLowerCase().endsWith('.json')) {
      return false
    }

    // Security check: validate filename
    if (file.fileName.includes('..') || file.fileName.includes('/') || file.fileName.includes('\\')) {
      console.warn(`Invalid filename: ${file.fileName}`)
      return false
    }

    // Check content exists and is valid JSON
    if (!file.content || typeof file.content !== 'string') {
      return false
    }

    // Security validation
    if (!validateFileContentSecurity(file.content, file.fileName)) {
      return false
    }

    try {
      const parsed = JSON.parse(file.content)

      // Additional security: check JSON structure depth to prevent attacks
      const getDepth = (obj, currentDepth = 0) => {
        if (currentDepth > 10) return currentDepth // Prevent deep recursion
        if (typeof obj !== 'object' || obj === null) return currentDepth
        let maxDepth = currentDepth
        for (const value of Object.values(obj)) {
          maxDepth = Math.max(maxDepth, getDepth(value, currentDepth + 1))
        }
        return maxDepth
      }

      if (getDepth(parsed) > 20) {
        console.warn(`JSON structure too deep in ${file.fileName}`)
        return false
      }

      return true
    } catch (e) {
      console.warn(`Invalid JSON in file ${file.fileName}:`, e.message)
      return false
    }
  })
}

/**
 * Extract metadata from JSON content with enhanced algorithm
 * @param {string} jsonContent - JSON string content
 * @param {string} fileName - Original filename for fallback
 * @returns {Object} Extracted metadata
 */
export function extractJsonMetadata(jsonContent, fileName) {
  try {
    const parsed = JSON.parse(jsonContent)
    return extractMetadata(parsed, fileName)
  } catch (err) {
    console.warn('Metadata extraction failed:', err)
    // Return minimal metadata with defaults
    return {
      title: fileName.replace(/\.json$/i, ''),
      author: '',
      description: null,
      tags: ['娱乐'],
      usageCount: 0,
      likes: 0,
      status: 'active'
    }
  }
}

/**
 * Enhanced metadata extraction supporting multiple JSON formats
 * @param {Object|Array} parsed - Parsed JSON object
 * @param {string} fileName - Filename for fallback
 * @returns {Object} Extracted metadata
 */
function extractMetadata(parsed, fileName) {
  try {
    let metaFromJson = null
    let isClocktowerFormat = false

    // Check for Clocktower format (array with _meta as first element)
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0] && parsed[0].id === '_meta') {
      metaFromJson = parsed[0]
      isClocktowerFormat = true
    }
    // Check for object with _meta field
    else if (parsed && typeof parsed === 'object' && parsed._meta) {
      metaFromJson = parsed._meta
    }
    // Check for direct metadata object
    else if (parsed && typeof parsed === 'object' &&
             (parsed.title || parsed.name || parsed.author || parsed.description)) {
      metaFromJson = parsed
    }

    // Extract metadata with fallback priorities
    const metadata = {
      title: extractField(metaFromJson, ['title', 'name'], fileName.replace(/\.json$/i, '')),
      author: extractField(metaFromJson, ['author', 'creator'], ''),
      description: extractField(metaFromJson, ['description', 'summary'], null),
      tags: extractTags(metaFromJson, parsed),
      usageCount: extractField(metaFromJson, ['usageCount'], 0),
      likes: extractField(metaFromJson, ['likes'], 0),
      status: 'active' // Default to active status
    }

    return metadata
  } catch (err) {
    console.warn('Metadata extraction failed:', err)
    // Return minimal metadata with defaults
    return {
      title: fileName.replace(/\.json$/i, ''),
      author: '',
      description: null,
      tags: ['娱乐'],
      usageCount: 0,
      likes: 0,
      status: 'active'
    }
  }
}

/**
 * Helper method to extract field with fallback priorities
 * @param {Object} obj - Object to extract from
 * @param {Array} fieldNames - Array of field names to try
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Extracted value or default
 */
function extractField(obj, fieldNames, defaultValue) {
  if (!obj) return defaultValue
  for (const fieldName of fieldNames) {
    if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== '') {
      return obj[fieldName]
    }
  }
  return defaultValue
}

/**
 * Enhanced tag extraction
 * @param {Object} metaFromJson - Metadata object
 * @param {Object} fullParsed - Full parsed object
 * @returns {Array} Array of tags
 */
function extractTags(metaFromJson, fullParsed) {
  let tags = []

  // Try to extract from metadata
  if (metaFromJson && metaFromJson.tags) {
    if (Array.isArray(metaFromJson.tags)) {
      tags = tags.concat(metaFromJson.tags)
    } else if (typeof metaFromJson.tags === 'string') {
      tags.push(metaFromJson.tags)
    }
  }

  // Try to extract from root object
  if (fullParsed && fullParsed.tags) {
    if (Array.isArray(fullParsed.tags)) {
      tags = tags.concat(fullParsed.tags)
    } else if (typeof fullParsed.tags === 'string') {
      tags.push(fullParsed.tags)
    }
  }

  // Ensure "娱乐" tag is included
  if (!tags.includes('娱乐')) {
    tags.unshift('娱乐')
  }

  return tags.length > 0 ? tags : ['娱乐']
}

// Export default object for easier imports
export default {
  createJob,
  getJob,
  getJobErrors,
  validateAndFilterJsonFiles,
  extractJsonMetadata
}