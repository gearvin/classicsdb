import { apiRequest } from './client'
import type { EntryRevision } from './suggestions'

export interface Author {
  id: number
  name: string
  sort_name?: string | null
  bio: string
  birth_year?: number | null
  death_year?: number | null
  created_at: string
  updated_at: string
}

export interface CreateAuthorInput {
  name: string
  sort_name: string | null
  bio: string
  birth_year: number | null
  death_year: number | null
}

export async function listAuthors(limit = 500, offset = 0): Promise<Author[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })

  return apiRequest<Author[]>(`/api/v1/authors?${params.toString()}`, {
    fallbackErrorMessage: 'Unable to load authors.',
  })
}

export async function getAuthor(authorId: string | number): Promise<Author> {
  return apiRequest<Author>(`/api/v1/authors/${authorId}`, {
    fallbackErrorMessage: 'Unable to load this author.',
  })
}

export type UpdateAuthorInput = Partial<CreateAuthorInput>

export async function createAuthor(
  payload: CreateAuthorInput,
  accessToken?: string,
  changeNote = '',
): Promise<Author> {
  const params = new URLSearchParams()
  if (changeNote.trim()) {
    params.set('change_note', changeNote.trim())
  }

  return apiRequest<Author>(`/api/v1/authors${params.size ? `?${params.toString()}` : ''}`, {
    accessToken,
    method: 'POST',
    body: payload,
    fallbackErrorMessage: 'Unable to add this author.',
  })
}

export async function updateAuthor(
  authorId: string | number,
  payload: UpdateAuthorInput,
  accessToken?: string,
  changeNote = '',
): Promise<Author> {
  const params = new URLSearchParams()
  if (changeNote.trim()) {
    params.set('change_note', changeNote.trim())
  }

  return apiRequest<Author>(`/api/v1/authors/${authorId}${params.size ? `?${params.toString()}` : ''}`, {
    accessToken,
    method: 'PATCH',
    body: payload,
    fallbackErrorMessage: 'Unable to update this author.',
  })
}

export async function listAuthorHistory(authorId: string | number): Promise<EntryRevision[]> {
  return apiRequest<EntryRevision[]>(`/api/v1/authors/${authorId}/history`, {
    fallbackErrorMessage: 'Unable to load author history.',
  })
}
