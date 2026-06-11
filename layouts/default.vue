<template>
  <div class="min-h-screen bg-white flex flex-col lg:flex-row">
    <!-- PC 端侧边栏 -->
    <AppSidebar class="hidden lg:flex" />

    <!-- 移动端顶部导航 -->
    <AppHeader class="lg:hidden" />

    <!-- 主内容区 -->
    <main class="flex-1 lg:ml-64 pt-14 lg:pt-0 pb-16 lg:pb-0">
      <div class="p-4 lg:p-5">
        <slot />
      </div>
    </main>

    <!-- 移动端底部导航 -->
    <AppBottomNav class="lg:hidden" />
  </div>
</template>

<script setup lang="ts">
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
</script>
