const express = require('express')

const { buildAnalyticsSummary } = require('../services/analyticsEngine')

const router = express.Router()

// Analytics Dashboard (Phase 8 — Analytics & Insights, Fitur D).
// Ringkasan read-only yang merangkum Fitur A (corroboration), B (velocity), dan
// C (kategori) dalam satu respons. Memakai data/service yang sudah ada.
router.get('/summary', (req, res) => {
  res.json(
    buildAnalyticsSummary(req.db, {
      hours: req.query.hours,
      days: req.query.days,
      limit: req.query.limit
    })
  )
})

module.exports = router
