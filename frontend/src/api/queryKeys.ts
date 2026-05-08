import type { ListReviewsOptions } from './reviews'

interface ListBooksKeyOptions {
  authorId?: string | number
  sort?: 'title' | 'recent'
}

function normalizeReviewsOptions(options?: number | ListReviewsOptions) {
  if (typeof options === 'number') {
    return { bookId: options }
  }

  return options ?? {}
}

export const queryKeys = {
  auth: {
    currentUser: (_accessToken?: string | null) => {
      void _accessToken
      return ['auth', 'currentUser'] as const
    },
  },
  authors: {
    all: ['authors'] as const,
    lists: () => [...queryKeys.authors.all, 'list'] as const,
    list: (limit = 500, offset = 0) => [...queryKeys.authors.lists(), { limit, offset }] as const,
    detail: (authorId: string | number) => [...queryKeys.authors.all, 'detail', String(authorId)] as const,
    history: (authorId: string | number) => [...queryKeys.authors.detail(authorId), 'history'] as const,
    books: (authorId: string | number, limit = 500, offset = 0) => (
      [...queryKeys.authors.detail(authorId), 'books', { limit, offset }] as const
    ),
  },
  books: {
    all: ['books'] as const,
    lists: () => [...queryKeys.books.all, 'list'] as const,
    list: (limit = 500, offset = 0, options: ListBooksKeyOptions = {}) => (
      [...queryKeys.books.lists(), { limit, offset, ...options }] as const
    ),
    detail: (bookId: string | number) => [...queryKeys.books.all, 'detail', String(bookId)] as const,
    covers: (bookId: string | number) => [...queryKeys.books.detail(bookId), 'covers'] as const,
    editions: (bookId: string | number) => [...queryKeys.books.detail(bookId), 'editions'] as const,
    history: (bookId: string | number) => [...queryKeys.books.detail(bookId), 'history'] as const,
    editionHistory: (bookId: string | number, editionId: string | number) => (
      [...queryKeys.books.detail(bookId), 'editions', String(editionId), 'history'] as const
    ),
  },
  languages: {
    all: ['languages'] as const,
  },
  reviews: {
    all: ['reviews'] as const,
    lists: () => [...queryKeys.reviews.all, 'list'] as const,
    list: (options?: number | ListReviewsOptions) => (
      [...queryKeys.reviews.lists(), normalizeReviewsOptions(options)] as const
    ),
    detail: (reviewId: string | number) => [...queryKeys.reviews.all, 'detail', String(reviewId)] as const,
    comments: (reviewId: string | number) => [...queryKeys.reviews.detail(reviewId), 'comments'] as const,
    vote: (reviewId: string | number, _accessToken?: string | null) => {
      void _accessToken
      return [...queryKeys.reviews.detail(reviewId), 'vote'] as const
    },
  },
  suggestions: {
    all: ['suggestions'] as const,
    mine: (_accessToken?: string | null) => {
      void _accessToken
      return [...queryKeys.suggestions.all, 'me'] as const
    },
    detail: (suggestionId: string | number, _accessToken?: string | null) => {
      void _accessToken
      return [...queryKeys.suggestions.all, 'detail', String(suggestionId)] as const
    },
    admin: (_accessToken?: string | null, status?: string) => {
      void _accessToken
      return [...queryKeys.suggestions.all, 'admin', { status }] as const
    },
  },
  tags: {
    all: ['tags'] as const,
    tree: () => [...queryKeys.tags.all, 'tree'] as const,
    detail: (tagId: string | number, showAll = false, showSpoilers = false) => {
      return [...queryKeys.tags.all, 'detail', String(tagId), { showAll, showSpoilers }] as const
    },
    book: (bookId: string | number, userId?: string | number | null, showAll = false, showSpoilers = false) => {
      return [...queryKeys.books.detail(bookId), 'tags', { showAll, showSpoilers, userId: userId ?? null }] as const
    },
    requests: {
      all: ['tagRequests'] as const,
      mine: (userId?: string | number | null) => {
        return [...queryKeys.tags.requests.all, 'me', { userId: userId ?? null }] as const
      },
      admin: (userId?: string | number | null, status?: string) => {
        return [...queryKeys.tags.requests.all, 'admin', { status, userId: userId ?? null }] as const
      },
    },
  },
  userBooks: {
    all: ['userBooks'] as const,
    mine: (_accessToken?: string | null) => {
      void _accessToken
      return [...queryKeys.userBooks.all, 'me'] as const
    },
    public: (username: string) => [...queryKeys.userBooks.all, 'public', username] as const,
  },
  users: {
    all: ['users'] as const,
    list: (limit = 50, offset = 0) => [...queryKeys.users.all, 'list', { limit, offset }] as const,
    detail: (username: string) => [...queryKeys.users.all, 'detail', username] as const,
    reviews: (username: string, limit = 50, offset = 0) => (
      [...queryKeys.users.detail(username), 'reviews', { limit, offset }] as const
    ),
  },
}
