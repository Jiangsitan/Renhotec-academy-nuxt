import { defineStore } from 'pinia'

interface SettingsState {
  system_name: string
  system_subtitle: string
  system_logo: string
  exam_anti_cheat_enabled: string
  loaded: boolean
  lastFetchTime: number
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    system_name: 'Renhotec Academy',
    system_subtitle: '员工培训与考试系统',
    system_logo: '',
    exam_anti_cheat_enabled: '1',
    loaded: false,
    lastFetchTime: 0,
  }),

  actions: {
    async fetchSettings(force = false) {
      // 5分钟缓存，强制刷新时跳过
      const now = Date.now()
      if (!force && this.loaded && (now - this.lastFetchTime < 5 * 60 * 1000)) return

      try {
        const config = useRuntimeConfig()
        const baseUrl = config.public.apiBase ||
          (typeof window !== 'undefined'
            ? `${window.location.protocol}//${window.location.hostname}:9000/api`
            : 'http://localhost:9000/api')
        const res = await $fetch<{ data: Record<string, string> }>(`${baseUrl}/settings`)
        if (res.data) {
          this.system_name = res.data.system_name || 'Renhotec Academy'
          this.system_subtitle = res.data.system_subtitle || '员工培训与考试系统'
          this.exam_anti_cheat_enabled = res.data.exam_anti_cheat_enabled ?? '1'
          
          const logo = res.data.system_logo || ''
          if (logo && !logo.startsWith('http')) {
            this.system_logo = `https://rh-wh.oss-cn-shanghai.aliyuncs.com/${logo}`
          } else {
            this.system_logo = logo
          }
          
          this.loaded = true
          this.lastFetchTime = now
        }
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    },

    updateSettings(settings: Record<string, string>) {
      if (settings.system_name) this.system_name = settings.system_name
      if (settings.system_subtitle) this.system_subtitle = settings.system_subtitle
      if (settings.system_logo !== undefined) this.system_logo = settings.system_logo
      if (settings.exam_anti_cheat_enabled !== undefined) this.exam_anti_cheat_enabled = settings.exam_anti_cheat_enabled
    },
  },
})
