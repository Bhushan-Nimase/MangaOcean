import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <h1 className="text-5xl font-bold text-violet-400">404</h1>
      <p className="mt-3 text-zinc-400">That page doesn't exist.</p>
      <Link to="/" className="btn mt-6">
        Back to browse
      </Link>
    </div>
  )
}
