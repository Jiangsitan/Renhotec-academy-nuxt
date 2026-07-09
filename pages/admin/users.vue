<template>
  <div>
    <!-- 搜索和筛选 -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <UInput v-model="filters.keyword" placeholder="搜索工号/姓名/邮箱..." icon="i-heroicons-magnifying-glass" class="w-64" @update:model-value="debouncedLoad" />
      <USelect v-model="filters.role" :options="roleOptions" placeholder="角色筛选" class="w-32" @change="loadUsers(1)" />
      <USelect v-model="filters.status" :options="statusOptions" placeholder="状态筛选" class="w-32" @change="loadUsers(1)" />
      <div class="flex-1" />
      <UButton color="gray" icon="i-heroicons-arrow-up-tray" label="批量导入" @click="showImportModal = true" />
      <UButton icon="i-heroicons-plus" label="添加用户" @click="openCreateModal" />
    </div>

    <!-- 用户列表 -->
    <UCard>
          <UTable :rows="users" :columns="columns" :loading="loading">
        <template #role-data="{ row }">
          <UBadge :label="roleLabel(row.role)" :color="roleColor(row.role)" variant="subtle" />
        </template>
        <template #email-data="{ row }">
          <div class="flex items-center gap-1">
            <span>{{ row.email || '-' }}</span>
            <UBadge v-if="row.is_placeholder_email" label="占位" color="orange" variant="subtle" size="xs" />
          </div>
        </template>
        <template #mentors-data="{ row }">
          <div v-if="row.mentors?.length" class="flex flex-wrap gap-1">
            <UBadge v-for="m in row.mentors" :key="m.id" :label="m.name" color="purple" variant="subtle" size="xs" />
          </div>
          <span v-else class="text-gray-400 text-xs">-</span>
        </template>
        <template #status-data="{ row }">
          <UBadge :label="row.status === 'active' ? '正常' : row.status === 'inactive' ? '禁用' : '锁定'" :color="row.status === 'active' ? 'green' : 'red'" variant="subtle" />
        </template>
        <template #hire_date-data="{ row }">
          <span class="text-sm text-gray-700">{{ formatDate(row.hire_date) }}</span>
        </template>
        <template #trial_end_date-data="{ row }">
          <span v-if="row.trial_end_date" class="text-xs" :class="isTrialActive(row) ? 'text-orange-600' : 'text-gray-400'">
            {{ formatDate(row.trial_end_date) }}
            <span v-if="isTrialActive(row)"> (试用中)</span>
          </span>
          <span v-else class="text-gray-400">-</span>
        </template>
        <template #actions-data="{ row }">
          <div class="flex items-center gap-1">
            <UButton color="gray" variant="ghost" icon="i-heroicons-pencil" size="xs" @click="openEditModal(row)" />
            <UButton color="gray" variant="ghost" icon="i-heroicons-key" size="xs" @click="openResetPasswordModal(row)" />
            <UButton
              :color="row.status === 'active' ? 'red' : 'green'"
              variant="ghost"
              :icon="row.status === 'active' ? 'i-heroicons-lock-closed' : 'i-heroicons-lock-open'"
              size="xs"
              @click="toggleStatus(row)"
            />
          </div>
        </template>
      </UTable>

      <template #footer>
        <div class="flex justify-end">
          <UPagination v-model="currentPage" :total="total" :page-count="perPage" @update:model-value="loadUsers" />
        </div>
      </template>
    </UCard>

    <!-- 创建/编辑用户弹窗 -->
    <UModal v-model="showModal" :prevent-close="saving">
      <UCard>
        <template #header>
          <h3 class="text-base font-semibold">{{ editingUser ? '编辑用户' : '添加用户' }}</h3>
        </template>
        <UForm :state="form" @submit="handleSubmit" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="姓名" required>
              <UInput v-model="form.name" placeholder="请输入姓名" />
            </UFormGroup>
            <UFormGroup label="工号" required :description="editingUser ? '工号不可修改' : ''">
              <UInput v-model="form.employee_no" placeholder="请输入工号" :disabled="!!editingUser" />
            </UFormGroup>
            <UFormGroup label="邮箱" description="留空将自动生成占位邮箱">
              <UInput v-model="form.email" type="email" placeholder="请输入邮箱（可选）" />
            </UFormGroup>
            <UFormGroup label="手机">
              <UInput v-model="form.phone" placeholder="请输入手机号" />
            </UFormGroup>
            <UFormGroup v-if="!editingUser" label="密码" required>
              <UInput v-model="form.password" type="password" placeholder="请设置密码（至少6位）" />
            </UFormGroup>
            <UFormGroup label="角色" required>
              <USelect v-model="form.role" :options="roleOptions.filter(o => o.value)" />
            </UFormGroup>
            <UFormGroup v-if="form.role === 'student'" label="绑定导师" description="可选，为学员分配导师">
              <USelect v-model="form.mentor_id" :options="mentorOptions" placeholder="选择导师" />
            </UFormGroup>
            <UFormGroup label="部门">
              <UInput v-model="form.department" placeholder="所属部门" />
            </UFormGroup>
            <UFormGroup label="岗位">
              <UInput v-model="form.position" placeholder="岗位名称" />
            </UFormGroup>
            <UFormGroup label="入职日期">
              <UInput v-model="form.hire_date" type="date" />
            </UFormGroup>
            <UFormGroup label="试用期截止" description="仅学员需要设置">
              <UInput v-model="form.trial_end_date" type="date" />
            </UFormGroup>
          </div>
        </UForm>
        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="gray" label="取消" @click="showModal = false" />
            <UButton :label="editingUser ? '保存' : '创建'" :loading="saving" @click="handleSubmit" />
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- 重置密码弹窗 -->
    <UModal v-model="showResetModal">
      <UCard>
        <template #header>
          <h3 class="text-base font-semibold">重置密码</h3>
        </template>
        <p class="text-sm text-gray-600 mb-4">为 <strong>{{ resettingUser?.name }}</strong>（{{ resettingUser?.employee_no }}）设置新密码：</p>
        <UFormGroup label="新密码" required>
          <UInput v-model="newPassword" type="password" placeholder="至少6位" />
        </UFormGroup>
        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="gray" label="取消" @click="showResetModal = false" />
            <UButton label="确认重置" color="red" :loading="resetting" @click="handleResetPassword" />
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- 批量导入弹窗 -->
    <UModal v-model="showImportModal" :prevent-close="importing">
      <UCard>
        <template #header>
          <h3 class="text-base font-semibold">批量导入员工</h3>
        </template>

        <div class="space-y-4">
          <!-- 下载模板 -->
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p class="text-sm font-medium text-gray-700">下载导入模板</p>
              <p class="text-xs text-gray-500">请按模板格式填写数据后上传</p>
            </div>
            <UButton color="gray" size="sm" icon="i-heroicons-arrow-down-tray" label="下载模板" @click="downloadTemplate" />
          </div>

          <!-- 已导入文件 -->
          <div v-if="importFile" class="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <UIcon name="i-heroicons-document-check" class="w-5 h-5 text-green-600" />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-green-700 truncate">{{ importFile.name }}</div>
              <div class="text-xs text-green-600">{{ formatFileSize(importFile.size) }}</div>
            </div>
            <UButton color="red" variant="ghost" icon="i-heroicons-x-mark" size="xs" @click="importFile = null" />
          </div>

          <!-- 上传区域 -->
          <div
            v-else
            @click="triggerImportInput"
            @dragover.prevent="isDraggingImport = true"
            @dragleave="isDraggingImport = false"
            @drop.prevent="handleImportDrop"
            class="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
            :class="isDraggingImport ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'"
          >
            <UIcon name="i-heroicons-cloud-arrow-up" class="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p class="text-sm text-gray-600">
              拖拽 CSV 文件到此处，或 <span class="text-primary-600 font-medium">点击选择文件</span>
            </p>
            <p class="text-xs text-gray-400 mt-2">支持 .csv 格式，最大 5MB</p>
          </div>
          <input ref="importInputRef" type="file" accept=".csv,.txt" class="hidden" @change="handleImportSelect" />

          <!-- 导入进度 -->
          <div v-if="importing" class="text-center py-4">
            <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-primary-500 animate-spin mx-auto mb-2" />
            <p class="text-sm text-gray-600">正在导入，请稍候...</p>
          </div>

          <!-- 导入结果 -->
          <div v-if="importResult" class="space-y-3">
            <div class="flex items-center gap-3 p-3 rounded-lg" :class="importResult.failed > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'">
              <UIcon :name="importResult.failed > 0 ? 'i-heroicons-exclamation-triangle' : 'i-heroicons-check-circle'" class="w-5 h-5" :class="importResult.failed > 0 ? 'text-orange-600' : 'text-green-600'" />
              <div class="text-sm">
                <span class="font-medium text-green-700">创建 {{ importResult.created }} 条</span>
                <span v-if="importResult.updated > 0" class="text-blue-700 ml-3">更新 {{ importResult.updated }} 条</span>
                <span v-if="importResult.failed > 0" class="text-orange-700 ml-3">失败 {{ importResult.failed }} 条</span>
              </div>
            </div>

            <!-- 错误详情 -->
            <div v-if="importResult.errors?.length" class="max-h-48 overflow-y-auto">
              <div v-for="err in importResult.errors" :key="err.row" class="text-xs text-red-600 py-1 border-b border-red-100">
                第 {{ err.row }} 行：{{ err.message }}
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="gray" label="关闭" @click="closeImportModal" />
            <UButton label="开始导入" :loading="importing" :disabled="!importFile" @click="handleImport" />
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
const authStore = useAuthStore()

const users = ref<any[]>([])
const loading = ref(true)
const currentPage = ref(1)
const total = ref(0)
const perPage = 15
const showModal = ref(false)
const showResetModal = ref(false)
const saving = ref(false)
const resetting = ref(false)
const editingUser = ref<any>(null)
const resettingUser = ref<any>(null)
const newPassword = ref('')

// 导师选项
const mentorOptions = ref<any[]>([])

// 批量导入相关
const showImportModal = ref(false)
const importing = ref(false)
const importFile = ref<File | null>(null)
const importInputRef = ref<HTMLInputElement | null>(null)
const isDraggingImport = ref(false)
const importResult = ref<{ success: number; failed: number; errors: { row: number; message: string }[] } | null>(null)

const filters = reactive({ keyword: '', role: '', status: '' })

const form = reactive({
  name: '', employee_no: '', email: '', phone: '', password: '',
  role: 'student', mentor_id: '', department: '', position: '', hire_date: '', trial_end_date: '',
})

const columns = [
  { key: 'employee_no', label: '工号' },
  { key: 'name', label: '姓名' },
  { key: 'email', label: '邮箱' },
  { key: 'department', label: '部门' },
  { key: 'role', label: '角色' },
  { key: 'mentors', label: '导师' },
  { key: 'status', label: '状态' },
  { key: 'hire_date', label: '入职日期' },
  { key: 'trial_end_date', label: '试用期' },
  { key: 'actions', label: '操作' },
]

const roleOptions = [
  { label: '全部', value: '' },
  { label: '学员', value: 'student' },
  { label: '导师', value: 'mentor' },
  { label: '管理员', value: 'admin' },
]

const statusOptions = [
  { label: '全部', value: '' },
  { label: '正常', value: 'active' },
  { label: '禁用', value: 'inactive' },
  { label: '锁定', value: 'locked' },
]

const roleLabel = (r: string) => ({ student: '学员', mentor: '导师', admin: '管理员' }[r] ?? r)
const roleColor = (r: string) => ({ student: 'blue', mentor: 'purple', admin: 'red' }[r] ?? 'gray')
const isTrialActive = (u: any) => u.trial_end_date && new Date(u.trial_end_date) > new Date()
const formatDate = (d: string | null) => d ? d.split('T')[0] : '-'

const formatFileSize = (bytes: number) => {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

let searchTimeout: ReturnType<typeof setTimeout>
const debouncedLoad = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => loadUsers(1), 300)
}

const loadUsers = async (page = 1) => {
  loading.value = true
  try {
    const params: any = { page, per_page: perPage }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.role) params.role = filters.role
    if (filters.status) params.status = filters.status
    const res = await api.get<any>('/admin/users', params)
    users.value = res.data.data
    total.value = res.data.total
    currentPage.value = res.data.current_page
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '加载用户列表失败', color: 'red' })
  }
  loading.value = false
}

const loadMentorOptions = async () => {
  try {
    const res = await api.get<any>('/admin/users', { role: 'mentor', per_page: 100 })
    mentorOptions.value = [
      { label: '不绑定', value: '' },
      ...res.data.data.map((m: any) => ({ label: `${m.name} (${m.employee_no})`, value: m.id })),
    ]
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '加载导师列表失败', color: 'red' })
  }
}

const openCreateModal = () => {
  editingUser.value = null
  Object.assign(form, { name: '', employee_no: '', email: '', phone: '', password: '', role: 'student', mentor_id: '', department: '', position: '', hire_date: '', trial_end_date: '' })
  loadMentorOptions()
  showModal.value = true
}

const openEditModal = (user: any) => {
  editingUser.value = user
  const currentMentorId = user.mentors?.length ? user.mentors[0].id : ''
  Object.assign(form, {
    name: user.name, employee_no: user.employee_no, email: user.email, phone: user.phone || '',
    password: '', role: user.role, mentor_id: currentMentorId,
    department: user.department || '', position: user.position || '',
    hire_date: user.hire_date || '', trial_end_date: user.trial_end_date || '',
  })
  loadMentorOptions()
  showModal.value = true
}

const openResetPasswordModal = (user: any) => {
  resettingUser.value = user
  newPassword.value = ''
  showResetModal.value = true
}

const handleSubmit = async () => {
  saving.value = true
  try {
    const payload: any = { ...form }
    // 非学员角色不传 mentor_id
    if (payload.role !== 'student') payload.mentor_id = null

    if (editingUser.value) {
      await api.put(`/admin/users/${editingUser.value.id}`, payload)
      toast.add({ title: '用户信息已更新', color: 'green' })
    } else {
      await api.post('/admin/users', payload)
      toast.add({ title: '用户创建成功', color: 'green' })
    }
    showModal.value = false
    await loadUsers(currentPage.value)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '操作失败', color: 'red' })
  }
  saving.value = false
}

const toggleStatus = async (user: any) => {
  const newStatus = user.status === 'active' ? 'inactive' : 'active'
  try {
    await api.put(`/admin/users/${user.id}/status`, { status: newStatus })
    toast.add({ title: `用户已${newStatus === 'active' ? '启用' : '禁用'}`, color: 'green' })
    await loadUsers(currentPage.value)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '操作失败', color: 'red' })
  }
}

const handleResetPassword = async () => {
  if (newPassword.value.length < 6) {
    toast.add({ title: '密码至少6位', color: 'red' })
    return
  }
  resetting.value = true
  try {
    await api.put(`/admin/users/${resettingUser.value.id}/reset-password`, { password: newPassword.value })
    toast.add({ title: '密码已重置', color: 'green' })
    showResetModal.value = false
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '操作失败', color: 'red' })
  }
  resetting.value = false
}

// ==================== 批量导入 ====================

const downloadTemplate = async () => {
  try {
    const res = await fetch(api.getApiUrl('/admin/users/import-template'), {
      headers: { 'Authorization': `Bearer ${authStore.token}` },
    })
    if (!res.ok) throw new Error('下载失败')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'user_import_template.csv'
    link.click()
    URL.revokeObjectURL(url)
  } catch (e: any) {
    toast.add({ title: e?.message || '下载失败', color: 'red' })
  }
}

const triggerImportInput = () => { importInputRef.value?.click() }

const handleImportSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files?.length) {
    importFile.value = input.files[0]
    importResult.value = null
  }
}

const handleImportDrop = (e: DragEvent) => {
  isDraggingImport.value = false
  const files = e.dataTransfer?.files
  if (files?.length) {
    importFile.value = files[0]
    importResult.value = null
  }
}

const handleImport = async () => {
  if (!importFile.value) return
  importing.value = true
  importResult.value = null

  try {
    const formData = new FormData()
    formData.append('file', importFile.value)

    const res = await api.apiFetch<any>('/admin/users/import', {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': undefined },
    })

    importResult.value = res.data
    toast.add({ title: res.message, color: res.data.failed > 0 ? 'orange' : 'green' })
    await loadUsers(1)
  } catch (e: any) {
    toast.add({ title: e?.data?.message || '导入失败', color: 'red' })
  }
  importing.value = false
}

const closeImportModal = () => {
  showImportModal.value = false
  importFile.value = null
  importResult.value = null
}

onMounted(() => loadUsers())
</script>
