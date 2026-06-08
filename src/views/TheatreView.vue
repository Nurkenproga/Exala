<template>
  <div class="theatre-view">
    <div class="container">
      <div class="page-header">
        <h2 class="page-title">Театр</h2>
        <p class="page-subtitle">
          Спектакли и постановки в Алматы
        </p>
      </div>

      <div v-if="theatreStore.loading" class="loading-state">
        <div class="spinner"></div>
        <p>Загрузка...</p>
      </div>

      <div v-else-if="theatreStore.error" class="error-state">
        <p class="error-message">{{ theatreStore.error }}</p>
        <button class="retry-btn" @click="theatreStore.fetchTheatre">Попробовать снова</button>
      </div>

      <div v-else-if="theatreStore.events.length > 0" class="theatre-section">
        <div class="theatre-header">
          <div class="filters">
            <button
              class="filter-btn"
              :class="{ active: filter === 'all' }"
              @click="filter = 'all'"
            >
              Все
            </button>
            <button
              class="filter-btn"
              :class="{ active: filter === 'upcoming' }"
              @click="filter = 'upcoming'"
            >
              Скоро
            </button>
          </div>
        </div>

        <div class="theatre-grid">
          <div
            v-for="event in filteredEvents"
            :key="event.id"
            class="theatre-card"
            @click="selectEvent(event)"
          >
            <div class="theatre-poster">
              <img
                :src="getPosterUrl(event.small_poster)"
                :alt="event.name"
                class="poster-image"
                loading="lazy"
                @error="handleImageError"
              />
              <div
                v-if="event.age_restriction >= 0"
                class="age-badge"
                :class="getAgeClass(event.age_restriction)"
              >
                {{ event.age_restriction }}+
              </div>
            </div>
            <div class="theatre-info">
              <h3 class="theatre-title">{{ event.name }}</h3>
              <div class="theatre-meta">
                <div class="theatre-place">
                  <span class="meta-label">Театр:</span>
                  <span class="place-text">{{ event.partner_name }}</span>
                </div>
                <div class="theatre-session">
                  <span class="meta-label">Ближайший показ:</span>
                  <span>{{ formatDate(event.next_session_date) }}</span>
                </div>
                <div class="theatre-price">
                  <span class="meta-label">Цена:</span>
                  <span class="price-value">от {{ formatPrice(event.price_from) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <p>Спектакли не найдены</p>
        <button class="retry-btn" @click="theatreStore.fetchTheatre">Обновить</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTheatreStore } from '@/stores/theatre'
import type { TheatreEvent } from '@/services/api'

const theatreStore = useTheatreStore()
const router = useRouter()
const filter = ref<'all' | 'upcoming'>('all')

const filteredEvents = computed(() => {
  switch (filter.value) {
    case 'upcoming':
      return theatreStore.upcomingEvents
    default:
      return theatreStore.events
  }
})

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatPrice = (price: number): string => {
  return `${new Intl.NumberFormat('ru-RU').format(price)} ₸`
}

const getPosterUrl = (posterUrl: string): string => {
  if (!posterUrl) return posterUrl
  if (!posterUrl.includes('cdn.kino.kz')) return posterUrl
  return posterUrl.replace(/\/p\d+x\d+\.webp$/i, '/p344x489.webp')
}

const getAgeClass = (age: number): string => {
  if (age <= 6) return 'age-family'
  if (age <= 16) return 'age-teen'
  return 'age-adult'
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.src = 'https://via.placeholder.com/300x400?text=No+Poster'
}

const selectEvent = (event: TheatreEvent) => {
  theatreStore.selectEvent(event)
  router.push(`/events/theatre/${event.id}`)
}

onMounted(() => {
  theatreStore.fetchTheatre()
})
</script>

<style scoped>
.theatre-view {
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

.error-state {
  text-align: center;
  padding: 4rem 2rem;
}

.error-message {
  color: #e53e3e;
  font-size: 1.125rem;
  margin-bottom: 1.5rem;
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
}

.retry-btn:hover {
  background: #5568d3;
}

.theatre-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.filters {
  display: flex;
  gap: 0.5rem;
}

.filter-btn {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.filter-btn:hover {
  background: #f7fafc;
}

.filter-btn.active {
  background: #667eea;
  color: white;
}

.theatre-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
}

.theatre-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.theatre-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.theatre-poster {
  position: relative;
  width: 100%;
  padding-top: 145%;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.poster-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: high-quality;
  image-rendering: -webkit-optimize-contrast;
}

.age-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.age-badge.age-family {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.age-badge.age-teen {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.age-badge.age-adult {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.theatre-info {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  min-height: 180px;
  height: 100%;
}

.theatre-title {
  font-size: 1rem;
  font-weight: 700;
  color: #1a202c;
  margin: 0 0 1rem 0;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.6em;
}

.theatre-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #4a5568;
  flex: 1;
}

.theatre-place,
.theatre-session,
.theatre-price {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-height: 2.25rem;
}

.theatre-place {
  min-height: 3rem;
}

.theatre-price {
  margin-top: auto;
  padding-top: 0.5rem;
}

.meta-label {
  font-weight: 600;
  color: #718096;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.place-text {
  line-height: 1.4;
}

.price-value {
  font-weight: 700;
  color: #667eea;
  font-size: 1rem;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #718096;
}

.empty-state p {
  font-size: 1.125rem;
  margin-bottom: 1.5rem;
}

@media (max-width: 768px) {
  .theatre-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1.5rem;
  }

  .theatre-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .filters {
    width: 100%;
    justify-content: space-between;
  }

  .filter-btn {
    flex: 1;
  }
}
</style>
