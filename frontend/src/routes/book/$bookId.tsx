/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getBook, type BookDetail, type BookTitle } from '../../api/books'
import { queryKeys } from '../../api/queryKeys'
import { listBookTags, type BookTagAggregate } from '../../api/tags'
import { listMyBooks } from '../../api/userBooks'
import useAuth from '../../auth/useAuth'
import BookAuthorLinks from '../../components/features/books/BookAuthorLinks'
import BookReviews from '../../components/features/books/BookReviews'
import ShelfActionPanel from '../../components/features/books/ShelfActionPanel'
import { formatPublicationYear, formatWorkType } from '../../components/features/books/display'
import { toStarRating } from '../../components/features/books/rating'
import MetaItem from '../../components/ui/MetaItem'
import { Skeleton, SkeletonCover, SkeletonText } from '../../components/ui/Skeleton'
import StarRating from '../../components/ui/StarRating'

export const Route = createFileRoute('/book/$bookId')({
  component: BookPage,
})

function getOriginalTitle(book: BookDetail) {
  const originalTitle = book.titles.find(title => title.title_type === 'original')
  if (!originalTitle || originalTitle.title === book.display_title) {
    return null
  }
  return originalTitle.title
}

function getAlternativeTitles(book: BookDetail) {
  const originalTitle = getOriginalTitle(book)
  const seenTitles = new Set(
    [book.display_title, originalTitle]
      .filter((title): title is string => title !== null)
      .map(title => title.trim().toLocaleLowerCase()),
  )

  return book.titles
    .filter(title => !title.is_primary && title.title_type !== 'original')
    .sort((first, second) => first.position - second.position)
    .filter(title => {
      const titleKey = title.title.trim().toLocaleLowerCase()
      if (!titleKey || seenTitles.has(titleKey)) return false
      seenTitles.add(titleKey)
      return true
    })
}

function formatTitleMeta(title: BookTitle) {
  return [title.language.name, title.title_type]
    .filter(Boolean)
    .join(' · ')
}

function getOriginalLanguage(book: BookDetail) {
  return (
    book.languages.find(language => language.role === 'original')?.language.name ??
    book.languages[0]?.language.name ??
    null
  )
}

function getIsbn(book: BookDetail) {
  const edition = book.editions.find(item => item.isbn_13 || item.isbn_10)
  if (!edition) return null
  return edition.isbn_13 ?? edition.isbn_10 ?? null
}

// ─── Loading / Error ──────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="animate-pulse pb-8" aria-busy="true">
      <section className="pb-6">
        <div className="mb-6 border-b border-border pb-3">
          <Skeleton className="h-9 w-8/12 max-w-2xl sm:h-10" />
          <Skeleton className="mt-3 h-4 w-5/12 max-w-md bg-border/60" />
        </div>
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <SkeletonCover className="w-full max-w-52 shrink-0 self-center lg:self-start" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-5 w-56" />
            <div className="mt-6 max-w-xl space-y-3">
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="flex items-baseline gap-4">
                  <Skeleton className="h-3 w-32 shrink-0" />
                  <Skeleton className="h-3 w-7/12 bg-border/60" />
                </div>
              ))}
            </div>
            <Skeleton className="mt-7 h-3 w-24" />
            <SkeletonText className="mt-4 max-w-3xl" lines={4} />
          </div>
          <div className="w-full shrink-0 rounded-xs border border-border p-4 lg:w-60">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-9 w-full bg-border/60" />
            <Skeleton className="mt-3 h-9 w-full bg-border/60" />
          </div>
        </div>
      </section>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="pb-8">
      <p className="font-serif italic text-sepia mb-3">{message}</p>
      <Link
        to="/browse"
        className="font-sans text-xs uppercase tracking-wide text-link hover:text-highlight underline underline-offset-2 decoration-accent"
      >
        Back to browse
      </Link>
    </div>
  )
}

// ─── Book Action Menu ────────────────────────────────────────────────────────

function BookActionMenu({
  bookId,
  currentUser,
}: {
  bookId: number
  currentUser: ReturnType<typeof useAuth>['currentUser']
}) {
  return (
    <nav
      aria-label="Book actions"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 font-sans text-xs uppercase tracking-wide text-sepia sm:justify-end"
    >
      {currentUser ? (
        <Link
          to="/book/$bookId/edit"
          params={{ bookId: String(bookId) }}
          className="text-link hover:text-highlight transition-colors"
        >
          {currentUser.is_admin ? 'Edit Entry' : 'Suggest Edit'}
        </Link>
      ) : (
        <Link
          to="/login"
          className="text-link hover:text-highlight transition-colors"
        >
          Suggest Edit
        </Link>
      )}
      <Link
        to="/book/$bookId/covers"
        params={{ bookId: String(bookId) }}
        className="text-sepia hover:text-highlight transition-colors"
      >
        Covers
      </Link>
      <Link
        to="/book/$bookId/editions"
        params={{ bookId: String(bookId) }}
        className="text-sepia hover:text-highlight transition-colors"
      >
        Editions
      </Link>
      <Link
        to="/book/$bookId/tags"
        params={{ bookId: String(bookId) }}
        className="text-sepia hover:text-highlight transition-colors"
      >
        Tags
      </Link>
      <Link
        to="/book/$bookId/history"
        params={{ bookId: String(bookId) }}
        className="text-sepia hover:text-highlight transition-colors"
      >
        History
      </Link>
    </nav>
  )
}

// ─── Book Cover ───────────────────────────────────────────────────────────────

function BookCover({ book }: { book: BookDetail }) {
  return (
    <div id="covers" className="w-full max-w-52 shrink-0 scroll-mt-6 self-center lg:self-start">
      <div className="aspect-2/3 rounded-xs border border-border bg-surface overflow-hidden flex items-center justify-center text-highlight text-xs font-sans tracking-wide uppercase">
        {book.cover ? (
          <img
            src={book.cover.url}
            alt={`${book.display_title} cover`}
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-dust">No cover</span>
        )}
      </div>
      <p className="font-sans text-xs text-dust mt-2">Book ID: {book.id}</p>
    </div>
  )
}

// ─── Titles Meta Item ─────────────────────────────────────────────────────────

const ALT_TITLE_PREVIEW = 1

function TitlesMetaItem({
  alternativeTitles,
  originalTitle,
}: {
  alternativeTitles: BookTitle[]
  originalTitle: string | null
}) {
  const [expanded, setExpanded] = useState(false)

  if (!originalTitle && alternativeTitles.length === 0) return null

  const visible = expanded ? alternativeTitles : alternativeTitles.slice(0, ALT_TITLE_PREVIEW)
  const hiddenCount = alternativeTitles.length - ALT_TITLE_PREVIEW

  return (
    <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
      <p className="flex w-full max-w-42 shrink-0 items-baseline gap-2">
        <span className="font-sans text-xs text-accent uppercase tracking-wide">Titles</span>
        <span className="flex-1 border-b border-dotted border-highlight" aria-hidden />
      </p>
      <div className="min-w-0 space-y-0.5 wrap-break-word">
        {originalTitle && (
          <p className="wrap-break-word text-ink">
            {originalTitle}{' '}
            <span className="text-sepia text-xs">(original)</span>
          </p>
        )}
        {visible.map(title => (
          <p key={title.id} className="wrap-break-word text-ink">
            {title.title}
            {formatTitleMeta(title) && (
              <span className="text-sepia text-xs"> ({formatTitleMeta(title)})</span>
            )}
          </p>
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(current => !current)}
            aria-expanded={expanded}
            className="font-sans text-xs text-link hover:text-highlight transition-colors mt-0.5"
          >
            {expanded ? 'Show less' : `+${hiddenCount} more`}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Book Metadata ────────────────────────────────────────────────────────────

function BookMetadata({ book }: { book: BookDetail }) {
  const isbn = getIsbn(book)
  const originalLanguage = getOriginalLanguage(book)
  const originalTitle = getOriginalTitle(book)
  const alternativeTitles = getAlternativeTitles(book)
  const averageStarRating = toStarRating(book.average_rating)

  return (
    <div className="min-w-0 flex-1">
      {/* Rating */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {averageStarRating == null ? (
          <p className="font-sans text-sm text-sepia">No ratings yet</p>
        ) : (
          <>
            <StarRating rating={averageStarRating} size={20} />
            <p className="font-sans text-sm text-sepia">
              {averageStarRating.toFixed(1)} average from{' '}
              {book.rating_count.toLocaleString()} ratings
            </p>
          </>
        )}
      </div>

      {/* Metadata fields */}
      <div className="flex flex-col gap-1 mt-5 max-w-xl text-sm">
        <TitlesMetaItem originalTitle={originalTitle} alternativeTitles={alternativeTitles} />
        {originalLanguage && <MetaItem label="Original Language" value={originalLanguage} />}
        <MetaItem label="Work Type" value={formatWorkType(book.work_type)} />
        <MetaItem label="First Published" value={formatPublicationYear(book.first_published_year)} />
        {isbn && <MetaItem label="ISBN" value={isbn} />}
      </div>

      {/* Synopsis */}
      <section className="mt-5">
        <h2 className="font-sans text-xs uppercase tracking-wide text-accent mb-2">Synopsis</h2>
        <p className="max-w-4xl whitespace-pre-wrap wrap-break-word text-ink leading-6">
          {book.description.trim() || 'No synopsis has been added yet.'}
        </p>
      </section>
    </div>
  )
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

function formatTagPath(tag: BookTagAggregate) {
  return [...tag.ancestors.map(ancestor => ancestor.name), tag.tag.name].join(' > ')
}

function getSpoilerLabel(level: number) {
  if (level === 1) return 'Minor spoiler'
  if (level === 2) return 'Major spoiler'
  return 'Spoiler'
}

function BookTagPill({ tag }: { tag: BookTagAggregate }) {
  const isSpoiler = tag.aggregate_spoiler_level > 0
  const tagPath = formatTagPath(tag)

  return (
    <Link
      to="/tags/$tagId"
      params={{ tagId: String(tag.tag.id) }}
      title={tagPath}
      aria-label={`${tagPath}${isSpoiler ? ` · ${getSpoilerLabel(tag.aggregate_spoiler_level)}` : ''}`}
      className={[
        'group inline-flex max-w-full items-center gap-0 rounded-xs border font-sans text-sm leading-none transition-colors',
        isSpoiler
          ? 'border-amber-400 text-amber-950 hover:border-amber-600'
          : 'border-border text-ink hover:border-accent',
      ].join(' ')}
    >
      <span className="truncate px-3 py-1.5">
        {tag.tag.name}
      </span>
      <span
        className={[
          'shrink-0 border-l py-1.5 pl-2.5 pr-3 text-[11px] tabular-nums',
          isSpoiler
            ? 'border-amber-300 text-amber-700'
            : 'border-border text-sepia group-hover:text-link',
        ].join(' ')}
      >
        {tag.score.toFixed(1)}
      </span>
    </Link>
  )
}

function BookTags({
  accessToken,
  bookId,
  currentUser,
  isAuthenticated,
}: {
  accessToken: string | null
  bookId: number
  isAuthenticated: boolean
  currentUser: ReturnType<typeof useAuth>['currentUser']
}) {
  const [showDownvoted, setShowDownvoted] = useState(false)
  const [showSpoilers, setShowSpoilers] = useState(false)

  const bookTagsQuery = useQuery({
    queryKey: queryKeys.tags.book(bookId, currentUser?.id, showDownvoted, showSpoilers),
    queryFn: () => listBookTags(bookId, accessToken, showDownvoted, showSpoilers),
  })
  const bookTags = bookTagsQuery.data ?? []
  const error = bookTagsQuery.error instanceof Error
    ? bookTagsQuery.error.message
    : bookTagsQuery.error
    ? 'Unable to load book tags.'
    : null

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-col gap-3 border-b border-border pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-sans text-xs uppercase tracking-wide text-accent">Tags</h2>
          {showSpoilers && (
            <span className="rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5 font-sans text-[11px] uppercase tracking-wide text-amber-950">
              Spoilers visible
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => setShowDownvoted(current => !current)}
            className={[
              'font-sans text-xs uppercase tracking-wide transition-colors hover:text-highlight',
              showDownvoted ? 'text-ink' : 'text-link',
            ].join(' ')}
          >
            {showDownvoted ? 'Hide Downvoted' : 'Show Downvoted'}
          </button>
          <button
            type="button"
            onClick={() => setShowSpoilers(current => !current)}
            className={[
              'font-sans text-xs uppercase tracking-wide transition-colors hover:text-highlight',
              showSpoilers ? 'text-amber-800' : 'text-link',
            ].join(' ')}
          >
            {showSpoilers ? 'Hide Spoilers' : 'Show Spoilers'}
          </button>
          {isAuthenticated ? (
            <Link
              to="/book/$bookId/tags"
              params={{ bookId: String(bookId) }}
              className="font-sans text-xs uppercase tracking-wide text-link transition-colors hover:text-highlight"
            >
              Edit Tags
            </Link>
          ) : (
            <Link
              to="/login"
              className="font-sans text-xs uppercase tracking-wide text-link transition-colors hover:text-highlight"
            >
              Log in to tag
            </Link>
          )}
        </div>
      </div>

      {error ? (
        <p className="font-serif italic text-sepia">{error}</p>
      ) : bookTagsQuery.isPending ? (
        <p className="font-serif italic text-sepia">Loading tags...</p>
      ) : bookTags.length === 0 ? (
        <p className="font-serif italic text-sepia">
          {showSpoilers || showDownvoted ? 'No tags yet.' : 'No visible tags yet.'}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 border-b border-border pb-4">
          {bookTags.map(tag => (
            <BookTagPill key={tag.tag.id} tag={tag} />
          ))}
        </div>
      )}
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function BookPage() {
  const { bookId } = Route.useParams()
  const { accessToken, currentUser, isAuthenticated } = useAuth()

  const bookQuery = useQuery({
    queryKey: queryKeys.books.detail(bookId),
    queryFn: () => getBook(bookId),
  })

  const book = bookQuery.data ?? null

  const shelfQuery = useQuery({
    enabled: isAuthenticated && accessToken !== null && book !== null,
    queryKey: queryKeys.userBooks.mine(accessToken),
    queryFn: () => listMyBooks(accessToken!),
    select: books => books.find(shelfBook => shelfBook.book_id === book?.id) ?? null,
  })

  const isLoadingShelf =
    isAuthenticated && accessToken !== null && book !== null && shelfQuery.isPending
  const userBook = shelfQuery.data ?? null

  const error = bookQuery.error instanceof Error
    ? bookQuery.error.message
    : bookQuery.error
    ? 'Unable to load this book.'
    : null

  if (bookQuery.isPending) return <LoadingState />
  if (error || !book) return <ErrorState message={error ?? 'Book not found.'} />

  return (
    <div className="pb-8">
      {/* Header */}
      <section className="pb-6">
        <div className="mb-6 border-b border-border pb-3">
          <div className="min-w-0">
            <h1 className="wrap-break-word font-serif text-3xl leading-tight text-ink sm:text-4xl">
              {book.display_title}
            </h1>
          </div>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
            <p className="wrap-break-word font-serif italic text-sepia">
              by <BookAuthorLinks authors={book.authors} />
            </p>
            <BookActionMenu bookId={book.id} currentUser={currentUser} />
          </div>
        </div>

        {/* Cover + metadata + shelf action */}
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <BookCover book={book} />
          <BookMetadata book={book} />
          <ShelfActionPanel
            key={`${book.id}-${userBook?.id ?? 'new'}-${userBook?.updated_at ?? 'empty'}`}
            bookId={book.id}
            isLoadingShelf={isLoadingShelf}
            userBook={userBook}
          />
        </div>
      </section>

      <BookTags
        accessToken={accessToken}
        bookId={book.id}
        currentUser={currentUser}
        isAuthenticated={isAuthenticated}
      />
      <BookReviews bookId={book.id} isLoadingShelf={isLoadingShelf} userBook={userBook} />
    </div>
  )
}
