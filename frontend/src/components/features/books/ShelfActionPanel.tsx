import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { queryKeys } from '../../../api/queryKeys'
import { listReviews } from '../../../api/reviews'
import { createMyBook, deleteMyBook, updateMyBook, type ReadingStatus, type UserBook } from '../../../api/userBooks'
import useAuth from '../../../auth/useAuth'
import StarRatingInput from '../../ui/StarRatingInput'
import { formatRating } from './rating'

const READING_STATUS_OPTIONS: Array<{ value: ReadingStatus; label: string }> = [
  { value: 'want_to_read', label: 'Want to read' },
  { value: 'reading', label: 'Currently reading' },
  { value: 'read', label: 'Finished' },
  { value: 'dnf', label: 'Did not finish' },
]

export default function ShelfActionPanel({
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
  const [currentShelfBook, setCurrentShelfBook] = useState<UserBook | null>(userBook)
  const [status, setStatus] = useState<ReadingStatus | ''>(userBook?.status ?? '')
  const [rating, setRating] = useState<number | null>(userBook?.rating ?? null)
  const [shelfError, setShelfError] = useState<string | null>(null)
  const [isConfirmingUnshelve, setIsConfirmingUnshelve] = useState(false)

  const reviewsQuery = useQuery({
    enabled: currentShelfBook !== null,
    queryKey: queryKeys.reviews.list(bookId),
    queryFn: () => listReviews(bookId),
  })
  const hasReviewActivity =
    reviewsQuery.data?.some(review => review.user_book_id === currentShelfBook?.id) ?? false

  const saveShelfMutation = useMutation({
    mutationFn: async ({
      payload,
      targetUserBook,
    }: {
      payload: { rating: number | null; status: ReadingStatus }
      targetUserBook: UserBook | null
    }) =>
      targetUserBook
        ? updateMyBook(accessToken!, targetUserBook.id, payload)
        : createMyBook(accessToken!, { ...payload, book_id: bookId }),
    onSuccess: savedBook => {
      setCurrentShelfBook(savedBook)
      queryClient.setQueryData<UserBook[]>(queryKeys.userBooks.mine(accessToken), previousBooks => {
        const books = previousBooks ?? []
        const existingIndex = books.findIndex(book => book.id === savedBook.id)
        if (existingIndex === -1) return [...books, savedBook]
        return books.map(book => (book.id === savedBook.id ? savedBook : book))
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.books.detail(bookId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.books.lists() })
    },
  })

  const unshelveMutation = useMutation({
    mutationFn: (userBookId: number) => deleteMyBook(accessToken!, userBookId),
    onSuccess: (_result, userBookId) => {
      setCurrentShelfBook(null)
      setStatus('')
      setRating(null)
      setIsConfirmingUnshelve(false)
      queryClient.setQueryData<UserBook[]>(queryKeys.userBooks.mine(accessToken), previousBooks =>
        previousBooks?.filter(book => book.id !== userBookId) ?? [],
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.books.detail(bookId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.books.lists() })
    },
  })

  const isSavingShelf = saveShelfMutation.isPending
  const isUnshelving = unshelveMutation.isPending
  const isBusy = isLoadingShelf || (isSavingShelf && currentShelfBook === null)
  const isCheckingActivity = currentShelfBook !== null && reviewsQuery.isPending

  async function saveShelf(nextStatus: ReadingStatus, nextRating = rating) {
    if (!accessToken) return

    const previousShelfBook = currentShelfBook
    const previousStatus = status
    const previousRating = rating

    setStatus(nextStatus)
    setRating(nextRating)
    setShelfError(null)
    setIsConfirmingUnshelve(false)

    if (previousShelfBook) {
      const optimisticBook = { ...previousShelfBook, rating: nextRating, status: nextStatus }
      setCurrentShelfBook(optimisticBook)
      queryClient.setQueryData<UserBook[]>(queryKeys.userBooks.mine(accessToken), previousBooks =>
        previousBooks?.map(book => (book.id === optimisticBook.id ? optimisticBook : book)) ?? [optimisticBook],
      )
    }

    try {
      const savedBook = await saveShelfMutation.mutateAsync({
        payload: { rating: nextRating, status: nextStatus },
        targetUserBook: currentShelfBook,
      })
      setStatus(savedBook.status ?? nextStatus)
      setRating(savedBook.rating ?? null)
    } catch (err) {
      setCurrentShelfBook(previousShelfBook)
      setStatus(previousStatus)
      setRating(previousRating)
      if (previousShelfBook) {
        queryClient.setQueryData<UserBook[]>(queryKeys.userBooks.mine(accessToken), previousBooks =>
          previousBooks?.map(book =>
            book.id === previousShelfBook.id ? previousShelfBook : book,
          ) ?? [previousShelfBook],
        )
      }
      setShelfError(err instanceof Error ? err.message : 'Unable to update your shelf.')
    }
  }

  function handleUnshelveClick() {
    if (!accessToken || !currentShelfBook) return
    setShelfError(null)

    if (isCheckingActivity) return

    if (hasReviewActivity) {
      setShelfError("This book has activity attached to it!")
      return
    }

    setIsConfirmingUnshelve(true)
  }

  async function handleUnshelveConfirm() {
    if (!accessToken || !currentShelfBook) return
    try {
      await unshelveMutation.mutateAsync(currentShelfBook.id)
    } catch (err) {
      setIsConfirmingUnshelve(false)
      setShelfError(err instanceof Error ? err.message : 'Unable to remove this book.')
    }
  }

  // ─── Unauthenticated ─────────────────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <aside className="rounded-xs border border-border bg-surface p-5 self-start w-full lg:w-52 lg:shrink-0">
        <SectionLabel>Your Shelf</SectionLabel>
        <p className="font-serif italic text-sm text-sepia leading-relaxed mb-4">
          Sign in to track, rate, and review this book.
        </p>
        <Link
          to="/login"
          className="block w-full rounded-xs border border-accent bg-accent px-3 py-2.5 text-center font-sans text-xs font-semibold uppercase tracking-widest text-bg hover:border-highlight hover:bg-highlight transition-colors duration-150"
        >
          Log in
        </Link>
      </aside>
    )
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (isLoadingShelf) {
    return (
      <aside className="rounded-xs border border-border bg-surface p-5 self-start w-full lg:w-52 lg:shrink-0">
        <SectionLabel>Your Shelf</SectionLabel>
        <div className="flex items-center gap-2 text-sepia">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
          <span className="font-serif italic text-sm">Loading…</span>
        </div>
      </aside>
    )
  }

  // ─── Main ────────────────────────────────────────────────────────────────────

  return (
    <aside className="rounded-xs border border-border bg-surface self-start w-full lg:w-52 lg:shrink-0 overflow-hidden">
      <div className="px-5 pt-5 pb-4 flex flex-col gap-4">

        {/* Status row */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <FieldLabel htmlFor="reading-status">Status</FieldLabel>
            {currentShelfBook && (
              <button
                type="button"
                onClick={handleUnshelveClick}
                disabled={isBusy || isSavingShelf || isUnshelving || isCheckingActivity}
                title="Remove from shelf"
                aria-label="Remove from shelf"
                className="text-sepia hover:text-link disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 -mt-0.5"
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
            )}
          </div>

          <select
            id="reading-status"
            value={status}
            disabled={isBusy}
            onChange={event => {
              const nextStatus = event.currentTarget.value as ReadingStatus | ''
              if (!nextStatus) return
              void saveShelf(nextStatus, rating)
            }}
            className="w-full rounded-xs border border-border bg-bg px-2.5 py-2 font-sans text-xs uppercase tracking-wide text-link disabled:cursor-not-allowed disabled:opacity-40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors duration-150"
          >
            {!currentShelfBook && <option value="">Add to shelf…</option>}
            {READING_STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Inline unshelve confirmation */}
          {isConfirmingUnshelve && (
            <div className="mt-2 flex items-center gap-2">
              {/* <p className="font-sans text-xs text-sepia leading-4 flex-1">Remove from shelf?</p> */}
              <button
                type="button"
                onClick={handleUnshelveConfirm}
                disabled={isUnshelving}
                className="font-sans text-xs text-link hover:text-highlight underline underline-offset-2 decoration-border disabled:opacity-40 transition-colors duration-150"
              >
                {isUnshelving ? 'Removing…' : 'Remove from my list'}
              </button>
              <span className="text-border text-xs select-none">·</span>
              <button
                type="button"
                onClick={() => setIsConfirmingUnshelve(false)}
                disabled={isUnshelving}
                className="font-sans text-xs text-sepia hover:text-link underline underline-offset-2 decoration-border disabled:opacity-40 transition-colors duration-150"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Error */}
          {shelfError && (
            <p role="alert" className="mt-2 font-sans text-xs text-link leading-4">
              {shelfError}
            </p>
          )}
        </div>

        {/* Rating */}
        <div>
          <FieldLabel>Rating</FieldLabel>
          <div className="mt-1.5">
            <StarRatingInput
              disabled={isBusy}
              rating={rating}
              onRate={nextRating => {
                void saveShelf('read', nextRating)
              }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <p className="font-sans text-xs text-sepia tabular-nums">{formatRating(rating)}</p>
            {rating != null && (
              <button
                type="button"
                onClick={() => { if (status) void saveShelf(status, null) }}
                disabled={isBusy}
                className="font-sans text-xs text-sepia hover:text-link underline underline-offset-2 decoration-border disabled:cursor-not-allowed disabled:opacity-40 transition-colors duration-150"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

    </aside>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-accent mb-4">
      {children}
    </h2>
  )
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block font-sans text-xs uppercase tracking-wide text-sepia"
    >
      {children}
    </label>
  )
}
