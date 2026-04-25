import { Link } from "@tanstack/react-router"

const NAV_LINKS = [
  { to: '/', label: 'Home', exact: true },
  { to: '/browse', label: 'Browse' },
  { to: '/my-books', label: 'My Books' },
  { to: '/lists', label: 'Lists' },
  { to: '/users', label: 'Users' },
  { to: '/tags', label: 'Tags' },
  { to: '/forums', label: 'Forums' },
] as const

export default function Sidebar() {
  return (
    <aside className="w-50 shrink-0 border border-border bg-bg self-start">
      {/* Contents label */}
      <div className="px-4 pt-4">
        <p
          className="font-semibold text-ink border-b border-border pb-1"
        >
          Main Menu
        </p>
      </div>

      {/* Nav links */}
      <nav className="px-4 py-4">
        <ul className="flex flex-col">
          {NAV_LINKS.map(({ to, label, exact }) => (
            <li key={to}>
              <Link
                to={to}
                activeProps={{ className: 'text-ink font-medium' }}
                activeOptions={exact ? { exact: true } : undefined}
                className="block font-sans text-sm mb-0.5 text-link underline underline-offset-2 hover:text-ink leading-relaxed"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Search */}
      <div className="px-4 pb-4">
        <div className="flex items-center border border-border bg-bg focus-within:border-[#5C5040]">
          <input
            type="text"
            placeholder="Search..."
            className="w-full bg-transparent font-sans text-sm text-ink placeholder-[#9A9080] px-2.5 py-1.5 focus:outline-none"
          />
          <button
            className="px-2 text-[#5C5040] hover:text-ink"
            aria-label="Search"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
