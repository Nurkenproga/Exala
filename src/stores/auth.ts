import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authService, type AuthCredentials } from '@/services/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(authService.getToken())
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)
  const username = computed(() => authService.getUsernameFromToken())
  const tokenExpiry = computed(() => authService.getTokenExpiryDate())
  const isTokenExpired = computed(() => {
    if (!tokenExpiry.value) return false
    return tokenExpiry.value.getTime() <= Date.now()
  })

  const init = () => {
    token.value = authService.getToken()
  }

  const register = async (credentials: AuthCredentials) => {
    loading.value = true
    error.value = null
    try {
      await authService.register(credentials)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Ошибка регистрации'
      throw err
    } finally {
      loading.value = false
    }
  }

  const login = async (credentials: AuthCredentials) => {
    loading.value = true
    error.value = null
    try {
      const result = await authService.login(credentials)
      authService.setToken(result.access_token)
      token.value = result.access_token
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Ошибка авторизации'
      throw err
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    authService.clearToken()
    token.value = null
  }

  return {
    token,
    loading,
    error,
    isAuthenticated,
    username,
    tokenExpiry,
    isTokenExpired,
    init,
    register,
    login,
    logout,
  }
})
