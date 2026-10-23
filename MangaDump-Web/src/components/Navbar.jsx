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
    <header className="sticky top-0 z-30 w-full border-b border-line bg-paper/90 backdrop-blur">
      {/*
        Phone: logo + buttons on the first row, links on a second row.
        Tablet and up: everything on one row, links next to the logo.
      */}
      <div className="page-x flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1.5 py-2 sm:h-14 sm:flex-nowrap sm:gap-x-6 sm:py-0">
        <Link
          to="/"
          className="order-1 flex shrink-0 items-center gap-2 font-display text-lg sm:text-xl font-bold tracking-tight"
        >
          <span className="inline-block h-3 w-3 rounded-[3px] bg-accent" aria-hidden="true" />
          MangaDump
        </Link>

        <nav className="order-3 flex w-full items-center gap-4 sm:order-2 sm:w-auto sm:flex-1 sm:gap-6">
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

        <div className="order-2 flex shrink-0 items-center gap-2 sm:order-3">
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
              <span className="hidden max-w-40 truncate text-sm text-mute md:inline">
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
