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

          <div class="profile-stats-grid">
            <div class="profile-stat-card">
              <span class="profile-stat-value">{{ profile?.nft_count ?? 0 }}</span>
              <span class="profile-stat-label">NFT</span>
            </div>
            <div class="profile-stat-card">
              <span class="profile-stat-value">{{ profile?.events_attended ?? 0 }}</span>
              <span class="profile-stat-label">Посещено</span>
            </div>
            <div class="profile-stat-card">
              <span class="profile-stat-value">{{ profile?.explorer_points ?? 0 }}</span>
              <span class="profile-stat-label">Очки</span>
            </div>
          </div>

          <div class="achievements">
            <p class="achievements-title">Социальная статистика</p>
            <ul>
              <li>Подписчики: {{ profile?.followers_count ?? 0 }}</li>
              <li>Подписки: {{ profile?.following_count ?? 0 }}</li>
              <li>Уровень: {{ levelLabel }}</li>
            </ul>
          </div>
        </section>
      </div>

      <section class="profile-card leaderboard-card">
        <div class="leaderboard-head">
          <h3 class="card-title">Лидерборд</h3>
          <button class="mini-btn" :disabled="loadingLeaderboard" @click="loadLeaderboard">
            {{ loadingLeaderboard ? 'Обновляем...' : 'Обновить' }}
          </button>
        </div>

        <p v-if="loadingLeaderboard" class="leaderboard-note">Загрузка лидерборда...</p>
        <p v-else-if="leaderboardError" class="leaderboard-note danger">{{ leaderboardError }}</p>

        <ol v-else-if="leaderboard.length" class="leaderboard-list">
          <li
            v-for="(user, index) in leaderboard"
            :key="`${user.id ?? 'no-id'}-${user.username}-${index}`"
            class="leaderboard-item"
            :class="{ 'is-me': isCurrentUser(user.username) }"
          >
            <div class="leaderboard-left">
              <span class="leader-rank" :class="rankClass(index + 1)">#{{ index + 1 }}</span>
              <div class="leader-meta">
                <button
                  class="leader-name"
                  :disabled="!canOpenUserProfile(user)"
                  @click="openUserProfile(user.id)"
                >
                  {{ user.username }}
                </button>
                <span class="leader-extra">
                  NFT: {{ user.nft_count ?? 0 }} | Посещено: {{ user.events_attended ?? 0 }}
                </span>
              </div>
            </div>
            <div class="leaderboard-right">
              <span class="leader-points">{{ user.explorer_points || 0 }} очков</span>
              <span class="leader-level">{{ user.explorer_level || '—' }}</span>
            </div>
          </li>
        </ol>

        <p v-else class="leaderboard-note">Лидерборд пока пуст</p>
      </section>

        <p v-if="loadingProfile" class="status-note">Загружаем профиль...</p>
        <p v-if="profileError" class="status-note error-note">{{ profileError }}</p>

      <div class="actions">
        <button class="action-btn secondary" @click="goToSearch">Поиск событий</button>
        <button class="action-btn secondary" @click="goToNft">Перейти в Мои NFT</button>
        <button class="action-btn secondary" @click="goToCommunity">Сообщество</button>
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
import { apiService, type LeaderboardEntry, type OwnProfile } from '@/services/api'

const router = useRouter()
const authStore = useAuthStore()
const walletStore = useWalletStore()

const profile = ref<OwnProfile | null>(null)
const loadingProfile = ref(false)
const profileError = ref<string | null>(null)
const leaderboard = ref<LeaderboardEntry[]>([])
const loadingLeaderboard = ref(false)
const leaderboardError = ref<string | null>(null)

const walletAddressPreview = computed(() => {
  const address = profile.value?.external_wallet_address || profile.value?.wallet_address
  if (!address) {
    return walletStore.isConnected ? walletStore.truncatedAddress : '—'
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`
})

const pointsValue = computed(() => Math.max(0, profile.value?.explorer_points ?? 0))

const levelLabel = computed(() => {
  const points = pointsValue.value
  if (points >= 500) return 'Легенда'
  if (points >= 100) return 'Пионер'
  return 'Исследователь'
})

const progressPercent = computed(() => {
  const points = pointsValue.value

  if (points < 100) {
    return points
  }

  if (points < 500) {
    return Math.round(((points - 100) / 400) * 100)
  }

  return 100
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

const loadLeaderboard = async () => {
  loadingLeaderboard.value = true
  leaderboardError.value = null

  try {
    leaderboard.value = await apiService.getLeaderboard(10)
  } catch (error) {
    leaderboardError.value = error instanceof Error ? error.message : 'Не удалось загрузить лидерборд'
  } finally {
    loadingLeaderboard.value = false
  }
}

const goToNft = () => {
  router.push('/nft')
}

const goToSearch = () => {
  router.push('/search')
}

const goToCommunity = () => {
  router.push('/community')
}

const openUserProfile = (userId: number | null) => {
  if (typeof userId !== 'number' || !Number.isFinite(userId)) {
    leaderboardError.value = 'Профиль пользователя временно недоступен'
    return
  }
  router.push(`/users/${userId}`)
}

const canOpenUserProfile = (user: LeaderboardEntry) =>
  typeof user.id === 'number' && Number.isFinite(user.id)

const rankClass = (position: number) => {
  if (position === 1) return 'gold'
  if (position === 2) return 'silver'
  if (position === 3) return 'bronze'
  return ''
}

const isCurrentUser = (username: string) => {
  if (!profile.value?.username) return false
  return profile.value.username === username
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
  loadLeaderboard()
})
</script>

<style scoped>
.profile-view {
  min-height: calc(100vh - 80px);
  background:
    radial-gradient(circle at 12% 0%, rgba(125, 77, 255, 0.2), transparent 34%),
    radial-gradient(circle at 88% 20%, rgba(72, 146, 255, 0.18), transparent 34%),
    linear-gradient(180deg, #080d1f 0%, #060914 58%, #05070f 100%);
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
  font-weight: 800;
  color: #f3f7ff;
  margin: 0 0 0.75rem 0;
}

.page-subtitle {
  color: #a9b8e5;
  margin: 0;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 1rem;
}

.profile-card {
  background: linear-gradient(180deg, rgba(15, 20, 40, 0.95), rgba(8, 12, 25, 0.94));
  border-radius: 16px;
  padding: 1.35rem;
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(166, 180, 237, 0.2);
  backdrop-filter: blur(4px);
}

.card-title {
  margin: 0 0 0.9rem 0;
  font-size: 1.1rem;
  color: #edf2ff;
  font-weight: 700;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(166, 180, 237, 0.16);
}

.row:last-child {
  border-bottom: none;
}

.label {
  color: #9fb0df;
  font-weight: 500;
}

.value {
  color: #ecf2ff;
  text-align: right;
}

.mono {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

.ok {
  color: #5ee39a;
  font-weight: 600;
}

.danger {
  color: #ff8ea1;
  font-weight: 600;
}

.level-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.level-badge {
  background: linear-gradient(120deg, #7d4dff, #6a6cff);
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
  color: #a9b9e5;
  font-size: 0.85rem;
  margin-bottom: 0.4rem;
}

.progress-track {
  width: 100%;
  height: 10px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #5f7dff 0%, #7d4dff 100%);
}

.profile-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(110px, 1fr));
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.profile-stat-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(166, 180, 237, 0.2);
  border-radius: 12px;
  padding: 0.75rem 0.5rem;
  text-align: center;
  min-height: 84px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.profile-stat-value {
  display: block;
  font-size: 1.1rem;
  font-weight: 700;
  color: #f3f7ff;
}

.profile-stat-label {
  font-size: 0.75rem;
  color: #a3b4e2;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.achievements-title {
  margin: 0 0 0.45rem;
  color: #edf2ff;
  font-weight: 600;
}

.achievements ul {
  margin: 0;
  padding-left: 1.1rem;
  color: #a8b8e4;
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
  color: #a6b6e2;
}

.error-note {
  color: #c53030;
}

.action-btn {
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 0.7rem 1rem;
  font-weight: 600;
  background: linear-gradient(120deg, #7d4dff, #6a6cff);
  color: #fff;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(83, 103, 255, 0.35);
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(166, 180, 237, 0.28);
  color: #edf2ff;
}

.action-btn.secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.action-btn.danger {
  background: linear-gradient(120deg, #ff4f7a, #d33cff);
}

.action-btn.danger:hover:not(:disabled) {
  box-shadow: 0 8px 18px rgba(236, 61, 133, 0.35);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.leaderboard-card {
  margin-top: 1rem;
}

.leaderboard-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.mini-btn {
  border: 1px solid rgba(166, 180, 237, 0.3);
  background: rgba(255, 255, 255, 0.08);
  color: #ecf2ff;
  border-radius: 8px;
  padding: 0.4rem 0.7rem;
  font-weight: 600;
  cursor: pointer;
}

.mini-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.14);
}

.mini-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.leaderboard-note {
  margin: 0.35rem 0 0;
  color: #a6b6e2;
}

.leaderboard-list {
  margin: 0.8rem 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.55rem;
}

.leaderboard-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  border: 1px solid rgba(166, 180, 237, 0.22);
  border-radius: 12px;
  padding: 0.6rem 0.75rem;
  background: rgba(255, 255, 255, 0.05);
}

.leaderboard-item.is-me {
  border-color: rgba(95, 125, 255, 0.65);
  box-shadow: inset 0 0 0 1px rgba(95, 125, 255, 0.35);
}

.leaderboard-left {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.leaderboard-right {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  color: #a7b8e4;
  font-size: 0.9rem;
}

.leader-meta {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.leader-extra {
  color: #8fa1d3;
  font-size: 0.78rem;
}

.leader-rank {
  min-width: 2.2rem;
  text-align: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: #ecf2ff;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
}

.leader-rank.gold {
  background: linear-gradient(120deg, #ffd84d, #ffbf00);
  color: #3a2b00;
}

.leader-rank.silver {
  background: linear-gradient(120deg, #dce6f4, #b9c8dc);
  color: #1f2d42;
}

.leader-rank.bronze {
  background: linear-gradient(120deg, #f7b16b, #d4883f);
  color: #3a2309;
}

.leader-name {
  border: none;
  background: transparent;
  color: #edf2ff;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  text-align: left;
}

.leader-name:hover {
  text-decoration: underline;
}

.leader-name:disabled {
  color: #8fa1d3;
  cursor: not-allowed;
  text-decoration: none;
}

.leader-points {
  font-weight: 700;
  color: #f0f5ff;
}

.leader-level {
  text-transform: lowercase;
}

@media (max-width: 768px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }

  .profile-stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .leaderboard-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .leaderboard-right {
    width: 100%;
    justify-content: space-between;
  }
}
</style>