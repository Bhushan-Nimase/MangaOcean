import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/AuthContext.jsx'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const from = location.state?.from || '/'
  if (user) return <Navigate to={from} replace />

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(identifier, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">Welcome back</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Username or email</label>
          <input
            className="input"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Password</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

        <button className="btn w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Log in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-400">
        New here?{' '}
        <Link to="/register" className="text-violet-400 hover:underline">
          Create an account
        </Link>
      </p>
    </motion.div>
  )
}
