import { apiRequest } from './client'

export type ReadingStatus = 'want_to_read' | 'reading' | 'read' | 'dnf'

export interface UserBook {
  id: number
  book_id: number
  status?: ReadingStatus | null
  rating?: number | null
  started_at?: string | null
  finished_at?: string | null
  created_at: string
  updated_at: string
}

export interface CreateUserBookInput {
  book_id: number
  status?: ReadingStatus | null
  rating?: number | null
  started_at?: string | null
  finished_at?: string | null
}

export interface UpdateUserBookInput {
  status?: ReadingStatus | null
  rating?: number | null
  started_at?: string | null
  finished_at?: string | null
}

export async function listMyBooks(accessToken: string): Promise<UserBook[]> {
  return apiRequest<UserBook[]>('/api/v1/users/me/books', {
    accessToken,
    fallbackErrorMessage: 'Unable to load your shelf.',
  })
}

export async function createMyBook(accessToken: string, payload: CreateUserBookInput): Promise<UserBook> {
  return apiRequest<UserBook>('/api/v1/users/me/books', {
    accessToken,
    method: 'POST',
    body: payload,
    fallbackErrorMessage: 'Unable to add this book to your shelf.',
  })
}

export async function updateMyBook(
  accessToken: string,
  userBookId: number,
  payload: UpdateUserBookInput,
): Promise<UserBook> {
  return apiRequest<UserBook>(`/api/v1/users/me/books/${userBookId}`, {
    accessToken,
    method: 'PATCH',
    body: payload,
    fallbackErrorMessage: 'Unable to update this book on your shelf.',
  })
}

export async function deleteMyBook(accessToken: string, userBookId: number): Promise<void> {
  return apiRequest<void>(`/api/v1/users/me/books/${userBookId}`, {
    accessToken,
    method: 'DELETE',
    fallbackErrorMessage: 'Unable to unshelve this book.',
  })
}
