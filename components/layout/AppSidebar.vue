<template>
  <aside class="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 flex flex-col z-40">
    <div class="h-14 flex items-center px-6 border-b border-gray-100">
      <NuxtLink to="/" class="flex items-center gap-2">
        <div class="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center overflow-hidden">
          <img v-if="settingsStore.system_logo" :src="settingsStore.system_logo" alt="Logo" class="w-full h-full object-contain" />
          <UIcon v-else name="i-heroicons-academic-cap" class="w-4 h-4 text-white" />
        </div>
        <span class="text-base font-bold text-gray-900">{{ settingsStore.system_name }}</span>
      </NuxtLink>
    </div>

    <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
      <NuxtLink
        v-for="item in menuItems"
        :key="item.path"
        :to="item.path"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
        :class="isActive(item.path) ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'"
      >
        <UIcon :name="item.icon" class="w-5 h-5" />
        <span>{{ item.label }}</span>
      </NuxtLink>

      <div v-if="isAdmin" class="pt-3 mt-3 border-t border-gray-100">
        <NuxtLink
          to="/admin"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-primary-600 hover:bg-primary-50 transition-colors"
        >
          <UIcon name="i-heroicons-cog-6-tooth" class="w-5 h-5" />
          <span>管理后台</span>
        </NuxtLink>
      </div>
    </nav>

    <div class="p-4 border-t border-gray-100">
      <div class="flex items-center gap-3 px-3 py-2">
        <NotificationBell />
        <div class="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-medium text-sm">
          {{ authStore.user?.name?.charAt(0) }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-gray-900 truncate">{{ authStore.user?.name }}</div>
          <div class="text-xs text-gray-500">{{ roleLabel }}</div>
        </div>
        <UButton
          color="gray"
          variant="ghost"
          icon="i-heroicons-arrow-right-on-rectangle"
          size="xs"
          @click="handleLogout"
        />
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import NotificationBell from './NotificationBell.vue'

const route = useRoute()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const isAdmin = computed(() => authStore.user?.role === 'admin')
const roleLabel = computed(() => {
  const map: Record<string, string> = { admin: '管理员', mentor: '导师', student: '学员' }
  return map[authStore.user?.role ?? ''] ?? ''
})

const menuItems = computed(() => {
  const items = [
    { path: '/', label: '课程中心', icon: 'i-heroicons-book-open' },
    { path: '/exam', label: '考试中心', icon: 'i-heroicons-clipboard-document-check' },
    { path: '/my-exams', label: '我的考试', icon: 'i-heroicons-document-check' },
  ]
  if (authStore.user?.role === 'mentor' || authStore.user?.role === 'admin') {
    items.push({ path: '/mentor/pending', label: '审批管理', icon: 'i-heroicons-pencil-square' })
  }
  return items
})

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

onMounted(() => {
  settingsStore.fetchSettings()
})

const handleLogout = async () => {
  const api = useApi()
  try { await api.post('/logout') } catch {}
  authStore.clear()
  navigateTo('/login')
}
</script>
