import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue'],
      dts: false,
    }),
  ],
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', '.nuxt', '.output'],
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, '.'),
    },
  },
})
