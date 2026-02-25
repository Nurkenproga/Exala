import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiService, type Movie } from '@/services/api'

export const useMoviesStore = defineStore('movies', () => {
  const movies = ref<Movie[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedMovie = ref<Movie | null>(null)

  const upcomingMovies = computed(() => {
    const now = new Date()
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    
    const filtered = movies.value.filter(movie => {
      const premiereDate = new Date(movie.premiere_date)
      // Получаем дату премьеры в UTC
      const premiereDayUTC = new Date(Date.UTC(
        premiereDate.getUTCFullYear(),
        premiereDate.getUTCMonth(),
        premiereDate.getUTCDate()
      ))
      
      const isUpcoming = premiereDayUTC >= todayUTC && !movie.is_pre_sales
      return isUpcoming
    })
    
    if (movies.value.length > 0) {
      console.log('Upcoming movies filter:', {
        today: todayUTC.toISOString(),
        totalMovies: movies.value.length,
        upcomingCount: filtered.length,
        moviesWithFuturePremiere: movies.value.filter(m => {
          const pd = new Date(m.premiere_date)
          const pdUTC = new Date(Date.UTC(pd.getUTCFullYear(), pd.getUTCMonth(), pd.getUTCDate()))
          return pdUTC >= todayUTC
        }).length,
        moviesWithoutPreSales: movies.value.filter(m => !m.is_pre_sales).length
      })
    }
    
    return filtered
  })

  const moviesByGenre = computed(() => {
    const grouped: Record<string, Movie[]> = {}
    movies.value.forEach(movie => {
      const genres = movie.genres.split(',').map(g => g.trim())
      genres.forEach(genre => {
        if (!grouped[genre]) {
          grouped[genre] = []
        }
        if (!grouped[genre].find(m => m.id === movie.id)) {
          grouped[genre].push(movie)
        }
      })
    })
    return grouped
  })

  const preSalesMovies = computed(() => {
    return movies.value.filter(movie => movie.is_pre_sales)
  })

  const fetchMovies = async () => {
    loading.value = true
    error.value = null

    try {
      console.log('Fetching movies from API...')
      const data = await apiService.getMovies()
      console.log('Movies received:', data.length)
      movies.value = data
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки фильмов'
      error.value = errorMessage
      console.error('Error fetching movies:', err)
      movies.value = []
    } finally {
      loading.value = false
    }
  }

  const getMovieById = (id: number): Movie | undefined => {
    return movies.value.find(movie => movie.id === id)
  }

  const selectMovie = (movie: Movie) => {
    selectedMovie.value = movie
  }

  const clearSelectedMovie = () => {
    selectedMovie.value = null
  }

  return {
    movies,
    loading,
    error,
    selectedMovie,
    upcomingMovies,
    moviesByGenre,
    preSalesMovies,
    fetchMovies,
    getMovieById,
    selectMovie,
    clearSelectedMovie
  }
})
