<template>
  <UModal :model-value="modelValue" :prevent-close="loading" @update:model-value="$emit('update:modelValue', $event)">
    <UCard class="max-w-2xl max-h-[85vh] overflow-y-auto">
      <template #header>
        <h3 class="text-base font-semibold">批改确认预览</h3>
      </template>

      <!-- 学员信息 -->
      <div class="mb-4 p-3 bg-gray-50 rounded-lg">
        <p class="text-sm"><strong>学员：</strong>{{ record?.user?.name }} ({{ record?.user?.employee_no }})</p>
        <p class="text-sm"><strong>考试：</strong>{{ record?.exam?.title }}</p>
      </div>

      <!-- 题目得分明细 -->
      <div class="mb-4">
        <h4 class="text-sm font-medium text-gray-700 mb-2">题目得分明细</h4>
        <div class="space-y-2">
          <div
            v-for="(answer, idx) in allAnswers"
            :key="idx"
            class="flex items-center justify-between p-3 bg-white rounded-lg border"
            :class="{
              'border-green-200': answer.is_correct === true,
              'border-red-200': answer.is_correct === false,
              'border-gray-200': answer.is_correct === null
            }"
          >
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-500">第 {{ getQuestionIndex(answer.question_id) }} 题</span>
              <span class="text-xs text-gray-400">{{ getQuestionTypeLabel(answer.question_id) }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium" :class="{
                'text-green-600': answer.is_correct === true,
                'text-red-500': answer.is_correct === false,
                'text-gray-500': answer.is_correct === null
              }">
                {{ formatScore(scores[answer.question_id] ?? 0) }} 分
              </span>
              <UBadge v-if="answer.is_correct === true" label="正确" color="green" size="xs" />
              <UBadge v-else-if="answer.is_correct === false" label="错误" color="red" size="xs" />
              <UBadge v-else label="待判定" color="orange" size="xs" />
            </div>
          </div>
        </div>
      </div>

      <!-- 总分信息 -->
      <div class="mb-4 p-4 bg-gray-50 rounded-lg">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-gray-600">导师给分</span>
          <span class="text-2xl font-bold" :class="isPassed ? 'text-green-600' : 'text-red-500'">
            {{ formatScore(totalScore) }} 分
          </span>
        </div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-gray-600">及格线</span>
          <span class="text-sm text-gray-500">{{ formatScore(record?.exam?.passing_score) }} 分</span>
        </div>
        <div class="flex items-center justify-center mt-3">
          <UBadge :label="isPassed ? '通过' : '未通过'" :color="isPassed ? 'green' : 'red'" size="lg" />
        </div>
      </div>

      <!-- 导师评语 -->
      <div v-if="comment" class="mb-4 p-3 bg-gray-50 rounded-lg">
        <h4 class="text-sm font-medium text-gray-700 mb-1">导师评语</h4>
        <p class="text-sm text-gray-600">{{ comment }}</p>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="gray" label="返回修改" @click="$emit('update:modelValue', false)" />
          <UButton
            label="确认提交"
            color="primary"
            :loading="loading"
            @click="$emit('confirm')"
          />
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
import { formatScore } from '~/utils/format'
import type { ExamAnswer, ExamRecord } from '~/composables/useExamReview'

const props = defineProps<{
  modelValue: boolean
  record: ExamRecord | null
  allAnswers: ExamAnswer[]
  scores: Record<number, number>
  correctness: Record<number, boolean>
  comment: string
  totalScore: number
  loading?: boolean
  getQuestionIndex: (questionId: number) => number
  getQuestionTypeLabel: (questionId: number) => string
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()

const isPassed = computed(() => {
  if (!props.record?.exam?.passing_score) return true
  return props.totalScore >= props.record.exam.passing_score
})
</script>
