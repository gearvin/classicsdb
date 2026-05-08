/* eslint-disable react-refresh/only-export-components */
import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { listBooks, type BookSummary } from '../api/books'
import { queryKeys } from '../api/queryKeys'
import { listReviews } from '../api/reviews'
import { listMyBooks, type UserBook } from '../api/userBooks'
import useAuth from '../auth/useAuth'
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

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

const EMPTY_CATALOG_BOOKS: BookSummary[] = []
const EMPTY_PROFILE_REVIEWS: Awaited<ReturnType<typeof listReviews>> = []
const EMPTY_USER_BOOKS: UserBook[] = []

function ProfilePage() {
  const { accessToken, currentUser, isAuthenticated, isLoadingUser } = useAuth()
  const activeUserId = currentUser?.id ?? null
  const canLoadProfile = isAuthenticated && accessToken !== null && activeUserId !== null

  const shelfBooksQuery = useQuery({
    enabled: canLoadProfile,
    queryKey: queryKeys.userBooks.mine(accessToken),
    queryFn: () => listMyBooks(accessToken!),
  })
  const reviewsQuery = useQuery({
    enabled: canLoadProfile,
    queryKey: queryKeys.reviews.list({ userId: activeUserId ?? undefined, limit: 50 }),
    queryFn: () => listReviews({ userId: activeUserId!, limit: 50 }),
  })
  const catalogBooksQuery = useQuery({
    enabled: canLoadProfile,
    queryKey: queryKeys.books.list(),
    queryFn: () => listBooks(),
    select: data => data.items,
  })

  const profileShelfBooks = shelfBooksQuery.data ?? EMPTY_USER_BOOKS
  const profileReviews = reviewsQuery.data ?? EMPTY_PROFILE_REVIEWS
  const catalogBooks = catalogBooksQuery.data ?? EMPTY_CATALOG_BOOKS

  const activityQueryError = shelfBooksQuery.error ?? reviewsQuery.error ?? catalogBooksQuery.error
  const activityError = activityQueryError instanceof Error
    ? activityQueryError.message
    : activityQueryError
    ? 'Unable to load recent activity.'
    : null

  const isStatsLoading = canLoadProfile && (
    shelfBooksQuery.isPending ||
    reviewsQuery.isPending
  )
  const isActivityLoading = isStatsLoading || (
    catalogBooksQuery.isPending &&
    profileShelfBooks.length > 0 &&
    profileReviews.length === 0
  )

  const booksById = useMemo(
    () => new Map(catalogBooks.map(book => [book.id, book])),
    [catalogBooks],
  )

  const userBooksById = useMemo(
    () => new Map(profileShelfBooks.map(userBook => [userBook.id, userBook])),
    [profileShelfBooks],
  )

  const recentActivity = useMemo<ActivityEntry[]>(() => {
    const shelfActivity = catalogBooksQuery.isPending
      ? []
      : profileShelfBooks.map(userBook => {
        const book = booksById.get(userBook.book_id)
        return {
          id: `shelf-${userBook.id}`,
          type: 'shelf' as const,
          book,
          bookId: userBook.book_id,
          date: userBook.updated_at,
          timestamp: new Date(userBook.updated_at).getTime(),
          title: getShelfActivityTitle(userBook.status, userBook.rating),
          meta: [formatStatus(userBook.status), formatShelfRating(userBook.rating)].filter(Boolean).join(' · '),
        }
      })

    const reviewActivity = profileReviews.map(review => {
      const userBook = userBooksById.get(review.user_book_id)
      const book = userBook ? booksById.get(userBook.book_id) : undefined
      return {
        id: `review-${review.id}`,
        type: 'review' as const,
        book,
        bookId: userBook?.book_id,
        date: review.created_at,
        timestamp: new Date(review.created_at).getTime(),
        title: 'Wrote a review',
        meta: [formatShelfRating(review.rating), formatDate(review.created_at)].filter(Boolean).join(' · '),
        body: review.body,
      }
    })

    return [...shelfActivity, ...reviewActivity]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)
  }, [booksById, catalogBooksQuery.isPending, profileReviews, profileShelfBooks, userBooksById])

  const averageRating = useMemo(() => {
    const ratings = profileShelfBooks
      .map(book => book.rating)
      .filter((r): r is number => r != null)
    if (ratings.length === 0) return null
    return ratings.reduce((sum, r) => sum + r, 0) / ratings.length / 2
  }, [profileShelfBooks])

  if (isLoadingUser) {
    return (
      <div className="pb-8">
        <h1 className="font-serif text-2xl font-medium text-ink leading-tight">Profile</h1>
        <p className="font-sans text-sm text-sepia mt-2">Loading account...</p>
      </div>
    )
  }

  if (!isAuthenticated || currentUser === null) {
    return (
      <div className="pb-8">
        <h1 className="font-serif text-2xl font-medium text-ink leading-tight">Profile</h1>
        <p className="font-sans text-sm text-sepia mt-2 mb-4">Log in to view your profile.</p>
        <Link to="/login" className="font-sans text-sm text-link hover:text-highlight transition-colors">
          Log in
        </Link>
      </div>
    )
  }

  const joined = new Date(currentUser.created_at).toLocaleDateString(undefined, {
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
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={`${currentUser.username} avatar`}
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                currentUser.username.slice(0, 1)
              )}
            </div>
            <div className="min-w-0">
              <p className="font-sans text-xs uppercase tracking-wide text-accent">Your profile</p>
              <h1 className="break-words font-serif text-3xl font-medium leading-tight text-ink sm:text-4xl">
                {currentUser.username}
              </h1>
            </div>
          </div>

          <div className="break-words font-sans text-xs leading-relaxed text-sepia sm:text-right">
            <p>Joined {joined}</p>
            <p>{currentUser.email}</p>
            <Link
              to="/profile/edit"
              className="mt-1 inline-block text-link transition-colors hover:text-highlight"
            >
              Edit profile
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <section>
          <div className="mb-4 flex items-center justify-between border-b border-border pb-2">
            <h2 className="font-sans text-xs uppercase tracking-wide text-accent">Recent Activity</h2>
            <Link
              to="/my-books"
              className="font-sans text-xs uppercase tracking-wide text-link hover:text-highlight transition-colors"
            >
              Shelf
            </Link>
          </div>

          {isActivityLoading ? (
            <ActivityListSkeleton />
          ) : activityError ? (
            <p role="alert" className="font-serif text-sm italic text-sepia">{activityError}</p>
          ) : recentActivity.length === 0 ? (
            <div className="rounded-xs border border-border bg-surface px-4 py-5">
              <p className="font-serif text-sm italic text-sepia">
                Recent shelf updates and reviews will appear here.
              </p>
              <Link
                to="/browse"
                className="mt-3 inline-block font-sans text-xs uppercase tracking-wide text-link hover:text-highlight transition-colors"
              >
                Browse books
              </Link>
            </div>
          ) : (
            <div>
              {recentActivity.map(activity => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </section>

        <aside className="lg:border-l lg:border-border lg:pl-6">
          <h2 className="border-b border-border pb-2 font-sans text-xs uppercase tracking-wide text-accent">
            Reading Stats
          </h2>

          <div className="mt-2 grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-1">
            {isStatsLoading ? (
              <StatsSkeleton />
            ) : (
              <>
                <ProfileStatBlock label="Books" value={profileShelfBooks.length} />
                <ProfileStatBlock label="Reviews" value={profileReviews.length} />
                <ProfileStatBlock label="Reading" value={getStatusCount(profileShelfBooks, 'reading')} />
                <ProfileStatBlock label="Read" value={getStatusCount(profileShelfBooks, 'read')} />
                <ProfileStatBlock label="Want to read" value={getStatusCount(profileShelfBooks, 'want_to_read')} />
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
