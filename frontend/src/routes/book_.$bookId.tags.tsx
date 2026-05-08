/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { getBook } from '../api/books'
import { queryKeys } from '../api/queryKeys'
import {
  clearBookTagVote,
  flattenTagTree,
  listBookTags,
  listTags,
  voteBookTag,
  type BookTagAggregate,
  type SpoilerLevel,
  type TagVoteValue,
} from '../api/tags'
import useAuth from '../auth/useAuth'
import {
  BookSectionError,
  BookSectionLoading,
  BookSubpageHeader,
} from '../components/features/books/BookSubpages'

export const Route = createFileRoute('/book_/$bookId/tags')({
  component: BookTagsEditPage,
})

const TAG_VOTE_OPTIONS: Array<{ value: TagVoteValue; label: string }> = [
  { value: 1, label: '+1' },
  { value: 2, label: '+2' },
  { value: 3, label: '+3' },
  { value: -1, label: '-1' },
]

const SPOILER_LEVEL_OPTIONS: Array<{ value: SpoilerLevel; label: string }> = [
  { value: 0, label: 'No spoiler' },
  { value: 1, label: 'Minor spoiler' },
  { value: 2, label: 'Major spoiler' },
]

function formatTagPath(tag: BookTagAggregate) {
  return [...tag.ancestors.map(ancestor => ancestor.name), tag.tag.name].join(' > ')
}

function VoteSelect({
  disabled,
  label = 'Vote strength',
  onVote,
  selectedVote,
}: {
  disabled: boolean
  label?: string
  onVote: (vote: TagVoteValue) => void
  selectedVote: number | null | undefined
}) {
  return (
    <div>
      <label className="mb-1.5 block font-sans text-[11px] uppercase tracking-wide text-dust">
        {label}
      </label>
      <select
        disabled={disabled}
        value={selectedVote ?? ''}
        onChange={event => onVote(Number(event.currentTarget.value) as TagVoteValue)}
        className="h-9 w-full min-w-20 rounded-xs border border-border bg-bg px-2.5 font-sans text-sm text-ink outline-none transition-colors focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {selectedVote == null && <option value="">No vote</option>}
        {TAG_VOTE_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function formatSpoilerLevel(level: number) {
  if (level === 1) return 'minor spoiler'
  if (level === 2) return 'major spoiler'
  return 'spoiler'
}

function SpoilerLevelSelect({
  disabled = false,
  label = 'Spoiler level',
  onChange,
  value,
}: {
  disabled?: boolean
  label?: string
  onChange: (value: SpoilerLevel) => void
  value: SpoilerLevel
}) {
  return (
    <div>
      <label className="mb-1.5 block font-sans text-[11px] uppercase tracking-wide text-dust">
        {label}
      </label>
      <select
        disabled={disabled}
        value={value}
        onChange={event => onChange(Number(event.currentTarget.value) as SpoilerLevel)}
        className="h-9 w-full min-w-32 rounded-xs border border-border bg-bg px-2.5 font-sans text-sm text-ink outline-none transition-colors focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {SPOILER_LEVEL_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
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

function ExistingTagRow({
  canVote,
  disabled,
  onClear,
  onSpoilerChange,
  onVote,
  tag,
}: {
  canVote: boolean
  disabled: boolean
  onClear: (tagId: number) => void
  onSpoilerChange: (tagId: number, vote: TagVoteValue, spoilerLevel: SpoilerLevel) => void
  onVote: (tagId: number, vote: TagVoteValue, spoilerLevel: SpoilerLevel) => void
  tag: BookTagAggregate
}) {
  const [spoilerLevel, setSpoilerLevel] = useState<SpoilerLevel>(tag.current_user_spoiler_level ?? 0)
  const average = tag.average_positive_rating == null
    ? null
    : tag.average_positive_rating.toFixed(1)
  const tagStats = [
    `Score ${tag.score.toLocaleString()}`,
    `${tag.vote_count.toLocaleString()} votes`,
    average ? `${average} avg` : null,
    tag.downvote_count > 0 ? `${tag.downvote_count.toLocaleString()} down` : null,
    tag.aggregate_spoiler_level > 0
      ? `${formatSpoilerLevel(tag.aggregate_spoiler_level)} (${tag.spoiler_vote_count.toLocaleString()})`
      : null,
  ].filter(Boolean).join(' · ')

  function updateSpoilerLevel(nextValue: SpoilerLevel) {
    setSpoilerLevel(nextValue)
    if (tag.current_user_vote != null) {
      onSpoilerChange(tag.tag.id, tag.current_user_vote as TagVoteValue, nextValue)
    }
  }

  return (
    <article className="border-b border-border py-4 last:border-b-0">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <h2 className="wrap-break-word font-serif text-lg leading-tight text-ink">{tag.tag.name}</h2>
          {tag.ancestors.length > 0 && (
            <p className="mt-0.5 wrap-break-word font-sans text-[11px] uppercase tracking-wide text-dust">
              {formatTagPath(tag)}
            </p>
          )}
          <p className="mt-1 font-sans text-xs text-sepia">{tagStats}</p>
        </div>
        {canVote && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end xl:justify-end">
            <VoteSelect
              disabled={disabled}
              label="My vote"
              selectedVote={tag.current_user_vote}
              onVote={vote => onVote(tag.tag.id, vote, spoilerLevel)}
            />
            <SpoilerLevelSelect
              disabled={disabled}
              label="Spoilers"
              value={spoilerLevel}
              onChange={updateSpoilerLevel}
            />
            {tag.current_user_vote != null && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onClear(tag.tag.id)}
                className="h-9 self-start font-sans text-xs uppercase tracking-wide text-link transition-colors hover:text-highlight disabled:cursor-not-allowed disabled:opacity-50 sm:self-end"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

function BookTagsEditPage() {
  const { bookId } = Route.useParams()
  const { accessToken, currentUser, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const [selectedTagId, setSelectedTagId] = useState('')
  const [selectedVote, setSelectedVote] = useState<TagVoteValue>(2)
  const [selectedSpoilerLevel, setSelectedSpoilerLevel] = useState<SpoilerLevel>(0)
  const [showDownvoted, setShowDownvoted] = useState(false)
  const [showSpoilers, setShowSpoilers] = useState(false)
  const canEditTags = isAuthenticated && accessToken !== null

  const bookQuery = useQuery({
    queryKey: queryKeys.books.detail(bookId),
    queryFn: () => getBook(bookId),
  })
  const bookTagsQuery = useQuery({
    queryKey: queryKeys.tags.book(bookId, currentUser?.id, showDownvoted, showSpoilers),
    queryFn: () => listBookTags(bookId, accessToken, showDownvoted, showSpoilers),
  })
  const tagsQuery = useQuery({
    enabled: canEditTags,
    queryKey: queryKeys.tags.tree(),
    queryFn: listTags,
  })

  const invalidateBookTags = () => {
    queryClient.invalidateQueries({ queryKey: [...queryKeys.books.detail(bookId), 'tags'] })
  }
  const voteMutation = useMutation({
    mutationFn: ({ tagId, vote, spoilerLevel }: { tagId: number; vote: TagVoteValue; spoilerLevel: SpoilerLevel }) => (
      voteBookTag(bookId, tagId, vote, spoilerLevel, accessToken!)
    ),
    onSuccess: () => {
      setSelectedTagId('')
      setSelectedSpoilerLevel(0)
      invalidateBookTags()
    },
  })
  const clearMutation = useMutation({
    mutationFn: (tagId: number) => clearBookTagVote(bookId, tagId, accessToken!),
    onSuccess: invalidateBookTags,
  })

  const book = bookQuery.data ?? null
  const bookTags = bookTagsQuery.data ?? []
  const tagOptions = flattenTagTree(tagsQuery.data ?? [])
  const bookTagIds = new Set(bookTags.map(tag => tag.tag.id))
  const availableTagOptions = tagOptions.filter(tag => tag.is_applicable && !bookTagIds.has(tag.id))
  const isSaving = voteMutation.isPending || clearMutation.isPending
  const error = bookQuery.error instanceof Error
    ? bookQuery.error.message
    : bookTagsQuery.error instanceof Error
    ? bookTagsQuery.error.message
    : tagsQuery.error instanceof Error
    ? tagsQuery.error.message
    : bookQuery.error || bookTagsQuery.error || tagsQuery.error
    ? 'Unable to load tags.'
    : null

  function submitApprovedTagVote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedTagId || accessToken === null) return
    voteMutation.mutate({
      tagId: Number(selectedTagId),
      vote: selectedVote,
      spoilerLevel: selectedSpoilerLevel,
    })
  }

  if (bookQuery.isPending) return <BookSectionLoading label="book" />
  if (error || !book) return <BookSectionError message={error ?? 'Book not found.'} />

  return (
    <div className="pb-8">
      <BookSubpageHeader book={book} title="Tags" />

      {canEditTags ? (
        <form onSubmit={submitApprovedTagVote} className="mb-6 border-b border-border pb-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h2 className="font-sans text-xs uppercase tracking-wide text-accent">Add Book Tag</h2>
            <Link
              to="/tags/request"
              className="self-start font-sans text-xs uppercase tracking-wide text-link transition-colors hover:text-highlight"
            >
              Request Tag
            </Link>
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <label className="block font-sans text-xs uppercase tracking-wide text-sepia" htmlFor="book-tag-select">
                Tag
              </label>
              <select
                id="book-tag-select"
                value={selectedTagId}
                onChange={event => {
                  const nextTagId = event.target.value
                  setSelectedTagId(nextTagId)
                  const tag = tagOptions.find(option => option.id === Number(nextTagId))
                  setSelectedSpoilerLevel(tag?.default_spoiler_level ?? 0)
                }}
                disabled={tagsQuery.isPending || availableTagOptions.length === 0}
                className="mt-2 h-10 w-full rounded-xs border border-border bg-bg px-3 font-sans text-sm text-ink outline-none transition-colors focus:border-accent disabled:opacity-60"
              >
                <option value="">
                  {tagsQuery.isPending
                    ? 'Loading tags...'
                    : availableTagOptions.length === 0
                    ? 'No available tags'
                    : 'Select a tag'}
                </option>
                {availableTagOptions.map(tag => (
                  <option key={tag.id} value={tag.id}>{tag.path}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <VoteSelect
                disabled={voteMutation.isPending}
                label="Vote"
                selectedVote={selectedVote}
                onVote={setSelectedVote}
              />
              <SpoilerLevelSelect
                disabled={voteMutation.isPending}
                label="Spoilers"
                value={selectedSpoilerLevel}
                onChange={setSelectedSpoilerLevel}
              />
              <button
                type="submit"
                disabled={!selectedTagId || voteMutation.isPending}
                className="h-9 rounded-xs border border-accent bg-accent px-4 font-sans text-xs uppercase tracking-wide text-bg transition-colors hover:border-highlight hover:bg-highlight disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-6 border-b border-border pb-5">
          <p className="font-serif italic text-sepia mb-3">Log in to add or vote on tags.</p>
          <Link
            to="/login"
            className="font-sans text-xs uppercase tracking-wide text-link hover:text-highlight underline underline-offset-2 decoration-accent"
          >
            Log in
          </Link>
        </div>
      )}

      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-sans text-xs uppercase tracking-wide text-accent">Current Tags</h2>
          <p className="mt-1 font-sans text-xs text-sepia">
            {bookTagsQuery.isPending ? 'Loading tags...' : `${bookTags.length.toLocaleString()} visible`}
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

      {bookTagsQuery.isPending ? (
        <BookSectionLoading label="tags" />
      ) : bookTags.length === 0 ? (
        <p className="border-t border-border pt-4 font-serif italic text-sepia">No tags have been added yet.</p>
      ) : (
        <div className="border-y border-border">
          {bookTags.map(tag => (
            <ExistingTagRow
              key={`${tag.tag.id}-${tag.current_user_vote ?? 'none'}-${tag.current_user_spoiler_level ?? 0}`}
              canVote={canEditTags}
              disabled={isSaving}
              tag={tag}
              onClear={tagId => clearMutation.mutate(tagId)}
              onSpoilerChange={(tagId, vote, spoilerLevel) => voteMutation.mutate({ tagId, vote, spoilerLevel })}
              onVote={(tagId, vote, spoilerLevel) => voteMutation.mutate({ tagId, vote, spoilerLevel })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
