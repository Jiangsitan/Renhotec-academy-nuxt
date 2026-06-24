<template>
  <div>
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <UInput v-model="filters.keyword" placeholder="搜索考试标题..." icon="i-heroicons-magnifying-glass" class="w-64" @update:model-value="debouncedLoad" />
      <div class="flex-1" />
      <UButton color="gray" icon="i-heroicons-arrow-up-tray" label="批量导入" @click="showImportModal = true" />
      <UButton icon="i-heroicons-plus" label="创建考试" @click="openExamModal()" />
    </div>

    <UCard>
      <UTable :rows="exams" :columns="columns" :loading="loading">
        <template #courses-data="{ row }">
          <div v-if="row.courses?.length" class="flex flex-wrap gap-1">
            <UBadge v-for="c in row.courses" :key="c.id" :label="`#${c.id} ${c.title}`" size="xs" variant="subtle" />
          </div>
          <span v-else class="text-xs text-gray-400">未关联</span>
        </template>
        <template #status-data="{ row }">
          <UBadge :label="statusLabel(row.status)" :color="statusColor(row.status)" variant="subtle" />
        </template>
        <template #questions_count-data="{ row }">
          <span>{{ row.questions_count ?? 0 }} 题</span>
        </template>
        <template #passing_score-data="{ row }">
          <span>{{ formatScore(row.passing_score) }} 分</span>
        </template>
        <template #actions-data="{ row }">
          <div class="flex items-center gap-1">
            <UButton color="primary" variant="ghost" icon="i-heroicons-list-bullet" size="xs" @click="openExamModal(row)" />
            <UButton v-if="row.status === 'draft'" color="green" variant="ghost" size="xs" label="发布" @click="updateExamStatus(row, 'active')" />
            <UButton v-if="row.status === 'active'" color="orange" variant="ghost" size="xs" label="取消发布" @click="updateExamStatus(row, 'draft')" />
            <UButton color="red" variant="ghost" icon="i-heroicons-trash" size="xs" @click="handleDeleteExam(row)" />
          </div>
        </template>
      </UTable>
      <template #footer>
        <div class="flex justify-end">
          <UPagination v-model="currentPage" :total="total" :page-count="perPage" @update:model-value="loadExams" />
        </div>
      </template>
    </UCard>

    <!-- 考试管理弹窗（合并基本信息 + 题目设置） -->
    <UModal v-model="showExamModal" :prevent-close="saving || savingQuestion" :ui="{ width: 'sm:max-w-3xl' }">
      <UCard class="max-h-[90vh] overflow-y-auto">
        <template #header>
          <h3 class="text-base font-semibold">{{ editingExam ? '编辑考试' : '创建考试' }}</h3>
        </template>

        <!-- Tab 切换 -->
        <div class="flex border-b border-gray-200 mb-5">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
            :class="activeTab === tab.key
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            {{ tab.label }}
            <span v-if="tab.key === 'questions' && questions.length > 0" class="ml-1.5 bg-gray-200 text-xs px-1.5 py-0.5 rounded-full">
              {{ questions.length }}
            </span>
          </button>
        </div>

        <!-- Tab 1: 基本信息 -->
        <div v-show="activeTab === 'info'" class="space-y-4">
          <UFormGroup label="考试名称" required>
            <UInput v-model="examForm.title" placeholder="请输入考试名称" />
          </UFormGroup>
          <UFormGroup label="关联课程" description="学员需完成所有关联课程才能参加考试">
            <div class="space-y-3">
              <!-- 分级选择 -->
              <div class="flex gap-2">
                <USelect v-model="selectedSeriesId" :options="seriesOptions" placeholder="选择培训主题" class="flex-1" @update:model-value="onSeriesChange" />
                <USelect v-model="selectedCourseId" :options="courseOptionsBySeries" placeholder="选择课程" class="flex-1" :disabled="!selectedSeriesId" />
                <UButton icon="i-heroicons-plus" label="添加" :disabled="!selectedCourseId" @click="addCourse" />
              </div>
              <!-- 已选课程列表 -->
              <div v-if="selectedCourses.length > 0" class="space-y-2">
                <div v-for="c in selectedCourses" :key="c.id" class="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <span class="text-sm text-gray-700">
                    <span class="text-gray-400">{{ c.series_name }} ›</span> {{ c.title }}
                  </span>
                  <UButton color="red" variant="ghost" icon="i-heroicons-x-mark" size="xs" @click="removeCourse(c.id)" />
                </div>
              </div>
              <p v-else class="text-xs text-gray-400">未关联课程时，任何学员都可以参加考试</p>
            </div>
          </UFormGroup>
          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="考试时长（分钟）" required>
              <UInput v-model.number="examForm.time_limit" type="number" placeholder="60" />
            </UFormGroup>
            <UFormGroup label="及格分数" required>
              <UInput v-model.number="examForm.passing_score" type="number" placeholder="60" />
            </UFormGroup>
          </div>
        </div>

        <!-- Tab 2: 题目设置 -->
        <div v-show="activeTab === 'questions'" class="space-y-4">
          <!-- 添加题目按钮 -->
          <div class="flex justify-between items-center">
            <p class="text-sm" :class="totalScore > 100 ? 'text-red-600 font-medium' : 'text-gray-500'">
              共 {{ questions.length }} 题，总分 {{ totalScore }} 分
              <span v-if="totalScore > 100" class="text-xs">（已超过 100 分）</span>
            </p>
            <div class="flex gap-2">
              <UButton icon="i-heroicons-plus" label="添加题目" size="sm" @click="openQuestionForm()" />
            </div>
          </div>

          <!-- 题目列表 -->
          <div v-if="questions.length === 0" class="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
            <UIcon name="i-heroicons-clipboard-document" class="w-10 h-10 mx-auto mb-2" />
            <p class="text-sm">暂无题目，请点击上方按钮添加</p>
          </div>

          <div v-else class="space-y-3">
            <div v-for="(q, idx) in questions" :key="q.id || q._temp_id" class="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-gray-500">#{{ idx + 1 }}</span>
                  <UBadge :label="typeLabel(q.type)" size="xs" variant="subtle" />
                  <span class="text-sm text-gray-500">{{ formatScore(q.score) }} 分</span>
                  <span v-if="q.course_id" class="text-xs text-primary-600">
                    <UIcon name="i-heroicons-link" class="w-3 h-3 inline" />
                    已关联课程
                  </span>
                </div>
                <div class="flex gap-1">
                  <UButton color="gray" variant="ghost" icon="i-heroicons-eye" size="xs" @click="previewQuestion(q)" />
                  <UButton color="gray" variant="ghost" icon="i-heroicons-pencil" size="xs" @click="openQuestionForm(q, idx)" />
                  <UButton color="red" variant="ghost" icon="i-heroicons-trash" size="xs" @click="handleDeleteQuestion(idx)" />
                </div>
              </div>
              <div class="text-sm text-gray-700 mb-2 fill-blank-content" v-html="renderQuestionContent(q.content)"></div>
              <div v-if="q.options" class="text-xs text-gray-500 space-y-1">
                <div v-for="opt in q.options" :key="opt.key" class="flex gap-2">
                  <span class="font-medium" :class="isCorrectAnswer(q, opt.key) ? 'text-green-600' : ''">{{ opt.key }}.</span>
                  <span :class="isCorrectAnswer(q, opt.key) ? 'text-green-600 font-medium' : ''">{{ opt.value }}</span>
                  <span v-if="isCorrectAnswer(q, opt.key)" class="text-green-600">✓</span>
                </div>
              </div>
              <div v-if="q.type === 4 && q.correct_answer" class="text-xs text-gray-500 mt-1">
                参考答案：{{ q.correct_answer }}
              </div>
              <div v-if="q.type === 5 && q.correct_answer" class="text-xs text-gray-500 mt-1">
                正确答案：{{ formatFillBlankAnswer(q.correct_answer) }}
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="gray" label="取消" @click="showExamModal = false" />
            <UButton :label="editingExam ? '保存' : '创建并保存'" :loading="saving" @click="handleExamSubmit" />
          </div>
        </template>

        <!-- 题目表单弹窗（嵌套在考试弹窗内） -->
        <UModal v-model="showQuestionForm">
          <UCard>
            <template #header>
              <h3 class="text-base font-semibold">{{ editingQuestionIndex !== null ? '编辑题目' : '添加题目' }}</h3>
            </template>
            <QuestionEditor ref="questionEditorRef" :question="editingQuestion" :course-options="courseOptionsBySeries" />
            <template #footer>
              <div class="flex justify-end gap-3">
                <UButton color="gray" label="取消" @click="showQuestionForm = false" />
                <UButton :label="editingQuestionIndex !== null ? '保存' : '添加'" :loading="savingQuestion" @click="handleQuestionSubmit" />
              </div>
            </template>
          </UCard>
        </UModal>

        <!-- 题目预览弹窗 -->
        <UModal v-model="showPreviewModal">
          <UCard>
            <template #header>
              <h3 class="text-base font-semibold">题目预览</h3>
            </template>
            <SurveyPreview v-if="previewingQuestion" :questions="[previewingQuestion]" :read-only="true" />
          </UCard>
        </UModal>

      </UCard>
    </UModal>

    <!-- 批量导入弹窗 -->
    <UModal v-model="showImportModal" :prevent-close="importing">
      <UCard>
        <template #header>
          <h3 class="text-base font-semibold">批量导入考试</h3>
        </template>

        <div class="space-y-4">
          <!-- 下载模板 -->
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p class="text-sm font-medium text-gray-700">下载导入模板</p>
              <p class="text-xs text-gray-500">请按模板格式填写数据后上传</p>
            </div>
            <UButton color="gray" size="sm" icon="i-heroicons-arrow-down-tray" label="下载模板" @click="downloadExamTemplate" />
          </div>

          <!-- 已导入文件 -->
          <div v-if="importFile" class="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <UIcon name="i-heroicons-document-check" class="w-5 h-5 text-green-600" />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-green-700 truncate">{{ importFile.name }}</div>
              <div class="text-xs text-green-600">{{ formatFileSize(importFile.size) }}</div>
            </div>
            <UButton color="red" variant="ghost" icon="i-heroicons-x-mark" size="xs" @click="importFile = null" />
          </div>

          <!-- 上传区域 -->
          <div
            v-else
            @click="triggerExamImportInput"
            @dragover.prevent="isDraggingImport = true"
            @dragleave="isDraggingImport = false"
            @drop.prevent="handleExamImportDrop"
            class="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
            :class="isDraggingImport ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'"
          >
            <UIcon name="i-heroicons-cloud-arrow-up" class="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p class="text-sm text-gray-600">
              拖拽 CSV 文件到此处，或 <span class="text-primary-600 font-medium">点击选择文件</span>
            </p>
            <p class="text-xs text-gray-400 mt-2">支持 .csv 格式</p>
          </div>
          <input ref="examImportInputRef" type="file" accept=".csv,.txt" class="hidden" @change="handleExamImportSelect" />

          <!-- 导入进度 -->
          <div v-if="importing" class="text-center py-4">
            <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-primary-500 animate-spin mx-auto mb-2" />
            <p class="text-sm text-gray-600">正在导入，请稍候...</p>
          </div>

          <!-- 导入结果 -->
          <div v-if="importResult" class="space-y-3">
            <div class="flex items-center gap-3 p-3 rounded-lg" :class="importResult.failed > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'">
              <UIcon :name="importResult.failed > 0 ? 'i-heroicons-exclamation-triangle' : 'i-heroicons-check-circle'" class="w-5 h-5" :class="importResult.failed > 0 ? 'text-orange-600' : 'text-green-600'" />
              <div class="text-sm">
                <span class="font-medium text-green-700">创建 {{ importResult.created }} 个考试</span>
                <span v-if="importResult.failed > 0" class="text-orange-700 ml-3">失败 {{ importResult.failed }} 条</span>
              </div>
            </div>

            <div v-if="importResult.errors?.length" class="max-h-48 overflow-y-auto">
              <div v-for="(err, idx) in importResult.errors" :key="idx" class="text-xs text-red-600 py-1 border-b border-red-100">
                <span v-if="err.row > 0">第 {{ err.row }} 行：</span>{{ err.message }}
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="gray" label="关闭" @click="closeExamImportModal" />
            <UButton label="开始导入" :loading="importing" :disabled="!importFile" @click="handleExamImport" />
          </div>
        </template>
      </UCard>
    </UModal>

  </div>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'
import { formatScore } from '~/utils/format'

definePageMeta({ middleware: 'admin' })

const api = useApi()
const toast = useToast()

const exams = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const savingQuestion = ref(false)
const currentPage = ref(1)
const total = ref(0)
const perPage = 15
const showExamModal = ref(false)
const showQuestionForm = ref(false)
const editingExam = ref<any>(null)
const editingQuestionIndex = ref<number | null>(null)
const filters = reactive({ keyword: '' })
const activeTab = ref<'info' | 'questions'>('info')

// 系列/课程分级选择
const seriesOptions = ref<any[]>([])
const courseOptionsBySeries = ref<any[]>([])
const selectedSeriesId = ref('')
const selectedCourseId = ref('')
const selectedCourses = ref<any[]>([])

const tabs = [
  { key: 'info', label: '基本信息' },
  { key: 'questions', label: '题目设置' },
]

const examForm = ref({ title: '', course_ids: [], time_limit: 60, passing_score: 60 })
const questions = ref<any[]>([])

const columns = [
  { key: 'title', label: '考试名称' },
  { key: 'courses', label: '关联课程' },
  { key: 'questions_count', label: '题目数' },
  { key: 'time_limit', label: '时长(分)' },
  { key: 'passing_score', label: '及格分' },
  { key: 'status', label: '状态' },
  { key: 'actions', label: '操作' },
]

const typeLabel = (t: number) => ({ 1: '单选', 2: '多选', 3: '判断', 4: '简答', 5: '填空' }[t] ?? t)
const statusLabel = (s: string) => ({ draft: '草稿', active: '已发布' }[s] ?? s)
const statusColor = (s: string) => ({ draft: 'gray', active: 'green' }[s] ?? 'gray')

const totalScore = computed(() => questions.value.reduce((sum, q) => sum + (Number(q.score) || 0), 0))

const isCorrectAnswer = (q: any, key: string) => {
  if (q.type === 2) { // 多选题
    return q.correct_answer?.split(',').map((s: string) => s.trim()).includes(key)
  }
  return q.correct_answer === key
}

const renderQuestionContent = (content: string) => {
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

const formatFillBlankAnswer = (answer: string) => {
  if (!answer) return ''
  try {
    const arr = JSON.parse(answer)
    if (Array.isArray(arr)) return arr.join('、')
  } catch {}
  return answer
}

let searchTimeout: ReturnType<typeof setTimeout>
const debouncedLoad = () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => loadExams(1), 300) }

const loadExams = async (page = 1) => {
  loading.value = true
  try {
    const params: any = { page, per_page: perPage }
    if (filters.keyword) params.keyword = filters.keyword
    const res = await api.get<any>('/admin/exams', params)
    exams.value = res.data.data
    total.value = res.data.total
    currentPage.value = res.data.current_page
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '加载考试列表失败', color: 'red' })
  }
  loading.value = false
}

const loadSeries = async () => {
  try {
    const res = await api.get<any>('/admin/series', { per_page: 100 })
    seriesOptions.value = res.data.data.map((s: any) => ({
      label: `${s.name} (${s.category?.name ?? ''})`,
      value: s.id
    }))
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '加载培训主题列表失败', color: 'red' })
  }
}

const onSeriesChange = async (seriesId: string) => {
  selectedCourseId.value = ''
  courseOptionsBySeries.value = []
  if (!seriesId) return
  try {
    const res = await api.get<any>('/admin/courses', { series_id: seriesId, per_page: 100 })
    courseOptionsBySeries.value = res.data.data.map((c: any) => ({ label: c.title, value: c.id }))
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '加载课程列表失败', color: 'red' })
  }
}

const addCourse = () => {
  console.log('addCourse called', { 
    selectedCourseId: selectedCourseId.value, 
    type: typeof selectedCourseId.value,
    options: courseOptionsBySeries.value 
  })
  
  if (!selectedCourseId.value) return
  
  // 统一类型比较
  const courseId = Number(selectedCourseId.value)
  const exists = selectedCourses.value.some((c: any) => Number(c.id) === courseId)
  if (exists) {
    toast.add({ title: '该课程已添加', color: 'orange' })
    return
  }
  
  // 使用 Number 转换确保类型一致
  const course = courseOptionsBySeries.value.find((c: any) => Number(c.value) === courseId)
  const series = seriesOptions.value.find((s: any) => String(s.value) === String(selectedSeriesId.value))
  
  console.log('Found course:', course, 'Found series:', series)
  
  if (course) {
    selectedCourses.value.push({
      id: courseId,
      title: course.label,
      series_id: Number(selectedSeriesId.value),
      series_name: series?.label?.split(' (')[0] || ''
    })
    examForm.value.course_ids = selectedCourses.value.map((c: any) => c.id)
    console.log('Course added, selectedCourses:', selectedCourses.value)
  }
  selectedCourseId.value = ''
}

const removeCourse = (id: number) => {
  selectedCourses.value = selectedCourses.value.filter((c: any) => c.id !== id)
  examForm.value.course_ids = selectedCourses.value.map((c: any) => c.id)
}

const openExamModal = async (exam?: any) => {
  editingExam.value = exam || null
  activeTab.value = 'info'
  selectedSeriesId.value = ''
  selectedCourseId.value = ''
  courseOptionsBySeries.value = []
  selectedCourses.value = []

  if (exam) {
    Object.assign(examForm.value, { title: exam.title, course_ids: exam.courses?.map((c: any) => c.id) || [], time_limit: exam.time_limit, passing_score: parseFloat(exam.passing_score) || 60 })
    // 构建已选课程列表
    if (exam.courses?.length) {
      console.log('Loading courses from exam:', exam.courses)
      selectedCourses.value = exam.courses.map((c: any) => ({
        id: c.id,
        title: c.title,
        series_id: c.series_id,
        series_name: c.series?.name || ''
      }))
      console.log('Selected courses:', selectedCourses.value)
      // 预加载已选课程对应系列的课程选项
      const seriesIds = [...new Set(exam.courses.map((c: any) => c.series_id).filter(Boolean))]
      for (const sid of seriesIds) {
        try {
          const res = await api.get<any>('/admin/courses', { series_id: sid, per_page: 100 })
          const opts = res.data.data.map((c: any) => ({ label: c.title, value: c.id }))
          courseOptionsBySeries.value.push(...opts)
        } catch {}
      }
    }
    // 加载已有题目
    try {
      const res = await api.get<any>(`/admin/exams/${exam.id}/questions`)
      questions.value = res.data.map((q: any) => ({ ...q, _temp_id: q.id }))
    } catch (e: any) {
      questions.value = []
      toast.add({ title: e?.data?.message || '加载题目失败', color: 'red' })
    }
  } else {
    Object.assign(examForm.value, { title: '', course_ids: [], time_limit: 60, passing_score: 60 })
    questions.value = []
  }

  loadSeries()
  showExamModal.value = true
}

const handleExamSubmit = async () => {
  if (!examForm.value.title) {
    toast.add({ title: '请填写考试名称', color: 'red' })
    activeTab.value = 'info'
    return
  }

  console.log('Submitting exam form:', examForm.value)
  console.log('Selected courses:', selectedCourses.value)

  saving.value = true
  try {
    if (editingExam.value) {
      // 编辑模式：只更新考试基本信息（题目已在编辑时即时保存）
      await api.put(`/admin/exams/${editingExam.value.id}`, examForm.value)
      toast.add({ title: '考试已更新', color: 'green' })
    } else {
      // 新建模式：创建考试 + 批量保存题目
      const res = await api.post<any>('/admin/exams', examForm.value)
      const examId = res.data.id

      // 保存所有题目
      for (const q of questions.value) {
        const payload = {
          type: q.type,
          content: q.content,
          options: q.options || null,
          correct_answer: q.correct_answer ? String(q.correct_answer) : null,
          score: Number(q.score) || 0,
          course_id: q.course_id || null,
        }
        await api.post(`/admin/exams/${examId}/questions`, payload)
      }

      toast.add({ title: '考试创建成功', color: 'green' })
    }

    showExamModal.value = false
    await loadExams(currentPage.value)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '操作失败', color: 'red' })
  }
  saving.value = false
}

const updateExamStatus = async (exam: any, status: string) => {
  try {
    await api.put(`/admin/exams/${exam.id}/status`, { status })
    toast.add({ title: '状态已更新', color: 'green' })
    await loadExams(currentPage.value)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '操作失败', color: 'red' })
  }
}

const handleDeleteExam = async (exam: any) => {
  try {
    await api.del(`/admin/exams/${exam.id}`)
    toast.add({ title: '考试已删除', color: 'green' })
    await loadExams(currentPage.value)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '删除失败', color: 'red' })
  }
}

// 题目管理
const editingQuestion = ref<any>(null)
const questionEditorRef = ref<any>(null)
const showPreviewModal = ref(false)
const previewingQuestion = ref<any>(null)

const openQuestionForm = (q?: any, idx?: number) => {
  editingQuestionIndex.value = idx ?? null
  editingQuestion.value = q ? { ...q } : null
  showQuestionForm.value = true
}

const previewQuestion = (q: any) => {
  previewingQuestion.value = q
  showPreviewModal.value = true
}

const handleQuestionSubmit = async () => {
  const data = questionEditorRef.value?.getFormData()
  if (!data?.content) {
    toast.add({ title: '请填写题干', color: 'red' })
    return
  }
  if (data.type !== 4 && !data.correct_answer) { // 简答题不需要正确答案
    toast.add({ title: '请填写正确答案', color: 'red' })
    return
  }

  // 计算添加/更新题目后的总分
  const newScore = Number(data.score) || 0
  const oldScore = (editingQuestionIndex.value !== null && editingQuestionIndex.value >= 0)
    ? (Number(questions.value[editingQuestionIndex.value]?.score) || 0)
    : 0
  const newTotal = totalScore.value - oldScore + newScore

  if (newTotal > 100) {
    toast.add({ title: `总分不能超过 100 分（当前：${totalScore.value} 分，新增：${newScore} 分）`, color: 'red' })
    return
  }

  const q: any = {
    ...JSON.parse(JSON.stringify(data)),
    _temp_id: Date.now() + Math.random(),
    _isNew: true,
  }

  if (editingQuestionIndex.value !== null && editingQuestionIndex.value >= 0) {
    // 编辑已有题目
    const existing = questions.value[editingQuestionIndex.value]
    if (existing.id && editingExam.value) {
      // 已有 ID → 立即调用 API 更新
      savingQuestion.value = true
      try {
        const payload = {
          type: q.type,
          content: q.content,
          options: q.options || null,
          correct_answer: q.correct_answer ? String(q.correct_answer) : null,
          score: Number(q.score) || 0,
          course_id: q.course_id || null,
        }
        await api.put(`/admin/exams/${editingExam.value.id}/questions/${existing.id}`, payload)
        q.id = existing.id
        q._isNew = false
        questions.value[editingQuestionIndex.value] = q
        toast.add({ title: '题目已保存', color: 'green' })
      } catch (e: any) {
        toast.add({ title: e?.data?.message || '保存失败', color: 'red' })
        savingQuestion.value = false
        return
      }
      savingQuestion.value = false
    } else {
      // 没有 ID（新建考试时添加的题目）→ 更新本地数组
      q._isNew = existing._isNew
      questions.value[editingQuestionIndex.value] = q
      toast.add({ title: '题目已更新', color: 'green' })
    }
  } else {
    // 新增题目
    if (editingExam.value) {
      // 已有考试 → 立即调用 API 创建
      savingQuestion.value = true
      try {
        const payload = {
          type: q.type,
          content: q.content,
          options: q.options || null,
          correct_answer: q.correct_answer ? String(q.correct_answer) : null,
          score: Number(q.score) || 0,
          course_id: q.course_id || null,
        }
        const res = await api.post<any>(`/admin/exams/${editingExam.value.id}/questions`, payload)
        q.id = res.data.id
        q._isNew = false
        questions.value.push(q)
        toast.add({ title: '题目已保存', color: 'green' })
      } catch (e: any) {
        toast.add({ title: e?.data?.message || '保存失败', color: 'red' })
        savingQuestion.value = false
        return
      }
      savingQuestion.value = false
    } else {
      // 新建考试 → 更新本地数组
      questions.value.push(q)
      toast.add({ title: '题目已添加', color: 'green' })
    }
  }

  showQuestionForm.value = false
}

const handleDeleteQuestion = async (idx: number) => {
  const question = questions.value[idx]
  
  // 新增的题目（未保存），直接从数组删除
  if (!question?.id) {
    questions.value.splice(idx, 1)
    return
  }
  
  // 编辑已有考试的题目，需要调用 API 删除
  if (!editingExam.value?.id) {
    // 没有考试ID，直接从数组删除
    questions.value.splice(idx, 1)
    return
  }
  
  try {
    await api.del(`/admin/exams/${editingExam.value.id}/questions/${question.id}`)
    questions.value.splice(idx, 1)
    toast.add({ title: '题目已删除', color: 'green' })
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '删除失败', color: 'red' })
  }
}

// ==================== 批量导入 ====================

const showImportModal = ref(false)
const importing = ref(false)
const importFile = ref<File | null>(null)
const examImportInputRef = ref<HTMLInputElement | null>(null)
const isDraggingImport = ref(false)
const importResult = ref<{ created: number; failed: number; errors: { row: number; message: string }[] } | null>(null)

const formatFileSize = (bytes: number) => {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

const downloadExamTemplate = async () => {
  try {
    const authStore = useAuthStore()
    const res = await fetch(api.getApiUrl('/admin/exams/import-template'), {
      headers: { 'Authorization': `Bearer ${authStore.token}` },
    })
    if (!res.ok) throw new Error('下载失败')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'exam_import_template.csv'
    link.click()
    URL.revokeObjectURL(url)
  } catch (e: any) {
    toast.add({ title: e?.message || '下载失败', color: 'red' })
  }
}

const triggerExamImportInput = () => { examImportInputRef.value?.click() }

const handleExamImportSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files?.length) {
    const file = input.files[0]
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'txt'].includes(ext || '')) {
      toast.add({ title: '请选择 .csv 文件', color: 'red' })
      return
    }
    importFile.value = file
    importResult.value = null
  }
}

const handleExamImportDrop = (e: DragEvent) => {
  isDraggingImport.value = false
  const files = e.dataTransfer?.files
  if (files?.length) {
    const file = files[0]
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'txt'].includes(ext || '')) {
      toast.add({ title: '请选择 .csv 文件', color: 'red' })
      return
    }
    importFile.value = file
    importResult.value = null
  }
}

const handleExamImport = async () => {
  if (!importFile.value) return
  importing.value = true
  importResult.value = null

  try {
    const formData = new FormData()
    formData.append('file', importFile.value)

    const res = await api.apiFetch<any>('/admin/exams/import', {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': undefined },
    })

    importResult.value = res.data
    toast.add({ title: res.message, color: res.data.failed > 0 ? 'orange' : 'green' })
    await loadExams(1)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '导入失败', color: 'red' })
  }
  importing.value = false
}

const closeExamImportModal = () => {
  showImportModal.value = false
  importFile.value = null
  importResult.value = null
}

onMounted(() => loadExams())
</script>
