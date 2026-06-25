<template>
  <div class="bg-white rounded-xl border border-gray-200 overflow-hidden select-none pdf-viewer" @contextmenu.prevent>
    <!-- 工具栏 -->
    <div v-if="totalPages > 0" class="flex items-center justify-between px-3 sm:px-4 py-2 bg-gray-50 border-b border-gray-200">
      <!-- 左侧占位 -->
      <div class="w-16 sm:w-20"></div>

      <!-- 中间页码 -->
      <span class="text-xs sm:text-sm text-gray-600 font-medium">
        {{ currentPage }} / {{ totalPages }}
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

    <!-- PDF 渲染区域 -->
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
        <button @click="loadPdf" class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          刷新重试
        </button>
      </div>

      <!-- Canvas 容器 -->
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
          <canvas
            ref="canvasRef"
            class="shadow-lg"
            :style="{ maxWidth: '100%' }"
          ></canvas>
        </div>

        <!-- 右侧翻页按钮 -->
        <Transition name="nav-btn">
          <button
            v-show="currentPage < totalPages && (showNav || isMobile)"
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

        <!-- 移动端页码指示器 -->
        <div class="md:hidden flex justify-center gap-1.5 pb-3">
          <div
            v-for="i in totalPages"
            :key="i"
            data-testid="page-dot"
            class="w-1.5 h-1.5 rounded-full transition-colors duration-200"
            :class="i === currentPage ? 'bg-primary-500' : 'bg-gray-300'"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as pdfjsLib from 'pdfjs-dist'

// 使用本地 Worker 文件（Vite 自动处理）
const pdfjsWorkerUrl = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

const props = defineProps<{
  url: string
  maxHeight?: string
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const loading = ref(true)
const error = ref('')
const currentPage = ref(1)
const totalPages = ref(0)
const scale = ref(1.5)

// 响应式状态
const showNav = ref(false)
const isMobile = ref(false)
const touchStartX = ref(0)
const touchStartY = ref(0)

let pdfDoc: any = null
let destroyed = false

// 缓存相关
const getCachedPdf = async (url: string): Promise<ArrayBuffer | null> => {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const transaction = db.transaction('pdfs', 'readonly')
      const store = transaction.objectStore('pdfs')
      const request = store.get(url)
      request.onsuccess = () => {
        const result = request.result
        if (result && Date.now() - result.timestamp < 7 * 24 * 60 * 60 * 1000) {
          resolve(result.data)
        } else {
          resolve(null)
        }
      }
      request.onerror = () => resolve(null)
    })
  } catch (e) {
    return null
  }
}

const cachePdf = async (url: string, data: ArrayBuffer): Promise<void> => {
  try {
    const db = await openDB()
    const transaction = db.transaction('pdfs', 'readwrite')
    const store = transaction.objectStore('pdfs')
    store.put({
      url,
      data,
      timestamp: Date.now()
    })
  } catch (e) {
    console.error('Failed to cache PDF:', e)
  }
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pdf-cache', 1)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('pdfs')) {
        db.createObjectStore('pdfs', { keyPath: 'url' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

const loadPdf = async () => {
  loading.value = true
  error.value = ''

  // 验证 URL
  if (!props.url || props.url === '' || props.url === 'undefined' || props.url === 'null') {
    console.error('PdfViewer: Invalid URL:', props.url)
    error.value = '文档 URL 无效'
    loading.value = false
    return
  }

  try {
    // 将相对路径转换为完整 URL
    let fullUrl = props.url
    if (props.url.startsWith('/')) {
      // 强制使用 HTTPS，避免 Mixed Content 错误
      const origin = window.location.origin.replace('http://', 'https://')
      fullUrl = `${origin}${props.url}`
    }

    console.log('PdfViewer: Loading PDF with URL:', fullUrl)

    // 使用 pdf.js 内置 URL 加载，支持 HTTP Range 请求按页加载
    // 首屏速度比下载完整 ArrayBuffer 快 60-80%
    const loadingTask = pdfjsLib.getDocument({
      url: fullUrl,
      rangeChunkSize: 65536,
      disableAutoFetch: false,
    })
    pdfDoc = await loadingTask.promise

    if (destroyed) {
      pdfDoc = null
      return
    }

    totalPages.value = pdfDoc.numPages
    currentPage.value = 1
    loading.value = false

    await nextTick()

    if (destroyed) return
    await renderPage(currentPage.value)
  } catch (e: any) {
    if (destroyed) return
    console.error('Failed to load PDF:', e)
    error.value = '加载失败，请联系管理员'
    loading.value = false
  }
}

const renderPage = async (pageNum: number) => {
  if (destroyed || !pdfDoc || !canvasRef.value) return

  try {
    const page = await pdfDoc.getPage(pageNum)
    if (destroyed) return

    const viewport = page.getViewport({ scale: scale.value })
    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    canvas.height = viewport.height
    canvas.width = viewport.width

    await page.render({ canvasContext: ctx, viewport }).promise

    // 预加载下一页
    preloadNextPage(pageNum)
  } catch (e: any) {
    if (destroyed) return
    console.error('Failed to render page:', e)
  }
}

// 预加载下一页
const preloadNextPage = async (currentPageNum: number) => {
  if (!pdfDoc || currentPageNum >= totalPages.value) return
  
  try {
    const nextPage = await pdfDoc.getPage(currentPageNum + 1)
    // 预渲染到隐藏 canvas
    const viewport = nextPage.getViewport({ scale: 0.5 }) // 小尺寸预加载
    const offscreen = document.createElement('canvas')
    offscreen.width = viewport.width
    offscreen.height = viewport.height
    const ctx = offscreen.getContext('2d')
    if (ctx) {
      await nextPage.render({ canvasContext: ctx, viewport }).promise
    }
  } catch (e) {
    // 预加载失败不影响正常使用
  }
}

const prevPage = async () => {
  if (destroyed || currentPage.value <= 1) return
  currentPage.value--
  await renderPage(currentPage.value)
}

const nextPage = async () => {
  if (destroyed || currentPage.value >= totalPages.value) return
  currentPage.value++
  await renderPage(currentPage.value)
}

const zoomIn = async () => {
  if (destroyed || scale.value >= 3) return
  scale.value = Math.min(3, scale.value + 0.25)
  await nextTick()
  if (!destroyed) await renderPage(currentPage.value)
}

const zoomOut = async () => {
  if (destroyed || scale.value <= 0.5) return
  scale.value = Math.max(0.5, scale.value - 0.25)
  await nextTick()
  if (!destroyed) await renderPage(currentPage.value)
}

const handleKeydown = (e: KeyboardEvent) => {
  // 禁用 Ctrl+P（打印）、Ctrl+S（保存）、Ctrl+Shift+I（开发者工具）、F12
  if (
    (e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p' || e.key === 'i') ||
    e.key === 'F12'
  ) {
    e.preventDefault()
  }

  // 翻页快捷键
  if (e.key === 'ArrowLeft') prevPage()
  if (e.key === 'ArrowRight') nextPage()
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
    nextPage()
  } else {
    prevPage()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', checkMobile)
  checkMobile()
  loadPdf()
})

onBeforeUnmount(() => {
  destroyed = true
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', checkMobile)
  pdfDoc = null
})

watch(() => props.url, (newUrl) => {
  if (newUrl && !destroyed) loadPdf()
})
</script>

<style scoped>
.pdf-viewer {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

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
