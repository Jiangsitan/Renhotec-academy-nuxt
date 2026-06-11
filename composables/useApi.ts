export const useApi = () => {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()

  const baseURL = (config.public.apiBase as string) ||
    (typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:9000/api`
      : 'http://localhost:9000/api')

  const apiFetch = async <T>(url: string, options: any = {}): Promise<T> => {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...options.headers,
    }

    // 认证 token
    if (authStore.token) {
      headers['Authorization'] = `Bearer ${authStore.token}`
    }

    // FormData 上传时不设置 Content-Type，让浏览器自动设置 boundary
    if (options.body instanceof FormData) {
      delete headers['Content-Type']
    } else {
      // 非 FormData 请求默认 JSON
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json'
      }
    }

    try {
      const fetchOpts = { ...options, headers }
      const response = await $fetch<T>(`${baseURL}${url}`, fetchOpts)
      return response as T
    } catch (error: any) {
      if (error?.statusCode === 401) {
        authStore.clear()
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
      throw error
    }
  }

  const get = <T>(url: string, params?: Record<string, any>) =>
    apiFetch<T>(url, { method: 'GET', params })

  const post = <T>(url: string, body?: any) =>
    apiFetch<T>(url, { method: 'POST', body })

  const put = <T>(url: string, body?: any) =>
    apiFetch<T>(url, { method: 'PUT', body })

  const del = <T>(url: string) =>
    apiFetch<T>(url, { method: 'DELETE' })

  const getApiUrl = (url: string) => `${baseURL}${url}`

  return { get, post, put, del, apiFetch, getApiUrl }
}
