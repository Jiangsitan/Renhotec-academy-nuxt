<template>
  <div>
    <!-- PDF 预览（Office 文件已转换为 PDF） -->
    <PdfViewer 
      v-if="pdfUrl" 
      :url="pdfUrl" 
      :max-height="maxHeight"
    />

    <!-- 客户端 DOCX 渲染（docx-preview 或 mammoth.js） -->
    <div 
      v-else-if="docxReady" 
      class="bg-white rounded-xl border border-gray-200 overflow-auto docx-content"
      :style="{ maxHeight: maxHeight || '80vh' }"
    >
      <!-- docx-preview 渲染容器 -->
      <div ref="docxPreviewContainer" />
      <!-- mammoth.js 渲染内容（兜底） -->
      <div v-if="docxHtml" v-html="docxHtml" />
    </div>
    
    <!-- 加载状态 -->
    <div v-else-if="loading" class="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-gray-300 animate-spin mx-auto" />
      <p class="text-sm text-gray-400 mt-2">{{ loadingMessage }}</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-orange-400 mb-2" />
      <p class="text-sm text-gray-500 mb-4">{{ error }}</p>
      <button @click="loadPreview" class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
        刷新重试
      </button>
    </div>

    <!-- 不支持的文件类型 -->
    <div v-else class="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <UIcon name="i-heroicons-document" class="w-8 h-8 text-gray-400 mb-2" />
      <p class="text-sm text-gray-500">该文件类型不支持预览</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  url: string
  fileName: string
  maxHeight?: string
}>()

const { getApiUrl } = useApi()

const loading = ref(true)
const error = ref('')
const pdfUrl = ref('')
const docxHtml = ref('')
const docxReady = ref(false)
const docxPreviewContainer = ref<HTMLDivElement | null>(null)
const loadingMessage = ref('文档加载中...')

const ext = computed(() => {
  // 优先从 url 判断，因为 url 是实际文件路径
  const urlPath = props.url || ''
  const urlExt = urlPath.split('.').pop()?.toLowerCase() || ''
  if (urlExt === 'pdf') return 'pdf'
  
  // 如果 url 不是 pdf，则从 fileName 判断
  const name = props.fileName || ''
  return name.split('.').pop()?.toLowerCase() || ''
})

const isOfficeFile = computed(() => ['docx', 'doc', 'xlsx', 'xls', 'odt', 'ods', 'odp'].includes(ext.value))
const isDocxFile = computed(() => ['docx', 'doc'].includes(ext.value))
const isPdfFile = computed(() => ext.value === 'pdf')

const loadPreview = async () => {
  loading.value = true
  error.value = ''
  pdfUrl.value = ''
  docxHtml.value = ''
  docxReady.value = false
  loadingMessage.value = '文档加载中...'

  try {
    // 如果是 PDF 文件（根据 url 或 fileName 判断），直接预览
    if (isPdfFile.value || props.url?.endsWith('.pdf')) {
      pdfUrl.value = props.url
      loading.value = false
      return
    }

    // 如果是 Office 文件，调用 preview-office 接口
    if (isOfficeFile.value) {
      try {
        loadingMessage.value = '正在转换文档...'
        const data = await $fetch<{ data?: { redirect?: string; error?: boolean; message?: string } }>(
          getApiUrl(`/files/preview-office/${props.url}`),
          {
            headers: {
              'Accept': 'application/json'
            }
          }
        )

        if (data.data?.redirect) {
          // 重定向到 PDF 预览
          pdfUrl.value = data.data.redirect
          loading.value = false
          return
        }
      } catch (e: any) {
        // 服务器转换失败或接口不可用，继续尝试客户端渲染
        console.warn('Server-side conversion failed, trying client-side fallback:', e)
      }

      // 服务器转换失败，尝试客户端 DOCX 渲染
      if (isDocxFile.value) {
        await loadDocxClientSide()
      } else {
        error.value = '文档转换中，请稍后再试'
        loading.value = false
      }
    } else {
      error.value = '该文件类型不支持预览'
      loading.value = false
    }
  } catch (e) {
    console.error('Failed to load preview:', e)
    error.value = '加载失败，请联系管理员'
    loading.value = false
  }
}

/**
 * 客户端渲染 DOCX（docx-preview 优先，mammoth.js 兜底）
 */
const loadDocxClientSide = async () => {
  try {
    loadingMessage.value = '正在加载文档预览...'

    // 获取文件内容（通过 preview 接口或 OSS 直接 URL）
    let arrayBuffer: ArrayBuffer

    try {
      // 尝试通过认证接口获取文件
      const response = await fetch(getApiUrl(`/files/preview/${props.url}`), {
        headers: {
          'Authorization': `Bearer ${useAuthStore().token}`,
          'Accept': '*/*'
        }
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      arrayBuffer = await response.arrayBuffer()
    } catch {
      // 回退：直接从 OSS 获取（可能需要签名 URL）
      console.warn('Authenticated fetch failed, trying direct URL')
      const response = await fetch(props.url)
      arrayBuffer = await response.arrayBuffer()
    }

    // 优先使用 docx-preview 渲染
    try {
      const { renderAsync } = await import('docx-preview')
      
      if (docxPreviewContainer.value) {
        await renderAsync(
          arrayBuffer,
          docxPreviewContainer.value,
          undefined,
          {
            className: 'docx-preview-content',
            inWrapper: true,
            ignoreFonts: false,
            breakPages: true,
            ignoreLastRenderedPageBreak: true,
            experimental: true
          }
        )
        docxReady.value = true
        loading.value = false
        return
      }
    } catch (e) {
      console.warn('docx-preview failed, falling back to mammoth.js:', e)
    }

    // docx-preview 失败，使用 mammoth.js 兜底
    const mammoth = await import('mammoth')
    const result = await mammoth.convertToHtml({ arrayBuffer })
    
    if (result.value) {
      docxHtml.value = result.value
      docxReady.value = true
    } else {
      error.value = '文档内容为空'
    }

    // 输出警告信息（如有）
    if (result.messages?.length > 0) {
      console.warn('Mammoth conversion warnings:', result.messages)
    }
  } catch (e) {
    console.error('Client-side DOCX rendering failed:', e)
    error.value = '文档预览失败，请稍后再试'
  } finally {
    loading.value = false
  }
}

onMounted(loadPreview)

watch(() => props.url, () => {
  if (props.url) loadPreview()
})
</script>

<style scoped>
.docx-content {
  padding: 2rem;
  line-height: 1.6;
  font-size: 14px;
}

.docx-content :deep(h1) {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 1rem 0;
}

.docx-content :deep(h2) {
  font-size: 1.25rem;
  font-weight: bold;
  margin: 0.75rem 0;
}

.docx-content :deep(h3) {
  font-size: 1.1rem;
  font-weight: bold;
  margin: 0.5rem 0;
}

.docx-content :deep(p) {
  margin: 0.5rem 0;
}

.docx-content :deep(ul),
.docx-content :deep(ol) {
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

.docx-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1rem 0;
}

.docx-content :deep(th),
.docx-content :deep(td) {
  border: 1px solid #e5e7eb;
  padding: 0.5rem;
  text-align: left;
}

.docx-content :deep(th) {
  background-color: #f9fafb;
  font-weight: 600;
}

.docx-content :deep(img) {
  max-width: 100%;
  height: auto;
}

.docx-content :deep(blockquote) {
  border-left: 4px solid #e5e7eb;
  padding-left: 1rem;
  margin: 0.5rem 0;
  color: #6b7280;
}

/* docx-preview 渲染内容样式 */
.docx-preview-content {
  padding: 0;
  line-height: 1.6;
  font-size: 14px;
}

.docx-preview-content :deep(.docx) {
  background: white;
  padding: 2rem;
}

.docx-preview-content :deep(img) {
  max-width: 100%;
  height: auto;
}
</style>
