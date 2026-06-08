import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authService, type AuthCredentials } from '@/services/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(authService.getToken())
  const refreshToken = ref<string | null>(authService.getRefreshToken())
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() =>
    authService.isAuthDisabled() || (!!token.value && !authService.isTokenExpired())
  )
  const username = computed(() => authService.getUsernameFromToken())
  const tokenExpiry = computed(() => authService.getTokenExpiryDate())
  const isTokenExpired = computed(() => {
    return authService.isTokenExpired()
  })

  const init = () => {
    token.value = authService.getToken()
    refreshToken.value = authService.getRefreshToken()
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
      authService.setTokens(result.access_token, result.refresh_token)
      token.value = result.access_token
      refreshToken.value = result.refresh_token
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Ошибка авторизации'
      throw err
    } finally {
      loading.value = false
    }
  }

  const refreshSession = async () => {
    try {
      const result = await authService.refreshAccessToken()
      token.value = result.access_token
      refreshToken.value = result.refresh_token
      return true
    } catch {
      logout()
      return false
    }
  }

  const logout = () => {
    authService.clearTokens()
    token.value = null
    refreshToken.value = null
  }

  return {
    token,
    refreshToken,
    loading,
    error,
    isAuthenticated,
    username,
    tokenExpiry,
    isTokenExpired,
    init,
    register,
    login,
    refreshSession,
    logout,
  }
})
