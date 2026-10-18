import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'

// Versi app dibaca dari package.json — About.jsx menampilkan ini (jangan hardcode angka).
const require = createRequire(import.meta.url)
const pkg = require('./package.json')

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    },
    host: 'localhost'
  },
  build: {
    outDir: 'dist'
  }
})
