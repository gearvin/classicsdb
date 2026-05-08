import { useId, useState } from 'react'

const POINTED_STAR_PATH = 'M11.82 1.8 Q12 1.25 12.18 1.8 L14.16 7.97 Q14.34 8.52 14.92 8.52 L21.47 8.52 Q22.05 8.52 21.58 8.86 L16.26 12.73 Q15.79 13.07 15.97 13.65 L18.04 20.17 Q18.22 20.75 17.75 20.41 L12.47 16.52 Q12 16.18 11.53 16.52 L6.25 20.41 Q5.78 20.75 5.96 20.17 L8.03 13.65 Q8.21 13.07 7.74 12.73 L2.42 8.86 Q1.95 8.52 2.53 8.52 L9.08 8.52 Q9.66 8.52 9.84 7.97Z'

interface StarRatingInputProps {
  disabled?: boolean
  label?: string
  onRate: (rating: number) => void
  rating: number | null
}

export default function StarRatingInput({
  disabled = false,
  label = 'Rate this book',
  onRate,
  rating,
}: StarRatingInputProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const previewRating = hoverRating ?? rating
  const activeRating = previewRating ?? 0

  return (
    <div
      className="flex items-center gap-1"
      aria-label={label}
      role="radiogroup"
      onMouseLeave={() => setHoverRating(null)}
    >
      {Array.from({ length: 5 }, (_, index) => {
        const starNumber = index + 1
        const fullRating = starNumber * 2
        const halfRating = fullRating - 1
        const fill = Math.min(Math.max((activeRating - index * 2) / 2, 0), 1)
        const isPreviewing = hoverRating != null && fill > 0

        return (
          <div key={starNumber} className="group relative h-8 w-8 text-stars">
            <RatingStar fill={fill} isPreviewing={isPreviewing} />
            <button
              type="button"
              disabled={disabled}
              aria-checked={rating === halfRating}
              aria-label={`Rate ${starNumber - 0.5} stars`}
              role="radio"
              title={`Rate ${starNumber - 0.5} stars`}
              onFocus={() => setHoverRating(halfRating)}
              onMouseEnter={() => setHoverRating(halfRating)}
              onClick={() => onRate(halfRating)}
              className="absolute inset-y-0 left-0 w-1/2 rounded-l-[3px] focus:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed"
            />
            <button
              type="button"
              disabled={disabled}
              aria-checked={rating === fullRating}
              aria-label={`Rate ${starNumber} stars`}
              role="radio"
              title={`Rate ${starNumber} stars`}
              onFocus={() => setHoverRating(fullRating)}
              onMouseEnter={() => setHoverRating(fullRating)}
              onClick={() => onRate(fullRating)}
              className="absolute inset-y-0 right-0 w-1/2 rounded-r-[3px] focus:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed"
            />
          </div>
        )
      })}
    </div>
  )
}

function RatingStar({ fill, isPreviewing }: { fill: number; isPreviewing: boolean }) {
  const clipId = useId().replaceAll(':', '')
  const fillWidth = `${fill * 100}%`
  const activeStroke = isPreviewing ? 'stroke-[#b66a2a]' : 'stroke-stars'

  return (
    <svg
      aria-hidden="true"
      className="h-8 w-8 overflow-visible transition-transform group-hover:scale-105 group-has-[:disabled]:opacity-50 group-has-[:disabled]:group-hover:scale-100"
      viewBox="0 0 24 24"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={fillWidth} height="24" />
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
          clipPath={`url(#${clipId})`}
          className={isPreviewing ? 'fill-[#b66a2a]' : 'fill-stars'}
        />
      )}
      {fill > 0 && (
        <path
          d={POINTED_STAR_PATH}
          className={`fill-transparent ${activeStroke}`}
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}
