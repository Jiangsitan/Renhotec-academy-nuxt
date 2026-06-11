<template>
  <div class="relative mb-6">
    <div class="flex gap-3">
      <!-- 用户头像 -->
      <div class="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-medium text-sm shrink-0">
        {{ authStore.user?.name?.charAt(0) }}
      </div>

      <div class="flex-1 relative">
        <!-- 输入框 -->
        <UTextarea
          v-model="content"
          placeholder="发表评论... 输入 @ 提及他人"
          :rows="3"
          @input="handleInput"
        />

        <!-- @提及下拉列表 -->
        <div
          v-if="showMentions && filteredUsers.length > 0"
          class="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto"
        >
          <div
            v-for="user in filteredUsers"
            :key="user.id"
            @click="selectMention(user)"
            class="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm flex items-center gap-2"
          >
            <div class="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-xs">
              {{ user.name?.charAt(0) }}
            </div>
            <span>{{ user.name }}</span>
            <span class="text-xs text-gray-400">{{ user.employee_no }}</span>
          </div>
        </div>

        <!-- 提交按钮 -->
        <div class="flex justify-between items-center mt-2">
          <span class="text-xs text-gray-400">Ctrl + Enter 发送</span>
          <UButton
            label="发表评论"
            :loading="submitting"
            :disabled="!content.trim()"
            @click="submit"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  seriesId: number
  mentionUsers: any[]
}>()

const emit = defineEmits<{
  submitted: []
}>()

const api = useApi()
const authStore = useAuthStore()
const toast = useToast()

const content = ref('')
const submitting = ref(false)
const showMentions = ref(false)
const mentionQuery = ref('')

const filteredUsers = computed(() => {
  if (!mentionQuery.value) return props.mentionUsers
  const q = mentionQuery.value.toLowerCase()
  return props.mentionUsers.filter(
    u => u.name?.toLowerCase().includes(q) || u.employee_no?.toLowerCase().includes(q)
  )
})

const handleInput = (e: Event) => {
  const val = content.value
  const lastAt = val.lastIndexOf('@')
  if (lastAt >= 0 && lastAt === val.length - 1 || (lastAt >= 0 && !val.substring(lastAt).includes(' '))) {
    mentionQuery.value = val.substring(lastAt + 1)
    showMentions.value = true
  } else {
    showMentions.value = false
    mentionQuery.value = ''
  }
}

const selectMention = (user: any) => {
  const lastAt = content.value.lastIndexOf('@')
  content.value = content.value.substring(0, lastAt) + '@' + user.name + ' '
  showMentions.value = false
  mentionQuery.value = ''
}

const submit = async () => {
  if (!content.value.trim()) return
  submitting.value = true
  try {
    await api.post(`/series/${props.seriesId}/comments`, { content: content.value })
    content.value = ''
    toast.add({ title: '评论发表成功', color: 'green' })
    emit('submitted')
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '发表失败', color: 'red' })
  }
  submitting.value = false
}

// Ctrl + Enter 快捷键
const handleKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    submit()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>
