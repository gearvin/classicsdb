/* eslint-disable react-refresh/only-export-components */
import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { queryKeys } from '../api/queryKeys'
import { listReviews, type Review as ApiReview } from '../api/reviews'
import useAuth from '../auth/useAuth'
import ReviewCard from '../components/features/ReviewCard'
import ReviewVoteControls from '../components/features/reviews/ReviewVoteControls'
import { toReviewCard } from '../components/features/reviews/reviewDisplay'

export const Route = createFileRoute('/my-reviews')({
  component: MyReviewsPage,
})

const EMPTY_REVIEWS: ApiReview[] = []

function MyReviewsPage() {
  const { currentUser, isAuthenticated, isLoadingUser } = useAuth()
  const reviewsQuery = useQuery({
    enabled: isAuthenticated && currentUser !== null,
    queryKey: queryKeys.reviews.list({ userId: currentUser?.id, limit: 100 }),
    queryFn: () => listReviews({ userId: currentUser!.id, limit: 100 }),
  })
  const reviews = reviewsQuery.data ?? EMPTY_REVIEWS
  const reviewCards = useMemo(() => reviews.map(review => toReviewCard(review, 260)), [reviews])
  const error = reviewsQuery.error instanceof Error
    ? reviewsQuery.error.message
    : reviewsQuery.error
    ? 'Unable to load your reviews.'
    : null

  if (isLoadingUser) {
    return (
      <div className="pb-8">
        <h1 className="font-serif text-2xl font-medium text-ink leading-tight">My Reviews</h1>
        <p className="font-serif italic text-sepia text-sm mt-4">Loading your reviews...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="pb-8">
        <h1 className="font-serif text-2xl font-medium text-ink leading-tight">My Reviews</h1>
        <p className="font-sans text-sm text-sepia mt-2 mb-4">
          Log in to view your reviews.
        </p>
        <Link to="/login" className="font-sans text-sm text-link hover:text-highlight transition-colors">
          Log in
        </Link>
      </div>
    )
  }

  return (
    <div className="pb-8">
      <div className="mb-5 border-b border-border pb-4">
        <h1 className="font-serif text-2xl font-medium text-ink leading-tight">My Reviews</h1>
        <p className="font-sans text-sm text-sepia mt-2">
          {reviews.length.toLocaleString()} {reviews.length === 1 ? 'review' : 'reviews'}
        </p>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xs border border-border bg-surface px-4 py-3 font-serif italic text-sm text-sepia">
          {error}
        </p>
      )}

      {reviewsQuery.isPending ? (
        <p className="font-serif italic text-sepia text-sm">Loading your reviews...</p>
      ) : reviewCards.length === 0 ? (
        <div className="rounded-xs border border-border bg-surface px-4 py-5">
          <p className="font-serif italic text-sm text-sepia">Your reviews will appear here.</p>
          <Link
            to="/browse"
            className="mt-3 inline-block font-sans text-xs uppercase tracking-wide text-link hover:text-highlight transition-colors"
          >
            Find a book
          </Link>
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
