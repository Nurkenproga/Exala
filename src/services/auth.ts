export interface AuthCredentials {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
}

export interface TokenPayload {
  sub?: string
  username?: string
  exp?: number
  iat?: number
  [key: string]: unknown
}

const TOKEN_KEY = 'authToken'

class AuthService {
  private baseUrl: string = import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:8001'
  private useProxy: boolean = import.meta.env.DEV

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
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
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

    return response.json() as Promise<T>
  }

  async register(credentials: AuthCredentials): Promise<unknown> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  }

  async login(credentials: AuthCredentials): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
  }

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY)
  }

  isAuthenticated(): boolean {
    return !!this.getToken()
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
}

export const authService = new AuthService()
