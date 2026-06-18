<template>
  <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
    <!-- 加载状态 -->
    <div v-if="loading" class="p-12 text-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-gray-300 animate-spin mx-auto" />
      <p class="text-sm text-gray-400 mt-2">文档加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="p-12 text-center">
      <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-orange-400 mb-2" />
      <p class="text-sm text-gray-500 mb-4">加载失败，请联系管理员</p>
      <button @click="loadPreview" class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
        刷新重试
      </button>
    </div>

    <!-- Office 预览 -->
    <div v-else class="relative" style="height: 700px;">
      <iframe
        v-if="previewUrl"
        :src="previewUrl"
        style="width: 100%; height: 100%; border: none;"
        allowfullscreen
      ></iframe>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  url: string
  fileName: string
}>()

const loading = ref(true)
const error = ref('')
const previewUrl = ref('')

const ext = computed(() => {
  const name = props.fileName || ''
  return name.split('.').pop()?.toLowerCase() || ''
})

const isOfficeFile = computed(() => ['docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls'].includes(ext.value))

const loadPreview = async () => {
  if (!isOfficeFile.value) {
    loading.value = false
    return
  }

  loading.value = true
  error.value = ''
  previewUrl.value = ''

  try {
    // content_url 格式: academy/dev/documents/xxx.pptx
    const path = props.url

    // 使用相对路径，添加认证 token
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/files/preview-office/${path}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })
    const data = await res.json()

    if (data.data?.preview_url) {
      previewUrl.value = data.data.preview_url
    } else {
      error.value = data.data?.message || '加载失败，请联系管理员'
    }
  } catch (e) {
    console.error('Failed to load office preview:', e)
    error.value = '加载失败，请联系管理员'
  } finally {
    loading.value = false
  }
}

onMounted(loadPreview)
</script>
