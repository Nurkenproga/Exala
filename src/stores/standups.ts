import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiService, type StandupEvent } from '@/services/api'

export const useStandupsStore = defineStore('standups', () => {
  const events = ref<StandupEvent[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedEvent = ref<StandupEvent | null>(null)

  const upcomingEvents = computed(() => {
    const now = new Date()
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    return events.value.filter((event) => {
      const eventDate = new Date(event.event_dates)
      const eventDayUTC = new Date(
        Date.UTC(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate())
      )
      return eventDayUTC >= todayUTC
    })
  })

  const fetchStandups = async () => {
    loading.value = true
    error.value = null
    try {
      const data = await apiService.getStandups()
      events.value = data
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки стендапов'
      error.value = errorMessage
      events.value = []
    } finally {
      loading.value = false
    }
  }

  const getEventById = (id: number): StandupEvent | undefined => {
    return events.value.find((e) => e.id === id)
  }

  const selectEvent = (event: StandupEvent) => {
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
    fetchStandups,
    getEventById,
    selectEvent,
    clearSelectedEvent,
  }
})
