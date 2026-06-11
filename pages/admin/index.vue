<template>
  <div>
    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <UCard v-for="card in statCards" :key="card.label">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center" :class="card.bgClass">
            <UIcon :name="card.icon" class="w-6 h-6" :class="card.iconClass" />
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">{{ card.value }}</div>
            <div class="text-sm text-gray-500">{{ card.label }}</div>
          </div>
        </div>
      </UCard>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 最近操作日志 -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold">最近操作</h3>
            <NuxtLink to="/admin/audit-logs" class="text-sm text-primary-600 hover:underline">查看全部</NuxtLink>
          </div>
        </template>
        <UTable :rows="recentLogs" :columns="logColumns" :loading="loading">
          <template #action_type-data="{ row }">
            <UBadge :label="actionTypeLabel(row.action_type)" :color="actionTypeColor(row.action_type)" variant="subtle" size="xs" />
          </template>
          <template #created_at-data="{ row }">
            <span class="text-xs text-gray-500">{{ formatTime(row.created_at) }}</span>
          </template>
        </UTable>
      </UCard>

      <!-- 快捷操作 -->
      <UCard>
        <template #header>
          <h3 class="text-base font-semibold">快捷操作</h3>
        </template>
        <div class="grid grid-cols-2 gap-3">
          <NuxtLink v-for="action in quickActions" :key="action.path" :to="action.path"
            class="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50:bg-primary-900/20 transition-colors">
            <UIcon :name="action.icon" class="w-6 h-6 text-primary-600" />
            <div>
              <div class="text-sm font-medium text-gray-900">{{ action.label }}</div>
              <div class="text-xs text-gray-500">{{ action.desc }}</div>
            </div>
          </NuxtLink>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

const api = useApi()
const loading = ref(true)
const stats = ref<any>({})
const recentLogs = ref<any[]>([])

const statCards = computed(() => [
  { label: '用户总数', value: stats.value.total_users ?? '-', icon: 'i-heroicons-users', bgClass: 'bg-blue-100', iconClass: 'text-blue-600' },
  { label: '课程总数', value: stats.value.published_courses ?? '-', icon: 'i-heroicons-book-open', bgClass: 'bg-green-100', iconClass: 'text-green-600' },
  { label: '考试总数', value: stats.value.active_exams ?? '-', icon: 'i-heroicons-clipboard-document-check', bgClass: 'bg-purple-100', iconClass: 'text-purple-600' },
  { label: '待批改', value: stats.value.pending_reviews ?? '-', icon: 'i-heroicons-pencil-square', bgClass: 'bg-orange-100', iconClass: 'text-orange-600' },
])

const logColumns = [
  { key: 'user.name', label: '用户' },
  { key: 'action_type', label: '操作' },
  { key: 'created_at', label: '时间' },
]

const quickActions = [
  { path: '/admin/users', label: '添加用户', desc: '创建新员工账号', icon: 'i-heroicons-user-plus' },
  { path: '/admin/mentor-bindings', label: '绑定导师', desc: '分配导师给学员', icon: 'i-heroicons-user-group' },
  { path: '/admin/courses', label: '添加课程', desc: '创建新课程内容', icon: 'i-heroicons-plus-circle' },
  { path: '/admin/exams', label: '创建考试', desc: '组卷发布考试', icon: 'i-heroicons-document-plus' },
]

const actionTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    login: '登录', logout: '登出', download_attachment: '下载附件',
    complete_course: '完成课程', submit_exam: '提交考试',
    create_user: '创建用户', update_user: '更新用户', disable_user: '禁用用户',
    create_course: '创建课程', update_course: '更新课程', delete_course: '删除课程',
    create_exam: '创建考试', reset_password: '重置密码',
    create_mentor_binding: '创建绑定', delete_mentor_binding: '解除绑定',
  }
  return map[type] ?? type
}

const actionTypeColor = (type: string) => {
  if (type.includes('create')) return 'green'
  if (type.includes('delete') || type.includes('disable')) return 'red'
  if (type.includes('login')) return 'blue'
  return 'gray'
}

const formatTime = (t: string) => {
  const d = new Date(t)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  return d.toLocaleDateString('zh-CN')
}

onMounted(async () => {
  try {
    const res = await api.get<any>('/admin/dashboard')
    stats.value = res.data.stats
    recentLogs.value = res.data.recent_logs
  } catch (e) {
    console.error('加载仪表盘失败:', e)
  }
  loading.value = false
})
</script>
