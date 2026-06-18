<template>
  <div>
    <!-- PDF 预览（Office 文件已转换为 PDF） -->
    <PdfViewer 
      v-if="pdfUrl" 
      :url="pdfUrl" 
      :max-height="maxHeight"
    />
    
    <!-- 加载状态 -->
    <div v-else-if="loading" class="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-gray-300 animate-spin mx-auto" />
      <p class="text-sm text-gray-400 mt-2">文档加载中...</p>
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

const loading = ref(true)
const error = ref('')
const pdfUrl = ref('')

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
const isPdfFile = computed(() => ext.value === 'pdf')

const loadPreview = async () => {
  loading.value = true
  error.value = ''
  pdfUrl.value = ''

  try {
    // 如果是 PDF 文件（根据 url 或 fileName 判断），直接预览
    if (isPdfFile.value || props.url?.endsWith('.pdf')) {
      pdfUrl.value = props.url
      loading.value = false
      return
    }

    // 如果是 Office 文件，调用 preview-office 接口
    if (isOfficeFile.value) {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/files/preview-office/${props.url}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })
      const data = await res.json()

      if (data.data?.redirect) {
        // 重定向到 PDF 预览
        pdfUrl.value = data.data.redirect
      } else if (data.data?.error) {
        error.value = data.data.message || '文档转换中，请稍后再试'
      } else {
        error.value = '加载失败，请联系管理员'
      }
    } else {
      error.value = '该文件类型不支持预览'
    }
  } catch (e) {
    console.error('Failed to load preview:', e)
    error.value = '加载失败，请联系管理员'
  } finally {
    loading.value = false
  }
}

onMounted(loadPreview)

watch(() => props.url, () => {
  if (props.url) loadPreview()
})
</script>
