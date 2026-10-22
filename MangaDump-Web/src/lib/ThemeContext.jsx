import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const KEY = 'md-theme' // 'light' | 'dark'. Absent = follow the operating system.
const ThemeContext = createContext(null)

const systemTheme = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

function apply(choice) {
  const root = document.documentElement
  if (choice === 'light' || choice === 'dark') root.dataset.theme = choice
  else delete root.dataset.theme
}

function readChoice() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

// Called once from main.jsx before React renders, so the first paint already has the right theme
export const initTheme = () => apply(readChoice())

export function ThemeProvider({ children }) {
  const [choice, setChoice] = useState(readChoice)
  const [system, setSystem] = useState(systemTheme)

  // keep in sync if the OS theme changes while we're following it
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystem(systemTheme())
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const theme = choice ?? system

  const toggle = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setChoice(next)
    apply(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* storage blocked: the choice just won't persist */
    }
  }, [theme])

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
