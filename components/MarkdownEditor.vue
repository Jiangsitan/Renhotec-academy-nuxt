<template>
  <div class="markdown-editor">
    <ClientOnly>
      <MdEditor
        v-model="content"
        :preview="preview"
        :toolbarsExclude="toolbarsExclude"
        :codeTheme="codeTheme"
        :height="height"
        @onHtmlChanged="onHtmlChanged"
        @onUploadImg="onUploadImg"
      />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  preview: {
    type: Boolean,
    default: true
  },
  height: {
    type: Number,
    default: 400
  },
  toolbarsExclude: {
    type: Array,
    default: () => ['github']
  },
  codeTheme: {
    type: String,
    default: 'atom'
  }
})

const emit = defineEmits(['update:modelValue', 'onHtmlChanged'])

const content = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const api = useApi()

const onHtmlChanged = (html: string) => {
  emit('onHtmlChanged', html)
}

const onUploadImg = async (files: File[], callback: (urls: string[]) => void) => {
  try {
    const urls: string[] = []
    
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('图片大小不能超过 10MB')
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'document')

      const res = await api.apiFetch<any>('/admin/upload/file', {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': undefined }
      })

      urls.push(res.data.url)
    }

    callback(urls)
  } catch (e: any) {
    console.error('图片上传失败:', e)
    throw new Error(e?.data?.message || e?.message || '图片上传失败')
  }
}
</script>

<style scoped>
.markdown-editor {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.markdown-editor :deep(.md-editor) {
  border: none;
}

.markdown-editor :deep(.md-editor-toolbar) {
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.markdown-editor :deep(.md-editor-content) {
  background: #fff;
}

.markdown-editor :deep(.md-editor-preview) {
  background: #fff;
}

.markdown-editor :deep(.md-editor-preview-wrapper) {
  border-left: 1px solid #e5e7eb;
}

.markdown-editor :deep(pre) {
  background-color: #f4f4f4;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
}

.markdown-editor :deep(code) {
  background-color: #f4f4f4;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}

.markdown-editor :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 16px 0;
}

.markdown-editor :deep(th),
.markdown-editor :deep(td) {
  border: 1px solid #e5e7eb;
  padding: 8px 12px;
  text-align: left;
}

.markdown-editor :deep(th) {
  background-color: #f9fafb;
  font-weight: 600;
}

.markdown-editor :deep(blockquote) {
  border-left: 4px solid #e5e7eb;
  padding-left: 16px;
  margin: 16px 0;
  color: #6b7280;
}

.markdown-editor :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}
</style>
