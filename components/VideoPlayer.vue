<template>
  <div class="w-full rounded-xl overflow-hidden bg-black">
    <!-- YouTube iframe -->
    <iframe
      v-if="isYouTube"
      :src="youtubeUrl"
      style="width: 100%; aspect-ratio: 16/9; display: block;"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
    ></iframe>

    <!-- 普通视频 -->
    <video
      v-else
      ref="videoRef"
      :src="src"
      style="width: 100%; aspect-ratio: 16/9; display: block;"
      controls
      playsinline
      preload="auto"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
      @play="onPlay"
      @pause="onPause"
      @ended="onEnded"
      @seeking="onSeeking"
    ></video>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  src: string
  courseId: number
  initialPosition?: number
}>()

const emit = defineEmits<{
  progress: [data: { currentTime: number; duration: number; percentage: number }]
  complete: []
  synced: [data: { progress_percentage: number; total_learning_time: number; is_completed: boolean }]
  play: []
  pause: []
}>()

const api = useApi()
const videoRef = ref<HTMLVideoElement>()
const currentTime = ref(0)
const duration = ref(0)
const lastSyncTime = ref(0)
const isPlaying = ref(false)
const maxWatchedPosition = ref(0) // 跟踪最大观看位置
let syncInterval: ReturnType<typeof setInterval> | null = null

const isYouTube = computed(() => {
  if (!props.src) return false
  return props.src.includes('youtube.com') || props.src.includes('youtu.be')
})

const youtubeUrl = computed(() => {
  if (!isYouTube.value) return ''
  const url = props.src
  let videoId = ''
  const match = url.match(/[?&]v=([^&]+)/)
  if (match) {
    videoId = match[1]
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0] || ''
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : ''
})

const onLoadedMetadata = () => {
  if (!videoRef.value) return
  duration.value = videoRef.value.duration
  // 恢复上次播放位置（但不超过最大观看位置）
  if (props.initialPosition && props.initialPosition > 0) {
    const resumePosition = Math.min(props.initialPosition, duration.value - 1)
    maxWatchedPosition.value = resumePosition // 同步最大观看位置
    videoRef.value.currentTime = resumePosition
  }
}

// 快进限制：处理 seeking 事件
const onSeeking = () => {
  if (!videoRef.value) return
  const currentPos = videoRef.value.currentTime
  // 允许 2 秒误差，防止误操作
  if (currentPos > maxWatchedPosition.value + 2) {
    videoRef.value.currentTime = maxWatchedPosition.value
  }
}

const onTimeUpdate = () => {
  if (!videoRef.value) return
  currentTime.value = videoRef.value.currentTime
  duration.value = videoRef.value.duration || 0

  // 更新最大观看位置
  if (currentTime.value > maxWatchedPosition.value) {
    maxWatchedPosition.value = currentTime.value
  }

  const percentage = duration.value > 0 ? currentTime.value / duration.value : 0
  emit('progress', {
    currentTime: currentTime.value,
    duration: duration.value,
    percentage,
  })
}

const onPlay = () => {
  isPlaying.value = true
  startSync()
  emit('play')
}

const onPause = () => {
  isPlaying.value = false
  syncProgress()
  emit('pause')
}

const onEnded = () => {
  isPlaying.value = false
  syncProgress()
  emit('complete')
}

const startSync = () => {
  stopSync()
  syncInterval = setInterval(syncProgress, 10000)
}

const stopSync = () => {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

const syncProgress = () => {
  if (!videoRef.value) return
  const current = videoRef.value.currentTime
  const total = videoRef.value.duration || 0
  if (current <= 0 || total <= 0) return

  const delta = Math.min(current - lastSyncTime.value, 60)
  if (delta < 1) return

  api.post('/learning/progress/sync', {
    course_id: props.courseId,
    last_position_seconds: Math.floor(current),
    progress_percentage: Math.round((current / total) * 10000) / 100,
    learning_time_delta: Math.floor(delta),
  }).then((res) => {
    lastSyncTime.value = current
    // 通知父组件同步结果
    if (res.data) {
      emit('synced', {
        progress_percentage: res.data.progress_percentage,
        total_learning_time: res.data.total_learning_time,
        is_completed: res.data.is_completed,
      })
    }
  }).catch(() => {})
}

onMounted(() => {
  if (!isYouTube.value) startSync()
})

onBeforeUnmount(() => {
  syncProgress()
  stopSync()
})
</script>
