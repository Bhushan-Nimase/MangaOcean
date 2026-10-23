// Small fetch wrapper.
// The short-lived access token lives only in memory (never localStorage), so XSS can't steal a
// long-lived credential. The long-lived refresh token is an HttpOnly cookie handled by the browser.

let accessToken = null
let refreshPromise = null
let onSessionExpired = null

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export const setSessionExpiredHandler = (fn) => {
  onSessionExpired = fn
}

async function parse(res) {
  if (res.status === 204) return null
  const isJson = (res.headers.get('content-type') || '').includes('json')
  const data = isJson ? await res.json().catch(() => null) : null

  if (!res.ok) {
    let message = data?.title || `Request failed (${res.status})`
    if (data?.errors) message = Object.values(data.errors).flat().join(' ')
    if (res.status === 429) message = data?.title || 'Too many requests. Please slow down.'
    throw new ApiError(message, res.status)
  }
  return data
}

// One refresh at a time: concurrent callers (React StrictMode, parallel requests) share the same promise
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
      .then(async (res) => {
        // Not logged in (no refresh cookie): the server answers 204 on purpose, so guests get no console errors
        if (res.status === 204) return null
        if (!res.ok) {
          accessToken = null
          return null
        }
        const data = await res.json()
        accessToken = data.accessToken
        return data
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

async function request(path, { method = 'GET', json, form, retry = true } = {}) {
  const headers = {}
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  let body
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
  }
  if (form) body = form

  const res = await fetch(path, { method, headers, body, credentials: 'include' })

  // Access token expired -> silently get a new one and retry once
  if (res.status === 401 && retry && !path.startsWith('/api/auth/')) {
    const session = await refreshSession()
    if (session) return request(path, { method, json, form, retry: false })
    onSessionExpired?.()
  }
  return parse(res)
}

const query = (params = {}) => {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, v)
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const api = {
  auth: {
    async login(identifier, password) {
      const data = await request('/api/auth/login', { method: 'POST', json: { identifier, password } })
      accessToken = data.accessToken
      return data
    },
    async register(payload) {
      const data = await request('/api/auth/register', { method: 'POST', json: payload })
      accessToken = data.accessToken
      return data
    },
    async logout() {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        })
      } finally {
        accessToken = null
      }
    },
  },

  library: {
    list: (params) => request(`/api/library${query(params)}`),
    status: (mangaId) => request(`/api/library/status/${mangaId}`),
    follow: (mangaId, value) => request(`/api/library/${mangaId}/follow`, { method: 'PUT', json: { value } }),
    like: (mangaId, value) => request(`/api/library/${mangaId}/like`, { method: 'PUT', json: { value } }),
    progress: (mangaId, chapterNumber, pageNumber) =>
      request(`/api/library/${mangaId}/progress`, { method: 'PUT', json: { chapterNumber, pageNumber } }),
    getFilters: () => request('/api/library/filters'),
    saveFilters: (settings) => request('/api/library/filters', { method: 'PUT', json: settings }),
  },

  genres: {
    list: () => request('/api/genres'),
    create: (name) => request('/api/genres', { method: 'POST', json: { name } }),
    remove: (id) => request(`/api/genres/${id}`, { method: 'DELETE' }),
  },

  manga: {
    list: (params) => request(`/api/manga${query(params)}`),
    get: (slug) => request(`/api/manga/${encodeURIComponent(slug)}`),
    create: (payload) => request('/api/manga', { method: 'POST', json: payload }),
    update: (id, payload) => request(`/api/manga/${id}`, { method: 'PUT', json: payload }),
    remove: (id) => request(`/api/manga/${id}`, { method: 'DELETE' }),
    uploadCover: (id, file) => {
      const form = new FormData()
      form.append('file', file)
      return request(`/api/manga/${id}/cover`, { method: 'POST', form })
    },
  },

  chapters: {
    read: (slug, number) => request(`/api/manga/${encodeURIComponent(slug)}/chapters/${number}`),
    create: (mangaId, payload) => request(`/api/manga/${mangaId}/chapters`, { method: 'POST', json: payload }),
    remove: (id) => request(`/api/chapters/${id}`, { method: 'DELETE' }),
    removePage: (pageId) => request(`/api/pages/${pageId}`, { method: 'DELETE' }),
    uploadPages: (id, files) => {
      const form = new FormData()
      Array.from(files).forEach((f) => form.append('files', f))
      return request(`/api/chapters/${id}/pages`, { method: 'POST', form })
    },
  },
}
