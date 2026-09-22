export function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const then = new Date(dateStr).getTime()
  if (Number.isNaN(then)) return '—'
  const diffMs = Date.now() - then
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(dateStr)
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 MB'
  const mb = bytes / (1024 * 1024)
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
  return `${mb.toFixed(1)} MB`
}

export function number(n) {
  if (n === undefined || n === null) return '0'
  return Number(n).toLocaleString('en-US')
}

export function lastHoursISO(hours) {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString()
}

export function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function fromTodayISO() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

const FALLBACK_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#101010"/><rect x="1" y="1" width="638" height="358" fill="none" stroke="#222" stroke-width="2"/><text x="320" y="178" fill="#333" font-family="Segoe UI, sans-serif" font-size="20" letter-spacing="6" text-anchor="middle">NOVA</text><text x="320" y="206" fill="#2a2a2a" font-family="Segoe UI, sans-serif" font-size="10" letter-spacing="3" text-anchor="middle">NO PREVIEW</text></svg>`
)}`

export function safeImage(url) {
  return url && url.length ? url : FALLBACK_SVG
}

export function categoryClass(category) {
  const map = {
    World: 'cat-world',
    Technology: 'cat-tech',
    Science: 'cat-science',
    Economy: 'cat-econ',
    Politics: 'cat-politics',
    Business: 'cat-business',
    Disaster: 'cat-disaster',
    Other: 'cat-other'
  }
  return map[category] || 'cat-other'
}

export const CATEGORIES = ['Politics', 'World', 'Economy', 'Technology', 'Science', 'Business', 'Disaster', 'Other']
export const COUNTRIES = ['Indonesia', 'United States', 'United Kingdom', 'Japan', 'South Korea', 'Singapore', 'Malaysia']
export const LANGUAGES = ['id', 'en', 'ja', 'ko']