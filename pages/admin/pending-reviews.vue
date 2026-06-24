<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">考试记录</h1>
      <p class="text-sm text-gray-500 mt-1">查看和管理所有学员的考试记录</p>
    </div>

    <!-- 筛选条件 -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <UInput v-model="filters.keyword" placeholder="搜索学员/考试..." icon="i-heroicons-magnifying-glass" class="w-64" @update:model-value="debouncedLoad" />
      <USelect v-model="filters.status" :options="statusOptions" placeholder="状态" class="w-32" @change="loadRecords(1)" />
      <USelect v-model="filters.department" :options="departmentOptions" placeholder="部门" class="w-40" @change="loadRecords(1)" />
      <USelect v-model="filters.cheat_filter" :options="cheatFilterOptions" placeholder="作弊筛选" class="w-36" @change="loadRecords(1)" />
      <div class="flex-1" />
      <UButton icon="i-heroicons-arrow-path" label="刷新" color="gray" @click="loadRecords(1)" />
    </div>

    <!-- 批量操作栏 -->
    <div v-if="selectedRows.length > 0" class="flex items-center gap-3 mb-4 p-3 bg-primary-50 rounded-lg">
      <span class="text-sm text-primary-700">已选择 {{ selectedRows.length }} 条</span>
      <UButton size="sm" label="批量分配" icon="i-heroicons-user-plus" @click="openBatchAssignModal" />
      <UButton size="sm" label="导出 Excel" icon="i-heroicons-arrow-down-tray" @click="exportToExcel" />
    </div>

    <UCard>
      <UTable :rows="records" :columns="columns" :loading="loading" v-model="selectedRows">
        <template #user-data="{ row }">
          <div>
            <div class="font-medium">{{ row.user?.name }}</div>
            <div class="text-xs text-gray-500">{{ row.user?.employee_no }} · {{ row.user?.department }}</div>
          </div>
        </template>
        <template #exam-data="{ row }">
          <span class="text-sm">{{ row.exam?.title }}</span>
        </template>
        <template #objective_score-data="{ row }">
          <span class="text-sm font-medium">{{ formatScore(row.objective_score) }} 分</span>
        </template>
        <template #total_score-data="{ row }">
          <span class="text-sm font-medium" :class="getScoreClass(row)">
            {{ row.total_score != null ? formatScore(row.total_score) : '-' }}
          </span>
        </template>
        <template #status-data="{ row }">
          <UBadge :label="getStatusLabel(row)" :color="getStatusColor(row)" variant="subtle" size="xs" />
        </template>
        <template #cheat_count-data="{ row }">
          <UBadge 
            v-if="row.cheat_count > 0" 
            :label="`${row.cheat_count} 次`" 
            color="red" 
            variant="subtle" 
            size="xs" 
          />
          <span v-else class="text-xs text-gray-400">0</span>
        </template>
        <template #assigned_to-data="{ row }">
          <div v-if="row.assignee" class="flex items-center gap-1.5">
            <div class="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-xs text-primary-600">
              {{ row.assignee.name?.charAt(0) }}
            </div>
            <span class="text-sm">{{ row.assignee.name }}</span>
          </div>
          <UBadge v-else label="未分配" color="orange" variant="subtle" />
        </template>
        <template #submitted_at-data="{ row }">
          <span class="text-xs text-gray-500">{{ formatDate(row.submitted_at) }}</span>
        </template>
        <template #actions-data="{ row }">
          <div class="flex items-center gap-1">
            <!-- 待批改状态：分配 + 批改 -->
            <template v-if="row.status === 'pending_review'">
              <UButton color="primary" variant="ghost" icon="i-heroicons-user-plus" size="xs" label="分配" @click="openAssignModal(row)" />
              <UButton color="gray" variant="ghost" icon="i-heroicons-pencil" size="xs" label="批改" @click="openReviewModal(row)" />
            </template>
            <!-- 其他状态：查看详情 -->
            <template v-else>
              <UButton color="gray" variant="ghost" icon="i-heroicons-eye" size="xs" label="详情" @click="viewDetail(row)" />
            </template>
          </div>
        </template>
      </UTable>
      <template #footer>
        <div class="flex justify-end">
          <UPagination v-model="currentPage" :total="total" :page-count="perPage" @update:model-value="loadRecords" />
        </div>
      </template>
    </UCard>

    <!-- 分配导师弹窗 -->
    <UModal v-model="showAssignModal">
      <UCard>
        <template #header>
          <h3 class="text-base font-semibold">分配批改人</h3>
        </template>
        <p class="text-sm text-gray-600 mb-2">
          学员 <strong>{{ assigningRecord?.user?.name }}</strong> 的答卷
        </p>
        <p v-if="assigningRecord?.assignee" class="text-sm text-orange-500 mb-4">
          当前分配给：{{ assigningRecord.assignee.name }}
        </p>
        <p v-else class="text-sm text-gray-400 mb-4">
          当前未分配
        </p>
        <UFormGroup label="选择批改人" required>
          <USelect v-model="assignForm.assigned_to" :options="reviewerOptions" placeholder="选择导师或管理员" />
        </UFormGroup>
        <UFormGroup label="备注" class="mt-3">
          <UTextarea v-model="assignForm.note" placeholder="分配备注（可选）" :rows="2" />
        </UFormGroup>
        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="gray" label="取消" @click="showAssignModal = false" />
            <UButton label="确认分配" :loading="assigning" @click="handleAssign" />
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- 批量分配弹窗 -->
    <UModal v-model="showBatchAssignModal">
      <UCard>
        <template #header>
          <h3 class="text-base font-semibold">批量分配批改人</h3>
        </template>
        <p class="text-sm text-gray-600 mb-4">
          为选中的 <strong>{{ selectedRows.length }}</strong> 条记录分配批改人
        </p>
        <UFormGroup label="选择批改人" required>
          <USelect v-model="batchAssignForm.assigned_to" :options="reviewerOptions" placeholder="选择导师或管理员" />
        </UFormGroup>
        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="gray" label="取消" @click="showBatchAssignModal = false" />
            <UButton label="确认分配" :loading="batchAssigning" @click="handleBatchAssign" />
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- 批改弹窗 -->
    <UModal v-model="showReviewModal" :prevent-close="reviewing">
      <UCard class="max-w-5xl max-h-[85vh] overflow-y-auto">
        <template #header>
          <h3 class="text-base font-semibold">批改答卷</h3>
        </template>

        <div class="mb-4 p-3 bg-gray-50 rounded-lg">
          <p class="text-sm"><strong>学员：</strong>{{ reviewingRecord?.user?.name }} ({{ reviewingRecord?.user?.employee_no }})</p>
          <p class="text-sm"><strong>考试：</strong>{{ reviewingRecord?.exam?.title }}</p>
          <p class="text-sm"><strong>客观题得分：</strong>{{ formatScore(reviewingRecord?.objective_score) }} 分</p>
        </div>

        <div v-for="(answer, idx) in subjectiveAnswers" :key="idx" class="mb-5 p-4 bg-gray-50 rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm font-medium text-gray-700">第 {{ getQuestionIndex(answer.question_id) }} 题{{ getQuestionTypeLabel(answer.question_id) }}</p>
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
            <div class="text-sm text-gray-800 bg-white p-3 rounded border mb-3">
              {{ answer.answer || '未作答' }}
            </div>
          </template>

          <!-- 显示参考答案（如有） -->
          <div v-if="getCorrectAnswer(answer.question_id)" class="text-xs text-blue-600 bg-blue-50 p-2 rounded mb-3">
            <span class="font-medium">参考答案：</span>{{ getCorrectAnswer(answer.question_id) }}
          </div>

          <div class="flex items-center gap-3">
            <label class="text-sm text-gray-600">评分：</label>
            <UInput
              v-model.number="scores[answer.question_id]"
              type="number"
              :max="getQuestionScore(answer.question_id)"
              min="0"
              step="0.5"
              class="w-24"
            />
            <span class="text-xs text-gray-400">/ {{ formatScore(getQuestionScore(answer.question_id)) }} 分</span>
          </div>
        </div>

        <UFormGroup label="导师评语">
          <template #hint>
            <span class="text-gray-400">（驳回时必填）</span>
          </template>
          <UTextarea v-model="reviewComment" placeholder="输入评语..." :rows="3" />
        </UFormGroup>

        <template #footer>
          <div class="flex justify-end gap-3">
            <!-- 一键审核通过（所有题目都自动评分时显示） -->
            <UButton
              v-if="isAllAutoGraded"
              label="一键审核通过"
              color="green"
              :loading="reviewing"
              @click="quickApprove"
            />

            <!-- 提交批改（有人工评分时显示） -->
            <UButton
              v-else
              label="提交批改"
              :loading="reviewing"
              @click="handleReview"
            />

            <!-- 驳回按钮 -->
            <UButton
              label="驳回"
              color="red"
              :loading="reviewing"
              @click="handleReject"
            />

            <!-- 取消 -->
            <UButton color="gray" label="取消" @click="showReviewModal = false" />
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { formatScore } from '~/utils/format'

definePageMeta({ middleware: 'admin' })

const api = useApi()
const toast = useToast()

const records = ref<any[]>([])
const loading = ref(true)
const currentPage = ref(1)
const total = ref(0)
const perPage = 15
const selectedRows = ref<any[]>([])
const filters = reactive({ keyword: '', status: '', department: '', cheat_filter: '' })

// 分配
const showAssignModal = ref(false)
const assigningRecord = ref<any>(null)
const assigning = ref(false)
const assignForm = reactive({ assigned_to: '', note: '' })
const reviewerOptions = ref<any[]>([])

// 批量分配
const showBatchAssignModal = ref(false)
const batchAssigning = ref(false)
const batchAssignForm = reactive({ assigned_to: '' })

// 批改
const showReviewModal = ref(false)
const reviewingRecord = ref<any>(null)
const reviewing = ref(false)
const subjectiveAnswers = ref<any[]>([])
const scores = ref<Record<number, number>>({})
const reviewComment = ref('')

// 部门选项
const departmentOptions = ref<any[]>([{ label: '全部部门', value: '' }])

const statusOptions = [
  { label: '全部', value: '' },
  { label: '待批改', value: 'pending_review' },
  { label: '已批改', value: 'graded' },
  { label: '已驳回', value: 'rejected' },
]

const cheatFilterOptions = [
  { label: '全部', value: '' },
  { label: '有作弊记录', value: 'has_cheats' },
  { label: '无作弊记录', value: 'no_cheats' },
]

const columns = [
  { key: 'user', label: '学员' },
  { key: 'exam', label: '考试' },
  { key: 'objective_score', label: '客观题' },
  { key: 'total_score', label: '总分' },
  { key: 'status', label: '状态' },
  { key: 'cheat_count', label: '作弊' },
  { key: 'assigned_to', label: '批改人' },
  { key: 'submitted_at', label: '提交时间' },
  { key: 'actions', label: '操作' },
]

const formatDate = (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-'

// 判断是否所有题目都已自动评分
const isAllAutoGraded = computed(() => {
  return subjectiveAnswers.value.length > 0 && subjectiveAnswers.value.every((a: any) => a.auto_graded)
})

const getStatusLabel = (r: any) => {
  if (r.status === 'pending_review') return '待批改'
  if (r.status === 'rejected') return '已驳回'
  if (r.status === 'graded' || r.status === 'auto_graded') {
    if (r.total_score !== null && r.exam?.passing_score) {
      return r.total_score >= r.exam.passing_score ? '已通过' : '未通过'
    }
    return '已批改'
  }
  return r.status
}

const getStatusColor = (r: any) => {
  if (r.status === 'pending_review') return 'orange'
  if (r.status === 'rejected') return 'red'
  if (r.status === 'graded' || r.status === 'auto_graded') {
    if (r.total_score !== null && r.exam?.passing_score) {
      return r.total_score >= r.exam.passing_score ? 'green' : 'red'
    }
    return 'blue'
  }
  return 'gray'
}

const getScoreClass = (r: any) => {
  if (r.status === 'graded' || r.status === 'auto_graded') {
    if (r.total_score !== null && r.exam?.passing_score) {
      return r.total_score >= r.exam.passing_score ? 'text-green-600' : 'text-red-500'
    }
  }
  return 'text-gray-700'
}

let searchTimeout: ReturnType<typeof setTimeout>
const debouncedLoad = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => loadRecords(1), 300)
}

const loadRecords = async (page = 1) => {
  loading.value = true
  try {
    const params: any = { page, per_page: perPage }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.status) params.status = filters.status
    if (filters.department) params.department = filters.department
    if (filters.cheat_filter) params.cheat_filter = filters.cheat_filter
    const res = await api.get<any>('/admin/exam-records', params)
    records.value = res.data.data
    total.value = res.data.total
    currentPage.value = res.data.current_page
  } catch (e) { console.error(e) }
  loading.value = false
}

const loadDepartments = async () => {
  try {
    const res = await api.get<any>('/admin/users', { per_page: 1000 })
    const departments = [...new Set((res.data.data || []).map((u: any) => u.department).filter(Boolean))]
    departmentOptions.value = [
      { label: '全部部门', value: '' },
      ...departments.sort().map((d: string) => ({ label: d, value: d }))
    ]
  } catch {}
}

const loadReviewers = async () => {
  try {
    const [mentors, admins] = await Promise.all([
      api.get<any>('/admin/users', { role: 'mentor', per_page: 100 }),
      api.get<any>('/admin/users', { role: 'admin', per_page: 100 }),
    ])
    const mentorOpts = mentors.data.data.map((u: any) => ({ label: `${u.name} (导师)`, value: u.id }))
    const adminOpts = admins.data.data.map((u: any) => ({ label: `${u.name} (管理员)`, value: u.id }))
    reviewerOptions.value = [...adminOpts, ...mentorOpts]
  } catch {}
}

// 查看详情
const viewDetail = (record: any) => {
  window.open(`/exam/result/${record.id}`, '_blank')
}

// 分配
const openAssignModal = (record: any) => {
  assigningRecord.value = record
  assignForm.assigned_to = record.assigned_to || ''
  assignForm.note = record.assignment_note || ''
  loadReviewers()
  showAssignModal.value = true
}

const handleAssign = async () => {
  if (!assignForm.assigned_to) {
    toast.add({ title: '请选择批改人', color: 'red' })
    return
  }
  assigning.value = true
  try {
    await api.post(`/admin/assign-review/${assigningRecord.value.id}`, assignForm)
    toast.add({ title: '分配成功', color: 'green' })
    showAssignModal.value = false
    await loadRecords(currentPage.value)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '分配失败', color: 'red' })
  }
  assigning.value = false
}

// 批量分配
const openBatchAssignModal = () => {
  batchAssignForm.assigned_to = ''
  loadReviewers()
  showBatchAssignModal.value = true
}

const handleBatchAssign = async () => {
  if (!batchAssignForm.assigned_to) {
    toast.add({ title: '请选择批改人', color: 'red' })
    return
  }
  batchAssigning.value = true
  try {
    const recordIds = selectedRows.value.map((r: any) => r.id)
    await api.post('/admin/exam-records/batch-assign', {
      record_ids: recordIds,
      assigned_to: batchAssignForm.assigned_to,
    })
    toast.add({ title: '批量分配成功', color: 'green' })
    showBatchAssignModal.value = false
    selectedRows.value = []
    await loadRecords(currentPage.value)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '批量分配失败', color: 'red' })
  }
  batchAssigning.value = false
}

// 导出 Excel
const exportToExcel = async () => {
  try {
    const params: any = {}
    if (filters.status) params.status = filters.status
    if (filters.department) params.department = filters.department
    if (filters.cheat_filter) params.cheat_filter = filters.cheat_filter
    
    // 如果有选中行，只导出选中的
    if (selectedRows.value.length > 0) {
      params.record_ids = selectedRows.value.map((r: any) => r.id).join(',')
    }
    
    const res = await fetch(api.getApiUrl('/admin/exam-records/export?' + new URLSearchParams(params)), {
      headers: { 'Authorization': `Bearer ${useAuthStore().token}` },
    })
    if (!res.ok) throw new Error('导出失败')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `exam_records_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.add({ title: '导出成功', color: 'green' })
  } catch (e: any) {
    toast.add({ title: e?.message || '导出失败', color: 'red' })
  }
}

// 批改
const openReviewModal = async (record: any) => {
  reviewingRecord.value = record
  scores.value = {}
  reviewComment.value = ''

  try {
    const res = await api.get<any>(`/exam-records/${record.id}`)
    const fullRecord = res.data

    reviewingRecord.value = fullRecord

    // 筛选需要批改的题目：is_correct === null
    subjectiveAnswers.value = (fullRecord.answers || []).filter((a: any) => a.is_correct === null)

    // 初始化分数
    subjectiveAnswers.value.forEach((a: any) => { scores.value[a.question_id] = a.score_awarded || 0 })
  } catch { subjectiveAnswers.value = [] }

  showReviewModal.value = true
}

const getQuestionContent = (qid: number) => reviewingRecord.value?.exam?.questions?.find((q: any) => q.id === qid)?.content ?? ''
const getQuestionScore = (qid: number) => reviewingRecord.value?.exam?.questions?.find((q: any) => q.id === qid)?.score ?? 0
const getQuestionIndex = (qid: number) => {
  const idx = reviewingRecord.value?.exam?.questions?.findIndex((q: any) => q.id === qid)
  return (idx ?? -1) + 1
}

const getCorrectAnswer = (questionId: number) => {
  const question = reviewingRecord.value?.exam?.questions?.find((q: any) => q.id === questionId)
  if (!question?.correct_answer) return ''
  
  if (question.type === 5) {
    try {
      const arr = JSON.parse(question.correct_answer)
      if (Array.isArray(arr)) return arr.join('、')
    } catch {}
  }
  
  return question.correct_answer
}

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

const isFillBlank = (questionId: number) => {
  return reviewingRecord.value?.exam?.questions?.find((q: any) => q.id === questionId)?.type === 5
}

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
  reviewing.value = true
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
    toast.add({ title: '审核完成', color: 'green' })
    showReviewModal.value = false
    await loadRecords(currentPage.value)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '审核失败', color: 'red' })
  }
  reviewing.value = false
}

// 提交批改
const handleReview = async () => {
  reviewing.value = true
  try {
    await api.post(`/mentor/review/${reviewingRecord.value.id}`, {
      subjective_scores: scores.value,
      comment: reviewComment.value || null,
      action: 'approve',
    })
    toast.add({ title: '批改完成', color: 'green' })
    showReviewModal.value = false
    await loadRecords(currentPage.value)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '批改失败', color: 'red' })
  }
  reviewing.value = false
}

// 驳回
const handleReject = async () => {
  if (!reviewComment.value.trim()) {
    toast.add({ title: '驳回时请输入评语，说明驳回原因', color: 'red' })
    return
  }
  
  reviewing.value = true
  try {
    await api.post(`/mentor/review/${reviewingRecord.value.id}`, {
      subjective_scores: {},
      comment: reviewComment.value,
      action: 'reject',
    })
    toast.add({ title: '已驳回，学生将收到通知', color: 'green' })
    showReviewModal.value = false
    await loadRecords(currentPage.value)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '驳回失败', color: 'red' })
  } finally {
    reviewing.value = false
  }
}

onMounted(() => {
  loadRecords()
  loadDepartments()
})
</script>
