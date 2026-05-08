import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCurrentUser,
  loginWithEmail,
  logoutSession,
  refreshSession,
  registerUser,
  type AuthUser,
  type RegisterUserInput,
} from '../api/auth'
import { setAuthRefreshHandler } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { AuthContext, type AuthContextValue } from './authContext'
import { clearAccessToken, setAccessToken as setStoredAccessToken } from './tokenStore'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isInitializingAuth, setIsInitializingAuth] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null)
  const currentUserQuery = useQuery({
    enabled: accessToken !== null,
    queryKey: queryKeys.auth.currentUser(),
    queryFn: () => getCurrentUser(accessToken!),
  })
  const currentUser = currentUserQuery.data ?? null
  const isLoadingUser = isInitializingAuth || (accessToken !== null && currentUserQuery.isPending)

  const storeToken = useCallback((token: string) => {
    setStoredAccessToken(token)
    setAccessToken(token)
  }, [])

  const clearLocalAuth = useCallback(() => {
    clearAccessToken()
    setAccessToken(null)
    queryClient.removeQueries({ queryKey: queryKeys.auth.currentUser() })
    queryClient.removeQueries({ queryKey: queryKeys.userBooks.mine() })
    queryClient.removeQueries({ queryKey: queryKeys.suggestions.all })
    queryClient.removeQueries({ queryKey: queryKeys.tags.requests.all })
    queryClient.removeQueries({ queryKey: queryKeys.tags.all })
  }, [queryClient])

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const token = await loginWithEmail(email, password)
      const user = await getCurrentUser(token.access_token)
      return { accessToken: token.access_token, user }
    },
    onSuccess: ({ accessToken: nextAccessToken, user }) => {
      storeToken(nextAccessToken)
      queryClient.setQueryData<AuthUser>(queryKeys.auth.currentUser(), user)
    },
  })

  const registerMutation = useMutation({
    mutationFn: async (payload: RegisterUserInput) => {
      await registerUser(payload)
      const token = await loginWithEmail(payload.email, payload.password)
      const user = await getCurrentUser(token.access_token)
      return { accessToken: token.access_token, user }
    },
    onSuccess: ({ accessToken: nextAccessToken, user }) => {
      storeToken(nextAccessToken)
      queryClient.setQueryData<AuthUser>(queryKeys.auth.currentUser(), user)
    },
  })

  const logout = useCallback(async () => {
    setIsLoggingOut(true)
    try {
      await logoutSession().catch(() => undefined)
    } finally {
      clearLocalAuth()
      setIsLoggingOut(false)
    }
  }, [clearLocalAuth])

  useEffect(() => {
    let isCancelled = false

    refreshSession()
      .then(async token => {
        if (isCancelled) {
          return
        }

        storeToken(token.access_token)
        const user = await getCurrentUser(token.access_token)
        if (!isCancelled) {
          queryClient.setQueryData<AuthUser>(queryKeys.auth.currentUser(), user)
        }
      })
      .catch(() => {
        if (!isCancelled) {
          clearLocalAuth()
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsInitializingAuth(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [clearLocalAuth, queryClient, storeToken])

  useEffect(() => {
    setAuthRefreshHandler(async () => {
      if (refreshPromiseRef.current === null) {
        refreshPromiseRef.current = refreshSession()
          .then(token => {
            storeToken(token.access_token)
            return token.access_token
          })
          .catch(() => {
            clearLocalAuth()
            return null
          })
          .finally(() => {
            refreshPromiseRef.current = null
          })
      }

      return refreshPromiseRef.current
    })

    return () => {
      setAuthRefreshHandler(null)
    }
  }, [clearLocalAuth, storeToken])

  useEffect(() => {
    if (currentUserQuery.isError) {
      queueMicrotask(logout)
    }
  }, [currentUserQuery.isError, logout])

  const login = useCallback((email: string, password: string) => {
    return loginMutation.mutateAsync({ email, password }).then(() => undefined)
  }, [loginMutation])

  const register = useCallback((payload: RegisterUserInput) => {
    return registerMutation.mutateAsync(payload).then(() => undefined)
  }, [registerMutation])

  const value = useMemo<AuthContextValue>(() => ({
    accessToken,
    currentUser,
    isAuthenticated: accessToken !== null,
    isLoadingUser,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut,
    isRegistering: registerMutation.isPending,
    login,
    logout,
    register,
  }), [
    accessToken,
    currentUser,
    isLoadingUser,
    login,
    loginMutation.isPending,
    logout,
    isLoggingOut,
    register,
    registerMutation.isPending,
  ])

  return (
    <AuthContext value={value}>
      {children}
    </AuthContext>
  )
}
