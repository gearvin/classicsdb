import { Link } from "@tanstack/react-router"

export default function NotFound() {
  return (
    <div className="flex min-h-80 items-center justify-center px-3">
      <div className="max-w-md rounded-xs border border-border bg-surface px-6 py-6 text-center font-serif sm:px-8">
        <p className="text-ink text-2xl mb-2">Oops!</p>
        <p className="text-sepia text-sm mb-4">It appears the page you were looking for does not exist...</p>
        <Link to="/" className="font-sans text-xs uppercase tracking-wide text-link hover:text-highlight transition-colors">
          Return Home
        </Link>
      </div>
    </div>
  )
}
