interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-xs bg-border/80 ${className}`}
    />
  )
}

export function SkeletonText({
  className = '',
  lines = 1,
}: SkeletonProps & { lines?: number }) {
  return (
    <div aria-hidden="true" className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={[
            'h-3',
            index === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full',
          ].join(' ')}
        />
      ))}
    </div>
  )
}

export function SkeletonCover({ className = '' }: SkeletonProps) {
  return (
    <Skeleton className={`aspect-2/3 border border-border bg-surface ${className}`} />
  )
}
