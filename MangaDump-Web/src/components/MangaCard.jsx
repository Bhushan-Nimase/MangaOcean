import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import StatusBadge from './StatusBadge.jsx'

// `children` is rendered under the title (used by the Library for the Continue button).
export default function MangaCard({ manga, index = 0, subtitle, badge, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 10) * 0.025, duration: 0.22 }}
      className="flex flex-col"
    >
      <Link to={`/manga/${manga.slug}`} className="group block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-line bg-sunk">
          {manga.coverImageUrl ? (
            <img
              src={manga.coverImageUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-4 text-center font-display text-sm text-mute">
              {manga.title}
            </div>
          )}
          <StatusBadge status={manga.status} className="absolute left-2 top-2 shadow-sm" />
          {badge}
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug group-hover:text-accent">{manga.title}</h3>
      </Link>
      {subtitle && <p className="text-xs text-mute">{subtitle}</p>}
      {children}
    </motion.div>
  )
}
