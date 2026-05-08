/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import {
  createAdminTag,
  createTagRequest,
  flattenTagTree,
  listTags,
  type SpoilerLevel,
} from '../api/tags'
import { queryKeys } from '../api/queryKeys'
import useAuth from '../auth/useAuth'

export const Route = createFileRoute('/tags_/request')({
  component: TagRequestPage,
})

function TagRequestPage() {
  const { accessToken, currentUser, isAuthenticated, isLoadingUser } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [parentSearch, setParentSearch] = useState('')
  const [isParentListOpen, setIsParentListOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [aliases, setAliases] = useState('')
  const [defaultSpoilerLevel, setDefaultSpoilerLevel] = useState<SpoilerLevel>(0)
  const [isApplicable, setIsApplicable] = useState(true)
  const [note, setNote] = useState('')
  const isAdmin = currentUser?.is_admin === true

  const tagsQuery = useQuery({
    enabled: isAuthenticated,
    queryKey: queryKeys.tags.tree(),
    queryFn: listTags,
  })
  const tagOptions = flattenTagTree(tagsQuery.data ?? [])
  const selectedParent = parentId
    ? tagOptions.find(tag => tag.id === Number(parentId)) ?? null
    : null
  const normalizedParentSearch = parentSearch.trim().toLocaleLowerCase()
  const filteredParentOptions = (normalizedParentSearch
    ? tagOptions.filter(tag => (
      tag.name.toLocaleLowerCase().includes(normalizedParentSearch) ||
      tag.path.toLocaleLowerCase().includes(normalizedParentSearch) ||
      tag.aliases.toLocaleLowerCase().includes(normalizedParentSearch)
    ))
    : tagOptions
  ).slice(0, 12)

  const submitMutation = useMutation<unknown, Error, void>({
    mutationFn: () => {
      if (accessToken === null) {
        throw new Error('Log in to submit tags.')
      }
      const payload = {
        parent_id: parentId ? Number(parentId) : null,
        description,
      }
      return isAdmin
        ? createAdminTag(accessToken, {
          ...payload,
          aliases,
          default_spoiler_level: defaultSpoilerLevel,
          is_applicable: isApplicable,
          name,
        })
        : createTagRequest(accessToken, { ...payload, proposed_name: name, submitter_note: note })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.requests.all })
      navigate({ to: '/tags' })
    },
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) return
    submitMutation.mutate()
  }

  if (isLoadingUser) {
    return (
      <div className="pb-8">
        <p className="font-serif italic text-sepia">Loading account...</p>
      </div>
    )
  }

  if (!isAuthenticated || accessToken === null) {
    return (
      <div className="pb-8">
        <section className="mb-6 border-b border-border pb-5">
          <h1 className="font-serif text-3xl font-medium leading-tight text-ink">Request Tag</h1>
        </section>
        <p className="font-serif italic text-sepia mb-3">Log in to request a global tag.</p>
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
      <section className="mb-6 border-b border-border pb-5">
        <Link
          to="/tags"
          className="font-sans text-xs uppercase tracking-wide text-link transition-colors hover:text-highlight"
        >
          Back to tags
        </Link>
        <h1 className="mt-2 font-serif text-3xl font-medium leading-tight text-ink">
          {isAdmin ? 'Create Tag' : 'Request Tag'}
        </h1>
        <p className="mt-1 max-w-2xl font-sans text-sm text-sepia">
          Tags are global taxonomy entries. Once approved, they can be added to any book.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="max-w-2xl border border-border bg-surface p-4">
        <label className="block font-sans text-xs uppercase tracking-wide text-accent" htmlFor="tag-name">
          Name
        </label>
        <input
          id="tag-name"
          value={name}
          onChange={event => setName(event.currentTarget.value)}
          className="mt-2 h-10 w-full rounded-xs border border-border bg-bg px-3 font-sans text-sm text-ink"
          maxLength={120}
        />

        <label className="mt-4 block font-sans text-xs uppercase tracking-wide text-accent" htmlFor="tag-parent-search">
          Parent
        </label>
        <div className="relative mt-2">
          <input
            id="tag-parent-search"
            type="search"
            value={parentSearch}
            onFocus={() => setIsParentListOpen(true)}
            onChange={event => {
              const nextValue = event.currentTarget.value
              setParentSearch(nextValue)
              setIsParentListOpen(true)
              if (selectedParent && nextValue !== selectedParent.path) {
                setParentId('')
              }
            }}
            placeholder="Search parent tags"
            role="combobox"
            aria-expanded={isParentListOpen}
            aria-controls="tag-parent-options"
            aria-autocomplete="list"
            className="h-10 w-full rounded-xs border border-border bg-bg px-3 font-sans text-sm text-ink"
          />
          {isParentListOpen && (
            <div
              id="tag-parent-options"
              role="listbox"
              className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xs border border-border bg-bg shadow-sm"
            >
              <button
                type="button"
                role="option"
                aria-selected={parentId === ''}
                onMouseDown={event => event.preventDefault()}
                onClick={() => {
                  setParentId('')
                  setParentSearch('')
                  setIsParentListOpen(false)
                }}
                className="block w-full px-3 py-2 text-left font-sans text-sm text-sepia transition-colors hover:bg-surface hover:text-highlight"
              >
                No parent
              </button>
              {filteredParentOptions.length === 0 ? (
                <p className="px-3 py-2 font-serif text-sm italic text-sepia">No matching tags.</p>
              ) : (
                filteredParentOptions.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    role="option"
                    aria-selected={parentId === String(tag.id)}
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => {
                      setParentId(String(tag.id))
                      setParentSearch(tag.path)
                      setIsParentListOpen(false)
                    }}
                    className="block w-full px-3 py-2 text-left transition-colors hover:bg-surface"
                  >
                    <span className="block wrap-break-word font-sans text-sm text-ink">{tag.name}</span>
                    <span className="block wrap-break-word font-sans text-[11px] uppercase tracking-wide text-dust">
                      {tag.path}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {selectedParent && (
          <p className="mt-1 font-sans text-xs text-sepia">
            Selected: {selectedParent.path}
          </p>
        )}

        <label className="mt-4 block font-sans text-xs uppercase tracking-wide text-accent" htmlFor="tag-description">
          Description
        </label>
        <textarea
          id="tag-description"
          value={description}
          onChange={event => setDescription(event.currentTarget.value)}
          rows={4}
          className="mt-2 w-full rounded-xs border border-border bg-bg px-3 py-2 font-sans text-sm text-ink"
        />

        {isAdmin && (
          <>
            <label className="mt-4 block font-sans text-xs uppercase tracking-wide text-accent" htmlFor="tag-aliases">
              Aliases
            </label>
            <textarea
              id="tag-aliases"
              value={aliases}
              onChange={event => setAliases(event.currentTarget.value)}
              rows={2}
              className="mt-2 w-full rounded-xs border border-border bg-bg px-3 py-2 font-sans text-sm text-ink"
            />

            <label className="mt-4 block font-sans text-xs uppercase tracking-wide text-accent" htmlFor="tag-default-spoiler">
              Default Spoiler
            </label>
            <select
              id="tag-default-spoiler"
              value={defaultSpoilerLevel}
              onChange={event => setDefaultSpoilerLevel(Number(event.currentTarget.value) as SpoilerLevel)}
              className="mt-2 h-10 w-full rounded-xs border border-border bg-bg px-3 font-sans text-sm text-ink"
            >
              <option value={0}>None</option>
              <option value={1}>Minor</option>
              <option value={2}>Major</option>
            </select>

            <label className="mt-4 flex items-center gap-2 font-sans text-xs text-sepia">
              <input
                type="checkbox"
                checked={isApplicable}
                onChange={event => setIsApplicable(event.currentTarget.checked)}
                className="size-4"
              />
              Can be applied to books
            </label>
          </>
        )}

        {!isAdmin && (
          <>
            <label className="mt-4 block font-sans text-xs uppercase tracking-wide text-accent" htmlFor="tag-note">
              Note for Moderators
            </label>
            <textarea
              id="tag-note"
              value={note}
              onChange={event => setNote(event.currentTarget.value)}
              rows={3}
              className="mt-2 w-full rounded-xs border border-border bg-bg px-3 py-2 font-sans text-sm text-ink"
            />
          </>
        )}

        {submitMutation.isError && (
          <p className="mt-3 font-serif text-sm italic text-sepia">
            {submitMutation.error instanceof Error ? submitMutation.error.message : 'Unable to submit this tag.'}
          </p>
        )}

        <button
          type="submit"
          disabled={!name.trim() || submitMutation.isPending}
          className="mt-5 h-9 rounded-xs border border-accent bg-accent px-4 font-sans text-xs uppercase tracking-wide text-bg transition-colors hover:border-highlight hover:bg-highlight disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAdmin ? 'Create Tag' : 'Submit Request'}
        </button>
      </form>
    </div>
  )
}
