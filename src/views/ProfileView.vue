<template>
  <div class="profile-view">
    <div class="container">
      <div class="page-header">
        <h2 class="page-title">Профиль</h2>
        <p class="page-subtitle">Аккаунт, кошелек и NFT-прогресс</p>
      </div>

      <div class="profile-grid">
        <section class="profile-card account-card">
          <h3 class="card-title">Основная информация</h3>
          <div class="row">
            <span class="label">Логин</span>
            <span class="value">{{ profile?.username || authStore.username || '—' }}</span>
          </div>
          <div class="row">
            <span class="label">ID пользователя</span>
            <span class="value">{{ profile?.id ?? '—' }}</span>
          </div>
          <div class="row">
            <span class="label">Email</span>
            <span class="value">{{ profile?.email || 'Не указан' }}</span>
          </div>
          <div class="row">
            <span class="label">Тип кошелька</span>
            <span class="value">{{ profile?.wallet_type || '—' }}</span>
          </div>
          <div class="row">
            <span class="label">Статус сессии</span>
            <span class="value" :class="authStore.isTokenExpired ? 'danger' : 'ok'">
              {{ authStore.isTokenExpired ? 'Токен истек' : 'Активна' }}
            </span>
          </div>
          <div class="row">
            <span class="label">Токен до</span>
            <span class="value">{{ formattedExpiry }}</span>
          </div>
        </section>

        <section class="profile-card wallet-card">
          <h3 class="card-title">Кошелек</h3>
          <div class="row">
            <span class="label">MetaMask</span>
            <span class="value" :class="walletStore.isWalletInstalled ? 'ok' : 'danger'">
              {{ walletStore.isWalletInstalled ? 'Установлен' : 'Не установлен' }}
            </span>
          </div>
          <div class="row">
            <span class="label">Подключение</span>
            <span class="value" :class="walletStore.isConnected ? 'ok' : 'danger'">
              {{ walletStore.isConnected ? 'Подключен' : 'Не подключен' }}
            </span>
          </div>
          <div class="row">
            <span class="label">Адрес</span>
            <span class="value mono">
              {{ walletAddressPreview }}
            </span>
          </div>
        </section>

        <section class="profile-card level-card">
          <div class="level-head">
            <h3 class="card-title">Уровень и достижения</h3>
            <span class="level-badge">{{ levelLabel }}</span>
          </div>

          <div class="progress-wrap">
            <div class="progress-meta">
              <span>Прогресс до следующего уровня</span>
              <span>{{ progressPercent }}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-value">{{ profile?.nft_count ?? 0 }}</span>
              <span class="stat-label">NFT</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ profile?.events_attended ?? 0 }}</span>
              <span class="stat-label">Посещено</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ profile?.explorer_points ?? 0 }}</span>
              <span class="stat-label">Очки</span>
            </div>
          </div>

          <div class="achievements">
            <p class="achievements-title">Социальная статистика</p>
            <ul>
              <li>Подписчики: {{ profile?.followers_count ?? 0 }}</li>
              <li>Подписки: {{ profile?.following_count ?? 0 }}</li>
              <li>Уровень: {{ profile?.explorer_level || '—' }}</li>
            </ul>
          </div>
        </section>
      </div>

        <p v-if="loadingProfile" class="status-note">Загружаем профиль...</p>
        <p v-if="profileError" class="status-note error-note">{{ profileError }}</p>

      <div class="actions">
        <button class="action-btn secondary" @click="goToSearch">Поиск людей и событий</button>
        <button class="action-btn secondary" @click="goToNft">Перейти в Мои NFT</button>
        <button class="action-btn secondary" @click="goToFollowers">Мои подписчики</button>
        <button class="action-btn secondary" @click="goToFollowing">Мои подписки</button>
        <button
          class="action-btn"
          :disabled="walletStore.isConnecting || !walletStore.isWalletInstalled"
          @click="handleWalletToggle"
        >
          {{
            walletStore.isConnecting
              ? 'Подключение...'
              : walletStore.isConnected
                ? 'Отключить кошелек'
                : 'Подключить кошелек'
          }}
        </button>
        <button class="action-btn danger" @click="logout">Выйти из аккаунта</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useWalletStore } from '../stores/wallet'
import { apiService, type OwnProfile } from '@/services/api'

const router = useRouter()
const authStore = useAuthStore()
const walletStore = useWalletStore()

const profile = ref<OwnProfile | null>(null)
const loadingProfile = ref(false)
const profileError = ref<string | null>(null)

const formattedExpiry = computed(() => {
  if (!authStore.tokenExpiry) return 'Неизвестно'
  return authStore.tokenExpiry.toLocaleString('ru-RU')
})

const walletAddressPreview = computed(() => {
  const address = profile.value?.external_wallet_address || profile.value?.wallet_address
  if (!address) {
    return walletStore.isConnected ? walletStore.truncatedAddress : '—'
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`
})

const progressPercent = computed(() => {
  const points = profile.value?.explorer_points ?? 0
  return Math.min(100, Math.max(0, points % 100))
})

const levelLabel = computed(() => {
  const level = (profile.value?.explorer_level || '').toLowerCase()
  if (level.includes('legend')) return 'Легенда'
  if (level.includes('collector')) return 'Коллекционер'
  if (profile.value?.nft_count && profile.value.nft_count >= 10) return 'Коллекционер'
  return 'Исследователь'
})

const loadProfile = async () => {
  loadingProfile.value = true
  profileError.value = null

  try {
    profile.value = await apiService.getMyProfile()
  } catch (error) {
    profileError.value = error instanceof Error ? error.message : 'Не удалось загрузить профиль'
  } finally {
    loadingProfile.value = false
  }
}

const goToNft = () => {
  router.push('/nft')
}

const goToSearch = () => {
  router.push('/search')
}

const goToFollowers = () => {
  router.push('/followers')
}

const goToFollowing = () => {
  router.push('/following')
}

const handleWalletToggle = async () => {
  if (walletStore.isConnected) {
    await walletStore.disconnect()
    return
  }
  await walletStore.connect()
}

const logout = async () => {
  if (walletStore.isConnected) {
    await walletStore.disconnect()
  }
  authStore.logout()
  router.push('/login')
}

onMounted(() => {
  loadProfile()
})
</script>

<style scoped>
.profile-view {
  min-height: calc(100vh - 80px);
  background: linear-gradient(to bottom, #f5f7fa 0%, #ffffff 100%);
  padding: 2rem 0;
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
  font-size: 2.3rem;
  font-weight: 700;
  color: #1a202c;
  margin: 0 0 0.75rem 0;
}

.page-subtitle {
  color: #718096;
  margin: 0;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 1rem;
}

.profile-card {
  background: #fff;
  border-radius: 12px;
  padding: 1.35rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  border: 1px solid #eef2f7;
}

.card-title {
  margin: 0 0 0.9rem 0;
  font-size: 1.1rem;
  color: #1a202c;
  font-weight: 700;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #edf2f7;
}

.row:last-child {
  border-bottom: none;
}

.label {
  color: #4a5568;
  font-weight: 500;
}

.value {
  color: #1a202c;
  text-align: right;
}

.mono {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

.ok {
  color: #2f855a;
  font-weight: 600;
}

.danger {
  color: #c53030;
  font-weight: 600;
}

.level-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.level-badge {
  background: #667eea;
  color: #fff;
  font-size: 0.75rem;
  border-radius: 999px;
  padding: 0.3rem 0.7rem;
  font-weight: 700;
}

.progress-wrap {
  margin: 0.5rem 0 1rem;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  color: #4a5568;
  font-size: 0.85rem;
  margin-bottom: 0.4rem;
}

.progress-track {
  width: 100%;
  height: 10px;
  background: #edf2f7;
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.stat-item {
  background: #f8fafc;
  border-radius: 10px;
  padding: 0.75rem 0.5rem;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.1rem;
  font-weight: 700;
  color: #1a202c;
}

.stat-label {
  font-size: 0.75rem;
  color: #4a5568;
}

.achievements-title {
  margin: 0 0 0.45rem;
  color: #1a202c;
  font-weight: 600;
}

.achievements ul {
  margin: 0;
  padding-left: 1.1rem;
  color: #4a5568;
}

.achievements li {
  margin-bottom: 0.35rem;
}

.actions {
  margin-top: 1.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.status-note {
  margin-top: 0.9rem;
  color: #4a5568;
}

.error-note {
  color: #c53030;
}

.action-btn {
  border: none;
  border-radius: 8px;
  padding: 0.7rem 1rem;
  font-weight: 600;
  background: #667eea;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  background: #5568d3;
}

.action-btn.secondary {
  background: #4a5568;
}

.action-btn.secondary:hover:not(:disabled) {
  background: #3a4658;
}

.action-btn.danger {
  background: #e53e3e;
}

.action-btn.danger:hover:not(:disabled) {
  background: #c53030;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>