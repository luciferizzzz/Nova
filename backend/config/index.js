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

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || 'localhost',
  databasePath: process.env.DATABASE_PATH || path.join(ROOT, 'data', 'nova.db'),
  dataDir: path.join(ROOT, 'data'),
  cacheDir: path.join(ROOT, 'data', 'cache'),
  rssRefreshInterval: parseInt(process.env.RSS_REFRESH_INTERVAL, 10) || 30,
  root: ROOT
}

module.exports = config
