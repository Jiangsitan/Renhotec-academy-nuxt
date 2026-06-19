<template>
  <div>
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <UInput v-model="filters.keyword" placeholder="搜索课程标题..." icon="i-heroicons-magnifying-glass" class="w-64" @update:model-value="debouncedLoad" />
      <USelect v-model="filters.series_id" :options="seriesFilterOptions" placeholder="系列筛选" class="w-48" @change="loadCourses(1)" />
      <USelect v-model="filters.status" :options="statusOptions" placeholder="状态" class="w-28" @change="loadCourses(1)" />
      <div class="flex-1" />
      <UButton color="gray" icon="i-heroicons-arrow-up-tray" label="批量导入" @click="showImportModal = true" />
      <UButton icon="i-heroicons-plus" label="添加课程" @click="openModal()" />
    </div>

    <UCard>
      <UTable :rows="courses" :columns="columns" :loading="loading">
        <template #type-data="{ row }">
          <UBadge :label="row.type === 'video' ? '视频' : '文档'" :color="row.type === 'video' ? 'blue' : 'green'" variant="subtle" />
        </template>
        <template #content_source-data="{ row }">
          <UBadge :label="row.content_source === 'local' ? '本地' : '在线'" :color="row.content_source === 'local' ? 'orange' : 'gray'" variant="subtle" size="xs" />
        </template>
        <template #series-data="{ row }">
          <span class="text-xs text-gray-500">{{ row.series?.name ?? '-' }}</span>
        </template>
        <template #status-data="{ row }">
          <UBadge :label="statusLabel(row.status)" :color="statusColor(row.status)" variant="subtle" />
        </template>
        <template #actions-data="{ row }">
          <div class="flex items-center gap-1">
            <UButton color="gray" variant="ghost" icon="i-heroicons-pencil" size="xs" @click="openModal(row)" />
            <UButton v-if="row.status === 'draft'" color="green" variant="ghost" icon="i-heroicons-arrow-up" size="xs" label="发布" @click="updateStatus(row, 'published')" />
            <UButton v-if="row.status === 'published'" color="orange" variant="ghost" icon="i-heroicons-arrow-down" size="xs" label="取消发布" @click="updateStatus(row, 'draft')" />
            <UButton color="red" variant="ghost" icon="i-heroicons-trash" size="xs" @click="handleDelete(row)" />
          </div>
        </template>
      </UTable>
      <template #footer>
        <div class="flex justify-end">
          <UPagination v-model="currentPage" :total="total" :page-count="perPage" @update:model-value="loadCourses" />
        </div>
      </template>
    </UCard>

    <!-- 创建/编辑课程弹窗 -->
    <UModal v-model="showModal" :prevent-close="saving">
      <UCard class="max-w-2xl">
        <template #header>
          <h3 class="text-base font-semibold">{{ editing ? '编辑课程' : '添加课程' }}</h3>
        </template>
        <UForm :state="form" class="space-y-5">
          <!-- 基本信息 -->
          <UFormGroup label="课程标题" required>
            <UInput v-model="form.title" placeholder="如：第1集：产品概览" />
          </UFormGroup>
          <UFormGroup label="课程简介">
            <UTextarea v-model="form.description" placeholder="课程简介" :rows="2" />
          </UFormGroup>
          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="所属系列" required>
              <USelect v-model="form.series_id" :options="seriesOptions" placeholder="选择系列" />
            </UFormGroup>
            <UFormGroup label="绑定导师" description="可选，绑定后导师可直接考试">
              <USelect v-model="form.mentor_id" :options="mentorOptions" placeholder="选择导师" />
            </UFormGroup>
          </div>
          <UFormGroup label="内容类型" required>
            <USelect v-model="form.type" :options="[{ label: '视频', value: 'video' }, { label: '文档', value: 'document' }]" />
          </UFormGroup>

          <!-- 内容来源切换 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">内容来源</label>
            <div class="flex gap-2">
              <button
                type="button"
                @click="form.content_source = 'local'"
                class="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border-2 transition-all"
                :class="form.content_source === 'local' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'"
              >
                <UIcon name="i-heroicons-arrow-up-tray" class="w-4 h-4 inline mr-1.5" />
                本地上传
              </button>
              <button
                type="button"
                @click="form.content_source = 'online'"
                class="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border-2 transition-all"
                :class="form.content_source === 'online' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'"
              >
                <UIcon name="i-heroicons-globe-alt" class="w-4 h-4 inline mr-1.5" />
                在线链接
              </button>
            </div>
          </div>

          <!-- 在线模式：URL 输入 + 视频最低学习时长 -->
          <template v-if="form.content_source === 'online'">
            <UFormGroup label="内容地址" required>
              <UInput v-model="form.content_url" :placeholder="form.type === 'video' ? 'https://www.youtube.com/watch?v=... 或视频链接' : 'https://example.com/document.pdf'" />
            </UFormGroup>
            <UFormGroup v-if="form.type === 'video'" label="最低学习时长（秒）" description="学员需要观看视频至少这么长时间才能标记完成">
              <UInput v-model.number="form.min_read_time" type="number" placeholder="30" />
            </UFormGroup>
          </template>

          <!-- 本地上传模式：文件上传 -->
          <div v-if="form.content_source === 'local'">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              上传文件
            </label>

            <!-- 已上传文件信息 -->
            <div v-if="uploadedFile" class="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg mb-3">
              <UIcon name="i-heroicons-document-check" class="w-5 h-5 text-green-600" />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-green-700 truncate">{{ uploadedFile.file_name }}</div>
                <div class="text-xs text-green-600">{{ formatFileSize(uploadedFile.file_size) }}</div>
              </div>
              <UButton color="red" variant="ghost" icon="i-heroicons-x-mark" size="xs" @click="removeFile" />
            </div>

            <!-- 上传区域 -->
            <div
              v-else
              @click="triggerFileInput"
              @dragover.prevent="isDragging = true"
              @dragleave="isDragging = false"
              @drop.prevent="handleDrop"
              class="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
              :class="isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'"
            >
              <UIcon name="i-heroicons-cloud-arrow-up" class="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p class="text-sm text-gray-600">
                拖拽文件到此处，或 <span class="text-primary-600 font-medium">点击选择文件</span>
              </p>
              <p class="text-xs text-gray-400 mt-2">
                <template v-if="form.type === 'video'">支持 MP4 格式，最大 10GB</template>
                <template v-else>支持 PDF、PPT、DOCX、Excel、TXT、图片格式，最大 500MB</template>
              </p>
            </div>

            <input
              ref="fileInputRef"
              type="file"
              class="hidden"
              :accept="form.type === 'video' ? '.mp4,video/mp4' : '.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp'"
              @change="handleFileSelect"
            />

            <!-- 上传进度 -->
            <div v-if="uploading" class="mt-3">
              <div class="flex items-center justify-between text-sm mb-1.5">
                <span class="text-gray-600">上传中...</span>
                <span class="font-medium text-primary-600">{{ uploadProgress }}%</span>
              </div>
              <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div class="h-full bg-primary-500 rounded-full transition-all duration-300" :style="{ width: `${uploadProgress}%` }" />
              </div>
            </div>
          </div>

          <!-- 其他设置 -->
          <div class="grid grid-cols-2 gap-4">
            <UFormGroup v-if="form.type === 'video' && form.duration > 0" label="视频时长">
              <div class="flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg">
                <UIcon name="i-heroicons-clock" class="w-4 h-4 text-green-600" />
                <span class="text-sm text-green-700">{{ formatDuration(form.duration) }}</span>
                <span class="text-xs text-green-600">（自动检测）</span>
              </div>
            </UFormGroup>
            <UFormGroup v-if="form.type === 'document'" label="最低阅读时长（秒）">
              <UInput v-model.number="form.min_read_time" type="number" placeholder="30" />
            </UFormGroup>
            <UFormGroup label="排序">
              <UInput v-model.number="form.sort_order" type="number" placeholder="0" />
            </UFormGroup>
          </div>

          <!-- 附件管理 -->
          <div class="border-t pt-5">
            <h4 class="text-sm font-semibold text-gray-700 mb-4">附件管理</h4>

            <!-- 相关附件 -->
            <div>
              <div class="flex items-center justify-between mb-3">
                <label class="text-sm font-medium text-gray-600">相关附件</label>
                <UButton size="xs" color="gray" icon="i-heroicons-plus" label="添加附件" @click="openAttachmentUpload()" />
              </div>
              <div v-if="attachments.length > 0" class="space-y-2">
                <div v-for="att in attachments" :key="att.id" class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <UIcon name="i-heroicons-document" class="w-4 h-4 text-gray-500" />
                  <div class="flex-1 min-w-0">
                    <div class="text-sm truncate">{{ att.file_name }}</div>
                    <div class="text-xs text-gray-500">{{ formatFileSize(att.file_size) }}</div>
                  </div>
                  <UButton color="red" variant="ghost" icon="i-heroicons-trash" size="xs" @click="deleteAttachment(att)" />
                </div>
              </div>
              <div v-else class="text-sm text-gray-400">暂无相关附件</div>
            </div>
          </div>
        </UForm>
        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="gray" label="取消" @click="showModal = false" />
            <UButton :label="editing ? '保存' : '创建'" :loading="saving" @click="handleSubmit" />
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- 附件上传弹窗 -->
    <UModal v-model="showAttachmentModal" :prevent-close="uploadingAttachment">
      <UCard>
        <template #header>
          <h3 class="text-base font-semibold">上传相关附件</h3>
        </template>
        <div>
          <!-- 已上传文件列表 -->
          <div v-if="uploadedAttachments.length > 0" class="space-y-2 mb-3">
            <div v-for="(file, index) in uploadedAttachments" :key="index" class="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <UIcon name="i-heroicons-document-check" class="w-5 h-5 text-green-600" />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-green-700 truncate">{{ file.file_name }}</div>
                <div class="text-xs text-green-600">{{ formatFileSize(file.file_size) }}</div>
              </div>
              <UButton color="red" variant="ghost" icon="i-heroicons-x-mark" size="xs" @click="removeAttachmentFile(index)" />
            </div>
          </div>

          <!-- 上传区域 -->
          <div
            @click="triggerAttachmentInput"
            @dragover.prevent="isDraggingAttachment = true"
            @dragleave="isDraggingAttachment = false"
            @drop.prevent="handleAttachmentDrop"
            class="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
            :class="isDraggingAttachment ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'"
          >
            <UIcon name="i-heroicons-cloud-arrow-up" class="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p class="text-sm text-gray-600">
              拖拽文件到此处，或 <span class="text-primary-600 font-medium">点击选择文件</span>
            </p>
            <p class="text-xs text-gray-400 mt-2">支持 PDF、PPT、DOCX、Excel、TXT、图片格式，可多选，最大 500MB/个</p>
          </div>

          <input
            ref="attachmentInputRef"
            type="file"
            class="hidden"
            multiple
            accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp"
            @change="handleAttachmentSelect"
          />

          <!-- 上传进度 -->
          <div v-if="uploadingAttachment" class="mt-3">
            <div class="flex items-center justify-between text-sm mb-1.5">
              <span class="text-gray-600">上传中... ({{ uploadingIndex + 1 }}/{{ uploadingTotal }})</span>
              <span class="font-medium text-primary-600">{{ attachmentProgress }}%</span>
            </div>
            <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div class="h-full bg-primary-500 rounded-full transition-all duration-300" :style="{ width: `${attachmentProgress}%` }" />
            </div>
          </div>
        </div>
        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="gray" label="取消" @click="showAttachmentModal = false" />
            <UButton label="保存" :loading="savingAttachment" :disabled="uploadedAttachments.length === 0" @click="saveAttachments" />
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- 批量导入弹窗 -->
    <UModal v-model="showImportModal" :prevent-close="importing">
      <UCard>
        <template #header>
          <h3 class="text-base font-semibold">批量导入课程</h3>
        </template>

        <div class="space-y-4">
          <!-- 下载模板 -->
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p class="text-sm font-medium text-gray-700">下载导入模板</p>
              <p class="text-xs text-gray-500">请按模板格式填写数据后上传</p>
            </div>
            <UButton color="gray" size="sm" icon="i-heroicons-arrow-down-tray" label="下载模板" @click="downloadCourseTemplate" />
          </div>

          <!-- 已导入文件 -->
          <div v-if="importFile" class="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <UIcon name="i-heroicons-document-check" class="w-5 h-5 text-green-600" />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-green-700 truncate">{{ importFile.name }}</div>
              <div class="text-xs text-green-600">{{ formatFileSize(importFile.size) }}</div>
            </div>
            <UButton color="red" variant="ghost" icon="i-heroicons-x-mark" size="xs" @click="importFile = null" />
          </div>

          <!-- 上传区域 -->
          <div
            v-else
            @click="triggerImportInput"
            @dragover.prevent="isDraggingImport = true"
            @dragleave="isDraggingImport = false"
            @drop.prevent="handleImportDrop"
            class="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
            :class="isDraggingImport ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'"
          >
            <UIcon name="i-heroicons-cloud-arrow-up" class="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p class="text-sm text-gray-600">
              拖拽 CSV 或 ZIP 文件到此处，或 <span class="text-primary-600 font-medium">点击选择文件</span>
            </p>
            <p class="text-xs text-gray-400 mt-2">支持 .csv 或 .zip 格式，最大 500MB</p>
          </div>
          <input ref="importInputRef" type="file" accept=".csv,.txt,.zip" class="hidden" @change="handleImportSelect" />

          <!-- 导入进度 -->
          <div v-if="importing" class="text-center py-4">
            <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-primary-500 animate-spin mx-auto mb-2" />
            <p class="text-sm text-gray-600">正在导入，请稍候...</p>
          </div>

          <!-- 导入结果 -->
          <div v-if="importResult" class="space-y-3">
            <div class="flex items-center gap-3 p-3 rounded-lg" :class="importResult.failed > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'">
              <UIcon :name="importResult.failed > 0 ? 'i-heroicons-exclamation-triangle' : 'i-heroicons-check-circle'" class="w-5 h-5" :class="importResult.failed > 0 ? 'text-orange-600' : 'text-green-600'" />
              <div class="text-sm">
                <span class="font-medium text-green-700">创建 {{ importResult.created }} 条</span>
                <span v-if="importResult.updated > 0" class="text-blue-700 ml-3">更新 {{ importResult.updated }} 条</span>
                <span v-if="importResult.failed > 0" class="text-orange-700 ml-3">失败 {{ importResult.failed }} 条</span>
              </div>
            </div>

            <div v-if="importResult.errors?.length" class="max-h-48 overflow-y-auto">
              <div v-for="err in importResult.errors" :key="err.row" class="text-xs text-red-600 py-1 border-b border-red-100">
                第 {{ err.row }} 行：{{ err.message }}
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="gray" label="关闭" @click="closeImportModal" />
            <UButton label="开始导入" :loading="importing" :disabled="!importFile" @click="handleImport" />
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

const api = useApi()
const toast = useToast()
const authStore = useAuthStore()

const courses = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const currentPage = ref(1)
const total = ref(0)
const perPage = 15
const showModal = ref(false)
const editing = ref<any>(null)
const filters = reactive({ keyword: '', series_id: '', status: '' })
const seriesOptions = ref<any[]>([])
const seriesFilterOptions = ref<any[]>([])
const mentorOptions = ref<any[]>([])

// 上传相关
const uploading = ref(false)
const uploadProgress = ref(0)
const isDragging = ref(false)
const uploadedFile = ref<{ url: string; path: string; file_name: string; file_size: number } | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

// 附件上传相关
const showAttachmentModal = ref(false)
const uploadingAttachment = ref(false)
const attachmentProgress = ref(0)
const isDraggingAttachment = ref(false)
const uploadedAttachments = ref<{ url: string; path: string; file_name: string; file_size: number }[]>([])
const attachmentInputRef = ref<HTMLInputElement | null>(null)
const savingAttachment = ref(false)
const attachments = ref<any[]>([])
const uploadingIndex = ref(0)
const uploadingTotal = ref(0)

const form = reactive({
  title: '', description: '', series_id: '', mentor_id: '', type: 'video',
  content_source: 'online', content_url: '',
  content_type: 'pdf', images: null as string[] | null,
  file_name: '', file_size: 0,
  min_read_time: 30, duration: 0, sort_order: 0,
})

const columns = [
  { key: 'title', label: '标题' },
  { key: 'series', label: '主题' },
  { key: 'type', label: '类型' },
  { key: 'content_source', label: '来源' },
  { key: 'status', label: '状态' },
  { key: 'actions', label: '操作' },
]

const statusOptions = [{ label: '全部', value: '' }, { label: '草稿', value: 'draft' }, { label: '已发布', value: 'published' }]
const statusLabel = (s: string) => ({ draft: '草稿', published: '已发布' }[s] ?? s)
const statusColor = (s: string) => ({ draft: 'gray', published: 'green' }[s] ?? 'gray')

const formatFileSize = (bytes: number) => {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

let searchTimeout: ReturnType<typeof setTimeout>
const debouncedLoad = () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => loadCourses(1), 300) }

const loadCourses = async (page = 1) => {
  loading.value = true
  try {
    const params: any = { page, per_page: perPage }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.series_id) params.series_id = filters.series_id
    if (filters.status) params.status = filters.status
    const res = await api.get<any>('/admin/courses', params)
    courses.value = res.data.data
    total.value = res.data.total
    currentPage.value = res.data.current_page
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '加载课程列表失败', color: 'red' })
  }
  loading.value = false
}

const loadSeriesOptions = async () => {
  try {
    const [seriesRes, mentorsRes] = await Promise.all([
      api.get<any>('/admin/series', { per_page: 100 }),
      api.get<any>('/admin/users', { role: 'mentor', per_page: 100 }),
    ])
    const opts = seriesRes.data.data.map((s: any) => ({ label: `${s.name} (${s.category?.name ?? ''})`, value: s.id }))
    seriesOptions.value = opts
    seriesFilterOptions.value = [{ label: '全部', value: '' }, ...opts]
    mentorOptions.value = [{ label: '不绑定', value: '' }, ...mentorsRes.data.data.map((m: any) => ({ label: `${m.name} (${m.employee_no})`, value: m.id }))]
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '加载系列/导师列表失败', color: 'red' })
  }
}

// 文件上传相关方法
const triggerFileInput = () => { fileInputRef.value?.click() }

const handleDrop = (e: DragEvent) => {
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files?.length) uploadFile(files[0])
}

const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files?.length) uploadFile(input.files[0])
}

// 从视频文件自动读取时长
const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve(Math.round(video.duration))
    }
    video.onerror = () => resolve(0)
    video.src = URL.createObjectURL(file)
  })
}

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m} 分 ${s} 秒` : `${s} 秒`
}

const uploadFile = async (file: File) => {
  const isVideo = form.type === 'video'
  const isLargeFile = file.size > 50 * 1024 * 1024 // 50MB 以上用分片上传

  uploading.value = true
  uploadProgress.value = 0

  // 视频文件自动读取时长
  if (isVideo) {
    const duration = await getVideoDuration(file)
    if (duration > 0) {
      form.duration = duration
      toast.add({ title: `已自动检测视频时长：${formatDuration(duration)}`, color: 'green' })
    }
  }

  try {
    if (isLargeFile && isVideo) {
      // 分片上传（大视频文件）
      await uploadLargeFile(file)
    } else {
      // 普通上传（文档/小文件）
      await uploadSmallFile(file)
    }
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '上传失败', color: 'red' })
    uploading.value = false
  }
}

const uploadSmallFile = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', form.type)

  const res = await api.apiFetch<any>('/admin/upload/file', {
    method: 'POST',
    body: formData,
    headers: { 'Content-Type': undefined }, // 让浏览器自动设置 multipart/form-data
  })

  uploadedFile.value = res.data
  form.content_url = res.data.path || res.data.url
  form.content_type = res.data.content_type || 'pdf'
  form.images = res.data.images || null
  form.file_name = res.data.file_name
  form.file_size = res.data.file_size
  uploading.value = false
  toast.add({ title: '文件上传成功', color: 'green' })
}

const uploadLargeFile = async (file: File) => {
  const chunkSize = 5 * 1024 * 1024 // 5MB 每片
  const totalChunks = Math.ceil(file.size / chunkSize)

  // 1. 初始化上传
  const initRes = await api.post<any>('/admin/upload/init', {
    file_name: file.name,
    file_size: file.size,
    total_chunks: totalChunks,
    type: form.type,
  })
  const uploadId = initRes.data.upload_id

  // 2. 逐个上传分片
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize
    const end = Math.min(start + chunkSize, file.size)
    const chunk = file.slice(start, end)

    const formData = new FormData()
    formData.append('upload_id', uploadId)
    formData.append('chunk_index', String(i))
    formData.append('chunk', chunk, `chunk_${i}`)

    await api.apiFetch<any>('/admin/upload/chunk', {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': undefined },
    })

    uploadProgress.value = Math.round(((i + 1) / totalChunks) * 100)
  }

  // 3. 完成上传（异步处理，立即返回）
  const completeRes = await api.post<any>('/admin/upload/complete', { upload_id: uploadId })

  // 立即设置文件信息，允许保存
  uploadedFile.value = completeRes.data
  form.content_url = completeRes.data.path || completeRes.data.url
  form.content_type = completeRes.data.content_type || 'pdf'
  form.images = completeRes.data.images || null
  form.file_name = completeRes.data.file_name
  form.file_size = completeRes.data.file_size
  uploading.value = false
  toast.add({ title: '文件上传成功，正在处理中...', color: 'green' })
}

const removeFile = () => {
  uploadedFile.value = null
  form.content_url = ''
  form.file_name = ''
  form.file_size = 0
}

// 附件管理方法
const loadAttachments = async (courseId: number) => {
  try {
    const res = await api.get<any>(`/admin/courses/${courseId}`)
    const course = res.data
    attachments.value = (course.attachments || [])
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '加载附件列表失败', color: 'red' })
  }
}

const openAttachmentUpload = () => {
  uploadedAttachments.value = []
  attachmentProgress.value = 0
  showAttachmentModal.value = true
}

const triggerAttachmentInput = () => { attachmentInputRef.value?.click() }

const handleAttachmentDrop = (e: DragEvent) => {
  isDraggingAttachment.value = false
  const files = e.dataTransfer?.files
  if (files?.length) uploadAttachmentFiles(Array.from(files))
}

const handleAttachmentSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files?.length) uploadAttachmentFiles(Array.from(input.files))
}

const uploadAttachmentFiles = async (files: File[]) => {
  uploadingAttachment.value = true
  uploadingTotal.value = files.length
  uploadingIndex.value = 0

  for (let i = 0; i < files.length; i++) {
    uploadingIndex.value = i
    attachmentProgress.value = Math.round((i / files.length) * 100)

    try {
      const formData = new FormData()
      formData.append('file', files[i])
      formData.append('type', 'document')

      const res = await api.apiFetch<any>('/admin/upload/file', {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': undefined },
      })

      uploadedAttachments.value.push(res.data)
    } catch (e: any) {
      toast.add({ title: `文件 ${files[i].name} 上传失败: ${e?.data?.message || '上传失败'}`, color: 'red' })
    }
  }

  attachmentProgress.value = 100
  uploadingAttachment.value = false
  toast.add({ title: `${uploadedAttachments.value.length} 个文件上传成功`, color: 'green' })
}

const removeAttachmentFile = (index: number) => {
  uploadedAttachments.value.splice(index, 1)
}

const saveAttachments = async () => {
  if (uploadedAttachments.value.length === 0 || !editing.value) return

  savingAttachment.value = true
  try {
    for (const file of uploadedAttachments.value) {
      await api.post(`/admin/courses/${editing.value.id}/attachments`, {
        file_name: file.file_name,
        file_path: file.path,
        file_size: file.file_size,
        mime_type: null,
      })
    }

    toast.add({ title: '附件已添加', color: 'green' })
    showAttachmentModal.value = false
    await loadAttachments(editing.value.id)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '添加失败', color: 'red' })
  }
  savingAttachment.value = false
}

const deleteAttachment = async (attachment: any) => {
  if (!editing.value) return

  try {
    await api.del(`/admin/courses/${editing.value.id}/attachments/${attachment.id}`)
    toast.add({ title: '附件已删除', color: 'green' })
    await loadAttachments(editing.value.id)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '删除失败', color: 'red' })
  }
}

const openModal = (course?: any) => {
  editing.value = course || null
  uploadedFile.value = null
  attachments.value = []

  if (course) {
    Object.assign(form, {
      title: course.title, description: course.description || '',
      series_id: course.series_id || '', mentor_id: course.mentor_id || '',
      type: course.type,
      content_source: course.content_source || 'online',
      content_url: course.content_url || '',
      file_name: course.file_name || '', file_size: course.file_size || 0,
      min_read_time: course.min_read_time || 30,
      duration: course.duration || 0, sort_order: course.sort_order || 0,
    })
    if (course.content_source === 'local' && course.file_name) {
      uploadedFile.value = { url: course.content_url, path: course.content_url, file_name: course.file_name, file_size: course.file_size }
    }
    loadAttachments(course.id)
  } else {
    Object.assign(form, {
      title: '', description: '', series_id: '', mentor_id: '', type: 'video',
      content_source: 'local', content_url: '',
      file_name: '', file_size: 0,
      min_read_time: 30, duration: 0, sort_order: 0,
    })
  }
  loadSeriesOptions()
  showModal.value = true
}

const handleSubmit = async () => {
  if (!form.title || !form.series_id) {
    toast.add({ title: '请填写标题和选择系列', color: 'red' })
    return
  }
  if (form.content_source === 'online' && !form.content_url) {
    toast.add({ title: '请输入在线内容地址', color: 'red' })
    return
  }
  if (form.content_source === 'local' && !form.content_url) {
    toast.add({ title: '请先上传文件', color: 'red' })
    return
  }

  saving.value = true
  try {
    const payload = { ...form }
    // 本地视频模式下删除 min_read_time
    if (payload.content_source === 'local' && payload.type === 'video') {
      delete (payload as any).min_read_time
    }
    // 文档课程设置默认 min_read_time
    if (payload.type === 'document') {
      payload.min_read_time = payload.min_read_time || 30
    }

    if (editing.value) {
      await api.put(`/admin/courses/${editing.value.id}`, payload)
      toast.add({ title: '课程已更新', color: 'green' })
      showModal.value = false
      await loadCourses(currentPage.value)
    } else {
      await api.post<any>('/admin/courses', payload)
      toast.add({ title: '课程已创建', color: 'green' })
      showModal.value = false
      await loadCourses(currentPage.value)
    }
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '操作失败', color: 'red' })
  }
  saving.value = false
}

const updateStatus = async (course: any, status: string) => {
  try {
    await api.put(`/admin/courses/${course.id}/status`, { status })
    toast.add({ title: '状态已更新', color: 'green' })
    await loadCourses(currentPage.value)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '操作失败', color: 'red' })
  }
}

const handleDelete = async (course: any) => {
  try {
    await api.del(`/admin/courses/${course.id}`)
    toast.add({ title: '课程已删除', color: 'green' })
    await loadCourses(currentPage.value)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '删除失败', color: 'red' })
  }
}

// ==================== 批量导入 ====================

const showImportModal = ref(false)
const importing = ref(false)
const importFile = ref<File | null>(null)
const importInputRef = ref<HTMLInputElement | null>(null)
const isDraggingImport = ref(false)
const importResult = ref<{ success: number; failed: number; errors: { row: number; message: string }[] } | null>(null)

const downloadCourseTemplate = async () => {
  try {
    const res = await fetch(api.getApiUrl('/admin/courses/import-template'), {
      headers: { 'Authorization': `Bearer ${authStore.token}` },
    })
    if (!res.ok) throw new Error('下载失败')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'course_import_template.csv'
    link.click()
    URL.revokeObjectURL(url)
  } catch (e: any) {
    toast.add({ title: e?.message || '下载失败', color: 'red' })
  }
}

const triggerImportInput = () => { importInputRef.value?.click() }

const handleImportSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files?.length) {
    const file = input.files[0]
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'txt', 'zip'].includes(ext || '')) {
      toast.add({ title: '请选择 .csv 或 .zip 文件', color: 'red' })
      return
    }
    if (file.size > 500 * 1024 * 1024) {
      toast.add({ title: '文件大小不能超过 500MB', color: 'red' })
      return
    }
    importFile.value = file
    importResult.value = null
  }
}

const handleImportDrop = (e: DragEvent) => {
  isDraggingImport.value = false
  const files = e.dataTransfer?.files
  if (files?.length) {
    const file = files[0]
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'txt', 'zip'].includes(ext || '')) {
      toast.add({ title: '请选择 .csv 或 .zip 文件', color: 'red' })
      return
    }
    if (file.size > 500 * 1024 * 1024) {
      toast.add({ title: '文件大小不能超过 500MB', color: 'red' })
      return
    }
    importFile.value = file
    importResult.value = null
  }
}

const handleImport = async () => {
  if (!importFile.value) return
  importing.value = true
  importResult.value = null

  try {
    const formData = new FormData()
    formData.append('file', importFile.value)

    const res = await api.apiFetch<any>('/admin/courses/import', {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': undefined },
    })

    importResult.value = res.data
    toast.add({ title: res.message, color: res.data.failed > 0 ? 'orange' : 'green' })
    await loadCourses(1)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '导入失败', color: 'red' })
  }
  importing.value = false
}

const closeImportModal = () => {
  showImportModal.value = false
  importFile.value = null
  importResult.value = null
}

onMounted(() => { loadCourses(); loadSeriesOptions() })
</script>
