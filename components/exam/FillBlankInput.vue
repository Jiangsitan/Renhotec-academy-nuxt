<template>
  <div class="fill-blank-container">
    <div class="text-sm text-gray-700 leading-relaxed">
      <template v-for="(part, idx) in parsedParts" :key="idx">
        <!-- 图片 -->
        <img v-if="part.type === 'image'" :src="part.src" class="inline-block max-w-[300px] max-h-[200px] rounded-lg my-1 object-contain" />
        <!-- 空位 -->
        <span v-else-if="part.type === 'blank'" class="inline-flex items-center mx-0.5 align-baseline">
          <span class="text-gray-500 select-none">（</span>
          <!-- 可编辑模式：自适应输入框 -->
          <input
            v-if="editable"
            ref="inputRefs"
            type="text"
            :value="answers[part.blankIndex] ?? ''"
            @input="onInput(part.blankIndex, ($event.target as HTMLInputElement).value)"
            :placeholder="placeholderMode ? `第${part.blankIndex + 1}空` : ''"
            :class="['fill-blank-inline-input', { 'fill-blank-inline-input--empty': !(answers[part.blankIndex] ?? '') }]"
            :style="{ width: getInputWidth(answers[part.blankIndex] ?? '') }"
          />
          <!-- 只读模式：显示学生答案 -->
          <span v-else class="fill-blank-inline-student">
            {{ answers[part.blankIndex] || '未填写' }}
          </span>
          <span class="text-gray-500 select-none">）</span>
          <!-- 参考答案（结果页/批改页） -->
          <span v-if="showReference && referenceAnswers[part.blankIndex]" class="fill-blank-inline-ref">
            参考答案：{{ referenceAnswers[part.blankIndex] }}
          </span>
        </span>
        <!-- 文本/HTML -->
        <span v-else v-html="part.html"></span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BLANK_REGEX } from '~/utils/fillBlank'

const props = withDefaults(defineProps<{
  /** 题目内容（含（）空位标记） */
  content: string
  /** 学生答案数组，v-model:answers 双向绑定 */
  answers?: string[]
  /** 参考答案数组（用于结果页展示） */
  referenceAnswers?: string[]
  /** 是否可编辑（考试作答模式） */
  editable?: boolean
  /** 是否显示参考答案（结果/批改页面） */
  showReference?: boolean
  /** 是否显示 placeholder 文字（第X空） */
  placeholderMode?: boolean
}>(), {
  answers: () => [],
  referenceAnswers: () => [],
  editable: false,
  showReference: false,
  placeholderMode: true,
})

const emit = defineEmits<{
  'update:answers': [value: string[]]
}>()

const base = 'https://rh-wh.oss-cn-shanghai.aliyuncs.com'

// ========== 内容解析 ==========
interface ParsedPart {
  type: 'text' | 'image' | 'blank'
  html?: string
  src?: string
  blankIndex?: number
}

const parsedParts = computed<ParsedPart[]>(() => {
  if (!props.content) return []
  const parts: ParsedPart[] = []
  const imgRegex = /<img[^>]+src="([^"]+)"/g
  const blankRegex = new RegExp(BLANK_REGEX.source, 'g')

  // 收集所有匹配（图片 + 空位）
  const allMatches: { type: string; index: number; length: number; value?: string }[] = []

  let match: RegExpExecArray | null
  while ((match = imgRegex.exec(props.content)) !== null) {
    allMatches.push({ type: 'image', index: match.index, length: match[0].length, value: match[1] })
  }
  while ((match = blankRegex.exec(props.content)) !== null) {
    allMatches.push({ type: 'blank', index: match.index, length: match[0].length })
  }

  // 按位置排序
  allMatches.sort((a, b) => a.index - b.index)

  let lastIndex = 0
  let blankIndex = 0

  for (const m of allMatches) {
    // 添加匹配之间的文本
    if (m.index > lastIndex) {
      const text = props.content.slice(lastIndex, m.index)
      if (text) parts.push({ type: 'text', html: renderInlineHtml(text) })
    }

    if (m.type === 'image') {
      let src = m.value!
      if (src.startsWith('/')) src = `${base}${src}`
      parts.push({ type: 'image', src })
    } else if (m.type === 'blank') {
      parts.push({ type: 'blank', blankIndex })
      blankIndex++
    }

    lastIndex = m.index + m.length
  }

  // 末尾文本
  if (lastIndex < props.content.length) {
    const text = props.content.slice(lastIndex)
    if (text) parts.push({ type: 'text', html: renderInlineHtml(text) })
  }

  return parts
})

/** 渲染文本片段：转换 Markdown 图片语法和换行 */
function renderInlineHtml(text: string): string {
  let html = text.replace(/!\[([^\]]*)\]\((\/[^)]+)\)/g, `<img src="${base}$2" alt="$1">`)
  html = html.replace(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, `<img src="$2" alt="$1">`)
  html = html.replace(/<img([^>]*?)src="(\/[^"]*?)"/g, `<img$1src="${base}$2"`)
  html = html.replace(/\n/g, '<br>')
  return html
}

// ========== 输入处理 ==========
const onInput = (index: number, value: string) => {
  const newAnswers = [...props.answers]
  newAnswers[index] = value
  emit('update:answers', newAnswers)
}

// ========== 自适应宽度 ==========
/**
 * 根据输入内容计算宽度：
 * - 空值时使用最小宽度（80px）
 * - 有值时根据字符数动态计算，确保括号与文字间距一致
 */
const getInputWidth = (value: string): string => {
  const MIN_WIDTH = 80
  const CHAR_WIDTH = 14 // 中文字号 14px 约 14px/字
  const PADDING = 16 // input 左右 padding
  const EXTRA = 8 // 额外安全边距

  if (!value) return `${MIN_WIDTH}px`

  // 计算实际字符显示宽度（中文字符占 1 字宽，英文占 0.6）
  let charCount = 0
  for (const ch of value) {
    charCount += /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch) ? 1 : 0.6
  }

  const textWidth = Math.ceil(charCount * CHAR_WIDTH) + PADDING + EXTRA
  return `${Math.max(MIN_WIDTH, textWidth)}px`
}
</script>

<style scoped>
.fill-blank-inline-input {
  @apply inline-block min-w-[80px] px-2 py-0.5 border border-gray-300 rounded text-sm
         focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30
         transition-all duration-200;
  font-size: inherit;
  line-height: inherit;
  vertical-align: baseline;
}

.fill-blank-inline-input--empty {
  @apply border-dashed border-gray-300;
}
</style>
