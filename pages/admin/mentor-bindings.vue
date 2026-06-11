<template>
  <div>
    <div class="flex items-center gap-3 mb-4">
      <UInput v-model="filters.keyword" placeholder="搜索导师或学员..." icon="i-heroicons-magnifying-glass" class="w-64" @update:model-value="debouncedLoad" />
      <div class="flex-1" />
      <UButton icon="i-heroicons-plus" label="新增绑定" @click="openCreateModal" />
    </div>

    <UCard>
      <UTable :rows="bindings" :columns="columns" :loading="loading">
        <template #mentor-data="{ row }">
          <div>
            <div class="font-medium">{{ row.mentor?.name }}</div>
            <div class="text-xs text-gray-500">{{ row.mentor?.employee_no }} · {{ row.mentor?.department }}</div>
          </div>
        </template>
        <template #student-data="{ row }">
          <div>
            <div class="font-medium">{{ row.student?.name }}</div>
            <div class="text-xs text-gray-500">{{ row.student?.employee_no }} · {{ row.student?.department }}</div>
          </div>
        </template>
        <template #trial_end_date-data="{ row }">
          <span v-if="row.student?.trial_end_date" class="text-xs" :class="isTrialActive(row.student) ? 'text-orange-600' : 'text-gray-400'">
            {{ formatDate(row.student.trial_end_date) }}
            <span v-if="isTrialActive(row.student)"> (试用中)</span>
          </span>
          <span v-else class="text-gray-400">-</span>
        </template>
        <template #created_at-data="{ row }">
          <span class="text-xs text-gray-500">{{ formatDate(row.created_at) }}</span>
        </template>
        <template #status-data="{ row }">
          <UBadge :label="row.status === 'active' ? '有效' : '已解除'" :color="row.status === 'active' ? 'green' : 'gray'" variant="subtle" />
        </template>
        <template #actions-data="{ row }">
          <UButton v-if="row.status === 'active'" color="red" variant="ghost" icon="i-heroicons-x-mark" size="xs" label="解绑" @click="handleUnbind(row)" />
        </template>
      </UTable>
      <template #footer>
        <div class="flex justify-end">
          <UPagination v-model="currentPage" :total="total" :page-count="perPage" @update:model-value="loadBindings" />
        </div>
      </template>
    </UCard>

    <!-- 新增绑定弹窗 -->
    <UModal v-model="showModal">
      <UCard>
        <template #header>
          <h3 class="text-base font-semibold">新增导师绑定</h3>
        </template>
        <UForm :state="form" class="space-y-4">
          <UFormGroup label="导师" required description="选择导师账号">
            <USelect v-model="form.mentor_id" :options="mentorOptions" placeholder="选择导师" />
          </UFormGroup>
          <UFormGroup label="学员" required description="选择学员账号">
            <USelect v-model="form.student_id" :options="studentOptions" placeholder="选择学员" />
          </UFormGroup>
          <UFormGroup label="试用期截止日期" description="设置学员的试用期截止时间">
            <UInput v-model="form.trial_end_date" type="date" />
          </UFormGroup>
        </UForm>
        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="gray" label="取消" @click="showModal = false" />
            <UButton label="确认绑定" :loading="saving" @click="handleCreate" />
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

const bindings = ref<any[]>([])
const loading = ref(true)
const currentPage = ref(1)
const total = ref(0)
const perPage = 15
const showModal = ref(false)
const saving = ref(false)
const filters = reactive({ keyword: '' })

const form = reactive({ mentor_id: '', student_id: '', trial_end_date: '' })

const mentorOptions = ref<any[]>([])
const studentOptions = ref<any[]>([])

const columns = [
  { key: 'mentor', label: '导师' },
  { key: 'student', label: '学员' },
  { key: 'trial_end_date', label: '试用期截止' },
  { key: 'status', label: '状态' },
  { key: 'created_at', label: '绑定时间' },
  { key: 'actions', label: '操作' },
]

const isTrialActive = (s: any) => s?.trial_end_date && new Date(s.trial_end_date) > new Date()
const formatDate = (d: string | null) => d ? d.split('T')[0] : '-'

let searchTimeout: ReturnType<typeof setTimeout>
const debouncedLoad = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => loadBindings(1), 300)
}

const loadBindings = async (page = 1) => {
  loading.value = true
  try {
    const res = await api.get<any>('/admin/mentor-bindings', { page, per_page: perPage })
    bindings.value = res.data.data
    total.value = res.data.total
    currentPage.value = res.data.current_page
  } catch (e) { console.error(e) }
  loading.value = false
}

const loadUserOptions = async () => {
  try {
    const [mentors, students] = await Promise.all([
      api.get<any>('/admin/users', { role: 'mentor', per_page: 100 }),
      api.get<any>('/admin/users', { role: 'student', per_page: 100 }),
    ])
    mentorOptions.value = mentors.data.data.map((u: any) => ({ label: `${u.name} (${u.employee_no})`, value: u.id }))
    studentOptions.value = students.data.data.map((u: any) => ({ label: `${u.name} (${u.employee_no})`, value: u.id }))
  } catch {}
}

const openCreateModal = () => {
  Object.assign(form, { mentor_id: '', student_id: '', trial_end_date: '' })
  loadUserOptions()
  showModal.value = true
}

const handleCreate = async () => {
  if (!form.mentor_id || !form.student_id) {
    toast.add({ title: '请选择导师和学员', color: 'red' })
    return
  }
  saving.value = true
  try {
    await api.post('/admin/mentor-bindings', form)
    toast.add({ title: '绑定成功', color: 'green' })
    showModal.value = false
    await loadBindings()
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '绑定失败', color: 'red' })
  }
  saving.value = false
}

const handleUnbind = async (binding: any) => {
  try {
    await api.del(`/admin/mentor-bindings/${binding.id}`)
    toast.add({ title: '已解除绑定', color: 'green' })
    await loadBindings(currentPage.value)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '操作失败', color: 'red' })
  }
}

onMounted(() => loadBindings())
</script>
