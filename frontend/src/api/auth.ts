import { apiRequest } from './client'

interface TokenResponse {
  access_token: string
  token_type: string
}

export interface AuthUser {
  id: number
  username: string
  email: string
  avatar_url?: string | null
  is_active: boolean
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface RegisterUserInput {
  username: string
  email: string
  password: string
}

export interface UpdateCurrentUserInput {
  username?: string
  email?: string
  avatar_url?: string | null
}

export async function registerUser(payload: RegisterUserInput) {
  await apiRequest<void>('/api/v1/auth/register', {
    method: 'POST',
    body: payload,
    fallbackErrorMessage: 'Unable to create your account. Please try again.',
  })
}

export async function loginWithEmail(email: string, password: string): Promise<TokenResponse> {
  const body = new URLSearchParams()
  body.set('username', email)
  body.set('password', password)

  return apiRequest<TokenResponse>('/api/v1/auth/login', {
    method: 'POST',
    body,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    skipAuthRefresh: true,
    fallbackErrorMessage: 'Unable to log in. Please try again.',
  })
}

export async function refreshSession(): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/api/v1/auth/refresh', {
    method: 'POST',
    credentials: 'include',
    skipAuthRefresh: true,
    fallbackErrorMessage: 'Unable to refresh your session.',
  })
}

export async function logoutSession(): Promise<void> {
  await apiRequest<void>('/api/v1/auth/logout', {
    method: 'POST',
    credentials: 'include',
    skipAuthRefresh: true,
  })
}

export async function getCurrentUser(accessToken: string): Promise<AuthUser> {
  return apiRequest<AuthUser>('/api/v1/users/me', {
    accessToken,
    fallbackErrorMessage: 'Unable to load your account. Please log in again.',
  })
}

export async function updateCurrentUser(
  accessToken: string,
  payload: UpdateCurrentUserInput,
): Promise<AuthUser> {
  return apiRequest<AuthUser>('/api/v1/users/me', {
    accessToken,
    method: 'PATCH',
    body: payload,
    fallbackErrorMessage: 'Unable to update your profile.',
  })
}
