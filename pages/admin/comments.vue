<template>
  <div>
    <!-- 搜索和筛选 -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <UInput v-model="filters.keyword" placeholder="搜索评论内容..." icon="i-heroicons-magnifying-glass" class="w-64" @update:model-value="debouncedLoad" />
      <USelect v-model="filters.series_id" :options="seriesOptions" placeholder="系列筛选" class="w-48" @change="loadComments(1)" />
      <div class="flex-1" />
    </div>

    <!-- 评论列表 -->
    <UCard>
      <UTable :rows="comments" :columns="columns" :loading="loading">
        <template #content-data="{ row }">
          <div class="max-w-xs">
            <p class="text-sm text-gray-900 truncate">{{ row.content }}</p>
            <p v-if="row.parent" class="text-xs text-gray-400 mt-1">回复: {{ row.parent.content?.substring(0, 50) }}...</p>
          </div>
        </template>
        <template #user-data="{ row }">
          <div>
            <div class="text-sm font-medium text-gray-900">{{ row.user?.name }}</div>
            <div class="text-xs text-gray-500">{{ row.user?.employee_no }}</div>
          </div>
        </template>
        <template #series-data="{ row }">
          <span class="text-sm text-gray-700">{{ row.series?.name }}</span>
        </template>
        <template #likes_count-data="{ row }">
          <span class="text-sm text-gray-700">{{ row.likes_count || 0 }}</span>
        </template>
        <template #created_at-data="{ row }">
          <span class="text-sm text-gray-500">{{ formatDate(row.created_at) }}</span>
        </template>
        <template #actions-data="{ row }">
          <div class="flex items-center gap-1">
            <UButton color="gray" variant="ghost" icon="i-heroicons-pencil" size="xs" @click="openEditModal(row)" />
            <UButton color="gray" variant="ghost" icon="i-heroicons-chat-bubble-left" size="xs" @click="openReplyModal(row)" />
            <UButton color="red" variant="ghost" icon="i-heroicons-trash" size="xs" @click="handleDelete(row)" />
          </div>
        </template>
      </UTable>

      <template #footer>
        <div class="flex justify-end">
          <UPagination v-model="currentPage" :total="total" :page-count="perPage" @update:model-value="loadComments" />
        </div>
      </template>
    </UCard>

    <!-- 编辑弹窗 -->
    <UModal v-model="showEditModal">
      <UCard>
        <template #header>
          <h3 class="text-base font-semibold">编辑评论</h3>
        </template>
        <UTextarea v-model="editContent" :rows="4" placeholder="评论内容" />
        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="gray" label="取消" @click="showEditModal = false" />
            <UButton label="保存" :loading="saving" @click="saveEdit" />
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- 回复弹窗 -->
    <UModal v-model="showReplyModal">
      <UCard>
        <template #header>
          <h3 class="text-base font-semibold">回复评论</h3>
        </template>
        <div v-if="replyingTo" class="mb-4 p-3 bg-gray-50 rounded-lg">
          <p class="text-sm text-gray-600">{{ replyingTo.user?.name }}: {{ replyingTo.content }}</p>
        </div>
        <UTextarea v-model="replyContent" :rows="4" placeholder="输入回复内容..." />
        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="gray" label="取消" @click="showReplyModal = false" />
            <UButton label="回复" :loading="replying" @click="submitReply" />
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

const api = useApi()
const toast = useToast()

const comments = ref<any[]>([])
const loading = ref(true)
const currentPage = ref(1)
const total = ref(0)
const perPage = 20
const seriesOptions = ref<any[]>([])

const filters = reactive({ keyword: '', series_id: '' })

// 编辑相关
const showEditModal = ref(false)
const editingComment = ref<any>(null)
const editContent = ref('')
const saving = ref(false)

// 回复相关
const showReplyModal = ref(false)
const replyingTo = ref<any>(null)
const replyContent = ref('')
const replying = ref(false)

const columns = [
  { key: 'content', label: '评论内容' },
  { key: 'user', label: '评论人' },
  { key: 'series', label: '关联系列' },
  { key: 'likes_count', label: '点赞数' },
  { key: 'created_at', label: '评论时间' },
  { key: 'actions', label: '操作' },
]

const formatDate = (d: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

let searchTimeout: ReturnType<typeof setTimeout>
const debouncedLoad = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => loadComments(1), 300)
}

const loadComments = async (page = 1) => {
  loading.value = true
  try {
    const params: any = { page, per_page: perPage }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.series_id) params.series_id = filters.series_id
    const res = await api.get<any>('/admin/comments', params)
    comments.value = res.data.data
    total.value = res.data.total
    currentPage.value = res.data.current_page
  } catch (e) { console.error(e) }
  loading.value = false
}

const loadSeriesOptions = async () => {
  try {
    const res = await api.get<any>('/admin/series', { per_page: 100 })
    seriesOptions.value = [{ label: '全部', value: '' }, ...res.data.data.map((s: any) => ({ label: s.name, value: s.id }))]
  } catch {}
}

const openEditModal = (comment: any) => {
  editingComment.value = comment
  editContent.value = comment.content
  showEditModal.value = true
}

const saveEdit = async () => {
  if (!editContent.value.trim()) return
  saving.value = true
  try {
    await api.put(`/admin/comments/${editingComment.value.id}`, { content: editContent.value })
    toast.add({ title: '评论已更新', color: 'green' })
    showEditModal.value = false
    await loadComments(currentPage.value)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '更新失败', color: 'red' })
  }
  saving.value = false
}

const openReplyModal = (comment: any) => {
  replyingTo.value = comment
  replyContent.value = ''
  showReplyModal.value = true
}

const submitReply = async () => {
  if (!replyContent.value.trim()) return
  replying.value = true
  try {
    await api.post(`/admin/comments/${replyingTo.value.id}/reply`, { content: replyContent.value })
    toast.add({ title: '回复成功', color: 'green' })
    showReplyModal.value = false
    await loadComments(currentPage.value)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '回复失败', color: 'red' })
  }
  replying.value = false
}

const handleDelete = async (comment: any) => {
  if (!confirm('确定要删除这条评论吗？')) return
  try {
    await api.del(`/admin/comments/${comment.id}`)
    toast.add({ title: '评论已删除', color: 'green' })
    await loadComments(currentPage.value)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '删除失败', color: 'red' })
  }
}

onMounted(() => {
  loadComments()
  loadSeriesOptions()
})
</script>
