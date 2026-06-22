<template>
  <div class="tinymce-editor">
    <ClientOnly>
      <Editor
        v-model="content"
        :init="editorConfig"
        :disabled="disabled"
        @onInit="onInit"
        @onSelectionChange="onSelectionChange"
      />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '请输入内容...'
  },
  height: {
    type: Number,
    default: 400
  },
  disabled: {
    type: Boolean,
    default: false
  },
  toolbar: {
    type: String,
    default: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | image link codesample | removeformat help'
  }
})

const emit = defineEmits(['update:modelValue', 'onInit', 'onSelectionChange'])

const content = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const api = useApi()

const editorConfig = computed(() => ({
  height: props.height,
  menubar: false,
  language: 'zh_CN',
  language_url: '/tinymce/langs/zh_CN.js',
  skin_url: '/tinymce/skins/ui/oxide',
  content_css: '/tinymce/skins/content/default/content.css',
  plugins: [
    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
    'insertdatetime', 'media', 'table', 'help', 'wordcount',
    'codesample', 'emoticons'
  ],
  toolbar: props.toolbar,
  toolbar_mode: 'sliding',
  content_style: `
    body {
      font-family: -apple-system, BlinkMacSystemFont, San Francisco, Segoe UI, Roboto, Helvetica Neue, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      padding: 8px;
    }
    code {
      background-color: #f4f4f4;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
    }
    pre {
      background-color: #f4f4f4;
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
    }
  `,
  codesample_languages: [
    { text: 'JavaScript', value: 'javascript' },
    { text: 'TypeScript', value: 'typescript' },
    { text: 'Python', value: 'python' },
    { text: 'PHP', value: 'php' },
    { text: 'Java', value: 'java' },
    { text: 'C++', value: 'cpp' },
    { text: 'C#', value: 'csharp' },
    { text: 'SQL', value: 'sql' },
    { text: 'HTML', value: 'html' },
    { text: 'CSS', value: 'css' },
    { text: 'Shell', value: 'shell' },
    { text: 'JSON', value: 'json' },
    { text: 'XML', value: 'xml' },
    { text: 'YAML', value: 'yaml' },
    { text: 'Markdown', value: 'markdown' }
  ],
  images_upload_handler: async (blobInfo: any) => {
    try {
      const formData = new FormData()
      formData.append('file', blobInfo.blob(), blobInfo.filename())
      formData.append('type', 'document')

      const res = await api.apiFetch<any>('/admin/upload/file', {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': undefined }
      })

      return res.data.url
    } catch (e: any) {
      throw new Error(e?.data?.message || '图片上传失败')
    }
  },
  automatic_uploads: true,
  file_picker_types: 'image',
  image_title: true,
  image_dimensions: true,
  image_class_list: [
    { title: '无', value: '' },
    { title: '左对齐', value: 'align-left' },
    { title: '居中', value: 'align-center' },
    { title: '右对齐', value: 'align-right' }
  ],
  link_default_target: '_blank',
  link_title: false,
  target_list: false,
  branding: false,
  promotion: false,
  placeholder: props.placeholder,
  setup: (editor: any) => {
    editor.on('keydown', (e: KeyboardEvent) => {
      // 支持 Markdown 快捷键
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault()
            editor.execCommand('Bold')
            break
          case 'i':
            e.preventDefault()
            editor.execCommand('Italic')
            break
          case 'u':
            e.preventDefault()
            editor.execCommand('Underline')
            break
          case 'k':
            e.preventDefault()
            editor.execCommand('mceLink')
            break
        }
      }
    })
  }
}))

const onInit = (event: any) => {
  emit('onInit', event)
}

const onSelectionChange = (event: any) => {
  emit('onSelectionChange', event)
}
</script>

<style scoped>
.tinymce-editor {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.tinymce-editor :deep(.tox-tinymce) {
  border: none;
}

.tinymce-editor :deep(.tox .tox-toolbar__primary) {
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.tinymce-editor :deep(.tox .tox-edit-area__iframe) {
  background: #fff;
}

.tinymce-editor :deep(.tox .tox-statusbar) {
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}
</style>
