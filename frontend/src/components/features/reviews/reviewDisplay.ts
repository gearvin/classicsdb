import type { BookSummary } from '../../../api/books'
import type { Review as ApiReview } from '../../../api/reviews'
import type { Review as ReviewCardModel } from '../ReviewCard'
import { formatBookAuthors } from '../books/display'

export function formatAuthors(book: BookSummary) {
  return formatBookAuthors(book)
}

export function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatReviewer(review: ApiReview) {
  return review.reviewer.username
}

export function truncateExcerpt(body: string, maxLength = 220) {
  const normalized = body.trim()
  if (normalized.length <= maxLength) {
    return { excerpt: normalized, hasMore: false }
  }

  return {
    excerpt: `${normalized.slice(0, maxLength - 3).trimEnd()}...`,
    hasMore: true,
  }
}

export function toReviewCard(review: ApiReview, maxLength?: number): ReviewCardModel {
  const { excerpt, hasMore } = truncateExcerpt(review.body, maxLength)

  return {
    id: review.id,
    bookId: review.book.id,
    bookTitle: review.book.display_title,
    author: formatAuthors(review.book),
    coverUrl: review.book.cover?.url,
    rating: review.rating == null ? null : review.rating / 2,
    commentCount: review.comment_count,
    excerpt,
    reviewerAvatarUrl: review.reviewer.avatar_url,
    reviewerUsername: review.reviewer.username,
    date: formatReviewDate(review.created_at),
    hasMore,
  }
}
