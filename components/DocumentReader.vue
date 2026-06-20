<template>
  <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
    <!-- 文档内容区 -->
    <div class="p-6">
      <slot />
    </div>

    <!-- 阅读进度栏 -->
    <div class="border-t border-gray-200 p-4 bg-gray-50">
      <!-- 进度条（仅 showProgress 为 true 时显示） -->
      <template v-if="props.showProgress !== false">
        <div class="h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
          <div
            class="h-full rounded-full transition-all duration-1000"
            :class="isCompleted ? 'bg-green-500' : canComplete ? 'bg-green-500' : 'bg-primary-500'"
            :style="{ width: displayPercent + '%' }"
          />
        </div>
      </template>

      <button
        @click="handleComplete"
        :disabled="!canComplete || completing || isCompleted"
        class="w-full py-3 text-sm font-medium rounded-lg transition-colors"
        :class="isCompleted
          ? 'bg-green-100 text-green-700 cursor-default'
          : canComplete
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'"
      >
        {{ completing ? '提交中...' : isCompleted ? '✅ 已完成学习' : canComplete ? '我已学习' : '未完成学习' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  courseId: number
  minReadTime: number
  completed?: boolean
  initialElapsed?: number
  autoStart?: boolean
  showProgress?: boolean
}>()

const emit = defineEmits<{
  completed: []
  synced: [data: { progress_percentage: number; total_learning_time: number; is_completed: boolean }]
}>()

const api = useApi()
const toast = useToast()
const elapsed = ref(0)
const localCompleted = ref(false)
const completing = ref(false)
const isPaused = ref(false)
let timer: ReturnType<typeof setInterval> | null = null
let syncInterval: ReturnType<typeof setInterval> | null = null
let hiddenTime = 0

// 监听 courseId 变化，重置状态并重新启动计时器（确保用户隔离）
watch(() => props.courseId, (newId, oldId) => {
  if (newId && newId !== oldId) {
    elapsed.value = 0
    localCompleted.value = false
    stopTimer()
    stopSync()

    // 使用 setTimeout 确保组件完全水合后再启动计时器
    setTimeout(() => {
      if (!isCompleted.value && props.autoStart !== false) {
        startTimer()
        startSync()
      }
    }, 100)
  }
})

// 合并外部和内部完成状态
const isCompleted = computed(() => props.completed || localCompleted.value)
const canComplete = computed(() => {
  // 如果 minReadTime 为 0，则不允许手动完成（由视频播放完成触发）
  if (props.minReadTime <= 0) return false
  return elapsed.value >= props.minReadTime
})
const remainingTime = computed(() => Math.max(0, props.minReadTime - elapsed.value))
const displayPercent = computed(() => {
  if (isCompleted.value) return 100
  // 如果 minReadTime 为 0，显示 0%（等待视频播放完成）
  if (props.minReadTime <= 0) return 0
  return Math.min(100, (elapsed.value / props.minReadTime) * 100)
})

const startTimer = () => {
  stopTimer()
  timer = setInterval(() => {
    if (!isPaused.value) {
      elapsed.value++
    }
  }, 1000)
}

const stopTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

const pause = () => { isPaused.value = true }
const resume = () => { isPaused.value = false }

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
  if (isCompleted.value || elapsed.value <= 0) return

  api.post('/learning/progress/sync', {
    course_id: props.courseId,
    last_position_seconds: 0,
    progress_percentage: displayPercent.value,
    learning_time_delta: 10,
  }).then((res) => {
    if (res.data) {
      emit('synced', {
        progress_percentage: res.data.progress_percentage,
        total_learning_time: res.data.total_learning_time,
        is_completed: res.data.is_completed,
      })
    }
  }).catch(() => {})
}

const handleVisibilityChange = () => {
  if (document.hidden) {
    hiddenTime = Date.now()
    stopTimer()
  } else {
    if (hiddenTime > 0) {
      const awaySeconds = Math.floor((Date.now() - hiddenTime) / 1000)
      elapsed.value = Math.max(0, elapsed.value - awaySeconds)
      hiddenTime = 0
    }
    if (!isCompleted.value) {
      startTimer()
    }
  }
}

const handleComplete = async () => {
  if (!canComplete.value || isCompleted.value || completing.value) return

  completing.value = true
  try {
    await api.post('/learning/progress/complete', {
      course_id: props.courseId,
      elapsed_time: elapsed.value,
    })
    localCompleted.value = true
    stopTimer()
    stopSync()
    toast.add({ title: '课程已完成', color: 'green' })
    emit('completed')
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '提交失败', color: 'red' })
  } finally {
    completing.value = false
  }
}

onMounted(() => {
  // 重置状态（确保用户隔离）
  elapsed.value = 0
  localCompleted.value = false
  
  // 恢复当前用户的学习进度
  if (props.initialElapsed && props.initialElapsed > 0) {
    elapsed.value = props.initialElapsed
  }

  // 使用 setTimeout 确保组件完全水合后再启动计时器
  setTimeout(() => {
    if (!isCompleted.value && props.autoStart !== false) {
      startTimer()
      startSync()
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }
  }, 100)
})

onBeforeUnmount(() => {
  syncProgress()
  stopTimer()
  stopSync()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

defineExpose({ pause, resume, startTimer, startSync })
</script>
