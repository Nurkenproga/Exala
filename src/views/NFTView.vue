<template>
  <div class="nft-view">
    <div class="container">
      <div class="page-header">
        <h2 class="page-title">Мои NFT</h2>
        <p class="page-subtitle">
          Ваши NFT из подключенного кошелька MetaMask
        </p>
      </div>

      <div v-if="!walletStore.isConnected" class="connect-prompt">
        <div class="prompt-content">
          <h3>Подключите кошелек</h3>
          <p>Для просмотра ваших NFT необходимо подключить MetaMask кошелек</p>
          <button class="connect-btn" @click="handleConnect">
            Подключить кошелек
          </button>
        </div>
      </div>

      <div v-else-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Загрузка NFT...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <p class="error-message">{{ error }}</p>
        <div v-if="error.includes('API ключ')" class="api-key-info">
          <p class="info-text">
            Для получения NFT через Alchemy API нужен бесплатный API ключ.
          </p>
          <p class="info-text">
            Получите его на <a href="https://www.alchemy.com/" target="_blank" class="info-link">alchemy.com</a>
          </p>
          <p class="info-text small">
            После получения ключа добавьте его в переменные окружения: VITE_ALCHEMY_API_KEY=ваш_ключ
          </p>
        </div>
        <button class="retry-btn" @click="loadNFTs">Попробовать снова</button>
      </div>

      <div v-else-if="nfts.length > 0" class="nfts-section">
        <div class="nfts-header">
          <p class="nfts-count">Найдено NFT: {{ nfts.length }}</p>
          <button class="refresh-btn" @click="loadNFTs" :disabled="loading">
            Обновить
          </button>
        </div>

        <div class="nfts-grid">
          <div
            v-for="nft in nfts"
            :key="`${nft.contract.address}-${nft.tokenId}`"
            class="nft-card"
            @click="selectNFT(nft)"
          >
            <div class="nft-image-wrapper">
              <img
                v-if="getNFTImage(nft)"
                :src="getNFTImage(nft)"
                :alt="nft.title || `NFT #${nft.tokenId}`"
                class="nft-image"
                @error="handleImageError"
              />
              <div v-else class="nft-placeholder">
                <span>NFT</span>
              </div>
            </div>
            <div class="nft-info">
              <h3 class="nft-name">
                {{ nft.title || nft.metadata?.name || `#${nft.tokenId}` }}
              </h3>
              <p v-if="nft.contract.name" class="nft-collection">
                {{ nft.contract.name }}
              </p>
              <p v-if="nft.description || nft.metadata?.description" class="nft-description">
                {{ truncateText(nft.description || nft.metadata?.description || '', 100) }}
              </p>
              
              <!-- Атрибуты NFT -->
              <div v-if="nft.metadata?.attributes && nft.metadata.attributes.length > 0" class="nft-attributes">
                <div
                  v-for="(attr, index) in nft.metadata.attributes"
                  :key="index"
                  class="nft-attribute"
                >
                  <span class="attribute-type">{{ attr.trait_type }}:</span>
                  <span class="attribute-value">{{ attr.value }}</span>
                </div>
              </div>
              
              <div class="nft-footer">
                <span class="nft-contract">
                  {{ truncateAddress(nft.contract.address) }}
                </span>
                <span class="nft-token-id">Token ID: {{ nft.tokenId }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Пустое состояние -->
      <div v-else class="empty-state">
        <p>NFT не найдены</p>
        <p class="empty-hint">
          У вас пока нет NFT в этом кошельке на текущей сети.
        </p>
        <div class="empty-info">
          <p class="info-title">Проверьте:</p>
          <ul class="info-list">
            <li>Убедитесь, что вы подключены к правильной сети (Ethereum Mainnet или Polygon)</li>
            <li>NFT должны быть в подключенном кошельке</li>
            <li>Попробуйте переключиться на другую сеть, если ваши NFT там</li>
          </ul>
        </div>
        <button class="retry-btn" @click="loadNFTs">Обновить</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useWalletStore } from '@/stores/wallet'
import { nftService, type NFT } from '@/services/nft'

const walletStore = useWalletStore()
const { isConnected, address, chainId } = storeToRefs(walletStore)

const nfts = ref<NFT[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const handleConnect = async () => {
  try {
    await walletStore.connect()
    if (isConnected.value) {
      await loadNFTs()
    }
  } catch (err) {
    console.error('Ошибка подключения:', err)
  }
}

const loadNFTs = async () => {
  if (!isConnected.value || !address.value) {
    error.value = 'Кошелек не подключен'
    return
  }

  loading.value = true
  error.value = null

  try {
    const currentChainId = chainId.value || 1
    const walletAddress = address.value
    
    console.log('Загрузка NFT для адреса:', walletAddress, 'Сеть:', currentChainId)
    
    let fetchedNFTs: NFT[] = []
    let alchemyError: string | null = null
    
    if (currentChainId === 56 || currentChainId === 97) {
      console.log('Используем Moralis API для BSC...')
      try {
        fetchedNFTs = await nftService.getNFTsViaMoralis(walletAddress, currentChainId)
        console.log('Moralis вернул NFT:', fetchedNFTs.length)
      } catch (moralisErr: any) {
        console.warn('Moralis не сработал:', moralisErr.message)
        alchemyError = moralisErr.message
      }
    } else {
      try {
        fetchedNFTs = await nftService.getNFTs(walletAddress, currentChainId)
        console.log('Alchemy вернул NFT:', fetchedNFTs.length)
      } catch (alchemyErr: any) {
        console.warn('Alchemy не сработал:', alchemyErr.message)
        alchemyError = alchemyErr.message
        
        console.log('Пробуем Moralis API как fallback...')
        try {
          fetchedNFTs = await nftService.getNFTsViaMoralis(walletAddress, currentChainId)
          console.log('Moralis вернул NFT:', fetchedNFTs.length)
        } catch (moralisErr: any) {
          console.warn('Moralis fallback не сработал:', moralisErr.message)
        }
      }
    }

    nfts.value = fetchedNFTs
    
    if (fetchedNFTs.length === 0) {
      if (alchemyError) {
        if (alchemyError.includes('API ключ') || alchemyError.includes('Требуется')) {
          error.value = alchemyError
        } else if (alchemyError.includes('Method name is invalid')) {
          error.value = 'Ошибка формата запроса к Alchemy API. Проверьте консоль для деталей.'
        } else if (currentChainId === 97 || currentChainId === 56) {
          error.value = `BSC (Binance Smart Chain) не поддерживается Alchemy API. Переключитесь на Ethereum Mainnet (chainId: 1) или Polygon (chainId: 137) для просмотра NFT.`
        } else if (![1, 5, 137, 80001].includes(currentChainId)) {
          error.value = `Сеть ${currentChainId} не поддерживается Alchemy API. Поддерживаются: Ethereum (1), Polygon (137)`
        } else {
          error.value = `Ошибка загрузки NFT: ${alchemyError}`
        }
      } else {
        error.value = null
        console.log(`NFT не найдены для адреса ${walletAddress} в сети ${currentChainId}`)
      }
    } else {
      error.value = null
    }
  } catch (err: any) {
    console.error('Ошибка загрузки NFT:', err)
    error.value = err.message || 'Не удалось загрузить NFT. Попробуйте позже.'
    nfts.value = []
  } finally {
    loading.value = false
  }
}

const getNFTImage = (nft: NFT): string | null => {
  if (nft.metadata?.image) {
    return processIPFSURL(nft.metadata.image)
  }
  if (nft.media && nft.media.length > 0 && nft.media[0].gateway) {
    return processIPFSURL(nft.media[0].gateway)
  }
  if (nft.tokenUri?.gateway) {
    return processIPFSURL(nft.tokenUri.gateway)
  }
  if (nft.tokenUri?.raw) {
    return processIPFSURL(nft.tokenUri.raw)
  }
  return null
}

const processIPFSURL = (url: string | null | undefined): string | null => {
  if (!url) return null
  
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  if (url.startsWith('ipfs://')) {
    const ipfsHash = url.replace('ipfs://', '').replace('ipfs/', '')
    return `https://ipfs.io/ipfs/${ipfsHash}`
  }
  
  if (url.match(/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[a-z0-9]+)$/)) {
    return `https://ipfs.io/ipfs/${url}`
  }
  
  if (url.startsWith('data:')) {
    return url
  }
  
  return url
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  const originalSrc = img.src
  
  if (originalSrc.includes('ipfs.io')) {
    const alternativeGateways = [
      'https://gateway.pinata.cloud/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/',
      'https://dweb.link/ipfs/',
    ]
    
    const ipfsHash = originalSrc.split('/ipfs/')[1]
    if (ipfsHash) {
      const currentGatewayIndex = alternativeGateways.findIndex(gw => originalSrc.includes(gw.replace('/ipfs/', '')))
      const nextGatewayIndex = currentGatewayIndex + 1
      
      if (nextGatewayIndex < alternativeGateways.length) {
        img.src = `${alternativeGateways[nextGatewayIndex]}${ipfsHash}`
        return
      }
    }
  }
  
  img.style.display = 'none'
  const placeholder = img.nextElementSibling as HTMLElement
  if (placeholder && placeholder.classList.contains('nft-placeholder')) {
    placeholder.style.display = 'flex'
  }
}

const truncateText = (text: string, maxLength: number): string => {
  if (!text) return ''
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

const truncateAddress = (address: string): string => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const selectNFT = (nft: NFT) => {
  console.log('Selected NFT:', nft)
}

onMounted(() => {
  if (isConnected.value && address.value) {
    loadNFTs()
  }
})

watch([isConnected, address], ([connected, addr]) => {
  if (connected && addr) {
    loadNFTs()
  } else {
    nfts.value = []
  }
})
</script>

<style scoped>
.nft-view {
  min-height: calc(100vh - 80px);
  background: linear-gradient(to bottom, #f5f7fa 0%, #ffffff 100%);
  padding: 2rem 0;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  width: 100%;
}

.page-header {
  text-align: center;
  margin-bottom: 3rem;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1a202c;
  margin: 0 0 1rem 0;
}

.page-subtitle {
  font-size: 1.125rem;
  color: #718096;
  max-width: 600px;
  margin: 0 auto;
}

/* Состояние подключения */
.connect-prompt {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.prompt-content {
  text-align: center;
  background: white;
  padding: 3rem;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  max-width: 500px;
}

.prompt-content h3 {
  font-size: 1.5rem;
  color: #1a202c;
  margin: 0 0 1rem 0;
}

.prompt-content p {
  color: #718096;
  margin: 0 0 2rem 0;
}

.connect-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.connect-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}

/* Загрузка */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 1rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #e2e8f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Ошибка */
.error-state {
  text-align: center;
  padding: 4rem 2rem;
}

.error-message {
  color: #e53e3e;
  font-size: 1.125rem;
  margin-bottom: 1.5rem;
}

.api-key-info {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1.5rem 0;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.info-text {
  color: #4a5568;
  font-size: 0.95rem;
  margin: 0.5rem 0;
  line-height: 1.6;
}

.info-text.small {
  font-size: 0.85rem;
  color: #718096;
  margin-top: 1rem;
}

.info-link {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
}

.info-link:hover {
  text-decoration: underline;
}

.retry-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 1rem;
}

.retry-btn:hover {
  background: #5568d3;
}

/* Заголовок списка NFT */
.nfts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.nfts-count {
  font-size: 1.125rem;
  font-weight: 600;
  color: #4a5568;
}

.refresh-btn {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: #667eea;
  color: white;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Сетка NFT */
.nfts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
}

.nft-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  cursor: pointer;
}

.nft-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.nft-image-wrapper {
  position: relative;
  width: 100%;
  height: 280px;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.nft-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nft-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  font-weight: 600;
}

.nft-info {
  padding: 1.5rem;
}

.nft-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1a202c;
  margin: 0 0 0.5rem 0;
}

.nft-collection {
  font-size: 0.9rem;
  color: #667eea;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
}

.nft-description {
  font-size: 0.9rem;
  color: #718096;
  line-height: 1.6;
  margin: 0 0 1rem 0;
}

/* Атрибуты NFT */
.nft-attributes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.75rem 0;
  padding: 0.75rem;
  background: #f7fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.nft-attribute {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  padding: 0.25rem 0.5rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.attribute-type {
  font-weight: 600;
  color: #4a5568;
}

.attribute-value {
  color: #667eea;
  font-weight: 500;
}

.nft-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: #a0aec0;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
  margin-top: 0.5rem;
}

.nft-contract {
  font-family: 'Courier New', monospace;
}

.nft-token-id {
  font-weight: 600;
}

/* Пустое состояние */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #718096;
}

.empty-state p {
  font-size: 1.125rem;
  margin: 0 0 0.5rem 0;
}

.empty-hint {
  font-size: 0.95rem;
  margin-bottom: 1.5rem !important;
}

.empty-info {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  margin: 2rem auto;
  max-width: 500px;
  text-align: left;
}

.info-title {
  font-weight: 600;
  color: #4a5568;
  margin: 0 0 1rem 0;
  font-size: 1rem;
}

.info-list {
  list-style: none;
  padding: 0;
  margin: 0;
  color: #718096;
  font-size: 0.9rem;
  line-height: 1.8;
}

.info-list li {
  padding-left: 1.5rem;
  position: relative;
  margin-bottom: 0.5rem;
}

.info-list li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: #667eea;
  font-weight: bold;
  font-size: 1.2rem;
}

@media (max-width: 768px) {
  .nfts-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .nfts-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
}
</style>
