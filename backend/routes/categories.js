const express = require('express')

const { extractCategories } = require('../services/categoryEngine')

const router = express.Router()

// Categories page (Phase 8 — Analytics & Insights, Fitur C).
// Agregasi read-only per kategori: artikel, sumber, negara, tren, sparkline,
// sumber teratas, dan headline terbaru. Memakai `berita` yang sudah ada.
router.get('/', (req, res) => {
  res.json(extractCategories(req.db, { days: req.query.days, limit: req.query.limit }))
})

module.exports = router
