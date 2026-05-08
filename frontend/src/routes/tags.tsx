/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { flattenTagTree, listTags, type TagTreeNode } from '../api/tags'
import { queryKeys } from '../api/queryKeys'
import useAuth from '../auth/useAuth'

export const Route = createFileRoute('/tags')({
  component: TagsPage,
})

function TagBranch({ tag, depth = 0 }: { tag: TagTreeNode; depth?: number }) {
  return (
    <li>
      <div className="flex min-w-0 items-baseline gap-2 py-0.5" style={{ paddingLeft: depth * 14 }}>
        <span className="font-sans text-dust" aria-hidden>
          {tag.children.length > 0 ? '>' : '-'}
        </span>
        <Link
          to="/tags/$tagId"
          params={{ tagId: String(tag.id) }}
          className="wrap-break-word font-serif text-lg leading-tight text-ink transition-colors hover:text-highlight"
        >
          {tag.name}
        </Link>
      </div>
      {tag.description && (
        <p className="mb-1 wrap-break-word font-sans text-xs text-sepia" style={{ paddingLeft: depth * 14 + 22 }}>
          {tag.description}
        </p>
      )}
      {tag.children.length > 0 && (
        <ul>
          {tag.children.map(child => (
            <TagBranch key={child.id} tag={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}

function SearchResult({ tag }: { tag: { id: number; name: string; path: string; description: string; aliases: string } }) {
  return (
    <li className="border-b border-border py-3 last:border-b-0">
      <Link
        to="/tags/$tagId"
        params={{ tagId: String(tag.id) }}
        className="wrap-break-word font-serif text-lg leading-tight text-ink transition-colors hover:text-highlight"
      >
        {tag.name}
      </Link>
      <p className="mt-0.5 wrap-break-word font-sans text-[11px] uppercase tracking-wide text-dust">
        {tag.path}
      </p>
      {tag.description && (
        <p className="mt-1 wrap-break-word font-sans text-sm text-sepia">{tag.description}</p>
      )}
      {tag.aliases && (
        <p className="mt-1 wrap-break-word font-sans text-xs text-dust">{tag.aliases}</p>
      )}
    </li>
  )
}

function TagsPage() {
  const { isAuthenticated, currentUser } = useAuth()
  const [query, setQuery] = useState('')
  const tagsQuery = useQuery({
    queryKey: queryKeys.tags.tree(),
    queryFn: listTags,
  })
  const tagTree = tagsQuery.data
  const flattenedTags = useMemo(() => flattenTagTree(tagTree ?? []), [tagTree])
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const matchingTags = normalizedQuery
    ? flattenedTags.filter(tag => (
      tag.name.toLocaleLowerCase().includes(normalizedQuery) ||
      tag.path.toLocaleLowerCase().includes(normalizedQuery) ||
      tag.description.toLocaleLowerCase().includes(normalizedQuery) ||
      tag.aliases.toLocaleLowerCase().includes(normalizedQuery)
    ))
    : []
  const rootColumns = (tagTree ?? []).reduce<TagTreeNode[][]>((columns, tag, index) => {
    columns[index % 3].push(tag)
    return columns
  }, [[], [], []])

  return (
    <div className="pb-8">
      <section className="mb-6 border-b border-border pb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-medium leading-tight text-ink">Tags</h1>
            <p className="mt-1 max-w-2xl font-sans text-sm text-sepia">
              Browse the global tag tree and its parent-child relationships.
            </p>
          </div>
          {isAuthenticated ? (
            <Link
              to="/tags/request"
              className="self-start font-sans text-xs uppercase tracking-wide text-link transition-colors hover:text-highlight"
            >
              {currentUser?.is_admin ? 'Create Tag' : 'Request Tag'}
            </Link>
          ) : (
            <Link
              to="/login"
              className="self-start font-sans text-xs uppercase tracking-wide text-link transition-colors hover:text-highlight"
            >
              Log in to request tags
            </Link>
          )}
        </div>
        <label className="mt-5 block font-sans text-xs uppercase tracking-wide text-accent" htmlFor="tag-search">
          Search Tags
        </label>
        <input
          id="tag-search"
          type="search"
          value={query}
          onChange={event => setQuery(event.currentTarget.value)}
          className="mt-2 h-10 w-full rounded-xs border border-border bg-bg px-3 font-sans text-sm text-ink"
        />
      </section>

      {tagsQuery.isPending ? (
        <p className="font-serif italic text-sepia">Loading tags...</p>
      ) : tagsQuery.isError ? (
        <p className="font-serif italic text-sepia">
          {tagsQuery.error instanceof Error ? tagsQuery.error.message : 'Unable to load tags.'}
        </p>
      ) : normalizedQuery ? (
        <section>
          <h2 className="mb-3 font-sans text-xs uppercase tracking-wide text-accent">
            Search Results
          </h2>
          {matchingTags.length === 0 ? (
            <p className="font-serif italic text-sepia">No tags matched your search.</p>
          ) : (
            <ul className="border-y border-border">
              {matchingTags.map(tag => (
                <SearchResult key={tag.id} tag={tag} />
              ))}
            </ul>
          )}
        </section>
      ) : (tagTree ?? []).length === 0 ? (
        <p className="font-serif italic text-sepia">No tags have been created yet.</p>
      ) : (
        <section>
          <h2 className="mb-3 font-sans text-xs uppercase tracking-wide text-accent">Tag Tree</h2>
          <div className="grid gap-6 border-y border-border py-4 lg:grid-cols-3">
            {rootColumns.map((column, index) => (
              <ul key={index} className="min-w-0">
                {column.map(tag => (
                  <TagBranch key={tag.id} tag={tag} />
                ))}
              </ul>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
