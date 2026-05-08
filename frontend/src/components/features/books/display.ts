import type { BookSummary } from '../../../api/books'

export interface WorkTypeOption {
  value: string
  label: string
}

export const WORK_TYPES: WorkTypeOption[] = [
  { value: 'novel', label: 'Novel' },
  { value: 'poem', label: 'Poem' },
  { value: 'play', label: 'Play' },
  { value: 'epic', label: 'Epic' },
  { value: 'essay', label: 'Essay' },
  { value: 'short_story', label: 'Short story' },
  { value: 'collection', label: 'Collection' },
  { value: 'other', label: 'Other' },
]

export function getUniqueBookAuthors(authors: Pick<BookSummary, 'authors'>['authors']) {
  const seen = new Set<number>()

  return authors.filter(author => {
    if (seen.has(author.author_id)) {
      return false
    }

    seen.add(author.author_id)
    return true
  })
}

export function formatBookAuthors(book?: Pick<BookSummary, 'authors'> | null) {
  if (!book || book.authors.length === 0) {
    return 'Unknown author'
  }

  return getUniqueBookAuthors(book.authors).map(author => author.author_name).join(', ')
}

export function formatPublicationYear(year?: number | null, fallback = 'Unknown') {
  if (year == null) {
    return fallback
  }

  return year < 0 ? `${Math.abs(year)} BC` : String(year)
}

export function formatWorkType(workType: string): string
export function formatWorkType(workType?: string | null): string | null
export function formatWorkType(workType?: string | null) {
  if (!workType) {
    return null
  }

  return WORK_TYPES.find(option => option.value === workType)?.label ?? workType.replaceAll('_', ' ')
}

export function getPublicationPeriod(year?: number | null) {
  if (year == null) {
    return null
  }

  if (year < 500) return 'Ancient'
  if (year < 1500) return 'Medieval'
  if (year < 1700) return 'Renaissance'
  if (year < 1800) return '18th century'
  if (year < 1900) return '19th century'
  if (year < 1946) return 'Early 20th century'
  return null
}
