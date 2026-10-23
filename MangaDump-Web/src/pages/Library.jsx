import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { readerPath, resumeTarget } from '../lib/resume.js'
import MangaCard from '../components/MangaCard.jsx'
import { HeartIcon, PlayIcon } from '../components/Icons.jsx'

const TABS = [
  ['following', 'Following'],
  ['liked', 'Liked'],
  ['history', 'History'],
]

const EMPTY = {
  following: 'You are not following anything yet. Open a manga and press Follow to keep it here.',
  liked: 'Nothing liked yet. Tap the heart on a manga you enjoy.',
  history: 'Your reading history will show up here once you open a chapter.',
}

export default function Library() {
  const [tab, setTab] = useState('following')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    api.library
      .list({ tab, page, pageSize: 24 })
      .then((r) => !cancelled && setResult(r))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [tab, page])

  const switchTab = (key) => {
    setTab(key)
    setPage(1)
    setResult(null)
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Your library</h1>
      <p className="mb-6 text-sm text-mute">Pick up where you left off.</p>

      <div className="mb-8 flex gap-6 border-b border-line">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className={`-mb-px border-b-2 pb-2 text-sm transition ${
              tab === key ? 'border-accent font-semibold text-ink' : 'border-transparent text-mute hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="notice-err mb-4">{error}</p>}

      {loading && !result ? (
        <p className="py-20 text-center text-mute">Loading…</p>
      ) : result?.items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="mx-auto max-w-sm text-mute">{EMPTY[tab]}</p>
          <Link to="/" className="btn mt-5">
            Browse manga
          </Link>
        </div>
      ) : (
        <div className={`poster-grid transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {(result?.items || []).map((item, i) => (
            <LibraryCard key={item.mangaId} item={item} index={i} />
          ))}
        </div>
      )}

      {result && result.totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-3">
          <button className="btn-quiet" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="text-sm text-mute">
            Page {result.page} of {result.totalPages}
          </span>
          <button className="btn-quiet" disabled={page >= result.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  )
}

function LibraryCard({ item, index }) {
  const target = resumeTarget(item)

  const progress =
    item.lastChapterNumber == null
      ? 'Not started'
      : `Last read Ch. ${item.lastChapterNumber} · p. ${item.lastPageNumber || 1}`

  return (
    <MangaCard
      index={index}
      manga={{ slug: item.slug, title: item.title, coverImageUrl: item.coverImageUrl, status: item.status }}
      subtitle={progress}
      badge={
        <>
          {item.isLiked && (
            <span className="absolute right-2 top-2 rounded-full bg-card/90 p-1 text-accent shadow-sm">
              <HeartIcon filled width={13} height={13} />
            </span>
          )}
          {item.isFollowing && item.unreadCount > 0 && (
            <span className="absolute bottom-2 left-2 rounded-md bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-ink shadow-sm">
              {item.unreadCount} new
            </span>
          )}
        </>
      }
    >
      {target && (
        <Link
          to={readerPath(item.slug, target)}
          className={`mt-2 ${target.caughtUp ? 'btn-quiet' : 'btn'} !px-3 !py-1.5 text-xs`}
        >
          {!target.caughtUp && <PlayIcon width={11} height={11} />}
          {target.label}
        </Link>
      )}
    </MangaCard>
  )
}
