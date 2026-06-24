<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">待批改队列</h1>
      <p class="text-sm text-gray-500 mt-1">学员提交的主观题待您批改</p>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-400">加载中...</div>

    <div v-else-if="records.length === 0" class="text-center py-12">
      <div class="text-4xl mb-3">✅</div>
      <div class="text-gray-500">暂无待批改答卷</div>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="record in records"
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

          <!-- 填空题：内联/块级混合渲染 -->
          <div v-if="isFillBlank(answer.question_id)" class="mb-3 text-sm text-gray-600 fill-blank-inline">
            <template v-for="(part, pIdx) in parseFillBlankInline(getQuestionContent(answer.question_id))" :key="pIdx">
              <img v-if="part.type === 'image'" :src="part.src" class="fill-blank-inline-img" />
              <span v-else-if="part.type === 'blank'" class="fill-blank-display" :class="{ block: part.display === 'block' }">
                {{ (answer.answer || [])[part.index] || '未填写' }}
              </span>
              <span v-else v-html="part.html"></span>
            </template>
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
          <label class="text-sm text-gray-600 block mb-1">
            导师评语
            <span class="text-gray-400">（驳回时必填）</span>
          </label>
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

          <!-- 驳回按钮 -->
          <button
            @click="handleReject"
            :disabled="submitting"
            class="px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            驳回
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

const records = ref<any[]>([])
const loading = ref(true)
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

// 判断是否所有题目都已自动评分
const isAllAutoGraded = computed(() => {
  return subjectiveAnswers.value.length > 0 && subjectiveAnswers.value.every((a: any) => a.auto_graded)
})

const loadRecords = async () => {
  try {
    const res = await api.get<any>('/mentor/pending-reviews')
    records.value = res.data.data
  } catch {}
  loading.value = false
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

// 渲染填空题内容（去除填空标记，只保留图片和文字）
const renderFillBlankContent = (content: string) => {
  if (!content) return ''
  const base = 'https://rh-wh.oss-cn-shanghai.aliyuncs.com'
  const cleaned = content.replace(/（\s*）/g, '')
  return renderHtml(cleaned, base)
}

// 获取填空数量
const getBlankCount = (content: string) => {
  if (!content) return 0
  const matches = content.match(/（\s*）/g)
  return matches ? matches.length : 0
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
    await loadRecords()
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
    await loadRecords()
    toast.add({ title: '批改完成', color: 'green' })
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '批改失败', color: 'red' })
  } finally {
    submitting.value = false
  }
}

// 驳回
const handleReject = async () => {
  if (!comment.value.trim()) {
    toast.add({ title: '驳回时请输入评语，说明驳回原因', color: 'red' })
    return
  }
  
  submitting.value = true
  try {
    await api.post(`/mentor/review/${reviewingRecord.value.id}`, {
      subjective_scores: {},
      comment: comment.value,
      action: 'reject',
    })
    showModal.value = false
    await loadRecords()
    toast.add({ title: '已驳回，学生将收到通知', color: 'green' })
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '驳回失败', color: 'red' })
  } finally {
    submitting.value = false
  }
}

onMounted(loadRecords)
</script>
