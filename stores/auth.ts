import { defineStore } from 'pinia'

interface UserInfo {
  id: number
  name: string
  employee_no: string
  email: string
  role: string
  department: string
  position: string
  is_trial: boolean
}

interface AuthState {
  user: UserInfo | null
  token: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    token: null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
    isMentor: (state) => state.user?.role === 'mentor',
    isStudent: (state) => state.user?.role === 'student',
    isTrial: (state) => state.user?.is_trial ?? false,
  },

  actions: {
    setUser(user: UserInfo) {
      this.user = user
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(user))
      }
    },
    setToken(token: string) {
      this.token = token
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token)
      }
    },
    clear() {
      this.user = null
      this.token = null
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user')
        localStorage.removeItem('token')
      }
    },
    loadFromStorage() {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token')
        const user = localStorage.getItem('user')
        if (token) this.token = token
        if (user) {
          try { this.user = JSON.parse(user) } catch {}
        }
      }
    },
  },
})
