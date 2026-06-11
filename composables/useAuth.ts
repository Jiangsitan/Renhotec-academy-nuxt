interface LoginResponse {
  message: string
  data: {
    user: UserInfo
    token: string
  }
}

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

export const useAuth = () => {
  const authStore = useAuthStore()
  const api = useApi()
  const router = useRouter()

  const login = async (employeeNo: string, password: string) => {
    const res = await api.post<LoginResponse>('/login', {
      employee_no: employeeNo,
      password,
    })

    authStore.setUser(res.data.user)
    authStore.setToken(res.data.token)

    return res
  }

  const logout = async () => {
    try {
      await api.post('/logout')
    } catch {}
    authStore.clear()
    router.push('/login')
  }

  const fetchMe = async () => {
    const res = await api.get<{ data: UserInfo }>('/me')
    authStore.setUser(res.data)
    return res.data
  }

  return { login, logout, fetchMe, user: computed(() => authStore.user), isLoggedIn: computed(() => authStore.isLoggedIn) }
}
