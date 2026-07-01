<template>
  <div v-if="loading" class="text-center py-12">
    <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-gray-300 animate-spin mx-auto" />
  </div>

  <div v-else-if="record">
    <NuxtLink to="/exam" class="text-sm text-primary-600 hover:underline mb-4 inline-flex items-center gap-1">
      <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
      返回考试列表
    </NuxtLink>

    <!-- 成绩卡片 -->
    <UCard class="mb-6">
      <div class="text-center">
        <h1 class="text-xl font-bold text-gray-900 mb-2">{{ record.exam?.title }}</h1>
        <div class="text-5xl font-bold my-4" :class="record.status === 3 ? 'text-orange-500' : isPassed ? 'text-green-600' : 'text-red-500'">
          {{ record.status === 3 ? '等待批改中...' : record.total_score != null ? formatScore(record.total_score) : '-' }}
        </div>
        <div class="text-sm text-gray-500">
          <span v-if="record.exam?.passing_score">及格线: {{ formatScore(record.exam.passing_score) }} 分</span>
        </div>
        <div class="mt-2">
          <UBadge v-if="record.status === 3" label="待批改" color="orange" variant="subtle" />
          <UBadge v-else-if="isPassed" label="通过" color="green" variant="subtle" />
          <UBadge v-else label="未通过" color="red" variant="subtle" />
        </div>
        
        <div v-if="record.mentor_comment" class="mt-4 text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-3 text-left">
          <span class="font-medium">导师评语：</span>{{ record.mentor_comment }}
        </div>

        <!-- 未通过引导 -->
        <div v-if="isFailed" class="mt-6 p-5 bg-orange-50 border border-orange-200 rounded-lg text-left">
          <div class="flex items-center gap-2 mb-3">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-orange-600" />
            <span class="text-base font-semibold text-orange-700">未通过考试</span>
          </div>
          <p class="text-sm text-orange-600 mb-4">
            您的成绩 {{ formatScore(record.total_score) }} 分未达到及格线 {{ formatScore(record.exam?.passing_score) }} 分。
            请重新学习以下课程后再次参加考试：
          </p>

          <!-- 需要重新学习的课程 -->
          <div v-if="reviewCourses.length > 0" class="space-y-2 mb-4">
            <div v-for="course in reviewCourses" :key="course.id" class="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-book-open" class="w-4 h-4 text-primary-600" />
                <span class="text-sm text-gray-700">{{ course.title }}</span>
                <UBadge v-if="course.is_completed" label="已完成" color="green" size="xs" variant="subtle" />
                <UBadge v-else label="未完成" color="orange" size="xs" variant="subtle" />
              </div>
              <UButton
                :to="`/course/${course.id}`"
                size="xs"
                color="primary"
                label="去学习"
                icon="i-heroicons-arrow-right"
                trailing
              />
            </div>
          </div>

          <!-- 重新考试按钮 -->
          <UButton
            label="重新考试"
            color="primary"
            icon="i-heroicons-arrow-path"
            :disabled="!canRetake"
            @click="handleRetake"
          />
          <p v-if="!canRetake" class="text-xs text-orange-500 mt-2">
            请先完成所有关联课程的学习后再重新考试
          </p>
        </div>

        <!-- 作弊记录 -->
        <div v-if="record.cheats?.length > 0" class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
          <div class="flex items-center gap-2 mb-3">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-600" />
            <span class="text-sm font-medium text-red-700">作弊记录</span>
            <UBadge :label="`${record.cheats.length} 次`" color="red" variant="subtle" size="xs" />
          </div>
          <div class="space-y-2">
            <div v-for="(cheat, idx) in record.cheats" :key="idx" class="flex items-center gap-2 text-xs text-red-600">
              <span class="font-medium">{{ idx + 1 }}.</span>
              <span>{{ getCheatTypeLabel(cheat.action) }}</span>
              <span class="text-red-400">{{ formatDate(cheat.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- 答题详情 -->
    <div class="space-y-4">
      <div
        v-for="(answer, idx) in record.answers"
        :key="idx"
        class="bg-white rounded-xl border p-5"
        :class="isCorrect(answer) ? 'border-green-200' : isWrong(answer) ? 'border-red-200' : 'border-gray-200'"
      >
        <!-- 题目头部 -->
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-gray-500">第 {{ idx + 1 }} 题</span>
            <UBadge :label="typeLabel(getQuestionType(answer.question_id))" size="xs" variant="subtle" />
            <span class="text-xs text-gray-400">{{ formatScore(getQuestionScore(answer.question_id)) }} 分</span>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="isCorrect(answer)" class="text-sm text-green-600 flex items-center gap-1">
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4" /> 正确
            </span>
            <span v-else-if="isWrong(answer)" class="text-sm text-red-600 flex items-center gap-1">
              <UIcon name="i-heroicons-x-circle" class="w-4 h-4" /> 错误
            </span>
            <span v-else-if="answer.auto_graded" class="text-sm text-blue-500 flex items-center gap-1">
              <UIcon name="i-heroicons-calculator" class="w-4 h-4" /> 自动评分
            </span>
            <span v-else class="text-sm text-orange-500">待批改</span>
            <span class="text-sm text-gray-400">{{ formatScore(answer.score_awarded ?? 0) }}/{{ formatScore(getQuestionScore(answer.question_id)) }} 分</span>
          </div>
        </div>

        <!-- 题干：填空题渲染（内联括号+自适应宽度） -->
        <div v-if="isFillBlank(answer.question_id)" class="mb-3">
          <ExamFillBlankInput
            :content="getQuestionContent(answer.question_id)"
            :answers="answer.answer || []"
            :reference-answers="parseCorrectAnswers(answer.question_id)"
            :editable="false"
            :show-reference="true"
          />
        </div>

        <!-- 非填空题：普通显示 -->
        <div v-else class="text-sm text-gray-700 mb-3" v-html="renderContent(getQuestionContent(answer.question_id))"></div>

        <!-- 选项展示（选择题） -->
        <div v-if="getQuestionOptions(answer.question_id)" class="mb-3 space-y-1">
          <div
            v-for="opt in getQuestionOptions(answer.question_id)"
            :key="opt.key"
            class="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg"
            :class="getOptionClass(answer, opt.key)"
          >
            <span class="font-medium w-5">{{ opt.key }}.</span>
            <span>{{ opt.value }}</span>
            <UIcon v-if="isCorrectOption(answer.question_id, opt.key)" name="i-heroicons-check" class="w-4 h-4 text-green-600 ml-auto" />
          </div>
        </div>

        <!-- 你的答案 vs 正确答案（填空题除外，已内联显示；简答题除外，用参考答案） -->
        <div v-if="!isFillBlank(answer.question_id) && !isShortAnswer(answer.question_id)" class="text-sm answer-section">
          <div class="mb-2">
            <span class="text-gray-500">你的答案：</span>
            <span :class="isCorrect(answer) ? 'text-green-600' : 'text-red-600 font-medium'">
              {{ formatAnswer(answer.answer) }}
            </span>
          </div>
          <div class="reference-highlight">
            <span class="text-gray-500">正确答案：</span>
            <span class="text-green-600 font-medium">{{ getCorrectAnswer(answer.question_id) }}</span>
          </div>
        </div>

        <!-- 简答题：你的答案 + 参考答案 -->
        <div v-if="isShortAnswer(answer.question_id)" class="text-sm answer-section">
          <div class="mb-2">
            <span class="text-gray-500">你的答案：</span>
            <span :class="isCorrect(answer) ? 'text-green-600' : 'text-red-600 font-medium'">
              {{ formatAnswer(answer.answer) }}
            </span>
          </div>
          <div v-if="getCorrectAnswer(answer.question_id)" class="reference-highlight">
            <span class="text-xs text-gray-500">参考答案：</span>
            <span class="text-xs text-blue-600">{{ formatCorrectAnswer(answer.question_id) }}</span>
          </div>
        </div>

        <!-- 错题复习提示：关联课程链接 -->
        <div v-if="shouldShowCourseReview(answer) && getCourseId(answer.question_id)" class="mt-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-book-open" class="w-5 h-5 text-primary-600" />
              <div>
                <p class="text-sm font-medium text-primary-700">建议复习此知识点</p>
                <p class="text-xs text-primary-600">{{ getCourseTitle(answer.question_id) }}</p>
              </div>
            </div>
            <UButton
              :to="`/course/${getCourseId(answer.question_id)}`"
              size="xs"
              color="primary"
              label="去复习"
              icon="i-heroicons-arrow-right"
              trailing
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 重新提交考试弹窗 -->
    <ExamModal
      v-if="record?.exam_id"
      v-model="showExamModal"
      :exam-id="record.exam_id"
      @submitted="onExamSubmitted"
    />
  </div>
</template>

<script setup lang="ts">
import ExamModal from '~/components/exam/ExamModal.vue'
import { formatScore } from '~/utils/format'
import { renderContent } from '~/utils/renderContent'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const api = useApi()

const recordId = Number(route.params.id)
const record = ref<any>(null)
const loading = ref(true)

const isPendingReview = computed(() => record.value?.status === 3)

const isPassed = computed(() => {
  if (isPendingReview.value) return null
  if (!record.value?.total_score || !record.value?.exam?.passing_score) return false
  return record.value.total_score >= record.value.exam.passing_score
})

const isFailed = computed(() => {
  if (!record.value || isPendingReview.value) return false
  // 已批改且未通过
  return (record.value.status === 4 || record.value.status === 2)
    && record.value.total_score != null
    && record.value.exam?.passing_score
    && record.value.total_score < record.value.exam.passing_score
})

// 需要重新学习的课程（答错题目关联的课程）
const reviewCourses = computed(() => {
  if (!record.value?.answers || !record.value?.exam?.questions) return []

  const courseMap = new Map<number, { id: number; title: string; is_completed: boolean }>()

  for (const answer of record.value.answers) {
    // 未得分或 0 分的题目
    const isWrongAnswer = isWrong(answer)
      || (isPending(answer) && Number(answer.score_awarded ?? 0) === 0)

    if (!isWrongAnswer) continue

    const question = record.value.exam.questions.find((q: any) => q.id === answer.question_id)
    if (!question?.course_id) continue

    if (!courseMap.has(question.course_id)) {
      courseMap.set(question.course_id, {
        id: question.course_id,
        title: `课程 #${question.course_id}`,
        is_completed: false,
      })
    }
  }

  return Array.from(courseMap.values())
})

// 是否可以重新考试（所有关联课程已完成）
const canRetake = computed(() => {
  if (!record.value?.exam?.courses?.length) return true
  // 简化：允许重新考试，实际检查在后端 canTakeExam
  return true
})

const typeLabel = (t: number) => ({ 1: '单选', 2: '多选', 3: '判断', 4: '简答', 5: '填空' }[t] ?? '')

// 作弊类型标签
const getCheatTypeLabel = (action: string) => {
  const map: Record<string, string> = {
    leave_page: '离开考试页面',
    blur: '浏览器窗口失去焦点',
    exit_fullscreen: '退出全屏模式',
  }
  return map[action] || action
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const loadRecord = async () => {
  try {
    const res = await api.get<any>(`/exam-records/${recordId}`)
    record.value = res.data
  } catch {}
  loading.value = false
}

const findQuestion = (questionId: number) => {
  return record.value?.exam?.questions?.find((q: any) => q.id === questionId)
}

// 统一判断 is_correct：兼容 true/false 和 0/1
const isCorrect = (answer: any) => Number(answer?.is_correct) === 1
const isWrong = (answer: any) => Number(answer?.is_correct) === 0
const isPending = (answer: any) => answer?.is_correct == null

const getQuestionContent = (questionId: number) => findQuestion(questionId)?.content ?? ''
const getQuestionType = (questionId: number) => findQuestion(questionId)?.type ?? ''
const getQuestionScore = (questionId: number) => findQuestion(questionId)?.score ?? 0
const getQuestionOptions = (questionId: number) => findQuestion(questionId)?.options ?? null
const getCorrectAnswer = (questionId: number) => findQuestion(questionId)?.correct_answer ?? ''
const getCourseId = (questionId: number) => findQuestion(questionId)?.course_id
const isShortAnswer = (questionId: number) => findQuestion(questionId)?.type === 4
const isFillBlank = (questionId: number) => findQuestion(questionId)?.type === 5











// 解析填空题参考答案为数组
const parseCorrectAnswers = (questionId: number): string[] => {
  const question = findQuestion(questionId)
  if (!question?.correct_answer) return []
  if (question.type === 5) {
    try {
      const arr = JSON.parse(question.correct_answer)
      if (Array.isArray(arr)) return arr.map(String)
    } catch {}
  }
  return [question.correct_answer]
}



// 格式化参考答案
const formatCorrectAnswer = (questionId: number) => {
  const question = findQuestion(questionId)
  if (!question?.correct_answer) return ''
  
  // 填空题：解析 JSON 数组并用顿号连接
  if (question.type === 5) {
    try {
      const arr = JSON.parse(question.correct_answer)
      if (Array.isArray(arr)) return arr.join('、')
    } catch {}
  }
  
  return question.correct_answer
}
const getCourseTitle = (questionId: number) => {
  const courseId = getCourseId(questionId)
  if (!courseId) return ''
  return `课程 #${courseId}`
}

const isCorrectOption = (questionId: number, key: string) => {
  const correct = getCorrectAnswer(questionId)
  if (!correct) return false
  const q = findQuestion(questionId)
  if (q?.type === 2) {
    return correct.split(',').map((s: string) => s.trim()).includes(key)
  }
  return correct === key
}

const getOptionClass = (answer: any, key: string) => {
  const q = findQuestion(answer.question_id)
  if (!q) return ''

  const isCorrect = isCorrectOption(answer.question_id, key)
  const isStudentAnswer = Array.isArray(answer.answer)
    ? answer.answer.includes(key)
    : answer.answer === key

  if (isCorrect && isStudentAnswer) return 'bg-green-100 border border-green-300'
  if (isCorrect) return 'bg-green-50 border border-green-200'
  if (isStudentAnswer && !isCorrect) return 'bg-red-100 border border-red-300'
  return 'bg-gray-50'
}

const formatAnswer = (answer: any) => {
  if (Array.isArray(answer)) return answer.join(', ')
  return String(answer ?? '未作答')
}

// 判断是否显示课程复习提示
const shouldShowCourseReview = (answer: any) => {
  // 客观题：答错
  if (isWrong(answer)) return true
  
  // 填空题/简答题：未评且未得满分
  if (isPending(answer)) {
    const questionScore = getQuestionScore(answer.question_id)
    return questionScore > 0 && Number(answer.score_awarded ?? 0) < questionScore
  }
  
  return false
}

// 重新提交
const showExamModal = ref(false)

const handleRetake = () => {
  showExamModal.value = true
}

const onExamSubmitted = (result: any) => {
  // 重新加载页面数据
  loadRecord()
}

onMounted(loadRecord)
</script>
