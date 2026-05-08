import { createContext } from 'react'
import type { AuthUser, RegisterUserInput } from '../api/auth'

export interface AuthContextValue {
  accessToken: string | null
  currentUser: AuthUser | null
  isAuthenticated: boolean
  isLoadingUser: boolean
  isLoggingIn: boolean
  isLoggingOut: boolean
  isRegistering: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (payload: RegisterUserInput) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
