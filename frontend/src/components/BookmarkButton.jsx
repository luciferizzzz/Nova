import { useState } from 'react'
import { toggleBookmark } from '../services/api'
import { BookmarkIcon } from './icons'

export default function BookmarkButton({ articleId, initial = false, size = 15 }) {
  const [active, setActive] = useState(!!initial)
  const [busy, setBusy] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    try {
      const res = await toggleBookmark(articleId)
      setActive(!!res.bookmarked)
    } catch {
      // silent
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      className={`icon-btn bookmark-btn ${active ? 'active' : ''}`}
      onClick={handle}
      title={active ? 'Remove bookmark' : 'Bookmark'}
      aria-label={active ? 'Remove bookmark' : 'Bookmark'}
    >
      <BookmarkIcon size={size} filled={active} />
    </button>
  )
}