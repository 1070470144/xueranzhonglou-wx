import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import RankingsPage from '../../pages/rankings/rankings.vue'

// Mock uni-app APIs
global.uni = {
  navigateBack: vi.fn(),
  navigateTo: vi.fn(),
  showToast: vi.fn()
}

describe('Rankings Page', () => {
  it('should render correctly', () => {
    const wrapper = mount(RankingsPage)
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('剧本排行榜')
  })

  it('should display tab bar with three tabs', () => {
    const wrapper = mount(RankingsPage)
    const tabs = wrapper.findAll('.tab-item')
    expect(tabs.length).toBe(2)
    expect(wrapper.text()).toContain('使用榜')
    expect(wrapper.text()).toContain('点赞榜')
  })

  it('should show downloads tab as active by default', () => {
    const wrapper = mount(RankingsPage)
    const activeTab = wrapper.find('.tab-item.active')
    expect(activeTab.text()).toContain('使用榜')
  })

  it('should switch tabs when clicked', async () => {
    const wrapper = mount(RankingsPage)
    const likesTab = wrapper.findAll('.tab-item')[1] // 点赞榜

    await likesTab.trigger('click')

    expect(wrapper.vm.currentTab).toBe(1)
  })

  it('should display ranking items', () => {
    const wrapper = mount(RankingsPage)
    const rankingItems = wrapper.findAll('.ranking-item')
    expect(rankingItems.length).toBeGreaterThan(0)
  })

  it('should show rank numbers and medals for top 3', () => {
    const wrapper = mount(RankingsPage)
    const firstItem = wrapper.find('.ranking-item')
    const rankNumber = firstItem.find('.rank-number')

    // 第一个应该是金牌样式
    expect(rankNumber.classes()).toContain('rank-1')
  })

  it('should display correct stat values', () => {
    const wrapper = mount(RankingsPage)
    const statValues = wrapper.findAll('.stat-value')
    expect(statValues.length).toBeGreaterThan(0)
  })

  it('should format large numbers correctly', () => {
    const wrapper = mount(RankingsPage)
    const vm = wrapper.vm

    expect(vm.formatNumber(15420)).toBe('1.5w')
    expect(vm.formatNumber(1234)).toBe('1.2k')
    expect(vm.formatNumber(500)).toBe('500')
  })

  it('should navigate back when back button is clicked', async () => {
    const wrapper = mount(RankingsPage)
    const backBtn = wrapper.find('.back-btn')

    await backBtn.trigger('click')

    expect(uni.navigateBack).toHaveBeenCalled()
  })

  it('should navigate to detail page when ranking item is clicked', async () => {
    const wrapper = mount(RankingsPage)
    const firstItem = wrapper.find('.ranking-item')

    await firstItem.trigger('click')

    expect(uni.navigateTo).toHaveBeenCalledWith({
      url: '/pages/detail/detail?id=1'
    })
  })

  it('should display thumbnails', () => {
    const wrapper = mount(RankingsPage)
    const thumbnails = wrapper.findAll('.thumbnail-image')
    expect(thumbnails.length).toBeGreaterThan(0)
  })

  it('should show different data for different tabs', async () => {
    const wrapper = mount(RankingsPage)

    // 默认是使用榜
    expect(wrapper.vm.currentRankingList).toBe(wrapper.vm.downloadsList)

    // 切换到点赞榜
    const likesTab = wrapper.findAll('.tab-item')[1]
    await likesTab.trigger('click')

    expect(wrapper.vm.currentRankingList).toBe(wrapper.vm.likesList)
  })
})
