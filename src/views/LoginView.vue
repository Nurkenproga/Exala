<template>
  <div class="auth-view">
    <div class="container">
      <div class="page-header">
        <h2 class="page-title">Вход</h2>
        <p class="page-subtitle">Авторизуйтесь, чтобы продолжить</p>
      </div>

      <div class="auth-card">
        <form class="auth-form" @submit.prevent="handleSubmit">
          <label class="field">
            <span>Логин</span>
            <input
              v-model.trim="form.username"
              type="text"
              required
              autocomplete="username"
              placeholder="Введите логин"
            />
          </label>

          <label class="field">
            <span>Пароль</span>
            <input v-model="form.password" type="password" required autocomplete="current-password" />
          </label>

          <p v-if="localError || authStore.error" class="error">{{ localError || authStore.error }}</p>

          <button type="submit" :disabled="authStore.loading">
            {{ authStore.loading ? 'Входим...' : 'Войти' }}
          </button>
        </form>

        <p class="switch-link">
          Нет аккаунта?
          <RouterLink to="/register">Зарегистрироваться</RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive({
  username: '',
  password: '',
})
const localError = ref<string | null>(null)

const handleSubmit = async () => {
  localError.value = null
  const normalizedUsername = form.username.trim()
  if (!normalizedUsername) {
    localError.value = 'Введите username'
    return
  }

  try {
    await authStore.login({
      username: normalizedUsername,
      password: form.password,
    })
    const redirectTo = typeof route.query.redirect === 'string' ? route.query.redirect : '/movies'
    await router.push(redirectTo)
  } catch {
    // error text shown from store
  }
}
</script>

<style scoped>
.auth-view {
  min-height: calc(100vh - 80px);
  padding: 2rem 0;
  background: linear-gradient(to bottom, #f5f7fa 0%, #ffffff 100%);
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2.25rem;
  font-weight: 700;
  color: #1a202c;
  margin: 0 0 0.75rem;
}

.page-subtitle {
  color: #718096;
  margin: 0;
}

.auth-card {
  width: min(100%, 460px);
  margin: 0 auto;
  max-width: 420px;
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.auth-form {
  display: grid;
  gap: 1rem;
}

.field {
  display: grid;
  gap: 0.35rem;
}

.field span {
  color: #4c51bf;
  font-size: 0.9rem;
  font-weight: 600;
}

input {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.75rem;
  font-size: 0.95rem;
  transition: border-color 0.2s ease;
}

input:focus {
  outline: none;
  border-color: #667eea;
}

button {
  border: none;
  border-radius: 8px;
  padding: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  background: #667eea;
  color: white;
  transition: background 0.2s ease;
}

button:hover:not(:disabled) {
  background: #5568d3;
}

button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.error {
  margin: 0;
  color: #b91c1c;
  font-size: 0.9rem;
}

.switch-link {
  margin: 1rem 0 0;
  color: #4b5563;
}

.switch-link a {
  color: #4f46e5;
  font-weight: 600;
}
</style>
