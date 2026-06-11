<template>
  <div>
    <!-- 统计卡片 -->
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
      <UCard v-for="s in statCards" :key="s.label">
        <div class="text-center">
          <div class="text-2xl font-bold" :class="s.textClass">{{ s.value }}</div>
          <div class="text-xs text-gray-500 mt-1">{{ s.label }}</div>
        </div>
      </UCard>
    </div>

    <!-- 筛选 -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <UInput v-model="filters.user_id" placeholder="用户ID筛选" icon="i-heroicons-user" class="w-40" @change="loadLogs(1)" />
      <USelect v-model="filters.action_type" :options="actionTypeOptions" placeholder="操作类型" class="w-36" @change="loadLogs(1)" />
      <UInput v-model="filters.date_from" type="date" class="w-40" @change="loadLogs(1)" />
      <span class="text-gray-400">至</span>
      <UInput v-model="filters.date_to" type="date" class="w-40" @change="loadLogs(1)" />
      <div class="flex-1" />
      <UButton color="gray" icon="i-heroicons-arrow-path" label="刷新" @click="loadLogs(1)" />
    </div>

    <UCard>
      <UTable :rows="logs" :columns="columns" :loading="loading">
        <template #user-data="{ row }">
          <div>
            <div class="font-medium text-sm">{{ row.user?.name ?? '-' }}</div>
            <div class="text-xs text-gray-500">{{ row.user?.employee_no ?? '' }}</div>
          </div>
        </template>
        <template #action_type-data="{ row }">
          <UBadge :label="actionLabel(row.action_type)" :color="actionColor(row.action_type)" variant="subtle" size="xs" />
        </template>
        <template #target_type-data="{ row }">
          <span class="text-xs text-gray-500">{{ targetLabel(row.target_type) }} #{{ row.target_id }}</span>
        </template>
        <template #ip_address-data="{ row }">
          <span class="text-xs font-mono text-gray-500">{{ row.ip_address ?? '-' }}</span>
        </template>
        <template #created_at-data="{ row }">
          <span class="text-xs text-gray-500">{{ new Date(row.created_at).toLocaleString('zh-CN') }}</span>
        </template>
      </UTable>
      <template #footer>
        <div class="flex justify-end">
          <UPagination v-model="currentPage" :total="total" :page-count="perPage" @update:model-value="loadLogs" />
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

const api = useApi()

const logs = ref<any[]>([])
const logStats = ref<any>({})
const loading = ref(true)
const currentPage = ref(1)
const total = ref(0)
const perPage = 20
const filters = reactive({ user_id: '', action_type: '', date_from: '', date_to: '' })

const columns = [
  { key: 'created_at', label: '时间' },
  { key: 'user', label: '用户' },
  { key: 'action_type', label: '操作' },
  { key: 'target_type', label: '目标' },
  { key: 'ip_address', label: 'IP地址' },
]

const statCards = computed(() => [
  { label: '今日总操作', value: logStats.value.today_total ?? '-', textClass: 'text-gray-900' },
  { label: '今日登录', value: logStats.value.today_logins ?? '-', textClass: 'text-blue-600' },
  { label: '今日下载', value: logStats.value.today_downloads ?? '-', textClass: 'text-green-600' },
  { label: '今日完成课程', value: logStats.value.today_completions ?? '-', textClass: 'text-purple-600' },
  { label: '今日提交考试', value: logStats.value.today_exams ?? '-', textClass: 'text-orange-600' },
])

const actionTypeOptions = [
  { label: '全部', value: '' },
  { label: '登录', value: 'login' },
  { label: '登出', value: 'logout' },
  { label: '下载附件', value: 'download_attachment' },
  { label: '完成课程', value: 'complete_course' },
  { label: '提交考试', value: 'submit_exam' },
  { label: '创建用户', value: 'create_user' },
  { label: '更新用户', value: 'update_user' },
  { label: '重置密码', value: 'reset_password' },
  { label: '创建绑定', value: 'create_mentor_binding' },
  { label: '解除绑定', value: 'delete_mentor_binding' },
]

const actionLabel = (t: string) => {
  const map: Record<string, string> = {
    login: '登录', logout: '登出', download_attachment: '下载附件',
    complete_course: '完成课程', submit_exam: '提交考试',
    create_user: '创建用户', update_user: '更新用户', disable_user: '禁用用户',
    create_course: '创建课程', update_course: '更新课程', delete_course: '删除课程',
    create_exam: '创建考试', reset_password: '重置密码',
    create_mentor_binding: '创建绑定', delete_mentor_binding: '解除绑定',
  }
  return map[t] ?? t
}

const actionColor = (t: string) => {
  if (t.includes('create')) return 'green'
  if (t.includes('delete') || t.includes('disable')) return 'red'
  if (t.includes('login')) return 'blue'
  return 'gray'
}

const targetLabel = (t: string) => {
  const map: Record<string, string> = { user: '用户', course: '课程', exam: '考试', attachment: '附件', mentor_student: '绑定' }
  return map[t] ?? t
}

const loadLogs = async (page = 1) => {
  loading.value = true
  try {
    const params: any = { page, per_page: perPage }
    if (filters.user_id) params.user_id = filters.user_id
    if (filters.action_type) params.action_type = filters.action_type
    if (filters.date_from) params.date_from = filters.date_from
    if (filters.date_to) params.date_to = filters.date_to
    const res = await api.get<any>('/admin/audit-logs', params)
    logs.value = res.data.data
    total.value = res.data.total
    currentPage.value = res.data.current_page
  } catch (e) { console.error(e) }
  loading.value = false
}

const loadStats = async () => {
  try {
    const res = await api.get<any>('/admin/audit-logs/stats')
    logStats.value = res.data.stats
  } catch {}
}

onMounted(() => {
  loadLogs()
  loadStats()
})
</script>
