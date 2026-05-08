/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { listBooks, type BookSummary } from '../api/books'
import { queryKeys } from '../api/queryKeys'
import { listReviews, type Review as ApiReview } from '../api/reviews'
import ReviewCard, { ReviewCardSkeleton } from '../components/features/ReviewCard'
import RecentlyAddedBookCard from '../components/features/books/RecentlyAddedBookCard'
import { toReviewCard } from '../components/features/reviews/reviewDisplay'
import SectionHeader from '../components/ui/SectionHeader'
import { Skeleton, SkeletonCover } from '../components/ui/Skeleton'

export const Route = createFileRoute('/')({
  component: Home,
})

const REVIEW_LIMIT = 4
const BOOK_LIMIT = 6
const EMPTY_BOOKS: BookSummary[] = []
const EMPTY_REVIEWS: ApiReview[] = []
const RECENT_BOOK_SKELETONS = Array.from({ length: BOOK_LIMIT }, (_, index) => index)
const REVIEW_SKELETONS = Array.from({ length: REVIEW_LIMIT }, (_, index) => index)

function ComingSoonBox() {
  return (
    <div className="rounded-xs border border-border bg-surface px-4 py-5">
      <p className="font-serif text-lg leading-tight text-ink">Forums coming soon</p>
      {/* <p className="mt-1 max-w-xl font-sans text-sm leading-5 text-sepia">
        Discussion threads are planned, but the home page is keeping this space quiet until the forum API exists.
      </p> */}
    </div>
  )
}

function RecentlyAddedBookSkeleton() {
  return (
    <article aria-hidden="true" className="min-w-0 animate-pulse">
      <div className="overflow-hidden rounded-xs border border-border bg-surface">
        <SkeletonCover className="rounded-none border-0" />
        <div className="border-t border-border bg-bg px-2.5 py-2">
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="mt-2 h-2.5 w-3/5 bg-border/60" />
        </div>
      </div>
    </article>
  )
}

function Home() {
  const booksQuery = useQuery({
    queryKey: queryKeys.books.list(BOOK_LIMIT, 0, { sort: 'recent' }),
    queryFn: () => listBooks(BOOK_LIMIT, 0, { sort: 'recent' }),
    select: data => data.items,
  })
  const reviewsQuery = useQuery({
    queryKey: queryKeys.reviews.list({ limit: REVIEW_LIMIT }),
    queryFn: () => listReviews({ limit: REVIEW_LIMIT }),
  })
  const books = booksQuery.data ?? EMPTY_BOOKS
  const reviews = reviewsQuery.data ?? EMPTY_REVIEWS
  const isBooksLoading = booksQuery.isPending
  const isReviewsLoading = reviewsQuery.isPending
  const queryError = booksQuery.error ?? reviewsQuery.error
  const error = queryError instanceof Error
    ? queryError.message
    : queryError
    ? 'Unable to load the latest ClassicsDB activity.'
    : null

  const reviewCards = useMemo(() => reviews.map(review => toReviewCard(review)), [reviews])

  return (
    <div className="pb-6">
      <p className="mb-6 border-b border-border pb-4 font-sans leading-relaxed text-sepia">
        This is a database and forum dedicated to classic novels. WIP :)
      </p>

      <section className="mb-8">
        <SectionHeader title="Announcements" />
        <div className="flex min-h-15 w-full items-center rounded-xs border border-border bg-surface px-4 py-3">
          <p className="font-sans text-sm text-highlight">
            Coming soon!
          </p>
        </div>
      </section>

      {error && (
        <p role="alert" className="mb-6 rounded-xs border border-border bg-surface px-4 py-3 font-serif italic text-sm text-sepia">
          {error}
        </p>
      )}

      <section className="mb-8">
        <SectionHeader title="Recently Added" href="/browse" />
        {isBooksLoading ? (
          <div aria-busy="true" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
            {RECENT_BOOK_SKELETONS.map(index => (
              <RecentlyAddedBookSkeleton key={index} />
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="rounded-xs border border-border bg-surface px-4 py-5">
            <p className="font-serif italic text-sm text-sepia">No books have been added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
            {books.map(book => (
              <RecentlyAddedBookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <SectionHeader title="Recent Reviews" href="/reviews" />
        {isReviewsLoading ? (
          <div aria-busy="true" className="grid grid-cols-1 gap-6 pt-2 lg:grid-cols-2">
            {REVIEW_SKELETONS.map(index => (
              <ReviewCardSkeleton key={index} />
            ))}
          </div>
        ) : reviewCards.length === 0 ? (
          <div className="rounded-xs border border-border bg-surface px-4 py-5">
            <p className="font-serif italic text-sm text-sepia">No reviews have been added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 pt-2 lg:grid-cols-2">
            {reviewCards.map(review => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <SectionHeader title="Forums" />
        <ComingSoonBox />
      </section>
    </div>
  )
}
