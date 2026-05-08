/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useRef } from 'react'
import { z } from 'zod'
import { listBooks, type BookSummary } from '../api/books'
import { queryKeys } from '../api/queryKeys'
import BookAuthorLinks from '../components/features/books/BookAuthorLinks'
import {
  WORK_TYPES,
  formatBookAuthors,
  formatPublicationYear,
  formatWorkType,
  getPublicationPeriod,
  type WorkTypeOption,
} from '../components/features/books/display'
import { toStarRating } from '../components/features/books/rating'
import { Skeleton } from '../components/ui/Skeleton'

// ── Route & search param schema ───────────────────────────────────────────────

const browseSearchSchema = z.object({
  q:      z.string().optional(),
  genre:  z.string().optional(),
  period: z.string().optional(),
  length: z.string().optional(),
  rating: z.string().optional(),
  tags:   z.string().optional(),
  sort:   z.enum(['rating', 'reviews', 'year', 'title']).default('rating'),
  order:  z.enum(['asc', 'desc']).default('desc'),
  page:   z.number().int().min(1).default(1),
})

type BrowseSearch = z.infer<typeof browseSearchSchema>

export const Route = createFileRoute('/browse')({
  validateSearch: browseSearchSchema,
  component: BrowsePage,
})

// ── Backend-backed data helpers ───────────────────────────────────────────────

const PERIODS = ['Ancient', 'Medieval', 'Renaissance', '18th century', '19th century', 'Early 20th century']
const RATINGS = ['3.0+', '3.5+', '4.0+', '4.5+']

const PER_PAGE = 10
const EMPTY_BOOKS: BookSummary[] = []
const SKELETON_ROWS = [
  { title: 'w-3/5', meta: 'w-2/5', rating: 'w-8', ratings: 'w-10', year: 'w-9' },
  { title: 'w-2/5', meta: 'w-1/3', rating: 'w-7', ratings: 'w-8', year: 'w-10' },
  { title: 'w-1/2', meta: 'w-1/3', rating: 'w-8', ratings: 'w-9', year: 'w-8' },
  { title: 'w-7/12', meta: 'w-5/12', rating: 'w-7', ratings: 'w-10', year: 'w-9' },
  { title: 'w-1/3', meta: 'w-1/4', rating: 'w-8', ratings: 'w-7', year: 'w-10' },
  { title: 'w-1/2', meta: 'w-1/3', rating: 'w-7', ratings: 'w-9', year: 'w-8' },
  { title: 'w-5/12', meta: 'w-2/5', rating: 'w-8', ratings: 'w-8', year: 'w-9' },
  { title: 'w-3/5', meta: 'w-1/4', rating: 'w-7', ratings: 'w-10', year: 'w-10' },
] as const

function sortBooks(books: BookSummary[], sort: BrowseSearch['sort'], order: BrowseSearch['order']): BookSummary[] {
  return [...books].sort((a, b) => {
    let diff = 0
    if (sort === 'rating')  diff = (a.average_rating ?? 0) - (b.average_rating ?? 0)
    if (sort === 'reviews') diff = a.rating_count - b.rating_count
    if (sort === 'year')    diff = (a.first_published_year ?? -Infinity) - (b.first_published_year ?? -Infinity)
    if (sort === 'title')   diff = a.display_title.localeCompare(b.display_title)
    return order === 'desc' ? -diff : diff
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface SortableThProps {
  col: BrowseSearch['sort']
  current: BrowseSearch['sort']
  order: BrowseSearch['order']
  label: string
  align?: 'left' | 'right'
  onSort: (col: BrowseSearch['sort']) => void
}

function SortableTh({ col, current, order, label, align = 'left', onSort }: SortableThProps) {
  const active = current === col
  const arrow  = active ? (order === 'desc' ? '↓' : '↑') : ''
  return (
    <th
      className={[
        'border-b border-border px-2.5 py-2 font-sans text-[11px] uppercase tracking-wide whitespace-nowrap',
        'border-b border-border',
        align === 'right' ? 'text-right' : 'text-left',
        active ? 'text-ink' : 'text-sepia',
      ].join(' ')}
      aria-sort={active ? (order === 'desc' ? 'descending' : 'ascending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(col)}
        className={[
          'inline-flex items-center gap-1 transition-colors hover:text-ink',
          align === 'right' ? 'justify-end' : 'justify-start',
        ].join(' ')}
      >
        <span>{label}</span>
        {active && <span className="text-xs opacity-70">{arrow}</span>}
      </button>
    </th>
  )
}

function FilterSelect({
  value, onChange, placeholder, options,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  options: Array<string | WorkTypeOption>
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={[
        'h-7 rounded-xs border font-sans text-xs px-2 outline-none cursor-pointer bg-bg',
        'border-border hover:border-accent focus:border-accent transition-colors',
        value ? 'text-ink border-accent' : 'text-sepia',
      ].join(' ')}
    >
      <option value="">{placeholder}</option>
      {options.map(option => {
        const value = typeof option === 'string' ? option : option.value
        const label = typeof option === 'string' ? option : option.label
        return <option key={value} value={value}>{label}</option>
      })}
    </select>
  )
}

function BrowseTableSkeleton() {
  return (
    <>
      {SKELETON_ROWS.map((row, index) => (
        <tr
          key={index}
          aria-hidden="true"
          className="border-b border-border last:border-0 animate-pulse"
        >
          <td className="px-2.5 py-3 align-middle">
            <Skeleton className="ml-auto h-3 w-3" />
          </td>
          <td className="px-2.5 py-3 align-top">
            <Skeleton className={`${row.title} h-3 max-w-80`} />
            <Skeleton className={`${row.meta} mt-2 h-2.5 max-w-56 bg-border/60`} />
          </td>
          <td className="px-2.5 py-3 align-middle">
            <Skeleton className={`${row.rating} ml-auto h-3`} />
          </td>
          <td className="px-2.5 py-3 align-middle">
            <Skeleton className={`${row.ratings} ml-auto h-3`} />
          </td>
          <td className="px-2.5 py-3 align-middle">
            <Skeleton className={`${row.year} ml-auto h-3`} />
          </td>
        </tr>
      ))}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function BrowsePage() {
  const search   = Route.useSearch()
  const navigate = useNavigate({ from: '/browse' })
  const inputRef = useRef<HTMLInputElement>(null)
  const booksQuery = useQuery({
    queryKey: queryKeys.books.list(),
    queryFn: () => listBooks(),
    select: data => data.items,
  })
  const books = booksQuery.data ?? EMPTY_BOOKS
  const isLoading = booksQuery.isPending
  const error = booksQuery.error instanceof Error
    ? booksQuery.error.message
    : booksQuery.error
    ? 'Unable to load books.'
    : null

  const filtered = useMemo(() => books.filter(book => {
    const query = search.q?.toLowerCase()
    if (query && !book.display_title.toLowerCase().includes(query) &&
        !formatBookAuthors(book).toLowerCase().includes(query)) return false
    if (search.genre && book.work_type !== search.genre) return false
    if (search.period && getPublicationPeriod(book.first_published_year) !== search.period) return false
    if (search.rating && (toStarRating(book.average_rating) ?? 0) < parseFloat(search.rating)) return false
    return true
  }), [books, search.genre, search.period, search.q, search.rating])

  const sorted   = useMemo(() => sortBooks(filtered, search.sort, search.order), [filtered, search.order, search.sort])
  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE))
  const page     = Math.min(search.page, totalPages)
  const results  = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function setSearch(patch: Partial<BrowseSearch>) {
    navigate({ search: prev => ({ ...prev, ...patch, page: 1 }) })
  }

  function setSort(col: BrowseSearch['sort']) {
    navigate({
      search: prev => ({
        ...prev,
        sort:  col,
        order: prev.sort === col && prev.order === 'desc' ? 'asc' : 'desc',
        page:  1,
      }),
    })
  }

  function setPage(p: number) {
    navigate({ search: prev => ({ ...prev, page: p }) })
  }

  function handleSearch() {
    const q = inputRef.current?.value.trim() ?? ''
    setSearch({ q: q || undefined })
  }

  const activeFilterCount = [search.genre, search.period, search.rating]
    .filter(Boolean).length

  return (
    <div className="flex flex-col min-h-0">

      {/* ── Search hero ─────────────────────────────────────────────── */}
      <div className="rounded-xs border border-border py-8 px-6 bg-surface mb-4">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-serif text-xl text-ink text-center mb-2">
            Browse books
          </h1>

          {/* search bar */}
          <div className="flex rounded-xs border border-border bg-bg transition-colors focus-within:border-accent">
            <input
              key={search.q ?? ''}
              ref={inputRef}
              type="text"
              defaultValue={search.q ?? ''}
              placeholder="Type to search..."
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="h-9 min-w-0 flex-1 bg-transparent px-3 font-sans text-sm text-ink placeholder-sepia focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="h-9 shrink-0 rounded-r-[3px] border-l border-accent bg-accent px-4 font-sans text-sm text-bg transition-colors hover:bg-highlight sm:px-5"
            >
              Search
            </button>
          </div>

          {/* filters */}
          <div className="flex flex-wrap gap-2 items-center mt-3 justify-center">
            <span className="font-sans text-xs text-sepia">Filter:</span>
            <FilterSelect
              value={search.genre ?? ''}
              onChange={v => setSearch({ genre: v || undefined })}
              placeholder="Type"
              options={WORK_TYPES}
            />
            <FilterSelect
              value={search.period ?? ''}
              onChange={v => setSearch({ period: v || undefined })}
              placeholder="Period"
              options={PERIODS}
            />
            <FilterSelect
              value={search.rating ?? ''}
              onChange={v => setSearch({ rating: v || undefined })}
              placeholder="Min. rating"
              options={RATINGS}
            />
            {activeFilterCount > 0 && (
              <button
                onClick={() => setSearch({ genre: undefined, period: undefined, length: undefined, rating: undefined, tags: undefined })}
                className="font-sans text-xs text-link hover:text-highlight underline underline-offset-2 decoration-accent transition-colors"
              >
                clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Results bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 sm:px-6">
          <span className="font-sans text-xs text-sepia">
            {isLoading
            ? 'Loading books...'
            : error
            ? error
            : filtered.length > 0
            ? <><span className="text-sepia">{filtered.length.toLocaleString()}</span> results</>
            : 'No results'}
          {search.q && <span> for <span className="italic text-sepia">"{search.q}"</span></span>}
        </span>
        {activeFilterCount > 0 && (
          <span className="font-sans text-xs text-accent tracking-[0.04em]">
            {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
          </span>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[38rem] border-collapse">
          <thead>
            <tr>
              <th className="w-7 px-2.5 py-2 border-b border-border" />
              <SortableTh col="title"   current={search.sort} order={search.order} label="Title & author" onSort={setSort} />
              <SortableTh col="rating"  current={search.sort} order={search.order} label="Rating"  align="right" onSort={setSort} />
              <SortableTh col="reviews" current={search.sort} order={search.order} label="Ratings" align="right" onSort={setSort} />
              <SortableTh col="year"    current={search.sort} order={search.order} label="Year"    align="right" onSort={setSort} />
            </tr>
          </thead>
          <tbody aria-busy={isLoading}>
            {isLoading ? (
              <BrowseTableSkeleton />
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center font-serif italic text-sepia text-sm">
                  {error}
                </td>
              </tr>
            ) : results.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center font-serif italic text-sepia text-sm">
                  No books match your search.
                </td>
              </tr>
            ) : results.map((book, i) => (
              <tr
                key={book.id}
                className="hover:bg-surface transition-colors border-b border-border last:border-0"
              >
                {/* rank */}
                <td className="px-2.5 py-2.5 font-sans text-xs text-sepia text-right align-middle tabular-nums">
                  {(page - 1) * PER_PAGE + i + 1}
                </td>

                {/* title + author */}
                <td className="px-2.5 py-2.5 align-top">
                  <Link
                    to="/book/$bookId"
                    params={{ bookId: book.id.toString() }}
                    className="font-serif font-medium leading-snug text-ink transition-colors hover:text-highlight"
                  >
                    {book.display_title}
                  </Link>

                  <div className="font-sans text-xs text-sepia mt-1">
                    <span className="font-medium"><BookAuthorLinks authors={book.authors} /></span> · {formatWorkType(book.work_type)}
                  </div>
                </td>

                {/* rating */}
                <td className="px-2.5 py-2.5 whitespace-nowrap">
                  <div className="font-sans text-xs text-right text-sepia tabular-nums">
                    {book.average_rating == null ? 'New' : (
                      <>{toStarRating(book.average_rating)?.toFixed(1)} <span className="text-stars">★</span></>
                    )}
                  </div>
                </td>

                {/* reviews */}
                <td className="px-2.5 py-2.5 align-middle text-right font-sans text-[11px] text-sepia tabular-nums whitespace-nowrap">
                  {book.rating_count.toLocaleString()}
                </td>

                {/* year */}
                <td className="px-2.5 py-2.5 align-middle text-right font-sans text-[11px] text-sepia tabular-nums">
                  {formatPublicationYear(book.first_published_year, '—')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ──────────────────────────────────────────────── */}
      {!isLoading && !error && totalPages > 1 && (
        <div className="flex items-center gap-0 px-6 py-3 border-t border-border ">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-2.5 py-1.5 rounded-l-[3px] border border-border border-r-0 font-sans text-[11px] text-sepia  hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            «
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = i + 1
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={[
                  'px-2.5 py-1.5 border border-border border-r-0 font-sans text-[11px] transition-colors',
                  p === page
                    ? 'bg-accent text-bg font-medium'
                    : ' text-sepia hover:bg-surface',
                ].join(' ')}
              >
                {p}
              </button>
            )
          })}
          {totalPages > 7 && (
            <span className="px-2.5 py-1.5 border border-border border-r-0 font-sans text-[11px] text-sepia ">
              …
            </span>
          )}
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-2.5 py-1.5 rounded-r-[3px] border border-border font-sans text-[11px] text-sepia  hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            »
          </button>
          <span className="ml-3 font-sans text-[11px] text-sepia">
            {((page - 1) * PER_PAGE + 1).toLocaleString()}–{Math.min(page * PER_PAGE, filtered.length).toLocaleString()} of {filtered.length.toLocaleString()}
          </span>
        </div>
      )}

    </div>
  )
}
