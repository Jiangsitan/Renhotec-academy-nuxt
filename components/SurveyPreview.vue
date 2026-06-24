<template>
  <div class="survey-preview">
    <SurveyComponent :model="survey" />
  </div>
</template>

<script setup lang="ts">
import 'survey-core/survey-core.css'
import { Model } from 'survey-core'
import { SurveyComponent } from 'survey-vue3-ui'

const props = defineProps<{
  questions: any[]
  answers?: Record<number, any>
  readOnly?: boolean
}>()

const emit = defineEmits<{
  complete: [data: Record<string, any>]
}>()

const survey = computed(() => {
  const elements: any[] = []

  props.questions.forEach((q, idx) => {
    const hasHtml = /<img[^>]+src="[^"]+"/.test(q.content || '')

    // 如果题目包含 HTML（图片），先添加 HTML 展示元素
    if (hasHtml) {
      elements.push({
        type: 'html',
        name: `q_${q.id || idx}_html`,
        html: q.content,
      })
    }

    const base: any = {
      name: `q_${q.id || idx}`,
      title: hasHtml ? '' : q.content,
      isRequired: false,
    }

    switch (q.type) {
      case 1: // 单选题
        elements.push({
          ...base,
          type: 'radiogroup',
          choices: (q.options || []).map((o: any) => ({
            value: o.key,
            text: o.value,
          })),
          correctAnswer: q.correct_answer,
        })
        break

      case 2: // 多选题
        elements.push({
          ...base,
          type: 'checkbox',
          choices: (q.options || []).map((o: any) => ({
            value: o.key,
            text: o.value,
          })),
          correctAnswer: q.correct_answer?.split(',').map((s: string) => s.trim()),
        })
        break

      case 3: // 判断题
        elements.push({
          ...base,
          type: 'radiogroup',
          choices: [
            { value: 'A', text: '正确' },
            { value: 'B', text: '错误' },
          ],
          correctAnswer: q.correct_answer,
        })
        break

      case 5: { // 填空题
        const blanks = (q.content || '').match(/（\s*）/g) || []
        elements.push({
          ...base,
          type: 'multipletext',
          items: blanks.map((_: string, i: number) => ({
            name: `blank_${i}`,
            title: `空${i + 1}`,
            isRequired: false,
          })),
        })
        break
      }

      case 4: // 简答题
        elements.push({
          ...base,
          type: 'comment',
          rows: 4,
        })
        break

      default:
        elements.push({ ...base, type: 'comment' })
    }
  })

  const model = new Model({
    elements,
    showQuestionNumbers: 'off',
    completeText: '提交',
  })

  if (props.readOnly) {
    model.mode = 'display'
  }

  if (props.answers) {
    for (const [idx, answer] of Object.entries(props.answers)) {
      const qName = `q_${props.questions[parseInt(idx)]?.id || idx}`
      model.setValue(qName, answer)
    }
  }

  model.onComplete.add((sender: any) => {
    emit('complete', sender.data)
  })

  return model
})
</script>

<style scoped>
.survey-preview :deep(.sv-question__title) {
  font-size: 14px;
}

.survey-preview :deep(.sv-question__description) {
  font-size: 13px;
}

.survey-preview :deep(.sv-item__control-label) {
  font-size: 14px;
}

.survey-preview :deep(img) {
  max-width: 300px;
  max-height: 200px;
  border-radius: 8px;
  margin: 4px 0;
}
</style>
