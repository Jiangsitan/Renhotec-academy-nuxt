export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },

  css: ['~/assets/css/main.css'],

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
      ssoUrl: process.env.NUXT_PUBLIC_SSO_URL || 'https://home.renhotec.cn',
      ssoClientId: process.env.NUXT_PUBLIC_SSO_CLIENT_ID || '',
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'https://learn.renhotec.cn',
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

  vite: {
    optimizeDeps: {
      include: ['survey-vue3-ui', 'survey-core']
    }
  },
})
