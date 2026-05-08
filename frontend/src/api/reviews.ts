import { apiRequest } from './client'
import type { BookSummary } from './books'

export interface ReviewUser {
  id: number
  username: string
  avatar_url?: string | null
  created_at: string
}

export interface Review {
  id: number
  user_book_id: number
  user_book_edition_id?: number | null
  book: BookSummary
  reviewer: ReviewUser
  rating?: number | null
  contains_spoilers: boolean
  is_public: boolean
  body: string
  helpful_count: number
  unhelpful_count: number
  comment_count: number
  created_at: string
  updated_at: string
}

export interface CreateReviewInput {
  user_book_id: number
  user_book_edition_id?: number | null
  rating?: number | null
  contains_spoilers?: boolean
  is_public?: boolean
  body: string
}

export interface UpdateReviewInput {
  user_book_edition_id?: number | null
  rating?: number | null
  contains_spoilers?: boolean
  is_public?: boolean
  body?: string
}

export interface ReviewVoteInput {
  is_helpful: boolean
}

export interface ReviewVote extends ReviewVoteInput {
  review_id: number
  user_id: number
  created_at: string
  updated_at: string
}

export interface ReviewComment {
  id: number
  review_id: number
  author: ReviewUser
  body: string
  created_at: string
  updated_at: string
}

export interface CreateReviewCommentInput {
  body: string
}

export interface ListReviewsOptions {
  bookId?: number
  userId?: number
  limit?: number
  offset?: number
}

export async function listReviews(bookIdOrOptions?: number | ListReviewsOptions): Promise<Review[]> {
  const options = typeof bookIdOrOptions === 'number'
    ? { bookId: bookIdOrOptions }
    : bookIdOrOptions ?? {}
  const params = new URLSearchParams()

  if (options.bookId != null) {
    params.set('book_id', String(options.bookId))
  }
  if (options.userId != null) {
    params.set('user_id', String(options.userId))
  }
  if (options.limit != null) {
    params.set('limit', String(options.limit))
  }
  if (options.offset != null) {
    params.set('offset', String(options.offset))
  }

  const query = params.toString()

  return apiRequest<Review[]>(`/api/v1/reviews${query ? `?${query}` : ''}`, {
    fallbackErrorMessage: 'Unable to load reviews.',
  })
}

export async function getReview(reviewId: string | number): Promise<Review> {
  return apiRequest<Review>(`/api/v1/reviews/${reviewId}`, {
    fallbackErrorMessage: 'Unable to load this review.',
  })
}

export async function listReviewComments(reviewId: string | number): Promise<ReviewComment[]> {
  return apiRequest<ReviewComment[]>(`/api/v1/reviews/${reviewId}/comments`, {
    fallbackErrorMessage: 'Unable to load replies.',
  })
}

export async function createReviewComment(
  accessToken: string,
  reviewId: string | number,
  payload: CreateReviewCommentInput,
): Promise<ReviewComment> {
  return apiRequest<ReviewComment>(`/api/v1/reviews/${reviewId}/comments`, {
    accessToken,
    method: 'POST',
    body: payload,
    fallbackErrorMessage: 'Unable to post your reply.',
  })
}

export async function createReview(accessToken: string, payload: CreateReviewInput): Promise<Review> {
  return apiRequest<Review>('/api/v1/reviews', {
    accessToken,
    method: 'POST',
    body: payload,
    fallbackErrorMessage: 'Unable to submit your review.',
  })
}

export async function updateReview(
  accessToken: string,
  reviewId: number,
  payload: UpdateReviewInput,
): Promise<Review> {
  return apiRequest<Review>(`/api/v1/reviews/${reviewId}`, {
    accessToken,
    method: 'PATCH',
    body: payload,
    fallbackErrorMessage: 'Unable to update your review.',
  })
}

export async function getMyReviewVote(accessToken: string, reviewId: number): Promise<ReviewVote | null> {
  return apiRequest<ReviewVote | null>(`/api/v1/reviews/${reviewId}/vote`, {
    accessToken,
    fallbackErrorMessage: 'Unable to load your vote.',
  })
}

export async function voteReview(
  accessToken: string,
  reviewId: number,
  payload: ReviewVoteInput,
): Promise<Review> {
  return apiRequest<Review>(`/api/v1/reviews/${reviewId}/vote`, {
    accessToken,
    method: 'POST',
    body: payload,
    fallbackErrorMessage: 'Unable to save your vote.',
  })
}

export async function clearReviewVote(accessToken: string, reviewId: number): Promise<Review> {
  return apiRequest<Review>(`/api/v1/reviews/${reviewId}/vote`, {
    accessToken,
    method: 'DELETE',
    fallbackErrorMessage: 'Unable to clear your vote.',
  })
}
