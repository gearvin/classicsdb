/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getAuthor, listAuthorHistory, type Author } from '../../api/authors'
import { listBooks, type BookSummary } from '../../api/books'
import { queryKeys } from '../../api/queryKeys'
import type { EntryRevision } from '../../api/suggestions'
import {
  formatBookAuthors,
  formatPublicationYear,
  formatWorkType,
} from '../../components/features/books/display'
import { toStarRating } from '../../components/features/books/rating'
import MetaItem from '../../components/ui/MetaItem'
import StarRating from '../../components/ui/StarRating'

export const Route = createFileRoute('/authors/$authorId')({
  component: AuthorPage,
})

const CONTRIBUTOR_ROLES = [
  { value: 'author', label: 'Author' },
  { value: 'attributed_to', label: 'Attributed to' },
  { value: 'translator', label: 'Translator' },
  { value: 'editor', label: 'Editor' },
  { value: 'illustrator', label: 'Illustrator' },
  { value: 'introduction', label: 'Introduction' },
  { value: 'narrator', label: 'Narrator' },
  { value: 'compiler', label: 'Compiler' },
  { value: 'other', label: 'Other' },
]

const BOOK_LIMIT = 500

function formatLifeDates(author: Author) {
  if (author.birth_year == null && author.death_year == null) return 'Dates unknown'
  return `${formatPublicationYear(author.birth_year)} – ${formatPublicationYear(author.death_year)}`
}

function formatContributorRole(role: string) {
  return CONTRIBUTOR_ROLES.find(o => o.value === role)?.label ?? role.replaceAll('_', ' ')
}

function getAuthorRoles(book: BookSummary, authorId: string) {
  const roles = book.authors
    .filter(a => a.author_id.toString() === authorId)
    .map(a => formatContributorRole(a.role))
  return [...new Set(roles)]
}

function LoadingState() {
  return (
    <div className="pb-8">
      <p className="font-serif italic text-sepia">Loading author...</p>
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

function AuthorStats({
  author,
  bookCount,
}: {
  author: Author
  bookCount: number
}) {
  return (
    <div className="grid gap-1 text-sm sm:max-w-xl">
      <MetaItem label="Dates" value={formatLifeDates(author)} />
      <MetaItem label="Books" value={bookCount > 0 ? bookCount.toLocaleString() : 'None yet'} />
      {author.sort_name && author.sort_name !== author.name && (
        <MetaItem label="Sort Name" value={author.sort_name} />
      )}
    </div>
  )
}

function AuthorActionMenu({ authorId }: { authorId: string }) {
  return (
    <nav
      aria-label="Author actions"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 font-sans text-xs uppercase tracking-wide text-sepia sm:justify-end"
    >
      <a
        href="#books"
        className="text-sepia transition-colors hover:text-highlight"
      >
        Books
      </a>
      <a
        href="#history"
        className="text-sepia transition-colors hover:text-highlight"
      >
        History
      </a>
      <Link
        to="/browse"
        search={{ q: undefined, genre: undefined, period: undefined, length: undefined, rating: undefined, tags: undefined, sort: 'rating', order: 'desc', page: 1 }}
        className="text-link transition-colors hover:text-highlight"
      >
        Browse
      </Link>
      <span className="text-dust">ID {authorId}</span>
    </nav>
  )
}

function AuthorHeader({
  author,
  authorId,
  bookCount,
}: {
  author: Author
  authorId: string
  bookCount: number
}) {
  return (
    <section className="pb-6">
      <div className="mb-6 border-b border-border pb-3">
        <Link
          to="/browse"
          className="font-sans text-xs uppercase tracking-wide text-link hover:text-highlight underline underline-offset-2 decoration-accent"
        >
          Back to browse
        </Link>
        <div className="mt-3 min-w-0">
          <h1 className="wrap-break-word font-serif text-3xl leading-tight text-ink sm:text-4xl">
            {author.name}
          </h1>
        </div>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
          <p className="font-serif italic text-sepia">
            {formatLifeDates(author)}
          </p>
          <AuthorActionMenu authorId={authorId} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:items-start">
        <section>
          <h2 className="font-sans text-xs uppercase tracking-wide text-accent mb-2">Biography</h2>
          <p className="max-w-4xl whitespace-pre-wrap wrap-break-word text-ink leading-6">
            {author.bio.trim() || 'No biography has been added yet.'}
          </p>
        </section>
        <aside className="rounded-xs border border-border bg-bg p-4">
          <AuthorStats author={author} bookCount={bookCount} />
        </aside>
      </div>
    </section>
  )
}

function BooksLoadingGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <article key={index} className="rounded-xs border border-border bg-bg p-3 animate-pulse">
          <div className="flex gap-3">
            <div className="h-24 w-16 shrink-0 rounded-xs bg-surface" />
            <div className="min-w-0 flex-1 pt-1">
              <div className="h-4 w-3/4 rounded-xs bg-border/80" />
              <div className="mt-2 h-3 w-1/2 rounded-xs bg-border/60" />
              <div className="mt-5 h-3 w-2/3 rounded-xs bg-border/60" />
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

function AuthorBookCard({
  authorId,
  book,
}: {
  authorId: string
  book: BookSummary
}) {
  const starRating = toStarRating(book.average_rating)
  const authorRoles = getAuthorRoles(book, authorId)
  const roleLabel = authorRoles.length > 0 ? authorRoles.join(', ') : 'Contributor'
  const meta = [
    formatWorkType(book.work_type),
    formatPublicationYear(book.first_published_year, 'Year unknown'),
  ].filter(Boolean)

  return (
    <article className="group rounded-xs border border-border bg-bg p-3 transition-colors hover:bg-surface">
      <div className="flex h-full gap-3">
        <Link
          to="/book/$bookId"
          params={{ bookId: book.id.toString() }}
          className="block h-24 w-16 shrink-0 overflow-hidden rounded-xs border border-border bg-surface"
          aria-label={book.cover ? `${book.display_title} cover` : `Open ${book.display_title}`}
        >
          {book.cover ? (
            <img
              src={book.cover.url}
              alt={`${book.display_title} cover`}
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center px-2 text-center font-sans text-[10px] uppercase tracking-wide text-dust">
              No cover
            </span>
          )}
        </Link>
        <div className="min-w-0 flex flex-1 flex-col">
          <p className="font-sans text-[11px] uppercase tracking-wide text-accent">
            {roleLabel}
          </p>
          <h3 className="mt-1 min-w-0">
            <Link
              to="/book/$bookId"
              params={{ bookId: book.id.toString() }}
              className="wrap-break-word font-serif text-lg leading-tight text-ink transition-colors group-hover:text-highlight"
            >
              {book.display_title}
            </Link>
          </h3>
          <p className="mt-1 wrap-break-word font-sans text-xs text-sepia">
            {formatBookAuthors(book)}
          </p>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-4">
            <p className="font-sans text-xs text-sepia">
              {meta.join(' · ')}
            </p>
            {starRating == null ? (
              <p className="font-sans text-xs text-sepia">New</p>
            ) : (
              <div className="flex items-center gap-1.5">
                <StarRating rating={starRating} size={14} />
                <span className="font-sans text-xs text-sepia tabular-nums">
                  {starRating.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

function AuthorBooksSection({
  authorId,
  books,
  booksError,
  isLoading,
}: {
  authorId: string
  books: BookSummary[]
  booksError: string | null
  isLoading: boolean
}) {
  return (
    <section id="books" className="mb-8 scroll-mt-6">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
        <h2 className="font-sans text-xs uppercase tracking-wide text-accent">
          Books ({books.length.toLocaleString()})
        </h2>
      </div>
      {isLoading ? (
        <BooksLoadingGrid />
      ) : booksError ? (
        <p className="font-serif italic text-sepia text-sm">{booksError}</p>
      ) : books.length === 0 ? (
        <p className="font-serif italic text-sepia text-sm">No books have been added yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {books.map(book => (
            <AuthorBookCard key={book.id} authorId={authorId} book={book} />
          ))}
        </div>
      )}
    </section>
  )
}

function EntryHistory({
  isLoading,
  revisions,
}: {
  isLoading: boolean
  revisions: EntryRevision[]
}) {
  return (
    <section id="history" className="scroll-mt-6">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
        <h2 className="font-sans text-xs uppercase tracking-wide text-accent">History</h2>
      </div>
      {isLoading ? (
        <p className="font-serif italic text-sepia text-sm">Loading history...</p>
      ) : revisions.length === 0 ? (
        <p className="font-serif italic text-sepia text-sm">No accepted edits recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {revisions.slice(0, 5).map((revision: EntryRevision) => (
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
      )}
    </section>
  )
}

function AuthorPage() {
  const { authorId } = Route.useParams()

  const authorQuery = useQuery({
    queryKey: queryKeys.authors.detail(authorId),
    queryFn: () => getAuthor(authorId),
  })
  const booksQuery = useQuery({
    queryKey: queryKeys.authors.books(authorId, BOOK_LIMIT),
    queryFn: () => listBooks(BOOK_LIMIT, 0, { authorId }),
  })
  const historyQuery = useQuery({
    enabled: authorQuery.data !== undefined,
    queryKey: queryKeys.authors.history(authorId),
    queryFn: () => listAuthorHistory(authorId),
  })

  const author = authorQuery.data ?? null
  const books = booksQuery.data?.items ?? []
  const bookCount = booksQuery.data?.total ?? books.length
  const revisions = historyQuery.data ?? []

  const authorError = authorQuery.error instanceof Error
    ? authorQuery.error.message
    : authorQuery.error ? 'Unable to load this author.' : null

  const booksError = booksQuery.error instanceof Error
    ? booksQuery.error.message
    : booksQuery.error ? 'Unable to load books.' : null

  if (authorQuery.isPending) return <LoadingState />
  if (authorError || !author) return <ErrorState message={authorError ?? 'Author not found.'} />

  return (
    <div className="pb-8">
      <AuthorHeader author={author} authorId={authorId} bookCount={bookCount} />
      <AuthorBooksSection
        authorId={authorId}
        books={books}
        booksError={booksError}
        isLoading={booksQuery.isPending}
      />
      <EntryHistory isLoading={historyQuery.isPending} revisions={revisions} />
    </div>
  )
}
