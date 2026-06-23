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
      <UTextarea v-model="form.content" :rows="3" placeholder="输入题目内容，用（）标记填空题空位" />
      <div class="mt-2">
        <ImageUploader label="插入图片" @uploaded="insertImage" @error="showError" />
      </div>
      <!-- 图片预览 -->
      <div v-if="extractedImages.length" class="flex gap-2 mt-2 flex-wrap">
        <img
          v-for="(img, i) in extractedImages"
          :key="i"
          :src="img"
          class="w-20 h-20 object-cover rounded border"
        />
      </div>
    </UFormGroup>

    <!-- 选项（单选/多选/判断） -->
    <UFormGroup v-if="['single', 'multiple', 'truefalse'].includes(form.type)" label="选项" required>
      <div v-if="form.type === 'truefalse'" class="space-y-2">
        <div class="flex items-center gap-2">
          <span class="w-6 text-sm font-medium">A</span>
          <UInput value="正确" disabled class="flex-1" />
        </div>
        <div class="flex items-center gap-2">
          <span class="w-6 text-sm font-medium">B</span>
          <UInput value="错误" disabled class="flex-1" />
        </div>
      </div>
      <div v-else class="space-y-2">
        <div v-for="(opt, idx) in form.options" :key="idx" class="flex items-center gap-2">
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

    <!-- 正确答案 -->
    <UFormGroup label="正确答案" required>
      <UInput v-if="form.type === 'single' || form.type === 'truefalse'" v-model="form.correct_answer" placeholder="如 A" />
      <UInput v-else-if="form.type === 'multiple'" v-model="form.correct_answer" placeholder="如 A,B,C" />
      <UInput v-else-if="form.type === 'fill_blank'" v-model="form.correct_answer" placeholder="如 外壳,胶芯,中心导体" />
      <UTextarea v-else v-model="form.correct_answer" :rows="2" placeholder="参考答案（可选）" />
    </UFormGroup>

    <!-- 分值 -->
    <UFormGroup label="分值" required>
      <UInput v-model.number="form.score" type="number" min="1" max="100" placeholder="分值" />
    </UFormGroup>

    <!-- 预览 -->
    <UFormGroup label="预览（学生端效果）">
      <div class="border rounded-lg p-4 bg-gray-50">
        <SurveyPreview :questions="[previewQuestion]" :read-only="true" />
      </div>
    </UFormGroup>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  question?: any
}>()

const emit = defineEmits<{
  save: [question: any]
}>()

const questionTypes = [
  { label: '单选题', value: 'single' },
  { label: '多选题', value: 'multiple' },
  { label: '判断题', value: 'truefalse' },
  { label: '填空题', value: 'fill_blank' },
  { label: '简答题', value: 'short_answer' },
]

const form = reactive({
  type: props.question?.type || 'single',
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
})

watch(() => form.type, (newType) => {
  if (newType === 'truefalse') {
    form.options = [
      { key: 'A', value: '正确' },
      { key: 'B', value: '错误' },
    ]
    if (!['A', 'B'].includes(form.correct_answer)) {
      form.correct_answer = ''
    }
  }
})

const extractedImages = computed(() => {
  const matches = form.content.match(/<img[^>]+src="([^"]+)"/g) || []
  return matches.map((m: string) => {
    const srcMatch = m.match(/src="([^"]+)"/)
    return srcMatch ? srcMatch[1] : ''
  }).filter(Boolean)
})

const previewQuestion = computed(() => ({
  type: form.type,
  content: form.content,
  options: form.options,
  correct_answer: form.correct_answer,
  score: form.score,
}))

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
  return {
    type: form.type,
    content: form.content,
    options: ['single', 'multiple', 'truefalse'].includes(form.type) ? form.options : null,
    correct_answer: form.correct_answer,
    score: form.score,
  }
}

defineExpose({ getFormData })
</script>
