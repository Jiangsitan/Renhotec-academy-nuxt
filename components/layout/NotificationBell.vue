<template>
  <div class="relative">
    <button @click="toggleDropdown" class="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
      <UIcon name="i-heroicons-bell" class="w-5 h-5" />
      <span
        v-if="unreadCount > 0"
        class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <!-- 通知下拉列表 -->
    <div
      v-if="showDropdown"
      class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-[60]"
    >
      <div class="p-3 border-b border-gray-100 flex items-center justify-between">
        <h3 class="text-sm font-semibold">通知</h3>
        <button
          v-if="unreadCount > 0"
          @click="markAllAsRead"
          class="text-xs text-primary-600 hover:underline"
        >
          全部已读
        </button>
      </div>

      <div class="max-h-96 overflow-y-auto">
        <div v-if="notifications.length === 0" class="p-6 text-center text-sm text-gray-500">
          暂无通知
        </div>
        <div
          v-for="notification in notifications"
          :key="notification.id"
          @click="handleNotificationClick(notification)"
          class="px-3 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50"
          :class="{ 'bg-primary-50': !notification.read_at }"
        >
          <div class="flex items-start gap-2">
            <div
              v-if="!notification.read_at"
              class="w-2 h-2 bg-primary-500 rounded-full mt-1.5 shrink-0"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-700">{{ notification.data?.message }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ formatDate(notification.created_at) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 点击外部关闭 -->
    <div v-if="showDropdown" class="fixed inset-0 z-50" @click="showDropdown = false" />
  </div>
</template>

<script setup lang="ts">
const api = useApi()
const router = useRouter()
const toast = useToast()

const showDropdown = ref(false)
const unreadCount = ref(0)
const notifications = ref<any[]>([])

const loadUnreadCount = async () => {
  try {
    const res = await api.get<any>('/notifications/unread-count')
    unreadCount.value = res.data?.count || 0
  } catch (e: any) {
    console.error('加载未读通知数失败:', e?.data?.message || e?.message)
  }
}

const loadNotifications = async () => {
  try {
    const res = await api.get<any>('/notifications', { per_page: 20 })
    notifications.value = res.data?.data || []
  } catch (e: any) {
    console.error('加载通知列表失败:', e?.data?.message || e?.message)
    toast.add({ title: '加载通知失败', color: 'red' })
  }
}

const toggleDropdown = async () => {
  showDropdown.value = !showDropdown.value
  if (showDropdown.value) {
    await loadNotifications()
    // 标记所有为已读
    if (unreadCount.value > 0) {
      try {
        await api.put('/notifications/read-all')
        unreadCount.value = 0
      } catch (e: any) {
        console.error('标记已读失败:', e?.data?.message || e?.message)
      }
    }
  }
}

const markAllAsRead = async () => {
  try {
    await api.put('/notifications/read-all')
    unreadCount.value = 0
    notifications.value.forEach(n => {
      if (!n.read_at) n.read_at = new Date().toISOString()
    })
  } catch {}
}

const handleNotificationClick = (notification: any) => {
  // 标记为已读
  if (!notification.read_at) {
    api.put(`/notifications/${notification.id}/read`)
    notification.read_at = new Date().toISOString()
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }

  showDropdown.value = false

  // 根据通知类型跳转
  const data = notification.data || {}
  if (data.exam_record_id) {
    router.push(`/exam/result/${data.exam_record_id}`)
  } else if (data.course_id) {
    router.push(`/course/${data.course_id}`)
  } else if (data.series_id) {
    router.push(`/series/${data.series_id}?tab=comments`)
  }
}

const formatDate = (date: string) => {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000

  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  return d.toLocaleDateString('zh-CN')
}

let pollTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  loadUnreadCount()
  pollTimer = setInterval(loadUnreadCount, 60000)
})

onBeforeUnmount(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})
</script>
