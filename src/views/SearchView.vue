<template>
  <div class="search-view">
    <div class="container">
      <div class="page-header">
        <h2 class="page-title">Поиск событий</h2>
        <p class="page-subtitle">Фильмы, концерты, театр и стендапы</p>
      </div>

      <section class="search-panel">
        <div class="search-row">
          <input
            v-model.trim="query"
            class="search-input"
            type="text"
            placeholder="Введите название мероприятия"
            @keyup.enter="runSearch"
          />
          <button class="search-btn" :disabled="loading" @click="runSearch">
            {{ loading ? 'Поиск...' : 'Найти' }}
          </button>
        </div>
      </section>

      <section v-if="error" class="error-box">{{ error }}</section>

      <section class="results-grid">
        <article v-for="event in eventResults" :key="`${event.type}-${event.id}`" class="result-card event-card">
          <img v-if="event.image" class="event-thumb" :src="event.image" :alt="event.title" />
          <div class="event-meta">
            <p class="result-title">{{ event.title }}</p>
            <p class="result-subtitle">{{ eventTypeLabel(event.type) }}</p>
            <p class="result-subtitle">{{ formatDate(event.date) }}</p>
            <p class="result-subtitle">{{ event.location }}</p>
            <div class="event-actions">
              <button class="open-btn" @click="openEventDetail(event)">Открыть детали</button>
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
import { apiService, type EventSearchItem } from '@/services/api'

const router = useRouter()
const query = ref('')
const loading = ref(false)
const searched = ref(false)
const error = ref<string | null>(null)

const eventResults = ref<EventSearchItem[]>([])

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
    eventResults.value = await apiService.searchEventsByTitle(value)
    router.replace({ query: { q: value } })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка поиска'
  } finally {
    loading.value = false
  }
}

const openEventDetail = (event: EventSearchItem) => {
  router.push(`/events/${event.type}/${event.id}`)
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
  const queryValue = typeof router.currentRoute.value.query.q === 'string'
    ? router.currentRoute.value.query.q
    : ''

  if (queryValue.trim()) {
    query.value = queryValue.trim()
    try {
      await runSearch()
    } catch {
      // runSearch handles its own errors
    }
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
