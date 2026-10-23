const express = require('express')
const { addClient, getStatus } = require('../services/liveUpdates')

const router = express.Router()

// Server-Sent Events: one long-lived response per open tab.
// Browser cookies are sent automatically for same-origin EventSource requests,
// so `requireAuth` (mounted in server.js) protects this endpoint like the rest.
router.get('/stream', (req, res) => {
  addClient(req, res)
})

// Small debug/observability helper: is anyone listening, and what was the last update?
router.get('/status', (req, res) => {
  res.json(getStatus())
})

module.exports = router
