<template>
  <header class="events-header">
    <div class="header-container">
      <div class="logo-section">
        <RouterLink :to="homeLink" class="logo-link">
          <img
            v-if="!logoLoadError"
            src="/vibechain-logo.svg"
            alt="VibeChain"
            class="logo-image"
            @error="logoLoadError = true"
          />
          <div v-else class="logo-fallback" aria-hidden="true">V</div>
          <div class="logo-text-wrapper">
            <h1 class="logo-text">VibeChain</h1>
            <span class="logo-subtitle">События Алматы</span>
          </div>
        </RouterLink>
      </div>

      <nav class="main-nav">
        <RouterLink 
          to="/movies"
          :class="['nav-link', { active: isMoviesActive }]"
        >
          Фильмы
        </RouterLink>
        <RouterLink 
          to="/concerts" 
          :class="['nav-link', { active: isConcertsActive }]"
        >
          Концерты
        </RouterLink>
        <RouterLink 
          to="/theatre" 
          :class="['nav-link', { active: isTheatreActive }]"
        >
          Театр
        </RouterLink>
        <RouterLink 
          to="/standups" 
          :class="['nav-link', { active: isStandupsActive }]"
        >
          Стендапы
        </RouterLink>
        <RouterLink
          to="/map"
          :class="['nav-link', { active: isMapActive }]"
        >
          Карта
        </RouterLink>
        <RouterLink
          v-if="isAuthenticated"
          to="/nft"
          :class="['nav-link', { active: isNftActive }]"
        >
        
          Мои NFT
        </RouterLink>
        <RouterLink
          v-if="isAuthenticated"
          to="/profile"
          :class="['nav-link', { active: isProfileActive }]"
        >
          Профиль
        </RouterLink>
      </nav>

      <div class="header-actions">
        <form class="event-search" @submit.prevent="submitEventSearch">
          <input
            v-model.trim="eventQuery"
            type="text"
            class="event-search-input"
            placeholder="Поиск события..."
          />
          <button type="submit" class="event-search-btn">Найти</button>
        </form>

        <div v-if="!isAuthenticated" class="auth-links">
          <RouterLink to="/login" class="auth-link">Войти</RouterLink>
          <RouterLink to="/register" class="auth-link auth-link-primary">Регистрация</RouterLink>
        </div>
        <button 
          class="connect-wallet-btn" 
          :class="{ 'connected': isConnected, 'connecting': isConnecting }"
          @click="handleConnectWallet"
          :disabled="!isAuthenticated || isConnecting"
        >
          <span v-if="!isAuthenticated" class="btn-content">
            Войдите, чтобы подключить кошелек
          </span>
          <span v-else-if="isConnecting" class="btn-content">
            Подключение...
          </span>
          <span v-else-if="!isConnected" class="btn-content">
            {{ isWalletInstalled ? 'Подключить кошелек' : 'Установить MetaMask' }}
          </span>
          <span v-else class="btn-content connected-content">
            <span class="wallet-address">{{ truncatedAddress }}</span>
            <span class="wallet-badge">Подключено</span>
          </span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useWalletStore } from '../stores/wallet'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const walletStore = useWalletStore()
const { isConnected, isConnecting, truncatedAddress, isWalletInstalled, error } = storeToRefs(walletStore)
const { isAuthenticated } = storeToRefs(useAuthStore())
const homeLink = computed(() => (isAuthenticated.value ? '/movies' : '/register'))
const eventQuery = ref('')
const logoLoadError = ref(false)

const detailType = computed(() =>
  route.name === 'event-detail' ? String(route.params.type || '') : '',
)
const isMoviesActive = computed(() => route.path.startsWith('/movies') || detailType.value === 'movie')
const isMapActive = computed(() => route.path.startsWith('/map'))
const isConcertsActive = computed(() => route.path.startsWith('/concerts') || detailType.value === 'concert')
const isTheatreActive = computed(() => route.path.startsWith('/theatre') || detailType.value === 'theatre')
const isStandupsActive = computed(() => route.path.startsWith('/standups') || detailType.value === 'standup')
const isNftActive = computed(() => route.path.startsWith('/nft'))
const isProfileActive = computed(() => route.path.startsWith('/profile') || route.path.startsWith('/users/'))

const handleConnectWallet = async () => {
  if (!isAuthenticated.value) {
    alert('Сначала войдите в аккаунт')
    return
  }

  try {
    if (isConnected.value) {
      await walletStore.disconnect()
    } else {
      await walletStore.connect()
      if (error.value) {
        alert(error.value)
      }
    }
  } catch (err: any) {
    console.error('Ошибка подключения кошелька:', err)
    const errorMessage = error.value || err.message || 'Не удалось подключить кошелек'
    alert(errorMessage)
  }
}

const submitEventSearch = () => {
  const value = eventQuery.value.trim()
  if (!value) {
    router.push('/search')
    return
  }
  router.push({ path: '/search', query: { q: value } })
}

onMounted(() => {
  walletStore.init()
})
</script>

<style scoped>
.events-header {
  background:
    linear-gradient(120deg, rgba(9, 14, 32, 0.95), rgba(12, 18, 40, 0.95)),
    radial-gradient(circle at 14% 0%, rgba(125, 77, 255, 0.22), transparent 35%),
    radial-gradient(circle at 88% 22%, rgba(79, 157, 255, 0.2), transparent 35%);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(7px);
  position: sticky;
  top: 0;
  z-index: 1200;
  width: 100%;
  border-bottom: 1px solid rgba(164, 178, 237, 0.22);
}

.header-container {
  width: min(1420px, 96vw);
  margin: 0 auto;
  padding: 0.78rem 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.logo-section {
  flex-shrink: 0;
}

.logo-link {
  display: flex;
  align-items: center;
  gap: 0.62rem;
  text-decoration: none;
  color: #f3f6ff;
  transition: transform 0.2s, opacity 0.2s;
}

.logo-link:hover {
  opacity: 0.95;
  transform: scale(1.02);
}

.logo-text-wrapper {
  display: flex;
  flex-direction: column;
}

.logo-image {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  object-fit: cover;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.38);
  border: 1px solid rgba(255, 255, 255, 0.22);
}

.logo-fallback {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.05rem;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.24);
  background:
    radial-gradient(circle at 26% 20%, rgba(245, 93, 212, 0.88), transparent 55%),
    radial-gradient(circle at 80% 84%, rgba(255, 171, 56, 0.9), transparent 55%),
    linear-gradient(145deg, #41145e 0%, #120c34 75%);
}

.logo-text {
  margin: 0;
  font-size: 1.9rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  font-family: 'Sora', sans-serif;
}

.logo-subtitle {
  font-size: 0.75rem;
  color: #a8b4de;
  font-weight: 500;
  margin-top: 0.125rem;
  letter-spacing: 0.02em;
}

.main-nav {
  display: flex;
  gap: 0.2rem;
  flex: 1;
  justify-content: center;
  align-items: center;
  flex-wrap: nowrap;
  min-width: 0;
  overflow: hidden;
  scrollbar-width: none;
}

.main-nav::-webkit-scrollbar {
  display: none;
}

.nav-link {
  color: #d6defd;
  text-decoration: none;
  font-weight: 600;
  padding: 0.44rem 0.66rem;
  border-radius: 999px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  font-size: 0.84rem;
  white-space: nowrap;
  border: 1px solid transparent;
}

.nav-link:hover {
  color: #f1f4ff;
  border-color: rgba(164, 178, 237, 0.35);
  background: rgba(255, 255, 255, 0.05);
}

.nav-link.active {
  background: linear-gradient(120deg, rgba(125, 77, 255, 0.95), rgba(81, 95, 255, 0.95));
  border-color: transparent;
  color: #fff;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-shrink: 0;
}

.event-search {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid rgba(164, 178, 237, 0.3);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  padding: 0.22rem;
}

.event-search-input {
  width: 146px;
  border: none;
  background: transparent;
  color: #eef3ff;
  padding: 0.42rem 0.62rem;
  font-size: 0.8rem;
}

.event-search-input::placeholder {
  color: #9aabda;
}

.event-search-input:focus {
  outline: none;
}

.event-search-btn {
  border: none;
  border-radius: 999px;
  background: linear-gradient(120deg, rgba(125, 77, 255, 0.95), rgba(81, 95, 255, 0.95));
  color: #fff;
  padding: 0.42rem 0.72rem;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
}

.auth-links {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.auth-link {
  color: #ebefff;
  text-decoration: none;
  border: 1px solid rgba(164, 178, 237, 0.35);
  padding: 0.42rem 0.72rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.auth-link:hover {
  background: rgba(255, 255, 255, 0.08);
}

.auth-link-primary {
  background: linear-gradient(120deg, rgba(125, 77, 255, 0.95), rgba(81, 95, 255, 0.95));
  border-color: transparent;
}

.connect-wallet-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #ebefff;
  border: 1px solid rgba(164, 178, 237, 0.35);
  padding: 0.5rem 0.92rem;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.79rem;
  display: flex;
  align-items: center;
}

.connect-wallet-btn:hover {
  background: rgba(255, 255, 255, 0.14);
}

.connect-wallet-btn.connected {
  background: rgba(255, 255, 255, 0.94);
  color: #2f3c74;
  border-color: transparent;
}

.connect-wallet-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.connect-wallet-btn.connecting {
  opacity: 0.8;
}

.btn-content {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.connected-content {
  gap: 0.75rem;
}

.wallet-address {
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  color: #5462b7;
}

.wallet-badge {
  background: #17b77f;
  color: white;
  padding: 0.22rem 0.56rem;
  border-radius: 6px;
  font-size: 0.68rem;
  font-weight: 600;
  white-space: nowrap;
}

@media (max-width: 1280px) {
  .header-container {
    width: min(1240px, 94vw);
    gap: 0.6rem;
  }

  .logo-text {
    font-size: 1.55rem;
  }

  .logo-image,
  .logo-fallback {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }

  .nav-link {
    font-size: 0.78rem;
    padding: 0.4rem 0.58rem;
  }

  .event-search-input {
    width: 120px;
  }

  .auth-link,
  .connect-wallet-btn {
    font-size: 0.74rem;
  }
}

@media (max-width: 1120px) {
  .header-container {
    width: min(1240px, 95vw);
    padding: 0.72rem 0;
    flex-wrap: wrap;
    row-gap: 0.58rem;
  }

  .main-nav {
    order: 3;
    width: 100%;
    justify-content: flex-start;
    overflow-x: auto;
    margin-top: 0.12rem;
    padding-top: 0.45rem;
    border-top: 1px solid rgba(164, 178, 237, 0.2);
  }

  .header-actions {
    margin-left: auto;
  }
}

@media (max-width: 768px) {
  .header-container {
    width: min(1240px, 95vw);
    padding: 0.7rem 0;
    flex-wrap: wrap;
    row-gap: 0.6rem;
  }

  .logo-text {
    font-size: 1.35rem;
  }

  .logo-image,
  .logo-fallback {
    width: 32px;
    height: 32px;
    border-radius: 9px;
  }

  .logo-subtitle {
    font-size: 0.65rem;
  }

  .main-nav {
    order: 3;
    width: 100%;
    justify-content: flex-start;
    margin-top: 0.2rem;
    padding-top: 0.45rem;
    border-top: 1px solid rgba(164, 178, 237, 0.2);
  }

  .connect-wallet-btn {
    padding: 0.45rem 0.76rem;
  }

  .auth-link {
    padding: 0.4rem 0.62rem;
  }

  .wallet-address {
    display: none;
  }

  .event-search {
    flex: 1;
    min-width: 0;
  }

  .event-search-input {
    width: 100%;
  }

  .wallet-badge {
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
  }
}

@media (max-width: 480px) {
  .header-container {
    width: min(1240px, 96vw);
    padding: 0.56rem 0;
  }

  .logo-text-wrapper {
    display: flex;
  }

  .logo-image,
  .logo-fallback {
    width: 28px;
    height: 28px;
    border-radius: 8px;
  }

  .logo-subtitle {
    display: none;
  }

  .connect-wallet-btn .btn-content {
    font-size: 0.72rem;
  }

  .connect-wallet-btn {
    padding: 0.4rem 0.55rem;
    min-width: 42px;
    justify-content: center;
  }

  .auth-links {
    display: none;
  }
}
</style>
