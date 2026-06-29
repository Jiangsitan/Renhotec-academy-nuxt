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

    <!-- 填空题：分离内容和答案 -->
    <div v-else-if="question.type === 5" class="fill-blank-container">
      <!-- 题目内容区域 -->
      <div class="fill-blank-question-content text-gray-700">
        <template v-for="(part, idx) in parsedContent" :key="idx">
          <img v-if="part.type === 'image'" :src="part.src" />
          <span v-else-if="part.type === 'blank'" class="fill-blank-preview">第{{ part.index + 1 }}空</span>
          <span v-else v-html="part.html"></span>
        </template>
      </div>
      <!-- 答案输入区域 -->
      <div class="fill-blank-answers-section">
        <div v-for="blank in blankCount" :key="blank" class="fill-blank-answer-row">
          <span class="fill-blank-answer-label">第{{ blank }}空</span>
          <input
            type="text"
            :value="(modelValue || [])[blank - 1] || ''"
            @input="updateFillBlank(blank - 1, ($event.target as HTMLInputElement).value)"
            placeholder="请输入答案"
            class="fill-blank-input"
          />
        </div>
      </div>
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

// 渲染 HTML 内容（兼容旧的 Markdown 图片语法）
const renderHtml = (content: string, base: string) => {
  if (!content) return ''
  let html = content.replace(/!\[([^\]]*)\]\((\/[^)]+)\)/g, `<img src="${base}$2" alt="$1">`)
  html = html.replace(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, `<img src="$2" alt="$1">`)
  html = html.replace(/<img([^>]*?)src="(\/[^"]*?)"/g, `<img$1src="${base}$2"`)
  html = html.replace(/\n/g, '<br>')
  return html
}

// 解析填空题内容为片段数组（图片/空位/文字）
const parsedContent = computed(() => {
  if (!props.question.content) return []
  const base = 'https://rh-wh.oss-cn-shanghai.aliyuncs.com'
  const content = props.question.content
  const parts: any[] = []
  const imgRegex = /<img[^>]+src="([^"]+)"/g
  const blankRegex = /（\s*）|\(\s*\)/g

  const allMatches: { type: string; index: number; length: number; value?: string }[] = []

  let match
  while ((match = imgRegex.exec(content)) !== null) {
    allMatches.push({ type: 'image', index: match.index, length: match[0].length, value: match[1] })
  }
  while ((match = blankRegex.exec(content)) !== null) {
    allMatches.push({ type: 'blank', index: match.index, length: match[0].length })
  }

  allMatches.sort((a, b) => a.index - b.index)

  let lastIndex = 0
  let blankIndex = 0

  for (const m of allMatches) {
    if (m.index > lastIndex) {
      const text = content.slice(lastIndex, m.index)
      if (text) {
        let html = text.replace(/!\[([^\]]*)\]\((\/[^)]+)\)/g, `<img src="${base}$2" alt="$1">`)
        html = html.replace(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, `<img src="$2" alt="$1">`)
        html = html.replace(/<img([^>]*?)src="(\/[^"]*?)"/g, `<img$1src="${base}$2"`)
        html = html.replace(/\n/g, '<br>')
        parts.push({ type: 'text', html })
      }
    }

    if (m.type === 'image') {
      let src = m.value!
      if (src.startsWith('/')) src = `${base}${src}`
      parts.push({ type: 'image', src })
    } else if (m.type === 'blank') {
      parts.push({ type: 'blank', index: blankIndex })
      blankIndex++
    }

    lastIndex = m.index + m.length
  }

  if (lastIndex < content.length) {
    const text = content.slice(lastIndex)
    if (text) {
      let html = text.replace(/!\[([^\]]*)\]\((\/[^)]+)\)/g, `<img src="${base}$2" alt="$1">`)
      html = html.replace(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, `<img src="$2" alt="$1">`)
      html = html.replace(/<img([^>]*?)src="(\/[^"]*?)"/g, `<img$1src="${base}$2"`)
      html = html.replace(/\n/g, '<br>')
      parts.push({ type: 'text', html })
    }
  }

  return parts
})

// 填空数量
const blankCount = computed(() => {
  return parsedContent.value.filter(p => p.type === 'blank').length
})

// 更新填空答案
const updateFillBlank = (index: number, value: string) => {
  const current = [...(props.modelValue || [])]
  current[index] = value
  emit('update', current)
}
</script>
