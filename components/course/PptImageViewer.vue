<template>
  <div class="bg-white rounded-xl border border-gray-200 overflow-hidden select-none" @contextmenu.prevent>
    <!-- 工具栏 -->
    <div v-if="images.length > 0" class="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
      <div class="flex items-center gap-2">
        <button
          @click="prevPage"
          :disabled="currentPage <= 1"
          class="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <UIcon name="i-heroicons-chevron-left" class="w-4 h-4" />
        </button>
        <span class="text-sm text-gray-600">
          {{ currentPage }} / {{ images.length }}
        </span>
        <button
          @click="nextPage"
          :disabled="currentPage >= images.length"
          class="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
        </button>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="zoomOut"
          :disabled="scale <= 0.5"
          class="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <UIcon name="i-heroicons-minus" class="w-4 h-4" />
        </button>
        <span class="text-sm text-gray-600 min-w-[3rem] text-center">{{ Math.round(scale * 100) }}%</span>
        <button
          @click="zoomIn"
          :disabled="scale >= 3"
          class="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <UIcon name="i-heroicons-plus" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- 图片渲染区域 -->
    <div class="relative overflow-auto" :style="{ maxHeight: maxHeight }">
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
      <div v-else class="flex justify-center py-4">
        <img
          v-if="currentImage"
          :src="currentImage"
          :style="{ transform: `scale(${scale})`, maxWidth: '100%' }"
          class="shadow-lg transition-transform duration-200"
          @load="onImageLoad"
          @error="onImageError"
        />
      </div>
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

// OSS 基础 URL
const ossBaseUrl = 'https://rh-wh.oss-cn-shanghai.aliyuncs.com'

// 将相对路径转换为完整 OSS URL
const getOssUrl = (path: string): string => {
  if (!path) return ''
  // 如果已经是完整 URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  // 移除开头的斜杠
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

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowLeft') prevPage()
  if (e.key === 'ArrowRight') nextPage()
  if (e.key === '+' || e.key === '=') zoomIn()
  if (e.key === '-') zoomOut()
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  loadImages()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})

watch(() => props.images, () => {
  if (props.images && props.images.length > 0) {
    loadImages()
  }
})
</script>
