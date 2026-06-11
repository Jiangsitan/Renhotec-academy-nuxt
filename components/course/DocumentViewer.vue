<template>
  <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
    <!-- 加载状态 -->
    <div v-if="loading" class="p-12 text-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-gray-300 animate-spin mx-auto" />
      <p class="text-sm text-gray-400 mt-2">文档加载中...</p>
    </div>

    <!-- DOCX 预览 -->
    <div v-else-if="isDocx" class="p-6 max-h-[700px] overflow-y-auto">
      <div class="prose prose-sm max-w-none" v-html="docxHtml"></div>
    </div>

    <!-- XLSX 预览 -->
    <div v-else-if="isXlsx" class="p-4 max-h-[700px] overflow-auto">
      <div v-for="(sheet, idx) in sheets" :key="idx" class="mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-2">{{ sheet.name }}</h3>
        <div class="overflow-x-auto">
          <table class="min-w-full text-xs border-collapse border border-gray-200">
            <tr v-for="(row, rIdx) in sheet.data.slice(0, 100)" :key="rIdx" class="border-b border-gray-100">
              <td
                v-for="(cell, cIdx) in row"
                :key="cIdx"
                class="px-3 py-1.5 border-r border-gray-100 whitespace-nowrap text-gray-900"
                :class="rIdx === 0 ? 'bg-gray-50 font-semibold' : ''"
              >
                {{ cell ?? '' }}
              </td>
            </tr>
          </table>
          <p v-if="sheet.data.length > 100" class="text-xs text-gray-400 mt-2">
            显示前 100 行，共 {{ sheet.data.length }} 行
          </p>
        </div>
      </div>
    </div>

    <!-- 其他格式 - 不支持预览 -->
    <div v-else class="p-12 text-center">
      <UIcon name="i-heroicons-document-arrow-down" class="w-12 h-12 text-gray-400 mx-auto mb-3" />
      <p class="text-sm text-gray-600 mb-1">该文件类型不支持在线预览</p>
      <p class="text-xs text-gray-400 mb-4">请下载后使用对应软件打开</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'

const props = defineProps<{
  url: string
  fileName: string
}>()

const loading = ref(true)
const docxHtml = ref('')
const sheets = ref<{ name: string; data: any[][] }[]>([])

const ext = computed(() => {
  const name = props.fileName || ''
  return name.split('.').pop()?.toLowerCase() || ''
})

const isDocx = computed(() => ['doc', 'docx'].includes(ext.value))
const isXlsx = computed(() => ['xls', 'xlsx'].includes(ext.value))

const loadDocument = async () => {
  loading.value = true

  try {
    // URL 已包含 token 查询参数，直接 fetch 即可
    const response = await fetch(props.url)
    const buffer = await response.arrayBuffer()

    if (isDocx.value) {
      await renderDOCX(buffer)
    } else if (isXlsx.value) {
      await renderXLSX(buffer)
    }
  } catch (e) {
    console.error('Failed to load document:', e)
  } finally {
    loading.value = false
  }
}

const renderDOCX = async (buffer: ArrayBuffer) => {
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer })
  docxHtml.value = result.value
}

const renderXLSX = async (buffer: ArrayBuffer) => {
  const workbook = XLSX.read(buffer, { type: 'array' })
  sheets.value = workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name]
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
    return { name, data }
  })
}

onMounted(loadDocument)
</script>
