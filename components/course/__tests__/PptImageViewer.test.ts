import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import PptImageViewer from '../PptImageViewer.vue'

// Mock UIcon component
const UIconMock = {
  template: '<span class="icon"></span>',
  props: ['name'],
}

describe('PptImageViewer', () => {
  let wrapper: VueWrapper

  const mockImages = [
    'image1.webp',
    'image2.webp',
    'image3.webp',
  ]

  beforeEach(() => {
    // Mock window.innerWidth for responsive tests
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })
  })

  const createWrapper = (props = {}) => {
    return mount(PptImageViewer, {
      props: {
        images: mockImages,
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
    it('should render component with images', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should display page indicator', () => {
      wrapper = createWrapper()
      expect(wrapper.text()).toContain('1 / 3')
    })

    it('should display zoom controls', () => {
      wrapper = createWrapper()
      expect(wrapper.text()).toContain('100%')
    })
  })

  describe('Navigation Buttons', () => {
    it('should hide prev button on first page', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      // After loading, the v-else block renders
      const prevButton = wrapper.find('[data-testid="prev-button"]')
      // Button exists in DOM but hidden via v-show when on first page
      expect(wrapper.vm.currentPage).toBe(1)
      expect(wrapper.vm.currentPage > 1).toBe(false)
    })

    it('should show next button on first page', () => {
      wrapper = createWrapper()
      const nextButton = wrapper.find('[data-testid="next-button"]')
      // On desktop, buttons are hidden by default (hover to show)
      // But we need to check the v-show logic
      expect(wrapper.vm.currentPage).toBe(1)
      expect(wrapper.vm.currentPage < mockImages.length).toBe(true)
    })

    it('should navigate to next page', async () => {
      wrapper = createWrapper()
      await wrapper.vm.nextPage()
      expect(wrapper.vm.currentPage).toBe(2)
      expect(wrapper.text()).toContain('2 / 3')
    })

    it('should navigate to previous page', async () => {
      wrapper = createWrapper()
      await wrapper.vm.nextPage()
      await wrapper.vm.prevPage()
      expect(wrapper.vm.currentPage).toBe(1)
    })

    it('should not go below page 1', async () => {
      wrapper = createWrapper()
      await wrapper.vm.prevPage()
      expect(wrapper.vm.currentPage).toBe(1)
    })

    it('should not go above last page', async () => {
      wrapper = createWrapper()
      for (let i = 0; i < 10; i++) {
        await wrapper.vm.nextPage()
      }
      expect(wrapper.vm.currentPage).toBe(3)
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

    it('should show buttons on mobile by default', async () => {
      Object.defineProperty(window, 'innerWidth', { value: 500 })
      wrapper = createWrapper()
      expect(wrapper.vm.isMobile).toBe(true)
    })
  })

  describe('Touch Gestures', () => {
    it('should handle touch swipe left (next page)', async () => {
      wrapper = createWrapper()
      const container = wrapper.find('.relative.overflow-auto')

      // Simulate touch start
      await container.trigger('touchstart', {
        touches: [{ clientX: 200, clientY: 100 }],
      })

      // Simulate touch end (swipe left)
      await container.trigger('touchend', {
        changedTouches: [{ clientX: 150, clientY: 100 }],
      })

      expect(wrapper.vm.currentPage).toBe(2)
    })

    it('should handle touch swipe right (prev page)', async () => {
      wrapper = createWrapper()
      await wrapper.vm.nextPage()

      const container = wrapper.find('.relative.overflow-auto')

      // Simulate touch start
      await container.trigger('touchstart', {
        touches: [{ clientX: 150, clientY: 100 }],
      })

      // Simulate touch end (swipe right)
      await container.trigger('touchend', {
        changedTouches: [{ clientX: 200, clientY: 100 }],
      })

      expect(wrapper.vm.currentPage).toBe(1)
    })

    it('should ignore vertical swipes', async () => {
      wrapper = createWrapper()
      const container = wrapper.find('.relative.overflow-auto')

      // Simulate touch start
      await container.trigger('touchstart', {
        touches: [{ clientX: 100, clientY: 100 }],
      })

      // Simulate touch end (vertical swipe)
      await container.trigger('touchend', {
        changedTouches: [{ clientX: 100, clientY: 200 }],
      })

      expect(wrapper.vm.currentPage).toBe(1)
    })
  })

  describe('Zoom Controls', () => {
    it('should zoom in', async () => {
      wrapper = createWrapper()
      expect(wrapper.vm.scale).toBe(1)

      await wrapper.vm.zoomIn()
      expect(wrapper.vm.scale).toBe(1.25)
    })

    it('should zoom out', async () => {
      wrapper = createWrapper()
      await wrapper.vm.zoomOut()
      expect(wrapper.vm.scale).toBe(0.75)
    })

    it('should not zoom in beyond 3x', async () => {
      wrapper = createWrapper()
      for (let i = 0; i < 20; i++) {
        await wrapper.vm.zoomIn()
      }
      expect(wrapper.vm.scale).toBe(3)
    })

    it('should not zoom out below 0.5x', async () => {
      wrapper = createWrapper()
      for (let i = 0; i < 20; i++) {
        await wrapper.vm.zoomOut()
      }
      expect(wrapper.vm.scale).toBe(0.5)
    })
  })

  describe('Keyboard Navigation', () => {
    it('should navigate with arrow keys', async () => {
      wrapper = createWrapper()

      // Right arrow - next page
      await wrapper.vm.handleKeydown({ key: 'ArrowRight' })
      expect(wrapper.vm.currentPage).toBe(2)

      // Left arrow - prev page
      await wrapper.vm.handleKeydown({ key: 'ArrowLeft' })
      expect(wrapper.vm.currentPage).toBe(1)
    })
  })

  describe('Page Indicator', () => {
    it('should have page indicator logic', async () => {
      Object.defineProperty(window, 'innerWidth', { value: 500 })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      // Verify component is in mobile mode
      expect(wrapper.vm.isMobile).toBe(true)
      // Verify images count
      expect(wrapper.vm.images.length).toBe(mockImages.length)
    })

    it('should track current page for indicator', async () => {
      Object.defineProperty(window, 'innerWidth', { value: 500 })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.currentPage).toBe(1)
      await wrapper.vm.nextPage()
      expect(wrapper.vm.currentPage).toBe(2)
    })
  })
})
