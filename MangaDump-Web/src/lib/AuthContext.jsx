import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, refreshSession, setSessionExpiredHandler } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // true until we know if a session cookie exists

  // On first load, try to restore the session from the HttpOnly refresh cookie
  useEffect(() => {
    let cancelled = false
    refreshSession().then((session) => {
      if (cancelled) return
      setUser(session?.user ?? null)
      setLoading(false)
    })
    setSessionExpiredHandler(() => setUser(null))
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (identifier, password) => {
    const session = await api.auth.login(identifier, password)
    setUser(session.user)
    return session.user
  }, [])

  const register = useCallback(async (payload) => {
    const session = await api.auth.register(payload)
    setUser(session.user)
    return session.user
  }, [])

  const logout = useCallback(async () => {
    await api.auth.logout()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout, isAdmin: !!user?.roles?.includes('Admin') }),
    [user, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
