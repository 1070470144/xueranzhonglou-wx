import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DetailPage from '../../pages/detail/detail.vue'

// Mock uni-app APIs
global.uni = {
  navigateBack: vi.fn(),
  setClipboardData: vi.fn(),
  showToast: vi.fn()
}

describe('Detail Page', () => {
  it('should render correctly', () => {
    const wrapper = mount(DetailPage)
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('剧本详情')
  })

  describe('BackButton Icon Usage', () => {
    it('uses built-in uni-icons component', () => {
      const wrapper = mount(DetailPage)
      const icon = wrapper.find('uni-icons')
      expect(icon.exists()).toBe(true)
      const iconType = icon.attributes('type')
      // 允许多种内置类型作为兼容（'left' 为常见兼容类型）
      expect(['left', 'arrow-left', 'back', 'chevron-left'].includes(iconType)).toBe(true)
    })

    it('maintains icon system consistency', () => {
      const wrapper = mount(DetailPage)
      const icon = wrapper.find('uni-icons')
      // Verify icon uses built-in type, not custom images
      expect(icon.attributes('type')).toBeDefined()
      expect(icon.attributes('type')).not.toBe('')
      // Verify size is reasonable for built-in icons
      expect(icon.attributes('size')).toBe('24')
    })
  })

  it('should display image carousel', () => {
    const wrapper = mount(DetailPage)
    const carousel = wrapper.find('.image-carousel')
    expect(carousel.exists()).toBe(true)
  })

  it('should show image indicator', () => {
    const wrapper = mount(DetailPage)
    const indicator = wrapper.find('.image-indicator')
    expect(indicator.exists()).toBe(true)
    expect(indicator.text()).toContain('/')
  })

  it('should display script title and version', () => {
    const wrapper = mount(DetailPage)
    const title = wrapper.find('.script-title')
    const version = wrapper.find('.version-text')

    expect(title.text()).toBe('经典版血染钟楼')
    expect(version.text()).toBe('v1.0.0')
  })

  it('should show author information', () => {
    const wrapper = mount(DetailPage)
    const authorName = wrapper.find('.author-name')
    expect(authorName.text()).toBe('官方团队')
  })

  it('should display statistics', () => {
    const wrapper = mount(DetailPage)
    const statValues = wrapper.findAll('.stat-value')
    expect(statValues.length).toBe(3) // 下载、收藏、点赞

    // 检查数值格式化
    expect(wrapper.text()).toContain('1.5w') // 下载数
    expect(wrapper.text()).toContain('1.2k') // 收藏数
  })

  it('should show tags', () => {
    const wrapper = mount(DetailPage)
    const tags = wrapper.findAll('.tag')
    expect(tags.length).toBeGreaterThan(0)
    expect(tags.some(tag => tag.text().includes('经典'))).toBe(true)
  })

  it('should display description', () => {
    const wrapper = mount(DetailPage)
    const description = wrapper.find('.description-text')
    expect(description.exists()).toBe(true)
    expect(description.text()).toContain('经典版血染钟楼')
  })

  it('should have copy and download buttons', () => {
    const wrapper = mount(DetailPage)
    const copyBtn = wrapper.find('.copy-btn')
    const downloadBtn = wrapper.find('.download-btn')

    expect(copyBtn.exists()).toBe(true)
    expect(downloadBtn.exists()).toBe(true)
    expect(copyBtn.text()).toContain('复制JSON')
    expect(downloadBtn.text()).toContain('下载JSON')
  })

  it('should navigate back when back button is clicked', async () => {
    const wrapper = mount(DetailPage)
    const backBtn = wrapper.find('.back-btn')

    await backBtn.trigger('click')

    expect(uni.navigateBack).toHaveBeenCalled()
  })

  it('should copy JSON when copy button is clicked', async () => {
    const wrapper = mount(DetailPage)
    const copyBtn = wrapper.find('.copy-btn')

    uni.setClipboardData.mockImplementation((options) => {
      options.success()
    })

    await copyBtn.trigger('click')

    expect(uni.setClipboardData).toHaveBeenCalled()
    expect(uni.showToast).toHaveBeenCalledWith({
      title: 'JSON已复制到剪贴板',
      icon: 'success',
      duration: 2000
    })
  })

  it('should download JSON when download button is clicked', async () => {
    const wrapper = mount(DetailPage)
    const downloadBtn = wrapper.find('.download-btn')

    await downloadBtn.trigger('click')

    expect(uni.showToast).toHaveBeenCalledWith({
      title: 'JSON文件已准备下载',
      icon: 'success',
      duration: 2000
    })
  })

  it('should show loading state during copy', async () => {
    const wrapper = mount(DetailPage)
    const copyBtn = wrapper.find('.copy-btn')

    uni.setClipboardData.mockImplementation((options) => {
      // 模拟异步操作
      setTimeout(() => {
        options.success()
      }, 100)
    })

    copyBtn.trigger('click')

    // 检查加载状态
    expect(wrapper.vm.copying).toBe(true)
  })

  it('should show loading state during download', async () => {
    const wrapper = mount(DetailPage)
    const downloadBtn = wrapper.find('.download-btn')

    downloadBtn.trigger('click')

    // 检查加载状态
    expect(wrapper.vm.downloading).toBe(true)
  })

  it('should format numbers correctly', () => {
    const wrapper = mount(DetailPage)
    const vm = wrapper.vm

    expect(vm.formatNumber(15420)).toBe('1.5w')
    expect(vm.formatNumber(1234)).toBe('1.2k')
    expect(vm.formatNumber(500)).toBe('500')
  })

  it('should handle script ID from options', () => {
    const wrapper = mount(DetailPage, {
      global: {
        mocks: {
          $route: {
            query: { id: '123' }
          }
        }
      }
    })

    // 在实际的uni-app中，会通过onLoad接收options
    wrapper.vm.onLoad({ id: '123' })
    expect(wrapper.vm.scriptDetail.id).toBe('123')
  })
})
