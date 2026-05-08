import { Link } from '@tanstack/react-router'
import type { BookSummary } from '../../../api/books'
import { formatBookAuthors, formatPublicationYear } from './display'

function RecentlyAddedBookCover({ book }: { book: BookSummary }) {
  if (book.cover) {
    return (
      <img
        src={book.cover.url}
        alt={`${book.display_title} cover`}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    )
  }

  return (
    <div className="flex h-full items-center justify-center px-3 text-center font-serif text-sm italic text-sepia">
      {book.display_title}
    </div>
  )
}

function RecentlyAddedBookDetails({ book }: { book: BookSummary }) {
  const year = formatPublicationYear(book.first_published_year, '')
  const rating = book.average_rating == null ? 'New' : `${(book.average_rating / 2).toFixed(1)} ★`
  const meta = [year, rating].filter(Boolean).join(' · ')

  return (
    <>
      <h3 className="line-clamp-2 break-words font-serif text-sm font-medium leading-tight text-ink">
        {book.display_title}
      </h3>
      <p className="mt-1 line-clamp-1 font-sans text-[11px] leading-4 text-sepia">
        {formatBookAuthors(book)}
      </p>
      <p className="font-sans text-[11px] leading-4 text-dust">
        {meta || `${book.rating_count.toLocaleString()} ratings`}
      </p>
    </>
  )
}

export default function RecentlyAddedBookCard({ book }: { book: BookSummary }) {
  return (
    <article className="group min-w-0">
      <Link
        to="/book/$bookId"
        params={{ bookId: String(book.id) }}
        className="block overflow-hidden rounded-xs border border-border bg-surface transition-colors hover:border-accent focus-visible:border-accent focus-visible:outline-none"
      >
        <div className="relative overflow-hidden bg-surface">
          <div className="aspect-2/3">
            <RecentlyAddedBookCover book={book} />
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 translate-y-full border-t border-border bg-bg/95 px-2.5 py-2 transition-transform duration-200 group-hover:translate-y-0 group-focus-within:translate-y-0"
          >
            <RecentlyAddedBookDetails book={book} />
          </div>
        </div>
      </Link>
    </article>
  )
}