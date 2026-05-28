import { createClient as createAdminClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TenantActions from './TenantActions'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export const revalidate = 0

export default async function AdminTenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!tenant) notFound()

  // Obtener email del owner
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
  const owner = users.find(u => u.id === tenant.owner_id)

  // Obtener audit log de este tenant
  const { data: auditLog } = await supabaseAdmin
    .from('admin_audit_log')
    .select('*')
    .eq('affected_tenant_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  const now = new Date()
  const trialExpired = tenant.status === 'trial' && tenant.trial_ends_at && new Date(tenant.trial_ends_at) < now
  const effectiveStatus = trialExpired ? 'expired' : tenant.status

  const statusConfig: Record<string, { label: string, bg: string, color: string }> = {
    trial:     { label: 'Trial',      bg: 'rgba(245,181,68,0.15)',  color: '#F5B544' },
    active:    { label: 'Activo',     bg: 'rgba(31,143,92,0.15)',   color: '#1F8F5C' },
    expired:   { label: 'Expirado',   bg: 'rgba(217,83,61,0.15)',   color: '#D9533D' },
    suspended: { label: 'Suspendido', bg: 'rgba(90,88,82,0.2)',     color: '#A8A6A0' },
  }
  const sc = statusConfig[effectiveStatus] ?? statusConfig.expired

  const actionLabels: Record<string, string> = {
    activate:     '✓ Cuenta activada',
    suspend:      '⊘ Cuenta suspendida',
    extend_trial: '+ Trial extendido',
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>

      {/* Breadcrumb */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin" style={{ fontSize: 13, color: '#3DD9D6', textDecoration: 'none' }}>
          ← Volver a tenants
        </Link>
      </div>

      {/* Header del tenant */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, padding: '28px 32px', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#3DD9D6', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>
              Tenant
            </div>
            <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 500, color: '#FAFAF7', letterSpacing: '-0.025em' }}>
              {tenant.name}
            </h1>
            <div style={{ fontSize: 13, color: '#B8D4ED', fontFamily: 'monospace' }}>
              {owner?.email ?? tenant.owner_id}
            </div>
          </div>
          <span style={{
            background: sc.bg, color: sc.color,
            padding: '5px 14px', borderRadius: 100,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase',
          }}>
            {sc.label}
          </span>
        </div>

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24 }}>
          {[
            { label: 'País',       value: tenant.country ?? '—' },
            { label: 'Registro',   value: new Date(tenant.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) },
            { label: 'Trial hasta',value: tenant.trial_ends_at ? new Date(tenant.trial_ends_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
            { label: 'Timezone',   value: tenant.timezone ?? '—' },
            { label: 'Plan',       value: tenant.plan_id ?? '—' },
            { label: 'Slug',       value: tenant.slug ?? '—' },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: 10, color: '#5A5852', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 3, fontFamily: 'monospace' }}>
                {item.label}
              </div>
              <div style={{ fontSize: 13, color: '#FAFAF7', fontFamily: 'monospace' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Acciones */}
      <TenantActions tenantId={id} currentStatus={effectiveStatus} trialEndsAt={tenant.trial_ends_at} />

      {/* Audit log */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, padding: '24px 32px', marginTop: 20,
      }}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#3DD9D6', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>
          Historial de acciones
        </div>
        {!auditLog?.length ? (
          <div style={{ fontSize: 13, color: '#5A5852' }}>Sin acciones registradas todavía.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {auditLog.map(log => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: '#FAFAF7' }}>
                  {actionLabels[log.action] ?? log.action}
                  {log.payload?.days && <span style={{ color: '#B8D4ED', marginLeft: 6 }}>+{log.payload.days} días</span>}
                  {log.note && <span style={{ color: '#5A5852', marginLeft: 8 }}>— {log.note}</span>}
                </div>
                <div style={{ fontSize: 11, color: '#5A5852', fontFamily: 'monospace' }}>
                  {new Date(log.created_at).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}