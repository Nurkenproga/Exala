import { ref } from 'vue'
import { defineStore } from 'pinia'
import { apiService, type CheckinNftStatusResponse } from '@/services/api'
import {
  getMintedTokenIdFromTransaction,
  requestMetaMaskNftImportDirect,
} from '@/services/metaMaskNft'

type NftTaskStatus = CheckinNftStatusResponse['status']
type NotificationKind = 'progress' | 'success' | 'error'

export interface NftNotification {
  id: number
  kind: NotificationKind
  title: string
  message: string
  actionLabel?: string
  actionRoute?: string
  metaMaskAsset?: {
    tokenId: string
    imageUrl?: string | null
    contractAddress?: string | null
  }
}

interface NftTask {
  checkinId: number
  backendNftId: number
  eventTitle: string
  status: NftTaskStatus
  startedAt: number
  tokenId?: string
  imageUrl?: string | null
  contractAddress?: string | null
  txHash?: string | null
}

const POLL_INTERVAL_MS = 4_000
const POLL_TIMEOUT_MS = 10 * 60_000
const TOKEN_RESOLUTION_INTERVAL_MS = 2_500
const TOKEN_RESOLUTION_TIMEOUT_MS = 90_000
const TASK_STORAGE_KEY = 'nft:pending-tasks:v1'
const pollTimers = new Map<number, number>()
let notificationId = 0
let latestCheckinId: number | null = null

export const useNftTasksStore = defineStore('nftTasks', () => {
  const tasks = ref<NftTask[]>([])
  const notifications = ref<NftNotification[]>([])

  const persistTasks = () => {
    const unfinishedTasks = tasks.value.filter(
      (task) =>
        task.status === 'pending' ||
        task.status === 'minting' ||
        (task.status === 'minted' && !task.tokenId),
    )
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(unfinishedTasks))
  }

  const removeTask = (checkinId: number) => {
    tasks.value = tasks.value.filter((item) => item.checkinId !== checkinId)
    persistTasks()
  }

  const dismissNotification = (id: number) => {
    notifications.value = notifications.value.filter((item) => item.id !== id)
  }

  const notify = (notification: Omit<NftNotification, 'id'>, autoCloseMs = 0) => {
    const id = ++notificationId
    notifications.value.unshift({ id, ...notification })

    if (autoCloseMs > 0) {
      window.setTimeout(() => dismissNotification(id), autoCloseMs)
    }

    return id
  }

  const stopPolling = (checkinId: number) => {
    const timer = pollTimers.get(checkinId)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      pollTimers.delete(checkinId)
    }
  }

  const updateTaskStatus = (checkinId: number, status: NftTaskStatus) => {
    const task = tasks.value.find((item) => item.checkinId === checkinId)
    if (task) {
      task.status = status
      persistTasks()
    }
  }

  const wait = (durationMs: number) =>
    new Promise<void>((resolve) => window.setTimeout(resolve, durationMs))

  const resolveMintedToken = async (task: NftTask) => {
    const deadline = Date.now() + TOKEN_RESOLUTION_TIMEOUT_MS

    while (!task.tokenId && Date.now() < deadline) {
      try {
        const status = await apiService.getCheckinNftStatus(task.checkinId)
        if (status.nft_token?.token_id !== null && status.nft_token?.token_id !== undefined) {
          task.tokenId = String(status.nft_token.token_id)
        }
        task.imageUrl = status.nft_token?.image_url || task.imageUrl
        task.contractAddress = status.nft_token?.contract_address || task.contractAddress
        task.txHash = status.nft_token?.tx_hash || task.txHash
      } catch (error) {
        console.warn(`Не удалось обновить статус NFT для check-in ${task.checkinId}:`, error)
      }

      if (!task.tokenId) {
        try {
          const details = await apiService.getNftDetails(task.backendNftId)
          if (details.token_id_onchain !== null && details.token_id_onchain !== undefined) {
            task.tokenId = String(details.token_id_onchain)
          }
          task.imageUrl = details.image_url || task.imageUrl
          task.contractAddress = details.contract_address || task.contractAddress
          task.txHash = details.tx_hash || task.txHash
        } catch (error) {
          console.warn(`Не удалось получить детали NFT ${task.backendNftId}:`, error)
        }
      }

      if (!task.tokenId && task.txHash) {
        task.tokenId =
          (await getMintedTokenIdFromTransaction(task.txHash, task.contractAddress)) || undefined
      }

      persistTasks()
      if (!task.tokenId) {
        await wait(TOKEN_RESOLUTION_INTERVAL_MS)
      }
    }

    return task.tokenId
  }

  const finishTask = async (task: NftTask, status: NftTaskStatus) => {
    updateTaskStatus(task.checkinId, status)
    stopPolling(task.checkinId)

    notifications.value = notifications.value.filter(
      (item) => item.kind !== 'progress' || !item.message.includes(`#${task.checkinId}`),
    )

    if (status === 'minted') {
      await resolveMintedToken(task)

      if (!task.tokenId) {
        removeTask(task.checkinId)
        notify({
          kind: 'error',
          title: 'NFT выпущен, но Token ID не получен',
          message: 'Сервер сообщил о mint, но не вернул blockchain Token ID. Автоматически открыть MetaMask пока невозможно.',
          actionLabel: 'Открыть Мои NFT',
          actionRoute: '/nft',
        })
        return
      }

      const metaMaskAsset = {
        tokenId: task.tokenId,
        imageUrl: task.imageUrl,
        contractAddress: task.contractAddress,
      }

      const automaticImport = task.checkinId === latestCheckinId
        ? requestMetaMaskNftImportDirect(metaMaskAsset)
        : null

      removeTask(task.checkinId)
      notify({
        kind: 'success',
        title: 'Ваш NFT готов',
        message: `${task.eventTitle} уже появился в коллекции. Подтвердите добавление в MetaMask.`,
        actionLabel: 'Открыть Мои NFT',
        actionRoute: '/nft',
        metaMaskAsset,
      })

      if (automaticImport) {
        const result = await automaticImport
        if (
          result.status !== 'added' &&
          result.status !== 'rejected'
        ) {
          notify({
            kind: 'error',
            title: 'MetaMask не открыл новый NFT',
            message: result.message,
            actionLabel: 'Открыть NFT и повторить',
            actionRoute: '/nft',
            metaMaskAsset,
          })
        }
      }
      return
    }

    removeTask(task.checkinId)
    notify({
      kind: 'error',
      title: 'NFT не удалось выпустить',
      message: 'Создание завершилось с ошибкой. Попробуйте получить NFT еще раз позже.',
    })
  }

  const pollTask = async (checkinId: number) => {
    const task = tasks.value.find((item) => item.checkinId === checkinId)
    if (!task) return

    if (Date.now() - task.startedAt > POLL_TIMEOUT_MS) {
      stopPolling(checkinId)
      removeTask(checkinId)
      notify({
        kind: 'error',
        title: 'NFT создается дольше обычного',
        message: 'Мы остановили автоматическую проверку. Позже загляните в раздел «Мои NFT».',
        actionLabel: 'Открыть Мои NFT',
        actionRoute: '/nft',
      })
      return
    }

    try {
      const response = await apiService.getCheckinNftStatus(checkinId)
      updateTaskStatus(checkinId, response.status)

      if (response.status === 'minted' || response.status === 'failed' || response.status === 'no_nft') {
        if (response.nft_token?.token_id !== null && response.nft_token?.token_id !== undefined) {
          task.tokenId = String(response.nft_token.token_id)
        }
        task.imageUrl = response.nft_token?.image_url || null
        task.contractAddress = response.nft_token?.contract_address || null
        task.txHash = response.nft_token?.tx_hash || null
        await finishTask(task, response.status)
        return
      }
    } catch (error) {
      console.warn(`Не удалось проверить статус NFT для check-in ${checkinId}:`, error)
    }

    const timer = window.setTimeout(() => pollTask(checkinId), POLL_INTERVAL_MS)
    pollTimers.set(checkinId, timer)
  }

  const trackCheckin = (payload: {
    checkinId: number
    backendNftId: number
    eventTitle: string
    initialStatus?: NftTaskStatus
  }) => {
    const existing = tasks.value.find((item) => item.checkinId === payload.checkinId)
    if (existing) return

    const task: NftTask = {
      checkinId: payload.checkinId,
      backendNftId: payload.backendNftId,
      eventTitle: payload.eventTitle,
      status: payload.initialStatus || 'pending',
      startedAt: Date.now(),
    }
    tasks.value.push(task)
    latestCheckinId = task.checkinId
    persistTasks()

    if (task.status === 'minted') {
      finishTask(task, 'minted')
      return
    }

    notify(
      {
        kind: 'progress',
        title: 'NFT создается в фоне',
        message: `Чек-ин #${task.checkinId} принят. Можно продолжать пользоваться сайтом.`,
      },
      8_000,
    )

    pollTask(task.checkinId)
  }

  const init = () => {
    const savedTasks = localStorage.getItem(TASK_STORAGE_KEY)
    if (!savedTasks) return

    try {
      const restoredTasks = JSON.parse(savedTasks) as NftTask[]
      tasks.value = restoredTasks.filter(
        (task) =>
          Number.isInteger(task.checkinId) &&
          Number.isInteger(task.backendNftId) &&
          typeof task.eventTitle === 'string' &&
          (
            task.status === 'pending' ||
            task.status === 'minting' ||
            (task.status === 'minted' && !task.tokenId)
          ),
      )
      latestCheckinId =
        tasks.value.reduce<NftTask | null>(
          (latest, task) => (!latest || task.startedAt > latest.startedAt ? task : latest),
          null,
        )?.checkinId ?? null
      tasks.value.forEach((task) => pollTask(task.checkinId))
      persistTasks()
    } catch {
      localStorage.removeItem(TASK_STORAGE_KEY)
    }
  }

  return {
    notifications,
    trackCheckin,
    dismissNotification,
    init,
  }
})
