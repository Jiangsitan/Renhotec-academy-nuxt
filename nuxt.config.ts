export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
  ],

  components: [
    {
      path: '~/components',
      pathPrefix: false,
    },
  ],

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '',
    },
  },

  app: {
    head: {
      title: 'Renhotec Academy',
      htmlAttrs: { class: 'light' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },

  routeRules: {
    '/**': { ssr: false },
  },

  colorMode: {
    preference: 'light',
  },

  ui: {
    primary: 'blue',
    gray: 'slate',
  },

  // TinyMCE 配置
  build: {
    transpile: ['tinymce']
  },

  vite: {
    optimizeDeps: {
      include: ['tinymce', 'md-editor-v3']
    }
  },

  // 静态资源
  nitro: {
    publicAssets: [
      {
        baseURL: 'tinymce',
        dir: 'public/tinymce'
      }
    ]
  }
})
