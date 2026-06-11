<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 overflow-hidden">
          <img v-if="settingsStore.system_logo" :src="settingsStore.system_logo" alt="Logo" class="w-full h-full object-contain" />
          <UIcon v-else name="i-heroicons-academic-cap" class="w-10 h-10 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-gray-900">{{ settingsStore.system_name || 'Renhotec Academy' }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ settingsStore.system_subtitle || '员工培训与考试系统' }}</p>
      </div>

      <UCard>
        <UForm :state="form" @submit="handleLogin" class="space-y-4">
          <UFormGroup label="工号" required>
            <UInput v-model="form.employee_no" placeholder="请输入工号" icon="i-heroicons-user" size="lg" />
          </UFormGroup>

          <UFormGroup label="密码" required>
            <UInput v-model="form.password" type="password" placeholder="请输入密码" icon="i-heroicons-lock-closed" size="lg" />
          </UFormGroup>

          <UAlert v-if="error" color="red" variant="soft" :description="error" />

          <UButton type="submit" label="登录" block size="lg" :loading="loading" />
        </UForm>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const auth = useAuth()
const router = useRouter()
const settingsStore = useSettingsStore()

onMounted(() => { settingsStore.fetchSettings() })

const form = reactive({ employee_no: '', password: '' })
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    await auth.login(form.employee_no, form.password)
    router.push('/')
  } catch (e: any) {
    error.value = e?.data?.message || e?.data?.errors?.employee_no?.[0] || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>
