<template>
  <NuxtLink :to="`/course/${course.id}`" class="block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
    <div class="aspect-video bg-gray-100 relative">
      <img v-if="course.cover_image" :src="course.cover_image" :alt="course.title" class="w-full h-full object-cover" />
      <div v-else class="w-full h-full flex items-center justify-center text-4xl">
        {{ course.type === 'video' ? '🎬' : '📄' }}
      </div>
      <span class="absolute top-2 right-2 px-2 py-0.5 text-xs rounded-full" :class="typeBadgeClass">
        {{ course.type === 'video' ? '视频' : '文档' }}
      </span>
    </div>

    <div class="p-4">
      <h3 class="font-medium text-gray-900 line-clamp-2 mb-2">{{ course.title }}</h3>
      <p v-if="course.description" class="text-sm text-gray-500 line-clamp-2 mb-3">{{ course.description }}</p>

      <div class="flex items-center justify-between text-xs text-gray-400">
        <span v-if="course.category">{{ course.category.name }}</span>
        <span v-if="course.type === 'video' && course.duration">
          {{ formatDuration(course.duration) }}
        </span>
        <span v-if="course.type === 'document' && course.min_read_time">
          需阅读 {{ Math.ceil(course.min_read_time / 60) }} 分钟
        </span>
      </div>

      <div v-if="progress" class="mt-3">
        <div class="flex items-center justify-between text-xs mb-1">
          <span class="text-gray-500">学习进度</span>
          <span class="font-medium" :class="progress.is_completed ? 'text-green-600' : 'text-primary-600'">
            {{ progress.is_completed ? '已完成' : `${Math.round(progress.progress_percentage)}%` }}
          </span>
        </div>
        <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all"
            :class="progress.is_completed ? 'bg-green-500' : 'bg-primary-500'"
            :style="{ width: `${Math.round(progress.progress_percentage)}%` }"
          />
        </div>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
const props = defineProps<{
  course: any
  progress?: any
}>()

const typeBadgeClass = computed(() =>
  props.course.type === 'video'
    ? 'bg-blue-100 text-blue-700'
    : 'bg-green-100 text-green-700'
)

const formatDuration = (seconds: number) => {
  const min = Math.floor(seconds / 60)
  return `${min} 分钟`
}
</script>
