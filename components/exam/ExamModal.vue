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

          <div v-if="question.type !== 'fill_blank'" class="text-sm text-gray-800 mb-4 prose prose-sm max-w-none fill-blank-content" v-html="renderContent(question.content)"></div>

          <!-- 单选/判断 -->
          <div v-if="question.type === 'single' || question.type === 'truefalse'" class="space-y-2">
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
          <div v-else-if="question.type === 'multiple'" class="space-y-2">
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
          <div v-else-if="question.type === 'short_answer'">
            <textarea
              v-model="answers[question.id]"
              placeholder="请输入你的答案..."
              rows="4"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <!-- 填空题 -->
          <div v-else-if="question.type === 'fill_blank'" class="space-y-4">
            <!-- 题目内容（图片和文字） -->
            <div class="text-sm text-gray-700 fill-blank-content" v-html="renderFillBlankContent(question.content)"></div>
            
            <!-- 答案输入区域 -->
            <div class="fill-blank-answers">
              <div v-for="idx in getBlankCount(question.content)" :key="idx" class="fill-blank-item">
                <span class="fill-blank-label">第 {{ idx }} 空：</span>
                <input
                  type="text"
                  :value="answers[question.id]?.[idx - 1] ?? ''"
                  @input="updateFillBlank(question.id, idx - 1, ($event.target as HTMLInputElement).value)"
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
import { marked } from 'marked'
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

const typeLabel = (t: string) => ({ single: '单选', multiple: '多选', truefalse: '判断', short_answer: '简答', fill_blank: '填空' }[t] ?? t)

// 渲染 Markdown 内容（动态拼接图片 URL）
const renderContent = (content: string) => {
  if (!content) return ''
  const base = 'https://rh-wh.oss-cn-shanghai.aliyuncs.com'
  const processed = content.replace(/!\[([^\]]*)\]\((\/[^)]+)\)/g, `![$1](${base}$2)`)
  return marked(processed)
}

const toggleMultiple = (qid: number, key: string) => {
  const current = [...(answers.value[qid] || [])]
  const idx = current.indexOf(key)
  if (idx >= 0) current.splice(idx, 1)
  else current.push(key)
  answers.value[qid] = current
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

// 更新填空答案
const updateFillBlank = (qid: number, index: number, value: string) => {
  const arr = [...(answers.value[qid] || [])]
  arr[index] = value
  answers.value = { ...answers.value, [qid]: arr }
}

// 渲染填空题文本部分的 Markdown
const renderFillBlankText = (text: string) => {
  if (!text) return ''
  return marked(text)
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
    if (res.data.existing_record?.status === 'rejected') {
      exam.value = res.data.exam
      questions.value = res.data.questions

      // 加载之前的答案
      const previousAnswers = res.data.existing_record.answers || []
      questions.value.forEach(q => {
        const prevAnswer = previousAnswers.find((a: any) => a.question_id === q.id)
        if (prevAnswer) {
          if (q.type === 'fill_blank') {
            answers.value[q.id] = prevAnswer.answer || []
          } else if (q.type === 'multiple') {
            answers.value[q.id] = prevAnswer.answer || []
          } else {
            answers.value[q.id] = prevAnswer.answer || ''
          }
        } else {
          answers.value[q.id] = q.type === 'multiple' || q.type === 'fill_blank' ? [] : ''
        }
        
        // 预计算填空内容
        if (q.type === 'fill_blank') {
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
      if (q.type === 'fill_blank') {
        const blankCount = (q.content.match(/（\s*）/g) || []).length
        answers.value[q.id] = new Array(blankCount).fill('')
        parsedBlanks.value[q.id] = parseFillBlankContent(q.content)
      } else {
        answers.value[q.id] = q.type === 'multiple' ? [] : ''
      }
    })

    // 启动倒计时
    remaining.value = (exam.value?.time_limit || 10) * 60
    startTimer()
    
    // 启动防作弊监控
    await enterFullscreen()
    startMonitoring()
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
