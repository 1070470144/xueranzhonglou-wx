// validators.js - Validation helpers for bulk upload operations
// Validates JSON content, meta extraction, and file constraints

/**
 * Validate JSON content and extract metadata
 * @param {string} content - JSON string content
 * @returns {Object} - { isValid: boolean, error: string, meta: Object }
 */
function validateAndExtractJsonMeta(content) {
  try {
    if (!content || typeof content !== 'string') {
      return {
        isValid: false,
        error: 'Content must be a non-empty string',
        meta: null
      }
    }

    // Parse JSON
    const jsonData = JSON.parse(content.trim())

    // Validate structure - must be array
    if (!Array.isArray(jsonData)) {
      return {
        isValid: false,
        error: 'JSON must be an array',
        meta: null
      }
    }

    // Must have at least one element
    if (jsonData.length === 0) {
      return {
        isValid: false,
        error: 'JSON array must not be empty',
        meta: null
      }
    }

    // First element should be meta object with _meta id
    const firstElement = jsonData[0]
    if (!firstElement || typeof firstElement !== 'object' || firstElement.id !== '_meta') {
      return {
        isValid: false,
        error: 'First element must be meta object with id "_meta"',
        meta: null
      }
    }

    // Extract metadata
    const meta = {
      name: firstElement.name || '',
      author: firstElement.author || '',
      description: firstElement.description || '',
      logo: firstElement.logo || '',
      rolesCount: jsonData.length - 1 // Exclude meta object
    }

    // Validate essential fields
    if (!meta.name || meta.name.length > 200) {
      return {
        isValid: false,
        error: 'Script name is required and must be <= 200 characters',
        meta: null
      }
    }

    if (!meta.author || meta.author.length > 100) {
      return {
        isValid: false,
        error: 'Author is required and must be <= 100 characters',
        meta: null
      }
    }

    return {
      isValid: true,
      error: null,
      meta
    }

  } catch (error) {
    return {
      isValid: false,
      error: `Invalid JSON: ${error.message}`,
      meta: null
    }
  }
}

/**
 * Validate file size constraints
 * @param {string} content - Content to check
 * @returns {Object} - { isValid: boolean, error: string }
 */
function validateFileSize(content) {
  const maxSize = 10 * 1024 * 1024 // 10MB limit

  if (content.length > maxSize) {
    return {
      isValid: false,
      error: `File size (${Math.round(content.length / 1024)}KB) exceeds maximum limit of ${Math.round(maxSize / 1024)}KB`
    }
  }

  return {
    isValid: true,
    error: null
  }
}

/**
 * Validate Clocktower role object structure
 * @param {Object} role - Role object to validate
 * @returns {boolean} - Whether the role object is valid
 */
function validateRoleObject(role) {
  // Required fields for Clocktower roles
  const requiredFields = ['name', 'ability', 'team']

  for (const field of requiredFields) {
    if (!role[field]) {
      return false
    }
  }

  // Validate team value
  const validTeams = ['townsfolk', 'outsider', 'minion', 'demon', 'traveler']
  if (!validTeams.includes(role.team)) {
    return false
  }

  return true
}

/**
 * Comprehensive file validation
 * @param {string} content - File content
 * @param {string} fileName - Original filename
 * @returns {Object} - { isValid: boolean, error: string, meta: Object }
 */
function validateFile(content, fileName) {
  // Check file size first
  const sizeValidation = validateFileSize(content)
  if (!sizeValidation.isValid) {
    return sizeValidation
  }

  // Validate JSON and extract meta
  const jsonValidation = validateAndExtractJsonMeta(content)
  if (!jsonValidation.isValid) {
    return jsonValidation
  }

  // Additional validation could be added here
  // e.g., validate role objects, check for duplicate roles, etc.

  return jsonValidation
}

module.exports = {
  validateAndExtractJsonMeta,
  validateFileSize,
  validateRoleObject,
  validateFile
}