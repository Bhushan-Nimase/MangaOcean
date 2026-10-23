import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/AuthContext.jsx'

export default function Register() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ userName: '', email: '', displayName: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) return setError('Passwords do not match.')
    if (form.password.length < 10) return setError('Password must be at least 10 characters.')

    setBusy(true)
    try {
      await register({
        userName: form.userName,
        email: form.email,
        displayName: form.displayName || null,
        password: form.password,
      })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-sm pt-6">
      <h1 className="font-display text-3xl font-bold">Create your account</h1>
      <p className="mb-6 mt-1 text-sm text-mute">Free. Unlocks filters, your library and saved progress.</p>

      <form onSubmit={submit} className="card space-y-4 p-5">
        <Field label="Username">
          <input className="input" value={form.userName} onChange={set('userName')} autoComplete="username" required />
        </Field>
        <Field label="Email">
          <input type="email" className="input" value={form.email} onChange={set('email')} autoComplete="email" required />
        </Field>
        <Field label="Display name (optional)">
          <input className="input" value={form.displayName} onChange={set('displayName')} maxLength={60} />
        </Field>
        <Field label="Password" hint="10+ characters with upper-case, lower-case and a number">
          <input
            type="password"
            className="input"
            value={form.password}
            onChange={set('password')}
            autoComplete="new-password"
            required
          />
        </Field>
        <Field label="Confirm password">
          <input
            type="password"
            className="input"
            value={form.confirm}
            onChange={set('confirm')}
            autoComplete="new-password"
            required
          />
        </Field>

        {error && <p className="notice-err">{error}</p>}

        <button className="btn w-full" disabled={busy}>
          {busy ? 'Creating…' : 'Sign up'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-mute">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-accent hover:underline">
          Log in
        </Link>
      </p>
    </motion.div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-mute">{hint}</p>}
    </div>
  )
}
