<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">我的考试</h1>
      <p class="text-sm text-gray-500 mt-1">查看考试记录和成绩</p>
    </div>

    <div v-if="loading" class="text-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-gray-300 animate-spin mx-auto" />
    </div>

    <div v-else-if="records.length === 0" class="text-center py-12">
      <UIcon name="i-heroicons-clipboard-document" class="w-12 h-12 text-gray-300 mx-auto" />
      <p class="text-sm text-gray-500 mt-3">暂无考试记录</p>
      <NuxtLink to="/" class="text-sm text-primary-600 hover:underline mt-2 inline-block">
        前往学习课程 →
      </NuxtLink>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="record in records"
        :key="record.id"
        class="bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-200 transition-colors"
      >
        <div class="flex items-center gap-4">
          <!-- 状态图标 -->
          <div
            class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            :class="getStatusClass(record)"
          >
            <UIcon :name="getStatusIcon(record)" class="w-6 h-6" />
          </div>

          <!-- 信息 -->
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-medium text-gray-900 truncate">
              {{ record.exam?.title }}
            </h3>
            <div class="flex items-center gap-3 mt-1">
              <span class="text-xs text-gray-500">
                {{ formatDate(record.submitted_at) }}
              </span>
              <UBadge
                :label="getStatusLabel(record)"
                :color="getStatusColor(record)"
                variant="subtle"
                size="xs"
              />
            </div>
          </div>

          <!-- 分数 -->
          <div class="text-right shrink-0">
            <div class="text-2xl font-bold" :class="getScoreClass(record)">
              {{ record.total_score != null ? formatScore(record.total_score) : '-' }}
            </div>
            <div class="text-xs text-gray-400">
              {{ record.exam?.passing_score ? `及格 ${formatScore(record.exam.passing_score)}` : '' }}
            </div>
          </div>

          <!-- 操作 -->
          <div class="shrink-0">
            <UButton
              :to="`/exam/result/${record.id}`"
              color="gray"
              variant="ghost"
              icon="i-heroicons-eye"
              size="xs"
              label="详情"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="mt-6 flex justify-center">
      <UPagination v-model="currentPage" :total="total" :page-count="perPage" @update:model-value="loadRecords" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatScore } from '~/utils/format'

definePageMeta({ middleware: 'auth' })

const api = useApi()

const records = ref<any[]>([])
const loading = ref(true)
const currentPage = ref(1)
const total = ref(0)
const totalPages = ref(1)
const perPage = 15

const loadRecords = async (page = 1) => {
  loading.value = true
  try {
    const res = await api.get<any>('/my-exam-records', { page, per_page: perPage })
    records.value = res.data.data
    total.value = res.data.meta?.total ?? 0
    currentPage.value = res.data.meta?.current_page ?? 1
    totalPages.value = res.data.meta?.last_page ?? 1
  } catch (e: any) {
    console.error(e)
    records.value = []
  }
  loading.value = false
}

const formatDate = (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-'

const getStatusLabel = (r: any) => {
  if (r.status === 3) return '待批改'
  if (r.status === 5) return '已驳回'
  if (r.status === 4 || r.status === 2) {
    if (r.total_score !== null && r.exam?.passing_score) {
      return r.total_score >= r.exam.passing_score ? '通过' : '未通过'
    }
    return '已完成'
  }
  return r.status
}

const getStatusClass = (r: any) => {
  if (r.status === 3) return 'bg-orange-100 text-orange-600'
  if (r.status === 5) return 'bg-red-100 text-red-600'
  if (r.total_score !== null && r.exam?.passing_score) {
    return r.total_score >= r.exam.passing_score
      ? 'bg-green-100 text-green-600'
      : 'bg-red-100 text-red-600'
  }
  return 'bg-gray-100 text-gray-500'
}

const getStatusIcon = (r: any) => {
  if (r.status === 3) return 'i-heroicons-clock'
  if (r.status === 5) return 'i-heroicons-exclamation-triangle'
  if (r.total_score !== null && r.exam?.passing_score) {
    return r.total_score >= r.exam.passing_score ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'
  }
  return 'i-heroicons-clipboard-document-check'
}

const getStatusColor = (r: any) => {
  if (r.status === 3) return 'orange'
  if (r.status === 5) return 'red'
  if (r.total_score !== null && r.exam?.passing_score) {
    return r.total_score >= r.exam.passing_score ? 'green' : 'red'
  }
  return 'gray'
}

const getScoreClass = (r: any) => {
  if (r.status === 3) return 'text-orange-500'
  if (r.status === 5) return 'text-red-500'
  if (r.total_score !== null && r.exam?.passing_score) {
    return r.total_score >= r.exam.passing_score ? 'text-green-600' : 'text-red-500'
  }
  return 'text-gray-400'
}

onMounted(loadRecords)
</script>
