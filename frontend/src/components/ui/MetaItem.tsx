import type { ReactNode } from 'react'

export default function MetaItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
      <p className="flex w-full max-w-42 shrink-0 items-baseline gap-2">
        <span className="font-sans text-xs text-accent uppercase tracking-wide">
          {label}
        </span>
        <span
          className="flex-1 border-b border-dotted border-highlight"
          aria-hidden
        />
      </p>
      <div className="min-w-0 break-words">
        {typeof value === 'string' ? <p className="text-ink break-words">{value}</p> : value}
      </div>
    </div>
  )
}
