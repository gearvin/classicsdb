import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { clearReviewVote, getMyReviewVote, voteReview, type Review } from '../../../api/reviews'
import { queryKeys } from '../../../api/queryKeys'
import useAuth from '../../../auth/useAuth'

function replaceReview(review: Review) {
  return (reviews?: Review[]) => reviews?.map(item => item.id === review.id ? review : item)
}

export default function ReviewVoteControls({ review }: { review: Review }) {
  const { accessToken, currentUser, isAuthenticated, isLoadingUser } = useAuth()
  const queryClient = useQueryClient()
  const [localVote, setLocalVote] = useState<boolean | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const isOwnReview = currentUser?.id === review.reviewer.id
  const voteQuery = useQuery({
    enabled: accessToken !== null,
    queryKey: queryKeys.reviews.vote(review.id, accessToken),
    queryFn: () => getMyReviewVote(accessToken!, review.id),
  })

  const voteMutation = useMutation({
    mutationFn: (isHelpful: boolean) => voteReview(accessToken!, review.id, { is_helpful: isHelpful }),
    onSuccess: savedReview => {
      queryClient.setQueryData<Review>(queryKeys.reviews.detail(savedReview.id), savedReview)
      queryClient.setQueriesData<Review[]>({ queryKey: queryKeys.reviews.lists() }, replaceReview(savedReview))
    },
  })
  const clearVoteMutation = useMutation({
    mutationFn: () => clearReviewVote(accessToken!, review.id),
    onSuccess: savedReview => {
      queryClient.setQueryData<Review>(queryKeys.reviews.detail(savedReview.id), savedReview)
      queryClient.setQueriesData<Review[]>({ queryKey: queryKeys.reviews.lists() }, replaceReview(savedReview))
    },
  })
  const isSaving = voteMutation.isPending || clearVoteMutation.isPending
  const selectedVote = localVote !== undefined ? localVote : voteQuery.data?.is_helpful ?? null

  if (!isAuthenticated || isLoadingUser || isOwnReview) {
    return null
  }

  async function handleVote(isHelpful: boolean) {
    if (!accessToken) {
      setError('Log in to vote on reviews.')
      return
    }

    if (isOwnReview) {
      setError('You cannot vote on your own review.')
      return
    }

    setError(null)
    try {
      if (selectedVote === isHelpful) {
        const savedReview = await clearVoteMutation.mutateAsync()
        queryClient.setQueryData<Review>(queryKeys.reviews.detail(savedReview.id), savedReview)
        setLocalVote(null)
      } else {
        const savedReview = await voteMutation.mutateAsync(isHelpful)
        queryClient.setQueryData<Review>(queryKeys.reviews.detail(savedReview.id), savedReview)
        setLocalVote(isHelpful)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save your vote.')
    }
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2 font-sans text-xs text-sepia">
        <span>{review.helpful_count.toLocaleString()} helpful</span>
        <span aria-hidden="true">·</span>
        <span>{review.unhelpful_count.toLocaleString()} not helpful</span>
        <button
          type="button"
          aria-pressed={selectedVote === true}
          disabled={isSaving || isOwnReview}
          onClick={() => void handleVote(true)}
          className={[
            'rounded-xs border px-2 py-1 uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50',
            selectedVote === true
              ? 'border-accent bg-accent text-bg'
              : 'border-border text-link hover:border-accent hover:text-highlight',
          ].join(' ')}
        >
          Helpful
        </button>
        <button
          type="button"
          aria-pressed={selectedVote === false}
          disabled={isSaving || isOwnReview}
          onClick={() => void handleVote(false)}
          className={[
            'rounded-xs border px-2 py-1 uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50',
            selectedVote === false
              ? 'border-accent bg-accent text-bg'
              : 'border-border text-link hover:border-accent hover:text-highlight',
          ].join(' ')}
        >
          Not helpful
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 font-sans text-xs leading-4 text-link">
          {error}
        </p>
      )}
    </div>
  )
}
