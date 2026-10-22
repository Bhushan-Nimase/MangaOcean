import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/AuthContext.jsx'
import MangaCard from '../components/MangaCard.jsx'
import { FilterIcon, LockIcon, SearchIcon } from '../components/Icons.jsx'

const STATUSES = ['Ongoing', 'Completed', 'Hiatus', 'Cancelled']
const SORTS = [
  ['updated', 'Recently updated'],
  ['newest', 'Newly added'],
  ['popular', 'Most followed'],
  ['chapters', 'Most chapters'],
  ['title', 'Title A–Z'],
]
const DEFAULT_FILTERS = { sort: 'updated', status: '', include: [], exclude: [] }

const fromServer = (s) => ({
  sort: s.sort || 'updated',
  status: s.status ?? '',
  include: s.includeGenres ?? [],
  exclude: s.excludeGenres ?? [],
})

export default function Home() {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id

  const [genres, setGenres] = useState([])
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [panelOpen, setPanelOpen] = useState(false)
  const [filtersReady, setFiltersReady] = useState(false)
  const [saveState, setSaveState] = useState('') // '' | 'saving' | 'saved' | 'error'
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.genres.list().then(setGenres).catch(() => {})
  }, [])

  // Members: start from their saved default filters. Guests: no filters at all.
  useEffect(() => {
    if (authLoading) return
    if (!userId) {
      setFilters(DEFAULT_FILTERS)
      setPanelOpen(false)
      setFiltersReady(true)
      return
    }
    let cancelled = false
    setFiltersReady(false)
    api.library
      .getFilters()
      .then((s) => !cancelled && setFilters(fromServer(s)))
      .catch(() => {})
      .finally(() => !cancelled && setFiltersReady(true))
    return () => {
      cancelled = true
    }
  }, [userId, authLoading])

  // wait for the user to stop typing before querying
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (!filtersReady) return
    let cancelled = false
    setLoading(true)
    setError('')
    api.manga
      .list({
        search: debounced,
        genres: filters.include.join(','),
        excludeGenres: filters.exclude.join(','),
        status: filters.status,
        sort: filters.sort === 'updated' ? '' : filters.sort,
        page,
        pageSize: 24,
      })
      .then((data) => !cancelled && setResult(data))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [filtersReady, debounced, filters, page])

  const activeCount = useMemo(
    () => filters.include.length + filters.exclude.length + (filters.status ? 1 : 0) + (filters.sort !== 'updated' ? 1 : 0),
    [filters],
  )

  const change = (patch) => {
    setFilters((f) => ({ ...f, ...patch }))
    setPage(1)
    setSaveState('')
  }

  // tap once = must have it, tap twice = hide it, tap again = off
  const cycleGenre = (slug) => {
    const included = filters.include.includes(slug)
    const excluded = filters.exclude.includes(slug)
    if (!included && !excluded) change({ include: [...filters.include, slug] })
    else if (included) change({ include: filters.include.filter((s) => s !== slug), exclude: [...filters.exclude, slug] })
    else change({ exclude: filters.exclude.filter((s) => s !== slug) })
  }

  const saveDefaults = async () => {
    setSaveState('saving')
    try {
      await api.library.saveFilters({
        sort: filters.sort,
        status: filters.status || null,
        includeGenres: filters.include,
        excludeGenres: filters.exclude,
      })
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Browse</h1>
          {result && (
            <p className="text-sm text-mute">
              {result.totalCount} title{result.totalCount === 1 ? '' : 's'}
            </p>
          )}
        </div>

        <div className="flex w-full gap-2 sm:w-auto">
          <label className="relative flex-1 sm:w-72">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <input
              className="input !pl-9"
              placeholder="Search titles"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button className="btn-quiet" onClick={() => setPanelOpen((o) => !o)} aria-expanded={panelOpen}>
            {user ? <FilterIcon /> : <LockIcon />}
            Filters
            {activeCount > 0 && (
              <span className="rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-ink">{activeCount}</span>
            )}
          </button>
        </div>
      </div>

      {panelOpen && !user && (
        <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-mute">
            Filters, sorting and saved defaults are for members. Create a free account to use them.
          </p>
          <div className="flex gap-2">
            <Link to="/login" className="btn-quiet">
              Log in
            </Link>
            <Link to="/register" className="btn">
              Sign up
            </Link>
          </div>
        </div>
      )}

      {panelOpen && user && (
        <div className="card mb-6 space-y-5 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Sort by</label>
              <select className="input" value={filters.sort} onChange={(e) => change({ sort: e.target.value })}>
                {SORTS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={filters.status} onChange={(e) => change({ status: e.target.value })}>
                <option value="">Any status</option>
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Genres — tap once to require, twice to hide</label>
            <div className="flex flex-wrap gap-2">
              {genres.map((g) => {
                const included = filters.include.includes(g.slug)
                const excluded = filters.exclude.includes(g.slug)
                return (
                  <button
                    key={g.id}
                    onClick={() => cycleGenre(g.slug)}
                    className={`chip ${included ? 'chip-on' : ''} ${excluded ? '!border-mute/50 !bg-sunk line-through' : ''}`}
                    aria-pressed={included || excluded}
                  >
                    {included && '+ '}
                    {excluded && '− '}
                    {g.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <button className="btn" onClick={saveDefaults} disabled={saveState === 'saving'}>
              {saveState === 'saving' ? 'Saving…' : 'Save as my defaults'}
            </button>
            <button className="btn-quiet" onClick={() => change({ ...DEFAULT_FILTERS })} disabled={activeCount === 0}>
              Reset
            </button>
            {saveState === 'saved' && <span className="text-sm text-sage">Saved — applied every time you browse.</span>}
            {saveState === 'error' && <span className="text-sm text-accent">Couldn't save. Try again.</span>}
          </div>
        </div>
      )}

      {error && <p className="notice-err mb-4">{error}</p>}

      {loading && !result ? (
        <p className="py-20 text-center text-mute">Loading…</p>
      ) : result?.items.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-display text-xl">Nothing matches.</p>
          <p className="mt-1 text-sm text-mute">Try a different search or loosen your filters.</p>
        </div>
      ) : (
        <div
          className={`grid grid-cols-2 gap-x-4 gap-y-6 transition-opacity sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 ${
            loading ? 'opacity-60' : ''
          }`}
        >
          {result?.items.map((m, i) => (
            <MangaCard key={m.id} manga={m} index={i} subtitle={`${m.chapterCount} chapter${m.chapterCount === 1 ? '' : 's'}`} />
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
