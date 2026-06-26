<template>
  <UModal v-model="isOpen" :ui="{ width: 'max-w-md' }">
    <UCard>
      <template #header>
        <h3 class="text-base font-semibold">考试结果</h3>
      </template>

      <div class="text-center py-4">
        <div class="text-5xl mb-3" :class="isPassed ? 'text-green-600' : 'text-red-500'">
          {{ isPassed ? '🎉' : '😔' }}
        </div>
        <div class="text-3xl font-bold mb-2" :class="isPassed ? 'text-green-600' : 'text-red-500'">
          {{ result?.total_score != null ? formatScore(result.total_score) : '待批改' }}
        </div>
        <p class="text-sm text-gray-500 mb-1">
          总分: {{ formatScore(result?.total_score ?? result?.objective_score) }} 分
        </p>
        <p class="text-sm" :class="isPassed ? 'text-green-600' : 'text-red-500'">
          {{ isPassed ? '恭喜通过！' : '未达到及格线' }}
        </p>
        <p v-if="result?.status === 3" class="text-xs text-orange-500 mt-2">
          主观题待导师批改
        </p>
      </div>

      <template #footer>
        <div class="flex gap-3">
          <UButton
            v-if="result?.id"
            :to="`/exam/result/${result.id}`"
            color="gray"
            label="查看详情"
            class="flex-1"
            @click="isOpen = false"
          />
          <UButton
            label="关闭"
            class="flex-1"
            @click="isOpen = false"
          />
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
import { formatScore } from '~/utils/format'

const props = defineProps<{
  modelValue: boolean
  result: any
  passingScore?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const isPassed = computed(() => {
  if (!props.result?.total_score) return false
  return props.result.total_score >= (props.passingScore ?? 60)
})
</script>
