<template>
  <header class="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-14 flex items-center px-4">
    <NuxtLink to="/" class="flex items-center gap-2">
      <div class="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center overflow-hidden">
        <img v-if="settingsStore.system_logo" :src="settingsStore.system_logo" alt="Logo" class="w-full h-full object-contain" />
        <UIcon v-else name="i-heroicons-academic-cap" class="w-4 h-4 text-white" />
      </div>
      <span class="text-base font-bold text-gray-900">{{ settingsStore.system_name }}</span>
    </NuxtLink>
    <div class="flex-1" />
    <div class="flex items-center gap-2">
      <NotificationBell />
      <UDropdown :items="userMenuItems">
        <UButton color="gray" variant="ghost" trailing-icon="i-heroicons-chevron-down" class="text-sm">
          {{ authStore.user?.name }}
        </UButton>
      </UDropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
import NotificationBell from './NotificationBell.vue'

const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const api = useApi()

const userMenuItems = computed(() => {
  const items: any[] = [
    [{ label: authStore.user?.name ?? '', slot: 'account', disabled: true }],
  ]
  if (authStore.user?.role === 'admin') {
    items.push([{ label: '管理后台', icon: 'i-heroicons-cog-6-tooth', click: () => navigateTo('/admin') }])
  }
  items.push([{ label: '退出登录', icon: 'i-heroicons-arrow-right-on-rectangle', click: handleLogout }])
  return items
})

const handleLogout = async () => {
  try { await api.post('/logout') } catch {}
  authStore.clear()
  navigateTo('/login')
}
</script>
