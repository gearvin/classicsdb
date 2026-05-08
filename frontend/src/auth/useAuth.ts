import { useContext } from 'react'
import { AuthContext } from './authContext'

export default function useAuth() {
  const auth = useContext(AuthContext)

  if (auth === null) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return auth
}
