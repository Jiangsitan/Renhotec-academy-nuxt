<template>
  <div>
    <div class="flex items-center gap-3 mb-4">
      <div class="flex-1" />
      <UButton icon="i-heroicons-plus" label="添加分类" @click="openModal()" />
    </div>

    <UCard>
      <UTable :rows="categories" :columns="columns" :loading="loading">
        <template #parent-data="{ row }">
          <span v-if="row.parent" class="text-xs text-gray-500">{{ row.parent.name }}</span>
          <span v-else class="text-xs text-gray-400">—</span>
        </template>
        <template #children_count-data="{ row }">
          <UBadge :label="`${row.children_count ?? 0} 个子分类`" color="primary" variant="subtle" size="xs" />
        </template>
        <template #series_count-data="{ row }">
          <UBadge :label="`${row.series_count ?? 0} 个系列`" color="gray" variant="subtle" size="xs" />
        </template>
        <template #actions-data="{ row }">
          <div class="flex items-center gap-1">
            <UButton color="gray" variant="ghost" icon="i-heroicons-pencil" size="xs" @click="openModal(row)" />
            <UButton v-if="!row.parent_id && row.children_count > 0" color="gray" variant="ghost" icon="i-heroicons-bars-arrow-up" size="xs" label="排序" @click="openSortModal(row)" />
            <UButton color="red" variant="ghost" icon="i-heroicons-trash" size="xs" @click="handleDelete(row)" />
          </div>
        </template>
      </UTable>
    </UCard>

    <!-- 添加/编辑弹窗 -->
    <UModal v-model="showModal">
      <UCard>
        <template #header>
          <h3 class="text-base font-semibold">{{ editing ? '编辑分类' : '添加分类' }}</h3>
        </template>
        <UForm :state="form" class="space-y-4">
          <UFormGroup label="分类名称" required>
            <UInput v-model="form.name" placeholder="如：通识培训、新员工入职" />
          </UFormGroup>
          <UFormGroup label="父级分类" description="留空则为一级分类">
            <USelect v-model="form.parent_id" :options="parentOptions" placeholder="选择父分类（可选）" />
          </UFormGroup>
          <UFormGroup label="排序" description="数字越小越靠前">
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

    <!-- 排序弹窗 -->
    <UModal v-model="showSortModal" :prevent-close="sortSaving">
      <UCard class="max-w-xl">
        <template #header>
          <h3 class="text-base font-semibold">子分类排序 — {{ sortParentName }}</h3>
        </template>
        <p class="text-xs text-gray-500 mb-4">拖拽行或点击按钮调整子分类顺序，排序结果将在用户端生效</p>

        <div v-if="sortItems.length === 0" class="text-center py-8 text-sm text-gray-400">该分类暂无子分类</div>
        <div v-else class="space-y-1">
          <div
            v-for="(item, idx) in sortItems"
            :key="item.id"
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
            <span class="flex-1 text-sm truncate">{{ item.name }}</span>
            <div class="flex items-center gap-0.5 shrink-0">
              <UButton color="gray" variant="ghost" icon="i-heroicons-chevron-up" size="xs" :disabled="idx === 0" @click="moveSortItem(idx, -1)" />
              <UButton color="gray" variant="ghost" icon="i-heroicons-chevron-down" size="xs" :disabled="idx === sortItems.length - 1" @click="moveSortItem(idx, 1)" />
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="gray" label="取消" @click="closeSortModal" />
            <UButton label="保存排序" :loading="sortSaving" :disabled="sortItems.length === 0" @click="saveSortOrder" />
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

const categories = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const showModal = ref(false)
const editing = ref<any>(null)
const parentOptions = ref<any[]>([])

const form = reactive({ name: '', parent_id: '', sort_order: 0 })

// 排序弹窗状态
const showSortModal = ref(false)
const sortSaving = ref(false)
const sortParentId = ref<number | null>(null)
const sortParentName = ref('')
const sortItems = ref<any[]>([])
const sortDragIdx = ref<number | null>(null)
const sortDragOverIdx = ref<number | null>(null)

const columns = [
  { key: 'name', label: '分类名称' },
  { key: 'parent', label: '父级分类' },
  { key: 'children_count', label: '子分类数' },
  { key: 'series_count', label: '关联系列' },
  { key: 'sort_order', label: '排序' },
  { key: 'actions', label: '操作' },
]

const loadCategories = async () => {
  loading.value = true
  try {
    const res = await api.get<any>('/admin/categories')
    categories.value = res.data
    // 只有一级分类可以作为父级
    parentOptions.value = [
      { label: '无（一级分类）', value: '' },
      ...res.data.filter((c: any) => !c.parent_id).map((c: any) => ({ label: c.name, value: c.id })),
    ]
  } catch (e) { console.error(e) }
  loading.value = false
}

const openModal = (cat?: any) => {
  editing.value = cat || null
  if (cat) {
    Object.assign(form, { name: cat.name, parent_id: cat.parent_id || '', sort_order: cat.sort_order || 0 })
  } else {
    Object.assign(form, { name: '', parent_id: '', sort_order: 0 })
  }
  showModal.value = true
}

const handleSubmit = async () => {
  if (!form.name) {
    toast.add({ title: '请输入分类名称', color: 'red' })
    return
  }
  saving.value = true
  try {
    if (editing.value) {
      await api.put(`/admin/categories/${editing.value.id}`, form)
      toast.add({ title: '分类已更新', color: 'green' })
    } else {
      await api.post('/admin/categories', form)
      toast.add({ title: '分类创建成功', color: 'green' })
    }
    showModal.value = false
    await loadCategories()
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '操作失败', color: 'red' })
  }
  saving.value = false
}

const handleDelete = async (cat: any) => {
  if (cat.children_count > 0) {
    toast.add({ title: '该分类下存在子分类，无法删除', color: 'red' })
    return
  }
  if (cat.series_count > 0) {
    toast.add({ title: '该分类下存在系列，无法删除', color: 'red' })
    return
  }
  try {
    await api.del(`/admin/categories/${cat.id}`)
    toast.add({ title: '分类已删除', color: 'green' })
    await loadCategories()
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '删除失败', color: 'red' })
  }
}

// ==================== 排序逻辑 ====================

const openSortModal = (parent: any) => {
  sortParentId.value = parent.id
  sortParentName.value = parent.name
  const parentCat = categories.value.find(c => c.id === parent.id)
  sortItems.value = (parentCat?.children || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    sort_order: c.sort_order,
  }))
  sortDragIdx.value = null
  sortDragOverIdx.value = null
  showSortModal.value = true
}

const closeSortModal = () => {
  showSortModal.value = false
  sortParentId.value = null
  sortParentName.value = ''
  sortItems.value = []
  sortDragIdx.value = null
  sortDragOverIdx.value = null
}

const moveSortItem = (idx: number, dir: number) => {
  const target = idx + dir
  if (target < 0 || target >= sortItems.value.length) return
  const arr = sortItems.value
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
    const arr = sortItems.value
    const [moved] = arr.splice(sortDragIdx.value, 1)
    arr.splice(sortDragOverIdx.value, 0, moved)
  }
  sortDragIdx.value = null
  sortDragOverIdx.value = null
}

const saveSortOrder = async () => {
  sortSaving.value = true
  try {
    const orders = sortItems.value.map((item, idx) => ({ id: item.id, sort_order: idx }))
    await api.put('/admin/categories/reorder', { orders })
    toast.add({ title: '排序已更新', color: 'green' })
    closeSortModal()
    await loadCategories()
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '保存失败', color: 'red' })
  }
  sortSaving.value = false
}

onMounted(loadCategories)
</script>
