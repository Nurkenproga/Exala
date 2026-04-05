<template>
  <div class="nft-view">
    <div class="bg-glow bg-glow-left"></div>
    <div class="bg-glow bg-glow-right"></div>

    <section class="hero-section container">
      <div class="hero-copy">
        <p class="eyebrow">Exala NFT</p>
        <h1 class="hero-title">
          Discover,
          <span>Collect</span>
          <br />
          and Show Your NFT World
        </h1>
        <p class="hero-subtitle">
          Подключите кошелек, просмотрите свою коллекцию и управляйте NFT в едином
          интерфейсе.
        </p>

        <div class="hero-actions">
          <button
            v-if="!walletStore.isConnected"
            class="btn btn-primary"
            @click="handleConnect"
          >
            Connect Wallet
          </button>
          <button
            v-else
            class="btn btn-primary"
            :disabled="loading"
            @click="loadNFTs"
          >
            {{ loading ? 'Refreshing...' : 'Refresh Collection' }}
          </button>
          <button class="btn btn-outline" @click="scrollToCollections">
            View Collection
          </button>
        </div>

        <div class="hero-stats">
          <div class="stat-item">
            <p class="stat-value">{{ nfts.length }}</p>
            <p class="stat-label">NFT Items</p>
          </div>
          <div class="stat-item">
            <p class="stat-value">{{ uniqueCollections }}</p>
            <p class="stat-label">Collections</p>
          </div>
          <div class="stat-item">
            <p class="stat-value">{{ totalTraits }}</p>
            <p class="stat-label">Traits</p>
          </div>
        </div>
      </div>

      <div class="hero-art-card">
        <div class="art-shell">
          <img
            v-if="featuredNft && getNFTImage(featuredNft)"
            :src="getNFTImage(featuredNft)"
            :alt="featuredNft.title || `NFT #${featuredNft.tokenId}`"
            class="hero-art-image"
            @error="handleImageError"
          />
          <div v-else class="hero-art-placeholder">NFT</div>
        </div>

        <div class="eth-chip">
          <p class="chip-label">Featured NFT</p>
          <p class="chip-name">{{ featuredNft?.title || featuredNft?.metadata?.name || 'Not selected' }}</p>
          <p class="chip-value">
            {{ featuredNft ? truncateAddress(featuredNft.contract.address) : 'No data yet' }}
          </p>
        </div>
      </div>
    </section>

    <section class="collections container" ref="collectionsSection">
      <div class="section-header">
        <h2>Top Collections</h2>
        <p>Ваши NFT из подключенного кошелька</p>
        <p class="image-diagnostic" v-if="nfts.length > 0">Изображения: {{ nftsWithImage }} / {{ nfts.length }}</p>
      </div>

      <div v-if="!walletStore.isConnected" class="state-card connect-state">
        <h3>Подключите кошелек</h3>
        <p>Чтобы увидеть NFT-коллекцию, подключите MetaMask и обновите страницу.</p>
        <button class="btn btn-primary" @click="handleConnect">Подключить кошелек</button>
      </div>

      <div v-else-if="loading" class="nfts-grid">
        <div v-for="skeleton in 8" :key="skeleton" class="nft-card skeleton-card">
          <div class="skeleton-media"></div>
          <div class="skeleton-line short"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line tiny"></div>
        </div>
      </div>

      <div v-else-if="error" class="state-card error-state">
        <p class="error-message">{{ error }}</p>
        <div v-if="error.includes('API ключ')" class="api-key-info">
          <p class="info-text">Для загрузки NFT через Alchemy нужен API ключ.</p>
          <p class="info-text">
            Получите его на
            <a href="https://www.alchemy.com/" target="_blank" rel="noreferrer" class="info-link">
              alchemy.com
            </a>
          </p>
          <p class="info-text small">Переменная: VITE_ALCHEMY_API_KEY=ваш_ключ</p>
        </div>
        <button class="btn btn-primary" @click="loadNFTs">Попробовать снова</button>
      </div>

      <div v-else-if="nfts.length > 0" class="nfts-grid">
        <article
          v-for="nft in nfts"
          :key="`${nft.contract.address}-${nft.tokenId}`"
          class="nft-card"
          @click="selectNFT(nft)"
        >
          <div class="nft-media">
            <div v-if="isFeaturedNft(nft)" class="featured-badge">Featured</div>
            <div class="nft-placeholder">NFT</div>
            <img
              v-if="getNFTImage(nft)"
              :src="getNFTImage(nft)"
              :alt="nft.title || `NFT #${nft.tokenId}`"
              class="nft-image"
              @error="handleImageError"
            />
          </div>

          <div class="nft-content">
            <h3 class="nft-name">{{ nft.title || nft.metadata?.name || `#${nft.tokenId}` }}</h3>
            <p class="nft-collection">{{ nft.contract.name || 'Unknown Collection' }}</p>
            <p class="nft-description">
              {{ truncateText(nft.description || nft.metadata?.description || 'No description', 92) }}
            </p>

            <div class="nft-tags" v-if="nft.metadata?.attributes && nft.metadata.attributes.length > 0">
              <span
                v-for="(attr, index) in nft.metadata.attributes.slice(0, 3)"
                :key="index"
                class="trait-pill"
              >
                {{ attr.trait_type }}: {{ attr.value }}
              </span>
            </div>

            <footer class="nft-footer">
              <span>{{ truncateAddress(nft.contract.address) }}</span>
              <span>#{{ nft.tokenId }}</span>
            </footer>
          </div>
        </article>
      </div>

      <div v-else class="state-card empty-state">
        <h3>NFT не найдены</h3>
        <p>В этой сети у подключенного кошелька пока нет NFT.</p>
        <button class="btn btn-primary" @click="loadNFTs">Обновить</button>
      </div>
    </section>

    <div v-if="selectedNft" class="nft-modal-backdrop" @click="closeNftDetails">
      <section class="nft-modal" @click.stop>
        <header class="nft-modal-header">
          <div>
            <p class="nft-modal-eyebrow">NFT Details</p>
            <h3>{{ selectedNft.title || selectedNft.metadata?.name || `#${selectedNft.tokenId}` }}</h3>
          </div>
          <button class="modal-close" @click="closeNftDetails">Close</button>
        </header>

        <div class="nft-modal-body">
          <div class="nft-modal-image-wrap">
            <div class="nft-placeholder">NFT</div>
            <img
              v-if="getNFTImage(selectedNft)"
              :src="getNFTImage(selectedNft)"
              :alt="selectedNft.title || `NFT #${selectedNft.tokenId}`"
              class="nft-modal-image"
              @error="handleImageError"
            />
          </div>

          <div class="nft-modal-info">
            <p><span>Collection:</span> {{ selectedNft.contract.name || 'Unknown' }}</p>
            <p><span>Contract:</span> {{ selectedNft.contract.address }}</p>
            <p><span>Token ID:</span> {{ selectedNft.tokenId }}</p>
            <p><span>Last Update:</span> {{ formatDate(selectedNft.timeLastUpdated) }}</p>
            <p>
              <span>Description:</span>
              {{ selectedNft.description || selectedNft.metadata?.description || 'No description' }}
            </p>

            <div
              v-if="selectedNft.metadata?.attributes && selectedNft.metadata.attributes.length > 0"
              class="nft-modal-traits"
            >
              <p class="modal-subtitle">Attributes</p>
              <div class="modal-traits-grid">
                <div
                  v-for="(attr, index) in selectedNft.metadata.attributes"
                  :key="index"
                  class="modal-trait-card"
                >
                  <span>{{ attr.trait_type }}</span>
                  <strong>{{ attr.value }}</strong>
                </div>
              </div>
            </div>

            <div class="nft-modal-actions">
              <button class="btn btn-primary" @click="setFeatured(selectedNft)">
                {{ isFeaturedNft(selectedNft) ? 'Featured Selected' : 'Set as Featured' }}
              </button>
              <a
                v-if="selectedNft.tokenUri?.raw"
                class="btn btn-outline"
                :href="selectedNft.tokenUri.raw"
                target="_blank"
                rel="noreferrer"
              >
                Open Token URI
              </a>
            </div>

            <div class="nft-modal-json">
              <p class="modal-subtitle">Metadata JSON</p>
              <pre>{{ selectedMetadataJson }}</pre>
            </div>
          </div>
        </div>
      </section>
    </div>

    <footer class="page-footer container">
      <div class="footer-brand">
        <h3>Exala Art</h3>
        <p>The NFT space for creators, collectors and web3 communities.</p>
      </div>
      <div class="footer-column">
        <h4>Navigation</h4>
        <a href="#">Collections</a>
        <a href="#">Activity</a>
        <a href="#">Help</a>
      </div>
      <div class="footer-column">
        <h4>Links</h4>
        <a href="#">Docs</a>
        <a href="#">Support</a>
        <a href="#">Contacts</a>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useWalletStore } from '@/stores/wallet'
import { nftService, type NFT } from '@/services/nft'

const walletStore = useWalletStore()
const { isConnected, address, chainId } = storeToRefs(walletStore)

const nfts = ref<NFT[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const collectionsSection = ref<HTMLElement | null>(null)
const selectedNft = ref<NFT | null>(null)
const featuredNftKey = ref<string | null>(null)

const featuredStorageKey = computed(
  () => `nft:featured:${address.value || 'guest'}:${chainId.value || 1}`,
)

const featuredNft = computed(() => {
  if (featuredNftKey.value) {
    const matched = nfts.value.find((nft) => getNftKey(nft) === featuredNftKey.value)
    if (matched) {
      return matched
    }
  }

  return nfts.value[0] ?? null
})

const uniqueCollections = computed(
  () => new Set(nfts.value.map((nft) => nft.contract.name || nft.contract.address)).size,
)

const totalTraits = computed(() =>
  nfts.value.reduce((acc, nft) => acc + (nft.metadata?.attributes?.length || 0), 0),
)

const nftsWithImage = computed(() => nfts.value.filter((nft) => Boolean(getNFTImage(nft))).length)

const selectedMetadataJson = computed(() => {
  if (!selectedNft.value?.metadata) {
    return '{}'
  }

  return JSON.stringify(selectedNft.value.metadata, null, 2)
})

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

    let fetchedNFTs: NFT[] = []
    let alchemyError: string | null = null

    if (currentChainId === 56 || currentChainId === 97) {
      try {
        fetchedNFTs = await nftService.getNFTsViaMoralis(walletAddress, currentChainId)
      } catch (moralisErr: any) {
        alchemyError = moralisErr.message
      }
    } else {
      try {
        fetchedNFTs = await nftService.getNFTs(walletAddress, currentChainId)
      } catch (alchemyErr: any) {
        alchemyError = alchemyErr.message

        try {
          fetchedNFTs = await nftService.getNFTsViaMoralis(walletAddress, currentChainId)
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
          error.value =
            'BSC не поддерживается Alchemy API. Переключитесь на Ethereum или Polygon для просмотра NFT.'
        } else if (![1, 5, 137, 80001].includes(currentChainId)) {
          error.value = `Сеть ${currentChainId} не поддерживается Alchemy API.`
        } else {
          error.value = `Ошибка загрузки NFT: ${alchemyError}`
        }
      } else {
        error.value = null
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

const getNFTImage = (nft: NFT): string | undefined => {
  if (nft.metadata?.image) {
    return processIPFSURL(nft.metadata.image) ?? undefined
  }
  const firstMedia = nft.media?.[0]
  if (firstMedia?.gateway) {
    return processIPFSURL(firstMedia.gateway) ?? undefined
  }
  if (nft.tokenUri?.gateway) {
    return processIPFSURL(nft.tokenUri.gateway) ?? undefined
  }
  if (nft.tokenUri?.raw) {
    return processIPFSURL(nft.tokenUri.raw) ?? undefined
  }
  return undefined
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
      const currentGatewayIndex = alternativeGateways.findIndex((gateway) =>
        originalSrc.includes(gateway.replace('/ipfs/', '')),
      )
      const nextGatewayIndex = currentGatewayIndex + 1

      if (nextGatewayIndex < alternativeGateways.length) {
        img.src = `${alternativeGateways[nextGatewayIndex]}${ipfsHash}`
        return
      }
    }
  }

  img.style.display = 'none'
  const parent = img.parentElement
  if (parent) {
    const placeholder = parent.querySelector('.nft-placeholder, .hero-art-placeholder') as
      | HTMLElement
      | null
    if (placeholder) {
      placeholder.style.display = 'flex'
    }
  }
}

const truncateText = (text: string, maxLength: number): string => {
  if (!text) return ''
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

const truncateAddress = (walletAddress: string): string => {
  if (!walletAddress) return ''
  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
}

const getNftKey = (nft: NFT): string => `${nft.contract.address}-${nft.tokenId}`

const isFeaturedNft = (nft: NFT): boolean => {
  if (!featuredNft.value) {
    return false
  }

  return getNftKey(featuredNft.value) === getNftKey(nft)
}

const setFeatured = (nft: NFT) => {
  const key = getNftKey(nft)
  featuredNftKey.value = key
  localStorage.setItem(featuredStorageKey.value, key)
}

const closeNftDetails = () => {
  selectedNft.value = null
}

const formatDate = (value: string): string => {
  if (!value) {
    return 'Unknown'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

const scrollToCollections = () => {
  collectionsSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const selectNFT = (nft: NFT) => {
  selectedNft.value = nft
}

onMounted(() => {
  featuredNftKey.value = localStorage.getItem(featuredStorageKey.value)

  if (isConnected.value && address.value) {
    loadNFTs()
  }
})

watch([isConnected, address], ([connected, walletAddress]) => {
  featuredNftKey.value = localStorage.getItem(featuredStorageKey.value)

  if (connected && walletAddress) {
    loadNFTs()
  } else {
    nfts.value = []
    selectedNft.value = null
    error.value = null
  }
})

watch(nfts, (nextNfts) => {
  if (!selectedNft.value) {
    return
  }

  const key = getNftKey(selectedNft.value)
  const nextSelected = nextNfts.find((nft) => getNftKey(nft) === key)
  selectedNft.value = nextSelected || null
})
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');

.nft-view {
  --bg-main: #06070f;
  --bg-card: #0b1020;
  --bg-card-2: #0f1328;
  --line: #232944;
  --text-main: #f7f9ff;
  --text-muted: #a9b0d0;
  --accent: #7d4dff;
  --accent-2: #4f9dff;
  --success: #2cd67c;

  position: relative;
  isolation: isolate;
  min-height: calc(100vh - 80px);
  padding: 2rem 0 4rem;
  background:
    radial-gradient(circle at 10% 0%, rgba(125, 77, 255, 0.2), transparent 35%),
    radial-gradient(circle at 95% 18%, rgba(79, 157, 255, 0.18), transparent 40%),
    linear-gradient(180deg, #080b16 0%, var(--bg-main) 60%, #05050a 100%);
  color: var(--text-main);
  font-family: 'Sora', sans-serif;
  overflow: hidden;
}

.nft-view h1,
.nft-view h2,
.nft-view h3,
.nft-view h4,
.nft-view p,
.nft-view span,
.nft-view button,
.nft-view a {
  color: inherit;
}

.bg-glow {
  position: absolute;
  width: 520px;
  height: 520px;
  border-radius: 50%;
  filter: blur(120px);
  pointer-events: none;
  z-index: 0;
}

.bg-glow-left {
  background: rgba(125, 77, 255, 0.16);
  top: -180px;
  left: -220px;
}

.bg-glow-right {
  background: rgba(79, 157, 255, 0.15);
  top: 160px;
  right: -240px;
}

.container {
  width: min(1200px, 92vw);
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.hero-section {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 2rem;
  padding: 2rem;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(140deg, rgba(16, 20, 37, 0.9), rgba(11, 13, 26, 0.8)),
    repeating-radial-gradient(circle at 100% 100%, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.035) 1px, transparent 1px, transparent 24px);
  backdrop-filter: blur(4px);
  animation: reveal 0.7s ease both;
}

.eyebrow {
  color: var(--accent-2);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.78rem;
  margin-bottom: 0.75rem;
}

.hero-title {
  font-size: clamp(2rem, 4.6vw, 4rem);
  line-height: 1.05;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.hero-title span {
  color: var(--accent);
}

.hero-subtitle {
  margin-top: 1.1rem;
  color: #c6ceef;
  max-width: 540px;
  line-height: 1.7;
}

.hero-actions {
  margin-top: 1.8rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
}

.btn {
  border-radius: 999px;
  border: 1px solid transparent;
  padding: 0.72rem 1.4rem;
  font-weight: 600;
  font-size: 0.92rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
  cursor: pointer;
}

.btn:hover {
  transform: translateY(-2px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-primary {
  background: linear-gradient(120deg, var(--accent), #6a6cff);
  color: #fff;
  box-shadow: 0 10px 28px rgba(125, 77, 255, 0.25);
}

.btn-outline {
  border-color: rgba(255, 255, 255, 0.25);
  color: #f0f2ff;
  background: rgba(255, 255, 255, 0.02);
}

.hero-stats {
  display: flex;
  gap: 1.2rem;
  margin-top: 2rem;
}

.stat-item {
  min-width: 110px;
}

.stat-value {
  font-size: 1.4rem;
  font-weight: 700;
}

.stat-label {
  margin-top: 0.2rem;
  font-size: 0.8rem;
  color: #b7c0e6;
}

.hero-art-card {
  position: relative;
  align-self: center;
  justify-self: center;
  z-index: 1;
}

.art-shell {
  position: relative;
  z-index: 2;
  width: min(360px, 72vw);
  aspect-ratio: 1 / 1;
  border-radius: 26px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: linear-gradient(150deg, #151d3c, #0a0e20);
  box-shadow: 0 24px 48px rgba(1, 6, 22, 0.45);
}

.hero-art-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: relative;
  z-index: 1;
}

.hero-art-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.8rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.78);
  background: radial-gradient(circle at 20% 20%, #884dff 0%, #3b3f80 50%, #1b1f36 100%);
}

.eth-chip {
  position: absolute;
  left: -30px;
  bottom: 22px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(13, 17, 31, 0.92);
  border-radius: 14px;
  padding: 0.65rem 0.85rem;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  z-index: 6;
  min-width: 200px;
}

.chip-label {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.chip-name {
  font-size: 0.86rem;
  font-weight: 700;
  margin-top: 0.2rem;
}

.chip-value {
  font-size: 0.95rem;
  font-weight: 700;
  margin-top: 0.2rem;
}

.collections {
  margin-top: 2rem;
}

.section-header h2 {
  font-size: clamp(1.8rem, 3.6vw, 2.5rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.section-header p {
  margin-top: 0.45rem;
  color: #c6ceef;
}

.image-diagnostic {
  margin-top: 0.3rem;
  font-size: 0.86rem;
  color: #8ba0e7;
}

.nfts-grid {
  margin-top: 1.4rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 1rem;
}

.nft-card {
  background: linear-gradient(180deg, rgba(17, 22, 43, 0.96), rgba(10, 13, 27, 0.92));
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 0.75rem;
  cursor: pointer;
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
  animation: reveal 0.55s ease both;
}

.nft-card:hover {
  transform: translateY(-4px);
  border-color: rgba(125, 77, 255, 0.7);
  box-shadow: 0 18px 28px rgba(0, 0, 0, 0.28);
}

.nft-media {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 13px;
  overflow: hidden;
  background: linear-gradient(135deg, #34376f, #202548);
}

.featured-badge {
  position: absolute;
  left: 10px;
  top: 10px;
  z-index: 3;
  border-radius: 999px;
  padding: 0.28rem 0.62rem;
  background: rgba(125, 77, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.24);
  font-size: 0.72rem;
  font-weight: 700;
  color: #f4f1ff;
}

.nft-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: relative;
  z-index: 2;
}

.nft-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.78);
  z-index: 1;
}

.nft-content {
  margin-top: 0.8rem;
}

.nft-name {
  font-size: 1.03rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.nft-collection {
  font-size: 0.82rem;
  color: #93a2ff;
  margin-top: 0.2rem;
}

.nft-description {
  margin-top: 0.5rem;
  font-size: 0.82rem;
  color: #c4cdec;
  line-height: 1.6;
}

.nft-tags {
  margin-top: 0.65rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.trait-pill {
  background: rgba(125, 77, 255, 0.12);
  color: #d8ceff;
  border: 1px solid rgba(125, 77, 255, 0.28);
  border-radius: 999px;
  padding: 0.25rem 0.55rem;
  font-size: 0.7rem;
}

.nft-footer {
  margin-top: 0.75rem;
  display: flex;
  justify-content: space-between;
  color: #d1d8f6;
  font-size: 0.76rem;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  padding-top: 0.5rem;
}

.state-card {
  margin-top: 1.4rem;
  padding: 1.8rem;
  border-radius: 18px;
  border: 1px solid var(--line);
  background: rgba(10, 14, 28, 0.9);
}

.connect-state,
.empty-state {
  text-align: center;
}

.state-card p {
  margin-top: 0.6rem;
  color: #c4cdec;
}

.error-message {
  color: #ff8a9e;
  font-weight: 600;
}

.api-key-info {
  margin: 1rem 0 1.2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0.95rem;
  background: rgba(255, 255, 255, 0.02);
}

.info-text {
  color: #c4cdec;
  margin-top: 0.2rem;
}

.info-text.small {
  font-size: 0.8rem;
}

.info-link {
  color: #94bcff;
}

.skeleton-card {
  cursor: default;
}

.skeleton-media,
.skeleton-line {
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.08));
  background-size: 180% 100%;
  animation: shimmer 1.2s linear infinite;
  border-radius: 10px;
}

.skeleton-media {
  aspect-ratio: 1 / 1;
}

.skeleton-line {
  height: 12px;
  margin-top: 0.65rem;
}

.skeleton-line.short {
  width: 60%;
}

.skeleton-line.tiny {
  width: 35%;
}

.page-footer {
  margin-top: 2.3rem;
  padding-top: 1.8rem;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 1.2rem;
}

.nft-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(5, 9, 18, 0.76);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.nft-modal {
  width: min(960px, 100%);
  max-height: 92vh;
  overflow-y: auto;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: linear-gradient(160deg, rgba(10, 14, 28, 0.98), rgba(8, 10, 20, 0.98));
  box-shadow: 0 22px 48px rgba(0, 0, 0, 0.45);
}

.nft-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.nft-modal-eyebrow {
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8ea2e8;
  margin-bottom: 0.35rem;
}

.nft-modal-header h3 {
  font-size: 1.2rem;
  font-weight: 700;
}

.modal-close {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: #eaf0ff;
  font-weight: 600;
  padding: 0.45rem 0.85rem;
  cursor: pointer;
}

.nft-modal-body {
  display: grid;
  grid-template-columns: 0.95fr 1.05fr;
  gap: 1rem;
  padding: 1rem 1.2rem 1.25rem;
}

.nft-modal-image-wrap {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(135deg, #34376f, #202548);
  aspect-ratio: 1 / 1;
}

.nft-modal-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: relative;
  z-index: 2;
}

.nft-modal-info {
  display: flex;
  flex-direction: column;
  gap: 0.54rem;
}

.nft-modal-info p {
  font-size: 0.88rem;
  color: #d0daf7;
  line-height: 1.6;
}

.nft-modal-info p span {
  color: #8ea2e8;
  font-weight: 600;
}

.modal-subtitle {
  margin: 0.35rem 0 0.2rem;
  font-weight: 700;
  color: #f4f7ff;
}

.modal-traits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 0.45rem;
}

.modal-trait-card {
  border: 1px solid rgba(125, 77, 255, 0.35);
  background: rgba(125, 77, 255, 0.12);
  border-radius: 10px;
  padding: 0.45rem 0.5rem;
}

.modal-trait-card span {
  display: block;
  font-size: 0.72rem;
  color: #b8c4f2;
}

.modal-trait-card strong {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.86rem;
  color: #ffffff;
}

.nft-modal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 0.35rem;
}

.nft-modal-json {
  margin-top: 0.45rem;
}

.nft-modal-json pre {
  margin-top: 0.35rem;
  max-height: 190px;
  overflow: auto;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 0.7rem;
  font-size: 0.75rem;
  color: #d4ddfa;
}

.footer-brand h3 {
  font-size: 1.35rem;
  font-weight: 700;
}

.footer-brand p {
  color: #c6ceef;
  margin-top: 0.5rem;
  max-width: 380px;
}

.footer-column h4 {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.7rem;
}

.footer-column a {
  display: block;
  color: #d7deff;
  text-decoration: none;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.footer-column a:hover {
  color: #fff;
}

@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shimmer {
  from {
    background-position: 180% 0;
  }

  to {
    background-position: -180% 0;
  }
}

@media (max-width: 980px) {
  .hero-section {
    grid-template-columns: 1fr;
    padding: 1.35rem;
  }

  .hero-art-card {
    justify-self: flex-start;
  }

  .eth-chip {
    left: 12px;
  }

  .nft-modal-body {
    grid-template-columns: 1fr;
  }

  .page-footer {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 700px) {
  .nft-view {
    padding-top: 1rem;
  }

  .hero-stats {
    flex-wrap: wrap;
  }

  .page-footer {
    grid-template-columns: 1fr;
  }
}
</style>
