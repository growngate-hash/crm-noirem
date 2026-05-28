import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PayrollActions from './PayrollActions'

export const revalidate = 0

export default async function PayrollDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Obtener período
  const { data: period } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!period) notFound()

  // Obtener líneas con empleado
  const { data: lines } = await supabase
    .from('payroll_lines')
    .select('*, employee:employees(*)')
    .eq('payroll_period_id', id)
    .order('created_at')

  // Obtener empleados activos para poder agregar líneas
  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, salary_base, salary_period, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('full_name')

  const STATUS_CONFIG: Record<string, { label: string, bg: string, color: string }> = {
    draft:    { label: 'Borrador',  bg: '#F0EFEA', color: '#5A5852' },
    approved: { label: 'Aprobado', bg: '#E6F0FA', color: '#1F5A9B' },
    paid:     { label: 'Pagado',   bg: '#E6F5EC', color: '#1F8F5C' },
  }

  const sc = STATUS_CONFIG[period.status] ?? STATUS_CONFIG.draft
  const totalLines = (lines ?? []).reduce((sum, l) => sum + l.total, 0)

  // Calcular días del período
  const startDate = new Date(period.start_date + 'T12:00:00')
  const endDate = new Date(period.end_date + 'T12:00:00')
  const periodDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1

  return (
    <div style={{ background: '#f5f4ef', minHeight: '100vh', padding: '32px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Breadcrumb */}
        <Link href="/hr/payroll" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: '#5A5852', textDecoration: 'none', marginBottom: 24,
        }}>
          <ArrowLeft size={14} /> Volver a nómina
        </Link>

        {/* Header período */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #F0EFEA',
          borderRadius: 12, padding: '28px 32px', marginBottom: 20,
          boxShadow: '0 4px 12px rgba(11,42,74,0.06)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3DD9D6', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>
                Período de nómina
              </div>
              <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 600, color: '#0B2A4A', fontFamily: 'Geist, -apple-system, sans-serif', letterSpacing: '-0.025em' }}>
                {period.name}
              </h1>
              <div style={{ fontSize: 13, color: '#5A5852', fontFamily: 'JetBrains Mono, monospace' }}>
                {new Date(period.start_date + 'T12:00:00').toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                {' → '}
                {new Date(period.end_date + 'T12:00:00').toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                {' · '}{periodDays} días
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

          {/* Totales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 24, paddingTop: 24, borderTop: '1px solid #F0EFEA' }}>
            {[
              { label: 'Empleados',    value: String(lines?.length ?? 0) },
              { label: 'Total nómina', value: totalLines.toLocaleString('es', { minimumFractionDigits: 0 }) },
              { label: 'Días período', value: String(periodDays) },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontSize: 10, color: '#A8A6A0', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 20, color: '#0B2A4A', fontWeight: 700 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Acciones y líneas */}
        <PayrollActions
          periodId={id}
          userId={user.id}
          periodStatus={period.status}
          periodDays={periodDays}
          periodName={period.name}
          employees={employees ?? []}
          lines={lines ?? []}
        />

      </div>
    </div>
  )
}