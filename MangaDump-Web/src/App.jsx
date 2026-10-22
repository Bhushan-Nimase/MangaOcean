import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Home from './pages/Home.jsx'
import MangaDetail from './pages/MangaDetail.jsx'
import Reader from './pages/Reader.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Admin from './pages/Admin.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/manga/:slug" element={<MangaDetail />} />
          <Route path="/manga/:slug/chapter/:number" element={<Reader />} />
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
