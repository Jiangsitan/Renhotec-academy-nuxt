<template>
  <div>
    <h2 class="text-lg font-semibold text-gray-900 mb-4">
      第 {{ index + 1 }} 题
      <span class="text-sm font-normal text-gray-500 ml-2">
        {{ typeLabel }} · {{ formatScore(question.score) }} 分
      </span>
    </h2>

    <div v-if="question.type !== 5" class="text-gray-700 mb-4 fill-blank-content" v-html="renderedContent"></div>

    <!-- 单选题 -->
    <div v-if="question.type === 1 || question.type === 3" class="space-y-2">
      <label
        v-for="option in question.options"
        :key="option.key"
        class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
        :class="modelValue === option.key ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'"
      >
        <input
          type="radio"
          :name="`q_${question.id}`"
          :value="option.key"
          :checked="modelValue === option.key"
          @change="$emit('update', option.key)"
          class="text-primary-600"
        />
        <span class="text-sm">{{ option.key }}. {{ option.value }}</span>
      </label>
    </div>

    <!-- 多选题 -->
    <div v-else-if="question.type === 2" class="space-y-2">
      <label
        v-for="option in question.options"
        :key="option.key"
        class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
        :class="(modelValue || []).includes(option.key) ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'"
      >
        <input
          type="checkbox"
          :value="option.key"
          :checked="(modelValue || []).includes(option.key)"
          @change="toggleMultiple(option.key)"
          class="text-primary-600"
        />
        <span class="text-sm">{{ option.key }}. {{ option.value }}</span>
      </label>
    </div>

    <!-- 填空题：内联输入（括号+自适应宽度） -->
    <div v-else-if="question.type === 5">
      <ExamFillBlankInput
        :content="question.content"
        :answers="modelValue || []"
        :editable="true"
        @update:answers="(val: string[]) => emit('update', val)"
      />
    </div>

    <!-- 简答题 -->
    <div v-else-if="question.type === 4">
      <textarea
        :value="modelValue"
        @input="$emit('update', ($event.target as HTMLTextAreaElement).value)"
        placeholder="请输入你的答案..."
        rows="5"
        class="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatScore } from '~/utils/format'
import { renderHtml } from '~/utils/renderContent'

const props = defineProps<{
  question: any
  index: number
  modelValue: any
}>()

const emit = defineEmits<{
  update: [value: any]
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

// 渲染题目内容（兼容旧的 Markdown 图片语法和新的 HTML 格式）
const renderedContent = computed(() => {
  if (!props.question.content) return ''
  const base = 'https://rh-wh.oss-cn-shanghai.aliyuncs.com'
  return renderHtml(props.question.content, base)
})

const toggleMultiple = (key: string) => {
  const current = [...(props.modelValue || [])]
  const idx = current.indexOf(key)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(key)
  }
  emit('update', current)
}




</script>
