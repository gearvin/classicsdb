import { Link } from "@tanstack/react-router";

export default function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-baseline gap-0 mb-3">
      <span className="text-sm font-semibold text-sepia shrink-0">
        {title}
      </span>
      {/* dotted rule */}
      <span
        className="flex-1 mx-3 border-b-2 border-dotted border-border"
        aria-hidden
      />
      <Link
        to={href}
        className="text-sm font-semibold text-sepia shrink-0 hover:text-ink"
      >
        More
      </Link>
    </div>
  )
}