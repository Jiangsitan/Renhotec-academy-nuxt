<template>
  <div class="flex items-center gap-2">
    <span class="text-sm text-gray-500">剩余时间</span>
    <span class="font-mono font-semibold" :class="isUrgent ? 'text-red-600' : 'text-gray-700'">
      {{ displayTime }}
    </span>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  timeLimit: number // 分钟
}>()

const emit = defineEmits<{
  timeUp: []
}>()

const remaining = ref(props.timeLimit * 60)
let interval: ReturnType<typeof setInterval> | null = null

const isUrgent = computed(() => remaining.value <= 300) // 最后5分钟

const displayTime = computed(() => {
  const m = Math.floor(remaining.value / 60)
  const s = remaining.value % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
})

onMounted(() => {
  interval = setInterval(() => {
    remaining.value--
    if (remaining.value <= 0) {
      if (interval) clearInterval(interval)
      emit('timeUp')
    }
  }, 1000)
})

onBeforeUnmount(() => {
  if (interval) clearInterval(interval)
})
</script>
