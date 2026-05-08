import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { queryKeys } from '../../../api/queryKeys'
import { createReview, listReviews, type Review } from '../../../api/reviews'
import type { UserBook } from '../../../api/userBooks'
import useAuth from '../../../auth/useAuth'
import ReviewerAvatar from '../reviews/ReviewerAvatar'
import ReviewVoteControls from '../reviews/ReviewVoteControls'
import { formatReviewDate, formatReviewer } from '../reviews/reviewDisplay'
import { Skeleton, SkeletonText } from '../../ui/Skeleton'
import StarRating from '../../ui/StarRating'
import StarRatingInput from '../../ui/StarRatingInput'
import { formatRating, getCanReview, toStarRating } from './rating'

function formatCommentCount(count: number) {
  return `${count.toLocaleString()} ${count === 1 ? 'comment' : 'comments'}`
}

function ReviewItem({ review }: { review: Review }) {
  const starRating = toStarRating(review.rating)
  const reviewerName = formatReviewer(review)
  const reviewDate = formatReviewDate(review.created_at)

  return (
    <article className="border-b border-border pb-4 last:border-b-0">
      <div className="flex gap-3">
        <ReviewerAvatar
          avatarUrl={review.reviewer.avatar_url}
          className="size-9"
          username={review.reviewer.username}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link
              to="/users/$username"
              params={{ username: review.reviewer.username }}
              className="font-sans text-link transition-colors hover:text-highlight"
            >
              {reviewerName}
            </Link>
            <span aria-hidden="true" className="font-sans text-sm text-dust">·</span>
            <Link
              to="/reviews/$reviewId"
              params={{ reviewId: String(review.id) }}
              aria-label={`View review from ${reviewDate}`}
              className="font-sans text-sm text-dust transition-colors hover:text-highlight"
            >
              {reviewDate}
            </Link>
            {review.contains_spoilers && (
              <span className="rounded-xs border border-border px-1.5 py-0.5 font-sans text-[10px] uppercase tracking-wide text-sepia">
                Spoilers
              </span>
            )}
          </div>
          {starRating != null && (
            <div className="mb-2 flex items-center gap-2">
              <StarRating rating={starRating} size={14} />
              <span className="font-sans text-sm text-sepia">
                {starRating.toFixed(1)}
              </span>
            </div>
          )}
          <p className="max-w-3xl whitespace-pre-wrap leading-5 text-ink">
            {review.body}
          </p>
          {review.comment_count > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link
                to="/reviews/$reviewId"
                params={{ reviewId: String(review.id) }}
                className="font-sans text-sm uppercase tracking-wide text-link hover:text-highlight transition-colors"
              >
                {formatCommentCount(review.comment_count)}
              </Link>
            </div>
          )}
          <ReviewVoteControls review={review} />
        </div>
      </div>
    </article>
  )
}

function BookReviewsSkeleton() {
  return (
    <div aria-busy="true" className="space-y-4">
      {Array.from({ length: 3 }, (_, index) => (
        <article
          key={index}
          aria-hidden="true"
          className="animate-pulse border-b border-border pb-4 last:border-b-0"
        >
          <div className="flex gap-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-16 bg-border/60" />
              </div>
              <Skeleton className="mb-3 h-3 w-24 bg-border/60" />
              <SkeletonText className="max-w-3xl" lines={3} />
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

interface ReviewModalProps {
  containsSpoilers: boolean
  error: string | null
  isSubmitting: boolean
  onClose: () => void
  onContainsSpoilersChange: (containsSpoilers: boolean) => void
  onRatingChange: (rating: number | null) => void
  onReviewBodyChange: (body: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  rating: number | null
  reviewBody: string
}

function ReviewModal({
  containsSpoilers,
  error,
  isSubmitting,
  onClose,
  onContainsSpoilersChange,
  onRatingChange,
  onReviewBodyChange,
  onSubmit,
  rating,
  reviewBody,
}: ReviewModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xs border border-border bg-bg p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-border pb-3">
          <h3 id="review-modal-title" className="font-sans text-xs uppercase tracking-wide text-accent">
            Write a Review
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close review form"
            className="h-6 w-6 shrink-0 rounded-xs border border-border font-sans text-xs text-link hover:border-accent hover:text-highlight disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            x
          </button>
        </div>

        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <div>
            <p className="mb-1.5 font-sans text-xs uppercase tracking-wide text-sepia">
              Rating
            </p>
            <StarRatingInput
              disabled={isSubmitting}
              rating={rating}
              onRate={onRatingChange}
            />
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="font-sans text-xs text-sepia">{formatRating(rating)}</p>
              {rating != null && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => onRatingChange(null)}
                  className="font-sans text-xs text-link underline underline-offset-2 decoration-accent hover:text-highlight disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                >
                  clear
                </button>
              )}
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="font-sans text-xs uppercase tracking-wide text-sepia">
              Review
            </span>
            <textarea
              value={reviewBody}
              onChange={event => onReviewBodyChange(event.currentTarget.value)}
              disabled={isSubmitting}
              rows={7}
              className="min-h-36 resize-y rounded-xs border border-border bg-bg px-3 py-2 font-sans text-sm leading-5 text-ink disabled:cursor-not-allowed disabled:opacity-50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>

          <label className="flex items-center gap-2 font-sans text-xs text-sepia">
            <input
              type="checkbox"
              checked={containsSpoilers}
              onChange={event => onContainsSpoilersChange(event.currentTarget.checked)}
              disabled={isSubmitting}
              className="h-3.5 w-3.5 accent-accent"
            />
            Contains spoilers
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xs border border-accent bg-accent px-3 py-2 font-sans text-xs uppercase tracking-wide text-bg hover:border-highlight hover:bg-highlight disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Submit Review'}
          </button>
        </form>

        {error && (
          <p role="alert" className="mt-3 font-sans text-xs leading-4 text-link">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

export default function BookReviews({
  bookId,
  isLoadingShelf,
  userBook,
}: {
  bookId: number
  isLoadingShelf: boolean
  userBook: UserBook | null
}) {
  const { accessToken, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const [reviewBody, setReviewBody] = useState('')
  const [reviewRating, setReviewRating] = useState<number | null>(null)
  const [containsSpoilers, setContainsSpoilers] = useState(false)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const reviewsQuery = useQuery({
    queryKey: queryKeys.reviews.list(bookId),
    queryFn: () => listReviews(bookId),
  })
  const createReviewMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createReview>[1]) => createReview(accessToken!, payload),
    onSuccess: savedReview => {
      queryClient.setQueryData<Review[]>(queryKeys.reviews.list(bookId), previousReviews => (
        previousReviews ? [savedReview, ...previousReviews] : [savedReview]
      ))
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.books.detail(bookId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.books.lists() })
    },
  })
  const reviews = reviewsQuery.data ?? []
  const isLoadingReviews = reviewsQuery.isPending
  const isSubmittingReview = createReviewMutation.isPending
  const loadingReviewError = reviewsQuery.error instanceof Error
    ? reviewsQuery.error.message
    : reviewsQuery.error
    ? 'Unable to load reviews.'
    : null
  const canReview = getCanReview(userBook)

  function resetReviewForm() {
    setReviewBody('')
    setReviewRating(null)
    setContainsSpoilers(false)
  }

  function openReviewModal() {
    if (!userBook || !canReview) {
      setReviewError('Mark this book as read or add a rating before reviewing it.')
      return
    }

    setReviewError(null)
    setReviewRating(userBook?.rating ?? null)
    setIsReviewModalOpen(true)
  }

  function closeReviewModal() {
    if (isSubmittingReview) {
      return
    }

    setReviewError(null)
    setIsReviewModalOpen(false)
  }

  async function handleSubmitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!accessToken) {
      return
    }

    if (!userBook || !canReview) {
      setReviewError('Mark this book as read or add a rating before reviewing it.')
      return
    }

    const body = reviewBody.trim()
    if (!body) {
      setReviewError('Write a few thoughts before submitting your review.')
      return
    }

    setReviewError(null)

    try {
      await createReviewMutation.mutateAsync({
        body,
        contains_spoilers: containsSpoilers,
        is_public: true,
        rating: reviewRating,
        user_book_id: userBook.id,
      })

      resetReviewForm()
      setIsReviewModalOpen(false)
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Unable to submit your review.')
    }
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
        <h2 className="font-sans text-xs uppercase tracking-wide text-accent">Reviews</h2>
        {isAuthenticated ? (
          <button
            type="button"
            onClick={openReviewModal}
            disabled={isLoadingShelf || !canReview}
            title={canReview ? 'Write a review' : 'Mark this book as read or add a rating before reviewing it'}
            className="rounded-xs border border-accent bg-accent px-3 py-1.5 font-sans text-xs uppercase tracking-wide text-bg hover:border-highlight hover:bg-highlight disabled:cursor-not-allowed disabled:border-border disabled:bg-surface disabled:text-sepia transition-colors"
          >
            {isLoadingShelf ? 'Loading Shelf...' : canReview ? 'Write Review' : 'Mark as Read to Review'}
          </button>
        ) : (
          <Link
            to="/login"
            className="font-sans text-xs uppercase tracking-wide text-link hover:text-highlight transition-colors"
          >
            Log in to review
          </Link>
        )}
      </div>

      {isAuthenticated && !isLoadingShelf && !canReview && (
        <p className="mb-4 font-sans text-xs leading-4 text-sepia">
          Set your status to Read, or add a rating, to write a review.
        </p>
      )}

      <div className="space-y-4">
        {isLoadingReviews ? (
          <BookReviewsSkeleton />
        ) : loadingReviewError ? (
          <p role="alert" className="font-serif italic text-sepia text-sm">{loadingReviewError}</p>
        ) : reviews.length === 0 ? (
          <p className="font-serif italic text-sepia text-sm">No reviews have been added yet.</p>
        ) : (
          reviews.map(review => <ReviewItem key={review.id} review={review} />)
        )}
      </div>

      {reviewError && !isReviewModalOpen && (
        <p role="alert" className="mt-3 font-sans text-xs leading-4 text-link">
          {reviewError}
        </p>
      )}

      {isReviewModalOpen && (
        <ReviewModal
          containsSpoilers={containsSpoilers}
          error={reviewError}
          isSubmitting={isSubmittingReview}
          onClose={closeReviewModal}
          onContainsSpoilersChange={setContainsSpoilers}
          onRatingChange={setReviewRating}
          onReviewBodyChange={setReviewBody}
          onSubmit={handleSubmitReview}
          rating={reviewRating}
          reviewBody={reviewBody}
        />
      )}
    </section>
  )
}
