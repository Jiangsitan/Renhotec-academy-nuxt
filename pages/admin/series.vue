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
            <UButton color="gray" variant="ghost" icon="i-heroicons-bars-arrow-up" size="xs" label="排序" @click="openSortModal(row)" />
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
  <!-- 系列内课程排序弹窗 -->
  <UModal v-model="showSortModal" :prevent-close="sortSaving">
    <UCard class="max-w-xl">
      <template #header>
        <h3 class="text-base font-semibold">课程排序 — {{ sortSeries?.name }}</h3>
      </template>
      <p class="text-xs text-gray-500 mb-4">拖拽行或点击按钮调整课程顺序，排序结果将在用户端生效</p>
      <div v-if="sortCourses.length === 0" class="text-center py-8 text-sm text-gray-400">该系列暂无课程</div>
      <div v-else class="space-y-1">
        <div
          v-for="(course, idx) in sortCourses"
          :key="course.id"
          :draggable="true"
          @dragstart="onSortDragStart(idx)"
          @dragover.prevent="onSortDragOver(idx)"
          @dragend="onSortDragEnd"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-default"
          :class="sortDragOverIdx === idx ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-gray-300'"
        >
          <UIcon name="i-heroicons-bars-3" class="w-5 h-5 text-gray-400 cursor-grab shrink-0" />
          <span class="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
            :class="idx < 3 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'"
          >{{ idx + 1 }}</span>
          <span class="flex-1 text-sm truncate">{{ course.title }}</span>
          <div class="flex items-center gap-0.5 shrink-0">
            <UButton color="gray" variant="ghost" icon="i-heroicons-chevron-up" size="xs" :disabled="idx === 0" @click="moveSortCourse(idx, -1)" />
            <UButton color="gray" variant="ghost" icon="i-heroicons-chevron-down" size="xs" :disabled="idx === sortCourses.length - 1" @click="moveSortCourse(idx, 1)" />
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="gray" label="取消" @click="closeSortModal" />
          <UButton label="保存排序" :loading="sortSaving" :disabled="sortCourses.length === 0" @click="saveSortOrder" />
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

// 排序弹窗状态
const showSortModal = ref(false)
const sortSaving = ref(false)
const sortSeries = ref<any>(null)
const sortCourses = ref<any[]>([])
const sortDragIdx = ref<number | null>(null)
const sortDragOverIdx = ref<number | null>(null)

const openSortModal = async (series: any) => {
  sortSeries.value = series
  sortCourses.value = []
  showSortModal.value = true
  try {
    const res = await api.get<any>('/admin/courses', { series_id: series.id, per_page: 200 })
    sortCourses.value = res.data.data
  } catch {
    sortCourses.value = []
  }
}

const closeSortModal = () => {
  showSortModal.value = false
  sortSeries.value = null
  sortCourses.value = []
  sortDragIdx.value = null
  sortDragOverIdx.value = null
}

const moveSortCourse = (idx: number, dir: number) => {
  const target = idx + dir
  if (target < 0 || target >= sortCourses.value.length) return
  const arr = sortCourses.value
  ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
}

const onSortDragStart = (idx: number) => {
  sortDragIdx.value = idx
}

const onSortDragOver = (idx: number) => {
  sortDragOverIdx.value = idx
}

const onSortDragEnd = () => {
  if (sortDragIdx.value !== null && sortDragOverIdx.value !== null && sortDragIdx.value !== sortDragOverIdx.value) {
    const arr = sortCourses.value
    const [moved] = arr.splice(sortDragIdx.value, 1)
    arr.splice(sortDragOverIdx.value, 0, moved)
  }
  sortDragIdx.value = null
  sortDragOverIdx.value = null
}

const saveSortOrder = async () => {
  sortSaving.value = true
  try {
    const courseIds = sortCourses.value.map(c => c.id)
    await api.put(`/admin/series/${sortSeries.value.id}/courses/reorder`, { course_ids: courseIds })
    toast.add({ title: '排序已更新', color: 'green' })
    closeSortModal()
    await loadSeries(currentPage.value)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '保存失败', color: 'red' })
  }
  sortSaving.value = false
}

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
    const { upload } = useOssUpload()
    const result = await upload(file, 'cover')
    form.cover_image = result.url
    toast.add({ title: '封面图上传成功', color: 'green' })
  } catch (e: any) {
    toast.add({ title: e?.message || '上传失败', color: 'red' })
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
