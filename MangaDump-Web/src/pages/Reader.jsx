import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'

export default function Reader() {
  const { slug, number } = useParams()
  const navigate = useNavigate()
  const [chapter, setChapter] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setChapter(null)
    setError('')
    window.scrollTo(0, 0)
    api.chapters
      .read(slug, number)
      .then((c) => !cancelled && setChapter(c))
      .catch((e) => !cancelled && setError(e.status === 404 ? 'Chapter not found.' : e.message))
    return () => {
      cancelled = true
    }
  }, [slug, number])

  const go = (n) => navigate(`/manga/${slug}/chapter/${n}`)

  if (error) return <p className="py-20 text-center text-zinc-400">{error}</p>
  if (!chapter) return <p className="py-20 text-center text-zinc-500">Loading…</p>

  const Controls = () => (
    <div className="flex items-center justify-between gap-3">
      <button className="btn-ghost" disabled={chapter.previousNumber == null} onClick={() => go(chapter.previousNumber)}>
        ← Prev
      </button>
      <Link to={`/manga/${slug}`} className="text-center text-sm text-zinc-400 hover:text-white">
        {chapter.mangaTitle} · Ch. {chapter.number}
        {chapter.title ? ` — ${chapter.title}` : ''}
      </Link>
      <button className="btn-ghost" disabled={chapter.nextNumber == null} onClick={() => go(chapter.nextNumber)}>
        Next →
      </button>
    </div>
  )

  return (
    <div className="mx-auto max-w-3xl">
      <Controls />

      {chapter.pages.length === 0 ? (
        <p className="py-20 text-center text-zinc-500">This chapter has no pages yet.</p>
      ) : (
        <div className="my-6 flex flex-col items-center">
          {chapter.pages.map((p) => (
            <img key={p.id} src={p.imageUrl} alt={`Page ${p.pageNumber}`} loading="lazy" className="w-full" />
          ))}
        </div>
      )}

      <Controls />
    </div>
  )
}
