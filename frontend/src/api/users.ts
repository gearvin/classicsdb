import { apiRequest } from './client'
import type { Review } from './reviews'
import type { UserBook } from './userBooks'

export interface PublicUser {
  id: number
  username: string
  avatar_url?: string | null
  created_at: string
}

export async function listUsers(limit = 50, offset = 0): Promise<PublicUser[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })

  return apiRequest<PublicUser[]>(`/api/v1/users?${params.toString()}`, {
    fallbackErrorMessage: 'Unable to load users.',
  })
}

export async function getPublicUser(username: string): Promise<PublicUser> {
  return apiRequest<PublicUser>(`/api/v1/users/${encodeURIComponent(username)}`, {
    fallbackErrorMessage: 'Unable to load this profile.',
  })
}

export async function listPublicUserBooks(username: string): Promise<UserBook[]> {
  return apiRequest<UserBook[]>(`/api/v1/users/${encodeURIComponent(username)}/books`, {
    fallbackErrorMessage: 'Unable to load this shelf.',
  })
}

export async function listPublicUserReviews(username: string, limit = 50, offset = 0): Promise<Review[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })

  return apiRequest<Review[]>(`/api/v1/users/${encodeURIComponent(username)}/reviews?${params.toString()}`, {
    fallbackErrorMessage: "Unable to load this user's reviews.",
  })
}
