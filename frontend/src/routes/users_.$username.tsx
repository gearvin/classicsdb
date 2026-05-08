/* eslint-disable react-refresh/only-export-components */
import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { listBooks, type BookSummary } from '../api/books'
import { queryKeys } from '../api/queryKeys'
import type { Review } from '../api/reviews'
import {
  getPublicUser,
  listPublicUserBooks,
  listPublicUserReviews,
} from '../api/users'
import type { UserBook } from '../api/userBooks'
import ReviewCard from '../components/features/ReviewCard'
import { toReviewCard } from '../components/features/reviews/reviewDisplay'
import {
  ActivityItem,
  ActivityListSkeleton,
  ProfileStatBlock,
  StatsSkeleton,
} from '../components/features/users/ProfileActivity'
import {
  formatDate,
  formatShelfRating,
  formatStatus,
  getShelfActivityTitle,
  getStatusCount,
  type ActivityEntry,
} from '../components/features/users/profileActivityUtils'

export const Route = createFileRoute('/users_/$username')({
  component: PublicProfilePage,
})

const EMPTY_BOOKS: BookSummary[] = []
const EMPTY_REVIEWS: Review[] = []
const EMPTY_USER_BOOKS: UserBook[] = []
const REVIEW_LIMIT = 50

function PublicProfilePage() {
  const { username } = Route.useParams()
  const userQuery = useQuery({
    queryKey: queryKeys.users.detail(username),
    queryFn: () => getPublicUser(username),
  })
  const shelfBooksQuery = useQuery({
    queryKey: queryKeys.userBooks.public(username),
    queryFn: () => listPublicUserBooks(username),
  })
  const reviewsQuery = useQuery({
    queryKey: queryKeys.users.reviews(username, REVIEW_LIMIT),
    queryFn: () => listPublicUserReviews(username, REVIEW_LIMIT),
  })
  const catalogBooksQuery = useQuery({
    queryKey: queryKeys.books.list(),
    queryFn: () => listBooks(),
    select: data => data.items,
  })

  const user = userQuery.data
  const shelfBooks = shelfBooksQuery.data ?? EMPTY_USER_BOOKS
  const reviews = reviewsQuery.data ?? EMPTY_REVIEWS
  const catalogBooks = catalogBooksQuery.data ?? EMPTY_BOOKS
  const isProfileLoading = userQuery.isPending
  const isStatsLoading = shelfBooksQuery.isPending || reviewsQuery.isPending
  const isActivityLoading = isStatsLoading || (
    catalogBooksQuery.isPending &&
    shelfBooks.length > 0 &&
    reviews.length === 0
  )
  const queryError = userQuery.error ?? shelfBooksQuery.error ?? reviewsQuery.error ?? catalogBooksQuery.error
  const error = queryError instanceof Error
    ? queryError.message
    : queryError
    ? 'Unable to load this profile.'
    : null

  const booksById = useMemo(() => {
    return new Map(catalogBooks.map(book => [book.id, book]))
  }, [catalogBooks])

  const recentActivity = useMemo<ActivityEntry[]>(() => {
    const shelfActivity = catalogBooksQuery.isPending
      ? []
      : shelfBooks.map(userBook => {
        const book = booksById.get(userBook.book_id)
        const status = formatStatus(userBook.status)
        const rating = formatShelfRating(userBook.rating)

        return {
          id: `shelf-${userBook.id}`,
          book,
          bookId: userBook.book_id,
          date: userBook.updated_at,
          timestamp: new Date(userBook.updated_at).getTime(),
          title: getShelfActivityTitle(userBook.status, userBook.rating),
          meta: [status, rating].filter(Boolean).join(' · '),
        }
      })

    const reviewActivity = reviews.map(review => {
      const rating = formatShelfRating(review.rating)

      return {
        id: `review-${review.id}`,
        book: review.book,
        bookId: review.book.id,
        date: review.created_at,
        timestamp: new Date(review.created_at).getTime(),
        title: 'Wrote a review',
        meta: [rating, formatDate(review.created_at)].filter(Boolean).join(' · '),
        body: review.body,
      }
    })

    return [...shelfActivity, ...reviewActivity]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)
  }, [booksById, catalogBooksQuery.isPending, reviews, shelfBooks])

  const reviewCards = useMemo(() => reviews.slice(0, 3).map(review => toReviewCard(review, 240)), [reviews])

  const averageRating = useMemo(() => {
    const ratings = shelfBooks
      .map(book => book.rating)
      .filter((rating): rating is number => rating != null)

    if (ratings.length === 0) {
      return null
    }

    return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length / 2
  }, [shelfBooks])

  if (isProfileLoading) {
    return (
      <div className="pb-8">
        <h1 className="font-serif text-2xl font-medium leading-tight text-ink">Profile</h1>
        <p className="mt-2 font-sans text-sm text-sepia">Loading profile...</p>
      </div>
    )
  }

  if (error && user == null) {
    return (
      <div className="pb-8">
        <h1 className="font-serif text-2xl font-medium leading-tight text-ink">Profile not found</h1>
        <p role="alert" className="mt-2 font-sans text-sm text-sepia">{error}</p>
        <Link
          to="/users"
          className="mt-4 inline-block font-sans text-sm text-link transition-colors hover:text-highlight"
        >
          Browse users
        </Link>
      </div>
    )
  }

  if (user == null) {
    return null
  }

  const joined = new Date(user.created_at).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="pb-8">
      <section className="mb-6 border-b border-border pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-18 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface font-sans text-2xl uppercase text-highlight">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={`${user.username} avatar`}
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                user.username.slice(0, 1)
              )}
            </div>
            <div className="min-w-0">
              <p className="font-sans text-xs uppercase tracking-wide text-accent">Reader profile</p>
              <h1 className="mt-1 break-words font-serif text-3xl font-medium leading-tight text-ink sm:text-4xl">
                {user.username}
              </h1>
            </div>
          </div>

          <div className="break-words font-sans text-xs text-sepia sm:text-right">
            <p>Joined {joined}</p>
            <Link to="/users" className="text-link transition-colors hover:text-highlight">
              Browse users
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <section>
          <div className="mb-4 flex items-center justify-between border-b border-border pb-2">
            <h2 className="font-sans text-xs uppercase tracking-wide text-accent">Recent Activity</h2>
          </div>

          {isActivityLoading ? (
            <ActivityListSkeleton />
          ) : error ? (
            <p role="alert" className="font-serif text-sm italic text-sepia">{error}</p>
          ) : recentActivity.length === 0 ? (
            <div className="rounded-xs border border-border bg-surface px-4 py-5">
              <p className="font-serif text-sm italic text-sepia">
                No public shelf updates or reviews yet.
              </p>
            </div>
          ) : (
            <div>
              {recentActivity.map(activity => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          )}

          {reviewCards.length > 0 && (
            <section className="mt-8">
              <div className="mb-4 border-b border-border pb-2">
                <h2 className="font-sans text-xs uppercase tracking-wide text-accent">Recent Reviews</h2>
              </div>
              <div className="grid gap-5">
                {reviewCards.map(review => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            </section>
          )}
        </section>

        <aside className="lg:border-l lg:border-border lg:pl-6">
          <h2 className="border-b border-border pb-2 font-sans text-xs uppercase tracking-wide text-accent">
            Reading Stats
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-1">
            {isStatsLoading ? (
              <StatsSkeleton />
            ) : (
              <>
                <ProfileStatBlock label="Books" value={shelfBooks.length} />
                <ProfileStatBlock label="Reviews" value={reviews.length} />
                <ProfileStatBlock label="Reading" value={getStatusCount(shelfBooks, 'reading')} />
                <ProfileStatBlock label="Read" value={getStatusCount(shelfBooks, 'read')} />
                <ProfileStatBlock label="Want to read" value={getStatusCount(shelfBooks, 'want_to_read')} />
                <ProfileStatBlock
                  label="Average rating"
                  value={averageRating == null ? 'New' : averageRating.toFixed(1)}
                />
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
