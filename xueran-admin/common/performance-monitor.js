/**
 * UI 性能监控工具
 * 用于确保 UI 响应时间不超过 100ms
 */

class PerformanceMonitor {
  constructor() {
    this.marks = new Map()
    this.measures = new Map()
    this.thresholds = {
      uiResponse: 100, // UI 响应时间阈值 (ms)
      pageLoad: 500,   // 页面加载时间阈值 (ms)
      componentRender: 50 // 组件渲染时间阈值 (ms)
    }
  }

  /**
   * 开始性能标记
   * @param {string} name - 标记名称
   */
  startMark(name) {
    if (typeof performance !== 'undefined' && performance.mark) {
      try {
        performance.mark(`${name}-start`)
        this.marks.set(name, Date.now())
      } catch (error) {
        console.warn('Performance mark not supported:', error)
      }
    }
  }

  /**
   * 结束性能标记并测量
   * @param {string} name - 标记名称
   * @param {string} type - 性能类型 ('ui', 'page', 'component')
   * @returns {number} 测量时间 (ms)
   */
  endMark(name, type = 'ui') {
    if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
      try {
        performance.mark(`${name}-end`)

        const measureName = `${name}-measure`
        performance.measure(measureName, `${name}-start`, `${name}-end`)

        const measure = performance.getEntriesByName(measureName)[0]
        const duration = measure ? measure.duration : 0

        // 检查阈值
        this.checkThreshold(name, duration, type)

        // 清理性能条目
        performance.clearMarks(`${name}-start`)
        performance.clearMarks(`${name}-end`)
        performance.clearMeasures(measureName)

        this.measures.set(name, duration)
        return duration
      } catch (error) {
        console.warn('Performance measure not supported:', error)
        // 回退到 Date.now()
        const startTime = this.marks.get(name)
        if (startTime) {
          const duration = Date.now() - startTime
          this.checkThreshold(name, duration, type)
          this.measures.set(name, duration)
          return duration
        }
      }
    }

    // 回退方案
    const startTime = this.marks.get(name)
    if (startTime) {
      const duration = Date.now() - startTime
      this.checkThreshold(name, duration, type)
      this.measures.set(name, duration)
      return duration
    }

    return 0
  }

  /**
   * 检查性能阈值
   * @param {string} name - 性能名称
   * @param {number} duration - 持续时间 (ms)
   * @param {string} type - 性能类型
   */
  checkThreshold(name, duration, type) {
    let threshold = this.thresholds.uiResponse // 默认 UI 响应阈值

    switch (type) {
      case 'page':
        threshold = this.thresholds.pageLoad
        break
      case 'component':
        threshold = this.thresholds.componentRender
        break
      case 'ui':
      default:
        threshold = this.thresholds.uiResponse
        break
    }

    if (duration > threshold) {
      const message = `Performance warning: ${name} took ${duration}ms (threshold: ${threshold}ms)`
      console.warn(message)

      // 在开发环境下抛出错误
      if (process.env.NODE_ENV === 'development') {
        throw new Error(message)
      }

      // 可以在这里添加上报逻辑
      this.reportPerformanceIssue(name, duration, threshold, type)
    }
  }

  /**
   * 上报性能问题
   * @param {string} name - 性能名称
   * @param {number} duration - 持续时间
   * @param {number} threshold - 阈值
   * @param {string} type - 类型
   */
  reportPerformanceIssue(name, duration, threshold, type) {
    // TODO: 集成性能监控服务
    console.log(`Performance issue reported: ${name}`, {
      duration,
      threshold,
      type,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 测量函数执行时间
   * @param {Function} fn - 要测量的函数
   * @param {string} name - 性能名称
   * @param {string} type - 性能类型
   * @returns {*} 函数返回值
   */
  measureFunction(fn, name, type = 'ui') {
    this.startMark(name)
    try {
      const result = fn()
      // 如果是 Promise，等待完成
      if (result && typeof result.then === 'function') {
        return result.finally(() => {
          this.endMark(name, type)
        })
      } else {
        this.endMark(name, type)
        return result
      }
    } catch (error) {
      this.endMark(name, type)
      throw error
    }
  }

  /**
   * 测量异步函数执行时间
   * @param {Function} asyncFn - 要测量的异步函数
   * @param {string} name - 性能名称
   * @param {string} type - 性能类型
   * @returns {Promise} 函数返回值
   */
  async measureAsyncFunction(asyncFn, name, type = 'ui') {
    this.startMark(name)
    try {
      const result = await asyncFn()
      this.endMark(name, type)
      return result
    } catch (error) {
      this.endMark(name, type)
      throw error
    }
  }

  /**
   * 获取性能统计信息
   * @returns {Object} 性能统计
   */
  getStats() {
    return {
      marks: Array.from(this.marks.entries()),
      measures: Array.from(this.measures.entries()),
      thresholds: this.thresholds
    }
  }

  /**
   * 重置性能监控数据
   */
  reset() {
    this.marks.clear()
    this.measures.clear()
  }
}

// 创建全局实例
const performanceMonitor = new PerformanceMonitor()

// Vue 插件
const PerformancePlugin = {
  install(app) {
    app.config.globalProperties.$performance = performanceMonitor

    // 全局混入，监控组件渲染性能
    app.mixin({
      beforeCreate() {
        if (this.$options.name) {
          performanceMonitor.startMark(`${this.$options.name}-render`)
        }
      },

      mounted() {
        if (this.$options.name) {
          performanceMonitor.endMark(`${this.$options.name}-render`, 'component')
        }
      }
    })
  }
}

export default PerformanceMonitor
export { PerformancePlugin, performanceMonitor }
