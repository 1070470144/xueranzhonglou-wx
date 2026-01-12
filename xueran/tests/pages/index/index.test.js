import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import IndexPage from '../../pages/index/index.vue'

describe('Index Page', () => {
  it('should render correctly', () => {
    const wrapper = mount(IndexPage)
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('Hello')
  })

  it('should have logo image', () => {
    const wrapper = mount(IndexPage)
    const img = wrapper.find('.logo')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('/static/logo.png')
  })

  it('should have correct title', () => {
    const wrapper = mount(IndexPage)
    const title = wrapper.find('.title')
    expect(title.exists()).toBe(true)
    expect(title.text()).toBe('Hello')
  })

  // Performance test
  it('should render within 100ms', async () => {
    const startTime = performance.now()
    const wrapper = mount(IndexPage)
    await wrapper.vm.$nextTick()
    const endTime = performance.now()
    const renderTime = endTime - startTime

    expect(renderTime).toBeLessThan(100)
  })
})
