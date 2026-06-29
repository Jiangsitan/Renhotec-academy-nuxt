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

        <div v-for="(answer, idx) in subjectiveAnswers" :key="idx" class="mb-6 p-4 bg-gray-50 rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm font-medium text-gray-700">第 {{ idx + 1 }} 题{{ getQuestionTypeLabel(answer.question_id) }}</p>
            <UBadge v-if="answer.auto_graded" label="已自动评分" color="blue" size="xs" />
            <UBadge v-else label="需人工评分" color="orange" size="xs" />
          </div>

          <!-- 填空题：分离内容和答案 -->
          <div v-if="isFillBlank(answer.question_id)" class="fill-blank-container mb-3">
            <!-- 题目内容区域 -->
            <div class="fill-blank-question-content text-sm text-gray-600 mb-3">
              <template v-for="(part, pIdx) in parseFillBlankInline(getQuestionContent(answer.question_id))" :key="pIdx">
                <img v-if="part.type === 'image'" :src="part.src" />
                <span v-else-if="part.type === 'blank'" class="fill-blank-preview">第{{ part.index + 1 }}空</span>
                <span v-else v-html="part.html"></span>
              </template>
            </div>
            <!-- 答案显示区域 -->
            <div class="fill-blank-answers-section">
              <div v-for="blank in getBlankCount(answer)" :key="blank" class="fill-blank-answer-row">
                <span class="fill-blank-answer-label">第{{ blank }}空</span>
                <span class="fill-blank-display">{{ (answer.answer || [])[blank - 1] || '未填写' }}</span>
              </div>
            </div>
          </div>

          <!-- 非填空题：普通显示 -->
          <template v-else>
            <div class="text-sm text-gray-600 mb-2 fill-blank-content" v-html="renderContent(getQuestionContent(answer.question_id))"></div>
            <p class="text-sm text-gray-800 bg-white p-3 rounded border mb-3">
              学员答案：{{ answer.answer }}
            </p>
          </template>

          <!-- 显示参考答案（如有） -->
          <div v-if="getCorrectAnswer(answer.question_id)" class="text-xs text-blue-600 bg-blue-50 p-2 rounded mb-3">
            <span class="font-medium">参考答案：</span>{{ getCorrectAnswer(answer.question_id) }}
          </div>

          <div class="flex items-center gap-3">
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
const subjectiveAnswers = ref<any[]>([])
const scores = ref<Record<number, number>>({})
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
  return subjectiveAnswers.value.length > 0 && subjectiveAnswers.value.every((a: any) => a.auto_graded)
})

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
  comment.value = ''

  // 加载答卷详情
  try {
    const res = await api.get<any>(`/exam-records/${record.id}`)
    const fullRecord = res.data

    // 更新 reviewingRecord，使其包含完整的 exam.questions 数据
    reviewingRecord.value = fullRecord

    // 筛选需要批改的题目：is_correct === null
    subjectiveAnswers.value = (fullRecord.answers || []).filter((a: any) => a.is_correct === null)

    // 初始化分数（自动评分的题目预填分数）
    subjectiveAnswers.value.forEach((a: any) => {
      scores.value[a.question_id] = a.score_awarded || 0
    })
  } catch {}

  showModal.value = true
}

const viewDetail = (record: any) => {
  window.open(`/exam/result/${record.id}`, '_blank')
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

// 解析填空题内容为内联片段（图片/空位/文字）
const parseFillBlankInline = (content: string) => {
  if (!content) return []
  const base = 'https://rh-wh.oss-cn-shanghai.aliyuncs.com'
  const parts: any[] = []
  const imgRegex = /<img[^>]+src="([^"]+)"/g
  const blankRegex = /（\s*）/g

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
      const prevPart = parts[parts.length - 1]
      const display = prevPart?.type === 'image' ? 'block' : 'inline'
      parts.push({ type: 'blank', index: blankIndex, display })
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
const getBlankCount = (answer: any) => {
  const question = findQuestion(answer.question_id)
  if (!question?.content) return 0
  const matches = question.content.match(/（\s*）/g)
  return matches ? matches.length : 0
}

// 一键审核通过
const quickApprove = async () => {
  submitting.value = true
  try {
    const scoresToSend: Record<number, number> = {}
    subjectiveAnswers.value.forEach((a: any) => {
      scoresToSend[a.question_id] = a.score_awarded || 0
    })
    
    await api.post(`/mentor/review/${reviewingRecord.value.id}`, {
      subjective_scores: scoresToSend,
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
      subjective_scores: scores.value,
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
