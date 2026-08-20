/**
 * First-Run Admin Setup — a public page (not behind login, since a fresh
 * deploy has no user to log in as) that creates the very first admin
 * account. The backend only allows this while the users table is
 * completely empty (see backend/src/modules/user/setup/setup.controller.js)
 * — the instant an account exists, this page permanently reports "already
 * completed" instead of showing the form, on this environment or any other
 * device that visits it afterward.
 */
import { useEffect, useState } from 'react'
import { useAuth } from '../../../components/auth/AuthContext.jsx'
import { api } from '../../../context/context.jsx'
import { Button } from '../../../components/ui/index.js'
import { normalizeEmailInput } from '../../../utils/textNormalize.js'
import './Setup.css'

const EMPTY_FORM = { fullName: '', email: '', password: '', confirmPassword: '', setupSecret: '' }

export default function Setup() {
  const { login, loading } = useAuth()
  const [status, setStatus] = useState('checking') // 'checking' | 'ready' | 'done'
  const [requiresSecret, setRequiresSecret] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get('/auth/setup-status')
      .then((res) => {
        setRequiresSecret(!!res.requiresSecret)
        setStatus(res.needsSetup ? 'ready' : 'done')
      })
      .catch(() => setStatus('done')) // fail closed — never show the form on an uncertain state
  }, [])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.fullName.trim() || !form.email.trim() || !form.password) {
      setError('Full name, email, and password are required'); return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters'); return
    }
    if (form.password !== form.confirmPassword) {
      setError('Password and Confirm Password do not match'); return
    }
    if (requiresSecret && !form.setupSecret.trim()) {
      setError('Setup secret is required'); return
    }

    setError('')
    setSubmitting(true)
    const email = normalizeEmailInput(form.email)
    try {
      await api.post('/auth/setup', {
        fullName: form.fullName.trim(),
        email,
        password: form.password,
        setupSecret: form.setupSecret || undefined,
      })
      // Log in through the normal flow so app-wide auth state (token,
      // permissions, localStorage) is set up exactly like any other login.
      await login(email, form.password)
    } catch (e) {
      setError(e.message || 'Setup failed')
      setSubmitting(false)
    }
  }

  if (status === 'checking') {
    return <div className="setup-page"><div className="setup-card setup-card--center">Checking setup status…</div></div>
  }

  if (status === 'done') {
    return (
      <div className="setup-page">
        <div className="setup-card setup-card--center">
          <h2 className="setup-title">Setup already completed</h2>
          <p className="setup-done-text">An admin account already exists on this system. Use the login page instead.</p>
          <a className="setup-login-link" href="/login">Go to Login</a>
        </div>
      </div>
    )
  }

  return (
    <div className="setup-page">
      <div className="setup-card">
        <div className="setup-header">
          <h2 className="setup-title">Create the Admin Account</h2>
          <p className="setup-subtitle">
            This is a one-time setup — it only works because no accounts exist yet on this
            system. Once created, use this account to create every other user and role.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="setup-field">
            <label className="setup-label">Full Name</label>
            <input value={form.fullName} onChange={set('fullName')} placeholder="e.g. Amit Singh" autoFocus className="setup-input" />
          </div>
          <div className="setup-field">
            <label className="setup-label">Email</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="e.g. admin@yourcompany.com" className="setup-input" />
          </div>
          <div className="setup-field">
            <label className="setup-label">Password</label>
            <input type="password" value={form.password} onChange={set('password')} placeholder="At least 8 characters" className="setup-input" />
          </div>
          <div className="setup-field">
            <label className="setup-label">Confirm Password</label>
            <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Re-enter password" className="setup-input" />
          </div>
          {requiresSecret && (
            <div className="setup-field setup-field--last">
              <label className="setup-label">Setup Secret</label>
              <input type="password" value={form.setupSecret} onChange={set('setupSecret')} placeholder="Provided by your deployment config" className="setup-input" />
            </div>
          )}

          {error && <div className="setup-error">{error}</div>}

          <Button type="submit" variant="primary" loading={loading || submitting} fullWidth>
            {submitting || loading ? 'Creating account…' : 'Create Admin Account'}
          </Button>
        </form>

        <div className="setup-footer">
          This action is logged in the audit trail like any other account creation.
        </div>
      </div>
    </div>
  )
}
