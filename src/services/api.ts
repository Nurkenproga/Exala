import { authService } from '@/services/auth'

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

export interface TheatreEvent {
  id: number
  play_id: number
  partner_name: string
  event_type_id: number
  name: string
  age_restriction: number
  premiere_kaz: string | null
  next_session_date: string
  small_poster: string
  event_url: string
  price_from: number
}

export interface StandupEvent {
  id: number
  standup_id: number
  event_type_id: number
  title: string
  url: string
  image: string
  image_mobile: string
  type: string
  address: string
  city: string
  category: string
  description: string
  content: string
  price: number | null
  event_dates: string
  card_info: string
  card_ticket_url: string
}

export interface OwnProfile {
  id: number
  username: string
  email: string | null
  wallet_address: string | null
  external_wallet_address: string | null
  wallet_type: string
  explorer_level: string
  explorer_points: number
  events_attended: number
  nft_count: number
  followers_count: number
  following_count: number
}

export interface PublicProfile {
  id: number
  username: string
  explorer_level: string
  explorer_points: number
  events_attended: number
  nft_count: number
  followers_count: number
  following_count: number
}

export interface UserShort {
  id: number
  username: string
}

export interface EventSearchItem {
  id: number
  type: 'movie' | 'concert' | 'theatre' | 'standup'
  title: string
  date: string
  location: string
  image: string
  event_type_id: number
  external_event_id: number
  source_external_event_id: number
}

export interface CheckinRequest {
  event_type_id: number
  external_event_id: number
}

export interface CheckinResponse {
  checkin_id: number
  nft_token_id: number
  status: 'pending' | 'minting' | 'minted' | 'failed'
  rarity: 'legendary' | 'rare' | 'common'
}

export interface NftStatusToken {
  token_id: number | null
  image_url: string | null
  tx_hash: string | null
  rarity: string
}

export interface CheckinNftStatusResponse {
  status: 'pending' | 'minting' | 'minted' | 'failed' | 'no_nft'
  nft_token?: NftStatusToken
}

export interface NftListItem {
  id: number
  token_id_onchain: number | null
  image_url: string | null
  rarity: string
  mint_status: string
  minted_at?: string | null
  tx_hash?: string | null
  event_type_id?: number
  external_event_id?: number
}

export interface NftDetails extends NftListItem {
  contract_address: string | null
  chain_id: number | null
  metadata_url: string | null
  points_value: number
}

export interface WalletInfo {
  wallet_address: string | null
  wallet_type: string
}

export interface ConnectExternalWalletRequest {
  wallet_address: string
  signature: string
  message: string
}

export interface ConnectExternalWalletResponse {
  message: string
  wallet_address: string
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

  private handleAuthFailure(): void {
    localStorage.removeItem('authToken')
    localStorage.removeItem('refreshToken')

    if (window.location.pathname !== '/login') {
      window.location.assign('/login')
    }
  }

  private async request<T>(endpoint: string, options?: RequestInit, isRetry = false): Promise<T> {
    const url = this.getRequestUrl(endpoint)
    const token = localStorage.getItem('authToken')
    
    console.log('API Request:', url)

    try {
      const response = await fetch(url, {
        method: options?.method || 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options?.headers,
        },
        body: options?.body,
      })

      console.log('API Response status:', response.status)

      if (response.status === 401 && !isRetry) {
        if (authService.getRefreshToken()) {
          try {
            await authService.refreshAccessToken()
            return this.request<T>(endpoint, options, true)
          } catch (refreshError) {
            console.error('Refresh token error:', refreshError)
          }
        }

        this.handleAuthFailure()
        throw new Error('Сессия истекла. Выполните вход снова')
      }

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

  async getTheatre(): Promise<TheatreEvent[]> {
    return this.request<TheatreEvent[]>('/theatre/')
  }

  async getStandups(): Promise<StandupEvent[]> {
    return this.request<StandupEvent[]>('/standups/')
  }

  async getMyProfile(): Promise<OwnProfile> {
    return this.request<OwnProfile>('/users/me')
  }

  async getUserProfile(userId: number): Promise<PublicProfile> {
    return this.request<PublicProfile>(`/users/${userId}/profile`)
  }

  async searchUsers(username: string): Promise<UserShort[]> {
    const query = new URLSearchParams({ username })
    const response = await this.request<{ users: UserShort[] }>(`/users/search?${query.toString()}`)
    return response.users || []
  }

  async getMyFollowers(): Promise<UserShort[]> {
    const response = await this.request<{ followers: UserShort[] }>('/users/me/followers')
    return response.followers || []
  }

  async getMyFollowing(): Promise<UserShort[]> {
    const response = await this.request<{ following: UserShort[] }>('/users/me/following')
    return response.following || []
  }

  async followUser(username: string): Promise<void> {
    await this.request<{ message: string }>(`/users/${encodeURIComponent(username)}/follow`, {
      method: 'POST',
    })
  }

  async unfollowUser(username: string): Promise<void> {
    await this.request<{ message: string }>(`/users/${encodeURIComponent(username)}/follow`, {
      method: 'DELETE',
    })
  }

  async searchEventsByTitle(title: string, limit = 20): Promise<EventSearchItem[]> {
    const query = new URLSearchParams({ title, limit: String(limit) }).toString()

    const [movies, concerts, theatre, standups] = await Promise.allSettled([
      this.request<Movie[]>(`/movies/search?${query}`),
      this.request<Concert[]>(`/concerts/search?${query}`),
      this.request<TheatreEvent[]>(`/theatre/search?${query}`),
      this.request<StandupEvent[]>(`/standups/search?${query}`),
    ])

    const movieItems = movies.status === 'fulfilled'
      ? movies.value.map<EventSearchItem>((item) => ({
          id: item.id,
          type: 'movie',
          title: item.title,
          date: item.premiere_date,
          location: 'Кино',
          image: item.poster,
          event_type_id: item.event_type_id,
          external_event_id: item.id,
          source_external_event_id: item.movie_id,
        }))
      : []

    const concertItems = concerts.status === 'fulfilled'
      ? concerts.value.map<EventSearchItem>((item) => ({
          id: item.id,
          type: 'concert',
          title: item.title,
          date: item.date,
          location: item.place || item.city || 'Концертная площадка',
          image: item.poster,
          event_type_id: item.event_type_id,
          external_event_id: item.id,
          source_external_event_id: item.concert_id,
        }))
      : []

    const theatreItems = theatre.status === 'fulfilled'
      ? theatre.value.map<EventSearchItem>((item) => ({
          id: item.id,
          type: 'theatre',
          title: item.name,
          date: item.next_session_date,
          location: item.partner_name || 'Театр',
          image: item.small_poster,
          event_type_id: item.event_type_id,
          external_event_id: item.id,
          source_external_event_id: item.play_id,
        }))
      : []

    const standupItems = standups.status === 'fulfilled'
      ? standups.value.map<EventSearchItem>((item) => ({
          id: item.id,
          type: 'standup',
          title: item.title,
          date: item.event_dates,
          location: item.address || item.city || 'Standup',
          image: item.image,
          event_type_id: item.event_type_id,
          external_event_id: item.id,
          source_external_event_id: item.standup_id,
        }))
      : []

    return [...movieItems, ...concertItems, ...theatreItems, ...standupItems]
  }

  async createCheckin(payload: CheckinRequest): Promise<CheckinResponse> {
    return this.request<CheckinResponse>('/checkins/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  }

  async getCheckinNftStatus(checkinId: number): Promise<CheckinNftStatusResponse> {
    return this.request<CheckinNftStatusResponse>(`/checkins/${checkinId}/nft-status`)
  }

  async getMyNfts(): Promise<NftListItem[]> {
    try {
      return await this.request<NftListItem[]>('/nfts/my')
    } catch (error) {
      // Backend currently returns 422 for /nfts/my due dependency wiring.
      // Fallback keeps frontend functional without backend changes.
      const message = error instanceof Error ? error.message : ''
      if (message.includes('422')) {
        const me = await this.getMyProfile()
        return this.getUserNfts(me.username)
      }
      throw error
    }
  }

  async getNftDetails(tokenId: number): Promise<NftDetails> {
    return this.request<NftDetails>(`/nfts/${tokenId}`)
  }

  async getUserNfts(username: string): Promise<NftListItem[]> {
    return this.request<NftListItem[]>(`/nfts/user/${encodeURIComponent(username)}`)
  }

  async getMyWallet(): Promise<WalletInfo> {
    return this.request<WalletInfo>('/wallet/my')
  }

  async connectExternalWallet(payload: ConnectExternalWalletRequest): Promise<ConnectExternalWalletResponse> {
    return this.request<ConnectExternalWalletResponse>('/wallet/connect-external', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  }
}

export const apiService = new ApiService()
