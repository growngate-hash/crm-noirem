interface EmptyStateProps {
  icon: string
  title: string
  subtitle: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 24px', textAlign: 'center',
      background: '#1a1a1f', border: '1px dashed #2a2a30',
      borderRadius: 16, margin: '16px 0',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32, marginBottom: 20,
      }}>
        {icon}
      </div>
      <div style={{ color: '#f0ede8', fontSize: 16, fontWeight: 700, marginBottom: 8, letterSpacing: '0.3px', fontFamily: 'Outfit, sans-serif' }}>
        {title}
      </div>
      <div style={{ color: '#888580', fontSize: 13, lineHeight: 1.5, maxWidth: 240, marginBottom: actionLabel ? 24 : 0, fontFamily: 'Outfit, sans-serif' }}>
        {subtitle}
      </div>
      {actionLabel && onAction && (
        <button onClick={onAction} style={{
          padding: '11px 24px', background: '#c9a84c', color: '#0d0d0f',
          border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 800,
          cursor: 'pointer', letterSpacing: '0.8px', fontFamily: 'Outfit, sans-serif',
        }}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
