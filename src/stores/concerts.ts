import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiService, type Concert } from '@/services/api'

export const useConcertsStore = defineStore('concerts', () => {
  const concerts = ref<Concert[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedConcert = ref<Concert | null>(null)

  const upcomingConcerts = computed(() => {
    const now = new Date()
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    
    return concerts.value.filter(concert => {
      const concertDate = new Date(concert.date)
      const concertDayUTC = new Date(Date.UTC(
        concertDate.getUTCFullYear(),
        concertDate.getUTCMonth(),
        concertDate.getUTCDate()
      ))
      
      return concertDayUTC >= todayUTC
    })
  })

  const fetchConcerts = async () => {
    loading.value = true
    error.value = null

    try {
      console.log('Fetching concerts from API...')
      const data = await apiService.getConcerts()
      console.log('Concerts received:', data.length)
      concerts.value = data
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки концертов'
      error.value = errorMessage
      console.error('Error fetching concerts:', err)
      concerts.value = []
    } finally {
      loading.value = false
    }
  }

  const getConcertById = (id: number): Concert | undefined => {
    return concerts.value.find(concert => concert.id === id)
  }

  const selectConcert = (concert: Concert) => {
    selectedConcert.value = concert
  }

  const clearSelectedConcert = () => {
    selectedConcert.value = null
  }

  return {
    concerts,
    loading,
    error,
    selectedConcert,
    upcomingConcerts,
    fetchConcerts,
    getConcertById,
    selectConcert,
    clearSelectedConcert
  }
})
