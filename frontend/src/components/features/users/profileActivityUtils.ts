import type { BookSummary } from '../../../api/books'
import type { ReadingStatus } from '../../../api/userBooks'

export const STATUS_LABELS: Record<ReadingStatus, string> = {
  want_to_read: 'Want to read',
  reading: 'Reading',
  read: 'Read',
  dnf: 'Did not finish',
}

export interface ActivityEntry {
  id: string
  type?: 'review' | 'shelf'
  book?: BookSummary
  bookId?: number
  date: string
  timestamp: number
  title: string
  meta: string
  body?: string
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatRelativeDate(value: string) {
  const date = new Date(value)
  const diffMs = date.getTime() - Date.now()
  const diffDays = Math.round(diffMs / 86_400_000)

  if (Math.abs(diffDays) < 1) return 'Today'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays > -7 && diffDays < 0) return `${Math.abs(diffDays)} days ago`

  return formatDate(value)
}

export function formatStatus(status?: ReadingStatus | null) {
  return status ? STATUS_LABELS[status] : 'On shelf'
}

export function formatShelfRating(rating?: number | null) {
  return rating == null ? null : `${(rating / 2).toFixed(1)} stars`
}

export function getShelfActivityTitle(status?: ReadingStatus | null, rating?: number | null) {
  if (status === 'reading') return 'Started reading'
  if (status === 'read') return rating == null ? 'Marked as read' : 'Rated a book'
  if (status === 'want_to_read') return 'Added to want to read'
  if (status === 'dnf') return 'Marked did not finish'
  return 'Added to shelf'
}

export function getStatusCount(books: Array<{ status?: ReadingStatus | null }>, status: ReadingStatus) {
  return books.filter(book => book.status === status).length
}
