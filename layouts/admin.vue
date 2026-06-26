<template>
  <div class="min-h-screen bg-white">
    <!-- 侧边栏 -->
    <aside class="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col">
      <!-- Logo -->
      <div class="h-16 flex items-center px-6 border-b border-gray-100">
        <NuxtLink to="/admin" class="flex items-center gap-3">
          <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center overflow-hidden">
            <img v-if="settingsStore.system_logo" :src="settingsStore.system_logo" alt="Logo" class="w-full h-full object-contain" />
            <UIcon v-else name="i-heroicons-academic-cap" class="w-5 h-5 text-white" />
          </div>
          <div>
            <div class="text-sm font-bold text-gray-900">{{ settingsStore.system_name }}</div>
            <div class="text-xs text-gray-500">管理后台</div>
          </div>
        </NuxtLink>
      </div>

      <!-- 导航菜单 -->
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
          <span v-if="item.badge" class="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
            {{ item.badge }}
          </span>
        </NuxtLink>
      </nav>

      <!-- 用户信息 -->
      <div class="p-4 border-t border-gray-100">
        <div class="flex items-center gap-3 px-3 py-2">
          <div class="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-medium text-sm">
            {{ auth.user?.name?.charAt(0) }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-900 truncate">{{ auth.user?.name }}</div>
            <div class="text-xs text-gray-500">管理员</div>
          </div>
          <UButton
            color="gray"
            variant="ghost"
            icon="i-heroicons-arrow-right-on-rectangle"
            size="xs"
            @click="auth.logout()"
          />
        </div>
        <NuxtLink to="/" class="mt-2 flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-primary-600 rounded-lg hover:bg-gray-50">
          <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
          返回前台
        </NuxtLink>
      </div>
    </aside>

    <!-- 主内容区 -->
    <div class="ml-64">
      <!-- 顶部栏 -->
      <header class="sticky top-0 z-40 h-12 bg-white backdrop-blur border-b border-gray-200 flex items-center px-5">
        <div class="flex-1">
          <h1 class="text-base font-semibold text-gray-900">{{ pageTitle }}</h1>
        </div>
        <div class="flex items-center gap-3">
          <UBadge :label="`v1.0`" color="primary" variant="subtle" size="sm" />
        </div>
      </header>

      <!-- 页面内容 -->
      <main class="p-4 lg:p-5">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const auth = useAuth()
const api = useApi()
const settingsStore = useSettingsStore()

// 动态设置 favicon
useHead({
  link: [
    {
      rel: 'icon',
      type: 'image/svg+xml',
      href: computed(() => settingsStore.system_logo || '/favicon.svg'),
    },
  ],
})

const pendingReviews = ref(0)

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/admin': '仪表盘',
    '/admin/users': '用户管理',
    '/admin/mentor-bindings': '导师绑定',
    '/admin/categories': '课程分类',
    '/admin/series': '培训主题',
    '/admin/courses': '培训课程',
    '/admin/exams': '考试管理',
    '/admin/learning-progress': '学习进度',
    '/admin/comments': '评论管理',
    '/admin/pending-reviews': '待批改',
    '/admin/audit-logs': '审计日志',
    '/admin/settings': '系统设置',
  }
  return titles[route.path] || '管理后台'
})

const menuItems = computed(() => [
  { path: '/admin', label: '仪表盘', icon: 'i-heroicons-chart-bar' },
  { path: '/admin/users', label: '用户管理', icon: 'i-heroicons-users' },
  { path: '/admin/mentor-bindings', label: '导师绑定', icon: 'i-heroicons-user-group' },
  { path: '/admin/categories', label: '课程分类', icon: 'i-heroicons-tag' },
  { path: '/admin/series', label: '培训主题', icon: 'i-heroicons-circle-stack' },
  { path: '/admin/courses', label: '培训课程', icon: 'i-heroicons-book-open' },
  { path: '/admin/exams', label: '考试管理', icon: 'i-heroicons-clipboard-document-check' },
  { path: '/admin/learning-progress', label: '学习进度', icon: 'i-heroicons-academic-cap' },
  { path: '/admin/comments', label: '评论管理', icon: 'i-heroicons-chat-bubble-left-right' },
  { path: '/admin/pending-reviews', label: '考试记录', icon: 'i-heroicons-clipboard-document-check' },
  { path: '/admin/audit-logs', label: '审计日志', icon: 'i-heroicons-document-text' },
  { path: '/admin/settings', label: '系统设置', icon: 'i-heroicons-cog-6-tooth' },
])

const isActive = (path: string) => {
  if (path === '/admin') return route.path === '/admin'
  return route.path.startsWith(path)
}

onMounted(async () => {
  settingsStore.fetchSettings()
  try {
    const res = await api.get<any>('/admin/dashboard')
    pendingReviews.value = res.data.stats.pending_reviews
  } catch {}
})
</script>
