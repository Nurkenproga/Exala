<template>
  <header class="events-header">
    <div class="header-container">
      <div class="logo-section">
        <RouterLink to="/events" class="logo-link">
          <div class="logo-text-wrapper">
            <h1 class="logo-text">Exala</h1>
            <span class="logo-subtitle">События Алматы</span>
          </div>
        </RouterLink>
      </div>

      <nav class="main-nav">
        <RouterLink 
          to="/events" 
          class="nav-link" 
          active-class="active"
          exact-active-class="active"
        >
          События
        </RouterLink>
        <RouterLink 
          to="/movies" 
          class="nav-link" 
          active-class="active"
        >
          Movies
        </RouterLink>
        <RouterLink
          to="/map"
          class="nav-link"
          active-class="active"
        >
          Карта
        </RouterLink>
        <RouterLink 
          to="/concerts" 
          class="nav-link" 
          active-class="active"
        >
          Concerts
        </RouterLink>
        <RouterLink 
          to="/theatre" 
          class="nav-link" 
          active-class="active"
        >
          Theatre
        </RouterLink>
        <RouterLink 
          to="/standups" 
          class="nav-link" 
          active-class="active"
        >
          Standups
        </RouterLink>
        <RouterLink
          v-if="isAuthenticated"
          to="/nft"
          class="nav-link" 
          active-class="active"
        >
          Мои NFT
        </RouterLink>
        <RouterLink
          v-if="isAuthenticated"
          to="/profile"
          class="nav-link" 
          active-class="active"
        >
          Профиль
        </RouterLink>
      </nav>

      <div class="header-actions">
        <div v-if="!isAuthenticated" class="auth-links">
          <RouterLink to="/login" class="auth-link">Войти</RouterLink>
          <RouterLink to="/register" class="auth-link auth-link-primary">Регистрация</RouterLink>
        </div>
        <button
          v-if="isAuthenticated"
          class="auth-btn"
          @click="handleLogout"
        >
          Выйти
        </button>
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
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useWalletStore } from '../stores/wallet'
import { useAuthStore } from '../stores/auth'

const walletStore = useWalletStore()
const { isConnected, isConnecting, truncatedAddress, isWalletInstalled, error } = storeToRefs(walletStore)
const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)

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
    }
  } catch (err: any) {
    console.error('Ошибка подключения кошелька:', err)
    const errorMessage = error.value || err.message || 'Не удалось подключить кошелек'
    alert(errorMessage)
  }
}

const handleLogout = () => {
  authStore.logout()
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
  width: min(1240px, 92vw);
  margin: 0 auto;
  padding: 0.9rem 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.logo-section {
  flex-shrink: 0;
}

.logo-link {
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
  gap: 0.28rem;
  flex: 1;
  justify-content: center;
  align-items: center;
  flex-wrap: nowrap;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.main-nav::-webkit-scrollbar {
  display: none;
}

.nav-link {
  color: #d6defd;
  text-decoration: none;
  font-weight: 600;
  padding: 0.46rem 0.78rem;
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
  gap: 0.55rem;
  flex-shrink: 0;
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

.auth-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #ebefff;
  border: 1px solid rgba(164, 178, 237, 0.35);
  padding: 0.48rem 0.82rem;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
  font-size: 0.8rem;
}

.auth-btn:hover {
  background: rgba(255, 255, 255, 0.14);
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

@media (max-width: 1024px) {
  .header-container {
    width: min(1240px, 94vw);
    padding: 0.8rem 0;
    gap: 0.7rem;
  }

  .logo-text {
    font-size: 1.55rem;
  }

  .nav-link {
    font-size: 0.78rem;
    padding: 0.42rem 0.62rem;
  }

  .auth-link,
  .auth-btn,
  .connect-wallet-btn {
    font-size: 0.74rem;
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
