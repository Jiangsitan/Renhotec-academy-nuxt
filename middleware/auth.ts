export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()
  authStore.loadFromStorage()

  // SSO 回调页面不需要认证
  if (to.path === '/sso-callback') {
    return
  }

  if (!authStore.isLoggedIn && to.path !== '/login') {
    return navigateTo('/login')
  }

  if (authStore.isLoggedIn && to.path === '/login') {
    return navigateTo('/')
  }
})
