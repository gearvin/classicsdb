import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Skeleton, SkeletonCover, SkeletonText } from '../ui/Skeleton'
import ReviewerAvatar from './reviews/ReviewerAvatar'

export interface Review {
  id: number
  bookId?: number
  bookTitle: string
  author: string
  coverUrl?: string | null
  rating?: number | null
  commentCount?: number
  excerpt: string
  reviewerAvatarUrl?: string | null
  reviewerUsername: string
  date: string
  hasMore?: boolean
}

function starsFor(rating: number): string {
  const full  = Math.floor(rating)
  const half  = rating - full >= 0.5
  return '★'.repeat(full) + (half ? '½' : '')
}

function formatCommentCount(count: number) {
  return `${count.toLocaleString()} ${count === 1 ? 'comment' : 'comments'}`
}

export default function ReviewCard({ children, review }: { children?: ReactNode; review: Review }) {
  const title = review.bookId ? (
    <Link
      to="/book/$bookId"
      params={{ bookId: String(review.bookId) }}
      className="hover:text-highlight transition-colors"
    >
      {review.bookTitle}
    </Link>
  ) : review.bookTitle

  return (
    <article className="flex min-w-0 gap-4 border-b border-border pb-4 sm:gap-6">
      <Link
        to="/reviews/$reviewId"
        params={{ reviewId: String(review.id) }}
        className="self-start"
        aria-label={`Read review of ${review.bookTitle}`}
      >
        <div className="h-24 w-16 shrink-0 overflow-hidden rounded-xs border border-border bg-surface transition-colors hover:border-highlight sm:h-26 sm:w-18">
          {review.coverUrl ? (
            <img
              src={review.coverUrl}
              alt={`${review.bookTitle} cover`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="font-serif font-medium text-lg text-ink leading-tight">
          {title}
        </h3>
        <p className="mb-2 break-words font-serif text-sm italic text-sepia">
          {review.author}
        </p>
        <p className="mb-2 whitespace-pre-line break-words text-ink">
          {review.excerpt}
          {review.hasMore && (
            <>
              {' '}
              {review.bookId ? (
                <Link
                  to="/reviews/$reviewId"
                  params={{ reviewId: String(review.id) }}
                  className="italic underline underline-offset-2 decoration-accent text-link hover:text-highlight hover:decoration-highlight transition-colors"
                >
                  Read more
                </Link>
              ) : (
                <span className="italic text-sepia">Read more</span>
              )}
            </>
          )}
        </p>
        {review.rating != null && (
          <div className="mb-2 flex items-center gap-2 text-stars">
            {/* <StarRating rating={review.rating} size={14} />
            <span className="font-sans text-xs text-sepia">{review.rating.toFixed(1)}</span> */}
            {starsFor(review.rating)}
          </div>
        )}
        <div className="mt-1 flex min-w-0 items-center gap-2 font-sans text-sm text-dust">
          <ReviewerAvatar
            avatarUrl={review.reviewerAvatarUrl}
            username={review.reviewerUsername}
          />
          <p className="min-w-0 break-words">
            <Link
              to="/users/$username"
              params={{ username: review.reviewerUsername }}
              className="text-link transition-colors hover:text-highlight"
            >
              {review.reviewerUsername}
            </Link>
            <span aria-hidden="true">{' '}·{' '}</span>
            <Link
              to="/reviews/$reviewId"
              params={{ reviewId: String(review.id) }}
              aria-label={`View review from ${review.date}`}
              className="transition-colors hover:text-highlight"
            >
              {review.date}
            </Link>
          </p>
        </div>
        {review.commentCount ? (
          <Link
            to="/reviews/$reviewId"
            params={{ reviewId: String(review.id) }}
            className="mt-2 font-sans text-xs uppercase tracking-wide text-link hover:text-highlight transition-colors"
          >
            {formatCommentCount(review.commentCount)}
          </Link>
        ) : null}
        {children}
      </div>
    </article>
  )
}

export function ReviewCardSkeleton() {
  return (
    <article
      aria-hidden="true"
      className="flex min-w-0 animate-pulse gap-4 border-b border-border pb-4 sm:gap-6"
    >
      <SkeletonCover className="h-24 w-16 shrink-0 rounded-xs sm:h-26 sm:w-18" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-5 w-7/12 max-w-80" />
        <Skeleton className="mt-2 h-3 w-5/12 max-w-56 bg-border/60" />
        <SkeletonText className="mt-4 max-w-2xl" lines={3} />
        <div className="mt-4 flex items-center gap-2">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-3 w-40 bg-border/60" />
        </div>
      </div>
    </article>
  )
}
