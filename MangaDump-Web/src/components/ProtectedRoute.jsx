import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'

// UI-level guard only. The real enforcement is [Authorize] on the API.
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) return <p className="py-20 text-center text-mute">Loading…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />

  return children
}
