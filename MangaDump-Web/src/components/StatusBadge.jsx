const styles = {
  Ongoing: 'bg-sage-soft text-sage',
  Completed: 'bg-sunk text-mute',
  Hiatus: 'bg-ochre-soft text-ochre',
  Cancelled: 'bg-accent-soft text-accent',
}

export default function StatusBadge({ status, className = '' }) {
  return (
    <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${styles[status] ?? styles.Completed} ${className}`}>
      {status}
    </span>
  )
}
