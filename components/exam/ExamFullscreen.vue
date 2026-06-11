<template>
  <!-- 全屏提示 -->
  <div v-if="!isFullscreen" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
    <div class="bg-white rounded-2xl p-8 max-w-md text-center">
      <UIcon name="i-heroicons-arrows-pointing-out" class="w-16 h-16 text-primary-500 mx-auto mb-4" />
      <h2 class="text-xl font-bold mb-2">需要全屏模式</h2>
      <p class="text-gray-500 mb-6">考试必须在全屏模式下进行，以确保考试安全</p>
      <UButton label="进入全屏" size="lg" @click="$emit('enter-fullscreen')" />
    </div>
  </div>

  <!-- 警告提示 -->
  <Transition name="slide-down">
    <div v-if="showWarning" class="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
      <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5" />
      <span class="text-sm font-medium">{{ warningMessage }}</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  isFullscreen: boolean
  showWarning: boolean
  warningMessage: string
}>()

defineEmits<{
  'enter-fullscreen': []
}>()
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}
</style>
