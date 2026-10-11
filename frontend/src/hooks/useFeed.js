import { useState, useEffect, useCallback, useRef } from 'react'
import { getBerita } from '../services/api'

const POLL_MS = 60000

export default function useFeed(params, { poll = false } = {}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [newCount, setNewCount] = useState(0)
  const offsetRef = useRef(0)
  const newestRef = useRef(null)

  const paramsKey = JSON.stringify(params || {})

  const fetchPage = useCallback(
    async (append = false) => {
      setLoading(true)
      try {
        const offset = append ? offsetRef.current : 0
        const data = await getBerita({ ...params, limit: 16, offset })
        offsetRef.current = offset + data.length
        if (!append) {
          newestRef.current = data[0]?.created_at || null
          setNewCount(0)
        }
        setItems((prev) => (append ? [...prev, ...data] : data))
        setHasMore(data.length === 16)
        setError('')
      } catch (err) {
        setError(err.message || 'Failed to load news')
        if (!append) setItems([])
      } finally {
        setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paramsKey]
  )

  useEffect(() => {
    offsetRef.current = 0
    newestRef.current = null
    setNewCount(0)
    fetchPage(false)
  }, [fetchPage])

  useEffect(() => {
    if (!poll) return
    const id = setInterval(async () => {
      if (!newestRef.current) return
      try {
        const data = await getBerita({ ...params, from: newestRef.current, limit: 50 })
        const fresh = data.filter((a) => a.created_at > newestRef.current).length
        setNewCount(fresh)
      } catch {
        // ignore transient poll errors; next tick retries
      }
    }, POLL_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poll, paramsKey])

  const loadMore = () => {
    if (!loading && hasMore) fetchPage(true)
  }

  return { items, loading, error, hasMore, loadMore, refresh: () => fetchPage(false), newCount }
}
