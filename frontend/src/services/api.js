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