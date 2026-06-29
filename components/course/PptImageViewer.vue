<template>
  <div class="bg-white rounded-xl border border-gray-200 overflow-hidden select-none" @contextmenu.prevent>
    <!-- 工具栏 -->
    <div v-if="images.length > 0" class="flex items-center justify-between px-3 sm:px-4 py-2 bg-gray-50 border-b border-gray-200">
      <!-- 左侧占位 -->
      <div class="w-16 sm:w-20"></div>

      <!-- 中间页码 -->
      <span class="text-xs sm:text-sm text-gray-600 font-medium">
        {{ currentPage }} / {{ images.length }}
      </span>

      <!-- 右侧缩放控制 -->
      <div class="flex items-center gap-1 sm:gap-2">
        <button
          @click="zoomOut"
          :disabled="scale <= 0.5"
          class="p-1 sm:p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <UIcon name="i-heroicons-minus" class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
        <span class="text-xs sm:text-sm text-gray-600 min-w-[2.5rem] text-center">{{ Math.round(scale * 100) }}%</span>
        <button
          @click="zoomIn"
          :disabled="scale >= 3"
          class="p-1 sm:p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </div>

    <!-- 图片渲染区域 -->
    <div
      class="relative overflow-auto"
      :style="{ maxHeight: maxHeight }"
      @mouseenter="showNav = true"
      @mouseleave="showNav = false"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <!-- 加载状态 -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-gray-300 animate-spin" />
        <p class="text-sm text-gray-400 ml-3">文档加载中...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="flex flex-col items-center justify-center py-20">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-orange-400 mb-2" />
        <p class="text-sm text-gray-500 mb-4">加载失败，请联系管理员</p>
        <button @click="loadImages" class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          刷新重试
        </button>
      </div>

      <!-- 图片容器 -->
      <template v-else>
        <!-- 左侧翻页按钮 -->
        <Transition name="nav-btn">
          <button
            v-show="currentPage > 1 && (showNav || isMobile)"
            @click="prevPage"
            data-testid="prev-button"
            class="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-10
                   w-9 h-9 sm:w-10 sm:h-10
                   bg-white/70 hover:bg-white
                   rounded-full shadow-md hover:shadow-lg
                   flex items-center justify-center
                   transition-all duration-200
                   active:scale-95"
          >
            <UIcon name="i-heroicons-chevron-left" class="w-5 h-5 text-gray-600" />
          </button>
        </Transition>

        <div class="flex justify-center py-3 sm:py-4">
          <img
            v-if="currentImage"
            :src="currentImage"
            :style="{ transform: `scale(${scale})`, maxWidth: '100%' }"
            class="shadow-lg transition-transform duration-200"
            @load="onImageLoad"
            @error="onImageError"
          />
        </div>

        <!-- 右侧翻页按钮 -->
        <Transition name="nav-btn">
          <button
            v-show="currentPage < images.length && (showNav || isMobile)"
            @click="nextPage"
            data-testid="next-button"
            class="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-10
                   w-9 h-9 sm:w-10 sm:h-10
                   bg-white/70 hover:bg-white
                   rounded-full shadow-md hover:shadow-lg
                   flex items-center justify-center
                   transition-all duration-200
                   active:scale-95"
          >
            <UIcon name="i-heroicons-chevron-right" class="w-5 h-5 text-gray-600" />
          </button>
        </Transition>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  images: string[]
  maxHeight?: string
}>()

const loading = ref(true)
const error = ref('')
const currentPage = ref(1)
const scale = ref(1)
const imageLoaded = ref(false)

// 响应式状态
const showNav = ref(false)
const isMobile = ref(false)
const touchStartX = ref(0)
const touchStartY = ref(0)

// OSS 基础 URL
const ossBaseUrl = 'https://rh-wh.oss-cn-shanghai.aliyuncs.com'

// 将相对路径转换为完整 OSS URL
const getOssUrl = (path: string): string => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${ossBaseUrl}/${cleanPath}`
}

const currentImage = computed(() => {
  if (props.images && props.images.length > 0) {
    const path = props.images[currentPage.value - 1]
    return getOssUrl(path)
  }
  return null
})

const loadImages = () => {
  loading.value = true
  error.value = ''

  if (!props.images || props.images.length === 0) {
    error.value = '没有可显示的图片'
    loading.value = false
    return
  }

  loading.value = false
}

const onImageLoad = () => {
  imageLoaded.value = true
}

const onImageError = () => {
  error.value = '图片加载失败'
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    imageLoaded.value = false
  }
}

const nextPage = () => {
  if (currentPage.value < props.images.length) {
    currentPage.value++
    imageLoaded.value = false
  }
}

const zoomIn = () => {
  if (scale.value < 3) {
    scale.value = Math.min(3, scale.value + 0.25)
  }
}

const zoomOut = () => {
  if (scale.value > 0.5) {
    scale.value = Math.max(0.5, scale.value - 0.25)
  }
}

// 检测移动端
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

// 触摸事件处理
const onTouchStart = (e: TouchEvent) => {
  touchStartX.value = e.touches[0].clientX
  touchStartY.value = e.touches[0].clientY
}

const onTouchEnd = (e: TouchEvent) => {
  const dx = e.changedTouches[0].clientX - touchStartX.value
  const dy = e.changedTouches[0].clientY - touchStartY.value
  const minSwipeDistance = 30

  // 只处理水平滑动，忽略垂直滑动
  if (Math.abs(dx) < minSwipeDistance || Math.abs(dx) < Math.abs(dy)) {
    return
  }

  if (dx < 0) {
    nextPage() // 左滑下一页
  } else {
    prevPage() // 右滑上一页
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowLeft') prevPage()
  if (e.key === 'ArrowRight') nextPage()
  if (e.key === '+' || e.key === '=') zoomIn()
  if (e.key === '-') zoomOut()
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', checkMobile)
  checkMobile()
  loadImages()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', checkMobile)
})

watch(() => props.images, () => {
  if (props.images && props.images.length > 0) {
    loadImages()
  }
})
</script>

<style scoped>
.nav-btn-enter-active,
.nav-btn-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.nav-btn-enter-from,
.nav-btn-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
