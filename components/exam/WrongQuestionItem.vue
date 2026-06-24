<template>
  <div class="bg-white rounded-xl border border-gray-200 p-5" :class="borderClass">
    <div class="flex items-start justify-between mb-3">
      <h3 class="text-sm font-semibold text-gray-700">
        第 {{ index + 1 }} 题 · {{ typeLabel }}
      </h3>
      <span class="text-sm text-gray-400">{{ formatScore(question.score) }} 分</span>
    </div>

    <p class="text-gray-700 mb-4">{{ question.content }}</p>

    <div class="space-y-2 text-sm">
      <div class="flex items-start gap-2">
        <span class="text-gray-500 shrink-0">你的答案：</span>
        <span class="text-red-600">{{ formatAnswer(question.your_answer) }}</span>
      </div>
      <div class="flex items-start gap-2">
        <span class="text-gray-500 shrink-0">正确答案：</span>
        <span class="text-green-600">{{ question.correct_answer }}</span>
      </div>
    </div>

    <!-- 课程跳转锚点 -->
    <div v-if="question.course_id" class="mt-4 pt-3 border-t border-gray-100">
      <NuxtLink
        :to="`/course/${question.course_id}`"
        class="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 hover:underline"
      >
        📚 回顾课程：{{ question.course_title }}
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatScore } from '~/utils/format'

const props = defineProps<{
  question: any
  index: number
}>()

const typeLabel = computed(() => {
  const map: Record<number, string> = {
    1: '单选题',
    2: '多选题',
    3: '判断题',
    4: '简答题',
    5: '填空题',
  }
  return map[props.question.type] || ''
})

const borderClass = 'border-red-100'

const formatAnswer = (answer: any) => {
  if (Array.isArray(answer)) return answer.join(', ')
  return String(answer ?? '未作答')
}
</script>
