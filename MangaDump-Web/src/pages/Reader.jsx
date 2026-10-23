import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/AuthContext.jsx'
import { FullscreenIcon, ExitFullscreenIcon, WidthIcon } from '../components/Icons.jsx'

const FIT_STORAGE_KEY = 'md-reader-fit'

export default function Reader({ isFullscreen: propIsFullscreen }) {
  const { slug, number } = useParams()
  const [search] = useSearchParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const startPage = Math.max(1, Number(search.get('page')) || 1)

  const [chapter, setChapter] = useState(null)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(startPage)
  const [tracking, setTracking] = useState(false)
  const [fit, setFit] = useState(() => {
    try {
      return localStorage.getItem(FIT_STORAGE_KEY) || 'contained'
    } catch {
      return 'contained'
    }
  })

  // Fullscreen state: sync with props or document
  const isFullscreen = propIsFullscreen ?? Boolean(document.fullscreenElement)

  const loadedBefore = useRef(0)
  const jumped = useRef(false)
  const trackingRef = useRef(false)
  const pending = useRef(null)

  const startTracking = useCallback(() => {
    trackingRef.current = true
    setTracking(true)
  }, [])

  // ---- load chapter ----
  useEffect(() => {
    let cancelled = false
    setChapter(null)
    setError('')
    setCurrentPage(startPage)
    setTracking(false)
    trackingRef.current = false
    jumped.current = false
    loadedBefore.current = 0
    window.scrollTo(0, 0)

    api.chapters
      .read(slug, number)
      .then((c) => !cancelled && setChapter(c))
      .catch((e) => !cancelled && setError(e.status === 404 ? 'Chapter not found.' : e.message))
    return () => {
      cancelled = true
    }
  }, [slug, number])

  // ---- jump to saved page ----
  const jumpToStart = useCallback(() => {
    if (jumped.current) return
    jumped.current = true
    document.getElementById(`page-${startPage}`)?.scrollIntoView({ block: 'start' })
    setTimeout(startTracking, 150)
  }, [startPage, startTracking])

  useEffect(() => {
    if (!chapter) return
    const totalPages = chapter.pages?.length || 0
    if (startPage <= 1 || totalPages === 0) {
      startTracking()
      return
    }
    const t = setTimeout(jumpToStart, 5000)
    return () => clearTimeout(t)
  }, [chapter, startPage, jumpToStart, startTracking])

  const onImageLoadOrError = (pageNumber) => {
    if (startPage <= 1 || pageNumber > startPage) return
    loadedBefore.current += 1
    const totalPages = chapter?.pages?.length || 0
    if (loadedBefore.current >= Math.min(startPage, totalPages)) {
      jumpToStart()
    }
  }

  // ---- track visible page ----
  useEffect(() => {
    if (!chapter || !chapter.pages || chapter.pages.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!trackingRef.current) return
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const pageNum = Number(entry.target.dataset.page)
            if (pageNum) setCurrentPage(pageNum)
          }
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    document.querySelectorAll('[data-page]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [chapter])

  // ---- save reading position ----
  const flush = useCallback(() => {
    const p = pending.current
    if (!p) return
    pending.current = null
    api.library.progress(p.mangaId, p.number, p.page).catch(() => {})
  }, [])

  useEffect(() => {
    if (!user || !chapter || !tracking) return
    pending.current = { mangaId: chapter.mangaId, number: chapter.number, page: currentPage }
    const t = setTimeout(flush, 1200)
    return () => clearTimeout(t)
  }, [user, chapter, tracking, currentPage, flush])

  useEffect(() => flush, [chapter?.id, flush])

  const go = useCallback((n) => navigate(`/manga/${slug}/chapter/${n}`), [navigate, slug])

  // ---- Fullscreen toggle ----
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  // ---- Fit toggle ----
  const cycleFit = useCallback(() => {
    const modes = ['contained', 'wide', 'full']
    setFit((prev) => {
      const next = modes[(modes.indexOf(prev) + 1) % modes.length]
      try {
        localStorage.setItem(FIT_STORAGE_KEY, next)
      } catch {}
      return next
    })
  }, [])

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        toggleFullscreen()
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        cycleFit()
      } else if (e.key === 'ArrowLeft' || e.key === '[') {
        if (chapter?.previousNumber != null) {
          e.preventDefault()
          go(chapter.previousNumber)
        }
      } else if (e.key === 'ArrowRight' || e.key === ']') {
        if (chapter?.nextNumber != null) {
          e.preventDefault()
          go(chapter.nextNumber)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [chapter, go, toggleFullscreen, cycleFit])

  if (error) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <p className="notice-err mb-4">{error}</p>
        <Link to={`/manga/${slug}`} className="btn">
          Back to manga
        </Link>
      </div>
    )
  }

  if (!chapter) {
    return <p className="py-24 text-center text-mute">Loading chapter…</p>
  }

  const pages = chapter.pages || []
  const total = pages.length

  const fitClasses = {
    contained: 'max-w-3xl lg:max-w-4xl px-3 sm:px-4',
    wide: 'max-w-5xl 2xl:max-w-6xl px-2 sm:px-4',
    full: 'w-full max-w-none px-0',
  }[fit] || 'max-w-3xl lg:max-w-4xl px-3 sm:px-4'

  const fitLabel = {
    contained: 'Contained',
    wide: 'Wide',
    full: 'Full width',
  }[fit] || 'Fit'

  const controls = (
    <div className="flex flex-wrap items-center justify-between gap-2 py-3">
      <div className="flex items-center gap-2">
        <button
          className="btn-quiet !px-3 !py-1.5 text-xs sm:text-sm"
          disabled={chapter.previousNumber == null}
          onClick={() => chapter.previousNumber != null && go(chapter.previousNumber)}
          title="Previous chapter (Arrow Left)"
        >
          ← Prev
        </button>
        <Link to={`/manga/${slug}`} className="min-w-0 max-w-44 sm:max-w-xs md:max-w-md truncate text-xs sm:text-sm text-mute hover:text-ink">
          <span className="font-semibold text-ink">{chapter.mangaTitle}</span> · Ch. {chapter.number}
          {chapter.title ? ` — ${chapter.title}` : ''}
        </Link>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Width mode button */}
        <button
          onClick={cycleFit}
          className="btn-quiet !px-2.5 !py-1.5 text-xs"
          title={`Reader width: ${fitLabel} (Press W)`}
          aria-label={`Reader width: ${fitLabel}`}
        >
          <WidthIcon width={14} height={14} />
          <span className="hidden sm:inline">{fitLabel}</span>
        </button>

        {/* Fullscreen toggle button */}
        <button
          onClick={toggleFullscreen}
          className="btn-quiet !px-2.5 !py-1.5 text-xs"
          title={isFullscreen ? 'Exit full screen (F)' : 'Full screen (F)'}
          aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
        >
          {isFullscreen ? <ExitFullscreenIcon width={14} height={14} /> : <FullscreenIcon width={14} height={14} />}
          <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Full screen'}</span>
        </button>

        <button
          className="btn-quiet !px-3 !py-1.5 text-xs sm:text-sm"
          disabled={chapter.nextNumber == null}
          onClick={() => chapter.nextNumber != null && go(chapter.nextNumber)}
          title="Next chapter (Arrow Right)"
        >
          Next →
        </button>
      </div>
    </div>
  )

  return (
    <div className="relative min-h-screen w-full bg-paper">
      {/* Top sticky controls bar */}
      <header className="sticky top-0 z-30 w-full border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-3 sm:px-6">
          {controls}
        </div>
      </header>

      {/* Manga Pages Container */}
      <div className={`mx-auto w-full transition-all duration-200 ${fitClasses}`}>
        {total === 0 ? (
          <div className="py-24 text-center">
            <p className="text-mute">This chapter has no pages yet.</p>
          </div>
        ) : (
          <div className="my-2 flex flex-col items-center bg-sunk shadow-sm sm:my-4">
            {pages.map((p) => (
              <img
                key={p.id}
                id={`page-${p.pageNumber}`}
                data-page={p.pageNumber}
                src={p.imageUrl}
                alt={`Page ${p.pageNumber}`}
                loading={p.pageNumber <= startPage + 1 ? 'eager' : 'lazy'}
                onLoad={() => onImageLoadOrError(p.pageNumber)}
                onError={() => onImageLoadOrError(p.pageNumber)}
                className="w-full h-auto object-contain select-none"
              />
            ))}
          </div>
        )}

        {/* Chapter footer */}
        <div className="mx-auto mb-20 mt-8 max-w-2xl px-4 text-center">
          {chapter.nextNumber != null && (
            <button className="btn mb-4 w-full py-3 text-base" onClick={() => go(chapter.nextNumber)}>
              Next chapter · Ch. {chapter.nextNumber} →
            </button>
          )}

          <div className="flex items-center justify-between border-t border-line pt-4">
            <button
              className="btn-quiet text-xs sm:text-sm"
              disabled={chapter.previousNumber == null}
              onClick={() => chapter.previousNumber != null && go(chapter.previousNumber)}
            >
              ← Prev chapter
            </button>
            <Link to={`/manga/${slug}`} className="text-xs sm:text-sm text-accent hover:underline">
              Back to manga overview
            </Link>
            <button
              className="btn-quiet text-xs sm:text-sm"
              disabled={chapter.nextNumber == null}
              onClick={() => chapter.nextNumber != null && go(chapter.nextNumber)}
            >
              Next chapter →
            </button>
          </div>

          {!user && (
            <p className="mt-6 text-xs text-mute">
              <Link to="/login" state={{ from: `/manga/${slug}/chapter/${number}` }} className="text-accent hover:underline">
                Log in
              </Link>{' '}
              to save your place and sync progress across devices.
            </p>
          )}
        </div>
      </div>

      {/* Floating Bottom HUD: Page counter, Fullscreen, Jump to Top */}
      {total > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex items-center justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-line bg-card/95 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur">
            <span className="text-ink">
              Page {currentPage} <span className="text-mute">/ {total}</span>
            </span>

            <span className="h-3 w-px bg-line" aria-hidden="true" />

            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-mute hover:text-ink transition"
              title="Jump to top"
            >
              Top ↑
            </button>

            <span className="h-3 w-px bg-line" aria-hidden="true" />

            <button
              onClick={toggleFullscreen}
              className="text-mute hover:text-ink transition flex items-center"
              title={isFullscreen ? 'Exit full screen' : 'Full screen'}
            >
              {isFullscreen ? <ExitFullscreenIcon width={13} height={13} /> : <FullscreenIcon width={13} height={13} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
