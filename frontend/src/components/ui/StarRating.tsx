import { useId } from 'react'

const POINTED_STAR_PATH = 'M11.82 1.8 Q12 1.25 12.18 1.8 L14.16 7.97 Q14.34 8.52 14.92 8.52 L21.47 8.52 Q22.05 8.52 21.58 8.86 L16.26 12.73 Q15.79 13.07 15.97 13.65 L18.04 20.17 Q18.22 20.75 17.75 20.41 L12.47 16.52 Q12 16.18 11.53 16.52 L6.25 20.41 Q5.78 20.75 5.96 20.17 L8.03 13.65 Q8.21 13.07 7.74 12.73 L2.42 8.86 Q1.95 8.52 2.53 8.52 L9.08 8.52 Q9.66 8.52 9.84 7.97Z'

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
  const clipId = useId().replaceAll(':', '')
  
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24">
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={`${fill * 100}%`} height="24" />
        </clipPath>
      </defs>
      <path
        d={POINTED_STAR_PATH}
        className="fill-bg stroke-dust"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      {fill > 0 && (
        <path
          d={POINTED_STAR_PATH}
          className="fill-stars"
          clipPath={`url(#${clipId})`}
        />
      )}
      <path
        d={POINTED_STAR_PATH}
        className={fill > 0 ? 'fill-transparent stroke-stars' : 'fill-transparent stroke-dust'}
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
    </svg>
  )
}
