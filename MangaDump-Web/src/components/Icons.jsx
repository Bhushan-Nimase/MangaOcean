// Small hand-drawn stroke icons (24x24). They inherit the text colour.
const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const SunIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)

export const MoonIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
  </svg>
)

export const HeartIcon = ({ filled, ...p }) => (
  <svg {...base} {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </svg>
)

export const BookmarkIcon = ({ filled, ...p }) => (
  <svg {...base} {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M6 3h12v18l-6-4-6 4z" />
  </svg>
)

export const FilterIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M3 5h18M6 12h12M10 19h4" />
  </svg>
)

export const SearchIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </svg>
)

export const LockIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
)

export const CheckIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
)

export const PlayIcon = (p) => (
  <svg {...base} {...p} fill="currentColor" stroke="none">
    <path d="M7 4.5v15l12-7.5z" />
  </svg>
)
