<template>
  <div>
    <!-- 评论输入框 -->
    <CommentForm
      :series-id="seriesId"
      :mention-users="mentionUsers"
      @submitted="loadComments"
    />

    <!-- 评论列表 -->
    <div v-if="comments.length > 0" class="space-y-4">
      <CommentItem
        v-for="comment in comments"
        :key="comment.id"
        :comment="comment"
        :current-user-id="authStore.user?.id"
        :is-admin="authStore.user?.role === 'admin'"
        @reply="handleReply"
        @like="handleLike"
        @edit="handleEdit"
        @delete="handleDelete"
      />
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading" class="text-center py-12">
      <UIcon name="i-heroicons-chat-bubble-left-right" class="w-12 h-12 text-gray-300 mx-auto" />
      <p class="text-sm text-gray-500 mt-3">暂无评论，来发表第一条吧</p>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="text-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 text-gray-300 animate-spin mx-auto" />
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="mt-6 flex justify-center">
      <UPagination v-model="currentPage" :total="total" :page-count="perPage" @update:model-value="loadComments" />
    </div>

    <!-- 回复弹窗 -->
    <UModal v-model="showReplyModal">
      <UCard>
        <template #header>
          <h3 class="text-base font-semibold">回复 {{ replyingTo?.user?.name }}</h3>
        </template>
        <UTextarea v-model="replyContent" placeholder="输入回复内容..." :rows="4" />
        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="gray" label="取消" @click="showReplyModal = false" />
            <UButton label="回复" :loading="replying" :disabled="!replyContent.trim()" @click="submitReply" />
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import CommentItem from './CommentItem.vue'
import CommentForm from './CommentForm.vue'

const props = defineProps<{
  seriesId: number
}>()

const api = useApi()
const authStore = useAuthStore()
const toast = useToast()

const comments = ref<any[]>([])
const mentionUsers = ref<any[]>([])
const loading = ref(true)
const currentPage = ref(1)
const total = ref(0)
const totalPages = ref(1)
const perPage = 20

// 回复相关
const showReplyModal = ref(false)
const replyingTo = ref<any>(null)
const replyContent = ref('')
const replying = ref(false)

const loadComments = async (page = 1) => {
  loading.value = true
  try {
    const res = await api.get<any>(`/series/${props.seriesId}/comments`, { page, per_page: perPage })
    comments.value = res.data.data
    total.value = res.data.total
    currentPage.value = res.data.current_page
    totalPages.value = res.data.last_page
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '加载评论失败', color: 'red' })
  }
  loading.value = false
}

const loadMentionUsers = async () => {
  try {
    const res = await api.get<any>(`/series/${props.seriesId}/mention-users`)
    mentionUsers.value = res.data || []
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '加载用户列表失败', color: 'red' })
  }
}

const handleReply = (comment: any) => {
  replyingTo.value = comment
  replyContent.value = ''
  showReplyModal.value = true
}

const submitReply = async () => {
  if (!replyContent.value.trim() || !replyingTo.value) return
  replying.value = true
  try {
    await api.post(`/series/${props.seriesId}/comments`, {
      content: replyContent.value,
      parent_id: replyingTo.value.id,
    })
    showReplyModal.value = false
    toast.add({ title: '回复成功', color: 'green' })
    await loadComments(currentPage.value)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '回复失败', color: 'red' })
  }
  replying.value = false
}

const handleLike = async (comment: any) => {
  try {
    const res = await api.post<any>(`/comments/${comment.id}/like`)
    comment.is_liked = res.data.liked
    comment.likes_count = res.data.likes_count
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '操作失败', color: 'red' })
  }
}

const handleEdit = async (comment: any) => {
  // CommentItem handles inline editing
}

const handleDelete = async (comment: any) => {
  if (!confirm('确定要删除这条评论吗？')) return
  try {
    await api.del(`/comments/${comment.id}`)
    toast.add({ title: '评论已删除', color: 'green' })
    await loadComments(currentPage.value)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '删除失败', color: 'red' })
  }
}

onMounted(() => {
  loadComments()
  loadMentionUsers()
})
</script>
