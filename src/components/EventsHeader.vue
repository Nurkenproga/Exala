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
          to="/nft" 
          class="nav-link" 
          active-class="active"
        >
          Мои NFT
        </RouterLink>
        <RouterLink 
          to="/profile" 
          class="nav-link" 
          active-class="active"
        >
          Профиль
        </RouterLink>
      </nav>

      <div class="header-actions">
        <button 
          class="connect-wallet-btn" 
          :class="{ 'connected': isConnected, 'connecting': isConnecting }"
          @click="handleConnectWallet"
          :disabled="isConnecting"
        >
          <span v-if="isConnecting" class="btn-content">
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
import { onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useWalletStore } from '@/stores/wallet'

const walletStore = useWalletStore()
const { isConnected, isConnecting, truncatedAddress, isWalletInstalled, error } = storeToRefs(walletStore)

const handleConnectWallet = async () => {
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

onMounted(() => {
  walletStore.init()
})
</script>

<style scoped>
.events-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
  width: 100%;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  width: 100%;
}

/* Логотип */
.logo-section {
  flex-shrink: 0;
}

.logo-link {
  text-decoration: none;
  color: white;
  transition: transform 0.2s, opacity 0.2s;
}

.logo-link:hover {
  opacity: 0.9;
  transform: scale(1.02);
}

.logo-text-wrapper {
  display: flex;
  flex-direction: column;
}

.logo-text {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.5px;
  line-height: 1;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.logo-subtitle {
  font-size: 0.75rem;
  opacity: 0.95;
  font-weight: 400;
  margin-top: 0.125rem;
  letter-spacing: 0.5px;
}

/* Навигация */
.main-nav {
  display: flex;
  gap: 0.5rem;
  flex: 1;
  justify-content: center;
  align-items: center;
}

.nav-link {
  color: white;
  text-decoration: none;
  font-weight: 500;
  padding: 0.625rem 1.25rem;
  border-radius: 10px;
  transition: all 0.2s ease;
  position: relative;
  display: flex;
  align-items: center;
  font-size: 0.95rem;
}

.nav-link::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 2px;
  background: white;
  transition: width 0.3s ease;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.nav-link.active {
  background-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.nav-link.active::before {
  width: 60%;
}

/* Кнопка подключения кошелька */
.header-actions {
  flex-shrink: 0;
}

.connect-wallet-btn {
  background: white;
  color: #667eea;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.connect-wallet-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.connect-wallet-btn:active {
  transform: translateY(0);
}

.connect-wallet-btn.connected {
  background: rgba(255, 255, 255, 0.95);
  padding: 0.625rem 1.25rem;
}

.connect-wallet-btn:disabled {
  opacity: 0.6;
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
  font-size: 0.85rem;
  font-weight: 600;
  color: #667eea;
}

.wallet-badge {
  background: #10b981;
  color: white;
  padding: 0.25rem 0.625rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

/* Адаптивность */
@media (max-width: 1024px) {
  .header-container {
    padding: 1rem 1.5rem;
    gap: 1.5rem;
  }

  .nav-link {
    padding: 0.625rem;
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .header-container {
    flex-wrap: wrap;
    padding: 1rem;
    gap: 1rem;
  }

  .logo-text {
    font-size: 1.5rem;
  }

  .logo-subtitle {
    font-size: 0.7rem;
  }

  .main-nav {
    order: 3;
    width: 100%;
    justify-content: space-around;
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .connect-wallet-btn {
    padding: 0.625rem 1rem;
    font-size: 0.85rem;
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
    padding: 0.75rem;
  }

  .logo-text-wrapper {
    display: none;
  }

  .connect-wallet-btn .btn-content {
    font-size: 0.8rem;
  }

  .connect-wallet-btn {
    padding: 0.625rem;
    min-width: 44px;
    justify-content: center;
  }
}
</style>
