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

// Export default object for easier imports
export default {
  createJob,
  getJob,
  getJobErrors
}