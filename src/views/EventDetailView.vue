<template>
  <div class="event-detail-view">
    <div class="container">
      <button class="back-btn" @click="goBack">Назад</button>

      <section v-if="loading" class="state-box">Загрузка события...</section>
      <section v-else-if="error" class="state-box error">{{ error }}</section>

      <section v-else-if="eventData" class="detail-card">
        <div class="poster-wrap" :class="{ 'poster-wrap-standup': isStandup }">
          <img
            v-if="imageUrl"
            :src="imageUrl"
            :data-fallback="rawImageUrl"
            :alt="title"
            class="poster"
            :class="{ 'poster-standup': isStandup }"
            @error="onImageError"
          />
          <div v-else class="poster-fallback">No Image</div>
        </div>

        <div class="content">
          <p class="type-chip">{{ typeLabel }}</p>
          <h1 class="title">{{ title }}</h1>
          <p class="meta">{{ dateText }}</p>
          <p class="meta">{{ placeText }}</p>
          <p v-if="descriptionText" class="description">{{ descriptionText }}</p>

          <div class="actions">
            <button class="action-btn primary" :disabled="buyLoading" @click="buyTicket">
              {{ buyLoading ? 'Открываем...' : 'Купить билет' }}
            </button>
            <button class="action-btn" :disabled="nftLoading" @click="getNft">
              {{ nftLoading ? 'Чек-ин...' : 'Получить NFT' }}
            </button>
            <button class="action-btn" :disabled="!eventPageUrl" @click="openEventPage">
              Перейти на страницу события
            </button>
          </div>

          <div v-if="nftStatus" class="status-box">{{ nftStatus }}</div>
          <div v-if="nftResult" class="links-box">
            <a v-if="nftResult.etherscan" :href="nftResult.etherscan" target="_blank" rel="noreferrer">Etherscan tx</a>
            <a v-if="nftResult.imageUrl" :href="nftResult.imageUrl" target="_blank" rel="noreferrer">NFT image</a>
            <button
              v-if="importHint && metaMaskAvailable"
              class="import-btn"
              type="button"
              @click="addNftToMetaMaskManually"
            >
              Добавить NFT в MetaMask
            </button>
          </div>
          <p v-if="importHint" class="import-hint">
            Если окно MetaMask не появилось: сеть {{ getChainName(importHint.chainId) }}, контракт {{ importHint.contractAddress }}, Token ID {{ importHint.tokenId }}.
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  apiService,
  type BuyTicketResponse,
  type Concert,
  type EventTypeName,
  type Movie,
  type StandupEvent,
  type TheatreEvent,
} from '@/services/api'
import { authService } from '@/services/auth'

type EventData = Movie | Concert | TheatreEvent | StandupEvent

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref<string | null>(null)
const eventData = ref<EventData | null>(null)
const buyLoading = ref(false)
const nftLoading = ref(false)
const nftStatus = ref<string>('')
const nftResult = ref<{ etherscan?: string; imageUrl?: string } | null>(null)
const importHint = ref<{ contractAddress: string; tokenId: string; chainId: number } | null>(null)

const NFT_CONTRACT_ADDRESS =
  (import.meta.env.VITE_NFT_CONTRACT_ADDRESS as string | undefined)?.trim() ||
  '0x77951dD6E495d480a6ad61133189d651D63d0E0b'
const NFT_CHAIN_ID = Number((import.meta.env.VITE_NFT_CHAIN_ID as string | undefined)?.trim() || '11155111')

const CHAIN_CONFIGS: Record<number, { chainName: string; rpcUrls: string[]; blockExplorerUrls: string[]; nativeCurrency: { name: string; symbol: string; decimals: number } }> = {
  11155111: {
    chainName: 'Sepolia',
    rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    nativeCurrency: {
      name: 'Sepolia ETH',
      symbol: 'ETH',
      decimals: 18,
    },
  },
}

const ERC721_OWNER_OF_ABI = ['function ownerOf(uint256 tokenId) view returns (address)']

const metaMaskAvailable = computed(() => {
  const ethereum = (window as any).ethereum
  return Boolean(ethereum?.request)
})

const eventType = computed(() => route.params.type as EventTypeName)
const eventId = computed(() => Number(route.params.id))
const isStandup = computed(() => eventType.value === 'standup')

const typeLabel = computed(() => {
  const labels: Record<EventTypeName, string> = {
    movie: 'Фильм',
    concert: 'Концерт',
    theatre: 'Театр',
    standup: 'Стендап',
  }
  return labels[eventType.value]
})

const title = computed(() => {
  const item = eventData.value
  if (!item) return ''
  if (eventType.value === 'movie') return (item as Movie).title
  if (eventType.value === 'concert') return (item as Concert).title
  if (eventType.value === 'theatre') return (item as TheatreEvent).name
  return (item as StandupEvent).title
})

const rawImageUrl = computed(() => {
  const item = eventData.value
  if (!item) return ''
  if (eventType.value === 'movie') return (item as Movie).poster || ''
  if (eventType.value === 'concert') return (item as Concert).poster || ''
  if (eventType.value === 'theatre') return (item as TheatreEvent).small_poster || ''
  return (item as StandupEvent).image || (item as StandupEvent).image_mobile || ''
})

const toHighResImage = (url: string): string => {
  if (!url || !url.includes('cdn.kino.kz')) return url
  return url.replace(/\/p\d+x\d+\.(webp|jpg|jpeg|png)$/i, '/p616x883.$1')
}

const imageUrl = computed(() => toHighResImage(rawImageUrl.value))

const dateText = computed(() => {
  const item = eventData.value
  if (!item) return 'Дата не указана'

  let raw = ''
  if (eventType.value === 'movie') raw = (item as Movie).premiere_date
  else if (eventType.value === 'concert') raw = (item as Concert).date
  else if (eventType.value === 'theatre') raw = (item as TheatreEvent).next_session_date
  else raw = (item as StandupEvent).event_dates

  if (!raw) return 'Дата не указана'
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw
  return parsed.toLocaleString('ru-RU')
})

const placeText = computed(() => {
  const item = eventData.value
  if (!item) return 'Место не указано'

  if (eventType.value === 'movie') return 'Кинотеатр'
  if (eventType.value === 'concert') {
    const concert = item as Concert
    return concert.place || concert.city || 'Концертная площадка'
  }
  if (eventType.value === 'theatre') return (item as TheatreEvent).partner_name || 'Театр'
  const standup = item as StandupEvent
  return standup.address || standup.city || 'Standup'
})

const descriptionText = computed(() => {
  if (!eventData.value) return ''
  if (eventType.value === 'standup') {
    return (eventData.value as StandupEvent).description || (eventData.value as StandupEvent).content || ''
  }
  return ''
})

const eventPageUrl = computed(() => {
  const item = eventData.value
  if (!item) return ''
  if (eventType.value === 'movie') return (item as Movie).movie_url || ''
  if (eventType.value === 'concert') return (item as Concert).url || ''
  if (eventType.value === 'theatre') return (item as TheatreEvent).event_url || ''
  return (item as StandupEvent).url || ''
})

const eventTypeId = computed(() => {
  const item = eventData.value
  if (!item) {
    const fallback: Record<EventTypeName, number> = { movie: 1, concert: 2, theatre: 3, standup: 4 }
    return fallback[eventType.value]
  }
  return (item as any).event_type_id
})

const loadEvent = async () => {
  loading.value = true
  error.value = null

  try {
    if (!Number.isFinite(eventId.value)) {
      throw new Error('Некорректный id события')
    }

    if (eventType.value === 'movie') {
      eventData.value = await apiService.getMovieById(eventId.value)
    } else if (eventType.value === 'concert') {
      eventData.value = await apiService.getConcertById(eventId.value)
    } else if (eventType.value === 'theatre') {
      eventData.value = await apiService.getTheatreById(eventId.value)
    } else if (eventType.value === 'standup') {
      eventData.value = await apiService.getStandupById(eventId.value)
    } else {
      throw new Error('Неизвестный тип события')
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить событие'
  } finally {
    loading.value = false
  }
}

const extractTicketUrl = (response: BuyTicketResponse): string | null => {
  const direct = response.buy_ticket_url || response.url || response.link
  if (typeof direct === 'string' && direct.trim()) return direct

  for (const value of Object.values(response)) {
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
      return value
    }
  }

  return null
}

const buyTicket = async () => {
  if (!eventData.value) return

  buyLoading.value = true
  try {
    let response: BuyTicketResponse = {}
    if (eventType.value === 'movie') response = await apiService.buyMovieTicket(eventId.value)
    else if (eventType.value === 'concert') response = await apiService.buyConcertTicket(eventId.value)
    else if (eventType.value === 'theatre') response = await apiService.buyTheatreTicket(eventId.value)
    else response = await apiService.buyStandupTicket(eventId.value)

    const ticketUrl = extractTicketUrl(response) || eventPageUrl.value
    if (ticketUrl) {
      window.open(ticketUrl, '_blank', 'noopener,noreferrer')
      return
    }

    nftStatus.value = 'Ссылка на покупку не найдена в ответе сервера'
  } catch (e) {
    nftStatus.value = e instanceof Error ? e.message : 'Ошибка открытия покупки билета'
  } finally {
    buyLoading.value = false
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const getChainName = (chainId: number) => CHAIN_CONFIGS[chainId]?.chainName || `chainId ${chainId}`

const normalizeChainId = (chainId?: number | null): number => {
  if (typeof chainId === 'number' && Number.isFinite(chainId) && chainId > 0) {
    return chainId
  }

  return NFT_CHAIN_ID
}

const toChainHex = (chainId: number): string => `0x${chainId.toString(16)}`

const ensureMetaMaskChain = async (chainId: number): Promise<boolean> => {
  const ethereum = (window as any).ethereum
  if (!ethereum?.request) {
    return false
  }

  const requiredHex = toChainHex(chainId).toLowerCase()

  try {
    const currentHex: string = await ethereum.request({ method: 'eth_chainId' })
    if (currentHex?.toLowerCase() === requiredHex) {
      return true
    }

    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: requiredHex }],
    })
    return true
  } catch (switchError: any) {
    if (switchError?.code === 4902 && CHAIN_CONFIGS[chainId]) {
      try {
        const config = CHAIN_CONFIGS[chainId]
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: requiredHex,
              chainName: config.chainName,
              rpcUrls: config.rpcUrls,
              blockExplorerUrls: config.blockExplorerUrls,
              nativeCurrency: config.nativeCurrency,
            },
          ],
        })

        return true
      } catch {
        return false
      }
    }

    return false
  }
}

const resolveNftImportContext = async (
  tokenId: number | string | null | undefined,
  imageUrl?: string | null,
): Promise<{ contractAddress: string; chainId: number; imageUrl?: string | null }> => {
  const resolved = {
    contractAddress: NFT_CONTRACT_ADDRESS,
    chainId: normalizeChainId(undefined),
    imageUrl: imageUrl || null,
  }

  if (tokenId === null || tokenId === undefined || tokenId === '') {
    return resolved
  }

  try {
    const tokenNumber = Number(tokenId)
    if (Number.isFinite(tokenNumber) && tokenNumber > 0) {
      const directDetails = await apiService.getNftDetails(tokenNumber)
      if (directDetails.contract_address) {
        resolved.contractAddress = directDetails.contract_address
      }
      resolved.chainId = normalizeChainId(directDetails.chain_id)
      if (!resolved.imageUrl && directDetails.image_url) {
        resolved.imageUrl = directDetails.image_url
      }
      return resolved
    }

    const myNfts = await apiService.getMyNfts()
    const matched = myNfts.find((item) => String(item.token_id_onchain ?? '') === String(tokenId))
    if (!matched) {
      return resolved
    }

    const details = await apiService.getNftDetails(matched.id)
    if (details.contract_address) {
      resolved.contractAddress = details.contract_address
    }

    resolved.chainId = normalizeChainId(details.chain_id)
    if (!resolved.imageUrl && details.image_url) {
      resolved.imageUrl = details.image_url
    }
  } catch (contextError) {
    console.warn('Не удалось получить контекст NFT для MetaMask, используем значения по умолчанию:', contextError)
  }

  return resolved
}

const getConnectedWalletAddress = async (): Promise<string | null> => {
  const ethereum = (window as any).ethereum
  if (!ethereum?.request) {
    return null
  }

  try {
    const accounts: string[] = await ethereum.request({ method: 'eth_accounts' })
    return accounts[0] || null
  } catch {
    return null
  }
}

const getTokenOwner = async (
  contractAddress: string,
  tokenId: string,
  chainId: number,
): Promise<string | null> => {
  const rpcUrl = CHAIN_CONFIGS[chainId]?.rpcUrls?.[0]
  if (!rpcUrl) {
    return null
  }

  try {
    const { JsonRpcProvider, Contract, getAddress } = await import('ethers')
    const provider = new JsonRpcProvider(rpcUrl)
    const contract = new Contract(contractAddress, ERC721_OWNER_OF_ABI, provider)
    const owner = await (contract as any).ownerOf(BigInt(tokenId))
    return getAddress(String(owner))
  } catch {
    return null
  }
}

const addNftToMetaMask = async (tokenId: number | string | null | undefined, imageUrl?: string | null) => {
  if (tokenId === null || tokenId === undefined || tokenId === '') {
    return false
  }

  const normalizedTokenId = String(tokenId)
  const context = await resolveNftImportContext(normalizedTokenId, imageUrl)
  importHint.value = {
    contractAddress: context.contractAddress,
    tokenId: normalizedTokenId,
    chainId: context.chainId,
  }

  const ethereum = (window as any).ethereum
  if (!ethereum?.request) {
    return false
  }

  const chainReady = await ensureMetaMaskChain(context.chainId)
  if (!chainReady) {
    nftStatus.value = `NFT готов. Переключите MetaMask в сеть ${getChainName(context.chainId)} и попробуйте снова.`
    return false
  }

  const currentWallet = await getConnectedWalletAddress()
  const tokenOwner = await getTokenOwner(context.contractAddress, normalizedTokenId, context.chainId)
  if (currentWallet && tokenOwner && currentWallet.toLowerCase() !== tokenOwner.toLowerCase()) {
    nftStatus.value = `NFT выпущен на адрес ${tokenOwner}, а в MetaMask выбран ${currentWallet}. Переключите аккаунт и повторите.`
    return false
  }

  try {
    const added = await ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC721',
        options: {
          address: context.contractAddress,
          tokenId: normalizedTokenId,
          image: context.imageUrl || undefined,
        },
      },
    })

    return Boolean(added)
  } catch (e: any) {
    const message = String(e?.message || '')

    if (message.includes('does not match the chain') || message.includes('Unable to verify ownership')) {
      const walletPart = currentWallet ? ` Текущий адрес: ${currentWallet}.` : ''
      nftStatus.value = `MetaMask не смог подтвердить владение NFT в сети ${getChainName(context.chainId)}.${walletPart} Проверьте контракт/сеть и аккаунт.`
      return false
    }

    if (e?.code === -32002) {
      nftStatus.value = 'Запрос уже открыт в MetaMask. Подтвердите его в кошельке.'
      return false
    }

    if (e?.code === 4001) {
      nftStatus.value = 'Добавление NFT отменено в MetaMask.'
      return false
    }

    console.warn('Не удалось открыть окно добавления NFT в MetaMask:', e)
    return false
  }
}

const addNftToMetaMaskManually = async () => {
  if (!importHint.value) return

  const added = await addNftToMetaMask(importHint.value.tokenId, nftResult.value?.imageUrl)
  nftStatus.value = added
    ? 'NFT готов и добавлен в MetaMask.'
    : 'NFT готов. Подтвердите добавление в MetaMask или импортируйте вручную по данным ниже.'
}

const pollNft = async (checkinId: number, maxAttempts = 40, tokenIdHint?: number | null) => {
  for (let i = 0; i < maxAttempts; i += 1) {
    const status = await apiService.getCheckinNftStatus(checkinId)

    if (status.status === 'pending') {
      nftStatus.value = 'Создаем NFT...'
    } else if (status.status === 'minting') {
      nftStatus.value = 'Минтим NFT в сети...'
    } else if (status.status === 'minted') {
      const tokenId = status.nft_token?.token_id ?? tokenIdHint ?? null
      const txHash = status.nft_token?.tx_hash
      const image = status.nft_token?.image_url
      nftResult.value = {
        etherscan: txHash ? `https://sepolia.etherscan.io/tx/${txHash}` : undefined,
        imageUrl: image || undefined,
      }

      const added = await addNftToMetaMask(tokenId, image)
      nftStatus.value = added
        ? 'NFT готов и добавлен в MetaMask.'
        : 'NFT готов. Подтвердите добавление в MetaMask или импортируйте вручную по данным ниже.'
      return
    } else if (status.status === 'failed') {
      nftStatus.value = 'Не удалось выпустить NFT. Попробуйте позже.'
      return
    } else {
      nftStatus.value = `Текущий статус: ${status.status}`
      return
    }

    await wait(3000)
  }

  nftStatus.value = 'Проверка занимает больше времени, попробуйте обновить статус позже.'
}

const getNft = async () => {
  if (!eventData.value) return

  if (!authService.isAuthenticated()) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }

  nftLoading.value = true
  nftResult.value = null
  importHint.value = null
  nftStatus.value = 'Создаем чек-ин...'

  try {
    const checkin = await apiService.createCheckin({
      event_type_id: eventTypeId.value,
      external_event_id: eventId.value,
    })

    if (checkin.status === 'minted') {
      const added = await addNftToMetaMask(checkin.nft_token_id)
      nftStatus.value = added
        ? 'NFT готов и добавлен в MetaMask.'
        : 'NFT уже готов. Подтвердите добавление в MetaMask или импортируйте вручную по данным ниже.'
      return
    }

    nftStatus.value = `Чек-ин создан (#${checkin.checkin_id}), ожидаем выпуск NFT...`
    await pollNft(checkin.checkin_id, 40, checkin.nft_token_id)
  } catch (e) {
    nftStatus.value = e instanceof Error ? e.message : 'Ошибка получения NFT'
  } finally {
    nftLoading.value = false
  }
}

const openEventPage = () => {
  if (!eventPageUrl.value) return
  window.open(eventPageUrl.value, '_blank', 'noopener,noreferrer')
}

const goBack = () => {
  router.back()
}

const onImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  const fallback = img.dataset.fallback
  if (fallback && img.src !== fallback) {
    img.src = fallback
    return
  }
  img.style.display = 'none'
}

onMounted(() => {
  loadEvent()
})
</script>

<style scoped>
.event-detail-view {
  min-height: calc(100vh - 80px);
  background:
    radial-gradient(circle at 12% 0%, rgba(208, 66, 94, 0.18), transparent 34%),
    radial-gradient(circle at 88% 20%, rgba(72, 146, 255, 0.2), transparent 34%),
    linear-gradient(180deg, #090d1f 0%, #080a16 60%, #05070f 100%);
  padding: 2rem 0;
}

.container {
  width: min(1120px, 92vw);
  margin: 0 auto;
}

.back-btn {
  border: 1px solid rgba(167, 179, 235, 0.35);
  background: rgba(255, 255, 255, 0.04);
  color: #eaf0ff;
  border-radius: 999px;
  padding: 0.45rem 0.95rem;
  cursor: pointer;
  margin-bottom: 1rem;
}

.state-box {
  border-radius: 14px;
  border: 1px solid rgba(167, 179, 235, 0.28);
  background: rgba(12, 17, 34, 0.78);
  padding: 1rem;
  color: #d7e0ff;
}

.state-box.error {
  color: #ffc1cc;
}

.detail-card {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 1.5rem;
  border-radius: 20px;
  border: 1px solid rgba(167, 179, 235, 0.24);
  background: linear-gradient(180deg, rgba(18, 22, 44, 0.97), rgba(9, 12, 24, 0.95));
  box-shadow: 0 18px 34px rgba(0, 0, 0, 0.35);
  padding: 1.1rem;
}

.poster-wrap {
  border-radius: 14px;
  overflow: hidden;
  min-height: 420px;
  background: linear-gradient(145deg, #2d2f6f 0%, #1a1d3e 100%);
}

.poster-wrap-standup {
  min-height: 0;
  aspect-ratio: 16 / 9;
  background: #070c1b;
  align-self: start;
}

.poster {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.poster-standup {
  object-fit: cover;
  background: #070c1b;
}

.poster-fallback {
  height: 100%;
  display: grid;
  place-items: center;
  color: #9fb0e4;
}

.content {
  padding: 0.3rem 0.4rem;
}

.type-chip {
  display: inline-block;
  margin: 0;
  padding: 0.28rem 0.6rem;
  border-radius: 999px;
  background: rgba(79, 157, 255, 0.2);
  color: #bdd4ff;
  font-weight: 700;
  font-size: 0.78rem;
}

.title {
  margin: 0.8rem 0 0.8rem;
  color: #f3f7ff;
  font-size: 2rem;
  line-height: 1.2;
}

.meta {
  margin: 0.3rem 0;
  color: #b8c6ef;
}

.description {
  margin-top: 1rem;
  color: #d8e2ff;
  line-height: 1.5;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1.3rem;
}

.action-btn {
  border: 1px solid rgba(167, 179, 235, 0.35);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  color: #edf2ff;
  font-weight: 700;
  padding: 0.6rem 0.9rem;
  cursor: pointer;
}

.action-btn.primary {
  background: linear-gradient(120deg, #7d4dff, #6a6cff);
  border-color: transparent;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-box {
  margin-top: 1rem;
  color: #cde1ff;
}

.links-box {
  margin-top: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.links-box a {
  color: #8dd2ff;
}

.import-btn {
  border: 1px solid rgba(167, 179, 235, 0.35);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: #edf2ff;
  font-weight: 700;
  padding: 0.32rem 0.75rem;
  cursor: pointer;
}

.import-hint {
  margin-top: 0.55rem;
  color: #a8bae9;
  font-size: 0.88rem;
  line-height: 1.45;
  word-break: break-word;
}

@media (max-width: 960px) {
  .detail-card {
    grid-template-columns: 1fr;
  }

  .poster-wrap {
    min-height: 320px;
  }

  .title {
    font-size: 1.6rem;
  }
}
</style>
