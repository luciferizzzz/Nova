import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'

const LiveUpdatesContext = createContext(null)

// Listens to /api/live/stream (SSE) and keeps a single source of truth for
// "how many articles arrived since the user last acknowledged them".
//
// Rules (see Ideas.md): never auto-refresh a feed while it is being read.
// The count is only a notification; loading new content stays a user action.
export function LiveUpdatesProvider({ children }) {
  const { authed } = useAuth()
  const [newCount, setNewCount] = useState(0)
  const [awayCount, setAwayCount] = useState(0)
  const [failedSources, setFailedSources] = useState([])
  const [lastUpdate, setLastUpdate] = useState(null)
  const [connected, setConnected] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)
  const awayRef = useRef(0)
  const baseTitleRef = useRef(typeof document !== 'undefined' ? document.title : 'NOVA')

  useEffect(() => {
    if (!authed) return undefined

    let closed = false
    let retryDelay = 1000
    let retryTimer = null
    let source = null

    const connect = () => {
      if (closed) return
      source = new EventSource('/api/live/stream')

      source.addEventListener('ready', () => {
        setConnected(true)
        retryDelay = 1000
      })

      source.addEventListener('update', (event) => {
        let data
        try {
          data = JSON.parse(event.data)
        } catch {
          return
        }
        setLastUpdate(data)
        setFailedSources(Array.isArray(data.failedSourceNames) ? data.failedSourceNames : [])

        const added = Number(data.newArticles) || 0
        if (added <= 0) return
        setNewCount((count) => count + added)
        if (document.visibilityState === 'hidden') {
          awayRef.current += added
          setAwayCount(awayRef.current)
        }
      })

      source.onerror = async () => {
        setConnected(false)
        source?.close()
        if (closed) return
        // A dead session returns 401 forever; reconnect only while still signed in.
        try {
          const res = await fetch('/api/auth/status')
          const data = await res.json()
          if (!data.authenticated) {
            closed = true
            return
          }
        } catch {
          // transient network failure — fall through and retry
        }
        retryTimer = setTimeout(connect, retryDelay)
        retryDelay = Math.min(retryDelay * 2, 30000)
      }
    }

    connect()

    return () => {
      closed = true
      clearTimeout(retryTimer)
      source?.close()
      setConnected(false)
    }
  }, [authed])

  useEffect(() => {
    document.title = newCount > 0 ? `● (${newCount}) ${baseTitleRef.current}` : baseTitleRef.current
  }, [newCount])

  const clear = useCallback(() => {
    setNewCount(0)
    setAwayCount(0)
    awayRef.current = 0
  }, [])

  const requestRefresh = useCallback(() => {
    setRefreshToken((token) => token + 1)
  }, [])

  return (
    <LiveUpdatesContext.Provider
      value={{ newCount, awayCount, failedSources, lastUpdate, connected, refreshToken, clear, requestRefresh }}
    >
      {children}
    </LiveUpdatesContext.Provider>
  )
}

export function useLiveUpdates() {
  const context = useContext(LiveUpdatesContext)
  if (!context) throw new Error('useLiveUpdates must be used inside LiveUpdatesProvider')
  return context
}
