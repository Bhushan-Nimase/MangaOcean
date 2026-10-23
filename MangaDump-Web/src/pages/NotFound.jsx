import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="font-display text-6xl font-bold text-accent">404</p>
      <p className="mt-3 text-mute">That page doesn't exist.</p>
      <Link to="/" className="btn mt-6">
        Back to browse
      </Link>
    </div>
  )
}
