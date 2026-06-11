<template>
  <div>
    <UCard>
      <template #header>
        <h3 class="text-base font-semibold">基本设置</h3>
      </template>

      <UForm :state="form" class="space-y-5">
        <UFormGroup label="系统名称" required description="显示在页面标题、侧边栏等位置">
          <UInput v-model="form.system_name" placeholder="如：Renhotec Academy" />
        </UFormGroup>

        <UFormGroup label="系统副标题" description="登录页、首页等位置的副标题">
          <UInput v-model="form.system_subtitle" placeholder="如：员工培训与考试系统" />
        </UFormGroup>

        <UFormGroup label="系统 LOGO" description="上传本地图片或输入图片 URL">
          <!-- 当前 LOGO 预览 -->
          <div v-if="form.system_logo" class="mb-3 flex items-center gap-3">
            <img :src="getFullUrl(form.system_logo)" alt="LOGO" class="w-12 h-12 rounded-lg object-contain border bg-white" />
            <UButton color="red" variant="ghost" icon="i-heroicons-x-mark" size="xs" label="移除" @click="removeLogo" />
          </div>

          <!-- 上传区域 -->
          <div
            v-if="!form.system_logo"
            @click="triggerUpload"
            @dragover.prevent="isDragging = true"
            @dragleave="isDragging = false"
            @drop.prevent="handleDrop"
            class="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all"
            :class="isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'"
          >
            <UIcon name="i-heroicons-photo" class="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p class="text-sm text-gray-600">
              拖拽图片到此处，或 <span class="text-primary-600 font-medium">点击选择</span>
            </p>
            <p class="text-xs text-gray-400 mt-1">支持 JPG、PNG、SVG，最大 2MB</p>
          </div>

          <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileSelect" />

          <!-- 上传进度 -->
          <div v-if="uploading" class="mt-3">
            <div class="flex items-center gap-2 text-sm text-gray-600">
              <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
              上传中...
            </div>
          </div>

          <!-- URL 输入（备选） -->
          <div class="mt-3">
            <p class="text-xs text-gray-400 mb-1">或直接输入图片 URL：</p>
            <UInput v-model="form.system_logo" placeholder="https://example.com/logo.png" />
          </div>
        </UFormGroup>
      </UForm>

      <template #footer>
        <div class="flex justify-end">
          <UButton label="保存设置" :loading="saving" @click="handleSave" />
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

const api = useApi()
const toast = useToast()
const settingsStore = useSettingsStore()

const saving = ref(false)
const uploading = ref(false)
const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const form = reactive({
  system_name: '',
  system_subtitle: '',
  system_logo: '',
})

// 将相对路径转为完整 URL
const getFullUrl = (path: string): string => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = `${window.location.protocol}//${window.location.hostname}:8000`
  return path.startsWith('/') ? `${base}${path}` : path
}

const loadSettings = async () => {
  try {
    const res = await api.get<any>('/admin/settings')
    form.system_name = res.data.system_name || ''
    form.system_subtitle = res.data.system_subtitle || ''
    form.system_logo = res.data.system_logo || ''
  } catch (e) {
    console.error('Failed to load settings:', e)
  }
}

const triggerUpload = () => { fileInput.value?.click() }

const handleDrop = (e: DragEvent) => {
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files?.length) uploadImage(files[0])
}

const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files?.length) uploadImage(input.files[0])
}

const uploadImage = async (file: File) => {
  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    toast.add({ title: '请选择图片文件', color: 'red' })
    return
  }
  // 验证文件大小 (2MB)
  if (file.size > 2 * 1024 * 1024) {
    toast.add({ title: '图片大小不能超过 2MB', color: 'red' })
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

    form.system_logo = res.data.path ? '/storage/' + res.data.path : res.data.url
    toast.add({ title: '图片上传成功', color: 'green' })
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '上传失败', color: 'red' })
  } finally {
    uploading.value = false
  }
}

const removeLogo = () => {
  form.system_logo = ''
}

const handleSave = async () => {
  saving.value = true
  try {
    await api.put('/admin/settings', {
      settings: [
        { key: 'system_name', value: form.system_name },
        { key: 'system_subtitle', value: form.system_subtitle },
        { key: 'system_logo', value: form.system_logo },
      ],
    })
    settingsStore.updateSettings({
      system_name: form.system_name,
      system_subtitle: form.system_subtitle,
      system_logo: form.system_logo,
    })
    toast.add({ title: '设置已保存', color: 'green' })
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '保存失败', color: 'red' })
  } finally {
    saving.value = false
  }
}

onMounted(loadSettings)
</script>
