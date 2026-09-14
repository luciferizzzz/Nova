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
const beritaRoutes = require('./routes/berita')
const sourcesRoutes = require('./routes/sources')
const settingRoutes = require('./routes/setting')
const bookmarksRoutes = require('./routes/bookmarks')
const { requireAuth } = require('./middleware/auth')
const { ensureDefaultSources, fetchAllSources } = require('./services/rssFetcher')
const { startScheduler, stopScheduler } = require('./services/scheduler')

function createServer() {
  const db = initDatabase()
  const app = express()

  app.locals.db = db
  app.locals.novaStatus = {
    server: 'ONLINE',
    database: 'READY',
    rssEngine: 'ONLINE',
    scheduler: 'ONLINE',
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

  app.use('/api/berita', requireAuth, beritaRoutes)
  app.use('/api/sources', requireAuth, sourcesRoutes)
  app.use('/api/setting', requireAuth, settingRoutes)
  app.use('/api/bookmarks', requireAuth, bookmarksRoutes)

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
  const db = app.locals.db

  ensureDefaultSources(db)
  startScheduler(db)

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
    console.log('  ● RSS Engine  FETCHING')
    console.log('  ● Scheduler   ONLINE')
    console.log('')
    console.log('Fetching fresh news (first run)...')
    console.log('')
  })

  fetchAllSources(db)
    .then((result) => {
      app.locals.novaStatus.rssEngine = 'ONLINE'
      console.log('')
      console.log(`News engine ready: ${result.total} new articles from ${result.ok} sources (${result.failed} failed)`)
    })
    .catch((err) => {
      app.locals.novaStatus.rssEngine = 'ERROR'
      console.error(`[NOVA] Initial RSS fetch failed: ${err.message}`)
    })

  server.on('error', (err) => {
    stopScheduler()
    console.error('[NOVA] Server error:', err.message)
    process.exit(1)
  })

  return server
}

if (require.main === module) {
  startServer()
}

module.exports = { createServer, startServer }