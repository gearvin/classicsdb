/* eslint-disable react-refresh/only-export-components */
import { Link, createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { listBooks, type BookSummary } from '../api/books'
import { queryKeys } from '../api/queryKeys'
import { listReviews } from '../api/reviews'
import { deleteMyBook, listMyBooks, updateMyBook, type ReadingStatus, type UserBook } from '../api/userBooks'
import useAuth from '../auth/useAuth'
import { formatAuthors } from '../components/features/reviews/reviewDisplay'
import { formatRating, toStarRating } from '../components/features/books/rating'
import { Skeleton, SkeletonCover } from '../components/ui/Skeleton'
import StarRating from '../components/ui/StarRating'
import StarRatingInput from '../components/ui/StarRatingInput'

export const Route = createFileRoute('/my-books')({
  component: MyBooksPage,
})

const STATUS_OPTIONS: Array<{ value: ReadingStatus; label: string }> = [
  { value: 'want_to_read', label: 'Want to read' },
  { value: 'reading', label: 'Currently reading' },
  { value: 'read', label: 'Finished' },
  { value: 'dnf', label: 'Did not finish' },
]
const FILTERS: Array<{ value: ReadingStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  ...STATUS_OPTIONS,
]
const EMPTY_SHELF: UserBook[] = []
const EMPTY_BOOKS: BookSummary[] = []
const SHELF_ROW_SKELETONS = Array.from({ length: 4 }, (_, index) => index)

function formatStatus(status?: ReadingStatus | null) {
  return STATUS_OPTIONS.find(option => option.value === status)?.label ?? 'On shelf'
}

function formatShelfDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function ShelfBookRow({
  book,
  hasReviewActivity,
  isCheckingActivity,
  userBook,
}: {
  book?: BookSummary
  hasReviewActivity: boolean
  isCheckingActivity: boolean
  userBook: UserBook
}) {
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [isConfirmingUnshelve, setIsConfirmingUnshelve] = useState(false)
  const updateShelfMutation = useMutation({
    mutationFn: (payload: { rating?: number | null; status?: ReadingStatus | null }) => (
      updateMyBook(accessToken!, userBook.id, payload)
    ),
    onSuccess: savedBook => {
      queryClient.setQueryData<UserBook[]>(queryKeys.userBooks.mine(accessToken), previousBooks => (
        previousBooks?.map(item => item.id === savedBook.id ? savedBook : item) ?? [savedBook]
      ))
      queryClient.invalidateQueries({ queryKey: queryKeys.books.detail(savedBook.book_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.books.lists() })
    },
  })
  const unshelveMutation = useMutation({
    mutationFn: () => deleteMyBook(accessToken!, userBook.id),
    onSuccess: () => {
      setIsConfirmingUnshelve(false)
      queryClient.setQueryData<UserBook[]>(queryKeys.userBooks.mine(accessToken), previousBooks => (
        previousBooks?.filter(item => item.id !== userBook.id) ?? []
      ))
      queryClient.invalidateQueries({ queryKey: queryKeys.books.detail(userBook.book_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.books.lists() })
    },
  })
  const starRating = toStarRating(userBook.rating)
  const isSaving = updateShelfMutation.isPending
  const isUnshelving = unshelveMutation.isPending
  const isBusy = isSaving || isUnshelving

  async function updateShelf(payload: { rating?: number | null; status?: ReadingStatus | null }) {
    if (!accessToken) {
      return
    }

    setError(null)
    setIsConfirmingUnshelve(false)
    try {
      await updateShelfMutation.mutateAsync(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update this shelf item.')
    }
  }

  function handleUnshelveClick() {
    if (!accessToken || isCheckingActivity) {
      return
    }

    setError(null)

    if (hasReviewActivity) {
      setIsConfirmingUnshelve(false)
      setError('This book has activity attached to it!')
      return
    }

    setIsConfirmingUnshelve(true)
  }

  async function handleUnshelveConfirm() {
    if (!accessToken) {
      return
    }

    try {
      await unshelveMutation.mutateAsync()
    } catch (err) {
      setIsConfirmingUnshelve(false)
      setError(err instanceof Error ? err.message : 'Unable to remove this book.')
    }
  }

  return (
    <article className="grid gap-4 border-b border-border py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_220px]">
      <div className="flex min-w-0 gap-4">
        <div className="h-28 w-18 shrink-0 overflow-hidden rounded-xs border border-border bg-surface">
          {book?.cover ? (
            <img
              src={book.cover.url}
              alt={`${book.display_title} cover`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div className="min-w-0">
          {book ? (
            <Link
              to="/book/$bookId"
              params={{ bookId: String(book.id) }}
              className="break-words font-serif text-xl font-medium leading-tight text-ink transition-colors hover:text-highlight"
            >
              {book.display_title}
            </Link>
          ) : (
            <p className="font-serif text-xl font-medium leading-tight text-ink">Book #{userBook.book_id}</p>
          )}
          <p className="mt-1 font-serif text-sm italic text-sepia">
            {book ? formatAuthors(book) : 'Book details unavailable'}
          </p>
          <p className="mt-2 font-sans text-xs text-dust">
            {formatStatus(userBook.status)} · updated {formatShelfDate(userBook.updated_at)}
          </p>
          {starRating != null && (
            <div className="mt-2 flex items-center gap-2">
              <StarRating rating={starRating} size={14} />
              <span className="font-sans text-xs text-sepia">{formatRating(userBook.rating ?? null)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor={`reading-status-${userBook.id}`}
              className="block font-sans text-xs uppercase tracking-wide text-sepia"
            >
              Status
            </label>
            <button
              type="button"
              onClick={handleUnshelveClick}
              disabled={isBusy || isCheckingActivity}
              title="Remove from shelf"
              aria-label="Remove from shelf"
              className="-mt-0.5 text-sepia transition-colors duration-150 hover:text-link disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          </div>
          <select
            id={`reading-status-${userBook.id}`}
            value={userBook.status ?? ''}
            disabled={isBusy}
            onChange={event => void updateShelf({ status: event.currentTarget.value as ReadingStatus })}
            className="w-full rounded-xs border border-border bg-bg px-2.5 py-2 font-sans text-xs uppercase tracking-wide text-link transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {isConfirmingUnshelve && (
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                disabled={isUnshelving}
                onClick={handleUnshelveConfirm}
                className="font-sans text-xs text-link underline underline-offset-2 decoration-border transition-colors duration-150 hover:text-highlight disabled:opacity-40"
              >
                {isUnshelving ? 'Removing…' : 'Remove from my list'}
              </button>
              <span className="select-none text-xs text-border">·</span>
              <button
                type="button"
                disabled={isUnshelving}
                onClick={() => setIsConfirmingUnshelve(false)}
                className="font-sans text-xs text-sepia underline underline-offset-2 decoration-border transition-colors duration-150 hover:text-link disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div>
          <p className="mb-1 font-sans text-xs uppercase tracking-wide text-sepia">Rating</p>
          <StarRatingInput
            disabled={isBusy}
            rating={userBook.rating ?? null}
            onRate={rating => void updateShelf({ rating, status: 'read' })}
          />
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="font-sans text-xs text-sepia">{formatRating(userBook.rating ?? null)}</p>
            {userBook.rating != null && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void updateShelf({ rating: null })}
                className="font-sans text-xs text-sepia underline underline-offset-2 decoration-border transition-colors duration-150 hover:text-link disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        {error && <p role="alert" className="font-sans text-xs leading-4 text-link">{error}</p>}
      </div>
    </article>
  )
}

function ShelfBookRowSkeleton() {
  return (
    <article
      aria-hidden="true"
      className="grid animate-pulse gap-4 border-b border-border py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_220px]"
    >
      <div className="flex min-w-0 gap-4">
        <SkeletonCover className="h-28 w-18 shrink-0 rounded-xs" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-6 w-7/12 max-w-80" />
          <Skeleton className="mt-2 h-3 w-5/12 max-w-56 bg-border/60" />
          <Skeleton className="mt-4 h-3 w-44 bg-border/60" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-9 w-full bg-border/60" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-36 bg-border/60" />
      </div>
    </article>
  )
}

function MyBooksPage() {
  const { accessToken, currentUser, isAuthenticated, isLoadingUser } = useAuth()
  const [filter, setFilter] = useState<ReadingStatus | 'all'>('all')
  const shelfQuery = useQuery({
    enabled: isAuthenticated && accessToken !== null,
    queryKey: queryKeys.userBooks.mine(accessToken),
    queryFn: () => listMyBooks(accessToken!),
  })
  const booksQuery = useQuery({
    enabled: isAuthenticated,
    queryKey: queryKeys.books.list(),
    queryFn: () => listBooks(),
    select: data => data.items,
  })
  const reviewsQuery = useQuery({
    enabled: isAuthenticated && currentUser !== null,
    queryKey: queryKeys.reviews.list({ userId: currentUser?.id, limit: 500 }),
    queryFn: () => listReviews({ userId: currentUser!.id, limit: 500 }),
  })
  const shelfBooks = shelfQuery.data ?? EMPTY_SHELF
  const catalogBooks = booksQuery.data ?? EMPTY_BOOKS
  const booksById = useMemo(() => new Map(catalogBooks.map(book => [book.id, book])), [catalogBooks])
  const reviewedUserBookIds = useMemo(() => (
    new Set((reviewsQuery.data ?? []).map(review => review.user_book_id))
  ), [reviewsQuery.data])
  const visibleShelf = useMemo(() => (
    filter === 'all' ? shelfBooks : shelfBooks.filter(book => book.status === filter)
  ), [filter, shelfBooks])
  const error = shelfQuery.error instanceof Error
    ? shelfQuery.error.message
    : booksQuery.error instanceof Error
    ? booksQuery.error.message
    : shelfQuery.error || booksQuery.error
    ? 'Unable to load your books.'
    : null

  if (isLoadingUser) {
    return (
      <div className="pb-8">
        <h1 className="font-serif text-2xl font-medium text-ink leading-tight">My Books</h1>
        <p className="font-serif italic text-sepia text-sm mt-4">Loading your books...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="pb-8">
        <h1 className="font-serif text-2xl font-medium text-ink leading-tight">My Books</h1>
        <p className="font-sans text-sm text-sepia mt-2 mb-4">
          Log in to view your shelf.
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
        <h1 className="font-serif text-2xl font-medium text-ink leading-tight">My Books</h1>
        <p className="font-sans text-sm text-sepia mt-2">
          {shelfBooks.length.toLocaleString()} saved {shelfBooks.length === 1 ? 'book' : 'books'}
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={[
              'rounded-xs border px-3 py-1.5 font-sans text-xs uppercase tracking-wide transition-colors',
              filter === option.value
                ? 'border-accent bg-accent text-bg'
                : 'border-border text-link hover:border-accent hover:text-highlight',
            ].join(' ')}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xs border border-border bg-surface px-4 py-3 font-serif italic text-sm text-sepia">
          {error}
        </p>
      )}

      {shelfQuery.isPending || booksQuery.isPending ? (
        <div aria-busy="true">
          {SHELF_ROW_SKELETONS.map(index => (
            <ShelfBookRowSkeleton key={index} />
          ))}
        </div>
      ) : visibleShelf.length === 0 ? (
        <div className="rounded-xs border border-border bg-surface px-4 py-5">
          <p className="font-serif italic text-sm text-sepia">
            {shelfBooks.length === 0 ? 'Your saved books will appear here.' : 'No books match this filter.'}
          </p>
          {shelfBooks.length === 0 && (
            <Link
              to="/browse"
              className="mt-3 inline-block font-sans text-xs uppercase tracking-wide text-link hover:text-highlight transition-colors"
            >
              Browse books
            </Link>
          )}
        </div>
      ) : (
        <div>
          {visibleShelf.map(userBook => (
            <ShelfBookRow
              key={userBook.id}
              book={booksById.get(userBook.book_id)}
              hasReviewActivity={reviewedUserBookIds.has(userBook.id)}
              isCheckingActivity={reviewsQuery.isPending}
              userBook={userBook}
            />
          ))}
        </div>
      )}
    </div>
  )
}
