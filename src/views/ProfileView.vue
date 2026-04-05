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
            <span class="value">{{ authStore.username || profileMock.username }}</span>
          </div>
          <div class="row">
            <span class="label">Имя</span>
            <span class="value">{{ profileMock.firstName }}</span>
          </div>
          <div class="row">
            <span class="label">Фамилия</span>
            <span class="value">{{ profileMock.lastName }}</span>
          </div>
          <div class="row">
            <span class="label">Город</span>
            <span class="value">{{ profileMock.city }}</span>
          </div>
          <div class="row">
            <span class="label">Email</span>
            <span class="value">{{ profileMock.email }}</span>
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
              {{ walletStore.isConnected ? walletStore.truncatedAddress : '—' }}
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
              <span>{{ profileMock.levelProgress }}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: `${profileMock.levelProgress}%` }"></div>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-value">{{ profileMock.nftCount }}</span>
              <span class="stat-label">NFT</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ profileMock.visitedEvents }}</span>
              <span class="stat-label">Посещено</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ profileMock.rareNftCount }}</span>
              <span class="stat-label">Редкие NFT</span>
            </div>
          </div>

          <div class="achievements">
            <p class="achievements-title">Последние достижения</p>
            <ul>
              <li v-for="item in profileMock.achievements" :key="item">{{ item }}</li>
            </ul>
          </div>
        </section>
      </div>

      <div class="actions">
        <button class="action-btn secondary" @click="goToNft">Перейти в Мои NFT</button>
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
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'

const router = useRouter()
const authStore = useAuthStore()
const walletStore = useWalletStore()

const profileMock = {
  username: 'pyro',
  firstName: 'Пиро',
  lastName: 'Аманов',
  city: 'Алматы',
  email: 'pyro@example.com',
  nftCount: 12,
  visitedEvents: 27,
  rareNftCount: 3,
  levelProgress: 68,
  achievements: ['Коллекционер недели', '10 посещенных концертов', 'Первый редкий NFT'],
}

const formattedExpiry = computed(() => {
  if (!authStore.tokenExpiry) return 'Неизвестно'
  return authStore.tokenExpiry.toLocaleString('ru-RU')
})

const levelLabel = computed(() => {
  if (profileMock.nftCount >= 20) return 'Легенда'
  if (profileMock.nftCount >= 10) return 'Коллекционер'
  return 'Новичок'
})

const goToNft = () => {
  router.push('/nft')
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
