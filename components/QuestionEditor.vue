<template>
  <div class="space-y-4">
    <!-- 题型选择 -->
    <div class="flex gap-2">
      <UButton
        v-for="t in questionTypes"
        :key="t.value"
        :label="t.label"
        :color="form.type === t.value ? 'primary' : 'gray'"
        :variant="form.type === t.value ? 'solid' : 'outline'"
        size="sm"
        @click="form.type = t.value"
      />
    </div>

    <!-- 题目内容 -->
    <UFormGroup label="题目内容" required>
      <UTextarea v-model="form.content" :rows="form.type === 5 ? 6 : 3" :placeholder="form.type === 5 ? '输入题目内容，用（）标记空位。示例：产品由（外壳）、（胶芯）和（中心导体）组成' : '输入题目内容'" />
      <div class="mt-2">
        <ImageUploader label="插入图片" @uploaded="insertImage" @error="showError" />
      </div>
      <!-- 非填空题：内容预览（显示图片） -->
      <div v-if="form.type !== 5 && form.content" class="mt-3">
        <p class="text-xs text-gray-400 mb-2">内容预览：</p>
        <div class="p-4 bg-gray-50 rounded-lg border fill-blank-content" v-html="renderContent(form.content)"></div>
      </div>
    </UFormGroup>

    <!-- 填空题：空位检测 + 每空单独输入框 -->
    <template v-if="form.type === 5">
      <div v-if="blankCount > 0" class="space-y-2">
        <p class="text-sm text-gray-500">检测到 {{ blankCount }} 个空位，请为每个空位填写答案：</p>
        <div v-for="idx in blankCount" :key="idx" class="flex items-center gap-2">
          <span class="text-sm font-medium text-gray-600 min-w-[50px]">第 {{ idx }} 空：</span>
          <UInput v-model="blankAnswers[idx - 1]" :placeholder="`第 ${idx} 空答案`" class="flex-1" />
        </div>
      </div>
      <div v-else class="text-sm text-gray-400">
        请在题目内容中用（）标记空位
      </div>

      <!-- 实时预览：内联括号+自适应宽度 -->
      <div v-if="form.content" class="mt-4">
        <p class="text-xs text-gray-400 mb-2">学生端预览：</p>
        <div class="p-4 bg-gray-50 rounded-lg border">
          <ExamFillBlankInput
            :content="form.content"
            :answers="blankAnswers"
            :editable="true"
            :show-reference="true"
            :reference-answers="blankAnswers"
          />
        </div>
      </div>
    </template>

    <!-- 选项（单选/多选/判断） -->
    <UFormGroup v-if="[1, 2, 3].includes(form.type)" label="选项" required>
      <div v-if="form.type === 3" class="space-y-2">
        <div class="flex items-center gap-2">
          <span class="w-6 text-sm font-medium">A</span>
          <UInput value="正确" disabled class="flex-1" />
        </div>
        <div class="flex items-center gap-2">
          <span class="w-6 text-sm font-medium">B</span>
          <UInput value="错误" disabled class="flex-1" />
        </div>
      </div>
      <div v-else class="space-y-3">
        <div v-for="(opt, idx) in form.options" :key="idx">
          <div class="flex items-center gap-2">
            <span class="w-6 text-sm font-medium">{{ String.fromCharCode(65 + idx) }}</span>
            <UInput v-model="opt.value" :placeholder="`选项 ${String.fromCharCode(65 + idx)}`" class="flex-1" />
            <ImageUploader label="" @uploaded="(url) => insertOptionImage(idx, url)" @error="showError" />
            <UButton
              v-if="form.options.length > 2"
              color="red"
              variant="ghost"
              icon="i-heroicons-trash"
              size="xs"
              @click="form.options.splice(idx, 1)"
            />
          </div>
          <!-- 选项图片预览 -->
          <div v-if="opt.value.includes('<img')" class="ml-8 mt-1 p-2 bg-gray-50 rounded border" v-html="renderContent(opt.value)"></div>
        </div>
        <UButton
          v-if="form.options.length < 6"
          color="gray"
          variant="ghost"
          icon="i-heroicons-plus"
          size="xs"
          label="添加选项"
          @click="form.options.push({ key: String.fromCharCode(65 + form.options.length), value: '' })"
        />
      </div>
    </UFormGroup>

    <!-- 正确答案（非填空题） -->
    <UFormGroup v-if="form.type !== 5" label="正确答案" required>
      <UInput v-if="form.type === 1 || form.type === 3" v-model="form.correct_answer" placeholder="如 A" />
      <UInput v-else-if="form.type === 2" v-model="form.correct_answer" placeholder="如 A,B,C" />
      <UTextarea v-else v-model="form.correct_answer" :rows="2" placeholder="参考答案（可选）" />
    </UFormGroup>

    <!-- 分值 -->
    <UFormGroup label="分值" required>
      <UInput v-model.number="form.score" type="number" min="1" max="100" placeholder="分值" />
    </UFormGroup>

    <!-- 关联课程 -->
    <UFormGroup v-if="courseOptions?.length" label="关联课程" description="学员答错时显示此课程链接，引导复习">
      <USelect v-model="form.course_id" :options="courseOptions" placeholder="选择关联课程" />
    </UFormGroup>
  </div>
</template>

<script setup lang="ts">
import { renderContent } from '~/utils/renderContent'
import { normalizeQuestionType } from '~/utils/questionType'

const props = defineProps<{
  question?: any
  courseOptions?: { label: string; value: string }[]
}>()

const questionTypes = [
  { label: '单选题', value: 1 },
  { label: '多选题', value: 2 },
  { label: '判断题', value: 3 },
  { label: '简答题', value: 4 },
  { label: '填空题', value: 5 },
]

const form = reactive({
  type: normalizeQuestionType(props.question?.type) || 1,
  content: props.question?.content || '',
  options: props.question?.options
    ? [...props.question.options.map((o: any) => ({ ...o }))]
    : [
        { key: 'A', value: '' },
        { key: 'B', value: '' },
        { key: 'C', value: '' },
        { key: 'D', value: '' },
      ],
  correct_answer: props.question?.correct_answer || '',
  score: props.question?.score || 10,
  course_id: props.question?.course_id || '',
})

// 填空题：每空单独的答案
const blankAnswers = ref<string[]>([])

// 初始化填空答案
if (normalizeQuestionType(props.question?.type) === 5 && props.question?.correct_answer) {
  try {
    const arr = JSON.parse(props.question.correct_answer)
    blankAnswers.value = Array.isArray(arr) ? [...arr] : props.question.correct_answer.split(',').map((s: string) => s.trim())
  } catch {
    blankAnswers.value = props.question.correct_answer.split(',').map((s: string) => s.trim())
  }
}

// 当 question prop 变化时重新初始化（编辑不同题目时触发）
watch(() => props.question, (newQ) => {
  if (newQ) {
    form.type = normalizeQuestionType(newQ.type) || 1
    form.content = newQ.content || ''
    form.options = newQ.options
      ? [...newQ.options.map((o: any) => ({ ...o }))]
      : [
          { key: 'A', value: '' },
          { key: 'B', value: '' },
          { key: 'C', value: '' },
          { key: 'D', value: '' },
        ]
    form.correct_answer = newQ.correct_answer || ''
    form.score = newQ.score || 10
    form.course_id = newQ.course_id || ''

    // 重新初始化填空答案 — 先清空再赋值，防止 push 追加
    blankAnswers.value = []
    if (normalizeQuestionType(newQ.type) === 5 && newQ.correct_answer) {
      try {
        const arr = JSON.parse(newQ.correct_answer)
        if (Array.isArray(arr)) {
          blankAnswers.value = [...arr]
        } else {
          blankAnswers.value = newQ.correct_answer.split(',').map((s: string) => s.trim())
        }
      } catch {
        blankAnswers.value = newQ.correct_answer.split(',').map((s: string) => s.trim())
      }
    }
  }
}, { deep: true })

watch(() => form.type, (newType) => {
  if (newType === 3) { // 判断题
    form.options = [
      { key: 'A', value: '正确' },
      { key: 'B', value: '错误' },
    ]
    if (!['A', 'B'].includes(form.correct_answer)) {
      form.correct_answer = ''
    }
  }
})

// 空位数量（支持中文括号（）和英文括号()）
const blankCount = computed(() => {
  if (!form.content) return 0
  const matches = form.content.match(/（\s*）|\(\s*\)/g)
  return matches ? matches.length : 0
})

// 同步空位数量和答案数组
watch(blankCount, (newCount) => {
  while (blankAnswers.value.length < newCount) {
    blankAnswers.value.push('')
  }
  while (blankAnswers.value.length > newCount) {
    blankAnswers.value.pop()
  }
})

// 正确答案（从每空的答案合并）
watch(blankAnswers, () => {
  if (form.type === 5) { // 填空题
    form.correct_answer = blankAnswers.value.join(',')
  }
}, { deep: true })



const extractedImages = computed(() => {
  const matches = form.content.match(/<img[^>]+src="([^"]+)"/g) || []
  return matches.map((m: string) => {
    const srcMatch = m.match(/src="([^"]+)"/)
    return srcMatch ? srcMatch[1] : ''
  }).filter(Boolean)
})

const insertImage = (url: string) => {
  form.content += `<img src="${url}">`
}

const insertOptionImage = (idx: number, url: string) => {
  form.options[idx].value += `<img src="${url}">`
}

const showError = (msg: string) => {
  console.error(msg)
}

const getFormData = () => {
  let answer = form.type === 5 ? blankAnswers.value.join(',') : form.correct_answer
  // 防御性检查: 如果填空题答案意外传入 JSON 数组字符串，解析后重新拼接
  if (form.type === 5 && answer && typeof answer === 'string' && answer.startsWith('[')) {
    try {
      const parsed = JSON.parse(answer)
      if (Array.isArray(parsed)) {
        answer = parsed.join(',')
      }
    } catch { /* not JSON, keep as-is */ }
  }
  return {
    type: form.type,
    content: form.content,
    options: [1, 2, 3].includes(form.type) ? form.options : null,
    correct_answer: answer,
    score: form.score,
    course_id: form.course_id || null,
  }
}

defineExpose({ getFormData })
</script>
