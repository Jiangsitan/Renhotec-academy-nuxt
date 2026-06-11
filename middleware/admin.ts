export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()
  authStore.loadFromStorage()

  if (!authStore.isLoggedIn) {
    return navigateTo('/login')
  }

  if (authStore.user?.role !== 'admin') {
    return navigateTo('/')
  }
})
