import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { authed, login } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (authed) return <Navigate to="/" replace />

  const handle = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <form className="panel login-panel" onSubmit={handle}>
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
        <button type="submit" className="login-btn" disabled={busy || !password}>
          {busy ? 'VERIFYING…' : 'LOGIN'}
        </button>
        <div className="badges">
          <span>LOCAL INSTANCE</span>
          <span>NO ACCOUNT REQUIRED</span>
        </div>
        {!password && <div className="hint">Default password: 123456</div>}
      </form>
    </div>
  )
}