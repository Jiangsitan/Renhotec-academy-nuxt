<template>
  <div class="flex flex-wrap gap-2">
    <!-- 一级分类 -->
    <select v-model="selectedLevel1" class="select-field" @change="onLevel1Change">
      <option value="">全部一级分类</option>
      <option v-for="cat in level1Categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
    </select>

    <!-- 二级分类 -->
    <select v-if="level2Categories.length > 0" v-model="selectedLevel2" class="select-field" @change="onLevel2Change">
      <option value="">全部二级分类</option>
      <option v-for="cat in level2Categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
    </select>

    <!-- 三级分类 -->
    <select v-if="level3Categories.length > 0" v-model="selectedLevel3" class="select-field" @change="onLevel3Change">
      <option value="">全部三级分类</option>
      <option v-for="cat in level3Categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
    </select>
  </div>
</template>

<script setup lang="ts">
interface Category {
  id: number
  name: string
  level: number
  parent_id: number | null
  children?: Category[]
}

const props = defineProps<{
  categories: Category[]
}>()

const emit = defineEmits<{
  change: [categoryId: number | null]
}>()

const selectedLevel1 = ref<number | ''>('')
const selectedLevel2 = ref<number | ''>('')
const selectedLevel3 = ref<number | ''>('')

const level1Categories = computed(() => props.categories.filter(c => c.level === 1))

const level2Categories = computed(() => {
  if (!selectedLevel1.value) return []
  const parent = props.categories.find(c => c.id === selectedLevel1.value)
  return parent?.children || []
})

const level3Categories = computed(() => {
  if (!selectedLevel2.value) return []
  const parent = level2Categories.value.find(c => c.id === selectedLevel2.value)
  return parent?.children || []
})

const onLevel1Change = () => {
  selectedLevel2.value = ''
  selectedLevel3.value = ''
  emitChange()
}

const onLevel2Change = () => {
  selectedLevel3.value = ''
  emitChange()
}

const onLevel3Change = () => {
  emitChange()
}

const emitChange = () => {
  const categoryId = selectedLevel3.value || selectedLevel2.value || selectedLevel1.value || null
  emit('change', categoryId as number | null)
}
</script>

<style scoped>
.select-field {
  @apply px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-w-[140px];
}
</style>
