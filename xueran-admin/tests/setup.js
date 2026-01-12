import { beforeAll, afterAll, afterEach } from 'vitest'
import { createApp } from 'vue'

// Mock uni-app APIs
global.uni = {
  getSystemInfoSync: () => ({
    platform: 'devtools',
    model: 'iPhone',
    system: 'iOS 10.0.1'
  }),
  getStorageSync: (key) => {
    return localStorage.getItem(key)
  },
  setStorageSync: (key, value) => {
    localStorage.setItem(key, value)
  },
  removeStorageSync: (key) => {
    localStorage.removeItem(key)
  },
  request: () => {},
  uploadFile: () => {},
  downloadFile: () => {},
  getLocation: () => {},
  showToast: () => {},
  showModal: () => {},
  showLoading: () => {},
  hideLoading: () => {},
  navigateTo: () => {},
  navigateBack: () => {},
  redirectTo: () => {},
  switchTab: () => {},
  reLaunch: () => {},
  getLocale: () => 'zh-CN'
}

// Mock performance monitoring
global.performance.mark = () => {}
global.performance.measure = () => {}
global.performance.getEntriesByName = () => []

// Setup Vue Test Utils
import { config } from '@vue/test-utils'
config.global.mocks = {
  $t: (key) => key,
  uni: global.uni
}

// Clean up after each test
afterEach(() => {
  localStorage.clear()
})
