<template>
  <div class="nft-view">
    <div class="bg-glow bg-glow-left"></div>
    <div class="bg-glow bg-glow-right"></div>

    <section class="hero-section container">
      <div class="hero-copy">
        <p class="eyebrow">VibeChain NFT</p>
        <h1 class="hero-title">
          Открывай,
          <span>Собирай</span>
          <br />
          и Показывай Свой NFT Мир
        </h1>
        <p class="hero-subtitle">
          Ваша NFT-коллекция в одном месте.
        </p>

        <div class="hero-actions">
          <button class="btn btn-primary" :disabled="loading" @click="loadNFTs">
            {{ loading ? 'Обновляем...' : 'Обновить коллекцию' }}
          </button>
          <button class="btn btn-outline" @click="scrollToCollections">
            Смотреть коллекцию
          </button>
        </div>

        <div class="hero-stats">
          <div class="stat-item">
            <p class="stat-label">Всего NFT</p>
            <p class="stat-value">{{ nfts.length }}</p>
          </div>
          <div class="stat-item">
            <p class="stat-label">С изображением</p>
            <p class="stat-value">{{ nftsWithImage }}</p>
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
          <p class="chip-label">Избранный NFT</p>
          <p class="chip-name">{{ featuredNft?.title || featuredNft?.metadata?.name || 'Не выбран' }}</p>
          <p class="chip-value">
            {{ featuredNft ? displayContract(featuredNft.contract.address) : 'Нет данных' }}
          </p>
        </div>
      </div>
    </section>

    <section class="collections container" ref="collectionsSection">
      <div class="section-header">
        <h2>Моя NFT-лента</h2>
        <p>Все ваши NFT в удобном формате карточек.</p>
      </div>

      <div v-if="loading" class="nfts-grid">
        <div v-for="skeleton in 8" :key="skeleton" class="nft-card skeleton-card">
          <div class="skeleton-media"></div>
          <div class="skeleton-line short"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line tiny"></div>
        </div>
      </div>

      <div v-else-if="error" class="state-card error-state">
        <p class="error-message">{{ error }}</p>
        <button class="btn btn-primary" @click="loadNFTs">Попробовать снова</button>
      </div>

      <div v-else-if="nfts.length > 0" class="nfts-grid">
        <article
          v-for="nft in nfts"
          :key="`${nft.backendId}-${nft.tokenId}`"
          class="nft-card"
          @click="selectNFT(nft)"
        >
          <div class="nft-media">
            <div v-if="isFeaturedNft(nft)" class="featured-badge">Избранное</div>
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
            <p class="nft-collection">{{ nft.contract.name || 'Неизвестная коллекция' }}</p>
            <p class="nft-description">
              {{ truncateText(nft.description || nft.metadata?.description || 'Описание отсутствует', 92) }}
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
              <span>{{ displayContract(nft.contract.address) }}</span>
              <span>#{{ nft.tokenId }}</span>
            </footer>
          </div>
        </article>
      </div>

      <div v-else class="state-card empty-state">
        <h3>NFT не найдены</h3>
        <p>В вашей коллекции пока нет NFT.</p>
        <button class="btn btn-primary" @click="loadNFTs">Обновить</button>
      </div>
    </section>

    <div v-if="selectedNft" class="nft-modal-backdrop" @click="closeNftDetails">
      <section class="nft-modal" @click.stop>
        <header class="nft-modal-header">
          <div>
            <p class="nft-modal-eyebrow">Детали NFT</p>
            <h3>{{ selectedNft.title || selectedNft.metadata?.name || `#${selectedNft.tokenId}` }}</h3>
          </div>
          <button class="modal-close" @click="closeNftDetails">Закрыть</button>
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
            <p><span>Коллекция:</span> {{ selectedNft.contract.name || 'Неизвестно' }}</p>
            <p><span>Контракт / Tx:</span> {{ displayContract(selectedNft.contract.address) }}</p>
            <p><span>Токен ID:</span> {{ selectedNft.tokenId }}</p>
            <p><span>Последнее обновление:</span> {{ formatDate(selectedNft.timeLastUpdated) }}</p>
            <p>
              <span>Описание:</span>
              {{ selectedNft.description || selectedNft.metadata?.description || 'Описание отсутствует' }}
            </p>

            <div
              v-if="selectedNft.metadata?.attributes && selectedNft.metadata.attributes.length > 0"
              class="nft-modal-traits"
            >
              <p class="modal-subtitle">Атрибуты</p>
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
                {{ isFeaturedNft(selectedNft) ? 'Уже в избранном' : 'Сделать избранным' }}
              </button>
              <button class="btn btn-outline" @click="showMetadataJson = !showMetadataJson">
                {{ showMetadataJson ? 'Скрыть метаданные JSON' : 'Показать метаданные JSON' }}
              </button>
            </div>

            <div v-if="showMetadataJson" class="nft-modal-json">
              <p class="modal-subtitle">Метаданные JSON</p>
              <pre>{{ selectedMetadataJson }}</pre>
            </div>
          </div>
        </div>
      </section>
    </div>

    <footer class="page-footer container">
      <div class="footer-brand">
        <h3>VibeChain NFT</h3>
        <p>Пространство NFT для коллекционеров и комьюнити.</p>
      </div>
      <div class="footer-column">
        <h4>Разделы</h4>
        <a href="#">Коллекции</a>
        <a href="#">Активность</a>
        <a href="#">Помощь</a>
      </div>
      <div class="footer-column">
        <h4>Ссылки</h4>
        <a href="#">Документация</a>
        <a href="#">Поддержка</a>
        <a href="#">Контакты</a>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useWalletStore } from '@/stores/wallet'
import { apiService, type NftDetails, type NftListItem } from '@/services/api'
import type { NFT } from '@/services/nft'

type NFTViewItem = NFT & {
  backendId: number
  metadataUrl?: string | null
  txHash?: string | null
}

const walletStore = useWalletStore()
const { address, chainId } = storeToRefs(walletStore)

const nfts = ref<NFTViewItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const collectionsSection = ref<HTMLElement | null>(null)
const selectedNft = ref<NFTViewItem | null>(null)
const featuredNftKey = ref<string | null>(null)
const showMetadataJson = ref(false)

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

const nftsWithImage = computed(() => nfts.value.filter((nft) => Boolean(getNFTImage(nft))).length)

const selectedMetadataJson = computed(() => {
  if (!selectedNft.value?.metadata) {
    return '{}'
  }

  return JSON.stringify(selectedNft.value.metadata, null, 2)
})

const buildNftDescription = (item: NftListItem) => {
  const parts = [`Редкость: ${item.rarity}`, `Статус: ${item.mint_status}`]
  if (item.tx_hash) {
    parts.push(`Tx: ${item.tx_hash.slice(0, 10)}...`)
  }
  return parts.join(' | ')
}

const mapBackendNft = (item: NftListItem, details?: NftDetails): NFTViewItem => {
  const contractAddress = details?.contract_address || details?.tx_hash || item.tx_hash || ''
  const tokenId = String(details?.token_id_onchain ?? item.token_id_onchain ?? item.id)
  const title = `NFT #${item.id}`

  return {
    backendId: item.id,
    contract: {
      address: contractAddress,
      name: 'Almaty Events NFT',
      symbol: 'AENFT',
    },
    tokenId,
    title,
    description: buildNftDescription(item),
    tokenUri: {
      raw: '',
      gateway: item.image_url || '',
    },
    media: item.image_url
      ? [
          {
            raw: item.image_url,
            gateway: item.image_url,
          },
        ]
      : [],
    metadata: {
      name: title,
      description: buildNftDescription(item),
      image: item.image_url || undefined,
      attributes: [
        { trait_type: 'rarity', value: item.rarity },
        { trait_type: 'mint_status', value: item.mint_status },
      ],
    },
    timeLastUpdated: item.minted_at || new Date().toISOString(),
    txHash: details?.tx_hash || item.tx_hash || null,
    metadataUrl: details?.metadata_url || null,
  }
}

const loadNFTs = async () => {
  loading.value = true
  error.value = null

  try {
    const backendItems = await apiService.getMyNfts()
    const detailsResults = await Promise.allSettled(
      backendItems.map((item) => apiService.getNftDetails(item.id)),
    )

    const detailsById = new Map<number, NftDetails>()
    for (const result of detailsResults) {
      if (result.status === 'fulfilled') {
        detailsById.set(result.value.id, result.value)
      }
    }

    nfts.value = backendItems.map((item) => mapBackendNft(item, detailsById.get(item.id)))
  } catch (err: any) {
    error.value = err?.message || 'Не удалось загрузить NFT. Попробуйте позже.'
    nfts.value = []
  } finally {
    loading.value = false
  }
}

const getNFTImage = (nft: NFTViewItem): string | undefined => {
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

const isZeroAddress = (walletAddress: string): boolean =>
  /^0x0{40}$/i.test(walletAddress)

const displayContract = (walletAddress: string): string => {
  if (!walletAddress || isZeroAddress(walletAddress)) {
    return 'Не указано'
  }
  return truncateAddress(walletAddress)
}

const getNftKey = (nft: NFTViewItem): string => `${nft.backendId}-${nft.tokenId}`

const isFeaturedNft = (nft: NFTViewItem): boolean => {
  if (!featuredNft.value) {
    return false
  }

  return getNftKey(featuredNft.value) === getNftKey(nft)
}

const setFeatured = (nft: NFTViewItem) => {
  const key = getNftKey(nft)
  featuredNftKey.value = key
  localStorage.setItem(featuredStorageKey.value, key)
}

const closeNftDetails = () => {
  selectedNft.value = null
  showMetadataJson.value = false
}

const formatDate = (value: string): string => {
  if (!value) {
    return 'Не указано'
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

const selectNFT = async (nft: NFTViewItem) => {
  selectedNft.value = nft
  try {
    const details: NftDetails = await apiService.getNftDetails(nft.backendId)

    let remoteMetadata: {
      name?: string
      description?: string
      image?: string
      attributes?: Array<{ trait_type: string; value: string | number }>
    } | null = null

    if (details.metadata_url) {
      try {
        const response = await fetch(details.metadata_url)
        if (response.ok) {
          remoteMetadata = await response.json()
        }
      } catch {
        // keep fallback metadata when remote metadata URL is unavailable
      }
    }

    const mergedAttributes =
      remoteMetadata?.attributes && remoteMetadata.attributes.length > 0
        ? remoteMetadata.attributes
        : [
            { trait_type: 'rarity', value: details.rarity },
            { trait_type: 'mint_status', value: details.mint_status },
            { trait_type: 'points', value: details.points_value },
          ]

    const mergedName = remoteMetadata?.name || nft.metadata?.name || `NFT #${details.id}`
    const mergedDescription =
      remoteMetadata?.description || `Редкость: ${details.rarity} | Статус: ${details.mint_status}`
    const mergedImage = remoteMetadata?.image || details.image_url || nft.metadata?.image

    selectedNft.value = {
      ...nft,
      tokenId: String(details.token_id_onchain ?? nft.tokenId),
      title: mergedName,
      description: mergedDescription,
      txHash: details.tx_hash || null,
      metadataUrl: details.metadata_url || null,
      contract: {
        ...nft.contract,
        address: details.contract_address || details.tx_hash || nft.contract.address,
      },
      timeLastUpdated: details.minted_at || nft.timeLastUpdated,
      metadata: {
        name: mergedName,
        description: mergedDescription,
        image: mergedImage || undefined,
        attributes: mergedAttributes,
      },
    }
    showMetadataJson.value = false
  } catch {
    // keep already selected basic card data if details request fails
    showMetadataJson.value = false
  }
}

onMounted(() => {
  featuredNftKey.value = localStorage.getItem(featuredStorageKey.value)
  loadNFTs()
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
  gap: 0.75rem;
  margin-top: 2rem;
}

.stat-item {
  min-width: 150px;
  padding: 0.62rem 0.8rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
}

.stat-value {
  margin-top: 0.2rem;
  font-size: 1.25rem;
  font-weight: 700;
}

.stat-label {
  margin-top: 0;
  font-size: 0.76rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
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
  object-fit: contain;
  background: #07090f;
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
  aspect-ratio: 3 / 4;
  border-radius: 13px;
  overflow: hidden;
  background: linear-gradient(135deg, #1f2341, #101526);
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
  object-fit: contain;
  background: #07090f;
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
  background: linear-gradient(135deg, #1f2341, #101526);
  aspect-ratio: 3 / 4;
}

.nft-modal-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #07090f;
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
