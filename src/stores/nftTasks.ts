import { ref } from 'vue'
import { defineStore } from 'pinia'
import { apiService, type CheckinNftStatusResponse } from '@/services/api'
import { requestMetaMaskNftImport } from '@/services/metaMaskNft'

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
  }
}

interface NftTask {
  checkinId: number
  eventTitle: string
  status: NftTaskStatus
  startedAt: number
  tokenId?: string
  imageUrl?: string | null
}

const POLL_INTERVAL_MS = 4_000
const POLL_TIMEOUT_MS = 10 * 60_000
const pollTimers = new Map<number, number>()
let notificationId = 0
let latestCheckinId: number | null = null

export const useNftTasksStore = defineStore('nftTasks', () => {
  const tasks = ref<NftTask[]>([])
  const notifications = ref<NftNotification[]>([])

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
    if (task) task.status = status
  }

  const finishTask = async (task: NftTask, status: NftTaskStatus) => {
    updateTaskStatus(task.checkinId, status)
    stopPolling(task.checkinId)

    notifications.value = notifications.value.filter(
      (item) => item.kind !== 'progress' || !item.message.includes(`#${task.checkinId}`),
    )

    if (status === 'minted') {
      const metaMaskAsset = task.tokenId
        ? {
            tokenId: task.tokenId,
            imageUrl: task.imageUrl,
          }
        : undefined

      notify({
        kind: 'success',
        title: 'Ваш NFT готов',
        message: `${task.eventTitle} уже появился в вашей коллекции.`,
        actionLabel: 'Открыть Мои NFT',
        actionRoute: '/nft',
        metaMaskAsset,
      })

      if (metaMaskAsset && task.checkinId === latestCheckinId) {
        await requestMetaMaskNftImport(
          metaMaskAsset,
          undefined,
          () => task.checkinId === latestCheckinId,
        )
      }
      return
    }

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
    eventTitle: string
    initialStatus?: NftTaskStatus
    tokenId?: string
  }) => {
    const existing = tasks.value.find((item) => item.checkinId === payload.checkinId)
    if (existing) return

    const task: NftTask = {
      checkinId: payload.checkinId,
      eventTitle: payload.eventTitle,
      status: payload.initialStatus || 'pending',
      startedAt: Date.now(),
      tokenId: payload.tokenId,
    }
    tasks.value.push(task)
    latestCheckinId = task.checkinId

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

  return {
    notifications,
    trackCheckin,
    dismissNotification,
  }
})
