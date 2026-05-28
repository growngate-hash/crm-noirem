import { createClient as createAdminClient } from '@supabase/supabase-js'
import Link from 'next/link'

export const revalidate = 0

async function getAdminData() {
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, owner_id, business_name, country, status, trial_ends_at, created_at, is_superadmin')
    .order('created_at', { ascending: false })

  return tenants ?? []
}

function StatusBadge({ status, trialEndsAt }: { status: string, trialEndsAt: string | null }) {
  const now = new Date()
  const trialExpired = status === 'trial' && trialEndsAt && new Date(trialEndsAt) < now
  const effectiveStatus = trialExpired ? 'expired' : status

  const config: Record<string, { label: string, bg: string, color: string }> = {
    trial:     { label: 'Trial',     bg: 'rgba(245,181,68,0.15)',  color: '#F5B544' },
    active:    { label: 'Activo',    bg: 'rgba(31,143,92,0.15)',   color: '#1F8F5C' },
    expired:   { label: 'Expirado',  bg: 'rgba(217,83,61,0.15)',   color: '#D9533D' },
    suspended: { label: 'Suspendido',bg: 'rgba(90,88,82,0.2)',     color: '#A8A6A0' },
  }
  const c = config[effectiveStatus] ?? config.expired

  return (
    <span style={{
      background: c.bg, color: c.color,
      padding: '3px 10px', borderRadius: 100,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.5px',
      textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const,
    }}>
      {c.label}
    </span>
  )
}

function daysRemaining(trialEndsAt: string | null): string {
  if (!trialEndsAt) return '—'
  const diff = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000)
  if (diff < 0) return 'Expirado'
  if (diff === 0) return 'Hoy'
  return `${diff}d`
}

export default async function AdminPage() {
  const tenants = await getAdminData()
  const now = new Date()

  const total     = tenants.filter(t => !t.is_superadmin).length
  const inTrial   = tenants.filter(t => !t.is_superadmin && t.status === 'trial' && new Date(t.trial_ends_at) > now).length
  const active    = tenants.filter(t => !t.is_superadmin && t.status === 'active').length
  const expired   = tenants.filter(t => !t.is_superadmin && (t.status === 'expired' || (t.status === 'trial' && new Date(t.trial_ends_at) < now))).length
  const suspended = tenants.filter(t => !t.is_superadmin && t.status === 'suspended').length
  const thisWeek  = tenants.filter(t => !t.is_superadmin && new Date(t.created_at) > new Date(Date.now() - 7 * 86400000)).length

  const kpis = [
    { label: 'Total clientes', value: total,     color: '#FAFAF7' },
    { label: 'En trial',       value: inTrial,   color: '#F5B544' },
    { label: 'Activos',        value: active,    color: '#1F8F5C' },
    { label: 'Expirados',      value: expired,   color: '#D9533D' },
    { label: 'Suspendidos',    value: suspended, color: '#A8A6A0' },
    { label: 'Nuevos 7 días',  value: thisWeek,  color: '#3DD9D6' },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Título */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#3DD9D6', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>
          Panel de administración
        </div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 500, color: '#FAFAF7', letterSpacing: '-0.025em' }}>
          Tenants SAFFI
        </h1>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 36 }}>
        {kpis.map(k => (
          <div key={k.label} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, padding: '18px 16px',
          }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: k.color, fontFamily: 'monospace', marginBottom: 4 }}>
              {k.value}
            </div>
            <div style={{ fontSize: 11, color: '#B8D4ED', letterSpacing: '0.3px' }}>
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* Tabla de tenants */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['Negocio', 'Email owner', 'País', 'Registro', 'Estado', 'Trial restante', ''].map(h => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: 'left' as const,
                  fontSize: 11, fontWeight: 600, color: '#B8D4ED',
                  letterSpacing: '0.5px', textTransform: 'uppercase' as const,
                  fontFamily: 'monospace',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tenants.filter(t => !t.is_superadmin).map((t, i) => (
              <tr key={t.id} style={{
                borderBottom: i < total - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}>
                <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 500, color: '#FAFAF7' }}>
                  {t.business_name ?? '—'}
                </td>
                <td style={{ padding: '14px 16px', fontSize: 12, color: '#B8D4ED', fontFamily: 'monospace' }}>
                  {t.owner_id}
                </td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: '#FAFAF7' }}>
                  {t.country ?? '—'}
                </td>
                <td style={{ padding: '14px 16px', fontSize: 12, color: '#B8D4ED', fontFamily: 'monospace' }}>
                  {new Date(t.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <StatusBadge status={t.status} trialEndsAt={t.trial_ends_at} />
                </td>
                <td style={{ padding: '14px 16px', fontSize: 12, color: '#B8D4ED', fontFamily: 'monospace' }}>
                  {daysRemaining(t.trial_ends_at)}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <Link href={`/admin/tenants/${t.id}`} style={{
                    fontSize: 12, color: '#3DD9D6', textDecoration: 'none', fontWeight: 500,
                  }}>
                    Ver →
                  </Link>
                </td>
              </tr>
            ))}
            {total === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: '#5A5852', fontSize: 13 }}>
                  No hay tenants registrados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}