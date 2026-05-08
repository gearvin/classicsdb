/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { queryKeys } from '../api/queryKeys'
import { listReviews, type Review as ApiReview } from '../api/reviews'
import ReviewCard, { ReviewCardSkeleton } from '../components/features/ReviewCard'
import ReviewVoteControls from '../components/features/reviews/ReviewVoteControls'
import { toReviewCard } from '../components/features/reviews/reviewDisplay'

export const Route = createFileRoute('/reviews')({
  component: ReviewsPage,
})

const REVIEW_LIMIT = 50
const EMPTY_REVIEWS: ApiReview[] = []
const REVIEW_SKELETONS = Array.from({ length: 6 }, (_, index) => index)

function ReviewsPage() {
  const reviewsQuery = useQuery({
    queryKey: queryKeys.reviews.list({ limit: REVIEW_LIMIT }),
    queryFn: () => listReviews({ limit: REVIEW_LIMIT }),
  })
  const reviews = reviewsQuery.data ?? EMPTY_REVIEWS
  const reviewCards = useMemo(() => reviews.map(review => toReviewCard(review, 300)), [reviews])
  const error = reviewsQuery.error instanceof Error
    ? reviewsQuery.error.message
    : reviewsQuery.error
    ? 'Unable to load reviews.'
    : null

  return (
    <div className="pb-8">
      <div className="mb-5 border-b border-border pb-4">
        <h1 className="font-serif text-2xl font-medium text-ink leading-tight">Reviews</h1>
        <p className="font-sans text-sm text-sepia mt-2">
          Recent reader notes and ratings.
        </p>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xs border border-border bg-surface px-4 py-3 font-serif italic text-sm text-sepia">
          {error}
        </p>
      )}

      {reviewsQuery.isPending ? (
        <div aria-busy="true" className="grid grid-cols-1 gap-5">
          {REVIEW_SKELETONS.map(index => (
            <ReviewCardSkeleton key={index} />
          ))}
        </div>
      ) : reviewCards.length === 0 ? (
        <div className="rounded-xs border border-border bg-surface px-4 py-5">
          <p className="font-serif italic text-sm text-sepia">No reviews have been added yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {reviewCards.map((review, index) => (
            <ReviewCard key={review.id} review={review}>
              <ReviewVoteControls review={reviews[index]} />
            </ReviewCard>
          ))}
        </div>
      )}
    </div>
  )
}
