<template>
  <div class="search-view">
    <div class="container">
      <div class="page-header">
        <h2 class="page-title">Глобальный поиск</h2>
        <p class="page-subtitle">Люди и мероприятия по названию</p>
      </div>

      <section class="search-panel">
        <div class="tabs">
          <button
            class="tab-btn"
            :class="{ active: mode === 'people' }"
            @click="setMode('people')"
          >
            Люди
          </button>
          <button
            class="tab-btn"
            :class="{ active: mode === 'events' }"
            @click="setMode('events')"
          >
            Мероприятия
          </button>
        </div>

        <div class="search-row">
          <input
            v-model.trim="query"
            class="search-input"
            type="text"
            :placeholder="mode === 'people' ? 'Введите никнейм' : 'Введите название мероприятия'"
            @keyup.enter="runSearch"
          />
          <button class="search-btn" :disabled="loading" @click="runSearch">
            {{ loading ? 'Поиск...' : 'Найти' }}
          </button>
        </div>
      </section>

      <section v-if="error" class="error-box">{{ error }}</section>

      <section v-if="mode === 'people'" class="results-grid">
        <article v-for="person in peopleResults" :key="person.id" class="result-card">
          <div>
            <p class="result-title">{{ person.username }}</p>
            <p class="result-subtitle">ID: {{ person.id }}</p>
          </div>
          <div class="person-actions">
            <button
              v-if="person.id !== myUserId"
              class="follow-btn"
              :class="{ danger: followingIds.has(person.id) }"
              :disabled="followLoadingId === person.id"
              @click="toggleFollow(person)"
            >
              {{ followLoadingId === person.id ? '...' : followingIds.has(person.id) ? 'Отписаться' : 'Подписаться' }}
            </button>
            <button class="open-btn" @click="openUser(person.id)">Открыть профиль</button>
          </div>
        </article>
        <p v-if="!loading && searched && peopleResults.length === 0" class="empty-note">Пользователи не найдены</p>
      </section>

      <section v-else class="results-grid">
        <article v-for="event in eventResults" :key="`${event.type}-${event.id}`" class="result-card event-card">
          <img v-if="event.image" class="event-thumb" :src="event.image" :alt="event.title" />
          <div class="event-meta">
            <p class="result-title">{{ event.title }}</p>
            <p class="result-subtitle">{{ eventTypeLabel(event.type) }}</p>
            <p class="result-subtitle">{{ formatDate(event.date) }}</p>
            <p class="result-subtitle">{{ event.location }}</p>
            <p class="payload-note">
              event_type_id: {{ event.event_type_id }} | external_event_id (payload): {{ event.external_event_id }}
            </p>
            <p class="payload-note">
              source external id: {{ event.source_external_event_id }}
            </p>
            <div class="event-actions">
              <button
                class="open-btn"
                :disabled="checkinLoadingKey === getEventKey(event)"
                @click="runCheckin(event)"
              >
                {{ checkinLoadingKey === getEventKey(event) ? 'Чек-ин...' : 'Сделать чек-ин' }}
              </button>
              <p v-if="checkinStatusByKey[getEventKey(event)]" class="checkin-status">
                {{ checkinStatusByKey[getEventKey(event)] }}
              </p>
              <div v-if="checkinResultByKey[getEventKey(event)]" class="checkin-links">
                <a
                  v-if="checkinResultByKey[getEventKey(event)]?.etherscan"
                  :href="checkinResultByKey[getEventKey(event)]!.etherscan"
                  target="_blank"
                  rel="noreferrer"
                >
                  Etherscan tx
                </a>
                <a
                  v-if="checkinResultByKey[getEventKey(event)]?.imageUrl"
                  :href="checkinResultByKey[getEventKey(event)]!.imageUrl"
                  target="_blank"
                  rel="noreferrer"
                >
                  NFT image
                </a>
              </div>
            </div>
          </div>
        </article>
        <p v-if="!loading && searched && eventResults.length === 0" class="empty-note">Мероприятия не найдены</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiService, type EventSearchItem, type UserShort } from '@/services/api'

const router = useRouter()
const mode = ref<'people' | 'events'>('people')
const query = ref('')
const loading = ref(false)
const searched = ref(false)
const error = ref<string | null>(null)

const peopleResults = ref<UserShort[]>([])
const eventResults = ref<EventSearchItem[]>([])
const followingIds = ref<Set<number>>(new Set())
const followLoadingId = ref<number | null>(null)
const myUserId = ref<number | null>(null)
const checkinLoadingKey = ref<string | null>(null)
const checkinStatusByKey = ref<Record<string, string>>({})
const checkinResultByKey = ref<Record<string, { etherscan?: string; imageUrl?: string }>>({})

const loadFollowing = async () => {
  const [ownProfile, following] = await Promise.all([apiService.getMyProfile(), apiService.getMyFollowing()])
  myUserId.value = ownProfile.id
  followingIds.value = new Set(following.map((item) => item.id))
}

const setMode = (nextMode: 'people' | 'events') => {
  mode.value = nextMode
  error.value = null
  searched.value = false
}

const runSearch = async () => {
  const value = query.value.trim()
  if (!value) {
    error.value = 'Введите поисковый запрос'
    return
  }

  loading.value = true
  error.value = null
  searched.value = true

  try {
    if (mode.value === 'people') {
      peopleResults.value = await apiService.searchUsers(value)
    } else {
      eventResults.value = await apiService.searchEventsByTitle(value)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка поиска'
  } finally {
    loading.value = false
  }
}

const openUser = (userId: number) => {
  router.push(`/users/${userId}`)
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const getEventKey = (event: EventSearchItem) => `${event.type}:${event.id}`

const setCheckinStatus = (eventKey: string, value: string) => {
  checkinStatusByKey.value = {
    ...checkinStatusByKey.value,
    [eventKey]: value,
  }
}

const pollNftStatus = async (eventKey: string, checkinId: number, maxAttempts = 40) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const status = await apiService.getCheckinNftStatus(checkinId)

    if (status.status === 'pending') {
      setCheckinStatus(eventKey, 'Статус: pending')
    } else if (status.status === 'minting') {
      setCheckinStatus(eventKey, 'Статус: minting')
    } else if (status.status === 'minted') {
      setCheckinStatus(eventKey, 'Статус: minted')
      const txHash = status.nft_token?.tx_hash
      const imageUrl = status.nft_token?.image_url
      checkinResultByKey.value = {
        ...checkinResultByKey.value,
        [eventKey]: {
          etherscan: txHash ? `https://sepolia.etherscan.io/tx/${txHash}` : undefined,
          imageUrl: imageUrl || undefined,
        },
      }
      return
    } else if (status.status === 'failed') {
      setCheckinStatus(eventKey, 'Статус: failed')
      return
    } else {
      setCheckinStatus(eventKey, `Статус: ${status.status}`)
      return
    }

    await wait(3000)
  }

  setCheckinStatus(eventKey, 'Статус: timeout (попробуйте позже)')
}

const runCheckin = async (event: EventSearchItem) => {
  const eventKey = getEventKey(event)
  checkinLoadingKey.value = eventKey
  setCheckinStatus(eventKey, `Создаем чек-ин (type=${event.event_type_id}, ext=${event.external_event_id})...`)

  try {
    const checkin = await apiService.createCheckin({
      event_type_id: event.event_type_id,
      external_event_id: event.external_event_id,
    })

    setCheckinStatus(eventKey, `Чек-ин создан (#${checkin.checkin_id}), ожидаем mint...`)
    await pollNftStatus(eventKey, checkin.checkin_id)
  } catch (e) {
    setCheckinStatus(eventKey, e instanceof Error ? e.message : 'Ошибка чек-ина')
  } finally {
    checkinLoadingKey.value = null
  }
}

const toggleFollow = async (person: UserShort) => {
  followLoadingId.value = person.id
  error.value = null

  try {
    if (followingIds.value.has(person.id)) {
      await apiService.unfollowUser(person.username)
      followingIds.value.delete(person.id)
    } else {
      await apiService.followUser(person.username)
      followingIds.value.add(person.id)
    }
    followingIds.value = new Set(followingIds.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось изменить подписку'
  } finally {
    followLoadingId.value = null
  }
}

const eventTypeLabel = (type: EventSearchItem['type']) => {
  const labels: Record<EventSearchItem['type'], string> = {
    movie: 'Фильм',
    concert: 'Концерт',
    theatre: 'Театр',
    standup: 'Стендап',
  }
  return labels[type]
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'Дата не указана'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString
  return date.toLocaleString('ru-RU')
}

onMounted(async () => {
  try {
    await loadFollowing()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить подписки'
  }
})
</script>

<style scoped>
.search-view {
  min-height: calc(100vh - 80px);
  background: radial-gradient(circle at 8% 0%, rgba(90, 74, 255, 0.25), transparent 32%),
    radial-gradient(circle at 90% 18%, rgba(22, 201, 255, 0.16), transparent 32%),
    linear-gradient(180deg, #0a0f22 0%, #070b19 56%, #060810 100%);
  padding: 2rem 0;
}

.container {
  width: min(1240px, 92vw);
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 1.4rem;
}

.page-title {
  font-size: 2.3rem;
  font-weight: 800;
  color: #f4f7ff;
  margin: 0;
}

.page-subtitle {
  color: #a8b5de;
  margin-top: 0.5rem;
}

.search-panel {
  border: 1px solid rgba(167, 179, 235, 0.26);
  background: rgba(12, 17, 34, 0.78);
  border-radius: 16px;
  padding: 1rem;
}

.tabs {
  display: flex;
  gap: 0.55rem;
  margin-bottom: 0.9rem;
}

.tab-btn {
  border: 1px solid rgba(167, 179, 235, 0.32);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  color: #d6defd;
  font-weight: 600;
  padding: 0.45rem 0.9rem;
  cursor: pointer;
}

.tab-btn.active {
  background: linear-gradient(120deg, rgba(125, 77, 255, 0.95), rgba(81, 95, 255, 0.95));
  border-color: transparent;
  color: #fff;
}

.search-row {
  display: flex;
  gap: 0.6rem;
}

.search-input {
  flex: 1;
  border: 1px solid rgba(167, 179, 235, 0.35);
  border-radius: 12px;
  padding: 0.72rem 0.9rem;
  background: rgba(255, 255, 255, 0.03);
  color: #eff3ff;
}

.search-btn {
  border: none;
  border-radius: 12px;
  padding: 0.72rem 1rem;
  background: #667eea;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.results-grid {
  margin-top: 1rem;
  display: grid;
  gap: 0.8rem;
}

.result-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.8rem;
  border: 1px solid rgba(167, 179, 235, 0.22);
  background: rgba(12, 17, 34, 0.85);
  border-radius: 14px;
  padding: 0.9rem;
}

.result-title {
  color: #eff3ff;
  font-weight: 700;
  margin: 0;
}

.result-subtitle {
  color: #a8b5de;
  margin: 0.2rem 0 0;
  font-size: 0.88rem;
}

.open-btn {
  border: none;
  border-radius: 10px;
  background: rgba(125, 77, 255, 0.9);
  color: #fff;
  padding: 0.55rem 0.85rem;
  cursor: pointer;
}

.person-actions {
  display: flex;
  gap: 0.5rem;
}

.follow-btn {
  border: 1px solid rgba(167, 179, 235, 0.35);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  color: #eff3ff;
  padding: 0.55rem 0.85rem;
  cursor: pointer;
}

.follow-btn.danger {
  border-color: rgba(245, 86, 86, 0.45);
  color: #ffc9c9;
}

.error-box {
  margin-top: 1rem;
  color: #ffb4b4;
}

.empty-note {
  color: #a8b5de;
  text-align: center;
}

.event-card {
  align-items: flex-start;
}

.event-thumb {
  width: 92px;
  height: 92px;
  border-radius: 10px;
  object-fit: cover;
}

.event-meta {
  flex: 1;
}

.event-actions {
  margin-top: 0.55rem;
}

.payload-note {
  margin: 0.35rem 0 0;
  color: #8ea2e8;
  font-size: 0.78rem;
}

.checkin-status {
  margin: 0.4rem 0 0;
  color: #a8b5de;
  font-size: 0.85rem;
}

.checkin-links {
  margin-top: 0.35rem;
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
}

.checkin-links a {
  color: #8bb3ff;
  font-size: 0.85rem;
  text-decoration: none;
}

@media (max-width: 720px) {
  .search-row {
    flex-direction: column;
  }

  .result-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .person-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
