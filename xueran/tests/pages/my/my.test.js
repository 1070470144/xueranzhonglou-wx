import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import MyPage from '../../pages/my/my.vue'

global.uni = {
  getStorageSync: vi.fn(),
  navigateTo: vi.fn(),
  showToast: vi.fn()
}

describe('My Page', () => {
  it('renders and shows submission item', () => {
    const wrapper = mount(MyPage)
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('投稿要求')
  })

  it('opens info panel when item clicked', async () => {
    const wrapper = mount(MyPage)
    const item = wrapper.find('.item')
    await item.trigger('click')
    // panelVisible should be true
    expect(wrapper.vm.panelVisible).toBe(true)
    // panel content should include placeholder text
    expect(wrapper.text()).toContain('内容暂定')
  })
})


