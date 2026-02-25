import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiService, type TheatreEvent } from '@/services/api'

export const useTheatreStore = defineStore('theatre', () => {
  const events = ref<TheatreEvent[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedEvent = ref<TheatreEvent | null>(null)

  const upcomingEvents = computed(() => {
    const now = new Date()
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

    return events.value.filter((event) => {
      const sessionDate = new Date(event.next_session_date)
      const sessionDayUTC = new Date(
        Date.UTC(
          sessionDate.getUTCFullYear(),
          sessionDate.getUTCMonth(),
          sessionDate.getUTCDate()
        )
      )
      return sessionDayUTC >= todayUTC
    })
  })

  const fetchTheatre = async () => {
    loading.value = true
    error.value = null
    try {
      const data = await apiService.getTheatre()
      events.value = data
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки театров'
      error.value = errorMessage
      events.value = []
    } finally {
      loading.value = false
    }
  }

  const getEventById = (id: number): TheatreEvent | undefined => {
    return events.value.find((e) => e.id === id)
  }

  const selectEvent = (event: TheatreEvent) => {
    selectedEvent.value = event
  }

  const clearSelectedEvent = () => {
    selectedEvent.value = null
  }

  return {
    events,
    loading,
    error,
    selectedEvent,
    upcomingEvents,
    fetchTheatre,
    getEventById,
    selectEvent,
    clearSelectedEvent,
  }
})
