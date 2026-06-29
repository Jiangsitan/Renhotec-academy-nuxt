<template>
  <UModal v-model="isOpen" :prevent-close="submitting" :ui="{ width: 'max-w-3xl' }">
    <ExamFullscreen 
      :is-fullscreen="isFullscreen"
      :show-warning="showWarning"
      :warning-message="warningMessage"
      @enter-fullscreen="enterFullscreen"
    />
    <UCard class="max-h-[85vh] overflow-y-auto">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold">{{ exam?.title }}</h3>
          <div class="flex items-center gap-3">
            <span class="text-sm font-mono text-orange-600 font-medium">{{ displayTime }}</span>
            <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" size="xs" @click="handleClose" />
          </div>
        </div>
      </template>

      <!-- 答题区域 -->
      <div class="space-y-5">
        <div v-for="(question, idx) in questions" :key="question.id" class="p-4 bg-gray-50 rounded-xl">
          <h4 class="text-sm font-semibold text-gray-700 mb-3">
            第 {{ idx + 1 }} 题
            <span class="text-xs font-normal text-gray-500 ml-2">
              {{ typeLabel(question.type) }} · {{ formatScore(question.score) }} 分
            </span>
          </h4>

          <div v-if="question.type !== 5" class="text-sm text-gray-800 mb-4 fill-blank-content" v-html="renderContent(question.content)"></div>

          <!-- 单选/判断 -->
          <div v-if="question.type === 1 || question.type === 3" class="space-y-2">
            <label
              v-for="opt in question.options"
              :key="opt.key"
              class="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors"
              :class="answers[question.id] === opt.key ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-100'"
            >
              <input
                type="radio"
                :name="`q_${question.id}`"
                :value="opt.key"
                :checked="answers[question.id] === opt.key"
                @change="answers[question.id] = opt.key"
                class="text-primary-600"
              />
              <span class="text-sm">{{ opt.key }}. {{ opt.value }}</span>
            </label>
          </div>

          <!-- 多选 -->
          <div v-else-if="question.type === 2" class="space-y-2">
            <label
              v-for="opt in question.options"
              :key="opt.key"
              class="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors"
              :class="(answers[question.id] || []).includes(opt.key) ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-100'"
            >
              <input
                type="checkbox"
                :value="opt.key"
                :checked="(answers[question.id] || []).includes(opt.key)"
                @change="toggleMultiple(question.id, opt.key)"
                class="text-primary-600"
              />
              <span class="text-sm">{{ opt.key }}. {{ opt.value }}</span>
            </label>
          </div>

          <!-- 简答 -->
          <div v-else-if="question.type === 4">
            <textarea
              v-model="answers[question.id]"
              placeholder="请输入你的答案..."
              rows="4"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <!-- 填空题：分离内容和答案 -->
          <div v-else-if="question.type === 5" class="fill-blank-container">
            <!-- 题目内容区域 -->
            <div class="fill-blank-question-content text-sm text-gray-700">
              <template v-for="(part, idx) in parseFillBlankContent(question.content)" :key="idx">
                <img v-if="part.type === 'image'" :src="part.src" />
                <span v-else-if="part.type === 'blank'" class="fill-blank-preview">第{{ part.index + 1 }}空</span>
                <span v-else v-html="part.html"></span>
              </template>
            </div>
            <!-- 答案输入区域 -->
            <div class="fill-blank-answers-section">
              <div v-for="blank in getBlankCount(question.content)" :key="blank" class="fill-blank-answer-row">
                <span class="fill-blank-answer-label">第{{ blank }}空</span>
                <input
                  type="text"
                  :value="answers[question.id]?.[blank - 1] ?? ''"
                  @input="updateFillBlank(question.id, blank - 1, ($event.target as HTMLInputElement).value)"
                  placeholder="请输入答案"
                  class="fill-blank-input"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="gray" label="取消" @click="handleClose" />
          <UButton label="提交答卷" :loading="submitting" @click="handleSubmit" />
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
import ExamFullscreen from './ExamFullscreen.vue'
import { formatScore } from '~/utils/format'

const props = defineProps<{
  modelValue: boolean
  examId: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'submitted': [result: any]
}>()

const api = useApi()
const toast = useToast()

// 防作弊开关
const settingsStore = useSettingsStore()
const isAntiCheatEnabled = computed(() => settingsStore.exam_anti_cheat_enabled === '1')

// 防作弊监控
const {
  isFullscreen, showWarning, warningMessage,
  enterFullscreen, exitFullscreen, startMonitoring, stopMonitoring
} = useExamMonitor({
  examId: props.examId,
  onSubmit: async (force?: boolean) => {
    await handleSubmit(force)
  },
})

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const exam = ref<any>(null)
const questions = ref<any[]>([])
const answers = ref<Record<number, any>>({})
const parsedBlanks = ref<Record<number, { type: 'text' | 'blank'; text?: string; blankIndex?: number }[]>>({})
const submitting = ref(false)
const remaining = ref(0)
let timerInterval: ReturnType<typeof setInterval> | null = null

const displayTime = computed(() => {
  const m = Math.floor(remaining.value / 60)
  const s = remaining.value % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
})

const typeLabel = (t: number) => ({ 1: '单选', 2: '多选', 3: '判断', 4: '简答', 5: '填空' }[t] ?? t)

// 渲染 HTML 内容（兼容旧的 Markdown 图片语法）
const renderContent = (content: string) => {
  if (!content) return ''
  const base = 'https://rh-wh.oss-cn-shanghai.aliyuncs.com'
  return renderHtml(content, base)
}

const renderHtml = (content: string, base: string) => {
  if (!content) return ''
  let html = content.replace(/!\[([^\]]*)\]\((\/[^)]+)\)/g, `<img src="${base}$2" alt="$1">`)
  html = html.replace(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, `<img src="$2" alt="$1">`)
  html = html.replace(/<img([^>]*?)src="(\/[^"]*?)"/g, `<img$1src="${base}$2"`)
  html = html.replace(/\n/g, '<br>')
  return html
}

const toggleMultiple = (qid: number, key: string) => {
  const current = [...(answers.value[qid] || [])]
  const idx = current.indexOf(key)
  if (idx >= 0) current.splice(idx, 1)
  else current.push(key)
  answers.value[qid] = current
}

// 解析填空题内容为片段数组（图片/空位/文字）
const parseFillBlankContent = (content: string) => {
  if (!content) return []
  const base = 'https://rh-wh.oss-cn-shanghai.aliyuncs.com'
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
}

// 获取填空数量
const getBlankCount = (content: string) => {
  if (!content) return 0
  const matches = content.match(/（\s*）|\(\s*\)/g)
  return matches ? matches.length : 0
}

// 更新填空答案
const updateFillBlank = (qid: number, index: number, value: string) => {
  const arr = [...(answers.value[qid] || [])]
  arr[index] = value
  answers.value = { ...answers.value, [qid]: arr }
}

// 渲染填空题内容（去除填空标记，只保留图片和文字）
const renderFillBlankContent = (content: string) => {
  if (!content) return ''
  const base = 'https://rh-wh.oss-cn-shanghai.aliyuncs.com'
  const cleaned = content.replace(/（\s*）/g, '')
  return renderHtml(cleaned, base)
}

const loadExam = async () => {
  try {
    const res = await api.get<any>(`/exams/${props.examId}`)

    // 检查是否可以参加考试
    if (!res.data.can_take) {
      toast.add({ title: '请先完成课程学习后再参加考试', color: 'orange' })
      isOpen.value = false
      return
    }

    // 如果有被驳回的记录，加载之前的答案允许补充
    if (res.data.existing_record?.status === 5) {
      exam.value = res.data.exam
      questions.value = res.data.questions

      // 加载之前的答案
      const previousAnswers = res.data.existing_record.answers || []
      questions.value.forEach(q => {
        const prevAnswer = previousAnswers.find((a: any) => a.question_id === q.id)
        if (prevAnswer) {
          if (q.type === 5) { // 填空题
            answers.value[q.id] = prevAnswer.answer || []
          } else if (q.type === 2) { // 多选题
            answers.value[q.id] = prevAnswer.answer || []
          } else {
            answers.value[q.id] = prevAnswer.answer || ''
          }
        } else {
          answers.value[q.id] = q.type === 2 || q.type === 5 ? [] : ''
        }
        
        // 预计算填空内容
        if (q.type === 5) {
          parsedBlanks.value[q.id] = parseFillBlankContent(q.content)
        }
      })

      remaining.value = (exam.value?.time_limit || 10) * 60
      startTimer()
      return
    }

    // 检查是否已考过（非驳回状态）
    if (res.data.existing_record) {
      toast.add({ title: '您已参加过此考试', color: 'orange' })
      isOpen.value = false
      return
    }

    exam.value = res.data.exam
    questions.value = res.data.questions

    // 初始化答案和预计算填空内容
    questions.value.forEach(q => {
      if (q.type === 5) { // 填空题
        const blankCount = (q.content.match(/（\s*）/g) || []).length
        answers.value[q.id] = new Array(blankCount).fill('')
        parsedBlanks.value[q.id] = parseFillBlankContent(q.content)
      } else {
        answers.value[q.id] = q.type === 2 ? [] : '' // 多选题初始化数组，其他初始化空字符串
      }
    })

    // 启动倒计时
    remaining.value = (exam.value?.time_limit || 10) * 60
    startTimer()
    
    // 启动防作弊监控（仅当启用时）
    if (isAntiCheatEnabled.value) {
      await enterFullscreen()
      startMonitoring()
    }
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '加载考试失败', color: 'red' })
    isOpen.value = false
  }
}

const startTimer = () => {
  stopTimer()
  timerInterval = setInterval(() => {
    remaining.value--
    if (remaining.value <= 0) {
      stopTimer()
      handleSubmit()
    }
  }, 1000)
}

const stopTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

const handleClose = () => {
  if (submitting.value) return
  if (confirm('确定要退出吗？答题进度将丢失。')) {
    stopTimer()
    stopMonitoring()
    exitFullscreen()
    isOpen.value = false
  }
}

const handleSubmit = async (force = false) => {
  if (submitting.value) return
  if (!force) {
    if (!confirm('确定要提交答卷吗？提交后不可修改。')) return
  } else {
    toast.add({ title: '因多次离开考试页面，试卷已自动提交', color: 'red' })
  }

  submitting.value = true
  stopTimer()
  stopMonitoring()
  exitFullscreen()

  try {
    const formattedAnswers = questions.value.map(q => ({
      question_id: q.id,
      answer: answers.value[q.id],
    }))

    const res = await api.post<any>(`/exams/${props.examId}/submit`, { answers: formattedAnswers })
    emit('submitted', res.data)
    isOpen.value = false
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '提交失败', color: 'red' })
  } finally {
    submitting.value = false
  }
}

watch(isOpen, (val) => {
  if (val) loadExam()
  else {
    stopTimer()
    stopMonitoring()
    exitFullscreen()
  }
})
</script>
