#!/usr/bin/env node

const http = require('http')
const net = require('net')
const fs = require('fs')
const path = require('path')
const { startServer } = require('../backend/server')
const config = require('../backend/config')

function baseUrl() {
  return `http://${config.host}:${config.port}`
}

function checkPort(host, port, timeout = 1200) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let done = false
    const finish = (ok) => {
      if (!done) {
        done = true
        socket.destroy()
        resolve(ok)
      }
    }
    socket.setTimeout(timeout)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
    socket.connect(port, host)
  })
}

function fetchHealth() {
  return new Promise((resolve) => {
    const req = http.get(`${baseUrl()}/api/health`, { timeout: 3000 }, (res) => {
      let body = ''
      res.on('data', (c) => (body += c))
      res.on('end', () => {
        try {
          resolve({ ok: true, status: res.statusCode, body: JSON.parse(body) })
        } catch {
          resolve({ ok: true, status: res.statusCode, body: null })
        }
      })
    })
    req.on('timeout', () => {
      req.destroy()
      resolve({ ok: false, status: 0, body: null })
    })
    req.on('error', () => resolve({ ok: false, status: 0, body: null }))
  })
}

async function cmdStatus() {
  const alive = await checkPort(config.host, config.port)
  console.log('')
  console.log(`NOVA is ${alive ? 'RUNNING' : 'NOT RUNNING'}`)
  console.log(`  URL: ${baseUrl()}`)
  if (alive) {
    const health = await fetchHealth()
    if (health.ok && health.body) {
      console.log(`  Service:  ${health.body.service}`)
      console.log(`  Status:   ${health.body.status}`)
    }
  } else {
    console.log('  Run `nova` to start. It opens automatically at the URL above.')
  }
  console.log('')
}

function cmdDoctor() {
  const checks = []
  const ok = (name, msg = 'ok') => checks.push({ name, msg, pass: true })
  const fail = (name, msg) => checks.push({ name, msg, pass: false })

  if (config.host && config.port) ok('Config', `${config.host}:${config.port}`)
  else fail('Config', 'missing host/port')

  const backendDeps = path.join(config.root, 'backend', 'node_modules')
  if (fs.existsSync(backendDeps)) ok('Backend dependencies', 'installed')
  else fail('Backend dependencies', `not found at ${path.relative(config.root, backendDeps)}`)

  const dataDir = path.join(config.root, 'data')
  if (fs.existsSync(dataDir)) ok('Data directory', `${path.relative(config.root, dataDir)}`)
  else fail('Data directory', `${path.relative(config.root, dataDir)} missing`)

  const dbFile = path.join(dataDir, 'nova.db')
  if (fs.existsSync(dbFile)) {
    const size = fs.statSync(dbFile).size
    ok('Database', `${size.toLocaleString('en-US')} bytes`)
  } else {
    ok('Database', 'will be created on first start')
  }

  console.log('')
  console.log('NOVA doctor')
  console.log('----------')
  for (const check of checks) {
    console.log(`  ${check.pass ? '✓' : '✗'} ${check.name}: ${check.msg}`)
  }
  const failed = checks.filter((c) => !c.pass).length
  console.log(`\n${failed === 0 ? 'All checks passed.' : `${failed} check(s) failed.`}`)
  console.log('')
}

function openBrowser(url) {
  const opener = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open'
  const { exec } = require('child_process')
  exec(`${opener} ${url}`)
}

async function waitUntilUp(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const health = await fetchHealth()
    if (health.ok && health.status === 200) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

function cmdStart() {
  try {
    startServer()
    const url = baseUrl()
    waitUntilUp().then((ready) => {
      console.log(`\n  ▶ NOVA ${ready ? 'is ready' : 'may still be starting'} at ${url}\n`)
      openBrowser(url)
    })
  } catch (err) {
    console.error(`[NOVA] Failed to start: ${err && err.message ? err.message : String(err)}`)
    process.exit(1)
  }
}

function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  switch (command) {
    case 'status':
      cmdStatus()
      break
    case 'doctor':
      cmdDoctor()
      break
    case 'stop':
      console.log('NOVA stop: not yet implemented')
      break
    case 'update':
      console.log('NOVA update: not yet implemented')
      break
    case 'help':
    case '--help':
    case '-h':
      printHelp()
      break
    case undefined:
      cmdStart()
      break
    default:
      console.error(`Unknown command: ${command}`)
      printHelp()
      process.exit(1)
  }
}

function printHelp() {
  console.log('')
  console.log('NOVA — Local News Intelligence System')
  console.log('')
  console.log('Usage: nova [command]')
  console.log('')
  console.log('Commands:')
  console.log('  (no command)  Start NOVA services and open the dashboard')
  console.log('  status        Show whether NOVA is running')
  console.log('  doctor        Diagnose NOVA installation')
  console.log('  stop          Stop NOVA services')
  console.log('  update        Update NOVA')
  console.log('  help          Show this help')
  console.log('')
}

main()