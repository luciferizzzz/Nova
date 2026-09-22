import { useState, useEffect, useCallback, useRef } from 'react'
import { getBerita } from '../services/api'

export default function useFeed(params) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const offsetRef = useRef(0)

  const paramsKey = JSON.stringify(params || {})

  const fetchPage = useCallback(
    async (append = false) => {
      setLoading(true)
      try {
        const offset = append ? offsetRef.current : 0
        const data = await getBerita({ ...params, limit: 16, offset })
        offsetRef.current = offset + data.length
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
    fetchPage(false)
  }, [fetchPage])

  const loadMore = () => {
    if (!loading && hasMore) fetchPage(true)
  }

  return { items, loading, error, hasMore, loadMore, refresh: () => fetchPage(false) }
}