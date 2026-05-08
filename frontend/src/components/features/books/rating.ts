import type { UserBook } from '../../../api/userBooks'

export function formatRating(rating: number | null) {
  return rating == null ? 'No rating' : `${(rating / 2).toFixed(1)} stars`
}

export function toStarRating(rating?: number | null) {
  return rating == null ? null : rating / 2
}

export function getCanReview(userBook: UserBook | null) {
  return userBook?.status === 'read' || userBook?.rating != null
}
