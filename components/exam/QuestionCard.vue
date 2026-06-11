<template>
  <div>
    <h2 class="text-lg font-semibold text-gray-900 mb-4">
      第 {{ index + 1 }} 题
      <span class="text-sm font-normal text-gray-500 ml-2">
        {{ typeLabel }} · {{ formatScore(question.score) }} 分
      </span>
    </h2>

    <div v-if="question.type !== 'fill_blank'" class="text-gray-700 mb-4 prose prose-sm max-w-none fill-blank-content" v-html="renderedContent"></div>

    <!-- 单选题 -->
    <div v-if="question.type === 'single' || question.type === 'truefalse'" class="space-y-2">
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
    <div v-else-if="question.type === 'multiple'" class="space-y-2">
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

    <!-- 填空题：独立行输入框 -->
    <div v-else-if="question.type === 'fill_blank'" class="space-y-4">
      <!-- 题目内容（图片和文字） -->
      <div class="text-gray-700 fill-blank-content" v-html="renderFillBlankContent(question.content)"></div>
      
      <!-- 答案输入区域 -->
      <div class="fill-blank-answers">
        <div v-for="idx in getBlankCount(question.content)" :key="idx" class="fill-blank-item">
          <span class="fill-blank-label">第 {{ idx }} 空：</span>
          <input
            type="text"
            :value="(modelValue || [])[idx - 1] || ''"
            @input="updateFillBlank(idx - 1, ($event.target as HTMLInputElement).value)"
            placeholder="请输入答案"
            class="fill-blank-input"
          />
        </div>
      </div>
    </div>

    <!-- 简答题 -->
    <div v-else-if="question.type === 'short_answer'">
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
import { marked } from 'marked'
import { formatScore } from '~/utils/format'

const props = defineProps<{
  question: any
  index: number
  modelValue: any
}>()

const emit = defineEmits<{
  update: [value: any]
}>()

const typeLabel = computed(() => {
  const map: Record<string, string> = {
    single: '单选题',
    multiple: '多选题',
    truefalse: '判断题',
    short_answer: '简答题',
    fill_blank: '填空题',
  }
  return map[props.question.type] || ''
})

// 渲染 Markdown 内容（动态拼接图片 URL）
const renderedContent = computed(() => {
  if (!props.question.content) return ''
  const base = 'https://rh-wh.oss-cn-shanghai.aliyuncs.com'
  const processed = props.question.content.replace(/!\[([^\]]*)\]\((\/[^)]+)\)/g, `![$1](${base}$2)`)
  return marked(processed)
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

// 解析填空题内容，分离文本和填空位置
const parseFillBlankContent = (content: string) => {
  const parts: { type: 'text' | 'blank'; text?: string; blankIndex?: number }[] = []
  const regex = /（\s*）/g
  let lastIndex = 0
  let blankIndex = 0
  let match

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: content.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'blank', blankIndex })
    blankIndex++
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', text: content.slice(lastIndex) })
  }

  return parts
}

// 渲染填空题文本部分的 Markdown（动态拼接图片 URL）
const renderFillBlankText = (text: string) => {
  if (!text) return ''
  const base = 'https://rh-wh.oss-cn-shanghai.aliyuncs.com'
  const processed = text.replace(/!\[([^\]]*)\]\((\/[^)]+)\)/g, `![$1](${base}$2)`)
  return marked(processed)
}

// 渲染填空题内容（去除填空标记，只保留图片和文字）
const renderFillBlankContent = (content: string) => {
  if (!content) return ''
  const base = 'https://rh-wh.oss-cn-shanghai.aliyuncs.com'
  // 移除（）标记，保留其他内容
  const cleaned = content.replace(/（\s*）/g, '')
  const processed = cleaned.replace(/!\[([^\]]*)\]\((\/[^)]+)\)/g, `![$1](${base}$2)`)
  return marked(processed)
}

// 获取填空数量
const getBlankCount = (content: string) => {
  if (!content) return 0
  const matches = content.match(/（\s*）/g)
  return matches ? matches.length : 0
}

// 更新填空答案
const updateFillBlank = (index: number, value: string) => {
  const current = [...(props.modelValue || [])]
  current[index] = value
  emit('update', current)
}
</script>
