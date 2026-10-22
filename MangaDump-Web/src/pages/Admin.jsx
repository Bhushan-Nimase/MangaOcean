import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'

const STATUSES = ['Ongoing', 'Completed', 'Hiatus', 'Cancelled']
const emptyForm = { title: '', author: '', artist: '', status: 'Ongoing', releaseYear: '', description: '', genreIds: [] }

export default function Admin() {
  const [tab, setTab] = useState('manga')
  const [notice, setNotice] = useState(null) // { type: 'ok' | 'err', text }

  const flash = useCallback((type, text) => {
    setNotice({ type, text })
    setTimeout(() => setNotice(null), 4000)
  }, [])

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Admin</h1>

      <div className="mb-6 flex gap-2 border-b border-zinc-800">
        {[
          ['manga', 'Manga'],
          ['chapters', 'Chapters & pages'],
          ['genres', 'Genres'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm transition ${
              tab === key ? 'border-violet-500 text-white' : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {notice && (
        <p className={`mb-4 rounded-lg p-3 text-sm ${notice.type === 'ok' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
          {notice.text}
        </p>
      )}

      {tab === 'manga' && <MangaTab flash={flash} />}
      {tab === 'chapters' && <ChaptersTab flash={flash} />}
      {tab === 'genres' && <GenresTab flash={flash} />}
    </div>
  )
}

/* ---------------- Manga ---------------- */

function MangaTab({ flash }) {
  const [genres, setGenres] = useState([])
  const [list, setList] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [cover, setCover] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => api.manga.list({ pageSize: 100 }).then((r) => setList(r.items)), [])

  useEffect(() => {
    api.genres.list().then(setGenres)
    load().catch((e) => flash('err', e.message))
  }, [load, flash])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const toggleGenre = (id) =>
    setForm((f) => ({
      ...f,
      genreIds: f.genreIds.includes(id) ? f.genreIds.filter((g) => g !== id) : [...f.genreIds, id],
    }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const created = await api.manga.create({
        ...form,
        releaseYear: form.releaseYear ? Number(form.releaseYear) : null,
        author: form.author || null,
        artist: form.artist || null,
        description: form.description || null,
      })
      if (cover) await api.manga.uploadCover(created.id, cover)
      flash('ok', `Created "${created.title}"`)
      setForm(emptyForm)
      setCover(null)
      e.target.reset()
      await load()
    } catch (err) {
      flash('err', err.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (m) => {
    if (!window.confirm(`Delete "${m.title}" with all chapters and images?`)) return
    try {
      await api.manga.remove(m.id)
      flash('ok', `Deleted "${m.title}"`)
      await load()
    } catch (err) {
      flash('err', err.message)
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <form onSubmit={submit} className="space-y-3">
        <h2 className="text-lg font-semibold">Add manga</h2>
        <input className="input" placeholder="Title *" value={form.title} onChange={set('title')} required maxLength={300} />
        <div className="grid grid-cols-2 gap-3">
          <input className="input" placeholder="Author" value={form.author} onChange={set('author')} />
          <input className="input" placeholder="Artist" value={form.artist} onChange={set('artist')} />
          <select className="input" value={form.status} onChange={set('status')}>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <input className="input" type="number" placeholder="Year" min="1900" max="2100" value={form.releaseYear} onChange={set('releaseYear')} />
        </div>
        <textarea className="input" rows={4} placeholder="Description" value={form.description} onChange={set('description')} maxLength={5000} />

        <div className="flex flex-wrap gap-2">
          {genres.map((g) => (
            <button
              type="button"
              key={g.id}
              onClick={() => toggleGenre(g.id)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                form.genreIds.includes(g.id) ? 'border-violet-500 bg-violet-500/20 text-violet-200' : 'border-zinc-700 text-zinc-400'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-400">Cover image</label>
          <input type="file" accept="image/*" onChange={(e) => setCover(e.target.files[0] ?? null)} className="text-sm text-zinc-400" />
        </div>

        <button className="btn" disabled={busy}>
          {busy ? 'Saving…' : 'Create manga'}
        </button>
      </form>

      <div>
        <h2 className="mb-3 text-lg font-semibold">All manga ({list.length})</h2>
        <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
          {list.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span className="truncate">{m.title}</span>
              <button className="btn-danger" onClick={() => remove(m)}>
                Delete
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="px-4 py-6 text-center text-zinc-500">Nothing yet.</li>}
        </ul>
      </div>
    </div>
  )
}

/* ---------------- Chapters & pages ---------------- */

function ChaptersTab({ flash }) {
  const [list, setList] = useState([])
  const [slug, setSlug] = useState('')
  const [manga, setManga] = useState(null)
  const [number, setNumber] = useState('')
  const [title, setTitle] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    api.manga.list({ pageSize: 100 }).then((r) => setList(r.items)).catch((e) => flash('err', e.message))
  }, [flash])

  const reload = useCallback(
    (s = slug) => (s ? api.manga.get(s).then(setManga) : Promise.resolve(setManga(null))),
    [slug],
  )

  useEffect(() => {
    reload(slug).catch((e) => flash('err', e.message))
  }, [slug, reload, flash])

  const addChapter = async (e) => {
    e.preventDefault()
    try {
      await api.chapters.create(manga.id, { number: Number(number), title: title || null })
      flash('ok', `Added chapter ${number}`)
      setNumber('')
      setTitle('')
      await reload()
    } catch (err) {
      flash('err', err.message)
    }
  }

  const upload = async (chapter, files) => {
    if (!files?.length) return
    setBusyId(chapter.id)
    try {
      const pages = await api.chapters.uploadPages(chapter.id, files)
      flash('ok', `Uploaded ${pages.length} page(s) to chapter ${chapter.number}`)
      await reload()
    } catch (err) {
      flash('err', err.message)
    } finally {
      setBusyId(null)
    }
  }

  const removeChapter = async (c) => {
    if (!window.confirm(`Delete chapter ${c.number} and its pages?`)) return
    try {
      await api.chapters.remove(c.id)
      flash('ok', `Deleted chapter ${c.number}`)
      await reload()
    } catch (err) {
      flash('err', err.message)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <select className="input" value={slug} onChange={(e) => setSlug(e.target.value)}>
        <option value="">Choose a manga…</option>
        {list.map((m) => (
          <option key={m.id} value={m.slug}>
            {m.title}
          </option>
        ))}
      </select>

      {manga && (
        <>
          <form onSubmit={addChapter} className="flex flex-wrap gap-3">
            <input className="input w-32" type="number" step="0.01" min="0" placeholder="Number *" value={number} onChange={(e) => setNumber(e.target.value)} required />
            <input className="input flex-1" placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <button className="btn">Add chapter</button>
          </form>

          <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
            {manga.chapters.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  Chapter {c.number}
                  {c.title ? <span className="text-zinc-500"> — {c.title}</span> : null}
                  <span className="ml-2 text-xs text-zinc-500">{c.pageCount} pages</span>
                </span>
                <span className="flex items-center gap-3">
                  <label className="btn-ghost cursor-pointer text-xs">
                    {busyId === c.id ? 'Uploading…' : 'Upload pages'}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      disabled={busyId === c.id}
                      onChange={(e) => {
                        upload(c, e.target.files)
                        e.target.value = ''
                      }}
                    />
                  </label>
                  <button className="btn-danger" onClick={() => removeChapter(c)}>
                    Delete
                  </button>
                </span>
              </li>
            ))}
            {manga.chapters.length === 0 && <li className="px-4 py-6 text-center text-zinc-500">No chapters yet.</li>}
          </ul>
          <p className="text-xs text-zinc-500">Pages are numbered in the order the files are selected — pick them in reading order.</p>
        </>
      )}
    </div>
  )
}

/* ---------------- Genres ---------------- */

function GenresTab({ flash }) {
  const [genres, setGenres] = useState([])
  const [name, setName] = useState('')

  const load = useCallback(() => api.genres.list().then(setGenres), [])
  useEffect(() => {
    load().catch((e) => flash('err', e.message))
  }, [load, flash])

  const add = async (e) => {
    e.preventDefault()
    try {
      await api.genres.create(name)
      setName('')
      await load()
    } catch (err) {
      flash('err', err.message)
    }
  }

  const remove = async (g) => {
    try {
      await api.genres.remove(g.id)
      await load()
    } catch (err) {
      flash('err', err.message)
    }
  }

  return (
    <div className="max-w-md space-y-5">
      <form onSubmit={add} className="flex gap-3">
        <input className="input" placeholder="New genre" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
        <button className="btn">Add</button>
      </form>
      <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
        {genres.map((g) => (
          <li key={g.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            {g.name}
            <button className="btn-danger" onClick={() => remove(g)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
