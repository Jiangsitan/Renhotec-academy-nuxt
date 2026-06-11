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

onMounted(loadCategories)
</script>
