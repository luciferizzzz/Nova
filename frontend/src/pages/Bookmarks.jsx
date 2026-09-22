import { useCallback, useEffect, useState } from 'react'
import { getBookmarks, removeBookmark } from '../services/api'
import NewsCard from '../components/NewsCard'
import Loading from '../components/Loading'

export default function Bookmarks() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    getBookmarks()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const remove = async (id) => {
    try {
      await removeBookmark(id)
      setItems((prev) => prev.filter((a) => a.bookmark_id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <Loading />

  return (
    <div className="page">
      <div className="page-head">
        <h2>BOOKMARKS</h2>
        <span className="page-hint">{items.length} saved</span>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {items.length === 0 ? (
        <div className="empty panel">
          No bookmarks yet. Use the bookmark icon on any news card to save articles here.
        </div>
      ) : (
        <div className="news-grid">
          {items.map((a) => (
            <div className="bookmark-wrap" key={a.id}>
              <NewsCard article={{ ...a, bookmarked: true }} bookmarkable={false} />
              <button className="remove-book" onClick={() => remove(a.bookmark_id)}>
                REMOVE
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}