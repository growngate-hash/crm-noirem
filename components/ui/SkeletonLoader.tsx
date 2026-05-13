'use client'

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, padding: '12px 16px' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 14, opacity: 0.6 - i * 0.1 }} />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="glass" style={{ padding: 20 }}>
      <div className="skeleton" style={{ height: 10, width: '60%', marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 24, width: '40%' }} />
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </div>
  )
}
