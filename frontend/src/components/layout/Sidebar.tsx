import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import { useState } from "react"
import type { FormEvent } from "react"
import useAuth from "../../auth/useAuth"

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/browse', label: 'Browse' },
] as const

const PERSONAL_LINKS = [
  { to: '/profile', label: 'Profile' },
  { to: '/my-books', label: 'My Books' },
  { to: '/my-reviews', label: 'My Reviews' },
  { to: '/suggestions', label: 'Suggestions' },
] as const

const COMMUNITY_LINKS = [
  { to: '/reviews', label: 'Reviews' },
  { to: '/users', label: 'Users' },
  { to: '/tags', label: 'Tags' },
] as const

const CONTRIBUTE_LINKS = [
  { to: '/add-book', label: 'Add Book' },
  { to: '/add-author', label: 'Add Author' },
] as const

const COMING_SOON = ['Lists', 'Forums']

type BrowseSearchParams = {
  q?: string
  genre?: string
  period?: string
  length?: string
  rating?: string
  tags?: string
  sort?: 'rating' | 'reviews' | 'year' | 'title'
  order?: 'asc' | 'desc'
  page?: number
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="px-2.5 pt-2 pb-1 font-sans text-[11px] uppercase tracking-wide text-dust">
      {children}
    </p>
  )
}

function SidebarLink({ to, label, exact }: { to: string; label: string; exact?: boolean }) {
  const baseClassName = [
    'block border-l-2 border-transparent px-2.5 py-0.5 font-sans text-sm leading-relaxed',
    'text-sepia transition-colors hover:border-highlight hover:text-highlight',
  ].join(' ')
  const activeClassName = [
    baseClassName,
    'border-ink font-medium text-ink hover:border-ink hover:text-ink',
  ].join(' ')

  return (
    <Link
      to={to}
      activeOptions={exact ? { exact: true } : undefined}
      className={baseClassName}
      activeProps={{ className: activeClassName }}
    >
      {label}
    </Link>
  )
}

export default function Sidebar() {
  const { isAuthenticated, isLoadingUser } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const location = useRouterState({ select: state => state.location })
  const browseSearch = location.pathname === '/browse'
    ? location.search as BrowseSearchParams
    : undefined

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedQuery = query.trim()
    setQuery('')
    navigate({
      to: '/browse',
      search: {
        ...(browseSearch ?? {}),
        q: trimmedQuery || undefined,
        page: 1,
      },
    })
  }

  return (
    <aside className="w-full shrink-0 self-start border border-border bg-surface lg:w-44 rounded-xs">
      <form className="border-b border-border p-2" onSubmit={handleSubmit} role="search">
        <div className="flex border border-border bg-bg transition-colors focus-within:border-accent rounded-xs">
          <input
            name="sidebar-search"
            type="search"
            value={query}
            onChange={e => setQuery(e.currentTarget.value)}
            placeholder="Search books"
            className="min-w-0 flex-1 bg-transparent px-2 py-1 font-sans text-sm text-ink placeholder-dust focus:outline-none"
          />
          <button
            type="submit"
            className="grid w-8 shrink-0 place-items-center text-sepia transition-colors hover:text-highlight"
            aria-label="Search"
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </form>

      <nav className="py-2" aria-label="Primary">
        <div className="pb-1">
          {NAV_LINKS.map(({ to, label }) => (
            <SidebarLink key={to} to={to} label={label} exact={to === '/'} />
          ))}
        </div>

        {!isLoadingUser && isAuthenticated && (
          <section className="border-t border-border pt-1 mb-2">
            <SectionLabel>My Shelf</SectionLabel>
            <div>
              {PERSONAL_LINKS.map(({ to, label }) => (
                <SidebarLink key={to} to={to} label={label} />
              ))}
            </div>
          </section>
        )}

        <section className="border-t border-border pt-1 mb-2">
          <SectionLabel>Community</SectionLabel>
          <div>
            {COMMUNITY_LINKS.map(({ to, label }) => (
              <SidebarLink key={to} to={to} label={label} />
            ))}
            {COMING_SOON.map(label => (
              <span
                key={label}
                className="block border-l-2 border-transparent px-2.5 py-0.5 font-sans text-sm leading-relaxed text-dust"
                aria-disabled="true"
              >
                {label}
              </span>
            ))}
          </div>
        </section>

        {!isLoadingUser && isAuthenticated && (
          <section className="border-t border-border pt-1">
            <SectionLabel>Contribute</SectionLabel>
            <div>
              {CONTRIBUTE_LINKS.map(({ to, label }) => (
                <SidebarLink key={to} to={to} label={label} />
              ))}
            </div>
          </section>
        )}
      </nav>
    </aside>
  )
}
