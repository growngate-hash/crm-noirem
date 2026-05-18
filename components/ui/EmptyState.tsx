interface EmptyStateProps {
  icon: string
  title: string
  subtitle: string
  actionLabel?: string
  onAction?: () => void
}

const KNOWN = ['invoice','expense','contact','supplier','vehicle','booking','service','inventory','report','notification']

function EmptyIcon({ icon }: { icon: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24"
      fill="none" stroke="#c9a84c" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round">
      {icon === 'invoice' && <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </>}
      {icon === 'expense' && <>
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="6" x2="12" y2="12"/>
        <path d="M8 12h8"/>
        <circle cx="12" cy="16" r="0.5" fill="#c9a84c"/>
      </>}
      {icon === 'contact' && <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </>}
      {icon === 'supplier' && <>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </>}
      {icon === 'vehicle' && <>
        <rect x="1" y="3" width="15" height="13" rx="2"/>
        <path d="M16 8h4l3 5v3h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </>}
      {icon === 'booking' && <>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </>}
      {icon === 'service' && <>
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
      </>}
      {icon === 'inventory' && <>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </>}
      {icon === 'report' && <>
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </>}
      {icon === 'notification' && <>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </>}
      {!KNOWN.includes(icon) && <>
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <circle cx="12" cy="16" r="0.5" fill="#c9a84c"/>
      </>}
    </svg>
  )
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
        marginBottom: 20,
      }}>
        <EmptyIcon icon={icon} />
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
