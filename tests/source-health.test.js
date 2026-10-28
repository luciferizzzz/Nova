const assert = require('assert')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { spawn } = require('child_process')
const http = require('http')

const PORT = Number(process.env.PORT || 3014)
const BASE = `http://127.0.0.1:${PORT}`
const DB_PATH = path.join(os.tmpdir(), `nova-sh-${Date.now()}.db`)
const ROOT = path.resolve(__dirname, '..')

function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE)
    const req = http.request(
      {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: { 'Content-Type': 'application/json' }
      },
      (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => {
          let json = null
          try {
            json = JSON.parse(data)
          } catch {}
          resolve({ status: res.statusCode, headers: res.headers, body: data, json })
        })
      }
    )
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function waitFor(urlPath, timeout = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const res = await request('GET', urlPath)
      if (res.status < 500) return res
    } catch {}
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`Timeout waiting for ${urlPath}`)
}

function run() {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['cli/nova.js'], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(PORT), DATABASE_PATH: DB_PATH, NODE_ENV: 'test' },
      stdio: ['ignore', 'pipe', 'pipe']
    })
    const out = []
    const err = []
    child.stdout.on('data', (d) => out.push(d.toString()))
    child.stderr.on('data', (d) => err.push(d.toString()))
    child.on('error', reject)
    child.proc = child
    child.out = out
    child.err = err
    setTimeout(() => resolve(child), 500)
  })
}

async function main() {
  const srv = await run()
  try {
    await waitFor('/api/health')

    // Auth required
    let res = await request('GET', '/api/sources')
    assert.strictEqual(res.status, 401)

    // Login
    res = await request('POST', '/api/auth/login', { password: '123456' })
    assert.ok([200, 401].includes(res.status))
    if (res.status !== 200) {
      // try setup if needed
      res = await request('POST', '/api/auth/setup', { password: '123456' })
      assert.strictEqual(res.status, 200)
      res = await request('POST', '/api/auth/login', { password: '123456' })
      assert.strictEqual(res.status, 200)
    }

    // Get sources
    res = await request('GET', '/api/sources')
    assert.strictEqual(res.status, 200)
    assert.ok(Array.isArray(res.json))
    assert.ok(res.json.length > 0)

    const s = res.json[0]
    assert.ok(Object.prototype.hasOwnProperty.call(s, 'last_error'))
    assert.ok(Object.prototype.hasOwnProperty.call(s, 'consecutive_failures'))
    assert.ok(Object.prototype.hasOwnProperty.call(s, 'last_checked_at'))

    console.log('ALL SOURCE-HEALTH TESTS PASSED')
    process.exit(0)
  } catch (e) {
    console.error('FAILED', e.message)
    process.exit(1)
  } finally {
    try {
      srv.kill()
    } catch {}
    try {
      fs.unlinkSync(DB_PATH)
    } catch {}
  }
}

main()
