<template>
  <div class="events-view">
    <div class="container">
      <div class="page-header">
        <h2 class="page-title">Городские события Алматы</h2>
        <p class="page-subtitle">
          Откройте для себя лучшие мероприятия города и получите уникальные NFT-награды за участие
        </p>
      </div>

      <div class="filters-section">
        <div class="filter-group">
          <label class="filter-label">Категория:</label>
          <select v-model="selectedCategory" class="filter-select">
            <option value="">Все категории</option>
            <option value="culture">Культура</option>
            <option value="sport">Спорт</option>
            <option value="music">Музыка</option>
            <option value="food">Еда и напитки</option>
            <option value="education">Образование</option>
            <option value="business">Бизнес</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Дата:</label>
          <select v-model="selectedDate" class="filter-select">
            <option value="all">Все даты</option>
            <option value="today">Сегодня</option>
            <option value="week">Эта неделя</option>
            <option value="month">Этот месяц</option>
          </select>
        </div>
      </div>

      <div class="events-grid" v-if="filteredEvents.length > 0">
        <div
          v-for="event in filteredEvents"
          :key="event.id"
          class="event-card"
          @click="selectEvent(event)"
        >
          <div class="event-image">
            <img :src="event.image" :alt="event.title" />
            <div class="event-badge" v-if="event.hasNFT">
              NFT доступно
            </div>
          </div>
          <div class="event-content">
            <div class="event-header">
              <h3 class="event-title">{{ event.title }}</h3>
              <span class="event-category">{{ getCategoryLabel(event.category) }}</span>
            </div>
            <p class="event-description">{{ event.description }}</p>
            <div class="event-footer">
              <div class="event-date">
                {{ formatDate(event.date) }}
              </div>
              <div class="event-location">
                {{ event.location }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <p>События не найдены</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useEventsStore } from '@/stores/events'
import type { Event } from '@/stores/events'

const eventsStore = useEventsStore()

const selectedCategory = ref('')
const selectedDate = ref('all')

const filteredEvents = computed(() => {
  let events = eventsStore.events

  if (selectedCategory.value) {
    events = events.filter(e => e.category === selectedCategory.value)
  }

  if (selectedDate.value !== 'all') {
    const now = new Date()
    events = events.filter(e => {
      const eventDate = new Date(e.date)
      switch (selectedDate.value) {
        case 'today':
          return eventDate.toDateString() === now.toDateString()
        case 'week':
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          return eventDate >= now && eventDate <= weekFromNow
        case 'month':
          const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          return eventDate >= now && eventDate <= monthFromNow
        default:
          return true
      }
    })
  }

  return events
})

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    culture: 'Культура',
    sport: 'Спорт',
    music: 'Музыка',
    food: 'Еда и напитки',
    education: 'Образование',
    business: 'Бизнес'
  }
  return labels[category] || category
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const selectEvent = (event: Event) => {
  console.log('Selected event:', event)
}

onMounted(() => {
  eventsStore.fetchEvents()
})
</script>

<style scoped>
.events-view {
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

.filters-section {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-label {
  font-weight: 600;
  color: #4a5568;
  font-size: 0.9rem;
}

.filter-select {
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;
}

.filter-select:hover {
  border-color: #667eea;
}

.filter-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.events-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 2rem;
}

.event-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  cursor: pointer;
}

.event-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.event-image {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.event-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.event-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.95);
  padding: 0.5rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #667eea;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.event-content {
  padding: 1.5rem;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
  gap: 1rem;
}

.event-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1a202c;
  margin: 0;
  flex: 1;
}

.event-category {
  background: #edf2f7;
  color: #4a5568;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.event-description {
  color: #718096;
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0 0 1rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.event-footer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #4a5568;
}

.event-date,
.event-location {
  display: flex;
  align-items: center;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #718096;
  font-size: 1.125rem;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 2rem;
  }

  .events-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .filters-section {
    flex-direction: column;
  }
}
</style>
