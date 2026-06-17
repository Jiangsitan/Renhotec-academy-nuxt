<template>
  <div class="bg-white rounded-xl border border-gray-200 overflow-hidden select-none" @contextmenu.prevent>
    <!-- 工具栏 -->
    <div v-if="totalPages > 0" class="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
      <div class="flex items-center gap-2">
        <button
          @click="prevPage"
          :disabled="currentPage <= 1"
          class="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <UIcon name="i-heroicons-chevron-left" class="w-4 h-4" />
        </button>
        <span class="text-sm text-gray-600">
          {{ currentPage }} / {{ totalPages }}
        </span>
        <button
          @click="nextPage"
          :disabled="currentPage >= totalPages"
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

    <!-- PDF 渲染区域 -->
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
        <button @click="loadPdf" class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          刷新重试
        </button>
      </div>

      <!-- Canvas 容器 -->
      <div v-else class="flex justify-center py-4">
        <canvas
          ref="canvasRef"
          class="shadow-lg"
          :style="{ maxWidth: '100%' }"
        ></canvas>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

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

let pdfDoc: any = null
let destroyed = false

const loadPdf = async () => {
  loading.value = true
  error.value = ''

  // 验证 URL
  if (!props.url || props.url === '') {
    error.value = '文档 URL 无效'
    loading.value = false
    return
  }

  try {
    // 直接使用 URL 流式加载（不需要下载完整文件）
    const loadingTask = pdfjsLib.getDocument(props.url)
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
  } catch (e: any) {
    if (destroyed) return
    console.error('Failed to render page:', e)
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
  if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p')) {
    e.preventDefault()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  loadPdf()
})

onBeforeUnmount(() => {
  destroyed = true
  document.removeEventListener('keydown', handleKeydown)
  pdfDoc = null
})

watch(() => props.url, (newUrl) => {
  if (newUrl && !destroyed) loadPdf()
})
</script>
