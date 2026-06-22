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
            <UBadge v-for="c in row.courses" :key="c.id" :label="c.title" size="xs" variant="subtle" />
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
              <UButton color="gray" icon="i-heroicons-arrow-up-tray" label="从 Word 导入" size="sm" @click="showWordImportModal = true" />
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
              <div v-if="q.type === 'short_answer' && q.correct_answer" class="text-xs text-gray-500 mt-1">
                参考答案：{{ q.correct_answer }}
              </div>
              <div v-if="q.type === 'fill_blank' && q.correct_answer" class="text-xs text-gray-500 mt-1">
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
            <UForm :state="questionForm" class="space-y-4">
              <UFormGroup label="题型" required>
                <USelect v-model="questionForm.type" :options="questionTypeOptions" />
              </UFormGroup>
              <UFormGroup label="题干" required>
                <div class="space-y-2">
                  <!-- 填空题专用工具栏 -->
                  <div v-if="questionForm.type === 'fill_blank'" class="flex gap-2">
                    <UButton size="xs" color="gray" icon="i-heroicons-photo" 
                             label="插入图片" :loading="uploadingImage" @click="insertImage" />
                    <UButton size="xs" color="gray" icon="i-heroicons-square-3-stack-3d" 
                             label="插入填空" @click="insertBlank" />
                    <UButton size="xs" :color="showPreview ? 'primary' : 'gray'" 
                             icon="i-heroicons-eye" label="预览" @click="showPreview = !showPreview" />
                  </div>
                  
                  <!-- 编辑器切换（非填空题） -->
                  <div v-if="questionForm.type !== 'fill_blank'" class="flex gap-2">
                    <UButton size="xs" :color="editorMode === 'richtext' ? 'primary' : 'gray'" 
                             icon="i-heroicons-document-text" label="富文本" @click="editorMode = 'richtext'" />
                    <UButton size="xs" :color="editorMode === 'markdown' ? 'primary' : 'gray'" 
                             icon="i-heroicons-code-bracket" label="Markdown" @click="editorMode = 'markdown'" />
                  </div>
                  
                  <!-- 编辑模式 -->
                  <div v-show="!showPreview">
                    <!-- 填空题使用 textarea -->
                    <UTextarea 
                      v-if="questionForm.type === 'fill_blank'"
                      ref="contentTextarea"
                      v-model="questionForm.content" 
                      placeholder="请输入题目内容，用（）标记填空位置" 
                      :rows="6" 
                    />
                    <!-- 富文本编辑器 -->
                    <TinyEditor
                      v-else-if="editorMode === 'richtext'"
                      v-model="questionForm.content"
                      placeholder="请输入题目内容"
                      :height="250"
                    />
                    <!-- Markdown 编辑器 -->
                    <MarkdownEditor
                      v-else
                      v-model="questionForm.content"
                      placeholder="请输入题目内容（支持 Markdown 格式）"
                      :height="250"
                    />
                  </div>
                  
                  <!-- 预览模式（仅填空题） -->
                  <div v-if="questionForm.type === 'fill_blank' && showPreview" 
                       class="p-4 bg-gray-50 rounded-lg border min-h-[120px]">
                    <div class="fill-blank-content" v-html="renderedContent"></div>
                  </div>
                </div>
              </UFormGroup>
              
              <!-- 隐藏的图片上传 input -->
              <input ref="imageInputRef" type="file" accept="image/*" class="hidden" @change="handleImageUpload" />
              <UFormGroup v-if="questionForm.type !== 'short_answer' && questionForm.type !== 'fill_blank'" label="选项" required description="每行一个选项，格式: A. 选项内容">
                <UTextarea v-model="optionsText" placeholder="A. 选项一&#10;B. 选项二&#10;C. 选项三&#10;D. 选项四" :rows="4" />
              </UFormGroup>
              <UFormGroup v-if="questionForm.type !== 'short_answer' && questionForm.type !== 'fill_blank'" label="正确答案" required :description="questionForm.type === 'multiple' ? '多选用逗号分隔，如: A,B,D' : questionForm.type === 'truefalse' ? 'A 表示正确，B 表示错误' : ''">
                <UInput v-model="questionForm.correct_answer" :placeholder="questionForm.type === 'multiple' ? 'A,B' : questionForm.type === 'truefalse' ? 'A' : 'A'" />
              </UFormGroup>
            <UFormGroup v-if="questionForm.type === 'fill_blank'" label="正确答案" required description="每个空的答案用逗号分隔，如：连接器（Connector）,转接头（adapter）,插头（plug）">
              <UInput v-model="questionForm.correct_answer" placeholder="连接器（Connector）,转接头（adapter）,插头（plug）" />
            </UFormGroup>
              <UFormGroup v-if="questionForm.type === 'short_answer'" label="参考答案（可选）" description="仅供参考，实际由导师批改评分">
                <UTextarea v-model="questionForm.correct_answer" placeholder="可选：提供参考答案供导师评分时参考" :rows="2" />
              </UFormGroup>
              <div class="grid grid-cols-2 gap-4">
                <UFormGroup label="分值" required>
                  <UInput v-model.number="questionForm.score" type="number" placeholder="25" />
                </UFormGroup>
                <UFormGroup label="关联课程" description="学员答错时显示此课程链接，引导复习">
                  <USelect v-model="questionForm.course_id" :options="questionCourseOptions" placeholder="选择关联课程" />
                </UFormGroup>
              </div>
            </UForm>
            <template #footer>
              <div class="flex justify-end gap-3">
                <UButton color="gray" label="取消" @click="showQuestionForm = false" />
                <UButton :label="editingQuestionIndex !== null ? '保存' : '添加'" :loading="savingQuestion" @click="handleQuestionSubmit" />
              </div>
            </template>
      </UCard>
    </UModal>

    <!-- Word 导入弹窗 -->
    <UModal v-model="showWordImportModal" :prevent-close="wordImporting">
      <UCard>
        <template #header>
          <h3 class="text-base font-semibold">从 Word 导入题目</h3>
        </template>

        <div class="space-y-4">
          <!-- 下载模板 -->
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p class="text-sm font-medium text-gray-700">下载 Word 模板</p>
              <p class="text-xs text-gray-500">请按模板格式填写题目后上传</p>
            </div>
            <UButton color="gray" size="sm" icon="i-heroicons-arrow-down-tray" label="下载模板" @click="downloadWordTemplate" />
          </div>

          <!-- 已上传文件 -->
          <div v-if="wordImportFile" class="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <UIcon name="i-heroicons-document-check" class="w-5 h-5 text-green-600" />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-green-700 truncate">{{ wordImportFile.name }}</div>
              <div class="text-xs text-green-600">{{ formatFileSize(wordImportFile.size) }}</div>
            </div>
            <UButton color="red" variant="ghost" icon="i-heroicons-x-mark" size="xs" @click="wordImportFile = null" />
          </div>

          <!-- 上传区域 -->
          <div
            v-else
            @click="triggerWordImportInput"
            @dragover.prevent="isDraggingWordImport = true"
            @dragleave="isDraggingWordImport = false"
            @drop.prevent="handleWordImportDrop"
            class="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
            :class="isDraggingWordImport ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'"
          >
            <UIcon name="i-heroicons-cloud-arrow-up" class="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p class="text-sm text-gray-600">
              拖拽 Word 文件到此处，或 <span class="text-primary-600 font-medium">点击选择文件</span>
            </p>
            <p class="text-xs text-gray-400 mt-2">支持 .docx 格式，最大 20MB</p>
          </div>
          <input ref="wordImportInputRef" type="file" accept=".docx" class="hidden" @change="handleWordImportSelect" />

          <!-- 导入进度 -->
          <div v-if="wordImporting" class="text-center py-4">
            <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-primary-500 animate-spin mx-auto mb-2" />
            <p class="text-sm text-gray-600">正在导入，请稍候...</p>
          </div>

          <!-- 导入结果 -->
          <div v-if="wordImportResult" class="space-y-3">
            <div class="flex items-center gap-3 p-3 rounded-lg" :class="wordImportResult.failed > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'">
              <UIcon :name="wordImportResult.failed > 0 ? 'i-heroicons-exclamation-triangle' : 'i-heroicons-check-circle'" class="w-5 h-5" :class="wordImportResult.failed > 0 ? 'text-orange-600' : 'text-green-600'" />
              <div class="text-sm">
                <span class="font-medium text-green-700">成功导入 {{ wordImportResult.created }} 道题目</span>
                <span v-if="wordImportResult.failed > 0" class="text-orange-700 ml-3">失败 {{ wordImportResult.failed }} 条</span>
              </div>
            </div>

            <!-- 预览导入的题目 -->
            <div v-if="wordImportResult.questions?.length" class="max-h-64 overflow-y-auto space-y-2">
              <div v-for="(q, idx) in wordImportResult.questions" :key="idx" class="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-sm font-medium text-gray-500">#{{ idx + 1 }}</span>
                  <UBadge :label="typeLabel(q.type)" size="xs" variant="subtle" />
                  <span class="text-sm text-gray-500">{{ q.score }} 分</span>
                </div>
                <p class="text-sm text-gray-700">{{ q.content }}</p>
                <p v-if="q.correct_answer" class="text-xs text-gray-500 mt-1">答案：{{ q.correct_answer }}</p>
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="gray" label="关闭" @click="closeWordImportModal" />
            <UButton label="开始导入" :loading="wordImporting" :disabled="!wordImportFile" @click="handleWordImport" />
          </div>
        </template>
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
import { marked } from 'marked'
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

// 填空题相关状态
const showPreview = ref(false)
const contentTextarea = ref<any>(null)
const imageInputRef = ref<HTMLInputElement | null>(null)
const uploadingImage = ref(false)

// 编辑器模式
const editorMode = ref<'richtext' | 'markdown'>('richtext')

const tabs = [
  { key: 'info', label: '基本信息' },
  { key: 'questions', label: '题目设置' },
]

const examForm = ref({ title: '', course_ids: [], time_limit: 60, passing_score: 60 })
const questionForm = reactive({ type: 'single', content: '', correct_answer: '', score: 25, course_id: '' })
const optionsText = ref('')
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

const questionTypeOptions = [
  { label: '单选题', value: 'single' },
  { label: '多选题', value: 'multiple' },
  { label: '判断题', value: 'truefalse' },
  { label: '简答题', value: 'short_answer' },
  { label: '填空题', value: 'fill_blank' },
]

const typeLabel = (t: string) => ({ single: '单选', multiple: '多选', truefalse: '判断', short_answer: '简答', fill_blank: '填空' }[t] ?? t)
const statusLabel = (s: string) => ({ draft: '草稿', active: '已发布' }[s] ?? s)
const statusColor = (s: string) => ({ draft: 'gray', active: 'green' }[s] ?? 'gray')

const totalScore = computed(() => questions.value.reduce((sum, q) => sum + (Number(q.score) || 0), 0))

const isCorrectAnswer = (q: any, key: string) => {
  if (q.type === 'multiple') {
    return q.correct_answer?.split(',').map((s: string) => s.trim()).includes(key)
  }
  return q.correct_answer === key
}

// 填空题相关方法
const renderedContent = computed(() => {
  if (!questionForm.content) return ''
  return marked(questionForm.content)
})

const renderQuestionContent = (content: string) => {
  if (!content) return ''
  const base = `${window.location.protocol}//${window.location.hostname}:8000`
  const processed = content.replace(/!\[([^\]]*)\]\((\/[^)]+)\)/g, `![$1](${base}$2)`)
  return marked(processed)
}

const formatFillBlankAnswer = (answer: string) => {
  if (!answer) return ''
  try {
    const arr = JSON.parse(answer)
    if (Array.isArray(arr)) return arr.join('、')
  } catch {}
  return answer
}

const insertBlank = () => {
  const textarea = contentTextarea.value?.$el?.querySelector('textarea')
  if (!textarea) {
    questionForm.content += '（ ）'
    return
  }
  
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const text = questionForm.content
  
  questionForm.content = text.slice(0, start) + '（ ）' + text.slice(end)
  
  nextTick(() => {
    textarea.focus()
    textarea.setSelectionRange(start + 3, start + 3)
  })
}

const insertImage = () => {
  imageInputRef.value?.click()
}

const handleImageUpload = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (file.size > 10 * 1024 * 1024) {
    toast.add({ title: '图片大小不能超过 10MB', color: 'red' })
    return
  }

  uploadingImage.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'document')

    const res = await api.apiFetch<any>('/admin/upload/file', {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': undefined },
    })

    const imageUrl = res.data.url
    const imageMarkdown = `![图片](${imageUrl})`
    
    const textarea = contentTextarea.value?.$el?.querySelector('textarea')
    if (textarea) {
      const start = textarea.selectionStart
      const text = questionForm.content
      questionForm.content = text.slice(0, start) + imageMarkdown + text.slice(start)
    } else {
      questionForm.content += imageMarkdown
    }

    toast.add({ title: '图片上传成功', color: 'green' })
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '图片上传失败', color: 'red' })
  } finally {
    uploadingImage.value = false
    input.value = ''
  }
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
const questionCourseOptions = ref<any[]>([])

const loadAllCourses = async () => {
  try {
    const res = await api.get<any>('/admin/courses', { per_page: 100 })
    questionCourseOptions.value = res.data.data.map((c: any) => ({ label: c.title, value: c.id }))
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '加载课程列表失败', color: 'red' })
  }
}

const openQuestionForm = (q?: any, idx?: number) => {
  editingQuestionIndex.value = idx ?? null
  if (q) {
    Object.assign(questionForm, { type: q.type, content: q.content, correct_answer: q.correct_answer, score: q.score, course_id: q.course_id || '' })
    optionsText.value = q.options ? q.options.map((o: any) => `${o.key}. ${o.value}`).join('\n') : ''
  } else {
    // 默认关联考试的课程
    Object.assign(questionForm, { type: 'single', content: '', correct_answer: '', score: 25, course_id: '' })
    optionsText.value = ''
  }
  loadAllCourses()
  showQuestionForm.value = true
}

const handleQuestionSubmit = async () => {
  if (!questionForm.content) {
    toast.add({ title: '请填写题干', color: 'red' })
    return
  }
  if (questionForm.type !== 'short_answer' && !questionForm.correct_answer) {
    toast.add({ title: '请填写正确答案', color: 'red' })
    return
  }

  // 计算添加/更新题目后的总分
  const newScore = Number(questionForm.score) || 0
  const oldScore = (editingQuestionIndex.value !== null && editingQuestionIndex.value >= 0)
    ? (Number(questions.value[editingQuestionIndex.value]?.score) || 0)
    : 0
  const newTotal = totalScore.value - oldScore + newScore

  if (newTotal > 100) {
    toast.add({ title: `总分不能超过 100 分（当前：${totalScore.value} 分，新增：${newScore} 分）`, color: 'red' })
    return
  }

  const q: any = {
    ...JSON.parse(JSON.stringify(questionForm)),
    _temp_id: Date.now() + Math.random(),
    _isNew: true,
  }

  // 解析选项
  if (questionForm.type !== 'short_answer' && questionForm.type !== 'fill_blank' && optionsText.value) {
    q.options = optionsText.value.split('\n').filter(l => l.trim()).map(line => {
      const match = line.match(/^([A-Za-z])[.、．)\s]+(.+)/)
      return match ? { key: match[1].toUpperCase(), value: match[2].trim() } : { key: '', value: line.trim() }
    }).filter(o => o.key)
  } else {
    q.options = null
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

const handleDeleteQuestion = (idx: number) => {
  questions.value.splice(idx, 1)
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

// ==================== Word 导入 ====================

const showWordImportModal = ref(false)
const wordImporting = ref(false)
const wordImportFile = ref<File | null>(null)
const wordImportInputRef = ref<HTMLInputElement | null>(null)
const isDraggingWordImport = ref(false)
const wordImportResult = ref<{ created: number; failed: number; questions: any[] } | null>(null)

const downloadWordTemplate = async () => {
  try {
    const res = await api.get<any>('/admin/exams/import/word-template')
    // 显示模板说明
    toast.add({ title: '请按照模板格式准备 Word 文档', color: 'blue' })
  } catch (e: any) {
    toast.add({ title: e?.message || '下载失败', color: 'red' })
  }
}

const triggerWordImportInput = () => { wordImportInputRef.value?.click() }

const handleWordImportSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files?.length) {
    const file = input.files[0]
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'docx') {
      toast.add({ title: '请选择 .docx 文件', color: 'red' })
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.add({ title: '文件大小不能超过 20MB', color: 'red' })
      return
    }
    wordImportFile.value = file
    wordImportResult.value = null
  }
}

const handleWordImportDrop = (e: DragEvent) => {
  isDraggingWordImport.value = false
  const files = e.dataTransfer?.files
  if (files?.length) {
    const file = files[0]
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'docx') {
      toast.add({ title: '请选择 .docx 文件', color: 'red' })
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.add({ title: '文件大小不能超过 20MB', color: 'red' })
      return
    }
    wordImportFile.value = file
    wordImportResult.value = null
  }
}

const handleWordImport = async () => {
  if (!wordImportFile.value) return
  
  // 如果是新考试，先保存
  if (!editingExam.value) {
    if (!examForm.value.title) {
      toast.add({ title: '请先填写考试名称', color: 'red' })
      return
    }
    
    // 创建考试
    try {
      const res = await api.post<any>('/admin/exams', examForm.value)
      editingExam.value = res.data
      toast.add({ title: '考试已创建，开始导入题目...', color: 'blue' })
    } catch (e: any) {
      toast.add({ title: e?.data?.message || '创建考试失败', color: 'red' })
      return
    }
  }
  
  wordImporting.value = true
  wordImportResult.value = null

  try {
    const formData = new FormData()
    formData.append('file', wordImportFile.value)

    const res = await api.apiFetch<any>(`/admin/exams/${editingExam.value.id}/import/word`, {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': undefined },
    })

    wordImportResult.value = res.data
    toast.add({ title: res.message, color: 'green' })
    
    // 重新加载题目列表
    const questionsRes = await api.get<any>(`/admin/exams/${editingExam.value.id}/questions`)
    questions.value = questionsRes.data.map((q: any) => ({ ...q, _temp_id: q.id }))
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '导入失败', color: 'red' })
  }
  wordImporting.value = false
}

const closeWordImportModal = () => {
  showWordImportModal.value = false
  wordImportFile.value = null
  wordImportResult.value = null
}

onMounted(() => loadExams())
</script>
