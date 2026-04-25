import StarRating from "../ui/StarRating"

export interface Review {
  id: number
  bookTitle: string
  author: string
  rating: number
  excerpt: string
  reviewer: string
  date: string
  hasMore?: boolean
}

export default function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="flex gap-5 pb-3 border-b border-border">
      {/* cover */}
      <div className="w-20 h-32 shrink-0 bg-bg border border-border" />
      {/* review content */}
      <div className="flex flex-1 flex-col">
        <div className="font-bold text-ink">
          {review.bookTitle}
        </div>
        <div className="text-sepia text-sm mb-2">
          {review.author}
        </div>
        <p className="text-ink text-sm mb-1 whitespace-pre-line">
          {review.excerpt}
          {review.hasMore && (
            <>
              {' '}
              <a href="#" className="italic underline underline-offset-2 decoration-[#B0A890] hover:decoration-sepia">
                read more
              </a>
            </>     
          )}
        </p>
        <div className="mb-2">
          <StarRating rating={review.rating} />
        </div>
        <p className="font-sans text-sm text-dust mt-2">
          <span className="font-medium text-sepia">{review.reviewer}</span>
          {' '}on{' '}
          <span>{review.date}</span>
        </p>
      </div>
    </div>
  )
}