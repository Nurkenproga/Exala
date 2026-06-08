<template>
  <div class="standups-view">
    <div class="container">
      <div class="page-header">
        <h2 class="page-title">Стендапы</h2>
        <p class="page-subtitle">
          Стендап-концерты и комедийные шоу в Алматы
        </p>
      </div>

      <div v-if="standupsStore.loading" class="loading-state">
        <div class="spinner"></div>
        <p>Загрузка...</p>
      </div>

      <div v-else-if="standupsStore.error" class="error-state">
        <p class="error-message">{{ standupsStore.error }}</p>
        <button class="retry-btn" @click="standupsStore.fetchStandups">Попробовать снова</button>
      </div>

      <div v-else-if="standupsStore.events.length > 0" class="standups-section">
        <div class="standups-header">
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

        <div class="standups-list">
          <div
            v-for="event in filteredEvents"
            :key="event.id"
            class="standup-card"
            @click="selectEvent(event)"
          >
            <div class="standup-banner">
              <img
                :src="event.image"
                :alt="event.title"
                class="banner-image"
                loading="lazy"
                @error="handleImageError"
              />
            </div>
            <div class="standup-info">
              <div class="standup-info-main">
                <div class="standup-info-head">
                  <h3 class="standup-title">{{ event.title }}</h3>
                  <div class="standup-badges">
                    <span v-if="event.category" class="badge badge-category">{{ event.category }}</span>
                    <span v-if="ageRestriction(event)" class="badge badge-age">{{ ageRestriction(event) }}</span>
                  </div>
                </div>
                <div class="standup-meta">
                  <div class="standup-card-info">
                    <span class="meta-label">Когда и где</span>
                    <span class="card-info-text">{{ event.card_info }}</span>
                  </div>
                  <div v-if="event.price !== null" class="standup-price">
                    <span class="meta-label">Цена</span>
                    <span class="price-value">от {{ formatPrice(event.price) }}</span>
                  </div>
                </div>
              </div>
              <div class="standup-info-actions">
                <button class="btn-ticket" @click.stop="openDetail(event)">
                  Подробнее
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <p>Стендапы не найдены</p>
        <button class="retry-btn" @click="standupsStore.fetchStandups">Обновить</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStandupsStore } from '@/stores/standups'
import type { StandupEvent } from '@/services/api'

const standupsStore = useStandupsStore()
const router = useRouter()
const filter = ref<'all' | 'upcoming'>('all')

const filteredEvents = computed(() => {
  switch (filter.value) {
    case 'upcoming':
      return standupsStore.upcomingEvents
    default:
      return standupsStore.events
  }
})

const formatPrice = (price: number): string => {
  return `${new Intl.NumberFormat('ru-RU').format(price)} ₸`
}

/** Извлекает возрастное ограничение из content (например "18+") */
function ageRestriction(event: StandupEvent): string | null {
  const c = event.content || ''
  const match = c.match(/(\d+)\s*\+/)
  return match ? `${match[1]}+` : null
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.src = 'https://via.placeholder.com/600x220?text=No+Image'
}

const selectEvent = (event: StandupEvent) => {
  standupsStore.selectEvent(event)
  router.push(`/events/standup/${event.id}`)
}

const openDetail = (event: StandupEvent) => {
  router.push(`/events/standup/${event.id}`)
}

onMounted(() => {
  standupsStore.fetchStandups()
})
</script>

<style scoped>
.standups-view {
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

.standups-header {
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

/* Горизонтальные карточки под широкие баннеры (~1512x566) */
.standups-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.standup-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  cursor: pointer;
  display: grid;
  grid-template-columns: 340px 1fr;
  min-height: 180px;
  align-items: stretch;
}

.standup-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

/* Широкий баннер: фиксированная ширина, высота по пропорции ~2.67:1 */
.standup-banner {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 180px;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.banner-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.standup-info {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: stretch;
  gap: 1.25rem;
  min-width: 0;
}

.standup-info-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.standup-info-head {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.standup-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1a202c;
  margin: 0;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.standup-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.badge-category {
  background: #edf2f7;
  color: #4a5568;
}

.badge-age {
  background: #fed7d7;
  color: #c53030;
}

.standup-info-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex-shrink: 0;
}

.btn-ticket {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 1.25rem;
  background: #667eea;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  border-radius: 8px;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.2s;
}

.btn-ticket:hover {
  background: #5568d3;
  color: white;
}

.standup-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #4a5568;
  flex: 1;
}

.standup-card-info,
.standup-price {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.standup-price {
  margin-top: 0.5rem;
}

.meta-label {
  font-weight: 600;
  color: #718096;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-info-text {
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
  .standup-card {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }

  .standup-banner {
    min-height: 200px;
    aspect-ratio: 2.7 / 1;
  }

  .standup-info {
    flex-direction: column;
    padding: 1rem;
    gap: 1rem;
  }

  .standup-info-actions {
    align-items: stretch;
  }

  .btn-ticket {
    width: 100%;
  }

  .standups-header {
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
