import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../lib/api'
import { useAuth } from '../lib/AuthContext.jsx'
import { readerPath, resumeTarget } from '../lib/resume.js'
import StatusBadge from '../components/StatusBadge.jsx'
import { BookmarkIcon, CheckIcon, HeartIcon, PlayIcon } from '../components/Icons.jsx'

const EMPTY_STATUS = { isFollowing: false, isLiked: false, lastChapterNumber: null, lastPageNumber: null }

export default function MangaDetail() {
  const { slug } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [manga, setManga] = useState(null)
  const [mine, setMine] = useState(EMPTY_STATUS) // my follow / like / reading position
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let cancelled = false
    setManga(null)
    setError('')
    api.manga
      .get(slug)
      .then((m) => !cancelled && setManga(m))
      .catch((e) => !cancelled && setError(e.status === 404 ? 'Manga not found.' : e.message))
    return () => {
      cancelled = true
    }
  }, [slug])

  // my state for this manga (only when logged in)
  useEffect(() => {
    if (!manga || !user) {
      setMine(EMPTY_STATUS)
      return
    }
    let cancelled = false
    api.library
      .status(manga.id)
      .then((s) => !cancelled && setMine(s))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [manga?.id, user?.id])

  const chaptersDesc = useMemo(() => (manga ? [...manga.chapters].reverse() : []), [manga])

  if (error) return <p className="py-20 text-center text-mute">{error}</p>
  if (!manga) return <p className="py-20 text-center text-mute">Loading…</p>

  const needLogin = () => navigate('/login', { state: { from: location.pathname } })

  // flip the button right away, undo if the server says no
  const toggle = async (field, countField, apiCall) => {
    if (!user) return needLogin()
    setActionError('')
    const before = mine || EMPTY_STATUS
    const next = !before[field]
    setMine({ ...before, [field]: next })
    setManga((m) => (m ? { ...m, [countField]: Math.max(0, (m[countField] || 0) + (next ? 1 : -1)) } : m))
    try {
      const res = await apiCall(manga.id, next)
      setMine(res || EMPTY_STATUS)
    } catch (e) {
      setMine(before)
      setManga((m) => (m ? { ...m, [countField]: Math.max(0, (m[countField] || 0) + (next ? -1 : 1)) } : m))
      setActionError(e.message)
    }
  }

  const first = manga.chapters[0]?.number
  const target = resumeTarget(mine, first)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex flex-col gap-6 sm:gap-8 md:flex-row lg:gap-12">
        <div className="w-40 shrink-0 sm:w-52 md:w-64 xl:w-80">
          <div className="aspect-[2/3] overflow-hidden rounded-lg border border-line bg-sunk">
            {manga.coverImageUrl ? (
              <img src={manga.coverImageUrl} alt={manga.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center p-4 text-center font-display text-mute">
                {manga.title}
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">{manga.title}</h1>
          <p className="mt-1 text-sm text-mute">
            {[manga.author, manga.artist && manga.artist !== manga.author ? manga.artist : null, manga.releaseYear]
              .filter(Boolean)
              .join(' · ')}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={manga.status} />
            {manga.genres.map((g) => (
              <span key={g.id} className="chip !cursor-default hover:!border-line hover:!text-mute">
                {g.name}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {target && (
              <Link to={readerPath(manga.slug, target)} className="btn">
                <PlayIcon width={14} height={14} />
                {target.label}
              </Link>
            )}

            <button
              onClick={() => toggle('isFollowing', 'followerCount', api.library.follow)}
              className={mine?.isFollowing ? 'btn-quiet !border-accent !text-accent' : 'btn-quiet'}
              aria-pressed={!!mine?.isFollowing}
            >
              {mine?.isFollowing ? <CheckIcon /> : <BookmarkIcon />}
              {mine?.isFollowing ? 'Following' : 'Follow'}
              <span className="text-mute">{manga.followerCount}</span>
            </button>

            <button
              onClick={() => toggle('isLiked', 'likeCount', api.library.like)}
              className={mine?.isLiked ? 'btn-quiet !border-accent !text-accent' : 'btn-quiet'}
              aria-pressed={!!mine?.isLiked}
              aria-label={mine?.isLiked ? 'Unlike' : 'Like'}
            >
              <HeartIcon filled={!!mine?.isLiked} />
              <span className="text-mute">{manga.likeCount}</span>
            </button>
          </div>

          {!user && (
            <p className="mt-3 text-xs text-mute">
              <Link to="/login" state={{ from: location.pathname }} className="text-accent hover:underline">
                Log in
              </Link>{' '}
              to follow, like and pick up where you left off.
            </p>
          )}
          {actionError && <p className="notice-err mt-3">{actionError}</p>}

          {manga.description && (
            <p className="mt-6 max-w-3xl whitespace-pre-line text-[15px] leading-relaxed text-ink/90">{manga.description}</p>
          )}

          <h2 className="mb-3 mt-10 font-display text-xl font-bold">Chapters ({manga.chapters?.length || 0})</h2>
          {(manga.chapters?.length || 0) === 0 ? (
            <p className="text-sm text-mute">No chapters yet.</p>
          ) : (
            <ul className="card divide-y divide-line overflow-hidden">
              {chaptersDesc.map((c) => {
                const isLast = mine?.lastChapterNumber === c.number
                const isRead = mine?.lastChapterNumber != null && c.number < mine.lastChapterNumber
                const hasSavedPage = isLast && (mine?.lastPageNumber || 0) > 1
                return (
                  <li key={c.id}>
                    <Link
                      to={`/manga/${manga.slug}/chapter/${c.number}${hasSavedPage ? `?page=${mine.lastPageNumber}` : ''}`}
                      className={`flex items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-sunk ${
                        isRead ? 'text-mute' : ''
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {isRead && <CheckIcon width={14} height={14} className="shrink-0 text-sage" />}
                        <span className="truncate">
                          Chapter {c.number}
                          {c.title ? <span className="text-mute"> — {c.title}</span> : null}
                        </span>
                        {isLast && (
                          <span className="shrink-0 rounded bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent">
                            Last read · p.{mine?.lastPageNumber || 1}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-mute">
                        {c.pageCount} pages · {new Date(c.publishedAt).toLocaleDateString()}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  )
}
