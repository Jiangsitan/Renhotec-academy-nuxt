<template>
  <div v-if="loading" class="text-center py-16">
    <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-gray-300 animate-spin mx-auto" />
  </div>

  <div v-else-if="series">
    <!-- 面包屑 -->
    <nav class="flex items-center gap-2 text-sm text-gray-500 mb-6">
      <NuxtLink to="/" class="hover:text-primary-600">培训中心</NuxtLink>
      <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
      <span>{{ series.category?.name }}</span>
      <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
      <span class="text-gray-900 font-medium">{{ series.name }}</span>
    </nav>

    <!-- 系列信息 -->
    <div class="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
      <div class="flex items-start gap-4">
        <div class="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
          <UIcon name="i-heroicons-play-circle" class="w-8 h-8 text-primary-600" />
        </div>
        <div class="flex-1">
          <h1 class="text-xl font-bold text-gray-900">{{ series.name }}</h1>
          <p class="text-sm text-gray-500 mt-1">{{ series.description }}</p>
          <div class="flex items-center gap-4 mt-3 text-sm text-gray-400">
            <span class="flex items-center gap-1">
              <UIcon name="i-heroicons-film" class="w-4 h-4" />
              {{ series.videos_count }} 集视频
            </span>
            <span class="flex items-center gap-1">
              <UIcon name="i-heroicons-folder" class="w-4 h-4" />
              {{ series.category?.name }}
            </span>
            <span v-if="allAttachments.length > 0" class="flex items-center gap-1">
              <UIcon name="i-heroicons-paper-clip" class="w-4 h-4" />
              {{ allAttachments.length }} 个附件
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
      <button
        @click="activeTab = 'courses'"
        class="px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
        :class="activeTab === 'courses' ? 'bg-primary-600 text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'"
      >
        课程列表
      </button>
      <button
        @click="activeTab = 'attachments'"
        class="px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
        :class="activeTab === 'attachments' ? 'bg-primary-600 text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'"
      >
        相关附件
      </button>
      <button
        @click="activeTab = 'comments'"
        class="px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
        :class="activeTab === 'comments' ? 'bg-primary-600 text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'"
      >
        互动专区
      </button>
    </div>

    <!-- 课程列表 tab -->
    <div v-if="activeTab === 'courses'" class="space-y-3">
      <div
        v-for="(video, idx) in videos"
        :key="video.id"
        class="bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-200 transition-colors"
      >
        <div class="flex items-center gap-4">
          <!-- 序号 -->
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
            :class="video.progress?.is_completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'">
            <UIcon v-if="video.progress?.is_completed" name="i-heroicons-check" class="w-5 h-5" />
            <span v-else>{{ idx + 1 }}</span>
          </div>

          <!-- 信息 -->
          <div class="flex-1 min-w-0">
            <NuxtLink :to="`/course/${video.id}`" class="text-sm font-medium text-gray-900 hover:text-primary-600 transition-colors">
              {{ video.title }}
            </NuxtLink>
            <div class="flex items-center gap-3 mt-1">
              <span v-if="video.duration" class="text-xs text-gray-400">
                {{ Math.floor(video.duration / 60) }} 分钟
              </span>
              <span v-if="video.progress" class="text-xs" :class="video.progress.is_completed ? 'text-green-600' : 'text-primary-600'">
                {{ video.progress.is_completed ? '已完成' : `${Math.round(video.progress.progress_percentage)}%` }}
              </span>
              <span v-if="video.progress?.total_learning_time > 0" class="text-xs text-gray-400">
                已学习 {{ formatTime(video.progress.total_learning_time) }}
              </span>
              <span v-if="isYouTubeVideo(video)" class="text-xs text-orange-500">
                需手动标记完成
              </span>
            </div>
            <!-- 进度条 -->
            <div v-if="video.progress && !video.progress.is_completed" class="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden max-w-xs">
              <div class="h-full bg-primary-500 rounded-full" :style="{ width: `${video.progress.progress_percentage}%` }" />
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex items-center gap-2 shrink-0">
            <button
              v-if="video.has_exam"
              @click="handleExamClick(video)"
              class="text-orange-600 hover:bg-orange-50 flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors"
            >
              <UIcon name="i-heroicons-clipboard-document-check" class="w-4 h-4" />
              考试
            </button>
            <UButton
              v-if="video.attachments?.length > 0"
              :to="`/course/${video.id}`"
              color="gray"
              variant="ghost"
              icon="i-heroicons-paper-clip"
              size="xs"
              label="附件"
            />
            <UButton
              :to="`/course/${video.id}`"
              :color="video.progress?.is_completed ? 'green' : 'primary'"
              variant="soft"
              :icon="video.progress?.is_completed ? 'i-heroicons-arrow-path' : 'i-heroicons-play'"
              size="xs"
              :label="video.progress?.is_completed ? '复习' : '学习'"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 相关附件 tab -->
    <div v-if="activeTab === 'attachments'">
      <div v-if="videosWithAttachments.length === 0" class="text-center py-12">
        <UIcon name="i-heroicons-document-arrow-down" class="w-12 h-12 text-gray-300 mx-auto" />
        <p class="text-sm text-gray-500 mt-3">暂无相关附件</p>
      </div>

      <div v-else>
        <!-- 按课程分组显示附件 -->
        <div v-for="video in videosWithAttachments" :key="video.id" class="mb-6">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">{{ video.title }}</h3>
          <div class="space-y-2">
            <AttachmentDownload
              v-for="att in video.attachments"
              :key="att.id"
              :attachment="att"
              mode="download"
            />
          </div>
        </div>

        <!-- 批量下载按钮 -->
        <div class="mt-6 pt-4 border-t border-gray-200">
          <button
            @click="batchDownload"
            :disabled="downloading"
            class="w-full py-3 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <UIcon v-if="downloading" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
            <UIcon v-else name="i-heroicons-arrow-down-tray" class="w-4 h-4" />
            {{ downloading ? '打包下载中...' : `一键批量下载 (${allAttachments.length} 个文件)` }}
          </button>
        </div>
      </div>
    </div>

    <!-- 互动专区 tab -->
    <div v-if="activeTab === 'comments'">
      <CommentSection :series-id="seriesId" />
    </div>

    <!-- 未完成课程提示弹窗 -->
    <UModal v-model="showIncompleteModal">
      <UCard>
        <template #header>
          <h3 class="text-base font-semibold">需先完成以下课程</h3>
        </template>
        <div class="space-y-3">
          <p class="text-sm text-gray-600">完成以下课程后才能参加考试：</p>
          <ul class="space-y-2">
            <li v-for="c in incompleteCourses" :key="c.id" class="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
              <span class="text-sm text-gray-700">{{ c.title }}</span>
              <NuxtLink :to="`/course/${c.id}`" class="text-sm text-primary-600 hover:underline" @click="showIncompleteModal = false">
                前往学习
              </NuxtLink>
            </li>
          </ul>
        </div>
        <template #footer>
          <div class="flex justify-end">
            <UButton color="gray" label="知道了" @click="showIncompleteModal = false" />
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import AttachmentDownload from '~/components/course/AttachmentDownload.vue'
import CommentSection from '~/components/series/CommentSection.vue'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const api = useApi()
const toast = useToast()

const seriesId = Number(route.params.id)
const series = ref<any>(null)
const videos = ref<any[]>([])
const loading = ref(true)
const activeTab = ref<'courses' | 'attachments' | 'comments'>('courses')
const downloading = ref(false)

// 未完成课程弹窗
const showIncompleteModal = ref(false)
const incompleteCourses = ref<any[]>([])

// 支持 URL 参数切换 tab
onMounted(() => {
  const tab = route.query.tab as string
  if (tab === 'comments' || tab === 'attachments') {
    activeTab.value = tab
  }
})

const formatTime = (seconds: number) => {
  if (!seconds || seconds <= 0) return '0分钟'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}小时${m > 0 ? `${m}分钟` : ''}`
  if (m > 0) return `${m}分钟${s > 0 ? `${s}秒` : ''}`
  return `${s}秒`
}

const isYouTubeVideo = (video: any) => {
  return video.content_url?.includes('youtube.com') || video.content_url?.includes('youtu.be')
}

const videosWithAttachments = computed(() =>
  videos.value.filter(v => v.attachments?.length > 0)
)

const allAttachments = computed(() =>
  videos.value.flatMap(v => v.attachments || [])
)

const handleExamClick = async (video: any) => {
  try {
    const res = await api.get<any>('/exams', { course_id: video.id })
    if (res.data.data.length === 0) {
      toast.add({ title: '该课程暂无考试', color: 'orange' })
      return
    }
    const exam = res.data.data[0]
    if (exam.can_take) {
      navigateTo(`/exam/${exam.id}`)
    } else {
      // 显示弹窗
      incompleteCourses.value = exam.incomplete_courses || []
      showIncompleteModal.value = true
    }
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '获取考试信息失败', color: 'red' })
  }
}

const batchDownload = async () => {
  if (allAttachments.value.length === 0) return
  downloading.value = true
  try {
    const attachmentIds = allAttachments.value.map(a => a.id)
    const res = await api.post<any>('/attachments/batch-download', {
      attachment_ids: attachmentIds,
      series_name: series.value?.name || '附件',
    })
    window.open(res.data.download_url, '_blank')
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '批量下载失败', color: 'red' })
  } finally {
    downloading.value = false
  }
}

onMounted(async () => {
  try {
    const res = await api.get<any>(`/series/${seriesId}`)
    series.value = res.data.series
    videos.value = res.data.videos
  } catch (e: any) {
    if (e?.statusCode === 404 || e?.statusCode === 403) {
      navigateTo('/')
    } else {
      toast.add({ title: e?.data?.message || '加载系列详情失败', color: 'red' })
    }
  }
  loading.value = false
})
</script>
