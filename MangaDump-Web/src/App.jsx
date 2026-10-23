import { useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Home from './pages/Home.jsx'
import MangaDetail from './pages/MangaDetail.jsx'
import Reader from './pages/Reader.jsx'
import Library from './pages/Library.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Admin from './pages/Admin.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  const location = useLocation()
  const isReader = /^\/manga\/[^/]+\/chapter\/[^/]+/.test(location.pathname)

  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  return (
    // Full-screen: header on top, content fills the rest of the window at any size
    <div className="flex min-h-dvh w-full flex-col">
      {!isFullscreen && <Navbar />}
      <main className={`w-full flex-1 ${isReader ? '' : 'page-x py-6 sm:py-8'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/manga/:slug" element={<MangaDetail />} />
          <Route path="/manga/:slug/chapter/:number" element={<Reader isFullscreen={isFullscreen} />} />
          <Route
            path="/library"
            element={
              <ProtectedRoute>
                <Library />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}
