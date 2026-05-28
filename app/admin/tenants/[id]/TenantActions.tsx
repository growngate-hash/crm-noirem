'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  tenantId: string
  currentStatus: string
  trialEndsAt: string | null
}

export default function TenantActions({ tenantId, currentStatus, trialEndsAt }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [extendDays, setExtendDays] = useState(7)
  const [message, setMessage] = useState<{ type: 'ok' | 'error', text: string } | null>(null)

  async function doAction(action: string, payload?: Record<string, unknown>) {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, tenantId, payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessage({ type: 'ok', text: 'Acción aplicada correctamente.' })
      router.refresh()
    } catch (e: unknown) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Error desconocido' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12, padding: '24px 32px',
    }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#3DD9D6', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 20 }}>
        Acciones
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>

        {/* Activar */}
        {currentStatus !== 'active' && (
          <button
            onClick={() => doAction('activate')}
            disabled={loading}
            style={{
              background: 'rgba(31,143,92,0.15)', color: '#1F8F5C',
              border: '1px solid rgba(31,143,92,0.3)',
              padding: '9px 20px', borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            ✓ Activar cuenta
          </button>
        )}

        {/* Suspender */}
        {currentStatus !== 'suspended' && (
          <button
            onClick={() => doAction('suspend')}
            disabled={loading}
            style={{
              background: 'rgba(217,83,61,0.15)', color: '#D9533D',
              border: '1px solid rgba(217,83,61,0.3)',
              padding: '9px 20px', borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            ⊘ Suspender
          </button>
        )}

        {/* Extender trial */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="number"
            min={1}
            max={90}
            value={extendDays}
            onChange={e => setExtendDays(Number(e.target.value))}
            style={{
              width: 60, padding: '9px 10px', borderRadius: 8,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#FAFAF7', fontSize: 13, textAlign: 'center',
            }}
          />
          <button
            onClick={() => doAction('extend_trial', { days: extendDays })}
            disabled={loading}
            style={{
              background: 'rgba(245,181,68,0.15)', color: '#F5B544',
              border: '1px solid rgba(245,181,68,0.3)',
              padding: '9px 20px', borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            + Extender trial
          </button>
        </div>

      </div>

      {/* Feedback */}
      {message && (
        <div style={{
          marginTop: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13,
          background: message.type === 'ok' ? 'rgba(31,143,92,0.1)' : 'rgba(217,83,61,0.1)',
          color: message.type === 'ok' ? '#1F8F5C' : '#D9533D',
          border: `1px solid ${message.type === 'ok' ? 'rgba(31,143,92,0.2)' : 'rgba(217,83,61,0.2)'}`,
        }}>
          {message.text}
        </div>
      )}
    </div>
  )
}