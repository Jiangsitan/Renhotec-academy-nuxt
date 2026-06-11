<template>
  <div class="bg-white rounded-xl border border-gray-200 p-4">
    <div class="flex items-center gap-3 mb-3">
      <div class="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center text-xl">
        {{ mode === 'preview' ? '👁️' : '📎' }}
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium truncate">{{ attachment.file_name }}</div>
        <div class="text-xs text-gray-400">{{ formatSize(attachment.file_size) }}<span v-if="mode === 'download'"> · 已下载 {{ attachment.download_count }} 次</span></div>
      </div>
    </div>

    <!-- 下载模式 -->
    <button
      v-if="mode === 'download'"
      @click="handleDownload"
      :disabled="downloading"
      class="w-full py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
    >
      {{ downloading ? '下载中...' : '下载附件' }}
    </button>

    <!-- 预览模式 -->
    <button
      v-else
      @click="handlePreview"
      class="w-full py-2.5 bg-white border border-primary-600 text-primary-600 text-sm font-medium rounded-lg hover:bg-primary-50 transition-colors"
    >
      在线预览
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  attachment: any
  mode?: 'download' | 'preview'
}>()

const api = useApi()
const toast = useToast()
const downloading = ref(false)

// 从父组件注入预览方法
const openAttachmentPreview = inject<(att: any) => void>('openAttachmentPreview')

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const handleDownload = async () => {
  downloading.value = true
  try {
    const res = await api.get<any>(`/attachments/${props.attachment.id}/download`)
    window.open(res.data.download_url, '_blank')
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '下载失败', color: 'red' })
  } finally {
    downloading.value = false
  }
}

const handlePreview = () => {
  if (openAttachmentPreview) {
    openAttachmentPreview(props.attachment)
  }
}
</script>
