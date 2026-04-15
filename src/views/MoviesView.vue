<template>
  <div class="movies-view">
    <div class="container">
      <div class="page-header">
        <h2 class="page-title">Фильмы</h2>
        <p class="page-subtitle">
          Актуальные фильмы в кинотеатрах Алматы
        </p>
      </div>

      <div v-if="moviesStore.loading" class="loading-state">
        <div class="spinner"></div>
        <p>Загрузка фильмов...</p>
      </div>

      <div v-else-if="moviesStore.error" class="error-state">
        <p class="error-message">{{ moviesStore.error }}</p>
        <button class="retry-btn" @click="moviesStore.fetchMovies">Попробовать снова</button>
      </div>

      <div v-else-if="moviesStore.movies.length > 0" class="movies-section">
        <div class="movies-header">
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
              :class="{ active: filter === 'pre_sales' }"
              @click="filter = 'pre_sales'"
            >
              Предпродажа
            </button>
          </div>
        </div>

        <div class="movies-grid">
          <div
            v-for="movie in filteredMovies"
            :key="movie.id"
            class="movie-card"
            @click="selectMovie(movie)"
          >
            <div class="movie-poster">
              <img
                :src="getPosterUrl(movie.poster)"
                :alt="movie.title"
                class="poster-image"
                loading="lazy"
                @error="handleImageError"
              />
              <div class="age-badge" :class="getAgeClass(movie.age_restriction)">{{ movie.age_restriction }}+</div>
              <div v-if="movie.is_pre_sales" class="pre-sales-badge">
                Предпродажа
              </div>
              <div v-if="movie.rating !== null" class="rating-badge" :class="getRatingClass(movie.rating)">
                <span class="rating-value">{{ movie.rating }}</span>
                <span class="rating-max">/10</span>
              </div>
            </div>
            <div class="movie-info">
              <h3 class="movie-title">{{ movie.title }}</h3>
              <p class="movie-title-original">
                <template v-if="movie.title_original !== movie.title">{{ movie.title_original }}</template>
                <template v-else>&nbsp;</template>
              </p>
              <div class="movie-meta">
                <span class="movie-genres">{{ movie.genres }}</span>
                <div class="movie-meta-row">
                  <span v-if="movie.duration > 0" class="movie-duration">{{ movie.duration }} мин</span>
                </div>
              </div>
              <div class="movie-premiere">
                Премьера: {{ formatDate(movie.premiere_date) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <p>Фильмы не найдены</p>
        <button class="retry-btn" @click="moviesStore.fetchMovies">Обновить</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMoviesStore } from '@/stores/movies'
import type { Movie } from '@/services/api'

const moviesStore = useMoviesStore()
const router = useRouter()
const filter = ref<'all' | 'pre_sales'>('all')

const filteredMovies = computed(() => {
  switch (filter.value) {
    case 'pre_sales':
      return moviesStore.preSalesMovies
    default:
      return moviesStore.movies
  }
})

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const getPosterUrl = (posterUrl: string): string => {
  if (!posterUrl) return posterUrl
  if (!posterUrl.includes('cdn.kino.kz')) return posterUrl
  const higherRes = posterUrl.replace(/\/p\d+x\d+\.webp$/i, '/p344x489.webp')
  return higherRes
}

const getRatingClass = (rating: number): string => {
  if (rating >= 7) return 'rating-excellent'
  if (rating >= 5) return 'rating-good'
  if (rating >= 3) return 'rating-average'
  return 'rating-poor'
}

const getAgeClass = (age: number): string => {
  if (age <= 6) return 'age-family'
  if (age <= 16) return 'age-teen'
  return 'age-adult'
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.src = 'https://via.placeholder.com/168x242?text=No+Poster'
}

const selectMovie = (movie: Movie) => {
  moviesStore.selectMovie(movie)
  router.push(`/events/movie/${movie.id}`)
}

onMounted(() => {
  moviesStore.fetchMovies()
})
</script>

<style scoped>
.movies-view {
  min-height: calc(100vh - 80px);
  background:
    radial-gradient(circle at 10% 0%, rgba(208, 66, 94, 0.18), transparent 33%),
    radial-gradient(circle at 92% 18%, rgba(72, 146, 255, 0.2), transparent 34%),
    linear-gradient(180deg, #090d1f 0%, #080a16 60%, #05070f 100%);
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
  font-weight: 800;
  color: #f4f7ff;
  margin: 0 0 1rem 0;
  letter-spacing: -0.03em;
}

.page-subtitle {
  font-size: 1.125rem;
  color: #a8b5de;
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
  color: #ffc1cc;
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

.movies-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.9rem;
  border-radius: 16px;
  border: 1px solid rgba(167, 179, 235, 0.24);
  background: rgba(12, 17, 34, 0.78);
}

.filters {
  display: flex;
  gap: 0.5rem;
}

.filter-btn {
  background: rgba(255, 255, 255, 0.03);
  color: #e9eeff;
  border: 1px solid rgba(167, 179, 235, 0.35);
  padding: 0.5rem 1rem;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.filter-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.filter-btn.active {
  background: linear-gradient(120deg, #7d4dff, #6a6cff);
  border-color: transparent;
  color: white;
}

.movies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 2rem;
}

.movie-card {
  background: linear-gradient(180deg, rgba(18, 22, 44, 0.97), rgba(9, 12, 24, 0.95));
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(167, 179, 235, 0.2);
  box-shadow: 0 16px 30px rgba(0, 0, 0, 0.32);
  transition: all 0.3s;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.movie-card:hover {
  transform: translateY(-4px);
  border-color: rgba(79, 157, 255, 0.65);
  box-shadow: 0 22px 35px rgba(0, 0, 0, 0.42);
}

.movie-poster {
  position: relative;
  width: 100%;
  padding-top: 145%;
  overflow: hidden;
  background: linear-gradient(145deg, #2d2f6f 0%, #1a1d3e 100%);
}

.poster-image {
  transition: transform 0.35s ease;
}

.movie-card:hover .poster-image {
  transform: scale(1.06);
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
  left: 0.5rem;
  color: white;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
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

.pre-sales-badge {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  background: rgba(211, 84, 113, 0.88);
  color: white;
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.rating-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 0.4rem 0.6rem;
  border-radius: 8px;
  font-weight: 700;
  display: flex;
  align-items: baseline;
  gap: 0.15rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
}

.rating-value {
  font-size: 1rem;
  line-height: 1;
}

.rating-max {
  font-size: 0.7rem;
  opacity: 0.8;
  font-weight: 500;
}

.rating-excellent {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3);
}

.rating-good {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3);
}

.rating-average {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.3), 0 2px 8px rgba(0, 0, 0, 0.3);
}

.rating-poor {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.3), 0 2px 8px rgba(0, 0, 0, 0.3);
}

.movie-info {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  min-height: 150px;
  height: 100%;
}

.movie-title {
  font-size: 1rem;
  font-weight: 700;
  color: #eef2ff;
  margin: 0 0 0.25rem 0;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.6em;
}

.movie-title-original {
  font-size: 0.85rem;
  color: #9cabd8;
  margin: 0 0 0.5rem 0;
  font-style: italic;
  min-height: 1.25rem;
  line-height: 1.25;
}

.movie-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0;
  font-size: 0.8rem;
  color: #b4c1e6;
}

.movie-genres {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 1.2rem;
}

.movie-meta-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  min-height: 1.2rem;
}

.movie-duration {
  white-space: nowrap;
}

.movie-premiere {
  font-size: 0.85rem;
  color: #c8d3f2;
  font-weight: 500;
  margin-top: auto;
  padding-top: 0.75rem;
  min-height: 1.2rem;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #b2bde0;
}

.empty-state p {
  font-size: 1.125rem;
  margin-bottom: 1.5rem;
}

@media (max-width: 768px) {
  .movies-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1.5rem;
  }

  .movies-header {
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
