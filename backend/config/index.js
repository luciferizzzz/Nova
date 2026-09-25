const path = require('path')
const fs = require('fs')

const ROOT = path.resolve(__dirname, '..', '..')

function loadEnv() {
  const envPath = path.join(ROOT, '.env')
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath })
  }
}

loadEnv()

function resolvePath(p) {
  return path.isAbsolute(p) ? p : path.join(ROOT, p)
}

const databasePath = process.env.DATABASE_PATH
  ? resolvePath(process.env.DATABASE_PATH)
  : path.join(ROOT, 'data', 'nova.db')
const dataDir = process.env.DATA_DIR
  ? resolvePath(process.env.DATA_DIR)
  : path.dirname(databasePath)

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || 'localhost',
  databasePath,
  dataDir,
  cacheDir: path.join(dataDir, 'cache'),
  rssRefreshInterval: parseInt(process.env.RSS_REFRESH_INTERVAL, 10) || 30,
  root: ROOT
}

module.exports = config
