// NOVA — in-memory SSE broadcaster for "new articles" notifications.
//
// Local-first and single-user, so no broker/Redis is needed: the scheduler already
// holds the full fetch result (per-source counts + failures), we simply forward it
// to every connected EventSource. Keeping this in memory also means a server
// restart drops listeners — the browser reconnects on its own.

const HEARTBEAT_MS = 25000

const clients = new Set()
let heartbeat = null
let lastUpdate = null

function frame(event, payload) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
}

function stopHeartbeat() {
  if (!heartbeat) return
  clearInterval(heartbeat)
  heartbeat = null
}

function startHeartbeat() {
  if (heartbeat) return
  heartbeat = setInterval(() => {
    for (const res of [...clients]) {
      try {
        res.write(': ping\n\n')
      } catch {
        clients.delete(res)
      }
    }
  }, HEARTBEAT_MS)
  // Never keep the process alive just for the keep-alive timer.
  if (typeof heartbeat.unref === 'function') heartbeat.unref()
}

function addClient(req, res) {
  res.setHeader('Content-Type', 'text/event-stream')
  // `no-transform` also tells the compression middleware to leave the stream alone.
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  if (typeof res.flushHeaders === 'function') res.flushHeaders()

  clients.add(res)
  startHeartbeat()
  res.write(frame('ready', { ok: true, lastUpdate, clients: clients.size }))

  const cleanup = () => {
    clients.delete(res)
    if (clients.size === 0) stopHeartbeat()
  }
  req.on?.('close', cleanup)
  req.on?.('error', cleanup)
  res.on?.('close', cleanup)
  return cleanup
}

function broadcast(payload = {}) {
  const data = { at: new Date().toISOString(), ...payload }
  lastUpdate = data
  for (const res of [...clients]) {
    try {
      res.write(frame('update', data))
    } catch {
      clients.delete(res)
    }
  }
  return data
}

// Shapes a fetchAllSources() result into the payload the UI consumes.
function notifyFetch(result = {}, extra = {}) {
  const failed = (result.sources || []).filter((s) => s.error)
  return broadcast({
    newArticles: result.total || 0,
    okSources: result.ok || 0,
    failedSources: result.failed || 0,
    failedSourceNames: failed.map((s) => s.name),
    ...extra
  })
}

function getStatus() {
  return { clients: clients.size, lastUpdate }
}

module.exports = { addClient, broadcast, notifyFetch, getStatus }
