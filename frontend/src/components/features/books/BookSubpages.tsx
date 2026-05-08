import { Link } from '@tanstack/react-router'
import type { BookCover, BookDetail, BookEdition } from '../../../api/books'
import type { EntryRevision } from '../../../api/suggestions'
import { Skeleton, SkeletonCover, SkeletonText } from '../../ui/Skeleton'
import { formatWorkType } from './display'

export function BookSubpageHeader({
  book,
  title,
}: {
  book: BookDetail
  title: string
}) {
  return (
    <header className="mb-6 border-b border-border pb-3">
      <Link
        to="/book/$bookId"
        params={{ bookId: String(book.id) }}
        className="font-sans text-xs uppercase tracking-wide text-link hover:text-highlight transition-colors"
      >
        Back to book
      </Link>
      <h1 className="mt-2 wrap-break-word font-serif text-3xl leading-tight text-ink sm:text-4xl">
        {book.display_title}
      </h1>
      <p className="mt-1 font-sans text-xs uppercase tracking-wide text-accent">{title}</p>
    </header>
  )
}

export function BookSectionError({ message }: { message: string }) {
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

export function BookSectionLoading({ label }: { label: string }) {
  return (
    <div className="animate-pulse pb-8" aria-busy="true" aria-label={`Loading ${label}`}>
      <div className="mb-6 border-b border-border pb-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-4 h-9 w-8/12 max-w-2xl" />
        <Skeleton className="mt-3 h-3 w-32 bg-border/60" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <article key={index} className="rounded-xs border border-border bg-bg p-3">
            <SkeletonCover className="rounded-xs" />
            <Skeleton className="mt-3 h-3 w-24 bg-border/60" />
          </article>
        ))}
      </div>
    </div>
  )
}

export function BookCoversList({
  book,
  covers,
}: {
  book: BookDetail
  covers: BookCover[]
}) {
  if (covers.length === 0) {
    return (
      <p className="font-serif italic text-sepia text-sm">
        No covers have been added yet.
      </p>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {covers.map(cover => (
        <article key={cover.id} className="rounded-xs border border-border bg-bg p-3">
          <div className="aspect-2/3 rounded-xs border border-border bg-surface overflow-hidden flex items-center justify-center">
            <img
              src={cover.url}
              alt={`${book.display_title} cover`}
              decoding="async"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 font-sans text-xs text-sepia">
            {cover.is_primary && (
              <span className="rounded-xs border border-accent bg-surface px-2 py-1 uppercase tracking-wide text-accent">
                Primary
              </span>
            )}
            {cover.source && <span>{cover.source}</span>}
          </div>
        </article>
      ))}
    </div>
  )
}

export function EditionsList({ editions }: { editions: BookEdition[] }) {
  if (editions.length === 0) {
    return (
      <p className="font-serif italic text-sepia text-sm">
        No editions have been added yet.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {editions.map(edition => (
        <article key={edition.id} className="rounded-xs border border-border bg-bg p-4">
          <h2 className="wrap-break-word font-serif text-lg leading-tight text-ink">
            {edition.display_title}
          </h2>
          {edition.display_subtitle && (
            <p className="mt-1 wrap-break-word font-serif italic text-sepia">
              {edition.display_subtitle}
            </p>
          )}
          <p className="mt-2 wrap-break-word font-sans text-xs text-sepia">
            {[
              edition.publisher,
              edition.publication_date,
              edition.language?.name,
              edition.page_count ? `${edition.page_count}p` : null,
            ]
              .filter(Boolean)
              .join(' · ') || formatWorkType(edition.format)}
          </p>
          {(edition.isbn_13 || edition.isbn_10 || edition.contributors.length > 0) && (
            <p className="mt-2 wrap-break-word font-sans text-xs text-dust">
              {[
                edition.isbn_13 ? `ISBN ${edition.isbn_13}` : null,
                !edition.isbn_13 && edition.isbn_10 ? `ISBN ${edition.isbn_10}` : null,
                edition.contributors.length > 0
                  ? edition.contributors
                    .map(contributor => `${contributor.name} (${contributor.role})`)
                    .join(' · ')
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          {edition.description.trim() && (
            <p className="mt-3 max-w-4xl whitespace-pre-wrap wrap-break-word text-sm leading-6 text-ink">
              {edition.description}
            </p>
          )}
        </article>
      ))}
    </div>
  )
}

export function EntryHistory({
  isLoading,
  revisions,
  limit,
}: {
  isLoading: boolean
  revisions: EntryRevision[]
  limit?: number
}) {
  const visibleRevisions = limit == null ? revisions : revisions.slice(0, limit)

  if (isLoading) {
    return (
      <div aria-busy="true" className="space-y-2">
        {Array.from({ length: 3 }, (_, index) => (
          <article key={index} aria-hidden="true" className="animate-pulse rounded-xs border border-border bg-bg p-3">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="mt-2 h-3 w-56 bg-border/60" />
            <SkeletonText className="mt-3 max-w-xl" lines={2} />
          </article>
        ))}
      </div>
    )
  }

  if (revisions.length === 0) {
    return (
      <p className="font-serif italic text-sepia text-sm">
        No accepted edits have been recorded yet.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {visibleRevisions.map(revision => (
        <article key={revision.id} className="rounded-xs border border-border bg-bg p-3">
          <p className="font-sans text-xs uppercase tracking-wide text-accent">
            {revision.action} · revision #{revision.id}
          </p>
          <p className="mt-1 font-sans text-xs text-sepia">
            {new Date(revision.created_at).toLocaleDateString()} by user #{revision.changed_by_id}
            {revision.suggestion_id ? ` · suggestion #${revision.suggestion_id}` : ''}
          </p>
          {revision.change_note && (
            <p className="mt-2 font-serif text-sm italic text-sepia">{revision.change_note}</p>
          )}
        </article>
      ))}
    </div>
  )
}
