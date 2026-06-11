<template>
  <div>
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <UInput v-model="filters.keyword" placeholder="搜索系列名称..." icon="i-heroicons-magnifying-glass" class="w-64" @update:model-value="debouncedLoad" />
      <USelect v-model="filters.category_id" :options="categoryOptions" placeholder="分类筛选" class="w-36" @change="loadSeries(1)" />
      <USelect v-model="filters.status" :options="statusOptions" placeholder="状态" class="w-28" @change="loadSeries(1)" />
      <div class="flex-1" />
      <UButton icon="i-heroicons-plus" label="添加系列" @click="openModal()" />
    </div>

    <UCard>
      <UTable :rows="seriesList" :columns="columns" :loading="loading">
        <template #category-data="{ row }">
          <span class="text-xs text-gray-500">{{ row.category?.name ?? '-' }}</span>
        </template>
        <template #courses_count-data="{ row }">
          <UBadge :label="`${row.courses_count} 集`" color="primary" variant="subtle" />
        </template>
        <template #status-data="{ row }">
          <UBadge :label="statusLabel(row.status)" :color="statusColor(row.status)" variant="subtle" />
        </template>
        <template #actions-data="{ row }">
          <div class="flex items-center gap-1">
            <UButton color="gray" variant="ghost" icon="i-heroicons-pencil" size="xs" @click="openModal(row)" />
            <UButton v-if="row.status === 'draft'" color="green" variant="ghost" size="xs" label="发布" @click="updateStatus(row, 'published')" />
            <UButton v-if="row.status === 'published'" color="orange" variant="ghost" size="xs" label="取消发布" @click="updateStatus(row, 'draft')" />
            <UButton color="red" variant="ghost" icon="i-heroicons-trash" size="xs" @click="handleDelete(row)" />
          </div>
        </template>
      </UTable>
      <template #footer>
        <div class="flex justify-end">
          <UPagination v-model="currentPage" :total="total" :page-count="perPage" @update:model-value="loadSeries" />
        </div>
      </template>
    </UCard>

    <!-- 创建/编辑弹窗 -->
    <UModal v-model="showModal">
      <UCard>
        <template #header>
          <h3 class="text-base font-semibold">{{ editing ? '编辑系列' : '添加系列' }}</h3>
        </template>
        <UForm :state="form" class="space-y-4">
          <UFormGroup label="系列名称" required>
            <UInput v-model="form.name" placeholder="如：产品知识培训" />
          </UFormGroup>
          <UFormGroup label="所属分类" required>
            <USelect v-model="form.category_id" :options="categoryOptions.filter(o => o.value)" placeholder="选择分类" />
          </UFormGroup>
          <UFormGroup label="系列简介">
            <UTextarea v-model="form.description" placeholder="系列简介" :rows="3" />
          </UFormGroup>
          <UFormGroup label="封面图" description="上传本地图片或输入图片 URL">
            <div v-if="form.cover_image" class="mb-2 flex items-center gap-3">
              <img :src="form.cover_image" alt="封面" class="w-16 h-12 rounded-lg object-cover border" />
              <UButton color="red" variant="ghost" icon="i-heroicons-x-mark" size="xs" label="移除" @click="form.cover_image = ''" />
            </div>
            <div v-else
              @click="triggerCoverUpload"
              @dragover.prevent
              @drop.prevent="handleCoverDrop"
              class="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-primary-400 transition-colors"
            >
              <UIcon name="i-heroicons-photo" class="w-6 h-6 text-gray-400 mx-auto mb-1" />
              <p class="text-xs text-gray-500">点击或拖拽上传封面图</p>
            </div>
            <input ref="coverInput" type="file" accept="image/*" class="hidden" @change="handleCoverSelect" />
            <UInput v-model="form.cover_image" placeholder="或输入图片 URL" class="mt-2" />
          </UFormGroup>
          <UFormGroup label="排序">
            <UInput v-model.number="form.sort_order" type="number" placeholder="0" />
          </UFormGroup>
        </UForm>
        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="gray" label="取消" @click="showModal = false" />
            <UButton :label="editing ? '保存' : '创建'" :loading="saving" @click="handleSubmit" />
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

const seriesList = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const currentPage = ref(1)
const total = ref(0)
const perPage = 15
const showModal = ref(false)
const editing = ref<any>(null)
const filters = reactive({ keyword: '', category_id: '', status: '' })
const categoryOptions = ref<any[]>([])
const coverInput = ref<HTMLInputElement | null>(null)

const form = reactive({ name: '', description: '', category_id: '', cover_image: '', sort_order: 0 })

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: '课程主题' },
  { key: 'category', label: '课程分类' },
  { key: 'courses_count', label: '课程数' },
  { key: 'status', label: '状态' },
  { key: 'sort_order', label: '排序' },
  { key: 'actions', label: '操作' },
]

const statusOptions = [{ label: '全部', value: '' }, { label: '草稿', value: 'draft' }, { label: '已发布', value: 'published' }]
const statusLabel = (s: string) => ({ draft: '草稿', published: '已发布' }[s] ?? s)
const statusColor = (s: string) => ({ draft: 'gray', published: 'green' }[s] ?? 'gray')

let searchTimeout: ReturnType<typeof setTimeout>
const debouncedLoad = () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => loadSeries(1), 300) }

const loadSeries = async (page = 1) => {
  loading.value = true
  try {
    const params: any = { page, per_page: perPage }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.category_id) params.category_id = filters.category_id
    if (filters.status) params.status = filters.status
    const res = await api.get<any>('/admin/series', params)
    seriesList.value = res.data.data
    total.value = res.data.total
    currentPage.value = res.data.current_page
  } catch (e) { console.error(e) }
  loading.value = false
}

const loadCategories = async () => {
  try {
    const res = await api.get<any>('/admin/categories')
    categoryOptions.value = [{ label: '全部', value: '' }, ...res.data.map((c: any) => ({ label: c.name, value: c.id }))]
  } catch {}
}

const openModal = (s?: any) => {
  editing.value = s || null
  if (s) {
    Object.assign(form, { name: s.name, description: s.description || '', category_id: s.category_id, cover_image: s.cover_image || '', sort_order: s.sort_order || 0 })
  } else {
    Object.assign(form, { name: '', description: '', category_id: '', cover_image: '', sort_order: 0 })
  }
  loadCategories()
  showModal.value = true
}

const triggerCoverUpload = () => { coverInput.value?.click() }

const handleCoverDrop = (e: DragEvent) => {
  const files = e.dataTransfer?.files
  if (files?.length) uploadCover(files[0])
}

const handleCoverSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files?.length) uploadCover(input.files[0])
}

const uploadCover = async (file: File) => {
  if (!file.type.startsWith('image/')) {
    toast.add({ title: '请选择图片文件', color: 'red' })
    return
  }
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'document')
    const res = await api.apiFetch<any>('/admin/upload/file', {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': undefined },
    })
    form.cover_image = res.data.url
    toast.add({ title: '封面图上传成功', color: 'green' })
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '上传失败', color: 'red' })
  }
}

const handleSubmit = async () => {
  saving.value = true
  try {
    if (editing.value) {
      await api.put(`/admin/series/${editing.value.id}`, form)
      toast.add({ title: '系列已更新', color: 'green' })
    } else {
      await api.post('/admin/series', form)
      toast.add({ title: '系列创建成功', color: 'green' })
    }
    showModal.value = false
    await loadSeries(currentPage.value)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '操作失败', color: 'red' })
  }
  saving.value = false
}

const updateStatus = async (s: any, status: string) => {
  try {
    await api.put(`/admin/series/${s.id}/status`, { status })
    toast.add({ title: '状态已更新', color: 'green' })
    await loadSeries(currentPage.value)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '操作失败', color: 'red' })
  }
}

const handleDelete = async (s: any) => {
  try {
    await api.del(`/admin/series/${s.id}`)
    toast.add({ title: '系列已删除', color: 'green' })
    await loadSeries(currentPage.value)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '删除失败', color: 'red' })
  }
}

onMounted(() => { loadSeries(); loadCategories() })
</script>
