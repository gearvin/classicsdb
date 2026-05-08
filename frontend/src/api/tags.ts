import { apiRequest } from './client'
import type { BookSummary } from './books'

export type TagVoteValue = -1 | 1 | 2 | 3
export type SpoilerLevel = 0 | 1 | 2
export type TagRequestStatus = 'pending' | 'approved' | 'rejected'

export interface TagRead {
  id: number
  name: string
  slug: string
  description: string
  aliases: string
  default_spoiler_level: SpoilerLevel
  is_applicable: boolean
  parent_id?: number | null
  created_by_id?: number | null
  approved_by_id?: number | null
  created_at: string
  updated_at: string
}

export interface TagTreeNode extends TagRead {
  children: TagTreeNode[]
}

export interface BookTagAggregate {
  tag: TagRead
  ancestors: TagRead[]
  score: number
  vote_count: number
  positive_vote_count: number
  downvote_count: number
  spoiler_vote_count: number
  aggregate_spoiler_level: SpoilerLevel
  average_positive_rating?: number | null
  current_user_vote?: number | null
  current_user_spoiler_level?: SpoilerLevel | null
}

export interface TaggedBookSummary {
  book: BookSummary
  relevance_score: number
  vote_count: number
  positive_vote_count: number
  downvote_count: number
  spoiler_vote_count: number
  aggregate_spoiler_level: SpoilerLevel
  average_positive_rating?: number | null
}

export interface TagDetail extends TagRead {
  parent?: TagRead | null
  children: TagRead[]
  books: TaggedBookSummary[]
}

export interface BookTagVoteRead {
  id: number
  book_id: number
  tag_id: number
  user_id: number
  vote: TagVoteValue
  spoiler_level: SpoilerLevel
  created_at: string
  updated_at: string
}

export interface CreateTagRequestInput {
  proposed_name: string
  parent_id?: number | null
  description?: string
  submitter_note?: string
}

export interface CreateTagInput {
  name: string
  parent_id?: number | null
  description?: string
  aliases?: string
  default_spoiler_level?: SpoilerLevel
  is_applicable?: boolean
}

export interface TagRequestRead {
  id: number
  requested_by_id: number
  reviewed_by_id?: number | null
  parent_id?: number | null
  proposed_name: string
  proposed_slug: string
  description: string
  submitter_note: string
  reviewer_note: string
  status: TagRequestStatus
  created_tag_id?: number | null
  created_at: string
  updated_at: string
  reviewed_at?: string | null
}

export function flattenTagTree(tags: TagTreeNode[]): Array<TagRead & { path: string }> {
  const flattened: Array<TagRead & { path: string }> = []

  function visit(tag: TagTreeNode, ancestors: string[]) {
    const pathParts = [...ancestors, tag.name]
    flattened.push({ ...tag, path: pathParts.join(' > ') })
    tag.children.forEach(child => visit(child, pathParts))
  }

  tags.forEach(tag => visit(tag, []))
  return flattened
}

export async function listTags(): Promise<TagTreeNode[]> {
  return apiRequest<TagTreeNode[]>('/api/v1/tags', {
    fallbackErrorMessage: 'Unable to load tags.',
  })
}

export async function getTag(
  tagId: string | number,
  showAll = false,
  showSpoilers = false,
): Promise<TagDetail> {
  const params = new URLSearchParams()
  if (showAll) {
    params.set('show_all', 'true')
  }
  if (showSpoilers) {
    params.set('show_spoilers', 'true')
  }

  return apiRequest<TagDetail>(`/api/v1/tags/${tagId}${params.size ? `?${params.toString()}` : ''}`, {
    fallbackErrorMessage: 'Unable to load this tag.',
  })
}

export async function listBookTags(
  bookId: string | number,
  accessToken?: string | null,
  showAll = false,
  showSpoilers = false,
): Promise<BookTagAggregate[]> {
  const params = new URLSearchParams()
  if (showAll) {
    params.set('show_all', 'true')
  }
  if (showSpoilers) {
    params.set('show_spoilers', 'true')
  }

  return apiRequest<BookTagAggregate[]>(`/api/v1/books/${bookId}/tags${params.size ? `?${params.toString()}` : ''}`, {
    accessToken: accessToken ?? undefined,
    fallbackErrorMessage: 'Unable to load book tags.',
  })
}

export async function voteBookTag(
  bookId: string | number,
  tagId: string | number,
  vote: TagVoteValue,
  spoilerLevel: SpoilerLevel,
  accessToken: string,
): Promise<BookTagVoteRead> {
  return apiRequest<BookTagVoteRead>(`/api/v1/books/${bookId}/tags/${tagId}/vote`, {
    accessToken,
    method: 'PUT',
    body: { vote, spoiler_level: spoilerLevel },
    fallbackErrorMessage: 'Unable to save this tag vote.',
  })
}

export async function clearBookTagVote(
  bookId: string | number,
  tagId: string | number,
  accessToken: string,
): Promise<void> {
  await apiRequest<void>(`/api/v1/books/${bookId}/tags/${tagId}/vote`, {
    accessToken,
    method: 'DELETE',
    fallbackErrorMessage: 'Unable to clear this tag vote.',
  })
}

export async function createTagRequest(
  accessToken: string,
  payload: CreateTagRequestInput,
): Promise<TagRequestRead> {
  return apiRequest<TagRequestRead>('/api/v1/tag-requests', {
    accessToken,
    method: 'POST',
    body: payload,
    fallbackErrorMessage: 'Unable to submit this tag request.',
  })
}

export async function createAdminTag(
  accessToken: string,
  payload: CreateTagInput,
): Promise<TagRead> {
  return apiRequest<TagRead>('/api/v1/admin/tags', {
    accessToken,
    method: 'POST',
    body: payload,
    fallbackErrorMessage: 'Unable to create this tag.',
  })
}

export async function listMyTagRequests(accessToken: string): Promise<TagRequestRead[]> {
  return apiRequest<TagRequestRead[]>('/api/v1/tag-requests/me', {
    accessToken,
    fallbackErrorMessage: 'Unable to load your tag requests.',
  })
}

export async function listAdminTagRequests(
  accessToken: string,
  status?: TagRequestStatus,
): Promise<TagRequestRead[]> {
  const params = new URLSearchParams()
  if (status) {
    params.set('request_status', status)
  }

  return apiRequest<TagRequestRead[]>(`/api/v1/admin/tag-requests${params.size ? `?${params.toString()}` : ''}`, {
    accessToken,
    fallbackErrorMessage: 'Unable to load tag requests.',
  })
}

export async function reviewTagRequest(
  accessToken: string,
  tagRequestId: string | number,
  payload: { status: Exclude<TagRequestStatus, 'pending'>; reviewer_note?: string },
): Promise<TagRequestRead> {
  return apiRequest<TagRequestRead>(`/api/v1/admin/tag-requests/${tagRequestId}/review`, {
    accessToken,
    method: 'POST',
    body: payload,
    fallbackErrorMessage: 'Unable to review this tag request.',
  })
}
