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
    <div v-else class="relative">
      <video
        ref="videoRef"
        :src="src"
        style="width: 100%; aspect-ratio: 16/9; display: block;"
        playsinline
        preload="auto"
        @loadedmetadata="onLoadedMetadata"
        @timeupdate="onTimeUpdate"
        @play="onPlay"
        @pause="onPause"
        @ended="onEnded"
        @seeking="onSeeking"
        @seeked="onSeeked"
      ></video>

      <!-- 自定义控件 -->
      <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
        <!-- 进度条 -->
        <div class="h-1 bg-gray-600 rounded-full mb-3 cursor-pointer relative" @click="handleProgressClick">
          <div class="absolute top-0 left-0 h-full bg-primary-500 rounded-full transition-all" :style="{ width: progressPercent + '%' }"></div>
          <div class="absolute top-0 h-full w-3 bg-white rounded-full shadow -translate-x-1/2 transition-all" :style="{ left: progressPercent + '%' }"></div>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button @click="togglePlay" class="text-white hover:text-primary-300 transition-colors">
              <UIcon :name="isPlaying ? 'i-heroicons-pause-solid' : 'i-heroicons-play-solid'" class="w-6 h-6" />
            </button>
            <span class="text-white text-sm font-mono">
              {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
            </span>
          </div>
        </div>
      </div>
    </div>
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
const maxWatchedPosition = ref(0)
const isSeeking = ref(false)
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

const progressPercent = computed(() => {
  if (duration.value <= 0) return 0
  return (currentTime.value / duration.value) * 100
})

const onLoadedMetadata = () => {
  if (!videoRef.value) return
  duration.value = videoRef.value.duration

  if (props.initialPosition && props.initialPosition > 0) {
    const resumePosition = Math.min(props.initialPosition, duration.value - 1)
    videoRef.value.currentTime = resumePosition
    maxWatchedPosition.value = resumePosition
  }
}

const onSeeking = () => {
  if (!videoRef.value) return
  isSeeking.value = true
  const currentPos = videoRef.value.currentTime

  if (currentPos > maxWatchedPosition.value) {
    videoRef.value.currentTime = maxWatchedPosition.value
  }
}

const onSeeked = () => {
  isSeeking.value = false
}

const onTimeUpdate = () => {
  if (!videoRef.value) return
  const currentPos = videoRef.value.currentTime
  duration.value = videoRef.value.duration || 0

  if (!isSeeking.value) {
    if (currentPos > maxWatchedPosition.value) {
      maxWatchedPosition.value = currentPos
    }
    currentTime.value = currentPos
  } else {
    if (currentPos > maxWatchedPosition.value) {
      videoRef.value.currentTime = maxWatchedPosition.value
    }
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

const togglePlay = () => {
  if (!videoRef.value) return
  if (videoRef.value.paused) {
    videoRef.value.play()
  } else {
    videoRef.value.pause()
  }
}

const handleProgressClick = (e: MouseEvent) => {
  if (!videoRef.value) return
  const rect = (e.target as HTMLElement).getBoundingClientRect()
  const percent = (e.clientX - rect.left) / rect.width
  const seekTime = percent * duration.value

  if (seekTime <= maxWatchedPosition.value) {
    videoRef.value.currentTime = seekTime
  }
}

const formatTime = (seconds: number) => {
  if (!seconds || seconds <= 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
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
