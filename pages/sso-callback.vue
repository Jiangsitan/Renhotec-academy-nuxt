<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
    <div class="text-center">
      <div v-if="error" class="space-y-4">
        <UIcon name="i-heroicons-x-circle" class="w-12 h-12 text-red-500 mx-auto" />
        <p class="text-red-600">{{ error }}</p>
        <UButton label="返回登录" to="/login" />
      </div>
      <div v-else class="space-y-4">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-primary-500 mx-auto animate-spin" />
        <p class="text-gray-500">正在完成登录...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const error = ref('')

onMounted(async () => {
  const token = route.query.token as string

  if (!token) {
    error.value = '缺少登录凭证'
    return
  }

  try {
    // 存储 token
    authStore.setToken(token)

    // 获取用户信息
    const config = useRuntimeConfig()
    const baseURL = (config.public.apiBase as string) || '/api'
    const response = await $fetch<{ data: any }>(`${baseURL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    authStore.setUser(response.data)

    // 跳转到首页
    router.push('/')
  } catch (e: any) {
    authStore.clear()
    error.value = '登录失败，请重试'
  }
})
</script>
