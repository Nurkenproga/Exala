import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { walletService, type WalletConnection } from '@/services/wallet'
import { apiService } from '@/services/api'
import { authService } from '@/services/auth'

export const useWalletStore = defineStore('wallet', () => {
  const isConnected = ref(false)
  const address = ref<string>('')
  const provider = ref<any>(null)
  const signer = ref<any>(null)
  const isConnecting = ref(false)
  const error = ref<string | null>(null)
  const chainId = ref<number | null>(null)
  const backendWalletAddress = ref<string>('')
  const backendWalletType = ref<string>('')
  let initPromise: Promise<void> | null = null

  const truncatedAddress = computed(() => {
    if (!address.value) return ''
    return `${address.value.slice(0, 6)}...${address.value.slice(-4)}`
  })

  const isWalletInstalled = computed(() => {
    return walletService.isWalletInstalled()
  })

  const linkExternalWallet = async (connection: WalletConnection) => {
    if (!authService.isAuthenticated() || !window.ethereum) return

    const backendWallet = await apiService.getMyWallet()
    if (
      backendWallet.wallet_type === 'external' &&
      backendWallet.wallet_address?.toLowerCase() === connection.address.toLowerCase()
    ) {
      return
    }

    const message = `Connect to VibeChain\nAddress: ${connection.address}`
    const signature = await connection.signer.signMessage(message)

    await apiService.connectExternalWallet({
      wallet_address: connection.address,
      signature,
      message,
    })
  }

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

      try {
        chainId.value = await walletService.getChainId()
      } catch (e) {
        console.error('Ошибка получения chainId:', e)
      }

      localStorage.setItem('walletConnected', 'true')
      localStorage.setItem('walletAddress', connection.address)

      setupEventListeners()

      if (authService.isAuthenticated() && window.ethereum) {
        try {
          await linkExternalWallet(connection)
        } catch (backendError: any) {
          console.error('Ошибка привязки external wallet на backend:', backendError)
          error.value = 'MetaMask подключен, но адрес не привязан к аккаунту. Подтвердите подпись и повторите.'
        }
      }

      if (authService.isAuthenticated()) {
        await syncWalletFromBackend()
      }
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

        if (authService.isAuthenticated()) {
          try {
            await linkExternalWallet(connection)
          } catch (backendError) {
            console.error('Ошибка восстановления привязки MetaMask:', backendError)
            error.value = 'Подтвердите подпись MetaMask, чтобы новые NFT выпускались на этот аккаунт.'
          }
          await syncWalletFromBackend()
        }
      }
    } catch (err) {
      console.error('Ошибка проверки соединения:', err)
      isConnected.value = false
      address.value = ''
    }
  }

  const setupEventListeners = () => {
    walletService.onAccountsChanged((accounts: string[]) => {
      const nextAccount = accounts[0]
      if (!nextAccount) {
        disconnect()
      } else if (nextAccount !== address.value) {
        address.value = nextAccount
        connect()
      }
    })

    walletService.onChainChanged((newChainId: string) => {
      chainId.value = parseInt(newChainId, 16)
      console.log('Сеть изменена:', chainId.value)
    })
  }

  const clearError = () => {
    error.value = null
  }

  const syncWalletFromBackend = async () => {
    if (!authService.isAuthenticated()) {
      backendWalletAddress.value = ''
      backendWalletType.value = ''
      return
    }

    try {
      const wallet = await apiService.getMyWallet()
      backendWalletAddress.value = wallet.wallet_address || ''
      backendWalletType.value = wallet.wallet_type || ''
    } catch (err: any) {
      console.error('Ошибка синхронизации wallet с backend:', err)
    }
  }

  const init = () => {
    if (initPromise) return initPromise

    initPromise = (async () => {
      const wasConnected = localStorage.getItem('walletConnected')
      if (wasConnected === 'true') {
        await checkConnection()
      }

      if (authService.isAuthenticated()) {
        await syncWalletFromBackend()
      }
    })()

    return initPromise
  }

  return {
    isConnected,
    address,
    provider,
    signer,
    isConnecting,
    error,
    chainId,
    backendWalletAddress,
    backendWalletType,
    truncatedAddress,
    isWalletInstalled,
    connect,
    disconnect,
    checkConnection,
    clearError,
    init,
    syncWalletFromBackend
  }
})
