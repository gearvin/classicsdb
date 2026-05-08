import { Link } from "@tanstack/react-router"

export default function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-3 flex min-w-0 items-baseline gap-0">
      <span className="shrink-0 font-sans text-xs uppercase tracking-wide text-accent">
        {title}
      </span>
      <span
        className="mx-3 min-w-4 flex-1 border-b border-dotted border-border"
        aria-hidden
      />
      {href && (
        <Link
          to={href}
          className="shrink-0 font-sans text-xs uppercase tracking-wide text-link transition-colors hover:text-highlight"
        >
          More
        </Link>
      )}
    </div>
  )
}
