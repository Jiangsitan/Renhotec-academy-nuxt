<template>
  <div>
    <NuxtLayout name="admin">
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false, middleware: 'admin' })
</script>
