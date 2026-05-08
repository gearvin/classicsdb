const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  accessToken?: string
  body?: BodyInit | object | null
  fallbackErrorMessage?: string
  skipAuthRefresh?: boolean
}

type AuthRefreshHandler = () => Promise<string | null>

let authRefreshHandler: AuthRefreshHandler | null = null

export function setAuthRefreshHandler(handler: AuthRefreshHandler | null) {
  authRefreshHandler = handler
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { detail?: unknown }
    if (typeof data.detail === 'string') {
      return data.detail
    }
  } catch {
    // Keep the fallback if the server does not return JSON.
  }

  return fallback
}

function isJsonBody(body: ApiRequestOptions['body']): body is object {
  return (
    body !== null &&
    typeof body === 'object' &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams) &&
    !(body instanceof Blob)
  )
}

export async function apiRequest<T>(
  path: string,
  {
    accessToken,
    body,
    fallbackErrorMessage = 'Something went wrong. Please try again.',
    headers,
    skipAuthRefresh = false,
    ...init
  }: ApiRequestOptions = {},
): Promise<T> {
  let requestBody: BodyInit | null | undefined

  if (isJsonBody(body)) {
    requestBody = JSON.stringify(body)
  } else {
    requestBody = body
  }

  const sendRequest = (token?: string | null) => {
    const requestHeaders = new Headers(headers)

    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`)
    }

    if (isJsonBody(body)) {
      requestHeaders.set('Content-Type', 'application/json')
    }

    return fetch(`${API_BASE_URL}${path}`, {
      ...init,
      body: requestBody,
      credentials: init.credentials ?? 'include',
      headers: requestHeaders,
    })
  }

  let response = await sendRequest(accessToken)

  if (response.status === 401 && accessToken && !skipAuthRefresh && authRefreshHandler !== null) {
    const refreshedAccessToken = await authRefreshHandler()
    if (refreshedAccessToken !== null) {
      response = await sendRequest(refreshedAccessToken)
    }
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, fallbackErrorMessage))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
