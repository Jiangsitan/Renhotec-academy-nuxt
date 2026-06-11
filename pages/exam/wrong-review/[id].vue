<template>
  <div v-if="loading" class="text-center py-12 text-gray-400">加载中...</div>

  <div v-else-if="data">
    <NuxtLink :to="`/exam/result/${data.exam_record_id}`" class="text-sm text-primary-600 hover:underline mb-4 inline-block">← 返回考试结果</NuxtLink>

    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">错题复习</h1>
      <p class="text-sm text-gray-500 mt-1">{{ data.exam_title }} · 共 {{ data.wrong_questions.length }} 道错题</p>
    </div>

    <div class="space-y-4">
      <WrongQuestionItem
        v-for="(item, index) in data.wrong_questions"
        :key="item.question_id"
        :question="item"
        :index="index"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const api = useApi()

const recordId = Number(route.params.id)
const data = ref<any>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await api.get<any>(`/exam-records/${recordId}/wrong-questions`)
    data.value = res.data
  } catch {}
  loading.value = false
})
</script>
