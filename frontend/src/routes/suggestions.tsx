/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listAdminSuggestions,
  listMySuggestions,
  reviewSuggestion,
  type EntrySuggestion,
  type EntrySuggestionStatus,
} from '../api/suggestions'
import {
  flattenTagTree,
  listAdminTagRequests,
  listMyTagRequests,
  listTags,
  reviewTagRequest,
  type TagRequestRead,
  type TagRequestStatus,
} from '../api/tags'
import { queryKeys } from '../api/queryKeys'
import useAuth from '../auth/useAuth'

export const Route = createFileRoute('/suggestions')({
  component: SuggestionsPage,
})

function formatTarget(suggestion: EntrySuggestion) {
  const label = suggestion.target_type.replaceAll('_', ' ')
  if (suggestion.target_id == null) {
    return label
  }

  return `${label} #${suggestion.target_id}`
}

function formatStatus(status: EntrySuggestionStatus) {
  return status[0].toUpperCase() + status.slice(1)
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getSuggestionTitle(suggestion: EntrySuggestion) {
  const payload = suggestion.payload
  if (typeof payload.name === 'string') {
    return payload.name
  }

  const titles = Array.isArray(payload.titles) ? payload.titles : []
  const primaryTitle = titles.find((title): title is { title: string; is_primary?: boolean } => (
    typeof title === 'object' &&
    title !== null &&
    'title' in title &&
    typeof title.title === 'string' &&
    ('is_primary' in title ? title.is_primary === true : true)
  ))

  return primaryTitle?.title ?? `${suggestion.action} ${formatTarget(suggestion)}`
}

function SuggestionCard({
  isAdmin,
  isReviewing,
  onReview,
  suggestion,
}: {
  isAdmin: boolean
  isReviewing: boolean
  onReview: (suggestion: EntrySuggestion, status: Exclude<EntrySuggestionStatus, 'pending'>) => void
  suggestion: EntrySuggestion
}) {
  return (
    <article className="rounded-xs border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-sans text-[11px] uppercase tracking-wide text-accent">
            {suggestion.action} · {formatTarget(suggestion)}
          </p>
          <h2 className="mt-1 break-words font-serif text-xl leading-tight text-ink">{getSuggestionTitle(suggestion)}</h2>
          <p className="mt-1 font-sans text-xs text-sepia">
            Submitted {formatDate(suggestion.created_at)}
          </p>
          <Link
            to="/suggestions/$suggestionId"
            params={{ suggestionId: String(suggestion.id) }}
            className="mt-2 inline-block font-sans text-xs uppercase tracking-wide text-link hover:text-highlight transition-colors"
          >
            View details
          </Link>
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

      {isAdmin && suggestion.status === 'pending' && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isReviewing}
            onClick={() => onReview(suggestion, 'approved')}
            className="h-8 rounded-xs border border-accent bg-accent px-3 font-sans text-xs uppercase tracking-wide text-bg hover:border-highlight hover:bg-highlight disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={isReviewing}
            onClick={() => onReview(suggestion, 'rejected')}
            className="h-8 rounded-xs border border-border bg-bg px-3 font-sans text-xs uppercase tracking-wide text-sepia hover:border-accent hover:text-highlight disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            Reject
          </button>
        </div>
      )}
    </article>
  )
}

function TagRequestCard({
  isAdmin,
  isReviewing,
  onReview,
  parentPath,
  tagRequest,
}: {
  isAdmin: boolean
  isReviewing: boolean
  onReview: (tagRequest: TagRequestRead, status: Exclude<TagRequestStatus, 'pending'>) => void
  parentPath?: string
  tagRequest: TagRequestRead
}) {
  return (
    <article className="rounded-xs border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-sans text-[11px] uppercase tracking-wide text-accent">
            Tag request{tagRequest.parent_id == null ? '' : ` · ${parentPath ?? `parent #${tagRequest.parent_id}`}`}
          </p>
          <h2 className="mt-1 break-words font-serif text-xl leading-tight text-ink">{tagRequest.proposed_name}</h2>
          <p className="mt-1 font-sans text-xs text-sepia">
            Submitted {formatDate(tagRequest.created_at)}
          </p>
        </div>
        <span className="self-start rounded-xs border border-border bg-bg px-2 py-1 font-sans text-xs text-sepia">
          {formatStatus(tagRequest.status)}
        </span>
      </div>

      {tagRequest.description && (
        <p className="mt-3 break-words border-t border-border pt-3 text-sm leading-6 text-ink">
          {tagRequest.description}
        </p>
      )}

      {tagRequest.submitter_note && (
        <p className="mt-3 break-words font-serif text-sm italic text-sepia">
          {tagRequest.submitter_note}
        </p>
      )}

      {tagRequest.reviewer_note && (
        <p className="mt-3 break-words font-sans text-xs text-sepia">
          Review note: {tagRequest.reviewer_note}
        </p>
      )}

      {isAdmin && tagRequest.status === 'pending' && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isReviewing}
            onClick={() => onReview(tagRequest, 'approved')}
            className="h-8 rounded-xs border border-accent bg-accent px-3 font-sans text-xs uppercase tracking-wide text-bg hover:border-highlight hover:bg-highlight disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={isReviewing}
            onClick={() => onReview(tagRequest, 'rejected')}
            className="h-8 rounded-xs border border-border bg-bg px-3 font-sans text-xs uppercase tracking-wide text-sepia hover:border-accent hover:text-highlight disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            Reject
          </button>
        </div>
      )}
    </article>
  )
}

function SuggestionsPage() {
  const { accessToken, currentUser, isAuthenticated, isLoadingUser } = useAuth()
  const queryClient = useQueryClient()
  const isAdmin = currentUser?.is_admin === true
  const suggestionsQuery = useQuery({
    enabled: isAuthenticated && accessToken !== null,
    queryKey: isAdmin
      ? queryKeys.suggestions.admin(accessToken, 'pending')
      : queryKeys.suggestions.mine(accessToken),
    queryFn: () => isAdmin ? listAdminSuggestions(accessToken!, 'pending') : listMySuggestions(accessToken!),
  })
  const tagRequestsQuery = useQuery({
    enabled: isAuthenticated && accessToken !== null,
    queryKey: isAdmin
      ? queryKeys.tags.requests.admin(currentUser?.id, 'pending')
      : queryKeys.tags.requests.mine(currentUser?.id),
    queryFn: () => isAdmin ? listAdminTagRequests(accessToken!, 'pending') : listMyTagRequests(accessToken!),
  })
  const tagsQuery = useQuery({
    queryKey: queryKeys.tags.tree(),
    queryFn: listTags,
  })
  const reviewMutation = useMutation({
    mutationFn: ({ suggestion, status }: { suggestion: EntrySuggestion; status: Exclude<EntrySuggestionStatus, 'pending'> }) => (
      reviewSuggestion(accessToken!, suggestion.id, {
        status,
        reviewer_note: status === 'approved' ? 'Approved from the moderation queue.' : 'Rejected from the moderation queue.',
      })
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suggestions.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.books.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.authors.all })
    },
  })
  const tagRequestReviewMutation = useMutation({
    mutationFn: ({ tagRequest, status }: { tagRequest: TagRequestRead; status: Exclude<TagRequestStatus, 'pending'> }) => (
      reviewTagRequest(accessToken!, tagRequest.id, {
        status,
        reviewer_note: status === 'approved' ? 'Approved from the moderation queue.' : 'Rejected from the moderation queue.',
      })
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.requests.all })
    },
  })
  const suggestions = suggestionsQuery.data ?? []
  const tagRequests = tagRequestsQuery.data ?? []
  const tagPathsById = new Map(flattenTagTree(tagsQuery.data ?? []).map(tag => [tag.id, tag.path]))
  const error = suggestionsQuery.error instanceof Error
    ? suggestionsQuery.error.message
    : suggestionsQuery.error
    ? 'Unable to load suggestions.'
    : tagRequestsQuery.error instanceof Error
    ? tagRequestsQuery.error.message
    : tagRequestsQuery.error
    ? 'Unable to load tag requests.'
    : null

  if (isLoadingUser) {
    return (
      <div className="pb-8">
        <p className="font-serif italic text-sepia">Loading suggestions...</p>
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

  return (
    <div className="pb-8">
      <section className="border-b border-border pb-5 mb-6">
        <h1 className="font-serif text-3xl font-medium text-ink leading-tight">
          {isAdmin ? 'Pending Suggestions' : 'My Suggestions'}
        </h1>
        <p className="font-sans text-sm text-sepia mt-1 max-w-2xl">
          {isAdmin ? 'Review proposed entry changes.' : 'Track the entry changes you have submitted.'}
        </p>
      </section>

      {error ? (
        <p className="font-serif italic text-sepia">{error}</p>
      ) : suggestionsQuery.isPending || tagRequestsQuery.isPending ? (
        <p className="font-serif italic text-sepia">Loading suggestions...</p>
      ) : suggestions.length === 0 && tagRequests.length === 0 ? (
        <p className="font-serif italic text-sepia">
          {isAdmin ? 'There are no pending suggestions.' : 'You have not submitted any suggestions yet.'}
        </p>
      ) : (
        <div className="grid gap-3">
          {suggestions.map(suggestion => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              isAdmin={isAdmin}
              isReviewing={reviewMutation.isPending}
              onReview={(activeSuggestion, status) => {
                reviewMutation.mutate({ suggestion: activeSuggestion, status })
              }}
            />
          ))}
          {tagRequests.map(tagRequest => (
            <TagRequestCard
              key={`tag-${tagRequest.id}`}
              tagRequest={tagRequest}
              parentPath={tagRequest.parent_id == null ? undefined : tagPathsById.get(tagRequest.parent_id)}
              isAdmin={isAdmin}
              isReviewing={tagRequestReviewMutation.isPending}
              onReview={(activeTagRequest, status) => {
                tagRequestReviewMutation.mutate({ tagRequest: activeTagRequest, status })
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
