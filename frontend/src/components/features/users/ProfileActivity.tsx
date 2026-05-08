import { Link } from '@tanstack/react-router'
import type { BookSummary } from '../../../api/books'
import { formatBookAuthors } from '../books/display'
import { Skeleton, SkeletonCover } from '../../ui/Skeleton'
import { formatRelativeDate, type ActivityEntry } from './profileActivityUtils'

export function ProfileStatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-4 border-b border-border py-2.5">
      <p className="min-w-0 break-words font-sans text-[11px] uppercase tracking-wide text-sepia">
        {label}
      </p>
      <p className="shrink-0 font-serif text-xl leading-none text-ink">{value}</p>
    </div>
  )
}

function ActivityCover({ book }: { book?: BookSummary }) {
  return (
    <div className="h-18 w-12 shrink-0 overflow-hidden rounded-xs border border-border bg-surface">
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
  )
}

export function ActivityItem({ activity }: { activity: ActivityEntry }) {
  const title = activity.book?.display_title ?? 'Unknown book'
  const content = (
    <span className="break-words font-serif text-lg leading-tight text-ink transition-colors hover:text-highlight">
      {title}
    </span>
  )

  return (
    <article className="flex min-w-0 gap-3 border-b border-border py-4 first:pt-0 last:border-b-0">
      <ActivityCover book={activity.book} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="font-sans text-[11px] uppercase tracking-wide text-accent">
            {activity.title}
          </p>
          <time className="font-sans text-xs text-dust" dateTime={activity.date}>
            {formatRelativeDate(activity.date)}
          </time>
        </div>

        {activity.bookId ? (
          <Link to="/book/$bookId" params={{ bookId: String(activity.bookId) }}>
            {content}
          </Link>
        ) : content}

        <p className="mt-0.5 font-sans text-xs text-sepia">
          {formatBookAuthors(activity.book)}
        </p>
        <p className="mt-1 font-sans text-xs text-dust">{activity.meta}</p>
        {activity.body && (
          <p className="mt-2 line-clamp-2 max-w-2xl break-words text-sm leading-5 text-ink">
            {activity.body}
          </p>
        )}
      </div>
    </article>
  )
}

export function ActivityListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading recent activity" className="animate-pulse">
      {Array.from({ length: count }, (_, index) => (
        <article
          key={index}
          className="flex min-w-0 gap-3 border-b border-border py-4 first:pt-0 last:border-b-0"
        >
          <SkeletonCover className="h-18 w-12 rounded-xs" />
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center justify-between gap-4">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-2.5 w-16" />
            </div>
            <Skeleton className="h-5 w-7/12 max-w-80" />
            <Skeleton className="mt-2 h-2.5 w-5/12 max-w-48 bg-border/60" />
            <Skeleton className="mt-2 h-2.5 w-3/12 max-w-36 bg-border/60" />
          </div>
        </article>
      ))}
    </div>
  )
}

export function StatsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="flex animate-pulse items-baseline justify-between gap-4 border-b border-border py-2.5"
        >
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-5 w-8" />
        </div>
      ))}
    </>
  )
}
