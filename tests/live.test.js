#!/usr/bin/env node
// Smoke test — Live updates (SSE).
//
// Bagian 1 (offline): broadcaster in-memory diuji langsung dengan response palsu.
// Bagian 2 (server hidup): guard 401, handshake `event: ready`, dan /api/live/status.
//
// Jalankan server dulu: npm start / nova, lalu `npm run test:live`.

const BASE = process.env.NOVA_URL || 'http://localhost:3000'
let cookie = ''
let pass = 0
let fail = 0

function check(label, cond, detail) {
  if (cond) {
    pass++
    console.log(`  PASS  ${label}${detail ? ' — ' + detail : ''}`)
  } else {
    fail++
    console.log(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`)
  }
}

function parseFrame(chunk) {
  const lines = String(chunk).split('\n')
  const event = (lines.find((l) => l.startsWith('event: ')) || '').slice(7)
  const dataLine = lines.find((l) => l.startsWith('data: '))
  let data = null
  try {
    data = dataLine ? JSON.parse(dataLine.slice(6)) : null
  } catch {
    data = null
  }
  return { event, data, raw: String(chunk) }
}

function fakeResponse() {
  return {
    headers: {},
    chunks: [],
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value
    },
    flushHeaders() {},
    write(chunk) {
      this.chunks.push(chunk)
      return true
    }
  }
}

async function call(method, path, body, extraHeaders = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined
  })
  for (const c of res.headers.getSetCookie?.() || []) cookie = c.split(';')[0]
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {}
  return { status: res.status, json, text }
}

async function main() {
  // ---------------------------------------------------------------------------
  console.log('=== BROADCASTER (offline) ===')
  const live = require('../backend/services/liveUpdates')

  const res = fakeResponse()
  const cleanup = live.addClient({ on() {} }, res)

  check('header text/event-stream', res.headers['content-type'] === 'text/event-stream')
  check('header no-transform (kompresi tidak membuffer stream)',
    (res.headers['cache-control'] || '').includes('no-transform'))
  check('frame pembuka dikirim', res.chunks.length === 1)

  const ready = parseFrame(res.chunks[0])
  check('event pembuka = ready', ready.event === 'ready' && ready.data?.ok === true)
  check('client terdaftar', live.getStatus().clients === 1)

  live.broadcast({ newArticles: 7, source: 'test' })
  const update = parseFrame(res.chunks[1])
  check('broadcast terkirim sebagai event update', update.event === 'update')
  check('payload newArticles benar', update.data?.newArticles === 7, `newArticles=${update.data?.newArticles}`)
  check('payload punya timestamp', typeof update.data?.at === 'string')

  live.notifyFetch(
    {
      total: 3,
      ok: 20,
      failed: 2,
      sources: [
        { name: 'Kompas', error: '404' },
        { name: 'Detik News', inserted: 3 },
        { name: 'Reuters', error: 'ENOTFOUND' }
      ]
    },
    { source: 'scheduler' }
  )
  const notify = parseFrame(res.chunks[2]).data
  check('notifyFetch meneruskan newArticles', notify?.newArticles === 3)
  check('notifyFetch hanya menamai sumber gagal',
    Array.isArray(notify?.failedSourceNames) &&
      notify.failedSourceNames.length === 2 &&
      notify.failedSourceNames.includes('Kompas') &&
      notify.failedSourceNames.includes('Reuters'),
    JSON.stringify(notify?.failedSourceNames))
  check('lastUpdate tersimpan untuk tab yang baru dibuka', live.getStatus().lastUpdate?.newArticles === 3)

  cleanup()
  check('cleanup menghapus client', live.getStatus().clients === 0)

  // ---------------------------------------------------------------------------
  console.log('\n=== SERVER HIDUP ===')
  let health
  try {
    health = await call('GET', '/api/health')
  } catch {
    console.error(`[tests] NOVA tidak bisa dijangkau di ${BASE}. Jalankan server dulu: npm start / nova`)
    console.log(`\n=== TOTAL: ${pass} pass, ${fail} fail ===`)
    process.exit(2)
  }
  check('/api/health 200', health.status === 200, `HTTP ${health.status}`)

  const saved = cookie
  cookie = ''
  const unauth = await call('GET', '/api/live/stream')
  const unauthStatus = await call('GET', '/api/live/status')
  cookie = saved
  check('stream tanpa login ditolak', unauth.status === 401, `HTTP ${unauth.status}`)
  check('status tanpa login ditolak', unauthStatus.status === 401, `HTTP ${unauthStatus.status}`)

  const login = await call('POST', '/api/auth/login', { password: '123456' })
  check('login berhasil', login.status === 200 && login.json?.success !== false, `HTTP ${login.status}`)

  const controller = new AbortController()
  const streamRes = await fetch(BASE + '/api/live/stream', {
    headers: { Cookie: cookie },
    signal: controller.signal
  })
  check('stream 200 + content-type SSE', streamRes.status === 200 &&
    (streamRes.headers.get('content-type') || '').includes('text/event-stream'),
    `HTTP ${streamRes.status}`)

  const reader = streamRes.body.getReader()
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 5000))
  const first = await Promise.race([reader.read(), timeout])
  check('frame ready diterima via HTTP', !!first?.value && String(new TextDecoder().decode(first.value)).includes('event: ready'))

  const status = await call('GET', '/api/live/status')
  check('status melaporkan client aktif', status.status === 200 && status.json?.clients >= 1,
    `clients=${status.json?.clients}`)
  check('status punya lastUpdate atau null', status.json && 'lastUpdate' in status.json)

  // Tutup SSE dengan rapi. `controller.abort()` tepat setelah cancel memicu
  // assertion libuv di Node 24/Windows, jadi cukup cancel + beri satu tick.
  try {
    await reader.cancel()
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 200))

  console.log(`\n=== TOTAL: ${pass} pass, ${fail} fail ===`)
  process.exitCode = fail > 0 ? 1 : 0
}

main().catch((err) => {
  console.error('[tests] Fatal:', err.message)
  process.exit(1)
})
