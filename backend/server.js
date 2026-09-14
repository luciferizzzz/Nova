const path = require('path')
const fs = require('fs')
const express = require('express')
const compression = require('compression')
const helmet = require('helmet')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const config = require('./config')
const { initDatabase } = require('./database/db')
const statusRoutes = require('./routes/status')
const authRoutes = require('./routes/auth')
const { requireAuth } = require('./middleware/auth')

function createServer() {
  const db = initDatabase()
  const app = express()

  app.locals.novaStatus = {
    server: 'ONLINE',
    database: 'READY',
    rssEngine: 'STANDBY',
    scheduler: 'STANDBY',
    url: `http://${config.host}:${config.port}`
  }

  app.use(helmet())
  app.use(compression())
  app.use(cors())
  app.use(express.json())
  app.use(cookieParser())

  app.use((req, res, next) => {
    req.db = db
    next()
  })

  app.use(statusRoutes)
  app.use(authRoutes)

  app.get('/api/status', requireAuth, (req, res) => {
    res.json(req.app.locals.novaStatus)
  })

  const frontendDist = path.join(config.root, 'frontend', 'dist')
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist))
    app.get(/^\/(?!api\/).*/, (req, res) => {
      res.sendFile(path.join(frontendDist, 'index.html'))
    })
  } else {
    app.get('/', (req, res) => {
      res.send('NOVA is running. Frontend not built yet.')
    })
  }

  app.use((err, req, res, next) => {
    console.error('[NOVA] Unhandled error:', err)
    res.status(500).json({ error: 'Internal server error' })
  })

  return app
}

function startServer() {
  const app = createServer()
  const server = app.listen(config.port, config.host, () => {
    console.log('')
    console.log('NOVA is running.')
    console.log('')
    console.log('Local News Intelligence System')
    console.log('')
    console.log('Open NOVA:')
    console.log(`http://${config.host}:${config.port}`)
    console.log('')
    console.log('Status:')
    console.log('  ● Server      ONLINE')
    console.log('  ● Database    READY')
    console.log('  ● RSS Engine  STANDBY')
    console.log('  ● Scheduler   STANDBY')
    console.log('')
  })

  server.on('error', (err) => {
    console.error('[NOVA] Server error:', err.message)
    process.exit(1)
  })

  return server
}

if (require.main === module) {
  startServer()
}

module.exports = { createServer, startServer }
