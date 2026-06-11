<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">培训中心</h1>
      <p class="text-sm text-gray-500 mt-1">选择分类，开始系统化学习</p>
    </div>

    <!-- 一级分类 Tab -->
    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
      <button
        v-for="cat in categories"
        :key="cat.id"
        @click="selectedCategory = cat"
        class="px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
        :class="selectedCategory?.id === cat.id
          ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
          : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:text-primary-600'"
      >
        {{ cat.name }}
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="text-center py-16">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-gray-300 animate-spin mx-auto" />
      <p class="text-sm text-gray-400 mt-3">加载中...</p>
    </div>

    <!-- 系列卡片网格 -->
    <div v-else-if="currentSeries.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      <NuxtLink
        v-for="s in currentSeries"
        :key="s.id"
        :to="`/series/${s.id}`"
        class="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl hover:border-primary-200 transition-all duration-300"
      >
        <!-- 封面 -->
        <div class="aspect-[16/10] bg-gradient-to-br from-primary-50 to-primary-100 relative overflow-hidden">
          <img v-if="s.cover_image" :src="s.cover_image" :alt="s.name" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center">
            <UIcon name="i-heroicons-play-circle" class="w-16 h-16 text-primary-300 group-hover:scale-110 transition-transform" />
          </div>
          <div class="absolute bottom-3 right-3 bg-black/60 backdrop-blur text-white text-xs px-2.5 py-1 rounded-lg">
            {{ s.videos_count }} 集
          </div>
        </div>

        <div class="p-4">
          <h3 class="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-1">
            {{ s.name }}
          </h3>
          <p class="text-sm text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
            {{ s.description || '暂无简介' }}
          </p>
        </div>
      </NuxtLink>
    </div>

    <!-- 空状态 -->
    <div v-else class="text-center py-16">
      <UIcon name="i-heroicons-folder-open" class="w-12 h-12 text-gray-300 mx-auto" />
      <p class="text-sm text-gray-500 mt-3">该分类下暂无培训系列</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const api = useApi()

interface SeriesItem {
  id: number
  name: string
  description: string
  cover_image: string | null
  videos_count: number
}

interface CategoryItem {
  id: number
  name: string
  series: SeriesItem[]
}

const categories = ref<CategoryItem[]>([])
const selectedCategory = ref<CategoryItem | null>(null)
const loading = ref(true)

const currentSeries = computed(() => selectedCategory.value?.series ?? [])

const loadData = async () => {
  loading.value = true
  try {
    const res = await api.get<any>('/homepage')
    categories.value = res.data
    if (categories.value.length > 0) {
      selectedCategory.value = categories.value[0]
    }
  } catch (e) {
    console.error('加载首页数据失败:', e)
  }
  loading.value = false
}

onMounted(loadData)
</script>
