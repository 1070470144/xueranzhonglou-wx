import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ExhibitionPage from '../../pages/exhibition/exhibition.vue'

// Mock uni-app APIs
global.uni = {
  navigateTo: vi.fn(),
  showToast: vi.fn()
}

describe('Exhibition Page', () => {
  it('should render correctly with script list', () => {
    const wrapper = mount(ExhibitionPage)
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('剧本展览')
  })

  it('should display search input', () => {
    const wrapper = mount(ExhibitionPage)
    const searchInput = wrapper.find('.search-input')
    expect(searchInput.exists()).toBe(true)
  })

  it('should render script cards', () => {
    const wrapper = mount(ExhibitionPage)
    const scriptCards = wrapper.findAll('.script-card')
    expect(scriptCards.length).toBeGreaterThan(0)
  })

  it('should display script information correctly', () => {
    const wrapper = mount(ExhibitionPage)
    const firstScriptCard = wrapper.find('.script-card')

    expect(firstScriptCard.text()).toContain('经典版血染钟楼')
    expect(firstScriptCard.text()).toContain('官方团队')
    expect(firstScriptCard.text()).toContain('v1.0.0')
  })

  it('should navigate to rankings page when rankings tab is clicked', async () => {
    const wrapper = mount(ExhibitionPage)
    const rankingsTab = wrapper.find('.nav-item').findAll('view')[1]

    await rankingsTab.trigger('click')

    expect(uni.navigateTo).toHaveBeenCalledWith({
      url: '/pages/rankings/rankings'
    })
  })

  it('should navigate to detail page when script card is clicked', async () => {
    const wrapper = mount(ExhibitionPage)
    const firstScriptCard = wrapper.find('.script-card')

    await firstScriptCard.trigger('click')

    expect(uni.navigateTo).toHaveBeenCalledWith({
      url: '/pages/detail/detail?id=1'
    })
  })

  it('should display bottom navigation', () => {
    const wrapper = mount(ExhibitionPage)
    const bottomNav = wrapper.find('.bottom-nav')
    expect(bottomNav.exists()).toBe(true)
    expect(bottomNav.text()).toContain('展览')
    expect(bottomNav.text()).toContain('排行')
  })

  it('should show image count indicator when multiple images', () => {
    const wrapper = mount(ExhibitionPage)
    const imageCount = wrapper.find('.image-count')
    // 第一个剧本有2张图片，应该显示图片计数
    expect(imageCount.exists()).toBe(true)
    expect(imageCount.text()).toBe('2/3')
  })

  it('should display script tags', () => {
    const wrapper = mount(ExhibitionPage)
    const tags = wrapper.findAll('.tag')
    expect(tags.length).toBeGreaterThan(0)
    expect(tags.some(tag => tag.text().includes('经典'))).toBe(true)
  })
})
