import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Event {
  id: string
  title: string
  description: string
  date: string
  location: string
  category: 'culture' | 'sport' | 'music' | 'food' | 'education' | 'business'
  image: string
  hasNFT: boolean
  nftMetadata?: {
    name: string
    description: string
    image: string
  }
  attendees?: number
  maxAttendees?: number
}

export const useEventsStore = defineStore('events', () => {
  const events = ref<Event[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedEvent = ref<Event | null>(null)

  const upcomingEvents = computed(() => {
    const now = new Date()
    return events.value.filter(event => new Date(event.date) >= now)
  })

  const eventsByCategory = computed(() => {
    const grouped: Record<string, Event[]> = {}
    events.value.forEach(event => {
      const bucket = (grouped[event.category] ??= [])
      bucket.push(event)
    })
    return grouped
  })

  const eventsWithNFT = computed(() => {
    return events.value.filter(event => event.hasNFT)
  })

  const fetchEvents = async () => {
    loading.value = true
    error.value = null

    try {
      await new Promise(resolve => setTimeout(resolve, 500))

      events.value = [
        {
          id: '1',
          title: 'Фестиваль современного искусства',
          description: 'Масштабная выставка работ современных художников Казахстана и Центральной Азии',
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Музей искусств им. Кастеева',
          category: 'culture',
          image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800',
          hasNFT: true,
          nftMetadata: {
            name: 'Art Festival 2026 NFT',
            description: 'Уникальный NFT за посещение фестиваля современного искусства',
            image: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400'
          },
          attendees: 45,
          maxAttendees: 200
        },
        {
          id: '2',
          title: 'Марафон "Алматы 2026"',
          description: 'Ежегодный городской марафон по центральным улицам Алматы',
          date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Парк Первого Президента',
          category: 'sport',
          image: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800',
          hasNFT: true,
          nftMetadata: {
            name: 'Almaty Marathon 2026 NFT',
            description: 'NFT-награда за участие в марафоне',
            image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400'
          },
          attendees: 120,
          maxAttendees: 500
        },
        {
          id: '3',
          title: 'Джазовый концерт под открытым небом',
          description: 'Выступление лучших джазовых коллективов города в атмосфере летнего вечера',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Центральный парк культуры и отдыха',
          category: 'music',
          image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
          hasNFT: false,
          attendees: 80,
          maxAttendees: 300
        },
        {
          id: '4',
          title: 'Фуд-фестиваль "Вкусы Алматы"',
          description: 'Дегустация блюд от лучших ресторанов города и мастер-классы от шеф-поваров',
          date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Площадь Республики',
          category: 'food',
          image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
          hasNFT: true,
          nftMetadata: {
            name: 'Almaty Food Festival NFT',
            description: 'Эксклюзивный NFT за участие в фуд-фестивале',
            image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400'
          },
          attendees: 200,
          maxAttendees: 500
        },
        {
          id: '5',
          title: 'Лекция "Будущее технологий"',
          description: 'Встреча с ведущими IT-экспертами и обсуждение трендов в технологиях',
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Технопарк "Алматы"',
          category: 'education',
          image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
          hasNFT: false,
          attendees: 60,
          maxAttendees: 150
        },
        {
          id: '6',
          title: 'Бизнес-нетворкинг "Startup Meetup"',
          description: 'Встреча предпринимателей, инвесторов и стартапов для обмена опытом',
          date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Коворкинг "Astana Hub"',
          category: 'business',
          image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800',
          hasNFT: true,
          nftMetadata: {
            name: 'Startup Meetup NFT',
            description: 'NFT для участников бизнес-нетворкинга',
            image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400'
          },
          attendees: 35,
          maxAttendees: 100
        }
      ]
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Ошибка загрузки событий'
      console.error('Error fetching events:', err)
    } finally {
      loading.value = false
    }
  }

  const getEventById = (id: string): Event | undefined => {
    return events.value.find(event => event.id === id)
  }

  const selectEvent = (event: Event) => {
    selectedEvent.value = event
  }

  const clearSelectedEvent = () => {
    selectedEvent.value = null
  }

  const registerForEvent = async (eventId: string) => {
    const event = getEventById(eventId)
    if (!event) {
      throw new Error('Событие не найдено')
    }

    if (event.attendees && event.maxAttendees && event.attendees >= event.maxAttendees) {
      throw new Error('Места закончились')
    }

    if (event.attendees !== undefined) {
      event.attendees++
    }
  }

  const claimNFT = async (eventId: string) => {
    const event = getEventById(eventId)
    if (!event || !event.hasNFT) {
      throw new Error('NFT недоступно для этого события')
    }

    console.log('Claiming NFT for event:', eventId)
  }

  return {
    events,
    loading,
    error,
    selectedEvent,
    upcomingEvents,
    eventsByCategory,
    eventsWithNFT,
    fetchEvents,
    getEventById,
    selectEvent,
    clearSelectedEvent,
    registerForEvent,
    claimNFT
  }
})
