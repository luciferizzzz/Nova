import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { login as apiLogin, logout as apiLogout } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [authed, setAuthed] = useState(null)

  useEffect(() => {
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((d) => setAuthed(!!d.authenticated))
      .catch(() => setAuthed(false))
  }, [])

  const login = useCallback(async (password) => {
    await apiLogin(password)
    setAuthed(true)
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch {
      // best effort
    }
    setAuthed(false)
  }, [])

  return (
    <AuthContext.Provider value={{ authed, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}