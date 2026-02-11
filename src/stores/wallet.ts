import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { walletService, type WalletConnection } from '@/services/wallet'

export const useWalletStore = defineStore('wallet', () => {
  // State
  const isConnected = ref(false)
  const address = ref<string>('')
  const provider = ref<any>(null)
  const signer = ref<any>(null)
  const isConnecting = ref(false)
  const error = ref<string | null>(null)
  const chainId = ref<number | null>(null)

  // Computed
  const truncatedAddress = computed(() => {
    if (!address.value) return ''
    return `${address.value.slice(0, 6)}...${address.value.slice(-4)}`
  })

  const isWalletInstalled = computed(() => {
    return walletService.isWalletInstalled()
  })

  // Actions
  const connect = async () => {
    if (isConnecting.value) return

    isConnecting.value = true
    error.value = null

    try {
      if (!walletService.isWalletInstalled()) {
        throw new Error('MetaMask не установлен. Пожалуйста, установите расширение MetaMask.')
      }

      const connection: WalletConnection = await walletService.connect()
      
      address.value = connection.address
      provider.value = connection.provider
      signer.value = connection.signer
      isConnected.value = true

      // Получаем chainId
      try {
        chainId.value = await walletService.getChainId()
      } catch (e) {
        console.error('Ошибка получения chainId:', e)
      }

      // Сохраняем в localStorage для восстановления при перезагрузке
      localStorage.setItem('walletConnected', 'true')
      localStorage.setItem('walletAddress', connection.address)

      // Настраиваем слушатели событий
      setupEventListeners()
    } catch (err: any) {
      error.value = err.message || 'Ошибка подключения кошелька'
      isConnected.value = false
      address.value = ''
      throw err
    } finally {
      isConnecting.value = false
    }
  }

  const disconnect = async () => {
    try {
      await walletService.disconnect()
      isConnected.value = false
      address.value = ''
      provider.value = null
      signer.value = null
      chainId.value = null
      error.value = null

      // Удаляем из localStorage
      localStorage.removeItem('walletConnected')
      localStorage.removeItem('walletAddress')
    } catch (err: any) {
      error.value = err.message || 'Ошибка отключения кошелька'
    }
  }

  const checkConnection = async () => {
    try {
      const currentAddress = await walletService.getCurrentAddress()
      if (currentAddress) {
        // Восстанавливаем соединение
        const connection: WalletConnection = await walletService.connect()
        address.value = connection.address
        provider.value = connection.provider
        signer.value = connection.signer
        isConnected.value = true

        try {
          chainId.value = await walletService.getChainId()
        } catch (e) {
          console.error('Ошибка получения chainId:', e)
        }

        setupEventListeners()
      }
    } catch (err) {
      console.error('Ошибка проверки соединения:', err)
      // Если не удалось восстановить, очищаем состояние
      isConnected.value = false
      address.value = ''
    }
  }

  const setupEventListeners = () => {
    // Слушаем изменения аккаунтов (переключение кошелька)
    walletService.onAccountsChanged((accounts: string[]) => {
      if (accounts.length === 0) {
        // Пользователь отключил кошелек
        disconnect()
      } else if (accounts[0] !== address.value) {
        // Пользователь переключил аккаунт
        address.value = accounts[0]
        // Переподключаемся для получения нового signer
        connect()
      }
    })

    // Слушаем изменения сети
    walletService.onChainChanged((newChainId: string) => {
      chainId.value = parseInt(newChainId, 16)
      // Можно показать уведомление о смене сети
      console.log('Сеть изменена:', chainId.value)
    })
  }

  const clearError = () => {
    error.value = null
  }

  // Инициализация при загрузке store
  const init = async () => {
    const wasConnected = localStorage.getItem('walletConnected')
    if (wasConnected === 'true') {
      await checkConnection()
    }
  }

  return {
    // State
    isConnected,
    address,
    provider,
    signer,
    isConnecting,
    error,
    chainId,
    // Computed
    truncatedAddress,
    isWalletInstalled,
    // Actions
    connect,
    disconnect,
    checkConnection,
    clearError,
    init
  }
})
