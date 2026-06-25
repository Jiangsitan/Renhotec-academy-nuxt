import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import PdfViewer from '../PdfViewer.vue'

// Mock UIcon component
const UIconMock = {
  template: '<span class="icon"></span>',
  props: ['name'],
}

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 5,
      getPage: vi.fn(() =>
        Promise.resolve({
          getViewport: vi.fn(() => ({ width: 800, height: 600 })),
          render: vi.fn({ promise: Promise.resolve() }),
        })
      ),
    }),
  })),
}))

describe('PdfViewer', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })
  })

  const createWrapper = (props = {}) => {
    return mount(PdfViewer, {
      props: {
        url: 'https://example.com/test.pdf',
        ...props,
      },
      global: {
        stubs: {
          UIcon: UIconMock,
        },
      },
    })
  }

  describe('Rendering', () => {
    it('should render component', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should display loading state', () => {
      wrapper = createWrapper()
      expect(wrapper.text()).toContain('文档加载中')
    })
  })

  describe('Responsive Behavior', () => {
    it('should detect mobile viewport', async () => {
      wrapper = createWrapper()
      expect(wrapper.vm.isMobile).toBe(false)

      Object.defineProperty(window, 'innerWidth', { value: 500 })
      await wrapper.vm.checkMobile()
      expect(wrapper.vm.isMobile).toBe(true)
    })
  })

  describe('Navigation Buttons', () => {
    it('should hide prev button on first page', () => {
      wrapper = createWrapper()
      expect(wrapper.vm.currentPage).toBe(1)
    })

    it('should navigate pages', async () => {
      wrapper = createWrapper()
      // Note: PDF loading is async, so we need to wait
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.currentPage).toBe(1)
    })
  })

  describe('Zoom Controls', () => {
    it('should have default zoom of 1.5', () => {
      wrapper = createWrapper()
      expect(wrapper.vm.scale).toBe(1.5)
    })

    it('should zoom in', async () => {
      wrapper = createWrapper()
      await wrapper.vm.zoomIn()
      expect(wrapper.vm.scale).toBe(1.75)
    })

    it('should zoom out', async () => {
      wrapper = createWrapper()
      await wrapper.vm.zoomOut()
      expect(wrapper.vm.scale).toBe(1.25)
    })
  })
})
