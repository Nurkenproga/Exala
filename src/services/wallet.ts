import { BrowserProvider } from 'ethers'

export interface WalletConnection {
  address: string
  provider: BrowserProvider
  signer: any
}

/**
 * Сервис для работы с Web3 кошельками (MetaMask и др.)
 */
class WalletService {
  private provider: BrowserProvider | null = null

  /**
   * Проверяет, установлен ли MetaMask или другой Web3 провайдер
   */
  isWalletInstalled(): boolean {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined'
  }

  /**
   * Получает провайдер браузера
   */
  async getProvider(): Promise<BrowserProvider> {
    if (!this.isWalletInstalled() || !window.ethereum) {
      throw new Error('MetaMask или другой Web3 кошелек не установлен')
    }

    if (!this.provider) {
      this.provider = new BrowserProvider(window.ethereum)
    }

    return this.provider
  }

  /**
   * Подключается к кошельку пользователя
   */
  async connect(): Promise<WalletConnection> {
    if (!this.isWalletInstalled()) {
      throw new Error('MetaMask или другой Web3 кошелек не установлен. Пожалуйста, установите MetaMask.')
    }

    try {
      if (!window.ethereum) {
        throw new Error('MetaMask не установлен')
      }

      // Запрашиваем доступ к аккаунтам
      await window.ethereum.request({ method: 'eth_requestAccounts' })

      const provider = await this.getProvider()
      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      return {
        address,
        provider,
        signer
      }
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('Пользователь отклонил запрос на подключение')
      }
      throw new Error(`Ошибка подключения кошелька: ${error.message}`)
    }
  }

  /**
   * Отключается от кошелька
   */
  async disconnect(): Promise<void> {
    this.provider = null
  }

  /**
   * Получает текущий адрес кошелька (если уже подключен)
   */
  async getCurrentAddress(): Promise<string | null> {
    if (!this.isWalletInstalled() || !window.ethereum) {
      return null
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (accounts.length === 0) {
        return null
      }
      return accounts[0]
    } catch (error) {
      console.error('Ошибка получения адреса:', error)
      return null
    }
  }

  /**
   * Слушает изменения аккаунтов (когда пользователь переключает кошелек)
   */
  onAccountsChanged(callback: (accounts: string[]) => void): () => void {
    if (!this.isWalletInstalled() || !window.ethereum) {
      return () => {}
    }

    const ethereum = window.ethereum
    const handler = (accounts: string[]) => {
      callback(accounts)
    }

    ethereum.on('accountsChanged', handler)

    // Возвращаем функцию для отписки
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handler)
      }
    }
  }

  /**
   * Слушает изменения сети
   */
  onChainChanged(callback: (chainId: string) => void): () => void {
    if (!this.isWalletInstalled() || !window.ethereum) {
      return () => {}
    }

    const ethereum = window.ethereum
    const handler = (chainId: string) => {
      callback(chainId)
    }

    ethereum.on('chainChanged', handler)

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', handler)
      }
    }
  }

  /**
   * Получает ID текущей сети
   */
  async getChainId(): Promise<number> {
    if (!this.isWalletInstalled()) {
      throw new Error('Кошелек не установлен')
    }

    const provider = await this.getProvider()
    const network = await provider.getNetwork()
    return Number(network.chainId)
  }
}

// Экспортируем singleton экземпляр
export const walletService = new WalletService()

// Расширяем Window интерфейс для TypeScript
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>
      on: (event: string, handler: (...args: any[]) => void) => void
      removeListener: (event: string, handler: (...args: any[]) => void) => void
      isMetaMask?: boolean
    }
  }
}
