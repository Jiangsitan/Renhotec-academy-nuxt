<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">审批管理</h1>
      <p class="text-sm text-gray-500 mt-1">管理学员提交的答卷批改</p>
    </div>

    <!-- Tab 切换 -->
    <div class="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
      <button
        @click="activeTab = 'pending'"
        class="px-5 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === 'pending' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
      >
        待审批
        <span v-if="pendingRecords.length > 0" class="ml-1.5 bg-primary-100 text-primary-700 text-xs px-1.5 py-0.5 rounded-full">
          {{ pendingRecords.length }}
        </span>
      </button>
      <button
        @click="activeTab = 'reviewed'"
        class="px-5 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === 'reviewed' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
      >
        已审批
      </button>
    </div>

    <!-- 待审批 Tab -->
    <div v-if="activeTab === 'pending'">
      <div v-if="pendingLoading" class="text-center py-12 text-gray-400">加载中...</div>

      <div v-else-if="pendingRecords.length === 0" class="text-center py-12">
        <div class="text-4xl mb-3">✅</div>
        <div class="text-gray-500">暂无待批改答卷</div>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="record in pendingRecords"
          :key="record.id"
          class="bg-white rounded-xl border border-gray-200 p-5"
        >
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="font-semibold text-gray-900">{{ record.exam?.title }}</h3>
              <p class="text-sm text-gray-500 mt-1">学员: {{ record.user?.name }} ({{ record.user?.employee_no }})</p>
            </div>
            <span class="text-sm text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">待批改</span>
          </div>

          <div class="text-sm text-gray-500 mb-4">
            提交时间: {{ formatDate(record.submitted_at) }}
            · 客观题得分: {{ formatScore(record.objective_score) }} 分
            <span class="text-xs text-gray-400">（单选/多选/判断）</span>
          </div>

          <button
            @click="openReview(record)"
            class="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
          >
            开始批改
          </button>
        </div>
      </div>
    </div>

    <!-- 已审批 Tab -->
    <div v-if="activeTab === 'reviewed'">
      <div v-if="reviewedLoading" class="text-center py-12 text-gray-400">加载中...</div>

      <div v-else-if="reviewedRecords.length === 0" class="text-center py-12">
        <div class="text-4xl mb-3">📋</div>
        <div class="text-gray-500">暂无已审批记录</div>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="record in reviewedRecords"
          :key="record.id"
          class="bg-white rounded-xl border border-gray-200 p-5"
        >
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="font-semibold text-gray-900">{{ record.exam?.title }}</h3>
              <p class="text-sm text-gray-500 mt-1">学员: {{ record.user?.name }} ({{ record.user?.employee_no }})</p>
            </div>
            <span
              class="text-sm px-2 py-0.5 rounded-full"
              :class="record.total_score >= record.exam?.passing_score ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'"
            >
              {{ record.total_score >= record.exam?.passing_score ? '通过' : '未通过' }}
            </span>
          </div>

          <div class="text-sm text-gray-500 mb-3">
            批改时间: {{ formatDate(record.graded_at) }}
            · 总分: <span class="font-medium" :class="getScoreColor(record)">{{ formatScore(record.total_score) }} 分</span>
          </div>

          <div v-if="record.mentor_comment" class="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-3">
            <span class="font-medium">评语：</span>{{ record.mentor_comment }}
          </div>

          <button
            @click="viewDetail(record)"
            class="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
          >
            查看详情
          </button>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="reviewedTotal > reviewedPerPage" class="flex justify-end mt-4">
        <UPagination v-model="reviewedPage" :total="reviewedTotal" :page-count="reviewedPerPage" @update:model-value="loadReviewedRecords" />
      </div>
    </div>

    <!-- 批改弹窗 -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
        <h2 class="text-lg font-bold mb-4">批改 - {{ reviewingRecord?.exam?.title }}</h2>

        <div v-for="(answer, idx) in allAnswers" :key="idx" class="mb-6 p-4 rounded-lg"
          :class="{
            'bg-green-50 border border-green-200': answer.is_correct === true,
            'bg-red-50 border border-red-200': answer.is_correct === false,
            'bg-orange-50 border border-orange-200': answer.is_correct === null
          }">
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm font-medium text-gray-700">第 {{ idx + 1 }} 题{{ getQuestionTypeLabel(answer.question_id) }}</p>
            <div class="flex items-center gap-2">
              <UBadge v-if="answer.is_correct === true" label="正确" color="green" size="xs" />
              <UBadge v-else-if="answer.is_correct === false" label="错误" color="red" size="xs" />
              <UBadge v-else label="待判定" color="orange" size="xs" />
            </div>
          </div>

          <!-- 填空题：内联括号+自适应宽度 -->
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
          <template v-else>
            <div class="text-sm text-gray-600 mb-2 fill-blank-content" v-html="renderContent(getQuestionContent(answer.question_id))"></div>
            <p class="text-sm text-gray-800 bg-white p-3 rounded border mb-3">
              学员答案：{{ answer.answer || '未作答' }}
            </p>
          </template>

          <!-- 显示参考答案（非填空题，填空题已内联） -->
          <div v-if="!isFillBlank(answer.question_id) && getCorrectAnswer(answer.question_id)" class="reference-highlight">
            <span class="font-medium">参考答案：</span>{{ getCorrectAnswer(answer.question_id) }}
          </div>

          <div class="flex items-center gap-4 mt-3">
            <!-- 对错状态切换 -->
            <div class="flex items-center gap-2">
              <label class="text-sm text-gray-600">对错：</label>
              <UToggle 
                v-model="correctness[answer.question_id]" 
                :on-icon="'i-heroicons-check'" 
                :off-icon="'i-heroicons-x-mark'"
                :disabled="isChoiceType(answer.question_id)"
              />
              <span class="text-xs" :class="correctness[answer.question_id] ? 'text-green-600' : 'text-red-500'">
                {{ correctness[answer.question_id] ? '正确' : '错误' }}
              </span>
            </div>

            <!-- 评分 -->
            <div class="flex items-center gap-2">
              <label class="text-sm text-gray-600">评分：</label>
              <input
                v-model.number="scores[answer.question_id]"
                type="number"
                min="0"
                :max="getQuestionScore(answer.question_id)"
                step="0.5"
                class="w-20 px-2 py-1 border rounded text-sm"
              />
              <span class="text-xs text-gray-400">/ {{ formatScore(getQuestionScore(answer.question_id)) }} 分</span>
            </div>
          </div>
        </div>

        <div class="mb-4">
          <label class="text-sm text-gray-600 block mb-1">导师评语</label>
          <textarea
            v-model="comment"
            rows="3"
            class="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="输入评语..."
          />
        </div>

        <div class="flex gap-3">
          <!-- 一键审核通过（所有题目都自动评分时显示） -->
          <button
            v-if="isAllAutoGraded"
            @click="quickApprove"
            :disabled="submitting"
            class="flex-1 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {{ submitting ? '提交中...' : '一键审核通过' }}
          </button>

          <!-- 提交批改（有人工评分时显示） -->
          <button
            v-else
            @click="submitReview"
            :disabled="submitting"
            class="flex-1 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {{ submitting ? '提交中...' : '提交批改' }}
          </button>

          <!-- 取消 -->
          <button
            @click="showModal = false"
            class="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatScore } from '~/utils/format'
import { QUESTION_TYPE, normalizeQuestionType } from '~/utils/questionType'
import { renderContent } from '~/utils/renderContent'
definePageMeta({ middleware: 'auth' })

const api = useApi()
const toast = useToast()

const activeTab = ref<'pending' | 'reviewed'>('pending')

// 待审批
const pendingRecords = ref<any[]>([])
const pendingLoading = ref(true)

// 已审批
const reviewedRecords = ref<any[]>([])
const reviewedLoading = ref(true)
const reviewedPage = ref(1)
const reviewedTotal = ref(0)
const reviewedPerPage = 15

// 批改弹窗
const showModal = ref(false)
const reviewingRecord = ref<any>(null)
const allAnswers = ref<any[]>([])
const scores = ref<Record<number, number>>({})
const correctness = ref<Record<number, boolean>>({})
const comment = ref('')
const submitting = ref(false)

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const getScoreColor = (record: any) => {
  if (record.exam?.passing_score && record.total_score != null) {
    return record.total_score >= record.exam.passing_score ? 'text-green-600' : 'text-red-500'
  }
  return 'text-gray-700'
}

// 判断是否所有题目都已自动评分
const isAllAutoGraded = computed(() => {
  return allAnswers.value.length > 0 && allAnswers.value.every((a: any) => a.auto_graded)
})

// 判断是否为选择题（单选/多选/判断）
const isChoiceType = (questionId: number) => {
  const question = reviewingRecord.value?.exam?.questions?.find((q: any) => q.id === questionId)
  if (!question) return false
  const normalizedType = normalizeQuestionType(question.type)
  return [QUESTION_TYPE.SINGLE, QUESTION_TYPE.MULTIPLE, QUESTION_TYPE.TRUEFALSE].includes(normalizedType)
}

const loadPendingRecords = async () => {
  try {
    const res = await api.get<any>('/mentor/pending-reviews')
    pendingRecords.value = res.data.data
  } catch {}
  pendingLoading.value = false
}

const loadReviewedRecords = async () => {
  reviewedLoading.value = true
  try {
    const res = await api.get<any>('/mentor/reviewed-records', { page: reviewedPage.value, per_page: reviewedPerPage })
    reviewedRecords.value = res.data.data
    reviewedTotal.value = res.data.total
  } catch {}
  reviewedLoading.value = false
}

const openReview = async (record: any) => {
  reviewingRecord.value = record
  scores.value = {}
  correctness.value = {}
  comment.value = ''

  // 加载答卷详情
  try {
    const res = await api.get<any>(`/exam-records/${record.id}`)
    const fullRecord = res.data

    // 更新 reviewingRecord，使其包含完整的 exam.questions 数据
    reviewingRecord.value = fullRecord

    // 显示所有题目（不再过滤）
    allAnswers.value = fullRecord.answers || []

    // 初始化分数和对错状态
    allAnswers.value.forEach((a: any) => {
      scores.value[a.question_id] = a.score_awarded || 0
      // 对于选择题，根据答案是否与正确答案一致自动判断
      const normalizedType = normalizeQuestionType(a.question_type)
      if ([QUESTION_TYPE.SINGLE, QUESTION_TYPE.MULTIPLE, QUESTION_TYPE.TRUEFALSE].includes(normalizedType)) {
        correctness.value[a.question_id] = a.is_correct ?? false
      } else {
        // 主观题保持原有状态或设为待判定
        correctness.value[a.question_id] = a.is_correct ?? false
      }
    })
  } catch {}

  showModal.value = true
}

const viewDetail = (record: any) => {
  navigateTo(`/exam/result/${record.id}`)
}

const findQuestion = (questionId: number) => {
  return reviewingRecord.value?.exam?.questions?.find((q: any) => q.id === questionId)
}

const getQuestionContent = (questionId: number) => {
  return reviewingRecord.value?.exam?.questions?.find((q: any) => q.id === questionId)?.content ?? ''
}

const getQuestionScore = (questionId: number) => {
  return reviewingRecord.value?.exam?.questions?.find((q: any) => q.id === questionId)?.score ?? 0
}

const getCorrectAnswer = (questionId: number) => {
  const question = reviewingRecord.value?.exam?.questions?.find((q: any) => q.id === questionId)
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

// 获取题目类型标签
const getQuestionTypeLabel = (questionId: number) => {
  const type = reviewingRecord.value?.exam?.questions?.find((q: any) => q.id === questionId)?.type
  const map: Record<number, string> = {
    1: '单选题',
    2: '多选题',
    3: '判断题',
    4: '简答题',
    5: '填空题',
  }
  return map[type] || '主观题'
}

// 判断是否为填空题
const isFillBlank = (questionId: number) => {
  return reviewingRecord.value?.exam?.questions?.find((q: any) => q.id === questionId)?.type === 5
}







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



// 一键审核通过
const quickApprove = async () => {
  submitting.value = true
  try {
    const scoresToSend: Record<number, number> = {}
    const correctnessToSend: Record<number, boolean> = {}
    allAnswers.value.forEach((a: any) => {
      scoresToSend[a.question_id] = a.score_awarded || 0
      correctnessToSend[a.question_id] = a.is_correct ?? false
    })
    
    await api.post(`/mentor/review/${reviewingRecord.value.id}`, {
      scores: scoresToSend,
      correctness: correctnessToSend,
      comment: null,
      action: 'approve',
    })
    showModal.value = false
    await loadPendingRecords()
    toast.add({ title: '审核完成', color: 'green' })
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '审核失败', color: 'red' })
  } finally {
    submitting.value = false
  }
}

// 提交批改（调整分数后）
const submitReview = async () => {
  submitting.value = true
  try {
    await api.post(`/mentor/review/${reviewingRecord.value.id}`, {
      scores: scores.value,
      correctness: correctness.value,
      comment: comment.value || null,
      action: 'approve',
    })
    showModal.value = false
    await loadPendingRecords()
    toast.add({ title: '批改完成', color: 'green' })
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '批改失败', color: 'red' })
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadPendingRecords()
  loadReviewedRecords()
})
</script>
