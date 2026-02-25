export interface Movie {
  id: number
  movie_id: number
  event_type_id: number
  title: string
  title_original: string
  rating: number | null
  age_restriction: number
  duration: number
  genres: string
  premiere_date: string
  poster: string
  is_pre_sales: boolean
  movie_url: string
}

export interface Concert {
  id: number
  concert_id: number
  event_type_id: number
  title: string
  title_ru: string
  url: string
  poster: string
  type: string
  date: string
  place: string
  hall: string
  city: string
  price: number | null
  currency: string | null
  category_id: number
  last_modified: string
}

class ApiService {
  private baseUrl: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  private useProxy: boolean = import.meta.env.DEV

  constructor() {
    console.log('API Service initialized:', { baseUrl: this.baseUrl, useProxy: this.useProxy })
  }

  private getRequestUrl(endpoint: string): string {
    if (this.useProxy) {
      return `/api${endpoint}`
    }
    return `${this.baseUrl}${endpoint}`
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = this.getRequestUrl(endpoint)
    
    console.log('API Request:', url)

    try {
      const response = await fetch(url, {
        method: options?.method || 'GET',
        headers: {
          ...options?.headers,
        },
      })

      console.log('API Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', response.status, errorText)
        throw new Error(`API error: ${response.status} - ${response.statusText}`)
      }

      const data = await response.json()
      console.log('API Data received:', Array.isArray(data) ? `${data.length} items` : 'object')
      return data
    } catch (error: any) {
      console.error('Fetch error:', error.message)
      
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        throw new Error(`Не удалось подключиться к серверу. Проверьте, что бэкенд запущен на ${this.baseUrl}`)
      }
      
      throw error
    }
  }

  async getMovies(): Promise<Movie[]> {
    return this.request<Movie[]>('/movies/')
  }

  async getMovieById(id: number): Promise<Movie> {
    return this.request<Movie>(`/movies/${id}/`)
  }

  async getConcerts(): Promise<Concert[]> {
    return this.request<Concert[]>('/concerts/')
  }

  async getTheatre(): Promise<any[]> {
    return this.request<any[]>('/theatre')
  }

  async getStandups(): Promise<any[]> {
    return this.request<any[]>('/standups')
  }
}

export const apiService = new ApiService()
