import { apiRequest } from './client'

export type EntryTargetType = 'author' | 'book' | 'book_edition'
export type EntryAction = 'create' | 'update'
export type EntrySuggestionStatus = 'pending' | 'approved' | 'rejected'

export interface EntrySuggestion {
  id: number
  suggested_by_id: number
  reviewed_by_id?: number | null
  target_type: EntryTargetType
  action: EntryAction
  target_id?: number | null
  payload: Record<string, unknown>
  status: EntrySuggestionStatus
  submitter_note: string
  reviewer_note: string
  created_at: string
  updated_at: string
  reviewed_at?: string | null
}

export interface CreateEntrySuggestionInput {
  target_type: EntryTargetType
  action: EntryAction
  target_id?: number | null
  payload: Record<string, unknown>
  submitter_note?: string
}

export interface EntryRevision {
  id: number
  entity_type: EntryTargetType
  entity_id: number
  action: EntryAction
  changed_by_id: number
  suggestion_id?: number | null
  before_payload?: Record<string, unknown> | null
  after_payload: Record<string, unknown>
  change_note: string
  created_at: string
}

export async function createSuggestion(
  accessToken: string,
  payload: CreateEntrySuggestionInput,
): Promise<EntrySuggestion> {
  return apiRequest<EntrySuggestion>('/api/v1/suggestions', {
    accessToken,
    method: 'POST',
    body: payload,
    fallbackErrorMessage: 'Unable to submit this suggestion.',
  })
}

export async function listMySuggestions(accessToken: string): Promise<EntrySuggestion[]> {
  return apiRequest<EntrySuggestion[]>('/api/v1/suggestions/me', {
    accessToken,
    fallbackErrorMessage: 'Unable to load your suggestions.',
  })
}

export async function getSuggestion(
  accessToken: string,
  suggestionId: string | number,
): Promise<EntrySuggestion> {
  return apiRequest<EntrySuggestion>(`/api/v1/suggestions/${suggestionId}`, {
    accessToken,
    fallbackErrorMessage: 'Unable to load this suggestion.',
  })
}

export async function listAdminSuggestions(
  accessToken: string,
  status?: EntrySuggestionStatus,
): Promise<EntrySuggestion[]> {
  const params = new URLSearchParams()
  if (status) {
    params.set('suggestion_status', status)
  }

  return apiRequest<EntrySuggestion[]>(`/api/v1/admin/suggestions${params.size ? `?${params.toString()}` : ''}`, {
    accessToken,
    fallbackErrorMessage: 'Unable to load suggestions.',
  })
}

export async function reviewSuggestion(
  accessToken: string,
  suggestionId: string | number,
  payload: { status: Exclude<EntrySuggestionStatus, 'pending'>; reviewer_note?: string },
): Promise<EntrySuggestion> {
  return apiRequest<EntrySuggestion>(`/api/v1/admin/suggestions/${suggestionId}/review`, {
    accessToken,
    method: 'POST',
    body: payload,
    fallbackErrorMessage: 'Unable to review this suggestion.',
  })
}
