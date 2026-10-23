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
      <h1 className="mb-6 font-display text-3xl font-bold">Admin</h1>

      <div className="mb-6 flex gap-6 border-b border-line">
        {[
          ['manga', 'Manga'],
          ['chapters', 'Chapters & pages'],
          ['genres', 'Genres'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 pb-2 text-sm transition ${
              tab === key ? 'border-accent font-semibold text-ink' : 'border-transparent text-mute hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {notice && <p className={`mb-4 ${notice.type === 'ok' ? 'notice-ok' : 'notice-err'}`}>{notice.text}</p>}

      {tab === 'manga' && <MangaTab flash={flash} />}
      {tab === 'chapters' && <ChaptersTab flash={flash} />}
      {tab === 'genres' && <GenresTab flash={flash} />}
    </div>
  )
}

/* ---------------- Manga: create, edit, delete ---------------- */

function MangaTab({ flash }) {
  const [genres, setGenres] = useState([])
  const [list, setList] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null) // { id, title } while editing an existing manga
  const [cover, setCover] = useState(null)
  const [fileKey, setFileKey] = useState(0) // changing it clears the file input
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => api.manga.list({ pageSize: 100 }).then((r) => setList(r.items)), [])

  useEffect(() => {
    api.genres.list().then((g) => setGenres(g || [])).catch((e) => flash('err', e.message))
    load().catch((e) => flash('err', e.message))
  }, [load, flash])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const toggleGenre = (id) =>
    setForm((f) => ({
      ...f,
      genreIds: f.genreIds.includes(id) ? f.genreIds.filter((g) => g !== id) : [...f.genreIds, id],
    }))

  const reset = () => {
    setForm(emptyForm)
    setEditing(null)
    setCover(null)
    setFileKey((k) => k + 1)
  }

  const startEdit = async (m) => {
    try {
      const d = await api.manga.get(m.slug)
      setEditing({ id: d.id, title: d.title })
      setForm({
        title: d.title,
        author: d.author ?? '',
        artist: d.artist ?? '',
        status: d.status,
        releaseYear: d.releaseYear ?? '',
        description: d.description ?? '',
        genreIds: d.genres.map((g) => g.id),
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      flash('err', err.message)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const payload = {
        ...form,
        releaseYear: form.releaseYear ? Number(form.releaseYear) : null,
        author: form.author || null,
        artist: form.artist || null,
        description: form.description || null,
      }
      const saved = editing ? await api.manga.update(editing.id, payload) : await api.manga.create(payload)
      if (cover) await api.manga.uploadCover(saved.id, cover)
      flash('ok', editing ? `Updated "${saved.title}"` : `Created "${saved.title}"`)
      reset()
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
      if (editing?.id === m.id) reset()
      await load()
    } catch (err) {
      flash('err', err.message)
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <form onSubmit={submit} className="card space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">{editing ? `Edit “${editing.title}”` : 'Add manga'}</h2>
          {editing && (
            <button type="button" className="btn-quiet" onClick={reset}>
              Cancel
            </button>
          )}
        </div>

        <input className="input" placeholder="Title *" value={form.title} onChange={set('title')} required maxLength={300} />
        <div className="grid grid-cols-2 gap-3">
          <input className="input" placeholder="Author" value={form.author} onChange={set('author')} />
          <input className="input" placeholder="Artist" value={form.artist} onChange={set('artist')} />
          <select className="input" value={form.status} onChange={set('status')}>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <input
            className="input"
            type="number"
            placeholder="Year"
            min="1900"
            max="2100"
            value={form.releaseYear}
            onChange={set('releaseYear')}
          />
        </div>
        <textarea
          className="input"
          rows={4}
          placeholder="Description"
          value={form.description}
          onChange={set('description')}
          maxLength={5000}
        />

        <div className="flex flex-wrap gap-2">
          {genres.map((g) => (
            <button
              type="button"
              key={g.id}
              onClick={() => toggleGenre(g.id)}
              className={`chip ${form.genreIds.includes(g.id) ? 'chip-on' : ''}`}
            >
              {g.name}
            </button>
          ))}
        </div>

        <div>
          <label className="label">{editing ? 'Replace cover (optional)' : 'Cover image'}</label>
          <input
            key={fileKey}
            type="file"
            accept="image/*"
            onChange={(e) => setCover(e.target.files[0] ?? null)}
            className="text-sm text-mute"
          />
        </div>

        <button className="btn" disabled={busy}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Create manga'}
        </button>
      </form>

      <div>
        <h2 className="mb-3 font-display text-xl font-bold">All manga ({list.length})</h2>
        <ul className="card divide-y divide-line overflow-hidden">
          {list.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span className="truncate">{m.title}</span>
              <span className="flex shrink-0 gap-2">
                <button className="btn-quiet !px-3 !py-1.5 text-xs" onClick={() => startEdit(m)}>
                  Edit
                </button>
                <button className="btn-danger" onClick={() => remove(m)}>
                  Delete
                </button>
              </span>
            </li>
          ))}
          {list.length === 0 && <li className="px-4 py-6 text-center text-mute">Nothing yet.</li>}
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
  const [openId, setOpenId] = useState(null) // chapter whose pages are shown
  const [pages, setPages] = useState([])

  useEffect(() => {
    api.manga.list({ pageSize: 100 }).then((r) => setList(r?.items || [])).catch((e) => flash('err', e.message))
  }, [flash])

  const reload = useCallback(
    (s = slug) => (s ? api.manga.get(s).then(setManga) : Promise.resolve(setManga(null))),
    [slug],
  )

  useEffect(() => {
    setOpenId(null)
    reload(slug).catch((e) => flash('err', e.message))
  }, [slug, reload, flash])

  const loadPages = useCallback(
    (chapter) => api.chapters.read(slug, chapter.number).then((c) => setPages(c.pages)),
    [slug],
  )

  const togglePages = async (chapter) => {
    if (openId === chapter.id) return setOpenId(null)
    try {
      await loadPages(chapter)
      setOpenId(chapter.id)
    } catch (err) {
      flash('err', err.message)
    }
  }

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
      const added = await api.chapters.uploadPages(chapter.id, files)
      flash('ok', `Uploaded ${added.length} page(s) to chapter ${chapter.number}`)
      await reload()
      if (openId === chapter.id) await loadPages(chapter)
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
      if (openId === c.id) setOpenId(null)
      await reload()
    } catch (err) {
      flash('err', err.message)
    }
  }

  const removePage = async (chapter, page) => {
    if (!window.confirm(`Delete page ${page.pageNumber}?`)) return
    try {
      await api.chapters.removePage(page.id)
      await Promise.all([reload(), loadPages(chapter)])
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
            <input
              className="input !w-32"
              type="number"
              step="0.01"
              min="0"
              placeholder="Number *"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              required
            />
            <input className="input flex-1" placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <button className="btn">Add chapter</button>
          </form>

          <ul className="card divide-y divide-line overflow-hidden">
            {manga.chapters.map((c) => (
              <li key={c.id} className="text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <span>
                    Chapter {c.number}
                    {c.title ? <span className="text-mute"> — {c.title}</span> : null}
                    <span className="ml-2 text-xs text-mute">{c.pageCount} pages</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <button className="btn-quiet !px-3 !py-1.5 text-xs" onClick={() => togglePages(c)}>
                      {openId === c.id ? 'Hide pages' : 'Pages'}
                    </button>
                    <label className="btn-quiet cursor-pointer !px-3 !py-1.5 text-xs">
                      {busyId === c.id ? 'Uploading…' : 'Upload'}
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
                </div>

                {openId === c.id && (
                  <div className="border-t border-line bg-sunk px-4 py-4">
                    {pages.length === 0 ? (
                      <p className="text-mute">No pages uploaded yet.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6">
                        {pages.map((p) => (
                          <div key={p.id} className="group relative">
                            <img src={p.imageUrl} alt={`Page ${p.pageNumber}`} loading="lazy" className="aspect-[2/3] w-full rounded border border-line object-cover" />
                            <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-[10px] text-white">{p.pageNumber}</span>
                            <button
                              onClick={() => removePage(c, p)}
                              className="absolute right-1 top-1 rounded bg-accent px-1.5 text-[11px] font-bold text-accent-ink opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                              aria-label={`Delete page ${p.pageNumber}`}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
            {manga.chapters.length === 0 && <li className="px-4 py-6 text-center text-mute">No chapters yet.</li>}
          </ul>
          <p className="text-xs text-mute">
            Uploaded pages are numbered in the order the files are selected — pick them in reading order.
          </p>
        </>
      )}
    </div>
  )
}

/* ---------------- Genres ---------------- */

function GenresTab({ flash }) {
  const [genres, setGenres] = useState([])
  const [name, setName] = useState('')

  const load = useCallback(() => api.genres.list().then((g) => setGenres(g || [])), [])
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
      <ul className="card divide-y divide-line overflow-hidden">
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
