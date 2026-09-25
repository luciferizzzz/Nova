async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

function queryString(params = {}) {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      qs.set(key, value)
    }
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

export function login(password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password })
  })
}

export function logout() {
  return request('/api/auth/logout', { method: 'POST' })
}

export function changePassword(currentPassword, newPassword) {
  return request('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword })
  })
}

export function getStatus() {
  return request('/api/status')
}

export function getBerita(params) {
  return request(`/api/berita${queryString(params)}`)
}

export function getStats() {
  return request('/api/berita/stats')
}

export function searchBerita(q, limit = 50) {
  return request(`/api/berita/search${queryString({ q, limit })}`)
}

export function getArticle(slug) {
  return request(`/api/berita/${encodeURIComponent(slug)}`)
}

export function toggleBookmark(articleId) {
  return request('/api/bookmarks', {
    method: 'POST',
    body: JSON.stringify({ article_id: Number(articleId) })
  })
}

export function getBookmarks() {
  return request('/api/bookmarks')
}

export function removeBookmark(id) {
  return request(`/api/bookmarks/${id}`, { method: 'DELETE' })
}

export function getSavedSearches() {
  return request('/api/saved-searches')
}

export function saveSearch(name, query) {
  return request('/api/saved-searches', {
    method: 'POST',
    body: JSON.stringify({ name, query })
  })
}

export function deleteSavedSearch(id) {
  return request(`/api/saved-searches/${id}`, { method: 'DELETE' })
}

export function getWatchlist() {
  return request('/api/watchlist')
}

export function addWatchlistItem(item) {
  return request('/api/watchlist', {
    method: 'POST',
    body: JSON.stringify(item)
  })
}

export function deleteWatchlistItem(id) {
  return request(`/api/watchlist/${id}`, { method: 'DELETE' })
}

export function getEvents(params) {
  return request(`/api/events${queryString(params)}`)
}

export function getEvent(id) {
  return request(`/api/events/${id}`)
}

export function scanEvents() {
  return request('/api/events/scan', { method: 'POST' })
}

export function getSources() {
  return request('/api/sources')
}

export function addSource(source) {
  return request('/api/sources', {
    method: 'POST',
    body: JSON.stringify(source)
  })
}

export function updateSource(id, patch) {
  return request(`/api/sources/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch)
  })
}

export function deleteSource(id) {
  return request(`/api/sources/${id}`, { method: 'DELETE' })
}

export function refreshSources() {
  return request('/api/sources/refresh', { method: 'POST' })
}

export function getSettings() {
  return request('/api/setting')
}

export function updateSettings(patch) {
  return request('/api/setting', { method: 'PUT', body: JSON.stringify(patch) })
}

export function downloadExport(format = 'json') {
  return fetch(`/api/export${format === 'csv' ? '?format=csv' : ''}`).then((res) => {
    if (!res.ok) {
      return res.json().catch(() => ({})).then((data) => {
        throw new Error(data.error || `Export failed (${res.status})`)
      })
    }
    return res.blob()
  })
}

export function importData(payload) {
  return request('/api/import', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}