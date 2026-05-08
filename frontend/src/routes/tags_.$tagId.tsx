/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getTag, type TagDetail, type TaggedBookSummary } from '../api/tags'
import { queryKeys } from '../api/queryKeys'
import BookAuthorLinks from '../components/features/books/BookAuthorLinks'
import {
  formatPublicationYear,
  formatWorkType,
} from '../components/features/books/display'
import { toStarRating } from '../components/features/books/rating'
import { Skeleton } from '../components/ui/Skeleton'

export const Route = createFileRoute('/tags_/$tagId')({
  component: TagPage,
})

function formatSpoilerLevel(level: number) {
  if (level === 1) return 'minor spoiler'
  if (level === 2) return 'major spoiler'
  return null
}

function ToggleField({
  checked,
  children,
  onChange,
}: {
  checked: boolean
  children: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="inline-flex items-center gap-2 font-sans text-xs text-sepia transition-colors hover:text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.currentTarget.checked)}
        className="size-3.5 accent-accent"
      />
      {children}
    </label>
  )
}

function LoadingState() {
  return (
    <div className="animate-pulse pb-8" aria-busy="true" aria-label="Loading tag">
      <div className="mb-6 border-b border-border pb-5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-4 h-9 w-7/12 max-w-xl" />
        <Skeleton className="mt-3 h-4 w-5/12 max-w-lg bg-border/60" />
      </div>
      <Skeleton className="h-3 w-32" />
      <div className="mt-3 space-y-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full bg-border/60" />
        ))}
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="pb-8">
      <p className="mb-3 font-serif italic text-sepia">{message}</p>
      <Link
        to="/tags"
        className="font-sans text-xs uppercase tracking-wide text-link underline decoration-accent underline-offset-2 hover:text-highlight"
      >
        Back to tags
      </Link>
    </div>
  )
}

function TagRelationLink({ tag }: { tag: Pick<TagDetail, 'id' | 'name'> }) {
  return (
    <Link
      to="/tags/$tagId"
      params={{ tagId: String(tag.id) }}
      className="wrap-break-word text-link transition-colors hover:text-highlight"
    >
      {tag.name}
    </Link>
  )
}

function TagHeader({ tag }: { tag: TagDetail }) {
  return (
    <section className="mb-8">
      <div className="mb-6 border-b border-border pb-5">
        <Link
          to="/tags"
          className="font-sans text-xs uppercase tracking-wide text-link underline decoration-accent underline-offset-2 hover:text-highlight"
        >
          Back to tags
        </Link>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="wrap-break-word font-serif text-3xl leading-tight text-ink sm:text-4xl">
              {tag.name}
            </h1>
            <p className="mt-1 font-sans text-xs uppercase tracking-wide text-accent">
              Tag ID {tag.id}
            </p>
          </div>
          <a
            href="#books"
            className="self-start font-sans text-xs uppercase tracking-wide text-sepia transition-colors hover:text-highlight sm:self-end"
          >
            Books
          </a>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)] lg:items-start">
        <section>
          <h2 className="mb-2 font-sans text-xs uppercase tracking-wide text-accent">Description</h2>
          <p className="max-w-4xl whitespace-pre-wrap wrap-break-word leading-6 text-ink">
            {tag.description.trim() || 'No description has been added yet.'}
          </p>
        </section>

        <aside className="rounded-xs border border-border bg-bg p-4">
          <dl className="space-y-3">
            <div>
              <dt className="font-sans text-xs uppercase tracking-wide text-accent">Parent</dt>
              <dd className="mt-1 font-serif text-sm text-ink">
                {tag.parent ? <TagRelationLink tag={tag.parent} /> : 'Top-level tag'}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-xs uppercase tracking-wide text-accent">Children</dt>
              <dd className="mt-1 font-serif text-sm text-ink">
                {tag.children.length === 0 ? (
                  'None'
                ) : (
                  <ul className="space-y-1">
                    {tag.children.map(child => (
                      <li key={child.id}>
                        <TagRelationLink tag={child} />
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  )
}

function TagBookRow({ taggedBook }: { taggedBook: TaggedBookSummary }) {
  const { book } = taggedBook
  const starRating = toStarRating(book.average_rating)
  const relevance = taggedBook.average_positive_rating == null
    ? null
    : taggedBook.average_positive_rating.toFixed(1)
  // const spoiler = formatSpoilerLevel(taggedBook.aggregate_spoiler_level)
  // const relevanceMeta = [
  //   relevance ? `${relevance}/3 avg relevance` : null,
  //   `score ${taggedBook.relevance_score.toLocaleString()}`,
  //   `${taggedBook.vote_count.toLocaleString()} votes`,
  //   taggedBook.downvote_count > 0 ? `${taggedBook.downvote_count.toLocaleString()} down` : null,
  //   spoiler ? `${spoiler} (${taggedBook.spoiler_vote_count.toLocaleString()})` : null,
  // ].filter(Boolean).join(' · ')

  return (
    <tr className="border-b border-border transition-colors last:border-0 hover:bg-surface">
      <td className="px-2.5 py-3 align-top">
        <Link
          to="/book/$bookId"
          params={{ bookId: book.id.toString() }}
          className="font-serif font-medium leading-snug text-ink transition-colors hover:text-highlight"
        >
          {book.display_title}
        </Link>
        <div className="mt-1 font-sans text-xs text-sepia">
          <span className="font-medium"><BookAuthorLinks authors={book.authors} /></span>
          {' '}· {formatWorkType(book.work_type)}
        </div>
        {/* <p className="mt-1 font-sans text-[11px] text-dust">{relevanceMeta}</p> */}
      </td>
      <td className="whitespace-nowrap px-2.5 py-3 text-right align-top font-sans text-xs text-sepia tabular-nums">
        {relevance ?? '-'}
      </td>
      <td className="whitespace-nowrap px-2.5 py-3 text-right align-top font-sans text-xs text-sepia tabular-nums">
        {book.average_rating == null ? 'New' : (
          <>{starRating?.toFixed(1)} <span className="text-stars">★</span></>
        )}
      </td>
      <td className="px-2.5 py-3 text-right align-top font-sans text-[11px] text-sepia tabular-nums">
        {formatPublicationYear(book.first_published_year, '-')}
      </td>
    </tr>
  )
}

function TaggedBooksSection({
  books,
  isLoading,
  showDownvoted,
  showSpoilers,
  setShowDownvoted,
  setShowSpoilers,
}: {
  books: TaggedBookSummary[]
  isLoading: boolean
  showDownvoted: boolean
  showSpoilers: boolean
  setShowDownvoted: (value: boolean) => void
  setShowSpoilers: (value: boolean) => void
}) {
  return (
    <section id="books" className="scroll-mt-6">
      <div className="mb-3 flex flex-col gap-3 border-b border-border pb-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-sans text-xs uppercase tracking-wide text-accent">Books</h2>
          <p className="mt-1 font-sans text-xs text-sepia">
            {isLoading ? 'Loading books...' : `${books.length.toLocaleString()} visible`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ToggleField checked={showDownvoted} onChange={setShowDownvoted}>
            Show downvoted
          </ToggleField>
          <ToggleField checked={showSpoilers} onChange={setShowSpoilers}>
            Show spoilers
          </ToggleField>
        </div>
      </div>

      {isLoading ? (
        <p className="font-serif italic text-sepia">Loading books...</p>
      ) : books.length === 0 ? (
        <p className="font-serif italic text-sepia">No books have been tagged yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse">
            <thead>
              <tr>
                <th className="border-b border-border px-2.5 py-2 text-left font-sans text-[11px] uppercase tracking-wide text-sepia">
                  Title & author
                </th>
                <th className="border-b border-border px-2.5 py-2 text-right font-sans text-[11px] uppercase tracking-wide text-sepia">
                  Relevance
                </th>
                <th className="border-b border-border px-2.5 py-2 text-right font-sans text-[11px] uppercase tracking-wide text-sepia">
                  Rating
                </th>
                <th className="border-b border-border px-2.5 py-2 text-right font-sans text-[11px] uppercase tracking-wide text-sepia">
                  Year
                </th>
              </tr>
            </thead>
            <tbody>
              {books.map(taggedBook => (
                <TagBookRow key={taggedBook.book.id} taggedBook={taggedBook} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function TagPage() {
  const { tagId } = Route.useParams()
  const [showDownvoted, setShowDownvoted] = useState(false)
  const [showSpoilers, setShowSpoilers] = useState(false)
  const tagQuery = useQuery({
    queryKey: queryKeys.tags.detail(tagId, showDownvoted, showSpoilers),
    queryFn: () => getTag(tagId, showDownvoted, showSpoilers),
  })
  const tag = tagQuery.data ?? null
  const error = tagQuery.error instanceof Error
    ? tagQuery.error.message
    : tagQuery.error
    ? 'Unable to load this tag.'
    : null

  if (tagQuery.isPending && tag === null) return <LoadingState />
  if (error || tag === null) return <ErrorState message={error ?? 'Tag not found.'} />

  return (
    <div className="pb-8">
      <TagHeader tag={tag} />
      <TaggedBooksSection
        books={tag.books}
        isLoading={tagQuery.isFetching && !tagQuery.isPending}
        showDownvoted={showDownvoted}
        showSpoilers={showSpoilers}
        setShowDownvoted={setShowDownvoted}
        setShowSpoilers={setShowSpoilers}
      />
    </div>
  )
}
