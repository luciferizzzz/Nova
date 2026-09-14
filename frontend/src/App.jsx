import { useState, useEffect } from 'react'
import { login, logout } from './services/api'

const DEFAULT_PASSWORD = '123456'

export default function App() {
  const [authed, setAuthed] = useState(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((d) => setAuthed(d.authenticated))
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(password)
      setAuthed(true)
      setPassword('')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    setAuthed(false)
    setStatus(null)
  }

  const checkStatus = async () => {
    const res = await fetch('/api/status')
    const data = await res.json()
    setStatus(data)
  }

  return (
    <div className="app">
      {authed === null ? (
        <div className="panel">
          <h1>NOVA</h1>
          <div className="subtitle">LOCAL NEWS INTELLIGENCE</div>
          <p className="dim">Loading…</p>
        </div>
      ) : authed ? (
        <div className="panel">
          <div className="row">
            <h1>NOVA</h1>
            <button className="logout" onClick={handleLogout}>
              LOGOUT
            </button>
          </div>
          <div className="subtitle">LOCAL NEWS INTELLIGENCE</div>
          <p className="dim">Phase 2 — Authentication. Session aktif.</p>
          <button onClick={checkStatus}>Check Server Status</button>
          {status && (
            <pre className="status">{JSON.stringify(status, null, 2)}</pre>
          )}
        </div>
      ) : (
        <form className="panel" onSubmit={handleLogin}>
          <h1>NOVA</h1>
          <div className="subtitle">LOCAL NEWS INTELLIGENCE</div>
          <p className="dim">Enter your password to continue</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
          />
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={busy || !password}>
            {busy ? 'VERIFYING…' : 'LOGIN'}
          </button>
          <div className="badges">
            <span>LOCAL INSTANCE</span>
            <span>NO ACCOUNT REQUIRED</span>
          </div>
          {!password && <div className="hint">Default password: {DEFAULT_PASSWORD}</div>}
        </form>
      )}
    </div>
  )
}