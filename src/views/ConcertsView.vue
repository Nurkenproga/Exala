<template>
  <div class="concerts-view">
    <div class="container">
      <div class="page-header">
        <h2 class="page-title">Концерты</h2>
        <p class="page-subtitle">
          Актуальные концерты в Алматы
        </p>
      </div>

      <div v-if="concertsStore.loading" class="loading-state">
        <div class="spinner"></div>
        <p>Загрузка концертов...</p>
      </div>

      <div v-else-if="concertsStore.error" class="error-state">
        <p class="error-message">{{ concertsStore.error }}</p>
        <button class="retry-btn" @click="concertsStore.fetchConcerts">Попробовать снова</button>
      </div>

      <div v-else-if="concertsStore.concerts.length > 0" class="concerts-section">
        <div class="concerts-header">
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

        <div class="concerts-grid">
          <div
            v-for="concert in filteredConcerts"
            :key="concert.id"
            class="concert-card"
            @click="selectConcert(concert)"
          >
            <div class="concert-poster">
              <img
                :src="concert.poster"
                :alt="concert.title"
                class="poster-image"
                loading="lazy"
                @error="handleImageError"
              />
            </div>
            <div class="concert-info">
              <h3 class="concert-title">{{ concert.title }}</h3>
              <div class="concert-meta">
                <div class="concert-date">
                  <span class="meta-label">Дата:</span>
                  <span>{{ formatDateTime(concert.date) }}</span>
                </div>
                <div class="concert-place">
                  <span class="meta-label">Место:</span>
                  <span class="place-hall">{{ concert.place }}<template v-if="concert.hall">, {{ concert.hall }}</template></span>
                </div>
                <div v-if="concert.price !== null" class="concert-price">
                  <span class="meta-label">Цена:</span>
                  <span class="price-value">от {{ formatPrice(concert.price, concert.currency) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <p>Концерты не найдены</p>
        <button class="retry-btn" @click="concertsStore.fetchConcerts">Обновить</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useConcertsStore } from '@/stores/concerts'
import type { Concert } from '@/services/api'

const concertsStore = useConcertsStore()
const router = useRouter()
const filter = ref<'all' | 'upcoming'>('all')

const filteredConcerts = computed(() => {
  switch (filter.value) {
    case 'upcoming':
      return concertsStore.upcomingConcerts
    default:
      return concertsStore.concerts
  }
})

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatPrice = (price: number, currency: string | null): string => {
  const formattedPrice = new Intl.NumberFormat('ru-RU').format(price)
  return currency ? `${formattedPrice} ${currency}` : `${formattedPrice} ₸`
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.src = 'https://via.placeholder.com/300x400?text=No+Poster'
}

const selectConcert = (concert: Concert) => {
  concertsStore.selectConcert(concert)
  router.push(`/events/concert/${concert.id}`)
}

onMounted(() => {
  concertsStore.fetchConcerts()
})
</script>

<style scoped>
.concerts-view {
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
}

.retry-btn:hover {
  background: #5568d3;
}

.concerts-header {
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
  font-size: 0.9rem;
}

.filter-btn:hover {
  background: #f7fafc;
}

.filter-btn.active {
  background: #667eea;
  color: white;
}

.concerts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
}

.concert-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.concert-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.concert-poster {
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

.concert-info {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  min-height: 180px;
  height: 100%;
}

.concert-title {
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

.concert-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #4a5568;
  flex: 1;
}

.concert-date,
.concert-place,
.concert-price {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-height: 2.25rem;
}

.concert-place {
  min-height: 3rem;
}

.concert-price {
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

.place-hall {
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
  .concerts-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1.5rem;
  }

  .concerts-header {
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
