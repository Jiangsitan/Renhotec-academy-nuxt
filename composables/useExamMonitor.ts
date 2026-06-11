import { ref, onUnmounted } from 'vue'

export function useExamMonitor(options: {
  examId: number
  examRecordId?: number | null
  maxWarnings?: number
  onSubmit: (force?: boolean) => Promise<void>
}) {
  const { examId, examRecordId = null, maxWarnings = 3, onSubmit } = options

  const api = useApi()
  const toast = useToast()

  const warningCount = ref(0)
  const showWarning = ref(false)
  const warningMessage = ref('')
  const isFullscreen = ref(false)

  let monitoring = false
  let submitting = false
  let lastWarningTime = 0

  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen()
      isFullscreen.value = true
    } catch {
      toast.add({ title: '无法进入全屏模式，请允许全屏权限', color: 'red' })
    }
  }

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
  }

  const recordWarning = (action: string, message: string) => {
    if (submitting) return

    const now = Date.now()
    if (now - lastWarningTime < 2000) return
    lastWarningTime = now

    warningCount.value++
    warningMessage.value = `${message}（${warningCount.value}/${maxWarnings}）`
    showWarning.value = true

    api.post(`/exams/${examId}/cheat`, {
      action,
      detail: message,
      exam_record_id: examRecordId,
    }).catch(() => {})

    setTimeout(() => { showWarning.value = false }, 3000)

    if (warningCount.value >= maxWarnings) {
      submitting = true
      toast.add({ title: '检测到多次离开考试页面，试卷将自动提交', color: 'red' })
      setTimeout(() => { onSubmit(true) }, 1500)
    }
  }

  const handleVisibilityChange = () => {
    if (document.hidden && !submitting) {
      recordWarning('leave_page', '检测到您离开了考试页面')
    }
  }

  const handleBlur = () => {
    if (!submitting && document.visibilityState === 'visible') {
      recordWarning('blur', '检测到浏览器窗口失去焦点')
    }
  }

  const handleFullscreenChange = () => {
    isFullscreen.value = !!document.fullscreenElement
    if (!document.fullscreenElement && monitoring && !submitting) {
      recordWarning('exit_fullscreen', '检测到退出全屏模式')
      setTimeout(() => {
        if (monitoring && !submitting) enterFullscreen()
      }, 1000)
    }
  }

  const startMonitoring = () => {
    monitoring = true
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
  }

  const stopMonitoring = () => {
    monitoring = false
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('blur', handleBlur)
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }

  onUnmounted(() => {
    stopMonitoring()
    exitFullscreen()
  })

  return {
    warningCount,
    showWarning,
    warningMessage,
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    startMonitoring,
    stopMonitoring,
  }
}
