/* eslint-disable react-refresh/only-export-components */
import { Link, createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  createReviewComment,
  getReview,
  listReviewComments,
  type ReviewComment,
} from '../api/reviews'
import { queryKeys } from '../api/queryKeys'
import useAuth from '../auth/useAuth'
import ReviewVoteControls from '../components/features/reviews/ReviewVoteControls'
import { formatAuthors, formatReviewDate } from '../components/features/reviews/reviewDisplay'
import { toStarRating } from '../components/features/books/rating'
import StarRating from '../components/ui/StarRating'
import ReviewerAvatar from '../components/features/reviews/ReviewerAvatar'

export const Route = createFileRoute('/reviews_/$reviewId')({
  component: ReviewPage,
})

function ReviewComments({ reviewId }: { reviewId: string }) {
  const { accessToken, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const commentsQuery = useQuery({
    queryKey: queryKeys.reviews.comments(reviewId),
    queryFn: () => listReviewComments(reviewId),
  })
  const comments = commentsQuery.data ?? []
  const createCommentMutation = useMutation({
    mutationFn: (commentBody: string) => createReviewComment(accessToken!, reviewId, { body: commentBody }),
    onSuccess: comment => {
      queryClient.setQueryData<ReviewComment[]>(queryKeys.reviews.comments(reviewId), previousComments => [
        ...(previousComments ?? []),
        comment,
      ])
    },
  })
  const isSaving = createCommentMutation.isPending
  const trimmedBody = body.trim()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!accessToken) {
      setError('Log in to reply.')
      return
    }

    if (!trimmedBody) {
      setError('Reply cannot be empty.')
      return
    }

    setError(null)
    try {
      await createCommentMutation.mutateAsync(trimmedBody)
      setBody('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to post your reply.')
    }
  }

  return (
    <section className="mt-8 border-t border-border pt-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-2">
        <h2 className="font-sans text-xs uppercase tracking-wide text-accent">
          Replies ({comments.length.toLocaleString()})
        </h2>
      </div>

      {commentsQuery.isPending ? (
        <p className="font-serif italic text-sm text-sepia">Loading replies...</p>
      ) : commentsQuery.error ? (
        <p role="alert" className="font-serif italic text-sm text-sepia">
          {commentsQuery.error instanceof Error ? commentsQuery.error.message : 'Unable to load replies.'}
        </p>
      ) : comments.length === 0 ? (
        <p className="font-serif italic text-sm text-sepia">No replies yet.</p>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => (
            <article key={comment.id} className="border-b border-border pb-4 last:border-b-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Link
                  to="/users/$username"
                  params={{ username: comment.author.username }}
                  className="flex gap-2 items-center"
                >
                  <ReviewerAvatar
                    avatarUrl={comment.author.avatar_url}
                    linkToProfile={false}
                    username={comment.author.username}
                  />
                  <p className="wrap-break-word font-sans text-sm text-link hover:text-highlight">
                    {comment.author.username}
                  </p>
                </Link>
                <time className="font-sans text-xs text-dust" dateTime={comment.created_at}>
                  {formatReviewDate(comment.created_at)}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap wrap-break-word leading-6 text-ink">
                {comment.body}
              </p>
            </article>
          ))}
        </div>
      )}

      <div className="mt-6">
        {isAuthenticated ? (
          <form onSubmit={event => void handleSubmit(event)} className="max-w-3xl">
            <label className="flex flex-col gap-2">
              <span className="font-sans text-xs uppercase tracking-wide text-sepia">Reply</span>
              <textarea
                value={body}
                disabled={isSaving}
                maxLength={5000}
                rows={4}
                onChange={event => setBody(event.currentTarget.value)}
                className="w-full resize-y rounded-xs border border-border bg-bg px-3 py-2 font-serif text-base leading-6 text-ink outline-none transition-colors placeholder:text-sepia focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="Write a reply..."
              />
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isSaving || trimmedBody.length === 0}
                className="rounded-xs border border-accent bg-accent px-3 py-1.5 font-sans text-xs uppercase tracking-wide text-bg transition-colors hover:bg-highlight disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Posting...' : 'Post reply'}
              </button>
              {error && (
                <p role="alert" className="font-sans text-xs text-link">
                  {error}
                </p>
              )}
            </div>
          </form>
        ) : (
          <p className="font-sans text-sm text-sepia">
            <Link to="/login" className="text-link underline underline-offset-2 decoration-accent hover:text-highlight">
              Log in
            </Link>
            {' '}to reply.
          </p>
        )}
      </div>
    </section>
  )
}

function ReviewPage() {
  const { reviewId } = Route.useParams()
  const reviewQuery = useQuery({
    queryKey: queryKeys.reviews.detail(reviewId),
    queryFn: () => getReview(reviewId),
  })
  const review = reviewQuery.data ?? null
  const starRating = toStarRating(review?.rating)
  const error = reviewQuery.error instanceof Error
    ? reviewQuery.error.message
    : reviewQuery.error
    ? 'Unable to load this review.'
    : null

  if (reviewQuery.isPending) {
    return (
      <div className="pb-8">
        <p className="font-serif italic text-sepia text-sm">Loading review...</p>
      </div>
    )
  }

  if (error || !review) {
    return (
      <div className="pb-8">
        <p className="font-serif italic text-sepia text-sm mb-3">{error ?? 'Review not found.'}</p>
        <Link
          to="/reviews"
          className="font-sans text-xs uppercase tracking-wide text-link hover:text-highlight transition-colors"
        >
          Back to reviews
        </Link>
      </div>
    )
  }

  return (
    <div className="pb-8">
      <div className="mb-6 border-b border-border pb-4">
        <Link
          to="/reviews"
          className="font-sans text-xs uppercase tracking-wide text-link hover:text-highlight transition-colors"
        >
          Reviews
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            to="/users/$username"
            params={{ username: review.reviewer.username }}
            aria-label={`View ${review.reviewer.username}'s profile`}
            className="group flex min-w-0 items-center gap-2"
          >
            <ReviewerAvatar
              avatarUrl={review.reviewer.avatar_url}
              linkToProfile={false}
              username={review.reviewer.username}
            />
            <span className="wrap-break-word font-sans text-sepia group-hover:underline">
              {review.reviewer.username}
            </span>
          </Link>

          <time
            className="font-sans text-sepia/70"
            dateTime={review.created_at}
          >
            on {formatReviewDate(review.created_at)}
          </time>
        </div>
      </div>

      <article className="grid gap-6 lg:grid-cols-[160px_minmax(0,1fr)]">
        <aside className="self-start">
          <Link
            to="/book/$bookId"
            params={{ bookId: String(review.book.id) }}
            className="block w-32 overflow-hidden rounded-xs border border-border bg-surface"
          >
            <div className="aspect-2/3">
              {review.book.cover ? (
                <img
                  src={review.book.cover.url}
                  alt={`${review.book.display_title} cover`}
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
          </Link>
        </aside>

        <div className="min-w-0">
          <Link
            to="/book/$bookId"
            params={{ bookId: String(review.book.id) }}
            className="wrap-break-word font-serif text-2xl font-medium leading-tight text-ink transition-colors hover:text-highlight"
          >
            {review.book.display_title}
          </Link>
          <p className="mt-1 wrap-break-word font-serif text-sm italic text-sepia">
            {formatAuthors(review.book)}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {starRating != null && (
              <div className="flex items-center gap-2">
                <StarRating rating={starRating} size={16} />
                <span className="font-sans text-xs text-sepia">{starRating.toFixed(1)}</span>
              </div>
            )}
            {review.contains_spoilers && (
              <span className="rounded-xs border border-border px-1.5 py-0.5 font-sans text-[10px] uppercase tracking-wide text-sepia">
                Spoilers
              </span>
            )}
          </div>

          <div className="mt-5 max-w-3xl whitespace-pre-wrap wrap-break-word text-base leading-7 text-ink">
            {review.body}
          </div>

          <ReviewVoteControls review={review} />

          <ReviewComments reviewId={reviewId} />
        </div>
      </article>
    </div>
  )
}
