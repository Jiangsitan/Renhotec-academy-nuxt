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

    <!-- 搜索和筛选 -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <UInput v-model="filters.keyword" placeholder="搜索学员/课程..." icon="i-heroicons-magnifying-glass" class="w-64" @update:model-value="debouncedLoad" />
      <USelect v-model="filters.department" :options="departmentOptions" placeholder="选择部门" class="w-40" @change="loadProgress(1)" />
      <USelect v-model="filters.is_completed" :options="statusOptions" placeholder="完成状态" class="w-32" @change="loadProgress(1)" />
      <div class="flex-1" />
    </div>

    <!-- 学习进度列表 -->
    <UCard>
      <UTable :rows="progresses" :columns="columns" :loading="loading">
        <template #user-data="{ row }">
          <div>
            <div class="text-sm font-medium text-gray-900">{{ row.user?.name }}</div>
            <div class="text-xs text-gray-500">{{ row.user?.employee_no }}</div>
          </div>
        </template>
        <template #course-data="{ row }">
          <div>
            <div class="text-sm text-gray-900">{{ row.course?.title }}</div>
            <div class="text-xs text-gray-500">
              <UBadge
                :label="row.course?.type === 'video' ? '视频' : '文档'"
                :color="row.course?.type === 'video' ? 'blue' : 'green'"
                variant="subtle"
                size="xs"
              />
            </div>
          </div>
        </template>
        <template #progress-data="{ row }">
          <div class="flex items-center gap-2">
            <div class="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full"
                :class="row.is_completed ? 'bg-green-500' : 'bg-primary-500'"
                :style="{ width: `${row.progress_percentage}%` }"
              />
            </div>
            <span class="text-xs text-gray-500">{{ Math.round(row.progress_percentage) }}%</span>
          </div>
        </template>
        <template #learning_time-data="{ row }">
          <span class="text-sm text-gray-700">{{ formatTime(row.total_learning_time) }}</span>
        </template>
        <template #is_completed-data="{ row }">
          <UBadge
            :label="row.is_completed ? '已完成' : '学习中'"
            :color="row.is_completed ? 'green' : 'orange'"
            variant="subtle"
          />
        </template>
        <template #completed_at-data="{ row }">
          <span class="text-sm text-gray-500">{{ row.completed_at ? formatDate(row.completed_at) : '-' }}</span>
        </template>
      </UTable>

      <template #footer>
        <div class="flex justify-end">
          <UPagination v-model="currentPage" :total="total" :page-count="perPage" @update:model-value="loadProgress" />
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

const api = useApi()

const progresses = ref<any[]>([])
const loading = ref(true)
const currentPage = ref(1)
const total = ref(0)
const perPage = 15
const stats = ref<any>({})

const filters = reactive({ keyword: '', is_completed: '', department: '' })
const departmentOptions = ref<any[]>([{ label: '全部部门', value: '' }])

const columns = [
  { key: 'user', label: '学员' },
  { key: 'course', label: '课程' },
  { key: 'progress', label: '进度' },
  { key: 'learning_time', label: '学习时长' },
  { key: 'is_completed', label: '状态' },
  { key: 'completed_at', label: '完成时间' },
]

const statusOptions = [
  { label: '全部', value: '' },
  { label: '已完成', value: 'true' },
  { label: '学习中', value: 'false' },
]

const statCards = computed(() => [
  { label: '学员总数', value: stats.value.total_students ?? '-', icon: 'i-heroicons-users', bgClass: 'bg-blue-100', iconClass: 'text-blue-600' },
  { label: '课程总数', value: stats.value.total_courses ?? '-', icon: 'i-heroicons-book-open', bgClass: 'bg-green-100', iconClass: 'text-green-600' },
  { label: '已完成次数', value: stats.value.total_completed ?? '-', icon: 'i-heroicons-check-circle', bgClass: 'bg-purple-100', iconClass: 'text-purple-600' },
  { label: '总学习时长', value: formatTime(stats.value.total_learning_time ?? 0), icon: 'i-heroicons-clock', bgClass: 'bg-orange-100', iconClass: 'text-orange-600' },
])

const formatTime = (seconds: number) => {
  if (!seconds || seconds <= 0) return '0分钟'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}小时${m > 0 ? `${m}分钟` : ''}`
  if (m > 0) return `${m}分钟${s > 0 ? `${s}秒` : ''}`
  return `${s}秒`
}

const formatDate = (d: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

let searchTimeout: ReturnType<typeof setTimeout>
const debouncedLoad = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => loadProgress(1), 300)
}

const loadProgress = async (page = 1) => {
  loading.value = true
  try {
    const params: any = { page, per_page: perPage }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.is_completed !== '') params.is_completed = filters.is_completed
    if (filters.department) params.department = filters.department
    const res = await api.get<any>('/admin/learning-progress', params)
    progresses.value = res.data.data
    total.value = res.data.total
    currentPage.value = res.data.current_page
  } catch (e) { console.error(e) }
  loading.value = false
}

const loadDepartments = async () => {
  try {
    const res = await api.get<any>('/admin/users', { per_page: 1000 })
    const departments = [...new Set((res.data.data || []).map((u: any) => u.department).filter(Boolean))]
    departmentOptions.value = [
      { label: '全部部门', value: '' },
      ...departments.sort().map((d: string) => ({ label: d, value: d }))
    ]
  } catch {}
}

const loadStats = async () => {
  try {
    const res = await api.get<any>('/admin/learning-progress/stats')
    stats.value = res.data
  } catch {}
}

onMounted(() => {
  loadProgress()
  loadStats()
  loadDepartments()
})
</script>
