<template>
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
    <div class="flex items-center justify-around h-16">
      <NuxtLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex flex-col items-center gap-0.5 px-3 py-1"
        :class="isActive(item.path) ? 'text-primary-600' : 'text-gray-400'"
      >
        <UIcon :name="item.icon" class="w-5 h-5" />
        <span class="text-[10px]">{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
const authStore = useAuthStore()

const navItems = computed(() => {
  const items = [
    { path: '/', label: '课程', icon: 'i-heroicons-book-open' },
    { path: '/exam', label: '考试', icon: 'i-heroicons-clipboard-document-check' },
    { path: '/my-exams', label: '成绩', icon: 'i-heroicons-document-check' },
  ]
  if (authStore.user?.role === 'mentor' || authStore.user?.role === 'admin') {
    items.push({ path: '/mentor/pending', label: '批改', icon: 'i-heroicons-pencil-square' })
  }
  if (authStore.user?.role === 'admin') {
    items.push({ path: '/admin', label: '管理', icon: 'i-heroicons-cog-6-tooth' })
  }
  return items
})

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>
