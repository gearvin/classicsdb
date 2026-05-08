/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { listAuthors, type Author } from '../api/authors'
import { getBook, type BookDetail } from '../api/books'
import { listLanguages, type Language } from '../api/languages'
import { queryKeys } from '../api/queryKeys'
import { getSuggestion, type EntrySuggestion } from '../api/suggestions'
import useAuth from '../auth/useAuth'
import { formatPublicationYear, formatWorkType } from '../components/features/books/display'
import MetaItem from '../components/ui/MetaItem'

export const Route = createFileRoute('/suggestions_/$suggestionId')({
  component: SuggestionDetailPage,
})

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatStatus(status: EntrySuggestion['status']) {
  return status[0].toUpperCase() + status.slice(1)
}

function formatTarget(suggestion: EntrySuggestion) {
  const target = suggestion.target_type.replaceAll('_', ' ')
  return suggestion.target_id == null ? target : `${target} #${suggestion.target_id}`
}

function formatYear(year?: number | null) {
  return formatPublicationYear(year)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function getPrimaryTitle(payload: Record<string, unknown>, fallback?: string) {
  const titles = readArray(payload.titles)
  const primary = titles.find(title => title.is_primary === true) ?? titles[0]
  return readString(primary?.title) ?? fallback ?? 'Untitled work'
}

function getCoverUrl(payload: Record<string, unknown>, fallback?: string | null) {
  const covers = readArray(payload.covers)
  const primary = covers.find(cover => cover.is_primary === true) ?? covers[0]
  return readString(primary?.url) ?? fallback ?? null
}

function getOriginalLanguageName(
  payload: Record<string, unknown>,
  languages: Language[],
  fallback?: string | null,
) {
  const payloadLanguages = readArray(payload.languages)
  const original = payloadLanguages.find(language => language.role === 'original') ?? payloadLanguages[0]
  const languageCode = readString(original?.language_code)
  return languages.find(language => language.code === languageCode)?.name ?? fallback ?? null
}

function getBookAuthors(payload: Record<string, unknown>, authors: Author[], currentBook?: BookDetail | null) {
  if (!Array.isArray(payload.authors)) {
    return currentBook?.authors.map(author => author.author_name).join(', ') || 'Unknown author'
  }

  const names = readArray(payload.authors)
    .map(author => readNumber(author.author_id))
    .map(authorId => authors.find(author => author.id === authorId)?.name)
    .filter((name): name is string => Boolean(name))

  return names.length > 0 ? names.join(', ') : 'Unknown author'
}

function SuggestionSummary({ suggestion }: { suggestion: EntrySuggestion }) {
  return (
    <section className="mb-6 rounded-xs border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-sans text-[11px] uppercase tracking-wide text-accent">
            {suggestion.action} · {formatTarget(suggestion)}
          </p>
          <p className="mt-1 font-sans text-xs text-sepia">
            Submitted {formatDate(suggestion.created_at)}
            {suggestion.reviewed_at ? ` · reviewed ${formatDate(suggestion.reviewed_at)}` : ''}
          </p>
        </div>
        <span className="self-start rounded-xs border border-border bg-bg px-2 py-1 font-sans text-xs text-sepia">
          {formatStatus(suggestion.status)}
        </span>
      </div>
      {suggestion.submitter_note && (
        <p className="mt-3 break-words border-t border-border pt-3 font-serif text-sm italic text-sepia">
          {suggestion.submitter_note}
        </p>
      )}
      {suggestion.reviewer_note && (
        <p className="mt-3 break-words font-sans text-xs text-sepia">
          Review note: {suggestion.reviewer_note}
        </p>
      )}
    </section>
  )
}

function BookSuggestionPreview({
  authors,
  currentBook,
  languages,
  suggestion,
}: {
  authors: Author[]
  currentBook?: BookDetail | null
  languages: Language[]
  suggestion: EntrySuggestion
}) {
  const payload = suggestion.payload
  const title = getPrimaryTitle(payload, currentBook?.display_title)
  const coverUrl = getCoverUrl(payload, currentBook?.cover?.url)
  const authorNames = getBookAuthors(payload, authors, currentBook)
  const originalTitle = readArray(payload.titles).find(titleItem => titleItem.title_type === 'original')
  const originalTitleText = readString(originalTitle?.title)
  const description = readString(payload.description) ?? currentBook?.description ?? ''
  const workType = readString(payload.work_type) ?? currentBook?.work_type
  const year = readNumber(payload.first_published_year) ?? currentBook?.first_published_year ?? null
  const languageName = getOriginalLanguageName(
    payload,
    languages,
    currentBook?.languages.find(language => language.role === 'original')?.language.name ?? null,
  )
  const changedFields = Object.keys(payload)

  return (
    <div>
      <section className="pb-6">
        <h1 className="break-words font-serif text-3xl leading-tight text-ink sm:text-4xl">{title}</h1>
        <p className="mb-4 break-words font-serif italic text-sepia">by {authorNames}</p>
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <div className="w-full max-w-52 self-center lg:self-start">
            <div className="aspect-2/3 rounded-xs border border-border bg-surface overflow-hidden flex items-center justify-center text-highlight text-xs font-sans tracking-wide uppercase">
              {coverUrl ? (
                <img src={coverUrl} alt={`${title} cover`} decoding="async" className="h-full w-full object-cover" />
              ) : (
                'Cover'
              )}
            </div>
            <p className="font-sans text-xs text-dust mt-2">
              {suggestion.action === 'update' && suggestion.target_id ? `Book ID: ${suggestion.target_id}` : 'Proposed new book'}
            </p>
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-sans text-sm text-sepia">Suggestion preview</p>
            <div className="flex flex-col gap-1 mt-5 max-w-xl text-sm">
              {originalTitleText && originalTitleText !== title && <MetaItem label="Original title" value={originalTitleText} />}
              {languageName && <MetaItem label="Original Language" value={languageName} />}
              <MetaItem label="Work Type" value={formatWorkType(workType) ?? 'Unknown'} />
              <MetaItem label="First Published" value={formatYear(year)} />
              <MetaItem label="Changed Fields" value={changedFields.length > 0 ? changedFields.join(', ') : 'None'} />
            </div>

            <section className="mt-5">
              <h2 className="font-sans text-xs uppercase tracking-wide text-accent mb-2">Synopsis</h2>
              <p className="max-w-4xl whitespace-pre-wrap break-words text-ink leading-6">
                {description.trim() || 'No synopsis has been added yet.'}
              </p>
            </section>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
          <h2 className="font-sans text-xs uppercase tracking-wide text-accent">Tags</h2>
        </div>
        <div className="flex flex-wrap gap-2 mt-5">
          {[formatWorkType(workType), languageName, formatYear(year)].filter(Boolean).map(tag => (
            <span
              key={tag}
              className="rounded-xs font-sans text-xs px-2 py-1 border border-accent text-sepia bg-bg"
            >
              {tag}
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}

function AuthorSuggestionPreview({ suggestion }: { suggestion: EntrySuggestion }) {
  const payload = suggestion.payload
  const name = readString(payload.name) ?? 'Unnamed author'
  const sortName = readString(payload.sort_name)
  const bio = readString(payload.bio) ?? ''
  const birthYear = readNumber(payload.birth_year)
  const deathYear = readNumber(payload.death_year)

  return (
    <section className="pb-6">
      <h1 className="break-words font-serif text-3xl leading-tight text-ink sm:text-4xl">{name}</h1>
      <p className="mb-4 font-serif italic text-sepia">Contributor suggestion</p>
      <div className="max-w-3xl">
        <div className="flex flex-col gap-1 mt-5 max-w-xl text-sm">
          {sortName && <MetaItem label="Sort name" value={sortName} />}
          <MetaItem label="Birth year" value={formatYear(birthYear)} />
          <MetaItem label="Death year" value={formatYear(deathYear)} />
        </div>
        <section className="mt-5">
          <h2 className="font-sans text-xs uppercase tracking-wide text-accent mb-2">Biography</h2>
          <p className="max-w-4xl whitespace-pre-wrap break-words text-ink leading-6">
            {bio.trim() || 'No biography has been added yet.'}
          </p>
        </section>
      </div>
    </section>
  )
}

function RawPayload({ payload }: { payload: Record<string, unknown> }) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
        <h2 className="font-sans text-xs uppercase tracking-wide text-accent">Payload</h2>
      </div>
      <pre className="overflow-x-auto rounded-xs border border-border bg-surface p-4 font-mono text-xs leading-5 text-ink">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </section>
  )
}

function SuggestionDetailPage() {
  const { suggestionId } = Route.useParams()
  const { accessToken, isAuthenticated, isLoadingUser } = useAuth()
  const suggestionQuery = useQuery({
    enabled: isAuthenticated && accessToken !== null,
    queryKey: queryKeys.suggestions.detail(suggestionId, accessToken),
    queryFn: () => getSuggestion(accessToken!, suggestionId),
  })
  const suggestion = suggestionQuery.data ?? null
  const currentBookQuery = useQuery({
    enabled: suggestion?.target_type === 'book' && suggestion.action === 'update' && suggestion.target_id != null,
    queryKey: queryKeys.books.detail(suggestion?.target_id ?? 'missing'),
    queryFn: () => getBook(suggestion!.target_id!),
  })
  const authorsQuery = useQuery({
    enabled: suggestion?.target_type === 'book',
    queryKey: queryKeys.authors.list(),
    queryFn: () => listAuthors(),
  })
  const languagesQuery = useQuery({
    enabled: suggestion?.target_type === 'book',
    queryKey: queryKeys.languages.all,
    queryFn: () => listLanguages(),
  })
  const error = suggestionQuery.error instanceof Error
    ? suggestionQuery.error.message
    : suggestionQuery.error
    ? 'Unable to load this suggestion.'
    : null

  if (isLoadingUser) {
    return (
      <div className="pb-8">
        <p className="font-serif italic text-sepia">Loading suggestion...</p>
      </div>
    )
  }

  if (!isAuthenticated || accessToken === null) {
    return (
      <div className="pb-8">
        <p className="font-serif italic text-sepia mb-3">Log in to view suggestions.</p>
        <Link
          to="/login"
          className="font-sans text-xs uppercase tracking-wide text-link hover:text-highlight underline underline-offset-2 decoration-accent"
        >
          Log in
        </Link>
      </div>
    )
  }

  if (suggestionQuery.isPending) {
    return (
      <div className="pb-8">
        <p className="font-serif italic text-sepia">Loading suggestion...</p>
      </div>
    )
  }

  if (error || !suggestion) {
    return (
      <div className="pb-8">
        <p className="font-serif italic text-sepia mb-3">{error ?? 'Suggestion not found.'}</p>
        <Link
          to="/suggestions"
          className="font-sans text-xs uppercase tracking-wide text-link hover:text-highlight underline underline-offset-2 decoration-accent"
        >
          Back to suggestions
        </Link>
      </div>
    )
  }

  return (
    <div className="pb-8">
      <div className="mb-5 border-b border-border pb-4">
        <Link
          to="/suggestions"
          className="font-sans text-xs uppercase tracking-wide text-link hover:text-highlight transition-colors"
        >
          Suggestions
        </Link>
        <h1 className="mt-2 font-serif text-2xl font-medium text-ink leading-tight">
          Suggestion #{suggestion.id}
        </h1>
      </div>

      <SuggestionSummary suggestion={suggestion} />

      {suggestion.target_type === 'book' ? (
        <BookSuggestionPreview
          suggestion={suggestion}
          currentBook={currentBookQuery.data ?? null}
          authors={authorsQuery.data ?? []}
          languages={languagesQuery.data ?? []}
        />
      ) : suggestion.target_type === 'author' ? (
        <AuthorSuggestionPreview suggestion={suggestion} />
      ) : (
        <RawPayload payload={suggestion.payload} />
      )}

      {suggestion.target_type !== 'book_edition' && <RawPayload payload={suggestion.payload} />}
    </div>
  )
}
