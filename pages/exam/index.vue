<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">考试中心</h1>
      <p class="text-sm text-gray-500 mt-1">参加考试检验学习成果</p>
    </div>

    <div v-if="loading" class="text-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-gray-300 animate-spin" />
    </div>

    <div v-else-if="exams.length === 0" class="text-center py-12">
      <UIcon name="i-heroicons-clipboard-document" class="w-12 h-12 text-gray-300 mx-auto" />
      <p class="text-sm text-gray-500 mt-3">暂无考试</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard v-for="exam in exams" :key="exam.id" class="hover:shadow-lg transition-shadow">
        <div class="flex items-start justify-between mb-3">
          <h3 class="font-semibold text-gray-900">{{ exam.title }}</h3>
          <UBadge v-if="exam.can_take" label="可考" color="green" variant="subtle" />
          <UBadge v-else label="未解锁" color="orange" variant="subtle" />
        </div>
        <div class="space-y-2 text-sm text-gray-500 mb-4">
          <div class="flex justify-between">
            <span>考试时长</span>
            <span class="text-gray-700">{{ exam.time_limit }} 分钟</span>
          </div>
          <div class="flex justify-between">
            <span>及格分数</span>
            <span class="text-gray-700">{{ formatScore(exam.passing_score) }} 分</span>
          </div>
        </div>

        <NuxtLink
          v-if="exam.can_take"
          :to="`/exam/${exam.id}`"
          class="block w-full py-2.5 bg-primary-600 text-white text-sm font-medium text-center rounded-lg hover:bg-primary-700"
        >
          进入考试
        </NuxtLink>
        <div v-else>
          <p class="text-xs text-orange-500 mb-2">{{ exam.reason }}</p>
          <div class="block w-full py-2.5 bg-gray-200 text-gray-400 text-sm font-medium text-center rounded-lg cursor-not-allowed">
            需先完成课程
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatScore } from '~/utils/format'

definePageMeta({ middleware: 'auth' })

const api = useApi()
const exams = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await api.get<any>('/exams')
    exams.value = res.data.data
  } catch (e) { console.error('加载考试失败:', e) }
  loading.value = false
})
</script>
