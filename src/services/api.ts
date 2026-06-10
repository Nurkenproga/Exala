import { authService } from '@/services/auth'

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly responseBody: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

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

export interface LeaderboardEntry {
  id: number | null
  username: string
  explorer_points: number
  explorer_level?: string
  nft_count?: number
  events_attended?: number
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
  contract_address?: string | null
  chain_id?: number | null
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
  network_name?: string | null
  metadata_url: string | null
  etherscan_url?: string | null
  points_value: number
  event_title?: string | null
  event_date?: string | null
  category_name?: string | null
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

export type EventTypeName = 'movie' | 'concert' | 'theatre' | 'standup'

class ApiService {
  private baseUrl: string = (
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  ).replace(/\/+$/, '')
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

    if (authService.isAuthDisabled()) {
      return
    }

    if (window.location.pathname !== '/login') {
      const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`
      window.location.assign(`/login?redirect=${encodeURIComponent(redirect)}`)
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
          'ngrok-skip-browser-warning': 'true',
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

        const statusMessages: Record<number, string> = {
          400: 'Запрос не удалось обработать. Проверьте введенные данные.',
          403: 'Недостаточно прав для выполнения действия.',
          404: 'Данные не найдены.',
          409: 'Конфликт данных. Попробуйте обновить страницу.',
          422: 'Некорректные данные запроса.',
          429: 'Слишком много запросов. Попробуйте позже.',
          500: 'Временная ошибка сервера. Попробуйте позже.',
          502: 'Сервис временно недоступен. Попробуйте позже.',
          503: 'Сервис временно недоступен. Попробуйте позже.',
          504: 'Сервис отвечает слишком долго. Попробуйте позже.',
        }

        throw new ApiError(
          statusMessages[response.status] || 'Произошла ошибка. Попробуйте снова.',
          response.status,
          errorText,
        )
      }

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        const text = await response.text()
        console.error('API returned non-JSON response:', text.slice(0, 300))
        throw new Error('Сервер вернул не JSON. Проверьте ngrok/Vite proxy и перезапустите dev-сервер.')
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

  async getConcertById(id: number): Promise<Concert> {
    return this.request<Concert>(`/concerts/${id}`)
  }

  async getTheatre(): Promise<TheatreEvent[]> {
    return this.request<TheatreEvent[]>('/theatre/')
  }

  async getTheatreById(id: number): Promise<TheatreEvent> {
    return this.request<TheatreEvent>(`/theatre/${id}`)
  }

  async getStandups(): Promise<StandupEvent[]> {
    return this.request<StandupEvent[]>('/standups/')
  }

  async getStandupById(id: number): Promise<StandupEvent> {
    return this.request<StandupEvent>(`/standups/${id}`)
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

  async getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
    const query = new URLSearchParams({ limit: String(limit) })
    const response = await this.request<
      Array<Record<string, unknown>> |
      {
        leaderboard?: Array<Record<string, unknown>>
        users?: Array<Record<string, unknown>>
        items?: Array<Record<string, unknown>>
      }
    >(`/users/leaderboard?${query.toString()}`)

    const list = Array.isArray(response)
      ? response
      : response.leaderboard || response.users || response.items || []

    return list.map<LeaderboardEntry>((item) => {
      const rawId = item.id ?? item.user_id ?? null
      const parsedId =
        typeof rawId === 'number'
          ? rawId
          : typeof rawId === 'string' && rawId.trim()
            ? Number(rawId)
            : null

      const explorerPointsRaw = item.explorer_points ?? 0
      const explorerPoints =
        typeof explorerPointsRaw === 'number'
          ? explorerPointsRaw
          : Number(explorerPointsRaw) || 0

      const nftCountRaw = item.nft_count
      const eventsAttendedRaw = item.events_attended
      const nftCount =
        nftCountRaw === undefined || nftCountRaw === null ? undefined : Number(nftCountRaw) || 0
      const eventsAttended =
        eventsAttendedRaw === undefined || eventsAttendedRaw === null
          ? undefined
          : Number(eventsAttendedRaw) || 0

      return {
        id: Number.isFinite(parsedId as number) ? (parsedId as number) : null,
        username: String(item.username || 'unknown'),
        explorer_points: explorerPoints,
        explorer_level: item.explorer_level ? String(item.explorer_level) : undefined,
        nft_count: nftCount,
        events_attended:
          nftCount === undefined && eventsAttended === undefined
            ? undefined
            : Math.max(eventsAttended ?? 0, nftCount ?? 0),
      }
    })
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
      if (error instanceof ApiError && error.status === 422) {
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
