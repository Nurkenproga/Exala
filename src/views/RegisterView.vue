<template>
  <div class="auth-view">
    <div class="container">
      <div class="page-header">
        <h2 class="page-title">Регистрация</h2>
        <p class="page-subtitle">Создайте аккаунт для входа в систему</p>
      </div>

      <div class="auth-card">
        <template v-if="!isSuccess">
        <form class="auth-form" @submit.prevent="handleSubmit">
          <label class="field">
            <span>Логин</span>
            <input
              v-model.trim="form.username"
              type="text"
              required
              autocomplete="username"
              placeholder="Придумайте логин"
            />
          </label>

          <label class="field">
            <span>Пароль</span>
            <input v-model="form.password" type="password" required autocomplete="new-password" />
          </label>

          <label class="field">
            <span>Повторите пароль</span>
            <input v-model="confirmPassword" type="password" required autocomplete="new-password" />
          </label>

          <p v-if="localError || authStore.error" class="error">{{ localError || authStore.error }}</p>

          <button type="submit" :disabled="authStore.loading">
            {{ authStore.loading ? 'Регистрируем...' : 'Зарегистрироваться' }}
          </button>
        </form>

        <p class="switch-link">
          Уже есть аккаунт?
          <RouterLink to="/login">Войти</RouterLink>
        </p>
        </template>

        <div v-else class="success-box">
          <div class="success-icon">✓</div>
          <h2>Успешно!</h2>
          <p>Аккаунт создан. Перенаправляем на страницу входа...</p>
          <RouterLink to="/login" class="success-link">Перейти сейчас</RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const form = reactive({
  username: '',
  password: '',
})
const confirmPassword = ref('')
const localError = ref<string | null>(null)
const isSuccess = ref(false)
let successTimer: number | null = null

const handleSubmit = async () => {
  localError.value = null
  const normalizedUsername = form.username.trim()
  if (!normalizedUsername) {
    localError.value = 'Введите username'
    return
  }

  if (form.password !== confirmPassword.value) {
    localError.value = 'Пароли не совпадают'
    return
  }

  try {
    const payload = {
      username: normalizedUsername,
      password: form.password,
    }
    await authStore.register(payload)
    isSuccess.value = true
    successTimer = window.setTimeout(() => {
      router.push({ path: '/login', query: { redirect: '/movies' } })
    }, 1400)
  } catch {
    // error text shown from store
  }
}

onUnmounted(() => {
  if (successTimer) {
    clearTimeout(successTimer)
  }
})
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
  max-width: 460px;
  margin: 0 auto;
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

.success-box {
  text-align: center;
  display: grid;
  gap: 0.75rem;
}

.success-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #dcfce7;
  color: #15803d;
  font-size: 2rem;
  font-weight: 700;
}

.success-box h2 {
  margin: 0.25rem 0 0;
}

.success-box p {
  margin: 0;
  color: #4b5563;
}

.success-link {
  display: inline-block;
  margin-top: 0.5rem;
  color: #4f46e5;
  font-weight: 700;
  text-decoration: none;
}
</style>
