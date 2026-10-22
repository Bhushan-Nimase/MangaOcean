import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import { useTheme } from '../lib/ThemeContext.jsx'
import { MoonIcon, SunIcon } from './Icons.jsx'

export default function Navbar() {
  const { user, loading, logout, isAdmin } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const link = ({ isActive }) =>
    `border-b-2 py-1 text-sm transition ${
      isActive ? 'border-accent text-ink' : 'border-transparent text-mute hover:text-ink'
    }`

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
            <span className="inline-block h-3 w-3 rounded-[3px] bg-accent" aria-hidden="true" />
            MangaDump
          </Link>

          <nav className="flex items-center gap-5">
            <NavLink to="/" end className={link}>
              Browse
            </NavLink>
            {user && (
              <NavLink to="/library" className={link}>
                Library
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin" className={link}>
                Admin
              </NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="btn-quiet !px-2.5"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          {loading ? null : user ? (
            <>
              <span className="hidden max-w-32 truncate text-sm text-mute sm:inline">
                {user.displayName || user.userName}
              </span>
              <button onClick={handleLogout} className="btn-quiet">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-quiet">
                Log in
              </Link>
              <Link to="/register" className="btn hidden sm:inline-flex">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
