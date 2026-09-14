const express = require('express')

const router = express.Router()

router.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'nova',
    time: new Date().toISOString()
  })
})

module.exports = router
