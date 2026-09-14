const cron = require('node-cron')
const { fetchAllSources } = require('./rssFetcher')

let task = null

function getRefreshInterval(db) {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'rss_refresh_interval'").get()
  const minutes = row ? parseInt(row.value, 10) : 30
  return Number.isInteger(minutes) && minutes > 0 ? minutes : 30
}

function startScheduler(db) {
  if (task) return task
  const minutes = getRefreshInterval(db)
  try {
    task = cron.schedule(`*/${minutes} * * * *`, async () => {
      console.log('')
      console.log(`[Scheduler] Fetching news at ${new Date().toISOString()}`)
      try {
        await fetchAllSources(db)
      } catch (err) {
        console.error(`[Scheduler] Fetch error: ${err.message}`)
      }
    })
    console.log(`  ✓ Scheduler started (every ${minutes} minutes)`)
  } catch (err) {
    console.error(`  ✗ Scheduler failed to start: ${err.message}`)
  }
  return task
}

function stopScheduler() {
  if (task) {
    task.stop()
    task = null
  }
}

module.exports = { startScheduler, stopScheduler, getRefreshInterval }