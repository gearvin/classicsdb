import { apiRequest } from './client'

export interface Language {
  code: string
  name: string
  native_name?: string | null
  is_rtl: boolean
}

export async function listLanguages(): Promise<Language[]> {
  return apiRequest<Language[]>('/api/v1/languages', {
    fallbackErrorMessage: 'Unable to load languages.',
  })
}
