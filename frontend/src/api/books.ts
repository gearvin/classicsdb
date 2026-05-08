import { apiRequest } from './client'
import type { Language } from './languages'
import type { EntryRevision } from './suggestions'

export type { Language } from './languages'

export interface BookCover {
  id: number
  book_id: number
  url: string
  is_primary: boolean
  source?: string | null
}

export interface EditionCover {
  id: number
  edition_id: number
  url: string
  is_primary: boolean
  source?: string | null
}

export interface BookAuthor {
  author_id: number
  role: string
  position: number
  book_id?: number
  author_name: string
}

export interface BookLanguage {
  role: string
  position: number
  language: Language
}

export interface BookTitle {
  id: number
  book_id: number
  title: string
  language: Language
  title_type: string
  is_primary: boolean
  position: number
}

export interface EditionTitle {
  id: number
  edition_id: number
  language: Language
  title: string
  subtitle?: string | null
  title_type?: string | null
  is_primary: boolean
}

export interface EditionContributor {
  edition_id: number
  name: string
  role: string
  position: number
}

export interface BookEdition {
  id: number
  book_id: number
  display_title: string
  display_subtitle?: string | null
  isbn_10?: string | null
  isbn_13?: string | null
  publisher?: string | null
  publication_date?: string | null
  language?: Language | null
  format: string
  page_count?: number | null
  description: string
  created_at: string
  updated_at: string
  titles: EditionTitle[]
  contributors: EditionContributor[]
}

export interface BookSummary {
  id: number
  display_title: string
  first_published_year?: number | null
  work_type: string
  cover?: BookCover | null
  authors: BookAuthor[]
  average_rating?: number | null
  rating_count: number
}

export interface BookRead extends BookSummary {
  description: string
  languages: BookLanguage[]
  created_at: string
  updated_at: string
}

export interface BookDetail extends BookRead {
  titles: BookTitle[]
  editions: BookEdition[]
}

interface PaginatedBookSummaryList {
  items: BookSummary[]
  total: number
  limit: number
  offset: number
}

interface ListBooksOptions {
  authorId?: string | number
  sort?: 'title' | 'recent'
}

export interface CreateBookInput {
  description: string
  first_published_year: number | null
  work_type: string
  languages: Array<{
    language_code: string
    role: string
    position: number
  }>
  titles: Array<{
    title: string
    language_code: string
    title_type: string
    is_primary: boolean
    position: number
  }>
  covers: Array<{
    url: string
    is_primary: boolean
    source: string | null
  }>
  authors: Array<{
    author_id: number
    role: string
    position: number
  }>
}

export interface UpdateBookInput {
  description?: string
  first_published_year?: number | null
  work_type?: string
  languages?: Array<{
    language_code: string
    role: string
    position: number
  }>
  titles?: Array<{
    title: string
    language_code: string
    title_type: string
    is_primary: boolean
    position: number
  }>
  covers?: Array<{
    url: string
    is_primary: boolean
    source: string | null
  }>
  authors?: Array<{
    author_id: number
    role: string
    position: number
  }>
}

export async function listBooks(limit = 500, offset = 0, options: ListBooksOptions = {}): Promise<PaginatedBookSummaryList> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })

  if (options.authorId != null) {
    params.set('author_id', String(options.authorId))
  }

  if (options.sort != null) {
    params.set('sort', options.sort)
  }

  return apiRequest<PaginatedBookSummaryList>(`/api/v1/books?${params.toString()}`, {
    fallbackErrorMessage: 'Unable to load books.',
  })
}

export async function getBook(bookId: string | number): Promise<BookDetail> {
  return apiRequest<BookDetail>(`/api/v1/books/${bookId}`, {
    fallbackErrorMessage: 'Unable to load this book.',
  })
}

export async function listBookCovers(bookId: string | number): Promise<BookCover[]> {
  return apiRequest<BookCover[]>(`/api/v1/books/${bookId}/covers`, {
    fallbackErrorMessage: 'Unable to load book covers.',
  })
}

export async function listBookEditions(bookId: string | number): Promise<BookEdition[]> {
  return apiRequest<BookEdition[]>(`/api/v1/books/${bookId}/editions`, {
    fallbackErrorMessage: 'Unable to load book editions.',
  })
}

export async function createBook(
  payload: CreateBookInput,
  accessToken?: string,
  changeNote = '',
): Promise<BookRead> {
  const params = new URLSearchParams()
  if (changeNote.trim()) {
    params.set('change_note', changeNote.trim())
  }

  return apiRequest<BookRead>(`/api/v1/books${params.size ? `?${params.toString()}` : ''}`, {
    accessToken,
    method: 'POST',
    body: payload,
    fallbackErrorMessage: 'Unable to add this book.',
  })
}

export async function updateBook(
  bookId: string | number,
  payload: UpdateBookInput,
  accessToken?: string,
  changeNote = '',
): Promise<BookRead> {
  const params = new URLSearchParams()
  if (changeNote.trim()) {
    params.set('change_note', changeNote.trim())
  }

  return apiRequest<BookRead>(`/api/v1/books/${bookId}${params.size ? `?${params.toString()}` : ''}`, {
    accessToken,
    method: 'PATCH',
    body: payload,
    fallbackErrorMessage: 'Unable to update this book.',
  })
}

export async function listBookHistory(bookId: string | number): Promise<EntryRevision[]> {
  return apiRequest<EntryRevision[]>(`/api/v1/books/${bookId}/history`, {
    fallbackErrorMessage: 'Unable to load book history.',
  })
}

export async function listBookEditionHistory(
  bookId: string | number,
  editionId: string | number,
): Promise<EntryRevision[]> {
  return apiRequest<EntryRevision[]>(`/api/v1/books/${bookId}/editions/${editionId}/history`, {
    fallbackErrorMessage: 'Unable to load edition history.',
  })
}
