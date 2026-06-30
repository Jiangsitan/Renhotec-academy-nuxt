<template>
  <div v-if="loading" class="text-center py-12 text-gray-400">加载中...</div>

  <!-- 无权限 -->
  <div v-else-if="!canTake" class="text-center py-12">
    <UIcon name="i-heroicons-lock-closed" class="w-12 h-12 text-gray-300 mx-auto mb-3" />
    <h2 class="text-xl font-semibold mb-2">暂无考试权限</h2>
    <p class="text-gray-500 mb-4">请先完成课程学习后再参加考试</p>
    <NuxtLink v-if="exam?.course_id" :to="`/course/${exam.course_id}`" class="text-primary-600 hover:underline">
      前往学习课程 →
    </NuxtLink>
    <NuxtLink v-else to="/exam" class="text-primary-600 hover:underline">
      返回考试中心 →
    </NuxtLink>
  </div>

  <!-- 已考过 -->
  <div v-else-if="existingRecord" class="text-center py-12">
    <div class="text-4xl mb-3">📋</div>
    <h2 class="text-xl font-semibold mb-2">您已参加过此考试</h2>
    <p class="text-gray-500 mb-4">您的成绩: {{ existingRecord.total_score != null ? formatScore(existingRecord.total_score) : '待批改' }} 分</p>
    <NuxtLink :to="`/exam/result/${existingRecord.id}`" class="text-primary-600 hover:underline">
      查看答卷详情 →
    </NuxtLink>
  </div>

  <!-- 考试中 -->
  <div v-else-if="exam">
    <ExamFullscreen 
      :is-fullscreen="isFullscreen"
      :show-warning="showWarning"
      :warning-message="warningMessage"
      @enter-fullscreen="enterFullscreen"
    />
    
    <!-- 顶部信息栏 -->
    <div class="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex items-center justify-between">
      <h1 class="text-lg font-bold text-gray-900">{{ exam.title }}</h1>
      <div class="flex items-center gap-4">
        <ExamTimer :time-limit="exam.time_limit" @time-up="handleSubmit" />
        <button
          @click="handleSubmit"
          :disabled="submitting"
          class="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {{ submitting ? '提交中...' : '提交答卷' }}
        </button>
      </div>
    </div>

    <!-- 题目列表 -->
    <div class="space-y-4">
      <QuestionCard
        v-for="(question, index) in questions"
        :key="question.id"
        :question="question"
        :index="index"
        :model-value="answers[question.id]"
        @update="(answer: any) => answers[question.id] = answer"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ExamFullscreen from '~/components/exam/ExamFullscreen.vue'
import { formatScore } from '~/utils/format'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const api = useApi()
const toast = useToast()
const settingsStore = useSettingsStore()

const examId = Number(route.params.id)
const exam = ref<any>(null)
const questions = ref<any[]>([])
const existingRecord = ref<any>(null)
const canTake = ref(false)
const answers = ref<Record<number, any>>({})
const loading = ref(true)
const submitting = ref(false)

// 防作弊监控
const {
  isFullscreen, showWarning, warningMessage,
  enterFullscreen, exitFullscreen, startMonitoring, stopMonitoring
} = useExamMonitor({
  examId,
  onSubmit: async (force?: boolean) => {
    await handleSubmit(force)
  },
})

// 防作弊是否启用（每次进入考试页强制刷新设置）
const isAntiCheatEnabled = computed(() => settingsStore.exam_anti_cheat_enabled === '1')

const loadExam = async () => {
  try {
    // 强制刷新设置，确保拿到最新的防作弊开关状态
    await settingsStore.fetchSettings(true)
    const res = await api.get<any>(`/exams/${examId}`)
    exam.value = res.data.exam
    questions.value = res.data.questions
    existingRecord.value = res.data.existing_record
    canTake.value = res.data.can_take ?? false

    // 初始化答案对象
    questions.value.forEach(q => {
      answers.value[q.id] = q.type === 2 ? [] : '' // 多选题初始化数组，其他初始化空字符串
    })

    // 启动防作弊监控（仅当启用时）
    if (canTake.value && !existingRecord.value && isAntiCheatEnabled.value) {
      await enterFullscreen()
      startMonitoring()
    }
  } catch (e: any) {
    if (e?.statusCode === 403 || e?.statusCode === 404) {
      toast.add({ title: e?.data?.message || '考试不存在或未开放', color: 'red' })
      navigateTo('/exam')
    }
  }
  loading.value = false
}

const handleSubmit = async (force = false) => {
  if (submitting.value) return
  if (!force) {
    if (!confirm('确定要提交答卷吗？提交后不可修改。')) return
  } else {
    toast.add({ title: '因多次离开考试页面，试卷已自动提交', color: 'red' })
  }

  submitting.value = true
  if (isAntiCheatEnabled.value) {
    stopMonitoring()
    exitFullscreen()
  }
  try {
    const formattedAnswers = questions.value.map(q => ({
      question_id: q.id,
      answer: answers.value[q.id],
    }))

    const res = await api.post<any>(`/exams/${examId}/submit`, { answers: formattedAnswers })
    navigateTo(`/exam/result/${res.data.id}`)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '提交失败', color: 'red' })
  } finally {
    submitting.value = false
  }
}

onMounted(loadExam)
</script>
