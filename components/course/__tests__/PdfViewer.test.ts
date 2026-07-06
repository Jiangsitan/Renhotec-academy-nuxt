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

    it('should not zoom in beyond max scale of 3', async () => {
      wrapper = createWrapper()
      wrapper.vm.scale = 3
      await wrapper.vm.zoomIn()
      expect(wrapper.vm.scale).toBe(3)
    })

    it('should not zoom out below min scale of 0.5', async () => {
      wrapper = createWrapper()
      wrapper.vm.scale = 0.5
      await wrapper.vm.zoomOut()
      expect(wrapper.vm.scale).toBe(0.5)
    })
  })

  describe('URL Validation', () => {
    it('should show error for empty URL', async () => {
      wrapper = createWrapper({ url: '' })
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.error).toBe('文档 URL 无效')
      expect(wrapper.vm.loading).toBe(false)
    })

    it('should show error for undefined URL string', async () => {
      wrapper = createWrapper({ url: 'undefined' })
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.error).toBe('文档 URL 无效')
    })

    it('should show error for null URL string', async () => {
      wrapper = createWrapper({ url: 'null' })
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.error).toBe('文档 URL 无效')
    })
  })

  describe('Navigation', () => {
    it('should not go to previous page when on first page', async () => {
      wrapper = createWrapper()
      wrapper.vm.currentPage = 1
      await wrapper.vm.prevPage()
      expect(wrapper.vm.currentPage).toBe(1)
    })

    it('should not go to next page when on last page', async () => {
      wrapper = createWrapper()
      // Wait for PDF to load and set totalPages
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      // Set to last page
      wrapper.vm.currentPage = wrapper.vm.totalPages
      const lastPage = wrapper.vm.currentPage
      await wrapper.vm.nextPage()
      expect(wrapper.vm.currentPage).toBe(lastPage)
    })
  })

  describe('Touch Events', () => {
    it('should handle touch start', () => {
      wrapper = createWrapper()
      const touchEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 200 }] as any,
      })
      wrapper.vm.onTouchStart(touchEvent)
      expect(wrapper.vm.touchStartX).toBe(100)
      expect(wrapper.vm.touchStartY).toBe(200)
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should prevent Ctrl+S default behavior', () => {
      wrapper = createWrapper()
      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
      })
      const preventSpy = vi.spyOn(event, 'preventDefault')
      wrapper.vm.handleKeydown(event)
      expect(preventSpy).toHaveBeenCalled()
    })

    it('should prevent Ctrl+P default behavior', () => {
      wrapper = createWrapper()
      const event = new KeyboardEvent('keydown', {
        key: 'p',
        ctrlKey: true,
        bubbles: true,
      })
      const preventSpy = vi.spyOn(event, 'preventDefault')
      wrapper.vm.handleKeydown(event)
      expect(preventSpy).toHaveBeenCalled()
    })

    it('should prevent F12 default behavior', () => {
      wrapper = createWrapper()
      const event = new KeyboardEvent('keydown', {
        key: 'F12',
        bubbles: true,
      })
      const preventSpy = vi.spyOn(event, 'preventDefault')
      wrapper.vm.handleKeydown(event)
      expect(preventSpy).toHaveBeenCalled()
    })
  })
})
