<template>
  <div>
    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleSelect" />
    <UButton
      color="gray"
      variant="ghost"
      icon="i-heroicons-photo"
      size="xs"
      :loading="uploading"
      :label="label"
      @click="fileInput?.click()"
    />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  label?: string
  maxSize?: number
}>(), {
  label: '插入图片',
  maxSize: 10 * 1024 * 1024,
})

const emit = defineEmits<{
  uploaded: [url: string]
  error: [message: string]
}>()

const api = useApi()
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

const handleSelect = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (file.size > props.maxSize) {
    emit('error', `图片大小不能超过 ${Math.round(props.maxSize / 1024 / 1024)}MB`)
    return
  }

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'document')

    const res = await api.apiFetch<any>('/admin/upload/file', {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': undefined },
    })

    emit('uploaded', res.data.url)
  } catch (e: any) {
    emit('error', e?.data?.message || '图片上传失败')
  } finally {
    uploading.value = false
    input.value = ''
  }
}
</script>
