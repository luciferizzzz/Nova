const express = require('express')

const router = express.Router()

router.get('/', (req, res) => {
  const bookmarks = req.db
    .prepare(
      `
      SELECT b.*, (b.id IS NOT NULL) AS bookmarked
      FROM bookmarks b
      JOIN berita a ON a.id = b.article_id
      ORDER BY b.created_at DESC
    `
    )
    .all()
  res.json(bookmarks)
})

router.post('/', (req, res) => {
  const articleId = parseInt(req.body?.article_id, 10)
  if (!Number.isInteger(articleId)) {
    return res.status(400).json({ error: 'article_id required' })
  }

  const article = req.db.prepare('SELECT id FROM berita WHERE id = ?').get(articleId)
  if (!article) return res.status(404).json({ error: 'Article not found' })

  const existing = req.db.prepare('SELECT id FROM bookmarks WHERE article_id = ?').get(articleId)
  if (existing) {
    req.db.prepare('DELETE FROM bookmarks WHERE article_id = ?').run(articleId)
    return res.json({ success: true, bookmarked: false })
  }

  req.db.prepare('INSERT INTO bookmarks (article_id) VALUES (?)').run(articleId)
  res.json({ success: true, bookmarked: true })
})

router.delete('/:id', (req, res) => {
  const result = req.db.prepare('DELETE FROM bookmarks WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Bookmark not found' })
  res.json({ success: true })
})

module.exports = router