<template>
  <div class="profile-view">
    <div class="container">
      <div class="page-header">
        <h2 class="page-title">Профиль</h2>
        <p class="page-subtitle">Аккаунт, кошелек и NFT-прогресс</p>
      </div>

      <div class="profile-layout">
        <section class="profile-hero">
          <div class="hero-main">
            <div class="avatar-orb">{{ profileInitial }}</div>
            <div class="hero-copy">
              <span class="eyebrow">VibeChain ID #{{ profile?.id ?? '—' }}</span>
              <h3>{{ profile?.username || authStore.username || 'Пользователь' }}</h3>
              <p>{{ profile?.email || 'Email не указан' }}</p>
            </div>
          </div>

          <div class="hero-score">
            <span>{{ profile?.explorer_points ?? 0 }}</span>
            <small>очков</small>
          </div>

          <div class="hero-metrics">
            <div class="hero-metric">
              <strong>{{ profile?.nft_count ?? 0 }}</strong>
              <span>NFT</span>
            </div>
            <div class="hero-metric">
              <strong>{{ visitedEventsCount }}</strong>
              <span>событий</span>
            </div>
            <div class="hero-metric">
              <strong>{{ profile?.followers_count ?? 0 }}</strong>
              <span>подписчиков</span>
            </div>
            <div class="hero-metric">
              <strong>{{ profile?.following_count ?? 0 }}</strong>
              <span>подписок</span>
            </div>
          </div>
        </section>

        <aside class="profile-side">
          <section class="profile-panel level-panel">
            <div class="panel-head">
              <span>Уровень</span>
              <strong>{{ levelLabel }}</strong>
            </div>
            <div class="progress-wrap">
              <div class="progress-meta">
                <span>Прогресс</span>
                <span>{{ progressPercent }}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
              </div>
            </div>
            <p class="panel-note">Чек-ин на события дает очки, редкость NFT и прогресс уровня.</p>
          </section>

          <section class="profile-panel wallet-panel">
            <div class="panel-head">
              <span>Кошелек</span>
              <strong :class="walletStore.isConnected ? 'ok' : 'danger'">
                {{ walletStore.isConnected ? 'Подключен' : 'Отключен' }}
              </strong>
            </div>
            <div class="wallet-line">
              <span>MetaMask</span>
              <strong>{{ walletStore.isWalletInstalled ? 'Установлен' : 'Не найден' }}</strong>
            </div>
            <div class="wallet-line">
              <span>Тип</span>
              <strong>{{ profile?.wallet_type || '—' }}</strong>
            </div>
            <div class="wallet-address">
              <span>Адрес</span>
              <strong>{{ walletAddressPreview }}</strong>
            </div>
          </section>
        </aside>
      </div>

      <section class="leaderboard-card">
        <div class="leaderboard-head">
          <div>
            <h3 class="card-title">Топ-5 исследователей</h3>
            <p class="leaderboard-subtitle">Самые активные участники VibeChain</p>
          </div>
          <button class="mini-btn" :disabled="loadingLeaderboard" @click="loadLeaderboard">
            {{ loadingLeaderboard ? 'Обновляем...' : 'Обновить' }}
          </button>
        </div>

        <p v-if="loadingLeaderboard" class="leaderboard-note">Загрузка лидерборда...</p>
        <p v-else-if="leaderboardError" class="leaderboard-note danger">{{ leaderboardError }}</p>

        <div v-else-if="leaderboard.length" class="leaderboard-showcase">
          <div class="podium-grid">
            <article
              v-for="card in podiumCards"
              :key="`podium-${card.position}-${card.user.id ?? card.user.username}`"
              class="podium-card"
              :class="[`place-${card.position}`, { 'is-me': isCurrentUser(card.user.username) }]"
            >
              <div class="podium-profile">
                <button
                  class="podium-name"
                  :disabled="!canOpenUserProfile(card.user)"
                  @click="openUserProfile(card.user.id)"
                >
                  {{ card.user.username }}
                </button>
                <strong class="podium-points">{{ card.user.explorer_points || 0 }} очков</strong>
                <span class="podium-level">{{ card.user.explorer_level || '—' }}</span>
                <span class="podium-extra">
                  NFT: {{ card.user.nft_count ?? 0 }} · Посещено: {{ card.user.events_attended ?? 0 }}
                </span>
              </div>
              <div class="podium-step">
                <span class="podium-step-place">{{ card.position }}</span>
                <span class="podium-step-label">место</span>
              </div>
            </article>
          </div>

          <div v-if="otherLeaders.length" class="runner-grid">
            <article
              v-for="(user, index) in otherLeaders"
              :key="`runner-${user.id ?? 'no-id'}-${user.username}-${index}`"
              class="runner-card"
              :class="{ 'is-me': isCurrentUser(user.username) }"
            >
              <span class="runner-rank">#{{ index + 4 }}</span>
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
              <div class="runner-score">
                <span class="leader-points">{{ user.explorer_points || 0 }} очков</span>
                <span class="leader-level">{{ user.explorer_level || '—' }}</span>
              </div>
            </article>
          </div>
        </div>

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

const podiumCards = computed(() => {
  const cards: Array<{ user: LeaderboardEntry; position: number }> = []

  if (leaderboard.value[1]) cards.push({ user: leaderboard.value[1], position: 2 })
  if (leaderboard.value[0]) cards.push({ user: leaderboard.value[0], position: 1 })
  if (leaderboard.value[2]) cards.push({ user: leaderboard.value[2], position: 3 })

  return cards
})

const otherLeaders = computed(() => leaderboard.value.slice(3, 5))

const profileInitial = computed(() => {
  const name = profile.value?.username || authStore.username || 'V'
  return name.trim().charAt(0).toUpperCase()
})

const visitedEventsCount = computed(() =>
  Math.max(profile.value?.events_attended ?? 0, profile.value?.nft_count ?? 0)
)

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
    leaderboard.value = await apiService.getLeaderboard(5)
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

.profile-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
  gap: 1rem;
  align-items: stretch;
}

.profile-hero,
.profile-panel,
.leaderboard-card {
  border: 1px solid rgba(166, 180, 237, 0.16);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.025)),
    rgba(8, 12, 27, 0.86);
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(8px);
}

.profile-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: auto 1fr;
  gap: 1.5rem;
  overflow: hidden;
  border-radius: 28px;
  padding: 1.6rem;
}

.profile-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 18% 0%, rgba(125, 77, 255, 0.22), transparent 34%),
    radial-gradient(circle at 90% 15%, rgba(80, 202, 255, 0.12), transparent 28%);
  pointer-events: none;
}

.hero-main,
.hero-score,
.hero-metrics {
  position: relative;
  z-index: 1;
}

.hero-main {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar-orb {
  width: 5.5rem;
  height: 5.5rem;
  display: grid;
  place-items: center;
  border-radius: 28px;
  background:
    radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.38), transparent 22%),
    linear-gradient(135deg, #8f59ff, #3b7dff 52%, #18d0ff);
  color: #fff;
  font-size: 2.15rem;
  font-weight: 900;
  box-shadow: 0 20px 38px rgba(77, 93, 255, 0.3);
}

.hero-copy {
  min-width: 0;
}

.eyebrow {
  color: #91a4d4;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.hero-copy h3 {
  margin: 0.2rem 0 0.25rem;
  color: #f5f7ff;
  font-size: clamp(2rem, 4vw, 3.2rem);
  line-height: 1;
}

.hero-copy p {
  margin: 0;
  color: #aebdf0;
}

.hero-score {
  align-self: start;
  justify-self: end;
  min-width: 9rem;
  text-align: right;
}

.hero-score span {
  display: block;
  color: #f7f9ff;
  font-size: clamp(2.2rem, 5vw, 4rem);
  font-weight: 900;
  line-height: 0.92;
}

.hero-score small {
  color: #91a4d4;
  font-size: 1rem;
  font-weight: 700;
}

.hero-metrics {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.8rem;
  align-self: end;
}

.hero-metric {
  border-radius: 18px;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.055);
}

.hero-metric strong {
  display: block;
  color: #f7f9ff;
  font-size: 1.6rem;
  line-height: 1;
}

.hero-metric span {
  color: #93a5d7;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.profile-side {
  display: grid;
  gap: 1rem;
}

.profile-panel {
  border-radius: 24px;
  padding: 1.25rem;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.9rem;
}

.panel-head span,
.wallet-line span,
.wallet-address span {
  color: #91a4d4;
  font-weight: 700;
}

.panel-head strong {
  color: #f3f7ff;
  font-size: 1.1rem;
}

.panel-note {
  margin: 0.75rem 0 0;
  color: #91a4d4;
  line-height: 1.5;
}

.wallet-line,
.wallet-address {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 0.7rem;
  margin-top: 0.7rem;
  border-top: 1px solid rgba(166, 180, 237, 0.12);
}

.wallet-line strong,
.wallet-address strong {
  color: #edf2ff;
  text-align: right;
}

.wallet-address strong {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

.card-title {
  margin: 0 0 0.9rem 0;
  font-size: 1.1rem;
  color: #edf2ff;
  font-weight: 700;
}

.ok {
  color: #5ee39a;
  font-weight: 600;
}

.danger {
  color: #ff8ea1;
  font-weight: 600;
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

.actions {
  margin-top: 1.15rem;
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
  border-radius: 999px;
  padding: 0.78rem 1.15rem;
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
  position: relative;
  overflow: hidden;
  border-radius: 28px;
  padding: 1.6rem;
}

.leaderboard-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 12% 0%, rgba(121, 94, 255, 0.14), transparent 30%),
    radial-gradient(circle at 92% 0%, rgba(80, 202, 255, 0.08), transparent 26%);
}

.leaderboard-head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.leaderboard-subtitle {
  margin: 0.2rem 0 0;
  color: #91a4d4;
  font-size: 0.9rem;
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

.leaderboard-showcase {
  position: relative;
  z-index: 1;
  margin: 0.5rem 0 0;
  display: grid;
  gap: 1rem;
}

.podium-grid {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.15fr) minmax(0, 0.95fr);
  align-items: end;
  gap: 0;
  min-height: 20.5rem;
  padding: 1.3rem 1.8rem 0;
  background:
    radial-gradient(ellipse at 50% 95%, rgba(112, 92, 255, 0.14), transparent 45%);
}

.podium-grid::after {
  content: '';
  position: absolute;
  right: 2rem;
  bottom: 0;
  left: 2rem;
  height: 2.2rem;
  border-radius: 999px;
  background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.38), transparent 68%);
  pointer-events: none;
}

.podium-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  min-height: 19rem;
  padding: 0;
}

.podium-card::after {
  display: none;
}

.podium-card.place-1 {
  order: 2;
  z-index: 3;
  min-height: 20.5rem;
}

.podium-card.place-2 {
  order: 1;
  z-index: 2;
}

.podium-card.place-3 {
  order: 3;
  z-index: 1;
}

.podium-profile {
  position: relative;
  z-index: 2;
  width: min(100%, 16rem);
  min-height: 7rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 0.32rem;
  margin-bottom: 0.85rem;
  padding: 0;
  text-shadow: 0 6px 22px rgba(0, 0, 0, 0.42);
}

.podium-card.place-1 .podium-profile {
  min-height: 8rem;
}

.podium-step {
  position: relative;
  width: 100%;
  min-height: 7.8rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-bottom: none;
  border-radius: 26px 26px 0 0;
  background:
    linear-gradient(145deg, rgba(124, 139, 185, 0.36), rgba(31, 39, 70, 0.78)),
    #192038;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    inset 0 0 34px rgba(255, 255, 255, 0.04),
    0 18px 34px rgba(0, 0, 0, 0.22);
}

.podium-step::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.36;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.24), transparent);
}

.podium-card.place-1 .podium-step {
  min-height: 9.5rem;
  background:
    linear-gradient(145deg, rgba(213, 174, 91, 0.38), rgba(97, 73, 169, 0.28)),
    #251f45;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    inset 0 0 32px rgba(255, 216, 77, 0.07),
    0 22px 40px rgba(0, 0, 0, 0.26);
}

.podium-card.place-2 .podium-step {
  min-height: 7.6rem;
  background:
    linear-gradient(145deg, rgba(180, 198, 228, 0.34), rgba(49, 59, 92, 0.78)),
    #20283f;
}

.podium-card.place-3 .podium-step {
  min-height: 6.5rem;
  background:
    linear-gradient(145deg, rgba(195, 126, 82, 0.34), rgba(65, 50, 77, 0.78)),
    #251f38;
}

.podium-step-place {
  position: relative;
  z-index: 1;
  color: rgba(255, 255, 255, 0.88);
  font-size: clamp(3.5rem, 7vw, 6rem);
  font-weight: 900;
  line-height: 0.85;
  text-shadow: 0 10px 22px rgba(0, 0, 0, 0.22);
}

.podium-step-label {
  position: relative;
  z-index: 1;
  color: #aebdf0;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.runner-card.is-me {
  box-shadow:
    0 0 0 1px rgba(95, 125, 255, 0.42),
    0 20px 42px rgba(0, 0, 0, 0.24);
}

.podium-name,
.leader-name {
  border: none;
  background: transparent;
  color: #edf2ff;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  text-align: left;
}

.podium-name {
  position: relative;
  z-index: 1;
  max-width: 100%;
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 1.08rem;
  color: #aebfff;
}

.leader-name:hover {
  text-decoration: underline;
}

.podium-name:hover:not(:disabled),
.leader-name:hover:not(:disabled) {
  text-decoration: underline;
}

.podium-name:disabled,
.leader-name:disabled {
  color: #8fa1d3;
  cursor: not-allowed;
  text-decoration: none;
}

.podium-points {
  position: relative;
  z-index: 1;
  color: #f7f9ff;
  font-size: 1.55rem;
  line-height: 1;
}

.podium-level {
  position: relative;
  z-index: 1;
  color: #b7c6f4;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: lowercase;
}

.podium-extra {
  position: relative;
  z-index: 1;
  color: #91a4d4;
  font-size: 0.82rem;
  text-align: center;
}

.runner-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.runner-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.8rem;
  border: 1px solid rgba(166, 180, 237, 0.16);
  border-radius: 18px;
  padding: 0.85rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.065), rgba(255, 255, 255, 0.025));
}

.runner-rank {
  min-width: 2.65rem;
  text-align: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: #ecf2ff;
  font-weight: 800;
  padding: 0.32rem 0.6rem;
}

.leader-meta {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.leader-extra {
  color: #8fa1d3;
  font-size: 0.78rem;
}

.runner-score {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
  color: #a7b8e4;
  font-size: 0.9rem;
}

.leader-points {
  font-weight: 700;
  color: #f0f5ff;
}

.leader-level {
  text-transform: lowercase;
}

@media (max-width: 768px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }

  .profile-hero {
    grid-template-columns: 1fr;
  }

  .hero-main {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-score {
    justify-self: start;
    text-align: left;
  }

  .hero-metrics {
    grid-template-columns: 1fr;
  }

  .leaderboard-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .podium-grid,
  .runner-grid {
    grid-template-columns: 1fr;
  }

  .podium-grid {
    gap: 0.9rem;
    padding: 1rem;
  }

  .podium-card,
  .podium-card.place-1 {
    min-height: auto;
    order: initial;
  }

  .podium-step,
  .podium-card.place-1 .podium-step,
  .podium-card.place-2 .podium-step,
  .podium-card.place-3 .podium-step {
    min-height: 5.6rem;
  }

  .runner-card {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .runner-score {
    grid-column: 1 / -1;
    align-items: flex-start;
  }
}
</style>
