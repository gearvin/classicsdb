interface StarRatingProps {
  rating: number
  max?: number
  size?: number
}

export default function StarRating({ rating, max = 5, size = 16 }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5 text-stars" aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => {
        const fill = Math.min(Math.max(rating - i, 0), 1) // 0, 0.5, or 1
        return <Star key={i} fill={fill} size={size} />
      })}
    </div>
  )
}

function Star({ fill, size }: { fill: number; size: number }) {
  const id = `half-${Math.random().toString(36).slice(2, 7)}`
  
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {fill > 0 && fill < 1 && (
        <defs>
          <clipPath id={id}>
            <rect x="0" y="0" width={24 * fill} height="24" />
          </clipPath>
        </defs>
      )}
      {/* filled portion */}
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill="currentColor"
        clipPath={fill > 0 && fill < 1 ? `url(#${id})` : undefined}
        opacity={fill === 0 ? 0 : 1}
      />
    </svg>
  )
}