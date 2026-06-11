<template>
  <div class="flex gap-3">
    <!-- 头像 -->
    <div class="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-medium text-sm shrink-0">
      {{ comment.user?.name?.charAt(0) }}
    </div>

    <div class="flex-1 min-w-0">
      <!-- 用户信息 -->
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-gray-900">{{ comment.user?.name }}</span>
        <span class="text-xs text-gray-400">{{ formatDate(comment.created_at) }}</span>
        <span v-if="isEdited" class="text-xs text-gray-400">(已编辑)</span>
      </div>

      <!-- 编辑模式 -->
      <div v-if="editing" class="mt-2">
        <UTextarea v-model="editContent" :rows="3" />
        <div class="flex gap-2 mt-2">
          <UButton size="xs" label="保存" :loading="saving" @click="saveEdit" />
          <UButton size="xs" color="gray" label="取消" @click="editing = false" />
        </div>
      </div>

      <!-- 显示模式 -->
      <p v-else class="text-sm text-gray-700 mt-1 break-words" v-html="highlightMentions(comment.content)" />

      <!-- 操作栏 -->
      <div class="flex items-center gap-4 mt-2">
        <button
          @click="$emit('like', comment)"
          class="flex items-center gap-1 text-xs transition-colors"
          :class="comment.is_liked ? 'text-primary-600' : 'text-gray-400 hover:text-primary-600'"
        >
          <UIcon :name="comment.is_liked ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'" class="w-4 h-4" />
          <span v-if="comment.likes_count > 0">{{ comment.likes_count }}</span>
        </button>
        <button @click="$emit('reply', comment)" class="text-xs text-gray-400 hover:text-primary-600 transition-colors">
          回复
        </button>
        <button v-if="isOwner" @click="startEdit" class="text-xs text-gray-400 hover:text-primary-600 transition-colors">
          编辑
        </button>
        <button v-if="isOwner || isAdmin" @click="$emit('delete', comment)" class="text-xs text-gray-400 hover:text-red-600 transition-colors">
          删除
        </button>
      </div>

      <!-- 回复列表 -->
      <div v-if="comment.replies?.length" class="mt-3 space-y-3 pl-3 border-l-2 border-gray-100">
        <CommentItem
          v-for="reply in comment.replies"
          :key="reply.id"
          :comment="reply"
          :current-user-id="currentUserId"
          :is-admin="isAdmin"
          @reply="$emit('reply', $event)"
          @like="$emit('like', $event)"
          @edit="$emit('edit', $event)"
          @delete="$emit('delete', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  comment: any
  currentUserId?: number
  isAdmin?: boolean
}>()

const emit = defineEmits<{
  reply: [comment: any]
  like: [comment: any]
  edit: [comment: any]
  delete: [comment: any]
}>()

const api = useApi()
const toast = useToast()

const editing = ref(false)
const editContent = ref('')
const saving = ref(false)

const isOwner = computed(() => props.currentUserId === props.comment.user_id)
const isEdited = computed(() => {
  if (!props.comment.updated_at || !props.comment.created_at) return false
  return props.comment.updated_at !== props.comment.created_at
})

const formatDate = (date: string) => {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000

  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`
  return d.toLocaleDateString('zh-CN')
}

const highlightMentions = (content: string) => {
  if (!content) return ''
  return content.replace(/@(\S+)/g, '<span class="text-primary-600 font-medium">@$1</span>')
}

const startEdit = () => {
  editContent.value = props.comment.content
  editing.value = true
}

const saveEdit = async () => {
  if (!editContent.value.trim()) return
  saving.value = true
  try {
    const res = await api.put<any>(`/comments/${props.comment.id}`, { content: editContent.value })
    props.comment.content = editContent.value
    props.comment.updated_at = new Date().toISOString()
    editing.value = false
    toast.add({ title: '评论已更新', color: 'green' })
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '更新失败', color: 'red' })
  }
  saving.value = false
}
</script>
