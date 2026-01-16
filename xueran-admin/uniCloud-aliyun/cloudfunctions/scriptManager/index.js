'use strict'

/**
 * 统一剧本管理云对象
 * 提供剧本的创建、读取、更新、删除和上传功能
 */

// 云数据库引用
const db = uniCloud.database()
const scriptsCollection = db.collection('scripts')

// 文件上传到云存储
const uploadToCloudStorage = async (filePath) => {
  // 确保filePath是字符串
  if (typeof filePath !== 'string' || !filePath) {
    throw new Error('文件路径必须是有效的字符串')
  }

  const result = await uniCloud.uploadFile({
    filePath: filePath,
    cloudPath: `scripts/${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  })
  return result
}

// 数据验证函数
const validateScriptData = (data, isUpdate = false) => {
  const errors = []

  if (!isUpdate) {
    // 创建时的必填验证
    if (!data.title || typeof data.title !== 'string' || data.title.length < 1 || data.title.length > 200) {
      errors.push('标题必须是1-200字符的字符串')
    }
    if (!data.content || typeof data.content !== 'string' || data.content.length < 1) {
      errors.push('内容不能为空')
    }
    if (!data.author || typeof data.author !== 'string' || data.author.length < 1 || data.author.length > 100) {
      errors.push('作者必须是1-100字符的字符串')
    }
  } else {
    // 更新时的可选验证
    if (data.title !== undefined && (typeof data.title !== 'string' || data.title.length < 1 || data.title.length > 200)) {
      errors.push('标题必须是1-200字符的字符串')
    }
    if (data.author !== undefined && (typeof data.author !== 'string' || data.author.length < 1 || data.author.length > 100)) {
      errors.push('作者必须是1-100字符的字符串')
    }
    if (data.version !== undefined && (typeof data.version !== 'string' || data.version.length > 20)) {
      errors.push('版本号必须是字符串，最多20字符')
    }
    if (data.content !== undefined && (typeof data.content !== 'string' || data.content.length < 1)) {
      errors.push('内容不能为空')
    }
  }

  // 可选字段验证
  if (data.status && !['active', 'inactive'].includes(data.status)) {
    errors.push('状态必须是 active 或 inactive 之一')
  }
  // Only accept single tag string
  if (data.tag && (typeof data.tag !== 'string' || !['推理', '娱乐'].includes(data.tag))) {
    errors.push('标签必须为字符串，值为"推理"或"娱乐"')
  }
  if (data.category && (typeof data.category !== 'string' || data.category.length > 100)) {
    errors.push('分类必须是字符串，最多100字符')
  }
  if (data.description && (typeof data.description !== 'string' || data.description.length > 1000)) {
    errors.push('描述必须是字符串，最多1000字符')
  }

  // 数值字段验证（允许数字字符串，但需能转换为非负数）
  if (data.usageCount !== undefined) {
    const uc = Number(data.usageCount)
    if (!Number.isFinite(uc) || uc < 0) {
      errors.push('使用次数必须为非负数字')
    }
  }
  if (data.likes !== undefined) {
    const lk = Number(data.likes)
    if (!Number.isFinite(lk) || lk < 0) {
      errors.push('点赞数必须为非负数字')
    }
  }
  // 来源追溯字段验证（可选）
  if (data.sourceJobId !== undefined) {
    if (typeof data.sourceJobId !== 'string') {
      errors.push('sourceJobId 必须为字符串')
    }
  }
  if (data.sourceFileName !== undefined) {
    if (typeof data.sourceFileName !== 'string') {
      errors.push('sourceFileName 必须为字符串')
    }
  }

  return errors
}

// 统一响应格式
const createResponse = (code = 0, message = '操作成功', data = null) => {
  return {
    code,
    message,
    data
  }
}

// 错误响应
const createErrorResponse = (message, code = -1) => {
  return createResponse(code, message, null)
}

exports.main = async (event, context) => {
  const { action, ...params } = event

  try {
    switch (action) {
      case 'list':
        return await handleList(params)
      case 'get':
        return await handleGet(params)
      case 'create':
        return await handleCreate(params)
      case 'update':
        return await handleUpdate(params)
      case 'delete':
        return await handleDelete(params)
      case 'upload':
        return await handleUpload(params)
      case 'like':
        return await handleLike(params)
      case 'unlike':
        return await handleUnlike(params)
      case 'migrateTags':
        return await handleMigrateTags(params)
      default:
        return createErrorResponse('不支持的操作类型')
    }
  } catch (error) {
    console.error('剧本管理操作失败:', error)
    return createErrorResponse('操作失败：' + error.message)
  }
}

// 获取剧本列表
async function handleList(params) {
  const {
    page = 1,
    pageSize = 20,
    keyword,
    status,
    category
  } = params

  // 构建查询条件（组合 keyword 与 status，避免互相覆盖）
  const query = {}

  if (status || category || keyword) {
    const conditions = []

    if (status) {
      // Treat legacy records without status as active when filtering active.
      if (status === 'active') {
        conditions.push({ $or: [{ status: 'active' }, { status: { $exists: false } }] })
      } else {
        conditions.push({ status: status })
      }
    }

    if (category) {
      conditions.push({ category })
    }

    if (keyword) {
      // 搜索标题、作者和描述
      conditions.push({
        $or: [
          { title: { $regex: keyword, $options: 'i' } },
          { author: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } }
        ]
      })
    }

    // 使用 $and 组合所有条件
    query.$and = conditions
  }

  // 分页查询
  const skip = (page - 1) * pageSize
  const result = await scriptsCollection
    .where(query)
    .skip(skip)
    .limit(pageSize)
    .orderBy('createTime', 'desc')
    .get()

  // 获取总数
  const totalResult = await scriptsCollection.where(query).count()

  return createResponse(0, '获取成功', {
    list: result.data,
    total: totalResult.total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  })
}

// 获取单个剧本
async function handleGet(params) {
  const { id } = params

  if (!id) {
    return createErrorResponse('剧本ID不能为空')
  }

  const result = await scriptsCollection.doc(id).get()

  if (result.data.length === 0) {
    return createErrorResponse('剧本不存在', 404)
  }

  return createResponse(0, '获取成功', result.data[0])
}

// 创建剧本
async function handleCreate(params) {
  // 验证数据
  const validationErrors = validateScriptData(params, false)
  if (validationErrors.length > 0) {
    return createErrorResponse('数据验证失败：' + validationErrors.join(', '))
  }

  // 准备数据
  const now = new Date()
  const scriptData = {
    ...params,
    // 统一使用 tag 字段
    tag: params.tag || '娱乐',
    status: params.status || 'active',
    createTime: now,
    updateTime: now
  }

  // 创建剧本
  const result = await scriptsCollection.add(scriptData)

  return createResponse(0, '创建成功', {
    id: result.id
  })
}

// 更新剧本
async function handleUpdate(params) {
  const { id, ...updateData } = params

  if (!id) {
    return createErrorResponse('剧本ID不能为空')
  }

  // 验证数据
  const validationErrors = validateScriptData(updateData, true)
  if (validationErrors.length > 0) {
    return createErrorResponse('数据验证失败：' + validationErrors.join(', '))
  }

  // 检查剧本是否存在
  const existingScript = await scriptsCollection.doc(id).get()
  if (existingScript.data.length === 0) {
    return createErrorResponse('剧本不存在', 404)
  }

  // 更新数据
  const updatePayload = {
    ...updateData,
    updateTime: new Date()
  }

  await scriptsCollection.doc(id).update(updatePayload)

  return createResponse(0, '更新成功')
}

// 删除剧本
async function handleDelete(params) {
  const { id } = params

  if (!id) {
    return createErrorResponse('剧本ID不能为空')
  }

  // 检查剧本是否存在
  const existingScript = await scriptsCollection.doc(id).get()
  if (existingScript.data.length === 0) {
    return createErrorResponse('剧本不存在', 404)
  }

  // 删除剧本
  await scriptsCollection.doc(id).remove()

  return createResponse(0, '删除成功')
}

// 上传剧本文件
async function handleUpload(params) {
  const { filePath, title, author, description, tag, category, content, imageFileIds = [], thumbnails = [] } = params

  // 基础参数验证
  if (!filePath) {
    return createErrorResponse('文件路径不能为空')
  }

  if (!title || typeof title !== 'string' || title.length < 1 || title.length > 200) {
    return createErrorResponse('标题必须是1-200字符的字符串')
  }

  if (!author || typeof author !== 'string' || author.length < 1 || author.length > 100) {
    return createErrorResponse('作者必须是1-100字符的字符串')
  }

  // 验证标签
  if (tag && (typeof tag !== 'string' || !['推理', '娱乐'].includes(tag))) {
    return createErrorResponse('标签必须是字符串，只能是"推理"或"娱乐"')
  }

  try {
    // 验证文件路径格式
    if (typeof filePath !== 'string' || !filePath) {
      return createErrorResponse('文件路径必须是有效的字符串')
    }

    // 上传文件到云存储
    const uploadResult = await uploadToCloudStorage(filePath)

    // 验证上传结果
    if (!uploadResult || !uploadResult.fileID) {
      return createErrorResponse('文件上传到云存储失败')
    }

    // 检查文件大小 (10MB限制)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (uploadResult.size && uploadResult.size > maxSize) {
      // 清理已上传的文件
      try {
        await uniCloud.deleteFile({ fileList: [uploadResult.fileID] })
      } catch (cleanupError) {
        console.warn('清理失败的上传文件时出错:', cleanupError)
      }
      return createErrorResponse('文件大小超过10MB限制')
    }

    // 设置内容：优先使用传递的内容，如果没有则尝试从文件读取
    let fileContent = content || ''
    if (!fileContent) {
      try {
        // 对于支持的文件类型，尝试读取内容
        const supportedTypes = ['text/plain', 'application/json', 'text/markdown', 'text/x-markdown']
        if (uploadResult.mimeType && supportedTypes.includes(uploadResult.mimeType)) {
          // 这里可以根据实际需求实现文件内容读取
          // 暂时设置为空，实际项目中需要根据文件类型处理
          fileContent = '文件已上传，内容待解析'
        } else {
          fileContent = '不支持的文件类型，已上传但无法解析内容'
        }
      } catch (readError) {
        console.warn('无法读取文件内容:', readError)
        fileContent = '文件已上传，内容读取失败'
      }
    }

    // 准备剧本数据 - 统一使用 tag 字段
    const scriptData = {
      title: title.trim(),
      content: fileContent,
      author: author.trim(),
      fileId: uploadResult.fileID,
      fileUrl: uploadResult.fileURL || uploadResult.tempFileURL,
      fileSize: uploadResult.size || 0,
      mimeType: uploadResult.mimeType || 'application/octet-stream',
      status: 'active',
      tag: tag || '娱乐', // 统一使用 tag 字段
      category: category ? category.trim() : undefined,
      description: description ? description.trim() : undefined,
      images: Array.isArray(imageFileIds) ? imageFileIds.map((fileId, index) => ({
        fileId: fileId,
        url: Array.isArray(thumbnails) && thumbnails[index] ? thumbnails[index] : fileId
      })) : [],
      usageCount: params.usageCount !== undefined ? Number(params.usageCount) : 0,
      likes: params.likes !== undefined ? Number(params.likes) : 0,
      createTime: new Date(),
      updateTime: new Date()
    }

    // 创建剧本记录
    const createResult = await scriptsCollection.add(scriptData)

    if (!createResult || !createResult.id) {
      // 如果数据库创建失败，清理已上传的文件
      try {
        await uniCloud.deleteFile({ fileList: [uploadResult.fileID] })
      } catch (cleanupError) {
        console.warn('清理失败的上传文件时出错:', cleanupError)
      }
      return createErrorResponse('剧本记录创建失败')
    }

    return createResponse(0, '上传成功', {
      id: createResult.id,
      fileId: uploadResult.fileID,
      fileUrl: uploadResult.fileURL || uploadResult.tempFileURL,
      title: scriptData.title,
      author: scriptData.author
    })

  } catch (uploadError) {
    console.error('文件上传失败:', uploadError)

    // 根据错误类型提供不同的错误消息
    if (uploadError.message && uploadError.message.includes('size')) {
      return createErrorResponse('文件大小超过限制')
    } else if (uploadError.message && uploadError.message.includes('type')) {
      return createErrorResponse('不支持的文件格式')
    } else if (uploadError.message && uploadError.message.includes('network')) {
      return createErrorResponse('网络连接失败，请检查网络后重试')
    } else {
      return createErrorResponse('文件上传失败：' + uploadError.message)
    }
  }
}

// 点赞剧本
async function handleLike(params) {
  const { id } = params

  if (!id) {
    return createErrorResponse('剧本ID不能为空')
  }

  try {
    // 使用原子操作增加点赞数
    const result = await scriptsCollection.doc(id).update({
      likes: db.command.inc(1),
      updateTime: new Date()
    })

    return createResponse(0, '点赞成功')
  } catch (error) {
    console.error('点赞操作失败:', error)
    return createErrorResponse('点赞失败')
  }
}

// 取消点赞剧本
async function handleUnlike(params) {
  const { id } = params

  if (!id) {
    return createErrorResponse('剧本ID不能为空')
  }

  try {
    // 使用原子操作减少点赞数，确保不会小于0
    const result = await scriptsCollection.doc(id).update({
      likes: db.command.max(db.command.inc(-1), 0),
      updateTime: new Date()
    })

    return createResponse(0, '取消点赞成功')
  } catch (error) {
    console.error('取消点赞操作失败:', error)
    return createErrorResponse('取消点赞失败')
  }
}

// 迁移标签字段：将 tags 数组转换为 tag 字符串
async function handleMigrateTags(params) {
  try {
    // 查找所有包含 tags 字段的记录
    const recordsWithTags = await scriptsCollection.where({
      tags: db.command.exists(true)
    }).get()

    let migratedCount = 0
    let skippedCount = 0

    for (const record of recordsWithTags.data) {
      const updateData = {
        updateTime: new Date()
      }

      // 如果有 tags 数组，取第一个元素作为 tag
      if (record.tags && Array.isArray(record.tags) && record.tags.length > 0) {
        updateData.tag = record.tags[0]
      } else if (record.tags && typeof record.tags === 'string') {
        updateData.tag = record.tags
      } else {
        // 如果没有有效的 tags，设置默认值
        updateData.tag = '娱乐'
      }

      // 移除旧的 tags 字段
      updateData.tags = db.command.remove()

      try {
        await scriptsCollection.doc(record._id).update(updateData)
        migratedCount++
      } catch (updateError) {
        console.error(`迁移记录 ${record._id} 失败:`, updateError)
        skippedCount++
      }
    }

    // 查找没有 tag 字段但有其他标签信息的记录
    const recordsWithoutTag = await scriptsCollection.where({
      tag: db.command.exists(false),
      tags: db.command.exists(false)
    }).get()

    for (const record of recordsWithoutTag.data) {
      try {
        await scriptsCollection.doc(record._id).update({
          tag: '娱乐', // 默认标签
          updateTime: new Date()
        })
        migratedCount++
      } catch (updateError) {
        console.error(`设置默认标签失败 ${record._id}:`, updateError)
        skippedCount++
      }
    }

    return createResponse(0, '标签字段迁移完成', {
      migrated: migratedCount,
      skipped: skippedCount,
      totalProcessed: migratedCount + skippedCount
    })
  } catch (error) {
    console.error('标签迁移失败:', error)
    return createErrorResponse('标签迁移失败：' + error.message)
  }
}
