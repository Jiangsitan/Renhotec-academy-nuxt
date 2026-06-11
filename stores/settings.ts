import { defineStore } from 'pinia'

interface SettingsState {
  system_name: string
  system_subtitle: string
  system_logo: string
  loaded: boolean
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    system_name: 'Renhotec Academy',
    system_subtitle: '员工培训与考试系统',
    system_logo: '',
    loaded: false,
  }),

  actions: {
    async fetchSettings() {
      if (this.loaded) return

      try {
        const config = useRuntimeConfig()
        // 动态拼接 API 基础 URL
        const baseUrl = config.public.apiBase ||
          (typeof window !== 'undefined'
            ? `${window.location.protocol}//${window.location.hostname}:9000/api`
            : 'http://localhost:9000/api')
        const res = await $fetch<{ data: Record<string, string> }>(`${baseUrl}/settings`)
        if (res.data) {
          this.system_name = res.data.system_name || 'Renhotec Academy'
          this.system_subtitle = res.data.system_subtitle || '员工培训与考试系统'
          
          // Logo URL 处理
          const logo = res.data.system_logo || ''
          if (logo && !logo.startsWith('http')) {
            // OSS 路径，拼接完整 URL
            this.system_logo = `https://rh-wh.oss-cn-shanghai.aliyuncs.com/${logo}`
          } else {
            this.system_logo = logo
          }
          
          this.loaded = true
        }
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    },

    updateSettings(settings: Record<string, string>) {
      if (settings.system_name) this.system_name = settings.system_name
      if (settings.system_subtitle) this.system_subtitle = settings.system_subtitle
      if (settings.system_logo !== undefined) this.system_logo = settings.system_logo
    },
  },
})
