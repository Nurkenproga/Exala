export interface AuthCredentials {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type?: string
}

export interface TokenPayload {
  sub?: string
  username?: string
  exp?: number
  iat?: number
  [key: string]: unknown
}

const TOKEN_KEY = 'authToken'
const REFRESH_TOKEN_KEY = 'refreshToken'

class AuthService {
  private baseUrl: string = import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:8001'
  private useProxy: boolean = import.meta.env.DEV
  private refreshPromise: Promise<LoginResponse> | null = null
  private authDisabled: boolean = String(import.meta.env.VITE_AUTH_DISABLED).toLowerCase() === 'true'

  private getRequestUrl(endpoint: string): string {
    if (this.useProxy) {
      return `/auth-api${endpoint}`
    }
    return `${this.baseUrl}${endpoint}`
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(this.getRequestUrl(endpoint), {
      method: options?.method || 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...options?.headers,
      },
      body: options?.body,
    })

    if (!response.ok) {
      let errorMessage = `Ошибка ${response.status}`
      try {
        const errorBody = await response.json()
        if (typeof errorBody?.detail === 'string') {
          errorMessage = errorBody.detail
        } else if (errorBody?.detail && Array.isArray(errorBody.detail)) {
          errorMessage = errorBody.detail
            .map((item: Record<string, unknown>) => String(item?.msg || 'Ошибка валидации'))
            .join(', ')
        } else {
          errorMessage = JSON.stringify(errorBody)
        }
      } catch {
        try {
          const textBody = await response.text()
          if (textBody) {
            errorMessage = textBody
          }
        } catch {
          // ignore parsing errors and keep default message
        }
      }
      throw new Error(errorMessage)
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      const textBody = await response.text()
      console.error('Auth API returned non-JSON response:', textBody.slice(0, 300))
      throw new Error('Auth-сервер вернул не JSON. Проверьте ngrok/Vite proxy и перезапустите dev-сервер.')
    }

    return response.json() as Promise<T>
  }

  private buildOAuth2Body(credentials: AuthCredentials): URLSearchParams {
    const body = new URLSearchParams()
    body.append('username', credentials.username)
    body.append('password', credentials.password)
    return body
  }

  async register(credentials: AuthCredentials): Promise<LoginResponse> {
    const body = this.buildOAuth2Body(credentials)
    return this.request('/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })
  }

  async login(credentials: AuthCredentials): Promise<LoginResponse> {
    const body = this.buildOAuth2Body(credentials)
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })
  }

  async refreshTokens(refreshToken: string): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
  }

  async refreshAccessToken(): Promise<LoginResponse> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      throw new Error('Refresh token отсутствует')
    }

    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshTokens(refreshToken)
        .then((tokens) => {
          this.setTokens(tokens.access_token, tokens.refresh_token)
          return tokens
        })
        .finally(() => {
          this.refreshPromise = null
        })
    }

    return this.refreshPromise
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }

  clearTokens(): void {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }

  isAuthenticated(): boolean {
    if (this.authDisabled) return true
    const token = this.getToken()
    if (!token) return false

    return !this.isTokenExpired()
  }

  isAuthDisabled(): boolean {
    return this.authDisabled
  }

  getTokenPayload(): TokenPayload | null {
    const token = this.getToken()
    if (!token) return null

    try {
      const payloadBase64 = token.split('.')[1]
      if (!payloadBase64) return null
      const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/')
      const decoded = decodeURIComponent(
        atob(base64)
          .split('')
          .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join('')
      )
      return JSON.parse(decoded) as TokenPayload
    } catch {
      return null
    }
  }

  getUsernameFromToken(): string | null {
    const payload = this.getTokenPayload()
    if (!payload) return null
    return typeof payload.username === 'string'
      ? payload.username
      : typeof payload.sub === 'string'
        ? payload.sub
        : null
  }

  getTokenExpiryDate(): Date | null {
    const payload = this.getTokenPayload()
    if (!payload || typeof payload.exp !== 'number') return null
    return new Date(payload.exp * 1000)
  }

  isTokenExpired(): boolean {
    const expiryDate = this.getTokenExpiryDate()
    if (!expiryDate) return false
    return expiryDate.getTime() <= Date.now()
  }
}

export const authService = new AuthService()
