<template>
  <div v-if="loading" class="text-center py-16">
    <p class="text-gray-400">加载中...</p>
  </div>

  <div v-else-if="course">
    <nav class="flex items-center gap-2 text-sm text-gray-500 mb-4">
      <NuxtLink to="/" class="hover:text-primary-600">培训中心</NuxtLink>
      <span>/</span>
      <NuxtLink v-if="course.series" :to="`/series/${course.series.id}`" class="hover:text-primary-600">
        {{ course.series.name }}
      </NuxtLink>
      <span>/</span>
      <span class="text-gray-900">{{ course.title }}</span>
    </nav>

    <h1 class="text-2xl font-bold text-gray-900 mb-6">{{ course.title }}</h1>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div class="lg:col-span-3">

        <!-- ========== 本地视频课程 ========== -->
        <div v-if="course.type === 'video' && !isYouTube" class="mb-6">
          <VideoPlayer
            :src="getFullUrl(course.content_url)"
            :course-id="course.id"
            :initial-position="progress?.last_position_seconds"
            @progress="onVideoProgress"
            @complete="onVideoComplete"
            @synced="onVideoSynced"
            @play="onVideoPlay"
            @pause="onVideoPause"
          />
          <!-- 学习进度条 -->
          <DocumentReader
            ref="documentReaderRef"
            :course-id="course.id"
            :min-read-time="course.duration || course.min_read_time || 30"
            :completed="progress?.is_completed"
            :initial-elapsed="progress?.total_learning_time ?? 0"
            :auto-start="false"
            :show-progress="false"
            @completed="onDocumentComplete"
            @synced="onDocumentSynced"
          >
            <p class="text-sm text-gray-500">
              {{ progress?.is_completed ? '课程已完成学习' : '请观看视频内容，视频播放完成后点击下方按钮标记完成。' }}
            </p>
          </DocumentReader>
        </div>

        <!-- ========== YouTube 视频课程 ========== -->
        <div v-else-if="course.type === 'video' && isYouTube" class="mb-6">
          <div class="w-full rounded-xl overflow-hidden bg-black">
            <iframe
              :src="youtubeEmbedUrl"
              style="width: 100%; aspect-ratio: 16/9; display: block;"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
          </div>
          <DocumentReader
            :course-id="course.id"
            :min-read-time="course.min_read_time || 30"
            :completed="progress?.is_completed"
            @completed="onDocumentComplete"
          >
            <p class="text-sm text-gray-500">
              请观看视频内容，达到最低学习时长后可标记为已完成。
            </p>
          </DocumentReader>
        </div>

        <!-- ========== 文档课程 - 在线 HTML ========== -->
        <div v-else-if="course.type === 'document' && course.content_source === 'online'" class="mb-6">
          <DocumentReader
            :course-id="course.id"
            :min-read-time="course.min_read_time || 30"
            :completed="progress?.is_completed"
            :initial-elapsed="progress?.total_learning_time ?? 0"
            @completed="onDocumentComplete"
            @synced="onDocumentSynced"
          >
            <div class="prose prose-sm max-w-none" v-html="course.content_url"></div>
          </DocumentReader>
        </div>

        <!-- ========== 文档课程 - 本地文件 ========== -->
        <div v-else-if="course.type === 'document' && course.content_source === 'local'" class="mb-6">
          <div class="bg-white rounded-xl border overflow-hidden">
            <div class="p-6">
              <!-- 文件信息 -->
              <div class="flex items-center gap-4 mb-4">
                <div class="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center">
                  <UIcon :name="fileIcon" class="w-7 h-7 text-primary-600" />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900">{{ course.file_name || course.title }}</h3>
                  <p class="text-sm text-gray-500">{{ fileTypeName }} · {{ formatFileSize(course.file_size) }}</p>
                </div>
              </div>

              <!-- 文件转换中提示 -->
              <div v-if="isConverting" class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 text-blue-600 animate-spin" />
                  <span class="text-blue-700">文件转换中，请稍候刷新页面...</span>
                </div>
              </div>

              <!-- PDF 预览（PDF.js 流式渲染，包括已转换为 PDF 的 PPT） -->
              <div v-else-if="(isPdf || course.content_url?.endsWith('.pdf')) && previewUrl && previewUrl !== ''" class="mb-4">
                <PdfViewer :url="previewUrl" />
              </div>

              <!-- PPT 图片预览（WebP 图片序列） -->
              <div v-else-if="isPptImages" class="mb-4">
                <PptImageViewer :images="parsedImages" />
              </div>

              <!-- 图片预览（禁用右键） -->
              <div v-else-if="isImage" class="mb-4" @contextmenu.prevent>
                <img
                  :src="previewUrl"
                  :alt="course.title"
                  class="max-w-full h-auto rounded-lg border pointer-events-none"
                  draggable="false"
                />
              </div>

              <!-- DOCX/XLSX/PPT 在线预览（排除已转换为 PDF 的） -->
              <div v-else-if="(isDocx || isXlsx || isPpt) && !course.content_url?.endsWith('.pdf')" class="mb-4">
                <DocumentViewer
                  :url="course.content_url"
                  :file-name="course.file_name || ''"
                />
              </div>

              <!-- 其他格式 -->
              <div v-else class="mb-4 p-8 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <UIcon :name="fileIcon" class="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p class="text-sm text-gray-600 mb-1">{{ fileTypeName }} 暂不支持在线预览</p>
              </div>

              <!-- 阅读确认 -->
              <DocumentReader
                :course-id="course.id"
                :min-read-time="course.min_read_time || 30"
                :completed="progress?.is_completed"
                :initial-elapsed="progress?.total_learning_time ?? 0"
                :auto-start="true"
                @completed="onDocumentComplete"
                @synced="onDocumentSynced"
              >
                <p class="text-sm text-gray-500">请仔细阅读文档内容，达到最低学习时长后可标记为已完成。</p>
              </DocumentReader>
            </div>
          </div>
        </div>

        <!-- 课程描述 -->
        <div v-if="course.description" class="mt-6 bg-white rounded-xl border p-6">
          <h2 class="text-base font-semibold mb-3">课程简介</h2>
          <p class="text-gray-600 text-sm">{{ course.description }}</p>
        </div>
      </div>

      <!-- ========== 侧边栏 ========== -->
      <div class="space-y-4">
        <!-- 绑定导师 -->
        <div v-if="course.mentor" class="bg-white rounded-xl border p-4">
          <h3 class="text-sm font-semibold mb-3">课程导师</h3>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-medium">
              {{ course.mentor.name?.charAt(0) }}
            </div>
            <div>
              <div class="text-sm font-medium text-gray-900">{{ course.mentor.name }}</div>
              <div class="text-xs text-gray-500">{{ course.mentor.department }}</div>
            </div>
          </div>
        </div>

        <!-- 学习进度 -->
        <div class="bg-white rounded-xl border p-4">
          <h3 class="text-sm font-semibold mb-3">状态</h3>
          <div class="text-center">
            <div class="text-3xl font-bold" :class="progress?.is_completed ? 'text-green-600' : 'text-primary-600'">
              {{ progress?.is_completed ? '✅' : '📚' }}
            </div>
            <p class="text-xs text-gray-400 mt-1">{{ progress?.is_completed ? '已完成' : '学习中' }}</p>
          </div>
        </div>

        <!-- 课后考试 -->
        <div v-if="course.exam" class="bg-white rounded-xl border p-4">
          <h3 class="text-sm font-semibold mb-3">课后考试</h3>
          <UButton
            @click="handleExamClick"
            :label="canTakeExam ? '参加考试' : '请先完成课程'"
            :icon="canTakeExam ? 'i-heroicons-clipboard-document-check' : 'i-heroicons-lock-closed'"
            :color="canTakeExam ? 'primary' : 'gray'"
            :disabled="!canTakeExam"
            block
          />
          <!-- 未完成课程提示 -->
          <div v-if="!canTakeExam && incompleteCourses.length > 0" class="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p class="text-sm text-orange-700 font-medium mb-2">需要完成以下课程才能参加考试：</p>
            <ul class="space-y-1">
              <li v-for="c in incompleteCourses" :key="c.id">
                <NuxtLink :to="`/course/${c.id}`" class="text-sm text-primary-600 hover:underline">
                  {{ c.title }}
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>

        <!-- 相关附件（下载模式） -->
        <div v-if="course.attachments?.length > 0" class="bg-white rounded-xl border p-4">
          <h3 class="text-sm font-semibold mb-3">相关附件</h3>
          <div class="space-y-2">
            <AttachmentDownload v-for="att in course.attachments" :key="att.id" :attachment="att" mode="download" />
          </div>
        </div>
      </div>
    </div>

    <!-- 附件预览弹窗 -->
    <UModal v-model="showPreviewModal" :ui="{ width: 'max-w-4xl' }">
      <UCard class="max-h-[85vh] overflow-hidden">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold">{{ previewFileName }}</h3>
            <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" size="xs" @click="showPreviewModal = false" />
          </div>
        </template>
        <div v-if="previewModalUrl">
          <!-- PDF/PPT 预览（canvas 渲染，无下载按钮） -->
          <PdfViewer
            v-if="isPreviewPdf || isPreviewPpt"
            :url="previewModalUrl"
            max-height="65vh"
          />
          <!-- DOCX/XLSX -->
          <DocumentViewer
            v-else-if="isPreviewDocx || isPreviewXlsx"
            :url="previewModalUrl"
            :file-name="previewFileName"
          />
          <!-- 图片（禁用右键） -->
          <div v-else-if="isPreviewImage" @contextmenu.prevent>
            <img
              :src="previewModalUrl"
              class="max-w-full h-auto mx-auto pointer-events-none"
              draggable="false"
            />
          </div>
          <!-- 其他 -->
          <div v-else class="text-center py-12 text-gray-500">
            <p>该文件类型暂不支持在线预览</p>
          </div>
        </div>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import VideoPlayer from '~/components/VideoPlayer.vue'
import DocumentReader from '~/components/DocumentReader.vue'
import DocumentViewer from '~/components/course/DocumentViewer.vue'
import PdfViewer from '~/components/course/PdfViewer.vue'
import PptImageViewer from '~/components/course/PptImageViewer.vue'
import AttachmentDownload from '~/components/course/AttachmentDownload.vue'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const api = useApi()
const authStore = useAuthStore()
const toast = useToast()

const courseId = Number(route.params.id)
const course = ref<any>(null)
const progress = ref<any>(null)
const canTakeExam = ref(false)
const incompleteCourses = ref<{ id: number; title: string }[]>([])
const loading = ref(true)
const txtContent = ref('')
const documentReaderRef = ref<any>(null)
const isConverting = ref(false)

// 将相对路径转为完整 URL
const getFullUrl = (path: string): string => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  // OSS 路径
  if (path.startsWith('academy/')) {
    return `https://rh-wh.oss-cn-shanghai.aliyuncs.com/${path}`
  }
  // 本地路径（兼容）
  const base = `${window.location.protocol}//${window.location.hostname}:9000`
  return path.startsWith('/') ? `${base}${path}` : `${base}/storage/${path}`
}

// 附件预览弹窗
const showPreviewModal = ref(false)
const previewModalUrl = ref('')
const previewFileName = ref('')

// ========== 文件路径转认证预览 URL ==========
const getPreviewUrl = (filePathOrUrl: string): string => {
  if (!filePathOrUrl) return ''
  // 如果已经是完整 URL，提取路径部分
  let path = filePathOrUrl
  if (path.includes('/storage/')) {
    path = path.split('/storage/')[1] || path
  }
  // 去掉开头的斜杠
  path = path.replace(/^\//, '')
  // 编码路径
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  // 附加 token 用于认证（iframe 无法发送 header）
  const token = authStore.token
  const baseUrl = `${api.getApiUrl('/files/preview')}/${encodedPath}`
  return token ? `${baseUrl}?token=${token}` : baseUrl
}

// ========== 课程内容预览 URL ==========
const previewUrl = computed(() => {
  if (!course.value) return ''
  // 优先使用 preview_url（如果有转码后的 PDF）
  if (course.value.preview_url) return getPreviewUrl(course.value.preview_url)
  return getPreviewUrl(course.value.content_url || '')
})

const pptPreviewUrl = computed(() => {
  if (!course.value) return ''
  // PPT 优先使用转码后的 PDF
  if (course.value.preview_url) return getPreviewUrl(course.value.preview_url)
  // 尝试自动查找 _preview.pdf
  const filePath = course.value.content_url || ''
  const previewPath = filePath.replace(/\.(pptx?)$/i, '_preview.pdf')
  if (previewPath !== filePath) return getPreviewUrl(previewPath)
  return getPreviewUrl(filePath)
})

// ========== 附件预览弹窗逻辑 ==========
const isPreviewPdf = computed(() => previewFileName.value.toLowerCase().endsWith('.pdf'))
const isPreviewPpt = computed(() => /\.(pptx?)$/i.test(previewFileName.value))
const isPreviewDocx = computed(() => /\.(docx?)$/i.test(previewFileName.value))
const isPreviewXlsx = computed(() => /\.(xlsx?)$/i.test(previewFileName.value))
const isPreviewImage = computed(() => /\.(jpe?g|png|gif|webp)$/i.test(previewFileName.value))

// 提供给子组件调用的预览方法
const openAttachmentPreview = (attachment: any) => {
  previewFileName.value = attachment.file_name
  const filePath = attachment.file_path
  const ext = filePath.split('.').pop()?.toLowerCase() || ''

  // PPT 使用转码后的 PDF
  if (['ppt', 'pptx'].includes(ext)) {
    const previewPath = filePath.replace(/\.(pptx?)$/i, '_preview.pdf')
    previewModalUrl.value = getPreviewUrl(previewPath)
  } else {
    previewModalUrl.value = getPreviewUrl(filePath)
  }
  showPreviewModal.value = true
}

// 通过 provide/inject 让子组件调用
provide('openAttachmentPreview', openAttachmentPreview)

// ========== 视频类型判断 ==========
const isYouTube = computed(() => {
  const url = course.value?.content_url || ''
  return url.includes('youtube.com') || url.includes('youtu.be')
})

const youtubeEmbedUrl = computed(() => {
  const url = course.value?.content_url || ''
  let videoId = ''
  const match = url.match(/[?&]v=([^&]+)/)
  if (match) {
    videoId = match[1]
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0] || ''
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : ''
})

// ========== 文档类型判断 ==========
const isPdf = computed(() => {
  const name = course.value?.file_name || ''
  return name.toLowerCase().endsWith('.pdf')
})

const isImage = computed(() => {
  const name = course.value?.file_name || ''
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  return imageExts.some(ext => name.toLowerCase().endsWith(ext))
})

const isDocx = computed(() => {
  const name = course.value?.file_name || ''
  return name.toLowerCase().endsWith('.doc') || name.toLowerCase().endsWith('.docx')
})

const isXlsx = computed(() => {
  const name = course.value?.file_name || ''
  return name.toLowerCase().endsWith('.xls') || name.toLowerCase().endsWith('.xlsx')
})

const isPpt = computed(() => {
  const name = course.value?.file_name || ''
  const isPptFile = name.toLowerCase().endsWith('.ppt') || name.toLowerCase().endsWith('.pptx')
  // 只在 content_type !== 'images' 时返回 true，避免 PPT 文件使用 DocumentViewer 组件
  return isPptFile && course.value?.content_type !== 'images'
})

const isPptImages = computed(() => {
  const images = course.value?.images
  if (!images || course.value?.content_type !== 'images') return false
  
  // 兼容处理：images 可能是字符串或数组
  const parsed = typeof images === 'string' ? JSON.parse(images) : images
  return Array.isArray(parsed) && parsed.length > 0
})

const parsedImages = computed(() => {
  const images = course.value?.images
  if (!images) return []
  
  // 兼容处理：images 可能是字符串或数组
  return typeof images === 'string' ? JSON.parse(images) : images
})

const isTxt = computed(() => {
  const name = course.value?.file_name || ''
  return name.toLowerCase().endsWith('.txt')
})

const officeAppName = computed(() => {
  const name = course.value?.file_name || ''
  const ext = name.split('.').pop()?.toLowerCase()
  const appMap: Record<string, string> = {
    ppt: 'Microsoft PowerPoint', pptx: 'Microsoft PowerPoint',
    doc: 'Microsoft Word', docx: 'Microsoft Word',
    xls: 'Microsoft Excel', xlsx: 'Microsoft Excel',
  }
  return appMap[ext || ''] || '对应办公软件'
})

const fileTypeName = computed(() => {
  const name = course.value?.file_name || ''
  const ext = name.split('.').pop()?.toLowerCase()
  const typeMap: Record<string, string> = {
    pdf: 'PDF 文档', doc: 'Word 文档', docx: 'Word 文档',
    ppt: 'PPT 演示', pptx: 'PPT 演示',
    xls: 'Excel 表格', xlsx: 'Excel 表格',
    txt: '文本文件', jpg: '图片', jpeg: '图片', png: '图片', gif: '图片', webp: '图片',
  }
  return typeMap[ext || ''] || '文档'
})

const fileIcon = computed(() => {
  const name = course.value?.file_name || ''
  const ext = name.split('.').pop()?.toLowerCase()
  const iconMap: Record<string, string> = {
    pdf: 'i-heroicons-document-text', doc: 'i-heroicons-document', docx: 'i-heroicons-document',
    ppt: 'i-heroicons-presentation-chart-bar', pptx: 'i-heroicons-presentation-chart-bar',
    xls: 'i-heroicons-table-cells', xlsx: 'i-heroicons-table-cells',
    txt: 'i-heroicons-document-text', jpg: 'i-heroicons-photo', jpeg: 'i-heroicons-photo',
    png: 'i-heroicons-photo', gif: 'i-heroicons-photo', webp: 'i-heroicons-photo',
  }
  return iconMap[ext || ''] || 'i-heroicons-document'
})

// ========== 工具函数 ==========
const formatFileSize = (bytes: number) => {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

const formatTime = (seconds: number) => {
  if (!seconds || seconds <= 0) return '0分钟'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}小时${m > 0 ? `${m}分钟` : ''}`
  if (m > 0) return `${m}分钟${s > 0 ? `${s}秒` : ''}`
  return `${s}秒`
}

// ========== 数据加载 ==========
const loadCourse = async () => {
  try {
    const res = await api.get<any>(`/courses/${courseId}`)
    course.value = res.data.course
    progress.value = res.data.progress
    canTakeExam.value = res.data.can_take_exam ?? false
    incompleteCourses.value = res.data.incomplete_courses ?? []

    // 加载 TXT 文件内容（通过认证预览路由，URL 已含 token）
    if (course.value?.type === 'document' && course.value?.content_source === 'local' && isTxt.value) {
      try {
        const txtRes = await fetch(previewUrl.value)
        txtContent.value = await txtRes.text()
      } catch {
        toast.add({ title: '加载文件内容失败', color: 'red' })
        txtContent.value = '无法加载文件内容'
      }
    }

    // 检查是否需要轮询转换状态
    checkConversionStatus()
  } catch (e: any) {
    if (e?.statusCode === 404) {
      navigateTo('/')
    } else {
      toast.add({ title: e?.data?.message || '加载课程失败', color: 'red' })
    }
  }
  loading.value = false
}

// ========== 检查转换状态 ==========
const checkConversionStatus = () => {
  if (!course.value) return
  
  const ext = course.value.file_name?.split('.').pop()?.toLowerCase()
  const convertibleExts = ['ppt', 'pptx', 'doc', 'docx']
  
  // 如果是可转换的文件类型，且 content_url 还是原始格式，说明正在转换
  if (convertibleExts.includes(ext) && course.value.content_url?.endsWith(`.${ext}`)) {
    isConverting.value = true
    pollConversionStatus()
  }
}

// ========== 轮询转换状态 ==========
const pollConversionStatus = async () => {
  const maxAttempts = 60 // 最多轮询 5 分钟（每 5 秒一次）
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    try {
      const res = await api.get<any>(`/courses/${courseId}`)
      const updatedCourse = res.data.course
      
      // 检查是否转换完成（content_url 变为 .pdf 或 images 有值）
      const ext = updatedCourse.content_url?.split('.').pop()?.toLowerCase()
      if (ext === 'pdf' || (updatedCourse.images && updatedCourse.images.length > 0)) {
        isConverting.value = false
        // 更新课程数据
        course.value = updatedCourse
        progress.value = res.data.progress
        canTakeExam.value = res.data.can_take_exam ?? false
        toast.add({ title: '文件转换完成', color: 'green' })
        return
      }
    } catch (e) {
      console.error('查询转换状态失败:', e)
    }
  }
  
  isConverting.value = false
  toast.add({ title: '文件转换超时，请稍后刷新页面', color: 'orange' })
}

// ========== 视频进度 ==========
const onVideoProgress = (data: { currentTime: number; duration: number; percentage: number }) => {
  if (!progress.value) {
    progress.value = { progress_percentage: 0, total_learning_time: 0, is_completed: false }
  }
  progress.value.progress_percentage = Math.round(data.percentage * 100)
}

const onVideoComplete = async () => {
  try {
    const res = await api.get<any>(`/courses/${courseId}`)
    course.value = res.data.course
    progress.value = res.data.progress
    canTakeExam.value = res.data.can_take_exam ?? false
    incompleteCourses.value = res.data.incomplete_courses ?? []
    // 不显示"已完成"提示，等待用户手动点击"我已阅读"
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '同步进度失败', color: 'red' })
  }
}

const onVideoSynced = (data: { progress_percentage: number; total_learning_time: number; is_completed: boolean }) => {
  if (!progress.value) {
    progress.value = { progress_percentage: 0, total_learning_time: 0, is_completed: false }
  }
  progress.value.progress_percentage = data.progress_percentage
  progress.value.total_learning_time = data.total_learning_time
  progress.value.is_completed = data.is_completed
}

// 视频播放时恢复计时器
const onVideoPlay = () => {
  if (documentReaderRef.value) {
    documentReaderRef.value.resume()
    // 如果计时器未启动，启动它
    if (!documentReaderRef.value.timer) {
      documentReaderRef.value.startTimer()
      documentReaderRef.value.startSync()
    }
  }
}

// 视频暂停时暂停计时器
const onVideoPause = () => {
  documentReaderRef.value?.pause()
}

// ========== 文档完成 ==========
const onDocumentComplete = async () => {
  try {
    const res = await api.get<any>(`/courses/${courseId}`)
    course.value = res.data.course
    progress.value = res.data.progress
    canTakeExam.value = res.data.can_take_exam ?? false
    incompleteCourses.value = res.data.incomplete_courses ?? []
    toast.add({ title: '课程已完成，现在可以参加考试', color: 'green' })
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '同步进度失败', color: 'red' })
  }
}

const onDocumentSynced = (data: { progress_percentage: number; total_learning_time: number; is_completed: boolean }) => {
  if (!progress.value) {
    progress.value = { progress_percentage: 0, total_learning_time: 0, is_completed: false }
  }
  progress.value.progress_percentage = data.progress_percentage
  progress.value.total_learning_time = data.total_learning_time
  progress.value.is_completed = data.is_completed
}

// ========== 考试按钮 ==========
const handleExamClick = () => {
  if (!canTakeExam.value) {
    toast.add({ title: '请先完成课程学习后再参加考试', color: 'orange' })
    return
  }
  navigateTo(`/exam/${course.value.exam.id}`)
}

onMounted(loadCourse)
</script>
